package com.framezero.spot;

import com.framezero.common.GeoUtils;
import com.framezero.spot.dto.SeasonHoursDto;
import com.framezero.spot.dto.SpotDetailDto;
import com.framezero.spot.dto.SpotListResponse;
import com.framezero.spot.dto.SpotSummaryDto;
import jakarta.persistence.EntityNotFoundException;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;

@Service
public class SpotService {

    private static final int[] EXPAND_STEPS = {10, 30, 50};
    private static final Map<String, String> DAY_KR = Map.of(
            "MON", "월", "TUE", "화", "WED", "수", "THU", "목", "FRI", "금", "SAT", "토", "SUN", "일");

    private final SpotRepository spotRepository;
    private final Clock clock;

    public SpotService(SpotRepository spotRepository, Clock clock) {
        this.spotRepository = spotRepository;
        this.clock = clock;
    }

    /** 반경 안 놀거리, 가까운 순. 없으면 반경을 10 → 30 → 50km 로 넓힘 */
    @Transactional(readOnly = true)
    public SpotListResponse search(double lat, double lng, int radiusKm, Collection<SpotKind> kinds) {
        Collection<SpotKind> ks = (kinds == null || kinds.isEmpty()) ? EnumSet.allOf(SpotKind.class) : kinds;
        List<Spot> results = inRadius(lat, lng, radiusKm, ks);
        int used = radiusKm;
        if (results.isEmpty()) {
            for (int step : EXPAND_STEPS) {
                if (step <= radiusKm) continue;
                results = inRadius(lat, lng, step, ks);
                used = step;
                if (!results.isEmpty()) break;
            }
        }
        LocalDateTime now = LocalDateTime.now(clock);
        return new SpotListResponse(used, results.stream().map(s -> toSummary(s, lat, lng, now)).toList());
    }

    /** 뽑기용: 반경 안 후보 전체 (거리 정렬) */
    @Transactional(readOnly = true)
    public List<Spot> candidates(double lat, double lng, int radiusKm, Collection<SpotKind> kinds) {
        Collection<SpotKind> ks = (kinds == null || kinds.isEmpty()) ? EnumSet.allOf(SpotKind.class) : kinds;
        List<Spot> spots = inRadius(lat, lng, radiusKm, ks);
        // CourseService는 트랜잭션 밖에서 영업시간(seasons)을 계산함 → open-in-view=false라 여기서 미리 로딩
        spots.forEach(s -> Hibernate.initialize(s.getSeasons()));
        return spots;
    }

    @Transactional(readOnly = true)
    public SpotDetailDto findById(Long id) {
        Spot s = spotRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("놀거리를 찾을 수 없습니다."));
        LocalDateTime now = LocalDateTime.now(clock);
        List<SeasonHoursDto> seasons = s.getSeasons().stream()
                .sorted(Comparator.comparing(SpotHours::getStartMd))
                .map(h -> new SeasonHoursDto(md(h.getStartMd()) + "–" + md(h.getEndMd()), seasonLabel(s, h)))
                .toList();
        return new SpotDetailDto(
                s.getId(), s.getName(), s.getNameJa(), s.getKind(),
                s.getPrefecture(), s.getCity(),
                s.getLat().doubleValue(), s.getLng().doubleValue(),
                s.isOpenAt(now), hoursLabel(s, now.toLocalDate()), s.getClosedDays(), s.getHoursNote(), s.getFeeNote(),
                s.getDescription(), s.getTips(), s.getGooglePlaceId(),
                s.getOfficialUrl(), s.getVerifiedAt(), s.getImageUrl(), seasons
        );
    }

    private List<Spot> inRadius(double lat, double lng, int radiusKm, Collection<SpotKind> kinds) {
        GeoUtils.BoundingBox box = GeoUtils.boundingBox(lat, lng, radiusKm);
        return spotRepository.findInBox(bd(box.minLat()), bd(box.maxLat()), bd(box.minLng()), bd(box.maxLng()), kinds)
                .stream()
                .filter(s -> dist(s, lat, lng) <= radiusKm)
                .sorted(Comparator.comparingDouble(s -> dist(s, lat, lng)))
                .toList();
    }

    SpotSummaryDto toSummary(Spot s, double lat, double lng, LocalDateTime now) {
        double km = Math.round(dist(s, lat, lng) * 10.0) / 10.0;
        return new SpotSummaryDto(
                s.getId(), s.getName(), s.getNameJa(), s.getKind(),
                s.getPrefecture(), s.getCity(), km,
                s.getLat().doubleValue(), s.getLng().doubleValue(),
                s.isOpenAt(now), hoursLabel(s, now.toLocalDate()), summary(s.getDescription()), s.getOfficialUrl()
        );
    }

    /** 그날 기준: "24시간" / "9:00–17:00 · 월 휴무" / "날마다 다름" / "오늘 휴무" */
    public static String hoursLabel(Spot s, LocalDate date) {
        Spot.Effective e = s.effectiveOn(date);
        if (e.closedAllDay()) return "오늘 휴무";
        String h = switch (s.getHoursKind()) {
            case ALWAYS -> "24시간";
            case VARIES -> "날마다 다름";
            case FIXED -> e.openTime() == null ? "운영시간 확인" : trim0(e.openTime()) + "–" + trim0(e.closeTime());
        };
        return h + closedLabel(e.closedDays());
    }

    private static String seasonLabel(Spot s, SpotHours h) {
        if (h.isClosed()) return "휴무";
        String open = h.getOpenTime() != null ? h.getOpenTime() : s.getOpenTime();
        String close = h.getCloseTime() != null ? h.getCloseTime() : s.getCloseTime();
        String t = (open == null || close == null) ? "운영" : trim0(open) + "–" + trim0(close);
        if ("NONE".equals(h.getClosedDays())) return t + " · 무휴";
        return t + closedLabel(h.getClosedDays() != null ? h.getClosedDays() : s.getClosedDays());
    }

    private static String closedLabel(String closedDays) {
        if (closedDays == null || closedDays.isBlank()) return "";
        StringBuilder d = new StringBuilder();
        for (String c : closedDays.split(",")) d.append(DAY_KR.getOrDefault(c.trim().toUpperCase(), c.trim()));
        return " · " + d + " 휴무";
    }

    /** "03-15" -> "3/15" */
    private static String md(String mmdd) {
        return Integer.parseInt(mmdd.substring(0, 2)) + "/" + Integer.parseInt(mmdd.substring(3));
    }

    private static String trim0(String hhmm) {
        return hhmm.startsWith("0") ? hhmm.substring(1) : hhmm;
    }

    private static String summary(String description) {
        if (description == null || description.isBlank()) return null;
        int dot = description.indexOf(". ");
        if (dot >= 0) return description.substring(0, dot + 1);
        return description.length() <= 80 ? description : description.substring(0, 80) + "…";
    }

    private double dist(Spot s, double lat, double lng) {
        return GeoUtils.distanceKm(lat, lng, s.getLat().doubleValue(), s.getLng().doubleValue());
    }

    private BigDecimal bd(double v) {
        return BigDecimal.valueOf(v);
    }
}

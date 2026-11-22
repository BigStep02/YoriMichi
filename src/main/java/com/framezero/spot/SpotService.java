package com.framezero.spot;

import com.framezero.common.GeoUtils;
import com.framezero.spot.dto.SpotDetailDto;
import com.framezero.spot.dto.SpotListResponse;
import com.framezero.spot.dto.SpotSummaryDto;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
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
        return inRadius(lat, lng, radiusKm, ks);
    }

    @Transactional(readOnly = true)
    public SpotDetailDto findById(Long id) {
        Spot s = spotRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("놀거리를 찾을 수 없습니다."));
        LocalDateTime now = LocalDateTime.now(clock);
        return new SpotDetailDto(
                s.getId(), s.getName(), s.getNameJa(), s.getKind(),
                s.getPrefecture(), s.getCity(),
                s.getLat().doubleValue(), s.getLng().doubleValue(),
                s.isOpenAt(now), hoursLabel(s), s.getClosedDays(), s.getHoursNote(), s.getFeeNote(),
                s.getDescription(), s.getTips(), s.getGooglePlaceId(),
                s.getOfficialUrl(), s.getVerifiedAt(), s.getImageUrl()
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
                s.isOpenAt(now), hoursLabel(s), summary(s.getDescription()), s.getOfficialUrl()
        );
    }

    /** "24시간" / "9:00–17:00 · 월 휴무" / "날마다 다름" */
    static String hoursLabel(Spot s) {
        String h = switch (s.getHoursKind()) {
            case ALWAYS -> "24시간";
            case VARIES -> "날마다 다름";
            case FIXED -> s.getOpenTime() == null ? "운영시간 확인" : trim0(s.getOpenTime()) + "–" + trim0(s.getCloseTime());
        };
        if (s.getClosedDays() != null && !s.getClosedDays().isBlank()) {
            StringBuilder d = new StringBuilder();
            for (String c : s.getClosedDays().split(",")) d.append(DAY_KR.getOrDefault(c.trim().toUpperCase(), c.trim()));
            h += " · " + d + " 휴무";
        }
        return h;
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

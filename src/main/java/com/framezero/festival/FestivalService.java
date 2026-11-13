package com.framezero.festival;

import com.framezero.common.GeoUtils;
import com.framezero.festival.dto.FestivalDetailDto;
import com.framezero.festival.dto.FestivalListResponse;
import com.framezero.festival.dto.FestivalSummaryDto;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

@Service
public class FestivalService {

    private static final int[] EXPAND_STEPS = {10, 30, 50};

    private final FestivalRepository festivalRepository;
    private final Clock clock;

    public FestivalService(FestivalRepository festivalRepository, Clock clock) {
        this.festivalRepository = festivalRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public FestivalListResponse search(double lat, double lng, int radiusKm, LocalDate from, LocalDate to) {
        List<Festival> results = searchInRadius(lat, lng, radiusKm, from, to);
        int usedRadius = radiusKm;

        if (results.isEmpty()) {
            for (int step : EXPAND_STEPS) {
                if (step > radiusKm) {
                    results = searchInRadius(lat, lng, step, from, to);
                    usedRadius = step;
                    if (!results.isEmpty()) break;
                }
            }
        }

        if (!results.isEmpty()) {
            return new FestivalListResponse(usedRadius, false, toSummaries(results, lat, lng));
        }

        // fallback: 100km 내 end_date >= 오늘, 시작일 빠른 순 최대 3개
        List<Festival> fallback = findFallback(lat, lng);
        return new FestivalListResponse(100, true, toSummaries(fallback, lat, lng));
    }

    @Transactional(readOnly = true)
    public FestivalDetailDto findById(Long id) {
        Festival f = festivalRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("축제를 찾을 수 없습니다."));
        LocalDate today = LocalDate.now(clock);
        boolean ongoing = isOngoing(f.getStartDate(), f.getEndDate(), today);
        int dDay = ongoing ? 0 : (int) ChronoUnit.DAYS.between(today, f.getStartDate());
        return new FestivalDetailDto(
                f.getId(), f.getName(), f.getNameJa(),
                f.getPrefecture(), f.getCity(),
                f.getStartDate(), f.getEndDate(),
                f.getFestivalYear(), dDay, ongoing,
                f.getLat().doubleValue(), f.getLng().doubleValue(),
                f.getDescription(), f.getTips(),
                f.getOfficialUrl(), f.getVerifiedAt(), f.getImageUrl()
        );
    }

    private List<Festival> searchInRadius(double lat, double lng, int radiusKm, LocalDate from, LocalDate to) {
        GeoUtils.BoundingBox box = GeoUtils.boundingBox(lat, lng, radiusKm);
        List<Festival> candidates = festivalRepository.findByBoundingBoxAndPeriod(
                bd(box.minLat()), bd(box.maxLat()),
                bd(box.minLng()), bd(box.maxLng()),
                from, to
        );
        return candidates.stream()
                .filter(f -> dist(f, lat, lng) <= radiusKm)
                .sorted(Comparator.comparingDouble(f -> dist(f, lat, lng)))
                .toList();
    }

    private List<Festival> findFallback(double lat, double lng) {
        GeoUtils.BoundingBox box = GeoUtils.boundingBox(lat, lng, 100.0);
        return festivalRepository.findUpcomingByBoundingBox(
                        bd(box.minLat()), bd(box.maxLat()),
                        bd(box.minLng()), bd(box.maxLng()),
                        LocalDate.now(clock)
                ).stream()
                .filter(f -> dist(f, lat, lng) <= 100.0)
                .sorted(Comparator.comparing(Festival::getStartDate))
                .limit(3)
                .toList();
    }

    private List<FestivalSummaryDto> toSummaries(List<Festival> festivals, double lat, double lng) {
        LocalDate today = LocalDate.now(clock);
        return festivals.stream()
                .map(f -> {
                    boolean ongoing = isOngoing(f.getStartDate(), f.getEndDate(), today);
                    int dDay = ongoing ? 0 : (int) ChronoUnit.DAYS.between(today, f.getStartDate());
                    double distKm = Math.round(dist(f, lat, lng) * 10.0) / 10.0;
                    return new FestivalSummaryDto(
                            f.getId(), f.getName(), f.getNameJa(),
                            f.getPrefecture(), f.getCity(),
                            f.getStartDate(), f.getEndDate(),
                            dDay, ongoing, distKm,
                            f.getLat().doubleValue(), f.getLng().doubleValue(),
                            extractSummary(f.getDescription()),
                            f.getOfficialUrl()
                    );
                })
                .toList();
    }

    private boolean isOngoing(LocalDate start, LocalDate end, LocalDate today) {
        return !today.isBefore(start) && !today.isAfter(end);
    }

    private double dist(Festival f, double lat, double lng) {
        return GeoUtils.distanceKm(lat, lng, f.getLat().doubleValue(), f.getLng().doubleValue());
    }

    private BigDecimal bd(double value) {
        return BigDecimal.valueOf(value);
    }

    private String extractSummary(String description) {
        if (description == null || description.isBlank()) return null;
        int dotIdx = description.indexOf(". ");
        if (dotIdx >= 0) return description.substring(0, dotIdx + 1);
        if (description.length() <= 80) return description;
        return description.substring(0, 80) + "…";
    }
}
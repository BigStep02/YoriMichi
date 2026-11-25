package com.framezero.restaurant.cache;

import com.framezero.common.GeoUtils;
import com.framezero.restaurant.Category;
import com.framezero.restaurant.RestaurantPicker;
import com.framezero.restaurant.dto.RestaurantDetailDto;
import com.framezero.restaurant.dto.SummaryResponse;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.stream.Collectors;

@Component
public class RestaurantCache {

    private static final Duration NEARBY_TTL        = Duration.ofMinutes(30);
    private static final Duration DETAIL_TTL         = Duration.ofMinutes(60);
    private static final Duration SUMMARY_OK_TTL     = Duration.ofMinutes(60);
    private static final Duration SUMMARY_FAIL_TTL   = Duration.ofMinutes(10);
    private static final Duration RETRY_COOLDOWN_TTL = Duration.ofSeconds(20);
    private static final int MAX_SIZE = 500;

    private record Entry(Object value, Instant expireAt) {
        boolean alive() { return Instant.now().isBefore(expireAt); }
    }

    private final ConcurrentHashMap<String, Entry> nearbyCache        = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Entry> detailCache        = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Entry> summaryCache       = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Entry> retryCooldownCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> nameByPlaceId     = new ConcurrentHashMap<>();

    public String nearbyKey(double lat, double lng, int radiusM, List<Category> categories) {
        String catKey = categories.stream()
                .map(Enum::name)
                .collect(Collectors.joining(","));
        return "%.3f,%.3f,%d,%s".formatted(lat, lng, radiusM, catKey);
    }

    @SuppressWarnings("unchecked")
    public List<RestaurantPicker.Candidate> getNearby(String key) {
        var e = nearbyCache.get(key);
        if (e == null || !e.alive()) { nearbyCache.remove(key); return null; }
        return (List<RestaurantPicker.Candidate>) e.value();
    }

    public void putNearby(String key, List<RestaurantPicker.Candidate> candidates) {
        evict(nearbyCache);
        nearbyCache.put(key, new Entry(candidates, Instant.now().plus(NEARBY_TTL)));
    }

    // ---- 범위 재사용: 이미 검색한 원이 새 원을 통째로 덮으면 그 결과에서 거리로 걸러 씀 (Nearby 호출 절약) ----
    private record Area(double lat, double lng, int radiusM, String catKey,
                        List<RestaurantPicker.Candidate> list, Instant expireAt) {
        boolean alive() { return Instant.now().isBefore(expireAt); }
    }
    private static final int MAX_AREAS = 300;
    private static final int MIN_REUSE = 10;  // 걸러낸 후보가 이보다 적으면 새로 검색 (뽑기 다양성 유지)
    private final ConcurrentLinkedDeque<Area> areas = new ConcurrentLinkedDeque<>();

    private static String catKey(List<Category> categories) {
        return categories.stream().map(Enum::name).collect(Collectors.joining(","));
    }

    public void putArea(double lat, double lng, int radiusM, List<Category> categories,
                        List<RestaurantPicker.Candidate> candidates) {
        areas.removeIf(a -> !a.alive());
        while (areas.size() >= MAX_AREAS) areas.pollFirst();
        areas.addLast(new Area(lat, lng, radiusM, catKey(categories), candidates, Instant.now().plus(NEARBY_TTL)));
    }

    /** 새 원(lat,lng,radiusM)을 완전히 덮는 캐시 원이 있으면 그 후보 중 새 원 안의 것만. 없거나 적으면 null */
    public List<RestaurantPicker.Candidate> findCovering(double lat, double lng, int radiusM, List<Category> categories) {
        String ck = catKey(categories);
        for (var it = areas.descendingIterator(); it.hasNext(); ) {
            Area a = it.next();
            if (!a.alive() || !a.catKey().equals(ck) || a.radiusM() < radiusM) continue;
            if (radiusM * 2 < a.radiusM()) continue;   // 너무 넓은 검색의 일부만 쓰면 유명한 곳만 남으므로 제외
            double dM = GeoUtils.distanceKm(lat, lng, a.lat(), a.lng()) * 1000;
            if (dM + radiusM > a.radiusM()) continue;
            var inside = a.list().stream()
                    .filter(c -> GeoUtils.distanceKm(lat, lng, c.lat(), c.lng()) * 1000 <= radiusM)
                    .toList();
            if (inside.size() >= MIN_REUSE) return inside;
        }
        return null;
    }

    public RestaurantDetailDto getDetail(String placeId) {
        var e = detailCache.get(placeId);
        if (e == null || !e.alive()) { detailCache.remove(placeId); return null; }
        return (RestaurantDetailDto) e.value();
    }

    public void putDetail(String placeId, RestaurantDetailDto dto) {
        evict(detailCache);
        detailCache.put(placeId, new Entry(dto, Instant.now().plus(DETAIL_TTL)));
    }

    public SummaryResponse getSummary(String placeId) {
        var e = summaryCache.get(placeId);
        if (e == null || !e.alive()) { summaryCache.remove(placeId); return null; }
        return (SummaryResponse) e.value();
    }

    public void putSummary(String placeId, SummaryResponse dto) {
        evict(summaryCache);
        Duration ttl = "FAILED".equals(dto.status()) ? SUMMARY_FAIL_TTL : SUMMARY_OK_TTL;
        summaryCache.put(placeId, new Entry(dto, Instant.now().plus(ttl)));
    }

    public boolean isRetryAllowed(String placeId) {
        var e = retryCooldownCache.get(placeId);
        return e == null || !e.alive();
    }

    public void markRetried(String placeId) {
        retryCooldownCache.put(placeId, new Entry(Boolean.TRUE, Instant.now().plus(RETRY_COOLDOWN_TTL)));
    }

    public void putNames(List<RestaurantPicker.Candidate> candidates) {
        candidates.forEach(c -> { if (c.name() != null) nameByPlaceId.put(c.placeId(), c.name()); });
    }

    public void putName(String placeId, String name) {
        if (placeId != null && name != null) nameByPlaceId.put(placeId, name);
    }

    public String getName(String placeId) {
        return nameByPlaceId.get(placeId);
    }

    private void evict(ConcurrentHashMap<String, Entry> map) {
        if (map.size() < MAX_SIZE) return;
        map.entrySet().removeIf(e -> !e.getValue().alive());
        if (map.size() >= MAX_SIZE) {
            map.entrySet().stream()
                    .min((a, b) -> a.getValue().expireAt().compareTo(b.getValue().expireAt()))
                    .map(Map.Entry::getKey)
                    .ifPresent(map::remove);
        }
    }
}
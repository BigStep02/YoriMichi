package com.framezero.restaurant.cache;

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
import java.util.stream.Collectors;

@Component
public class RestaurantCache {

    private static final Duration NEARBY_TTL        = Duration.ofMinutes(10);
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
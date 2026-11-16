package com.framezero.restaurant;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@Component
public class RestaurantPicker {

    static final int M = 50;

    public record Candidate(
            String placeId,
            String name,
            String typeLabel,
            double rating,
            int ratingCount,
            Integer priceLevel,
            Boolean openNow,
            double lat,
            double lng,
            String googleMapsUri
    ) {}

    public record PickResult(
            Candidate pick,
            int candidateCount,
            int poolCount,
            double avgRating
    ) {}

    public PickResult pick(List<Candidate> all, boolean filterOpenNow, Integer maxPrice, Set<String> excludeIds) {
        var filtered = all.stream()
                .filter(c -> !excludeIds.contains(c.placeId()))
                .filter(c -> !filterOpenNow || Boolean.TRUE.equals(c.openNow()))
                .filter(c -> maxPrice == null || c.priceLevel() == null || c.priceLevel() <= maxPrice)
                .filter(c -> c.ratingCount() >= 10)
                .filter(c -> c.rating() > 0)
                .toList();

        if (filtered.isEmpty()) {
            return new PickResult(null, 0, 0, 0.0);
        }

        double C = filtered.stream().mapToDouble(Candidate::rating).average().orElse(0);

        var pool = filtered.stream()
                .filter(c -> computeScore(c.rating(), c.ratingCount(), C) >= C)
                .toList();

        if (pool.isEmpty()) pool = filtered;

        var pick = pool.get(ThreadLocalRandom.current().nextInt(pool.size()));
        return new PickResult(pick, filtered.size(), pool.size(), C);
    }

    double computeScore(double rating, int ratingCount, double C) {
        return (double) ratingCount / (ratingCount + M) * rating
                + (double) M / (ratingCount + M) * C;
    }
}
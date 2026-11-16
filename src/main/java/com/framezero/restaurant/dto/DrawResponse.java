package com.framezero.restaurant.dto;

import com.framezero.restaurant.Category;

public record DrawResponse(
        RestaurantPickDto pick,
        int candidateCount,
        int poolCount,
        double avgRating,
        int radiusM,
        Category category,
        boolean cached,
        String reason
) {}
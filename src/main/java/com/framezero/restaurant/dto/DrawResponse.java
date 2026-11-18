package com.framezero.restaurant.dto;

import com.framezero.restaurant.Category;

import java.util.List;

public record DrawResponse(
        RestaurantPickDto pick,
        int candidateCount,
        int poolCount,
        double avgRating,
        int radiusM,
        List<Category> category,
        boolean cached,
        String reason
) {}
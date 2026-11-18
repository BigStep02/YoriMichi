package com.framezero.restaurant.dto;

import com.framezero.restaurant.Category;
import com.framezero.restaurant.SortOrder;

import java.util.List;

public record NearbyResponse(
        List<RestaurantPickDto> restaurants,
        int count,
        double avgRating,
        int radiusM,
        List<Category> category,
        SortOrder sort,
        boolean cached
) {}
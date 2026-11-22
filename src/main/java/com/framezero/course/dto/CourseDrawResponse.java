package com.framezero.course.dto;

import com.framezero.course.CoursePreset;
import com.framezero.festival.dto.FestivalSummaryDto;
import com.framezero.restaurant.dto.RestaurantPickDto;

import java.util.List;

public record CourseDrawResponse(
        CoursePreset preset,
        CourseSpotDto spot,
        FestivalSummaryDto festival,
        List<RestaurantPickDto> restaurants,
        RestaurantPickDto cafe,
        int spotDbCount,
        boolean spotSupplemented,
        int restaurantRadiusM,
        String reason
) {}
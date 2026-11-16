package com.framezero.restaurant.dto;

import java.util.List;

public record RestaurantDetailDto(
        String placeId,
        String name,
        String nameKo,
        String address,
        Double rating,
        Integer ratingCount,
        Integer priceLevel,
        Boolean openNow,
        List<String> weekdayHours,
        String googleMapsUri,
        String websiteUri,
        List<ReviewDto> reviews,
        AiSummaryDto aiSummary,
        String attribution
) {}
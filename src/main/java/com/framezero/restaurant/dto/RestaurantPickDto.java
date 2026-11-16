package com.framezero.restaurant.dto;

public record RestaurantPickDto(
        String placeId,
        String name,
        String typeLabel,
        double rating,
        int ratingCount,
        double score,
        Integer priceLevel,
        Boolean openNow,
        int distanceM,
        double lat,
        double lng,
        String googleMapsUri
) {}
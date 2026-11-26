package com.framezero.restaurant.client.response;

public record PlaceResult(
        String id,
        LocalizedText displayName,
        LatLng location,
        Double rating,
        Integer userRatingCount,
        String priceLevel,
        PriceRange priceRange,
        OpeningHours currentOpeningHours,
        LocalizedText primaryTypeDisplayName,
        String googleMapsUri,
        String primaryType
) {}

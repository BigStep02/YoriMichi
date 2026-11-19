package com.framezero.restaurant.client.response;

import java.util.List;

public record PlaceDetailResult(
        String id,
        LocalizedText displayName,
        String formattedAddress,
        LatLng location,
        Double rating,
        Integer userRatingCount,
        String priceLevel,
        OpeningHours currentOpeningHours,
        RegularOpeningHours regularOpeningHours,
        String googleMapsUri,
        String websiteUri,
        List<PlaceReview> reviews,
        ReviewSummary reviewSummary
) {}
package com.framezero.restaurant.client.response;

public record PlaceReview(
        AuthorAttribution authorAttribution,
        Integer rating,
        LocalizedText text,
        String relativePublishTimeDescription
) {}
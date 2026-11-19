package com.framezero.restaurant.client.response;

public record ReviewSummary(
        LocalizedText text,
        String flagContentUri,
        LocalizedText disclosureText,
        String reviewsUri
) {}
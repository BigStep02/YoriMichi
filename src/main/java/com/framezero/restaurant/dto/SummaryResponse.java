package com.framezero.restaurant.dto;

import java.util.List;

public record SummaryResponse(
        String status,
        List<String> pros,
        List<String> cons,
        List<String> menus,
        String fullKo,
        String reviewSummaryText,
        String reviewSummaryDisclosure,
        String reviewsUri,
        String reviewSummaryFlagUri
) {}
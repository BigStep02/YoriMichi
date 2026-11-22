package com.framezero.spot.dto;

import com.framezero.spot.SpotKind;

public record SpotSummaryDto(
        Long id,
        String name,
        String nameJa,
        SpotKind kind,
        String prefecture,
        String city,
        double distanceKm,
        double lat,
        double lng,
        Boolean openNow,
        String hoursLabel,
        String summary,
        String officialUrl
) {}

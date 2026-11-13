package com.framezero.festival.dto;

import java.time.LocalDate;

public record FestivalSummaryDto(
        Long id,
        String name,
        String nameJa,
        String prefecture,
        String city,
        LocalDate startDate,
        LocalDate endDate,
        int dDay,
        boolean ongoing,
        double distanceKm,
        double lat,
        double lng,
        String summary,
        String officialUrl
) {}
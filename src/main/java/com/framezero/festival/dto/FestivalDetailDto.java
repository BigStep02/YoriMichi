package com.framezero.festival.dto;

import java.time.LocalDate;

public record FestivalDetailDto(
        Long id,
        String name,
        String nameJa,
        String prefecture,
        String city,
        LocalDate startDate,
        LocalDate endDate,
        int festivalYear,
        int dDay,
        boolean ongoing,
        double lat,
        double lng,
        String description,
        String tips,
        String officialUrl,
        LocalDate verifiedAt,
        String imageUrl
) {}
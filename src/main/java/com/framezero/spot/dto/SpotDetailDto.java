package com.framezero.spot.dto;

import com.framezero.spot.SpotKind;

import java.time.LocalDate;
import java.util.List;

public record SpotDetailDto(
        Long id,
        String name,
        String nameJa,
        SpotKind kind,
        String prefecture,
        String city,
        double lat,
        double lng,
        Boolean openNow,
        String hoursLabel,
        String closedDays,
        String hoursNote,
        String feeNote,
        String description,
        String tips,
        String googlePlaceId,
        String officialUrl,
        LocalDate verifiedAt,
        String imageUrl,
        List<SeasonHoursDto> seasons
) {}

package com.framezero.course.dto;

public record CourseSpotDto(
        Long id,
        String placeId,
        String name,
        String nameJa,
        String kind,
        String prefecture,
        String city,
        double distanceKm,
        double lat,
        double lng,
        Boolean openNow,
        String hoursLabel,
        String summary,
        String officialUrl,
        String googleMapsUri,
        boolean fromPlaces
) {}
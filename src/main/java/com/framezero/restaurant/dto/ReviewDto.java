package com.framezero.restaurant.dto;

public record ReviewDto(
        String author,
        String authorUri,
        int rating,
        String text,
        String relativeTime
) {}
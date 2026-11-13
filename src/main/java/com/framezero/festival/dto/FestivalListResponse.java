package com.framezero.festival.dto;

import java.util.List;

public record FestivalListResponse(
        int searchedRadiusKm,
        boolean fallback,
        List<FestivalSummaryDto> festivals
) {}
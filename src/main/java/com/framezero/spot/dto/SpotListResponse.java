package com.framezero.spot.dto;

import java.util.List;

public record SpotListResponse(
        int searchedRadiusKm,
        List<SpotSummaryDto> spots
) {}

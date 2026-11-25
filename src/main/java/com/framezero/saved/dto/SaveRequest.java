package com.framezero.saved.dto;

import com.framezero.saved.SavedType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 저장 요청.
 * - FESTIVAL: festivalId / SPOT: spotId
 * - RESTAURANT: placeId + lat·lng(가까운 도시 계산에만 쓰고 저장 안 함) + metType·metId(코스에서 만난 곳, 선택)
 * - COURSE: course.preset + course.stops
 */
public record SaveRequest(
        @NotNull SavedType type,
        Long festivalId,
        Long spotId,
        @Size(max = 300) String placeId,
        Double lat,
        Double lng,
        @Size(max = 20) String metType,
        Long metId,
        @Size(max = 500) String memo,
        @Valid Course course
) {
    public record Course(@Size(max = 40) String preset, @Size(min = 1, max = 4) List<CourseStop> stops) {}
}

package com.framezero.course;

import com.framezero.course.dto.CourseDrawResponse;
import com.framezero.spot.SpotKind;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/courses")
@Tag(name = "Course", description = "코스 뽑기 (명소/축제 먼저, 그다음 근처 맛집)")
@Validated
public class CourseController {

    private final CourseService courseService;

    public CourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    @GetMapping("/draw")
    @Operation(summary = "C-01 코스 뽑기 (preset: RESTAURANT_ONLY / SPOT_RESTAURANT / SPOT_RESTAURANT_CAFE / FESTIVAL_RESTAURANT)")
    @SecurityRequirements
    public CourseDrawResponse draw(
            @RequestParam
            @DecimalMin(value = "-90",  message = "lat은 -90 이상이어야 합니다")
            @DecimalMax(value = "90",   message = "lat은 90 이하이어야 합니다")
            double lat,

            @RequestParam
            @DecimalMin(value = "-180", message = "lng은 -180 이상이어야 합니다")
            @DecimalMax(value = "180",  message = "lng은 180 이하이어야 합니다")
            double lng,

            @RequestParam(defaultValue = "10")
            @Min(value = 1,  message = "radiusKm은 1 이상이어야 합니다")
            @Max(value = 50, message = "radiusKm은 50 이하이어야 합니다")
            int radiusKm,

            @RequestParam(defaultValue = "800")
            @Min(value = 200,  message = "restaurantRadiusM은 200 이상이어야 합니다")
            @Max(value = 3000, message = "restaurantRadiusM은 3000 이하이어야 합니다")
            int restaurantRadiusM,

            @RequestParam(defaultValue = "SPOT_RESTAURANT") CoursePreset preset,

            @RequestParam(defaultValue = "true") boolean openNow,

            @RequestParam(required = false)
            @Min(value = 1, message = "maxPrice는 1 이상이어야 합니다")
            @Max(value = 4, message = "maxPrice는 4 이하이어야 합니다")
            Integer maxPrice,

            @RequestParam(required = false) String exclude,

            @RequestParam(required = false) Set<SpotKind> kinds
    ) {
        List<String> excludeList = (exclude == null || exclude.isBlank()) ? List.of()
                : Arrays.stream(exclude.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .limit(20)
                        .toList();

        return courseService.draw(lat, lng, radiusKm, restaurantRadiusM,
                preset, openNow, maxPrice, excludeList, kinds);
    }
}
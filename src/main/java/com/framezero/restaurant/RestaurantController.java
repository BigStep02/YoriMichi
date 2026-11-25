package com.framezero.restaurant;

import com.framezero.restaurant.dto.DrawResponse;
import com.framezero.restaurant.dto.NearbyResponse;
import com.framezero.restaurant.dto.RestaurantDetailDto;
import com.framezero.restaurant.dto.SummaryResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/restaurants")
@Tag(name = "Restaurant", description = "맛집 뽑기 (R-01, R-02)")
@Validated
public class RestaurantController {

    private final RestaurantService restaurantService;

    public RestaurantController(RestaurantService restaurantService) {
        this.restaurantService = restaurantService;
    }

    @GetMapping("/draw")
    @Operation(summary = "R-01 맛집 뽑기 (Nearby Search + 베이지안 보정 평점 + 랜덤)")
    @SecurityRequirements
    public DrawResponse draw(
            @RequestParam
            @DecimalMin(value = "-90", message = "lat은 -90 이상이어야 합니다")
            @DecimalMax(value = "90",  message = "lat은 90 이하이어야 합니다")
            double lat,

            @RequestParam
            @DecimalMin(value = "-180", message = "lng은 -180 이상이어야 합니다")
            @DecimalMax(value = "180",  message = "lng은 180 이하이어야 합니다")
            double lng,

            @RequestParam(defaultValue = "800")
            @Min(value = 200, message = "radiusM은 200 이상이어야 합니다")
            @Max(value = 3000, message = "radiusM은 3000 이하이어야 합니다")
            int radiusM,

            @RequestParam(defaultValue = "ALL") List<Category> category,

            @RequestParam(defaultValue = "true") boolean openNow,

            @RequestParam(required = false)
            @Min(value = 1, message = "maxPrice는 1 이상이어야 합니다")
            @Max(value = 4, message = "maxPrice는 4 이하이어야 합니다")
            Integer maxPrice,

            @RequestParam(required = false) String exclude
    ) {
        List<String> excludeList = (exclude == null || exclude.isBlank()) ? List.of()
                : Arrays.stream(exclude.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .limit(20)
                        .toList();

        return restaurantService.draw(lat, lng, radiusM, Category.normalize(category), openNow, maxPrice, excludeList);
    }

    @GetMapping("/nearby")
    @Operation(summary = "R-03 주변 맛집 목록 (Nearby Search + 보정 평점·거리 정렬)")
    @SecurityRequirements
    public NearbyResponse nearby(
            @RequestParam
            @DecimalMin(value = "-90", message = "lat은 -90 이상이어야 합니다")
            @DecimalMax(value = "90",  message = "lat은 90 이하이어야 합니다")
            double lat,

            @RequestParam
            @DecimalMin(value = "-180", message = "lng은 -180 이상이어야 합니다")
            @DecimalMax(value = "180",  message = "lng은 180 이하이어야 합니다")
            double lng,

            @RequestParam(defaultValue = "800")
            @Min(value = 200, message = "radiusM은 200 이상이어야 합니다")
            @Max(value = 3000, message = "radiusM은 3000 이하이어야 합니다")
            int radiusM,

            @RequestParam(defaultValue = "ALL") List<Category> category,

            @RequestParam(defaultValue = "false") boolean openNow,

            @RequestParam(required = false)
            @Min(value = 1, message = "maxPrice는 1 이상이어야 합니다")
            @Max(value = 4, message = "maxPrice는 4 이하이어야 합니다")
            Integer maxPrice,

            @RequestParam(defaultValue = "SCORE") SortOrder sort
    ) {
        return restaurantService.nearby(lat, lng, radiusM, Category.normalize(category), openNow, maxPrice, sort);
    }

    @GetMapping("/names")
    @Operation(summary = "R-03 가게 이름만 조회 (저장함 카드 제목용, 최대 30개)")
    @SecurityRequirements
    public Map<String, String> names(@RequestParam List<String> ids) {
        return restaurantService.names(ids);
    }

    @GetMapping("/{placeId}")
    @Operation(summary = "R-02 맛집 상세 조회")
    @SecurityRequirements
    public RestaurantDetailDto detail(
            @PathVariable
            @Pattern(regexp = "^[A-Za-z0-9_-]{10,300}$", message = "placeId 형식이 올바르지 않습니다")
            String placeId) {
        return restaurantService.detail(placeId);
    }

    @GetMapping("/{placeId}/summary")
    @Operation(summary = "R-02a AI 리뷰 요약 (status: OK | NO_SOURCE | FAILED)")
    @SecurityRequirements
    public SummaryResponse summary(
            @PathVariable
            @Pattern(regexp = "^[A-Za-z0-9_-]{10,300}$", message = "placeId 형식이 올바르지 않습니다")
            String placeId,
            @RequestParam(defaultValue = "false") boolean retry) {
        return restaurantService.summary(placeId, retry);
    }
}
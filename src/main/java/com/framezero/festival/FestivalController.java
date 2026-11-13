package com.framezero.festival;

import com.framezero.festival.dto.FestivalDetailDto;
import com.framezero.festival.dto.FestivalListResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.Clock;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/festivals")
@Tag(name = "Festival", description = "축제 조회 (F-01, F-02)")
@Validated
public class FestivalController {

    private final FestivalService festivalService;
    private final Clock clock;

    public FestivalController(FestivalService festivalService, Clock clock) {
        this.festivalService = festivalService;
        this.clock = clock;
    }

    @GetMapping
    @Operation(summary = "F-01 축제 목록 조회 (반경·기간 필터, 자동 확장)")
    @SecurityRequirements
    public FestivalListResponse list(
            @RequestParam
            @DecimalMin(value = "-90", message = "lat은 -90 이상이어야 합니다")
            @DecimalMax(value = "90", message = "lat은 90 이하이어야 합니다")
            double lat,

            @RequestParam
            @DecimalMin(value = "-180", message = "lng은 -180 이상이어야 합니다")
            @DecimalMax(value = "180", message = "lng은 180 이하이어야 합니다")
            double lng,

            @RequestParam(defaultValue = "30")
            @Min(value = 1, message = "radiusKm은 1 이상이어야 합니다")
            @Max(value = 100, message = "radiusKm은 100 이하이어야 합니다")
            int radiusKm,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to
    ) {
        LocalDate today = LocalDate.now(clock);
        LocalDate resolvedFrom = from != null ? from : today;
        LocalDate resolvedTo = to != null ? to : today.plusDays(7);
        if (resolvedFrom.isAfter(resolvedTo)) {
            throw new IllegalArgumentException("from은 to보다 이전이어야 합니다.");
        }
        return festivalService.search(lat, lng, radiusKm, resolvedFrom, resolvedTo);
    }

    @GetMapping("/{id}")
    @Operation(summary = "F-02 축제 상세 조회")
    @SecurityRequirements
    public FestivalDetailDto detail(@PathVariable Long id) {
        return festivalService.findById(id);
    }
}
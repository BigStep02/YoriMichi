package com.framezero.spot;

import com.framezero.spot.dto.SpotDetailDto;
import com.framezero.spot.dto.SpotListResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/spots")
@Tag(name = "Spot", description = "놀거리 조회 (신사·절, 공원·정원, 유원지·수족관·동물원, 전망·경치)")
@Validated
public class SpotController {

    private final SpotService spotService;

    public SpotController(SpotService spotService) {
        this.spotService = spotService;
    }

    @GetMapping
    @Operation(summary = "놀거리 목록 (반경·종류 필터, 없으면 반경 자동 확장)")
    @SecurityRequirements
    public SpotListResponse list(
            @RequestParam @DecimalMin("-90") @DecimalMax("90") double lat,
            @RequestParam @DecimalMin("-180") @DecimalMax("180") double lng,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int radiusKm,
            @RequestParam(required = false) List<SpotKind> kinds
    ) {
        return spotService.search(lat, lng, radiusKm, kinds);
    }

    @GetMapping("/{id}")
    @Operation(summary = "놀거리 상세")
    @SecurityRequirements
    public SpotDetailDto detail(@PathVariable Long id) {
        return spotService.findById(id);
    }
}

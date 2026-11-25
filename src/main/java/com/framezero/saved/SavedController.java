package com.framezero.saved;

import com.framezero.saved.dto.SaveRequest;
import com.framezero.saved.dto.SavedItemResponse;
import com.framezero.saved.dto.UpdateSavedRequest;
import com.framezero.security.AuthUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/saved")
@Tag(name = "Saved", description = "저장함(縁帳) — 로그인 필요")
public class SavedController {

    private final SavedService savedService;

    public SavedController(SavedService savedService) {
        this.savedService = savedService;
    }

    @PostMapping
    @Operation(summary = "저장 (이미 있으면 기존 항목 반환)")
    public SavedItemResponse save(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody SaveRequest req) {
        return savedService.save(user.id(), req);
    }

    @GetMapping
    @Operation(summary = "저장함 목록 (type 없으면 전체, 최근 순)")
    public List<SavedItemResponse> list(@AuthenticationPrincipal AuthUser user,
                                        @RequestParam(required = false) SavedType type) {
        return savedService.list(user.id(), type);
    }

    @GetMapping("/keys")
    @Operation(summary = "저장한 키 목록 (F:1, S:2, R:placeId, C:...) — 저장 버튼 상태용")
    public List<String> keys(@AuthenticationPrincipal AuthUser user) {
        return savedService.keys(user.id());
    }

    @PatchMapping("/{id}")
    @Operation(summary = "메모·방문 체크 수정")
    public SavedItemResponse update(@AuthenticationPrincipal AuthUser user, @PathVariable Long id,
                                    @Valid @RequestBody UpdateSavedRequest req) {
        return savedService.update(user.id(), id, req);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "삭제 (남의 것이면 403)")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        savedService.delete(user.id(), id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    @Operation(summary = "키로 삭제 (저장 버튼 토글용, 없으면 그냥 204)")
    public ResponseEntity<Void> deleteByKey(@AuthenticationPrincipal AuthUser user, @RequestParam String key) {
        savedService.deleteByKey(user.id(), key);
        return ResponseEntity.noContent().build();
    }
}

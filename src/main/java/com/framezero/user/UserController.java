package com.framezero.user;

import com.framezero.security.AuthUser;
import com.framezero.user.dto.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@Tag(name = "User", description = "회원 정보")
public class UserController {

    private final UserRepository userRepository;
    private final java.util.Set<String> devEmails;

    public UserController(UserRepository userRepository,
                          @org.springframework.beans.factory.annotation.Value("${app.dev-emails:}") String devEmails) {
        this.userRepository = userRepository;
        this.devEmails = java.util.Arrays.stream(devEmails.split(","))
                .map(String::trim).map(String::toLowerCase).filter(s -> !s.isEmpty())
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }

    @GetMapping("/me")
    @Operation(summary = "내 정보 조회 (U-03)")
    public UserResponse me(@AuthenticationPrincipal AuthUser authUser) {
        User user = userRepository.findById(authUser.id())
                .orElseThrow(() -> new EntityNotFoundException("사용자를 찾을 수 없습니다."));
        boolean developer = user.getEmail() != null && devEmails.contains(user.getEmail().toLowerCase());
        return new UserResponse(user.getId(), user.getEmail(), user.getNickname(), user.getCreatedAt(), developer);
    }
}
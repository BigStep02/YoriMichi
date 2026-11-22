package com.framezero.user.dto;

import java.time.LocalDateTime;

/** developer: 서버 .env APP_DEV_EMAILS 에 있는 계정이면 true (화면에서 mock 켜기 허용) */
public record UserResponse(Long id, String email, String nickname, LocalDateTime createdAt, boolean developer) {}
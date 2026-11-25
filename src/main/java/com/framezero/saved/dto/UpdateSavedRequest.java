package com.framezero.saved.dto;

import jakarta.validation.constraints.Size;

/** null인 값은 바꾸지 않음. memo를 지우려면 빈 문자열 */
public record UpdateSavedRequest(@Size(max = 500) String memo, Boolean visited) {}

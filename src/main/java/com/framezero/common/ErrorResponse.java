package com.framezero.common;

public record ErrorResponse(int status, String code, String message) {}
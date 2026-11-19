package com.framezero.restaurant.dto;

import java.util.List;

public record AiSummaryDto(List<String> pros, List<String> cons, List<String> menus, String fullKo) {}
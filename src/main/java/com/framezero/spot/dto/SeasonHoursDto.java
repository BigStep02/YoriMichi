package com.framezero.spot.dto;

/** 계절·기간별 운영시간 한 줄. 예: ("3/15–6/30", "9:00–18:00") / ("12/29–1/3", "휴무") */
public record SeasonHoursDto(String period, String hours) {}

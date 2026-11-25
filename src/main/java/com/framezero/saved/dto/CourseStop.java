package com.framezero.saved.dto;

/**
 * 코스 한 칸. type: SPOT / FESTIVAL (자체 DB id) · RESTAURANT / PLACE (Google place_id만)
 */
public record CourseStop(String type, Long id, String placeId) {}

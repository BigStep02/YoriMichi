package com.framezero.saved.dto;

import com.framezero.saved.SavedType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** 저장함 한 줄. 종류에 맞는 칸 하나만 채워짐 (나머지 null) */
public record SavedItemResponse(
        Long id,
        SavedType type,
        String key,
        String memo,
        boolean visited,
        LocalDateTime createdAt,
        FestivalPart festival,
        SpotPart spot,
        RestaurantPart restaurant,
        CoursePart course
) {
    /** status: ONGOING / UPCOMING / ENDED */
    public record FestivalPart(Long id, String name, String nameJa, String prefecture, String city,
                               LocalDate startDate, LocalDate endDate, String status, Long dDay,
                               double lat, double lng) {}

    public record SpotPart(Long id, String name, String nameJa, String kind, String prefecture, String city,
                           Boolean openNow, String hoursLabel, double lat, double lng) {}

    /** 구글 장소 정보 없음 — placeId + 우리 데이터만 */
    public record RestaurantPart(String placeId, String prefecture, String city,
                                 String metType, Long metId, String metName) {}

    /** stop: DB 칸은 이름·지역 채움, RESTAURANT/PLACE 칸은 placeId만 */
    public record CoursePart(String preset, List<Stop> stops) {
        public record Stop(String type, Long id, String placeId, String name, String nameJa, String kind,
                           String prefecture, String city) {}
    }
}

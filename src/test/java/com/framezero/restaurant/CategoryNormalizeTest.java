package com.framezero.restaurant;

import org.junit.jupiter.api.Test;

import java.util.List;

import static com.framezero.restaurant.Category.*;
import static org.assertj.core.api.Assertions.assertThat;

class CategoryNormalizeTest {

    // null / 빈 리스트 → ALL
    @Test
    void normalize_nullOrEmpty_returnsAll() {
        assertThat(Category.normalize(null)).containsExactly(ALL);
        assertThat(Category.normalize(List.of())).containsExactly(ALL);
    }

    // ALL이 섞여 있으면 [ALL] 단독
    @Test
    void normalize_containsAll_returnsSingleAll() {
        assertThat(Category.normalize(List.of(ALL, RAMEN))).containsExactly(ALL);
        assertThat(Category.normalize(List.of(SUSHI, ALL, CURRY))).containsExactly(ALL);
    }

    // 중복 제거
    @Test
    void normalize_duplicates_removed() {
        var result = Category.normalize(List.of(RAMEN, RAMEN, SUSHI));
        assertThat(result).containsExactlyInAnyOrder(RAMEN, SUSHI);
        assertThat(result).doesNotHaveDuplicates();
    }

    // name 오름차순 정렬 — RAMEN,IZAKAYA,YAKITORI → IZAKAYA,RAMEN,YAKITORI
    @Test
    void normalize_sortedByName() {
        var result = Category.normalize(List.of(RAMEN, IZAKAYA, YAKITORI));
        assertThat(result).containsExactly(IZAKAYA, RAMEN, YAKITORI);
    }

    // 단일 카테고리는 그대로
    @Test
    void normalize_singleCategory_unchanged() {
        assertThat(Category.normalize(List.of(CURRY))).containsExactly(CURRY);
    }

    // 정렬된 캐시 키: 순서 달라도 동일 키 생성 (normalize → name joining)
    @Test
    void cacheKey_orderIndependent() {
        var normalized1 = Category.normalize(List.of(RAMEN, SUSHI));
        var normalized2 = Category.normalize(List.of(SUSHI, RAMEN));
        String key1 = normalized1.stream().map(Enum::name).reduce("", (a, b) -> a.isEmpty() ? b : a + "," + b);
        String key2 = normalized2.stream().map(Enum::name).reduce("", (a, b) -> a.isEmpty() ? b : a + "," + b);
        assertThat(key1).isEqualTo(key2);
    }

    // mergedTypes: 중복 없이 합집합
    @Test
    void mergedTypes_deduplicatesAndMerges() {
        var types = Category.mergedTypes(List.of(CAFE));
        assertThat(types).containsExactlyInAnyOrder("cafe", "coffee_shop");
    }

    @Test
    void mergedTypes_all_returnsRestaurant() {
        assertThat(Category.mergedTypes(List.of(ALL))).containsExactly("restaurant");
    }
}
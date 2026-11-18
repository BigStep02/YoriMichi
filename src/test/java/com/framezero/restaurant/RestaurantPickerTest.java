package com.framezero.restaurant;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class RestaurantPickerTest {

    private final RestaurantPicker picker = new RestaurantPicker();

    private RestaurantPicker.Candidate c(String id, double rating, int count) {
        return new RestaurantPicker.Candidate(id, "테스트 " + id, "식당", rating, count, null, true, 0, 0, "");
    }

    // 리뷰 5개짜리 5.0점 vs 리뷰 3000개짜리 4.3점 — C가 낮으면 고리뷰 점포가 이김
    @Test
    void bayesian_highReviewWinsOverLowReview() {
        double C = 3.9; // 충분히 낮은 평균 (리뷰 많은 쪽 평점보다 낮음)
        double scoreHighReview = picker.computeScore(4.3, 3000, C); // ~4.29
        double scoreLowReview  = picker.computeScore(5.0, 5,    C); // ~4.07 (C 쪽으로 당겨짐)
        assertThat(scoreHighReview).isGreaterThan(scoreLowReview);
    }

    // m=50 보정으로 극단값이 평균 쪽으로 당겨지는지
    @Test
    void bayesian_extremeRating_pulledTowardAverage() {
        double C = 4.0;
        double score = picker.computeScore(5.0, 5, C);
        assertThat(score).isLessThan(5.0);   // 5.0에서 내려옴
        assertThat(score).isGreaterThan(C);  // 평균 위에는 있어야 함
    }

    // exclude 필터, openNow 필터, minRatingCount 필터
    @Test
    void filter_exclude_openNow_ratingCount() {
        var excluded = c("skip", 4.5, 500);
        var closed   = new RestaurantPicker.Candidate("closed", "닫힘", "식당", 4.3, 200, null, false, 0, 0, "");
        var lowCount = c("low", 4.8, 9);   // ratingCount < 10
        var valid    = c("ok", 4.1, 100);

        var result = picker.pick(List.of(excluded, closed, lowCount, valid),
                true, null, Set.of("skip"));

        assertThat(result.candidateCount()).isEqualTo(1);
        assertThat(result.pick()).isNotNull();
        assertThat(result.pick().placeId()).isEqualTo("ok");
    }

    // maxPrice: null 가격 → 통과, 초과 가격 → 제외
    @Test
    void filter_maxPrice_nullPricePassesThrough() {
        var expensive = new RestaurantPicker.Candidate("exp",  "비쌈",   "식당", 4.0, 100, 4,    true, 0, 0, "");
        var noPrice   = new RestaurantPicker.Candidate("none", "가격미상","식당", 4.0, 100, null, true, 0, 0, "");
        var cheap     = new RestaurantPicker.Candidate("cheap","저렴",   "식당", 4.0, 100, 1,    true, 0, 0, "");

        var result = picker.pick(List.of(expensive, noPrice, cheap), false, 2, Set.of());

        assertThat(result.candidateCount()).isEqualTo(2);           // expensive 제외
        assertThat(result.pick().placeId()).isIn("none", "cheap");  // 나머지 중 하나
    }

    // 보정 평점 정렬: 5.0점·리뷰 12개는 4.3점·리뷰 9489개보다 뒤에 정렬 (평균이 낮을 때)
    @Test
    void sort_highReviewCountRanksAboveLowReviewCount() {
        double C = 3.9;
        double scoreHighCount = picker.computeScore(4.3, 9489, C);
        double scoreLowCount  = picker.computeScore(5.0, 12,   C);
        assertThat(scoreHighCount).isGreaterThan(scoreLowCount);
    }

    // 후보 2개일 때 pool = 2 (최소 min(3, n) 보장)
    @Test
    void pool_twoFilteredCandidates_poolIsTwo() {
        var result = picker.pick(List.of(c("a", 4.5, 100), c("b", 4.0, 200)),
                false, null, Set.of());
        assertThat(result.candidateCount()).isEqualTo(2);
        assertThat(result.poolCount()).isEqualTo(2);
    }

    // 후보 없으면 pick = null
    @Test
    void pick_allFiltered_returnsNull() {
        var result = picker.pick(List.of(c("a", 4.0, 100)), false, null, Set.of("a"));
        assertThat(result.pick()).isNull();
        assertThat(result.candidateCount()).isEqualTo(0);
    }

    // filter() 직접 호출 — pick() 내부 필터와 같은 결과
    @Test
    void filter_publicMethod_sameResultAsPick() {
        var excluded = c("skip", 4.5, 500);
        var closed   = new RestaurantPicker.Candidate("closed", "닫힘", "식당", 4.3, 200, null, false, 0, 0, "");
        var lowCount = c("low", 4.8, 9);
        var valid    = c("ok", 4.1, 100);

        var filtered = picker.filter(List.of(excluded, closed, lowCount, valid),
                true, null, Set.of("skip"));

        assertThat(filtered).hasSize(1);
        assertThat(filtered.get(0).placeId()).isEqualTo("ok");

        // pick()과 동일한 candidateCount 보장
        var result = picker.pick(List.of(excluded, closed, lowCount, valid),
                true, null, Set.of("skip"));
        assertThat(result.candidateCount()).isEqualTo(filtered.size());
    }

    // SCORE 정렬: 리뷰 9489개·4.3점이 리뷰 12개·5.0점보다 앞 (C=3.9 기준)
    @Test
    void sort_score_highReviewCountLeadsLowReviewCount() {
        double C = 3.9;
        double scoreHigh = picker.computeScore(4.3, 9489, C);
        double scoreLow  = picker.computeScore(5.0, 12,   C);
        assertThat(scoreHigh).isGreaterThan(scoreLow);
    }
}
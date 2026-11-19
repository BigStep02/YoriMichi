package com.framezero.restaurant;

import com.framezero.common.GeoUtils;
import com.framezero.restaurant.cache.RestaurantCache;
import com.framezero.restaurant.client.GeminiClient;
import com.framezero.restaurant.client.PlacesClient;
import com.framezero.restaurant.dto.AiSummaryDto;
import com.framezero.restaurant.dto.DrawResponse;
import com.framezero.restaurant.dto.NearbyResponse;
import com.framezero.restaurant.dto.RestaurantDetailDto;
import com.framezero.restaurant.dto.RestaurantPickDto;
import com.framezero.restaurant.dto.ReviewDto;
import com.framezero.restaurant.dto.SummaryResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Service
public class RestaurantService {

    private final PlacesClient placesClient;
    private final GeminiClient geminiClient;
    private final RestaurantPicker picker;
    private final RestaurantCache cache;

    public RestaurantService(PlacesClient placesClient, GeminiClient geminiClient,
                             RestaurantPicker picker, RestaurantCache cache) {
        this.placesClient = placesClient;
        this.geminiClient = geminiClient;
        this.picker = picker;
        this.cache = cache;
    }

    public DrawResponse draw(double lat, double lng, int radiusM, List<Category> categories,
                             boolean openNow, Integer maxPrice, List<String> excludeList) {
        int effectiveRadius = radiusM;
        var load = loadCandidates(lat, lng, effectiveRadius, categories);

        Set<String> excludeIds = Set.copyOf(excludeList);
        RestaurantPicker.PickResult result = picker.pick(load.candidates(), openNow, maxPrice, excludeIds);

        if (result.pick() == null && effectiveRadius < 1500) {
            int expanded = effectiveRadius <= 400 ? 800 : 1500;
            var expandedLoad = loadCandidates(lat, lng, expanded, categories);
            var expandedResult = picker.pick(expandedLoad.candidates(), openNow, maxPrice, excludeIds);
            if (expandedResult.pick() != null) {
                load = expandedLoad;
                result = expandedResult;
                effectiveRadius = expanded;
            }
        }

        if (result.pick() == null) {
            return new DrawResponse(null, 0, 0, 0.0, effectiveRadius, categories, load.cached(), "NO_CANDIDATES");
        }

        double avgRating = Math.round(result.avgRating() * 100.0) / 100.0;
        var pickDto = toPickDto(lat, lng, result.pick(), result.avgRating());

        return new DrawResponse(pickDto, result.candidateCount(), result.poolCount(),
                avgRating, effectiveRadius, categories, load.cached(), null);
    }

    public NearbyResponse nearby(double lat, double lng, int radiusM, List<Category> categories,
                                  boolean openNow, Integer maxPrice, SortOrder sort) {
        int effectiveRadius = radiusM;
        var load = loadCandidates(lat, lng, effectiveRadius, categories);
        var filtered = picker.filter(load.candidates(), openNow, maxPrice, Set.of());

        if (filtered.size() < 5 && effectiveRadius < 1500) {
            int expanded = effectiveRadius <= 400 ? 800 : 1500;
            var expandedLoad = loadCandidates(lat, lng, expanded, categories);
            var expandedFiltered = picker.filter(expandedLoad.candidates(), openNow, maxPrice, Set.of());
            if (expandedFiltered.size() > filtered.size()) {
                load = expandedLoad;
                filtered = expandedFiltered;
                effectiveRadius = expanded;
            }
        }

        if (filtered.isEmpty()) {
            return new NearbyResponse(List.of(), 0, 0.0, effectiveRadius, categories, sort, load.cached());
        }

        double C = filtered.stream().mapToDouble(RestaurantPicker.Candidate::rating).average().orElse(0);
        double avgRating = Math.round(C * 100.0) / 100.0;

        Comparator<RestaurantPicker.Candidate> comparator = switch (sort) {
            case DISTANCE -> Comparator.comparingInt(
                    (RestaurantPicker.Candidate c) -> distMInt(lat, lng, c));
            case SCORE -> {
                Comparator<RestaurantPicker.Candidate> byScore = Comparator
                        .comparingDouble((RestaurantPicker.Candidate c) ->
                                picker.computeScore(c.rating(), c.ratingCount(), C))
                        .reversed();
                yield byScore.thenComparingInt(
                        (RestaurantPicker.Candidate c) -> distMInt(lat, lng, c));
            }
        };

        var restaurants = filtered.stream()
                .sorted(comparator)
                .map(c -> toPickDto(lat, lng, c, C))
                .toList();

        return new NearbyResponse(restaurants, restaurants.size(), avgRating, effectiveRadius, categories, sort, load.cached());
    }

    public RestaurantDetailDto detail(String placeId) {
        RestaurantDetailDto cached = cache.getDetail(placeId);
        if (cached != null) return cached;

        var detail = placesClient.getPlace(placeId);
        if (detail == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "맛집 정보를 불러오지 못했어요");
        }

        List<ReviewDto> reviews = buildReviews(detail);

        var rs = detail.reviewSummary();
        String googleSummaryText = (rs != null && rs.text() != null) ? rs.text().text() : null;

        // 뽑기에서 받은 일본어 이름이 있으면 name에, 한국어 displayName은 nameKo에
        String jaName = cache.getName(placeId);
        String displayName = detail.displayName() != null ? detail.displayName().text() : null;
        String name   = jaName != null ? jaName : displayName;
        String nameKo = jaName != null ? displayName : null;

        var dto = new RestaurantDetailDto(
                placeId, name, nameKo,
                detail.formattedAddress(),
                detail.rating(), detail.userRatingCount(),
                PlacesClient.parsePriceLevel(detail.priceLevel()),
                detail.currentOpeningHours() != null ? detail.currentOpeningHours().openNow() : null,
                detail.regularOpeningHours() != null ? detail.regularOpeningHours().weekdayDescriptions() : null,
                detail.googleMapsUri(), detail.websiteUri(),
                reviews.stream().limit(3).toList(),
                "Google 지도",
                googleSummaryText,
                (rs != null && rs.disclosureText() != null) ? rs.disclosureText().text() : null,
                rs != null ? rs.reviewsUri() : null,
                rs != null ? rs.flagContentUri() : null
        );
        cache.putDetail(placeId, dto);
        return dto;
    }

    public SummaryResponse summary(String placeId) {
        SummaryResponse cached = cache.getSummary(placeId);
        if (cached != null) return cached;

        com.framezero.restaurant.client.response.PlaceDetailResult detail;
        try {
            detail = placesClient.getPlace(placeId);
        } catch (Exception e) {
            var failed = new SummaryResponse("FAILED", null, null, null, null, null, null, null, null);
            cache.putSummary(placeId, failed);
            return failed;
        }

        if (detail == null) {
            var failed = new SummaryResponse("FAILED", null, null, null, null, null, null, null, null);
            cache.putSummary(placeId, failed);
            return failed;
        }

        var rs = detail.reviewSummary();
        String googleSummaryText = (rs != null && rs.text() != null) ? rs.text().text() : null;
        List<ReviewDto> reviews = buildReviews(detail);

        if ((googleSummaryText == null || googleSummaryText.isBlank()) && reviews.isEmpty()) {
            var noSource = new SummaryResponse("NO_SOURCE", null, null, null, null, null, null,
                    rs != null ? rs.reviewsUri() : null, null);
            cache.putSummary(placeId, noSource);
            return noSource;
        }

        AiSummaryDto aiSummary = (googleSummaryText != null && !googleSummaryText.isBlank())
                ? geminiClient.summarizeFromGoogleSummary(googleSummaryText)
                : geminiClient.summarize(reviews);

        if (aiSummary == null) {
            var failed = new SummaryResponse("FAILED", null, null, null, null,
                    googleSummaryText,
                    (rs != null && rs.disclosureText() != null) ? rs.disclosureText().text() : null,
                    rs != null ? rs.reviewsUri() : null,
                    rs != null ? rs.flagContentUri() : null);
            cache.putSummary(placeId, failed);
            return failed;
        }

        var ok = new SummaryResponse("OK",
                aiSummary.pros(), aiSummary.cons(), aiSummary.menus(), aiSummary.fullKo(),
                googleSummaryText,
                (rs != null && rs.disclosureText() != null) ? rs.disclosureText().text() : null,
                rs != null ? rs.reviewsUri() : null,
                rs != null ? rs.flagContentUri() : null);
        cache.putSummary(placeId, ok);
        return ok;
    }

    // ---- private helpers ----

    private record CandidateLoad(List<RestaurantPicker.Candidate> candidates, boolean cached) {}

    private CandidateLoad loadCandidates(double lat, double lng, int radiusM, List<Category> categories) {
        String cacheKey = cache.nearbyKey(lat, lng, radiusM, categories);
        List<RestaurantPicker.Candidate> candidates = cache.getNearby(cacheKey);
        if (candidates != null) return new CandidateLoad(candidates, true);
        candidates = placesClient.searchNearby(lat, lng, radiusM, categories);
        cache.putNearby(cacheKey, candidates);
        cache.putNames(candidates);
        return new CandidateLoad(candidates, false);
    }

    private int distMInt(double lat, double lng, RestaurantPicker.Candidate c) {
        return (int) Math.round(GeoUtils.distanceKm(lat, lng, c.lat(), c.lng()) * 1000);
    }

    private RestaurantPickDto toPickDto(double lat, double lng, RestaurantPicker.Candidate c, double C) {
        double score = Math.round(picker.computeScore(c.rating(), c.ratingCount(), C) * 100.0) / 100.0;
        return new RestaurantPickDto(
                c.placeId(), c.name(), c.typeLabel(),
                c.rating(), c.ratingCount(), score,
                c.priceLevel(), c.openNow(),
                distMInt(lat, lng, c), c.lat(), c.lng(), c.googleMapsUri()
        );
    }

    private List<ReviewDto> buildReviews(com.framezero.restaurant.client.response.PlaceDetailResult detail) {
        if (detail.reviews() == null) return List.of();
        return detail.reviews().stream()
                .map(r -> new ReviewDto(
                        r.authorAttribution() != null ? r.authorAttribution().displayName() : null,
                        r.authorAttribution() != null ? r.authorAttribution().uri() : null,
                        r.rating() != null ? r.rating() : 0,
                        r.text() != null ? r.text().text() : null,
                        r.relativePublishTimeDescription()
                ))
                .toList();
    }
}
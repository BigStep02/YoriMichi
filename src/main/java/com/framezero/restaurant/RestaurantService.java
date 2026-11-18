package com.framezero.restaurant;

import com.framezero.common.GeoUtils;
import com.framezero.restaurant.cache.RestaurantCache;
import com.framezero.restaurant.client.GeminiClient;
import com.framezero.restaurant.client.PlacesClient;
import com.framezero.restaurant.dto.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

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
        String cacheKey = cache.nearbyKey(lat, lng, radiusM, categories);

        List<RestaurantPicker.Candidate> candidates = cache.getNearby(cacheKey);
        boolean cached = candidates != null;

        if (!cached) {
            candidates = placesClient.searchNearby(lat, lng, radiusM, categories);
            cache.putNearby(cacheKey, candidates);
            cache.putNames(candidates);
        }

        Set<String> excludeIds = Set.copyOf(excludeList);
        RestaurantPicker.PickResult result = picker.pick(candidates, openNow, maxPrice, excludeIds);

        if (result.pick() == null) {
            return new DrawResponse(null, 0, 0, 0.0, radiusM, categories, cached, "NO_CANDIDATES");
        }

        RestaurantPicker.Candidate c = result.pick();
        double score = Math.round(picker.computeScore(c.rating(), c.ratingCount(), result.avgRating()) * 100.0) / 100.0;
        int distM = (int) Math.round(GeoUtils.distanceKm(lat, lng, c.lat(), c.lng()) * 1000);
        double avgRating = Math.round(result.avgRating() * 100.0) / 100.0;

        var pickDto = new RestaurantPickDto(
                c.placeId(), c.name(), c.typeLabel(),
                c.rating(), c.ratingCount(), score,
                c.priceLevel(), c.openNow(),
                distM, c.lat(), c.lng(), c.googleMapsUri()
        );

        return new DrawResponse(pickDto, result.candidateCount(), result.poolCount(),
                avgRating, radiusM, categories, cached, null);
    }

    public RestaurantDetailDto detail(String placeId) {
        RestaurantDetailDto cached = cache.getDetail(placeId);
        if (cached != null) return cached;

        var detail = placesClient.getPlace(placeId);
        if (detail == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "맛집 정보를 불러오지 못했어요");
        }

        List<ReviewDto> reviews = buildReviews(detail);
        AiSummaryDto aiSummary = geminiClient.summarize(reviews);

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
                aiSummary,
                "Google 지도"
        );

        cache.putDetail(placeId, dto);
        return dto;
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
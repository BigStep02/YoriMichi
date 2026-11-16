package com.framezero.restaurant.client;

import com.framezero.restaurant.Category;
import com.framezero.restaurant.RestaurantPicker;
import com.framezero.restaurant.client.response.NearbySearchResponse;
import com.framezero.restaurant.client.response.PlaceDetailResult;
import com.framezero.restaurant.client.response.PlaceResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Component
public class PlacesClient {

    private static final String NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
    private static final String DETAIL_URL  = "https://places.googleapis.com/v1/places/{placeId}?languageCode=ko";

    private static final String NEARBY_FIELD_MASK =
            "places.id,places.displayName,places.location,places.rating," +
            "places.userRatingCount,places.priceLevel,places.currentOpeningHours.openNow," +
            "places.primaryTypeDisplayName,places.googleMapsUri";

    private static final String DETAIL_FIELD_MASK =
            "id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel," +
            "currentOpeningHours.openNow,regularOpeningHours.weekdayDescriptions," +
            "googleMapsUri,websiteUri,reviews";

    @Value("${google.maps.api-key:}")
    private String apiKey;

    private final RestClient restClient;

    public PlacesClient(@Qualifier("placesRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    public boolean isKeyMissing() {
        return apiKey == null || apiKey.isBlank();
    }

    public List<RestaurantPicker.Candidate> searchNearby(double lat, double lng, int radiusM, Category category) {
        if (isKeyMissing()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "맛집 기능 준비 중이에요");
        }

        var body = Map.of(
                "includedPrimaryTypes", category.includedPrimaryTypes(),
                "maxResultCount", 20,
                "rankPreference", "POPULARITY",
                "languageCode", "ja",
                "regionCode", "JP",
                "locationRestriction", Map.of(
                        "circle", Map.of(
                                "center", Map.of("latitude", lat, "longitude", lng),
                                "radius", (double) radiusM
                        )
                )
        );

        try {
            var response = restClient.post()
                    .uri(NEARBY_URL)
                    .header("X-Goog-Api-Key", apiKey)
                    .header("X-Goog-FieldMask", NEARBY_FIELD_MASK)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(NearbySearchResponse.class);

            if (response == null || response.places() == null) return List.of();

            return response.places().stream()
                    .map(this::toCandidate)
                    .filter(Objects::nonNull)
                    .toList();

        } catch (HttpClientErrorException e) {
            throw asPlacesError(e);
        } catch (RestClientException e) {
            log.warn("Places searchNearby failed", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "맛집 정보를 불러오지 못했어요");
        }
    }

    public PlaceDetailResult getPlace(String placeId) {
        if (isKeyMissing()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "맛집 기능 준비 중이에요");
        }

        try {
            return restClient.get()
                    .uri(DETAIL_URL, placeId)
                    .header("X-Goog-Api-Key", apiKey)
                    .header("X-Goog-FieldMask", DETAIL_FIELD_MASK)
                    .retrieve()
                    .body(PlaceDetailResult.class);

        } catch (HttpClientErrorException e) {
            throw asPlacesError(e);
        } catch (RestClientException e) {
            log.warn("Places getPlace failed", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "맛집 정보를 불러오지 못했어요");
        }
    }

    private ResponseStatusException asPlacesError(HttpClientErrorException e) {
        int status = e.getStatusCode().value();
        if (status == 429) {
            return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "요청이 많아요. 잠시 후 다시 시도해 주세요");
        }
        if (status == 404) {
            return new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 장소를 찾을 수 없어요");
        }
        log.warn("Places API error: status={}", status);
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "맛집 정보를 불러오지 못했어요");
    }

    private RestaurantPicker.Candidate toCandidate(PlaceResult p) {
        if (p.id() == null || p.location() == null) return null;
        return new RestaurantPicker.Candidate(
                p.id(),
                p.displayName() != null ? p.displayName().text() : null,
                p.primaryTypeDisplayName() != null ? p.primaryTypeDisplayName().text() : null,
                p.rating() != null ? p.rating() : 0.0,
                p.userRatingCount() != null ? p.userRatingCount() : 0,
                parsePriceLevel(p.priceLevel()),
                p.currentOpeningHours() != null ? p.currentOpeningHours().openNow() : null,
                p.location().latitude() != null ? p.location().latitude() : 0.0,
                p.location().longitude() != null ? p.location().longitude() : 0.0,
                p.googleMapsUri()
        );
    }

    public static Integer parsePriceLevel(String level) {
        if (level == null) return null;
        return switch (level) {
            case "PRICE_LEVEL_FREE"           -> 0;
            case "PRICE_LEVEL_INEXPENSIVE"    -> 1;
            case "PRICE_LEVEL_MODERATE"       -> 2;
            case "PRICE_LEVEL_EXPENSIVE"      -> 3;
            case "PRICE_LEVEL_VERY_EXPENSIVE" -> 4;
            default                           -> null;
        };
    }
}
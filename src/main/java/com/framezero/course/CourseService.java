package com.framezero.course;

import com.framezero.common.GeoUtils;
import com.framezero.course.dto.CourseDrawResponse;
import com.framezero.course.dto.CourseSpotDto;
import com.framezero.festival.FestivalService;
import com.framezero.festival.dto.FestivalSummaryDto;
import com.framezero.restaurant.Category;
import com.framezero.restaurant.RestaurantPicker;
import com.framezero.restaurant.RestaurantService;
import com.framezero.restaurant.client.PlacesClient;
import com.framezero.restaurant.dto.DrawResponse;
import com.framezero.restaurant.dto.RestaurantPickDto;
import com.framezero.spot.Spot;
import com.framezero.spot.SpotKind;
import com.framezero.spot.SpotService;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class CourseService {

    private static final int SPOT_SUPPLEMENT_THRESHOLD = 6;
    private static final int SPOT_PICK_TOP_N = 5;
    private static final int FESTIVAL_PICK_TOP_N = 3;
    private static final int FESTIVAL_LOOKAHEAD_DAYS = 90;

    private final SpotService spotService;
    private final FestivalService festivalService;
    private final RestaurantService restaurantService;
    private final PlacesClient placesClient;
    private final Clock clock;

    public CourseService(SpotService spotService, FestivalService festivalService,
                         RestaurantService restaurantService, PlacesClient placesClient, Clock clock) {
        this.spotService = spotService;
        this.festivalService = festivalService;
        this.restaurantService = restaurantService;
        this.placesClient = placesClient;
        this.clock = clock;
    }

    public CourseDrawResponse draw(double lat, double lng, int radiusKm, int restaurantRadiusM,
                                    CoursePreset preset, boolean openNow, Integer maxPrice,
                                    List<String> excludeRestaurants, Collection<SpotKind> kinds) {
        return switch (preset) {
            case RESTAURANT_ONLY       -> drawRestaurantOnly(lat, lng, restaurantRadiusM, openNow, maxPrice, excludeRestaurants);
            case SPOT_RESTAURANT       -> drawSpotRestaurant(lat, lng, radiusKm, restaurantRadiusM, false, openNow, maxPrice, excludeRestaurants, kinds);
            case SPOT_RESTAURANT_CAFE  -> drawSpotRestaurant(lat, lng, radiusKm, restaurantRadiusM, true,  openNow, maxPrice, excludeRestaurants, kinds);
            case FESTIVAL_RESTAURANT   -> drawFestivalRestaurant(lat, lng, radiusKm, restaurantRadiusM, openNow, maxPrice, excludeRestaurants);
        };
    }

    // ---- preset handlers ----

    private CourseDrawResponse drawRestaurantOnly(double lat, double lng, int restaurantRadiusM,
                                                   boolean openNow, Integer maxPrice, List<String> excludes) {
        DrawResponse r = restaurantService.draw(lat, lng, restaurantRadiusM,
                List.of(Category.ALL), openNow, maxPrice, excludes);
        List<RestaurantPickDto> restaurants = r.pick() != null ? List.of(r.pick()) : List.of();
        return new CourseDrawResponse(CoursePreset.RESTAURANT_ONLY, null, null,
                restaurants, null, 0, false, r.radiusM(),
                r.pick() == null ? "NO_RESTAURANT" : null);
    }

    private CourseDrawResponse drawSpotRestaurant(double lat, double lng, int radiusKm, int restaurantRadiusM,
                                                   boolean withCafe, boolean openNow, Integer maxPrice,
                                                   List<String> excludes, Collection<SpotKind> kinds) {
        LocalDateTime now = LocalDateTime.now(clock);

        // 지금 문 닫은 곳(오늘 휴무·정기휴일·영업 끝남)은 코스에서 뺌. 시간 미상(null)은 남김
        List<Spot> dbSpots = spotService.candidates(lat, lng, radiusKm, kinds).stream()
                .filter(s -> !Boolean.FALSE.equals(s.isOpenAt(now)))
                .toList();
        int dbCount = dbSpots.size();

        List<CourseSpotDto> allCandidates = new ArrayList<>(
                dbSpots.stream().map(s -> toSpotDto(s, lat, lng, now)).toList()
        );

        boolean supplemented = false;
        if (dbCount < SPOT_SUPPLEMENT_THRESHOLD) {
            int radiusM = Math.min(radiusKm * 1000, 10_000);
            List<RestaurantPicker.Candidate> placesSpots = placesClient.searchNearbySpots(lat, lng, radiusM);
            if (!placesSpots.isEmpty()) {
                placesSpots.stream()
                        .filter(c -> !Boolean.FALSE.equals(c.openNow()))
                        .map(c -> toPlacesSpotDto(c, lat, lng)).forEach(allCandidates::add);
                supplemented = true;
            }
        }

        if (allCandidates.isEmpty()) {
            CoursePreset p = withCafe ? CoursePreset.SPOT_RESTAURANT_CAFE : CoursePreset.SPOT_RESTAURANT;
            return new CourseDrawResponse(p, null, null, List.of(), null, dbCount, false, restaurantRadiusM, "NO_SPOT");
        }

        CourseSpotDto spot = pickClosestRandom(allCandidates, SPOT_PICK_TOP_N);

        DrawResponse rr = restaurantService.draw(spot.lat(), spot.lng(), restaurantRadiusM,
                List.of(Category.ALL), openNow, maxPrice, excludes);

        RestaurantPickDto cafe = null;
        if (withCafe) {
            List<String> cafeExcludes = new ArrayList<>(excludes);
            if (rr.pick() != null) cafeExcludes.add(rr.pick().placeId());
            DrawResponse cr = restaurantService.draw(spot.lat(), spot.lng(), restaurantRadiusM,
                    List.of(Category.CAFE), openNow, maxPrice, cafeExcludes);
            cafe = cr.pick();
        }

        CoursePreset p = withCafe ? CoursePreset.SPOT_RESTAURANT_CAFE : CoursePreset.SPOT_RESTAURANT;
        List<RestaurantPickDto> restaurants = rr.pick() != null ? List.of(rr.pick()) : List.of();
        return new CourseDrawResponse(p, spot, null, restaurants, cafe, dbCount, supplemented,
                rr.radiusM(), rr.pick() == null ? "NO_RESTAURANT" : null);
    }

    private CourseDrawResponse drawFestivalRestaurant(double lat, double lng, int radiusKm, int restaurantRadiusM,
                                                       boolean openNow, Integer maxPrice, List<String> excludes) {
        LocalDate today = LocalDate.now(clock);
        var festivalResponse = festivalService.search(lat, lng, radiusKm, today, today.plusDays(FESTIVAL_LOOKAHEAD_DAYS));
        List<FestivalSummaryDto> festivals = festivalResponse.festivals();

        if (festivals.isEmpty()) {
            return new CourseDrawResponse(CoursePreset.FESTIVAL_RESTAURANT, null, null,
                    List.of(), null, 0, false, restaurantRadiusM, "NO_FESTIVAL");
        }

        FestivalSummaryDto festival = pickFestival(festivals);
        DrawResponse rr = restaurantService.draw(festival.lat(), festival.lng(), restaurantRadiusM,
                List.of(Category.ALL), openNow, maxPrice, excludes);

        List<RestaurantPickDto> restaurants = rr.pick() != null ? List.of(rr.pick()) : List.of();
        return new CourseDrawResponse(CoursePreset.FESTIVAL_RESTAURANT, null, festival,
                restaurants, null, 0, false, rr.radiusM(),
                rr.pick() == null ? "NO_RESTAURANT" : null);
    }

    // ---- pick helpers ----

    private CourseSpotDto pickClosestRandom(List<CourseSpotDto> candidates, int topN) {
        var pool = candidates.stream()
                .sorted(Comparator.comparingDouble(CourseSpotDto::distanceKm))
                .limit(topN)
                .toList();
        return pool.get(ThreadLocalRandom.current().nextInt(pool.size()));
    }

    private FestivalSummaryDto pickFestival(List<FestivalSummaryDto> festivals) {
        List<FestivalSummaryDto> ongoing = festivals.stream()
                .filter(FestivalSummaryDto::ongoing)
                .limit(FESTIVAL_PICK_TOP_N)
                .toList();
        if (!ongoing.isEmpty()) return ongoing.get(ThreadLocalRandom.current().nextInt(ongoing.size()));
        List<FestivalSummaryDto> top = festivals.stream().limit(FESTIVAL_PICK_TOP_N).toList();
        return top.get(ThreadLocalRandom.current().nextInt(top.size()));
    }

    // ---- DTO converters ----

    private CourseSpotDto toSpotDto(Spot s, double refLat, double refLng, LocalDateTime now) {
        double km = Math.round(GeoUtils.distanceKm(refLat, refLng,
                s.getLat().doubleValue(), s.getLng().doubleValue()) * 10.0) / 10.0;
        return new CourseSpotDto(
                s.getId(), s.getGooglePlaceId(),
                s.getName(), s.getNameJa(),
                s.getKind().name(), s.getPrefecture(), s.getCity(),
                km, s.getLat().doubleValue(), s.getLng().doubleValue(),
                s.isOpenAt(now), SpotService.hoursLabel(s, now.toLocalDate()),
                summary(s.getDescription()), s.getOfficialUrl(), null, false
        );
    }

    private CourseSpotDto toPlacesSpotDto(RestaurantPicker.Candidate c, double refLat, double refLng) {
        double km = Math.round(GeoUtils.distanceKm(refLat, refLng, c.lat(), c.lng()) * 10.0) / 10.0;
        return new CourseSpotDto(
                null, c.placeId(),
                c.name(), null,
                c.typeKo() != null ? c.typeKo() : c.typeLabel(), null, null,
                km, c.lat(), c.lng(),
                c.openNow(), null, null, null, c.googleMapsUri(), true
        );
    }

    private static String summary(String description) {
        if (description == null || description.isBlank()) return null;
        int dot = description.indexOf(". ");
        if (dot >= 0) return description.substring(0, dot + 1);
        return description.length() <= 80 ? description : description.substring(0, 80) + "…";
    }
}
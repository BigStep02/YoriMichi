package com.framezero.saved;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.framezero.common.GeoUtils;
import com.framezero.festival.Festival;
import com.framezero.festival.FestivalRepository;
import com.framezero.saved.dto.CourseStop;
import com.framezero.saved.dto.SaveRequest;
import com.framezero.saved.dto.SavedItemResponse;
import com.framezero.saved.dto.SavedItemResponse.CoursePart;
import com.framezero.saved.dto.SavedItemResponse.FestivalPart;
import com.framezero.saved.dto.SavedItemResponse.RestaurantPart;
import com.framezero.saved.dto.SavedItemResponse.SpotPart;
import com.framezero.saved.dto.UpdateSavedRequest;
import com.framezero.spot.Spot;
import com.framezero.spot.SpotKind;
import com.framezero.spot.SpotRepository;
import com.framezero.spot.SpotService;
import jakarta.persistence.EntityNotFoundException;
import org.hibernate.Hibernate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class SavedService {

    /** Google place_id 형식 (영문·숫자·_·-) */
    private static final Pattern PLACE_ID = Pattern.compile("^[A-Za-z0-9_-]{10,300}$");
    private static final Set<String> STOP_TYPES = Set.of("SPOT", "FESTIVAL", "RESTAURANT", "PLACE");
    /** 맛집 도시 이름: 이 반경 안 가장 가까운 놀거리·축제의 지역을 빌려 씀 */
    private static final double CITY_RADIUS_KM = 15;

    private final SavedItemRepository savedRepository;
    private final FestivalRepository festivalRepository;
    private final SpotRepository spotRepository;
    /** 코스 칸 JSON 전용 (Spring Boot 4는 Jackson 3 빈이라 직접 만듦) */
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Clock clock;

    public SavedService(SavedItemRepository savedRepository, FestivalRepository festivalRepository,
                        SpotRepository spotRepository, Clock clock) {
        this.savedRepository = savedRepository;
        this.festivalRepository = festivalRepository;
        this.spotRepository = spotRepository;
        this.clock = clock;
    }

    // ── 저장 ─────────────────────────────────────────

    /** 이미 저장돼 있으면 그대로 돌려줌 (하트 연타·중복 요청에도 200) */
    @Transactional
    public SavedItemResponse save(Long userId, SaveRequest req) {
        SavedItem item = switch (req.type()) {
            case FESTIVAL -> festivalItem(userId, req);
            case SPOT -> spotItem(userId, req);
            case RESTAURANT -> restaurantItem(userId, req);
            case COURSE -> courseItem(userId, req);
        };
        Optional<SavedItem> existing = savedRepository.findByUserIdAndTypeAndRefKey(userId, item.getType(), item.getRefKey());
        if (existing.isPresent()) return toResponses(List.of(existing.get())).get(0);
        // 동시에 두 번 들어와 유니크 충돌하면 GlobalExceptionHandler가 409 (프론트는 버튼 잠금으로 막음)
        return toResponses(List.of(savedRepository.save(item))).get(0);
    }

    private SavedItem festivalItem(Long userId, SaveRequest req) {
        Long id = require(req.festivalId(), "festivalId가 필요해요.");
        if (!festivalRepository.existsById(id)) throw new EntityNotFoundException("축제를 찾을 수 없어요.");
        return base(userId, req, SavedType.FESTIVAL, "F:" + id).festivalId(id).build();
    }

    private SavedItem spotItem(Long userId, SaveRequest req) {
        Long id = require(req.spotId(), "spotId가 필요해요.");
        if (!spotRepository.existsById(id)) throw new EntityNotFoundException("놀거리를 찾을 수 없어요.");
        return base(userId, req, SavedType.SPOT, "S:" + id).spotId(id).build();
    }

    private SavedItem restaurantItem(Long userId, SaveRequest req) {
        String placeId = placeId(req.placeId());
        String[] region = (req.lat() != null && req.lng() != null) ? nearestRegion(req.lat(), req.lng()) : null;
        String metType = null;
        Long metId = null;
        if (req.metId() != null && ("SPOT".equals(req.metType()) || "FESTIVAL".equals(req.metType()))) {
            boolean exists = "SPOT".equals(req.metType())
                    ? spotRepository.existsById(req.metId()) : festivalRepository.existsById(req.metId());
            if (exists) { metType = req.metType(); metId = req.metId(); }
        }
        return base(userId, req, SavedType.RESTAURANT, "R:" + placeId)
                .placeId(placeId)
                .prefecture(region != null ? region[0] : null)
                .city(region != null ? region[1] : null)
                .metType(metType).metId(metId)
                .build();
    }

    private SavedItem courseItem(Long userId, SaveRequest req) {
        if (req.course() == null || req.course().stops() == null || req.course().stops().isEmpty())
            throw new IllegalArgumentException("코스 칸이 비어 있어요.");
        List<CourseStop> stops = new ArrayList<>();
        StringBuilder key = new StringBuilder("C:");
        for (CourseStop s : req.course().stops()) {
            String type = s.type() == null ? "" : s.type().toUpperCase(Locale.ROOT);
            if (!STOP_TYPES.contains(type)) throw new IllegalArgumentException("알 수 없는 코스 칸: " + s.type());
            CourseStop clean;
            if (type.equals("SPOT") || type.equals("FESTIVAL")) {
                Long id = require(s.id(), "코스 칸 id가 필요해요.");
                clean = new CourseStop(type, id, null);
                key.append(type.charAt(0)).append(':').append(id);
            } else {
                String pid = placeId(s.placeId());
                clean = new CourseStop(type, null, pid);
                key.append(type.equals("RESTAURANT") ? 'R' : 'P').append(':').append(pid);
            }
            stops.add(clean);
            key.append('|');
        }
        key.setLength(key.length() - 1);
        if (key.length() > 400) throw new IllegalArgumentException("코스가 너무 길어요.");
        String json;
        try {
            json = objectMapper.writeValueAsString(stops);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("코스를 저장할 수 없어요.");
        }
        return base(userId, req, SavedType.COURSE, key.toString())
                .preset(req.course().preset())
                .courseJson(json)
                .build();
    }

    private SavedItem.SavedItemBuilder base(Long userId, SaveRequest req, SavedType type, String key) {
        return SavedItem.builder().userId(userId).type(type).refKey(key).memo(blankToNull(req.memo()));
    }

    // ── 조회 ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SavedItemResponse> list(Long userId, SavedType type) {
        List<SavedItem> items = type == null
                ? savedRepository.findByUserIdOrderByCreatedAtDesc(userId)
                : savedRepository.findByUserIdAndTypeOrderByCreatedAtDesc(userId, type);
        return toResponses(items);
    }

    @Transactional(readOnly = true)
    public List<String> keys(Long userId) {
        return savedRepository.findByUserIdOrderByCreatedAtDesc(userId).stream().map(SavedItem::getRefKey).toList();
    }

    // ── 수정·삭제 ────────────────────────────────────

    @Transactional
    public SavedItemResponse update(Long userId, Long id, UpdateSavedRequest req) {
        SavedItem item = owned(userId, id);
        if (req.memo() != null) item.updateMemo(blankToNull(req.memo()));
        if (req.visited() != null) item.updateVisited(req.visited());
        return toResponses(List.of(item)).get(0);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        savedRepository.delete(owned(userId, id));
    }

    /** 하트 토글용: 키로 삭제. 없으면 조용히 끝 */
    @Transactional
    public void deleteByKey(Long userId, String key) {
        savedRepository.findByUserIdAndRefKey(userId, key).ifPresent(savedRepository::delete);
    }

    private SavedItem owned(Long userId, Long id) {
        SavedItem item = savedRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("저장한 항목을 찾을 수 없어요."));
        if (!item.getUserId().equals(userId)) throw new AccessDeniedException("남의 저장 항목");
        return item;
    }

    // ── 응답 만들기 (축제·놀거리 이름은 한 번에 모아서 조회) ──

    private List<SavedItemResponse> toResponses(List<SavedItem> items) {
        Map<Long, List<CourseStop>> courseStops = new HashMap<>();
        Set<Long> festivalIds = new HashSet<>();
        Set<Long> spotIds = new HashSet<>();
        for (SavedItem it : items) {
            if (it.getFestivalId() != null) festivalIds.add(it.getFestivalId());
            if (it.getSpotId() != null) spotIds.add(it.getSpotId());
            if ("FESTIVAL".equals(it.getMetType())) festivalIds.add(it.getMetId());
            if ("SPOT".equals(it.getMetType())) spotIds.add(it.getMetId());
            if (it.getType() == SavedType.COURSE) {
                List<CourseStop> stops = readStops(it.getCourseJson());
                courseStops.put(it.getId(), stops);
                for (CourseStop s : stops) {
                    if ("FESTIVAL".equals(s.type()) && s.id() != null) festivalIds.add(s.id());
                    if ("SPOT".equals(s.type()) && s.id() != null) spotIds.add(s.id());
                }
            }
        }
        Map<Long, Festival> festivals = festivalRepository.findAllById(festivalIds).stream()
                .collect(Collectors.toMap(Festival::getId, Function.identity()));
        Map<Long, Spot> spots = spotRepository.findAllById(spotIds).stream()
                .collect(Collectors.toMap(Spot::getId, Function.identity()));

        LocalDateTime now = LocalDateTime.now(clock);
        List<SavedItemResponse> out = new ArrayList<>();
        for (SavedItem it : items) {
            FestivalPart fp = null;
            SpotPart sp = null;
            RestaurantPart rp = null;
            CoursePart cp = null;
            switch (it.getType()) {
                case FESTIVAL -> {
                    Festival f = festivals.get(it.getFestivalId());
                    if (f == null) continue;
                    fp = festivalPart(f, now.toLocalDate());
                }
                case SPOT -> {
                    Spot s = spots.get(it.getSpotId());
                    if (s == null) continue;
                    sp = spotPart(s, now);
                }
                case RESTAURANT -> {
                    String metName = null;
                    if ("SPOT".equals(it.getMetType()) && spots.containsKey(it.getMetId())) metName = spots.get(it.getMetId()).getName();
                    if ("FESTIVAL".equals(it.getMetType()) && festivals.containsKey(it.getMetId())) metName = festivals.get(it.getMetId()).getName();
                    rp = new RestaurantPart(it.getPlaceId(), it.getPrefecture(), it.getCity(), it.getMetType(), it.getMetId(), metName);
                }
                case COURSE -> {
                    List<CoursePart.Stop> stops = new ArrayList<>();
                    for (CourseStop s : courseStops.getOrDefault(it.getId(), List.of())) {
                        if ("SPOT".equals(s.type()) && spots.containsKey(s.id())) {
                            Spot x = spots.get(s.id());
                            stops.add(new CoursePart.Stop("SPOT", x.getId(), null, x.getName(), x.getNameJa(),
                                    x.getKind().name(), x.getPrefecture(), x.getCity()));
                        } else if ("FESTIVAL".equals(s.type()) && festivals.containsKey(s.id())) {
                            Festival x = festivals.get(s.id());
                            stops.add(new CoursePart.Stop("FESTIVAL", x.getId(), null, x.getName(), x.getNameJa(),
                                    null, x.getPrefecture(), x.getCity()));
                        } else if (s.placeId() != null) {
                            stops.add(new CoursePart.Stop(s.type(), null, s.placeId(), null, null, null, null, null));
                        }
                    }
                    cp = new CoursePart(it.getPreset(), stops);
                }
            }
            out.add(new SavedItemResponse(it.getId(), it.getType(), it.getRefKey(), it.getMemo(), it.isVisited(),
                    it.getCreatedAt(), fp, sp, rp, cp));
        }
        return out;
    }

    private FestivalPart festivalPart(Festival f, LocalDate today) {
        String status;
        Long dDay = null;
        if (f.getEndDate() != null && f.getEndDate().isBefore(today)) status = "ENDED";
        else if (f.getStartDate() != null && f.getStartDate().isAfter(today)) {
            status = "UPCOMING";
            dDay = ChronoUnit.DAYS.between(today, f.getStartDate());
        } else status = "ONGOING";
        return new FestivalPart(f.getId(), f.getName(), f.getNameJa(), f.getPrefecture(), f.getCity(),
                f.getStartDate(), f.getEndDate(), status, dDay, num(f.getLat()), num(f.getLng()));
    }

    private SpotPart spotPart(Spot s, LocalDateTime now) {
        Hibernate.initialize(s.getSeasons());   // open-in-view=false → 트랜잭션 안에서 계절 행 로딩
        return new SpotPart(s.getId(), s.getName(), s.getNameJa(), s.getKind().name(), s.getPrefecture(), s.getCity(),
                s.isOpenAt(now), SpotService.hoursLabel(s, now.toLocalDate()), num(s.getLat()), num(s.getLng()));
    }

    // ── 맛집 도시: 가까운 놀거리·축제의 지역 (우리 데이터) ──

    private String[] nearestRegion(double lat, double lng) {
        GeoUtils.BoundingBox box = GeoUtils.boundingBox(lat, lng, CITY_RADIUS_KM);
        String[] best = null;
        double bestKm = Double.MAX_VALUE;
        for (Spot s : spotRepository.findInBox(bd(box.minLat()), bd(box.maxLat()), bd(box.minLng()), bd(box.maxLng()), EnumSet.allOf(SpotKind.class))) {
            double d = GeoUtils.distanceKm(lat, lng, num(s.getLat()), num(s.getLng()));
            if (d < bestKm) { bestKm = d; best = new String[]{s.getPrefecture(), s.getCity()}; }
        }
        for (Festival f : festivalRepository.findByBoundingBoxAndPeriod(bd(box.minLat()), bd(box.maxLat()), bd(box.minLng()), bd(box.maxLng()),
                LocalDate.of(2000, 1, 1), LocalDate.of(2100, 1, 1))) {
            double d = GeoUtils.distanceKm(lat, lng, num(f.getLat()), num(f.getLng()));
            if (d < bestKm) { bestKm = d; best = new String[]{f.getPrefecture(), f.getCity()}; }
        }
        return bestKm <= CITY_RADIUS_KM ? best : null;
    }

    // ── 작은 도우미 ──

    private List<CourseStop> readStops(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<CourseStop>>() {});
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    private static String placeId(String v) {
        if (v == null || !PLACE_ID.matcher(v).matches()) throw new IllegalArgumentException("placeId 형식이 올바르지 않아요.");
        return v;
    }

    private static <T> T require(T v, String message) {
        if (v == null) throw new IllegalArgumentException(message);
        return v;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static BigDecimal bd(double v) {
        return BigDecimal.valueOf(v);
    }

    private static double num(BigDecimal v) {
        return v == null ? 0 : v.doubleValue();
    }
}

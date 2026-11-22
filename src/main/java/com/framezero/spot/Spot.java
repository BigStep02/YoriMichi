package com.framezero.spot;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;

@Entity
@Table(name = "spots")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Spot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "name_ja", length = 100)
    private String nameJa;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SpotKind kind;

    @Column(nullable = false, length = 20)
    private String prefecture;

    @Column(nullable = false, length = 50)
    private String city;

    @Column(nullable = false, precision = 9, scale = 6)
    private BigDecimal lat;

    @Column(nullable = false, precision = 9, scale = 6)
    private BigDecimal lng;

    @Enumerated(EnumType.STRING)
    @Column(name = "hours_kind", nullable = false, length = 10)
    private HoursKind hoursKind;

    @Column(name = "open_time", length = 5)
    private String openTime;

    @Column(name = "close_time", length = 5)
    private String closeTime;

    @Column(name = "closed_days", length = 30)
    private String closedDays;

    @Column(name = "hours_note", length = 200)
    private String hoursNote;

    @Column(name = "fee_note", length = 100)
    private String feeNote;

    @Lob
    private String description;

    @Lob
    private String tips;

    @Column(name = "google_place_id", length = 100)
    private String googlePlaceId;

    @Column(name = "official_url", length = 500)
    private String officialUrl;

    @Column(name = "verified_at")
    private LocalDate verifiedAt;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    /** 정기휴일·운영시간 기준으로 지금 열려 있는지. 날마다 달라서 모르면 null (임시휴업은 모름) */
    public Boolean isOpenAt(LocalDateTime now) {
        if (closedDays != null && !closedDays.isBlank()) {
            String today = now.getDayOfWeek().name().substring(0, 3);
            boolean closed = Arrays.stream(closedDays.split(","))
                    .map(String::trim)
                    .anyMatch(d -> d.equalsIgnoreCase(today));
            if (closed) return false;
        }
        if (hoursKind == HoursKind.ALWAYS) return true;
        if (hoursKind == HoursKind.VARIES || openTime == null || closeTime == null) return null;
        LocalTime t = now.toLocalTime();
        LocalTime open = LocalTime.parse(openTime);
        LocalTime close = LocalTime.parse(closeTime);
        return close.isAfter(open)
                ? !t.isBefore(open) && t.isBefore(close)
                : !t.isBefore(open) || t.isBefore(close);   // 자정 넘어서 닫는 곳
    }
}

package com.framezero.festival;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "festivals")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Festival {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "name_ja", length = 100)
    private String nameJa;

    @Column(nullable = false, length = 20)
    private String prefecture;

    @Column(nullable = false, length = 50)
    private String city;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "festival_year", nullable = false)
    private Integer festivalYear;

    @Column(nullable = false, precision = 9, scale = 6)
    private BigDecimal lat;

    @Column(nullable = false, precision = 9, scale = 6)
    private BigDecimal lng;

    @Lob
    private String description;

    @Lob
    private String tips;

    @Column(name = "official_url", length = 500)
    private String officialUrl;

    @Column(name = "verified_at")
    private LocalDate verifiedAt;

    @Column(name = "image_url", length = 500)
    private String imageUrl;
}
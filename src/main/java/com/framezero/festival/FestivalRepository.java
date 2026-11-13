package com.framezero.festival;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface FestivalRepository extends JpaRepository<Festival, Long> {

    @Query("""
            SELECT f FROM Festival f
            WHERE f.lat BETWEEN :minLat AND :maxLat
              AND f.lng BETWEEN :minLng AND :maxLng
              AND f.startDate <= :to
              AND f.endDate >= :from
            ORDER BY f.startDate
            """)
    List<Festival> findByBoundingBoxAndPeriod(
            @Param("minLat") BigDecimal minLat,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng,
            @Param("maxLng") BigDecimal maxLng,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            SELECT f FROM Festival f
            WHERE f.lat BETWEEN :minLat AND :maxLat
              AND f.lng BETWEEN :minLng AND :maxLng
              AND f.endDate >= :today
            ORDER BY f.startDate
            """)
    List<Festival> findUpcomingByBoundingBox(
            @Param("minLat") BigDecimal minLat,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng,
            @Param("maxLng") BigDecimal maxLng,
            @Param("today") LocalDate today
    );
}
package com.framezero.spot;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;

public interface SpotRepository extends JpaRepository<Spot, Long> {

    @Query("""
            SELECT s FROM Spot s
            WHERE s.lat BETWEEN :minLat AND :maxLat
              AND s.lng BETWEEN :minLng AND :maxLng
              AND s.kind IN :kinds
            """)
    List<Spot> findInBox(
            @Param("minLat") BigDecimal minLat,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng,
            @Param("maxLng") BigDecimal maxLng,
            @Param("kinds") Collection<SpotKind> kinds
    );
}

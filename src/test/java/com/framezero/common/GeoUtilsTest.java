package com.framezero.common;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class GeoUtilsTest {

    @Test
    void 오사카역_교토역_거리_약40km() {
        double dist = GeoUtils.distanceKm(34.7025, 135.4959, 34.9858, 135.7588);
        assertThat(dist).isBetween(35.0, 45.0);
    }
}
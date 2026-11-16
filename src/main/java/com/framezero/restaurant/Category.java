package com.framezero.restaurant;

import java.util.List;

public enum Category {
    ALL, RAMEN, SUSHI, CAFE;

    public List<String> includedPrimaryTypes() {
        return switch (this) {
            case ALL   -> List.of("restaurant");
            case RAMEN -> List.of("ramen_restaurant");
            case SUSHI -> List.of("sushi_restaurant");
            case CAFE  -> List.of("cafe");
        };
    }
}
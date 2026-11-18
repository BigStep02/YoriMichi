package com.framezero.restaurant;

import java.util.Comparator;
import java.util.List;

public enum Category {
    ALL, CAFE, CURRY, IZAKAYA, RAMEN, SEAFOOD, SUSHI, TONKATSU, YAKINIKU, YAKITORI;

    public List<String> includedPrimaryTypes() {
        return switch (this) {
            case ALL      -> List.of("restaurant");
            case RAMEN    -> List.of("ramen_restaurant");
            case SUSHI    -> List.of("sushi_restaurant");
            case IZAKAYA  -> List.of("japanese_izakaya_restaurant");
            case YAKINIKU -> List.of("yakiniku_restaurant");
            case YAKITORI -> List.of("yakitori_restaurant");
            case TONKATSU -> List.of("tonkatsu_restaurant");
            case CURRY    -> List.of("japanese_curry_restaurant");
            case SEAFOOD  -> List.of("seafood_restaurant");
            case CAFE     -> List.of("cafe", "coffee_shop");
        };
    }

    public static List<Category> normalize(List<Category> categories) {
        if (categories == null || categories.isEmpty()) return List.of(ALL);
        var distinct = categories.stream().distinct().toList();
        if (distinct.contains(ALL)) return List.of(ALL);
        return distinct.stream()
                .limit(10)
                .sorted(Comparator.comparing(Enum::name))
                .toList();
    }

    public static List<String> mergedTypes(List<Category> categories) {
        return categories.stream()
                .flatMap(c -> c.includedPrimaryTypes().stream())
                .distinct()
                .toList();
    }
}
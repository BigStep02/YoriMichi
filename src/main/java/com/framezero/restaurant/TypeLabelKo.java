package com.framezero.restaurant;

import java.util.Map;

/** 구글 Places primaryType → 한국어 종류 이름. 모르는 종류는 null (화면에서 일본어 이름만 표시) */
public final class TypeLabelKo {

    private static final Map<String, String> KO = Map.ofEntries(
            Map.entry("restaurant", "음식점"),
            Map.entry("japanese_restaurant", "일식"),
            Map.entry("ramen_restaurant", "라멘"),
            Map.entry("sushi_restaurant", "스시"),
            Map.entry("japanese_izakaya_restaurant", "이자카야"),
            Map.entry("yakiniku_restaurant", "야키니쿠"),
            Map.entry("yakitori_restaurant", "야키토리"),
            Map.entry("tonkatsu_restaurant", "돈카츠"),
            Map.entry("japanese_curry_restaurant", "일본식 카레"),
            Map.entry("seafood_restaurant", "해산물"),
            Map.entry("soba_noodle_shop", "소바"),
            Map.entry("udon_noodle_shop", "우동"),
            Map.entry("noodle_shop", "면 요리"),
            Map.entry("tempura_restaurant", "덴푸라"),
            Map.entry("okonomiyaki_restaurant", "오코노미야키"),
            Map.entry("shabu_shabu_restaurant", "샤부샤부"),
            Map.entry("sukiyaki_restaurant", "스키야키"),
            Map.entry("teppanyaki_restaurant", "철판구이"),
            Map.entry("cafe", "카페"),
            Map.entry("coffee_shop", "커피숍"),
            Map.entry("tea_house", "찻집"),
            Map.entry("bakery", "빵집"),
            Map.entry("cake_shop", "케이크"),
            Map.entry("dessert_shop", "디저트"),
            Map.entry("dessert_restaurant", "디저트"),
            Map.entry("ice_cream_shop", "아이스크림"),
            Map.entry("confectionery", "과자점"),
            Map.entry("chinese_restaurant", "중식"),
            Map.entry("korean_restaurant", "한식"),
            Map.entry("italian_restaurant", "이탈리안"),
            Map.entry("french_restaurant", "프렌치"),
            Map.entry("indian_restaurant", "인도 요리"),
            Map.entry("thai_restaurant", "태국 요리"),
            Map.entry("vietnamese_restaurant", "베트남 요리"),
            Map.entry("american_restaurant", "미국식"),
            Map.entry("western_restaurant", "양식"),
            Map.entry("hamburger_restaurant", "햄버거"),
            Map.entry("pizza_restaurant", "피자"),
            Map.entry("steak_house", "스테이크"),
            Map.entry("barbecue_restaurant", "바비큐"),
            Map.entry("fast_food_restaurant", "패스트푸드"),
            Map.entry("buffet_restaurant", "뷔페"),
            Map.entry("breakfast_restaurant", "아침 식사"),
            Map.entry("brunch_restaurant", "브런치"),
            Map.entry("diner", "식당"),
            Map.entry("family_restaurant", "패밀리 레스토랑"),
            Map.entry("bar", "바"),
            Map.entry("pub", "펍"),
            Map.entry("wine_bar", "와인 바"),
            Map.entry("bar_and_grill", "바 앤 그릴"),
            // 명소 보충용
            Map.entry("tourist_attraction", "관광 명소"),
            Map.entry("amusement_park", "유원지"),
            Map.entry("aquarium", "수족관"),
            Map.entry("art_gallery", "미술관"),
            Map.entry("museum", "박물관"),
            Map.entry("park", "공원"),
            Map.entry("shrine", "신사"),
            Map.entry("temple", "절"),
            Map.entry("historical_landmark", "역사 명소"),
            Map.entry("zoo", "동물원")
    );

    private TypeLabelKo() {}

    public static String of(String primaryType) {
        return primaryType == null ? null : KO.get(primaryType);
    }
}

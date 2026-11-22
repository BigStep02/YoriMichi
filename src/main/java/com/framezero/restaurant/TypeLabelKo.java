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
            Map.entry("asian_restaurant", "아시아 요리"),
            Map.entry("asian_fusion_restaurant", "아시안 퓨전"),
            Map.entry("fusion_restaurant", "퓨전 요리"),
            Map.entry("fine_dining_restaurant", "파인 다이닝"),
            Map.entry("kaiseki_restaurant", "가이세키"),
            Map.entry("gyudon_restaurant", "규동"),
            Map.entry("donburi_restaurant", "덮밥"),
            Map.entry("katsudon_restaurant", "가츠동"),
            Map.entry("kushiage_restaurant", "꼬치튀김"),
            Map.entry("kushikatsu_restaurant", "쿠시카츠"),
            Map.entry("oden_restaurant", "오뎅"),
            Map.entry("unagi_restaurant", "장어 요리"),
            Map.entry("takoyaki_restaurant", "타코야키"),
            Map.entry("monjayaki_restaurant", "몬자야키"),
            Map.entry("teishoku_restaurant", "정식"),
            Map.entry("japanese_inn_restaurant", "일식"),
            Map.entry("hot_pot_restaurant", "나베·전골"),
            Map.entry("dumpling_restaurant", "만두"),
            Map.entry("gyoza_restaurant", "교자"),
            Map.entry("dim_sum_restaurant", "딤섬"),
            Map.entry("cantonese_restaurant", "광둥 요리"),
            Map.entry("taiwanese_restaurant", "대만 요리"),
            Map.entry("indonesian_restaurant", "인도네시아 요리"),
            Map.entry("filipino_restaurant", "필리핀 요리"),
            Map.entry("nepalese_restaurant", "네팔 요리"),
            Map.entry("pakistani_restaurant", "파키스탄 요리"),
            Map.entry("middle_eastern_restaurant", "중동 요리"),
            Map.entry("lebanese_restaurant", "레바논 요리"),
            Map.entry("turkish_restaurant", "튀르키예 요리"),
            Map.entry("halal_restaurant", "할랄"),
            Map.entry("mediterranean_restaurant", "지중해 요리"),
            Map.entry("greek_restaurant", "그리스 요리"),
            Map.entry("spanish_restaurant", "스페인 요리"),
            Map.entry("tapas_restaurant", "타파스"),
            Map.entry("german_restaurant", "독일 요리"),
            Map.entry("european_restaurant", "유럽 요리"),
            Map.entry("mexican_restaurant", "멕시코 요리"),
            Map.entry("taco_restaurant", "타코"),
            Map.entry("brazilian_restaurant", "브라질 요리"),
            Map.entry("latin_american_restaurant", "남미 요리"),
            Map.entry("african_restaurant", "아프리카 요리"),
            Map.entry("hawaiian_restaurant", "하와이 요리"),
            Map.entry("vegan_restaurant", "비건"),
            Map.entry("vegetarian_restaurant", "채식"),
            Map.entry("chicken_restaurant", "치킨"),
            Map.entry("chicken_wings_restaurant", "치킨윙"),
            Map.entry("fried_chicken_restaurant", "프라이드치킨"),
            Map.entry("hot_dog_restaurant", "핫도그"),
            Map.entry("sandwich_shop", "샌드위치"),
            Map.entry("bagel_shop", "베이글"),
            Map.entry("donut_shop", "도넛"),
            Map.entry("chocolate_shop", "초콜릿"),
            Map.entry("candy_store", "과자점"),
            Map.entry("juice_shop", "주스"),
            Map.entry("acai_shop", "아사이볼"),
            Map.entry("tea_store", "찻집"),
            Map.entry("cat_cafe", "고양이 카페"),
            Map.entry("dog_cafe", "강아지 카페"),
            Map.entry("internet_cafe", "인터넷 카페"),
            Map.entry("bistro", "비스트로"),
            Map.entry("gastropub", "가스트로펍"),
            Map.entry("deli", "델리"),
            Map.entry("food_court", "푸드코트"),
            Map.entry("snack_bar", "간식"),
            Map.entry("meal_takeaway", "테이크아웃"),
            Map.entry("meal_delivery", "배달 음식"),
            Map.entry("food", "음식"),
            Map.entry("food_store", "식품점"),
            Map.entry("cocktail_bar", "칵테일 바"),
            Map.entry("lounge_bar", "라운지 바"),
            Map.entry("sports_bar", "스포츠 바"),
            Map.entry("beer_hall", "비어홀"),
            Map.entry("brewery", "양조장"),
            Map.entry("winery", "와이너리"),
            Map.entry("night_club", "클럽"),
            Map.entry("karaoke", "노래방"),
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
        if (primaryType == null) return null;
        String ko = KO.get(primaryType);
        if (ko != null) return ko;
        // 표에 없는 새 종류도 한국어로: 접미사로 대략 분류
        if (primaryType.endsWith("_restaurant")) return "음식점";
        if (primaryType.endsWith("_cafe") || primaryType.endsWith("_coffee_shop")) return "카페";
        if (primaryType.endsWith("_bar")) return "바";
        if (primaryType.endsWith("_bakery")) return "빵집";
        if (primaryType.endsWith("_shop") || primaryType.endsWith("_store")) return "가게";
        return null;
    }

    /** 숙소: 음식점 후보에서 뺌 (호텔 안 식당이 primaryType=hotel로 잡히는 경우) */
    public static boolean isLodging(String primaryType) {
        if (primaryType == null) return false;
        return switch (primaryType) {
            case "hotel", "lodging", "resort_hotel", "japanese_inn", "budget_japanese_inn", "motel", "hostel",
                 "guest_house", "bed_and_breakfast", "extended_stay_hotel", "inn", "private_guest_room",
                 "cottage", "farmstay", "campground", "camping_cabin" -> true;
            default -> primaryType.endsWith("_hotel") || primaryType.endsWith("_inn");
        };
    }
}

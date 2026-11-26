package com.framezero.restaurant.client.response;

/**
 * Places API (New) priceRange — 1인 기준 가격대. 예: {"startPrice":{"currencyCode":"JPY","units":"1000"},"endPrice":{...}}
 * endPrice가 없으면 "startPrice 이상" (상한 없음)
 */
public record PriceRange(Money startPrice, Money endPrice) {
    public record Money(String currencyCode, String units) {
        /** units(문자열 정수) → Integer. 엔화가 아니거나 비어 있으면 null */
        public Integer yen() {
            if (units == null || (currencyCode != null && !"JPY".equals(currencyCode))) return null;
            try { return Integer.valueOf(units); } catch (NumberFormatException e) { return null; }
        }
    }
    public Integer min() { return startPrice != null ? startPrice.yen() : null; }
    public Integer max() { return endPrice != null ? endPrice.yen() : null; }
}

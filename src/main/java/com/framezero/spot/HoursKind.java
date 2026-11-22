package com.framezero.spot;

/** 운영시간 형태 */
public enum HoursKind {
    ALWAYS,   // 24시간 (신사 경내, 공원 등)
    FIXED,    // open_time ~ close_time
    VARIES    // 날마다 다름 (유원지 등) → 공식 사이트 확인
}

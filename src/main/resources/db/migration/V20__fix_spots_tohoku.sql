-- V20: 도호쿠 놀거리 보정 (2026-11-22 재확인)
UPDATE spots SET close_time = '16:00', hours_note = '참배 가능 시간 4~9월 8:00~16:00, 12~3월 8:00~15:00 (16:00 폐문). 10~11월·겨울철 조기 폐문은 공식 확인' WHERE name_ja = '立石寺';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '12-01', '03-31', '08:00', '15:00', NULL, 0 FROM spots WHERE name_ja = '立石寺';
UPDATE spots SET hours_note = '최종 입관 16:00, 시기별 변동. 휴관: 셋째 목요일, 1월은 셋째·넷째 목요일, 2월은 매주 목요일, 7~9월 무휴, 1월 동계 휴관 있음 (2026년도 달력 공식 확인)' WHERE name_ja = '男鹿水族館GAO';
UPDATE spots SET fee_note = '무료 (놋케동 식권 12장 2,200엔, 1장 190엔)' WHERE name_ja = '青森魚菜センター';
UPDATE spots SET hours_kind = 'ALWAYS', open_time = NULL, close_time = NULL, hours_note = '경내 자유. 수여소 9:00~17:00 (기원 접수 16:00까지)' WHERE name_ja = '大崎八幡宮';
UPDATE spots SET hours_note = '둘째·넷째 월요일(공휴일이면 다음 날) 휴관. 입관 16:30까지. 전시 교체·연말연시 특별 휴관 있음' WHERE name_ja = '青森県立美術館';

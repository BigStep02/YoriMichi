-- V16: 규슈·오키나와 놀거리 보정 (2026-11-22 재확인)
UPDATE spots SET fee_note = '2,500엔', hours_note = '입관 16:30까지. 12~2월은 10:00~17:00. 1월 셋째 월요일부터 4일간 휴관' WHERE name_ja = 'マリンワールド海の中道';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '12-01', '02-29', '10:00', '17:00', NULL, 0 FROM spots WHERE name_ja = 'マリンワールド海の中道';
UPDATE spots SET fee_note = '문화교류전 700엔 (특별전 별도)', hours_note = '입관 16:30까지. 특별전 기간 금·토는 20:00까지. 월요일이 공휴일·대체휴일이면 다음 날 휴관, 연말 휴관' WHERE name_ja = '九州国立博物館';
UPDATE spots SET fee_note = '무료 (로프웨이 왕복 1,900엔·슬로프카 왕복 1,000엔 별도)', hours_note = '옥상 전망소는 24시간 개방. 로프웨이·슬로프카는 9:00~22:00 (별도 요금)' WHERE name_ja = '稲佐山展望台';
UPDATE spots SET fee_note = '낮 200엔, 밤 300엔', hours_note = '낮 9:00~18:00, 밤 18:00~21:00 (입장 20:30까지). 수요일이 공휴일이면 다음 날 휴원' WHERE name_ja = '福州園';

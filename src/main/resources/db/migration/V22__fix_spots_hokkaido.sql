-- V22: 홋카이도 놀거리 보정 + 오타루 종합박물관 추가 (2026-11-22 재확인)
-- verified_at 이 있는 행: 공식·관광협회 페이지에서 운영시간 확인. NULL: 검수 전 (좌표·시간 확인 필요)

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url) VALUES ('오타루 시립 종합박물관 본관', '小樽市総合博物館 本館', 'MUSEUM', '北海道', '小樽市', 43.209400, 140.994800, 'FIXED', '09:30', '17:00', 'TUE', '화요일 휴관(공휴일이면 다음 평일), 12/29~1/3 휴관', '400엔 (11월 상순~4월 하순 겨울 요금 300엔, 고교생 200엔, 중학생 이하 무료)', '홋카이도 철도 사업 발상지인 옛 데미야역 구내에 있는 철도·과학 박물관. 실물 증기기관차를 전시하고, 옛 데미야 철도 시설(기관차고 3호 등)은 국가 중요문화재다.', '플라네타리움이 있고, 겨울엔 증기기관차 운행과 일부 야외 전시를 쉰다.', NULL, NULL, DATE '2026-11-22', NULL);

INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '12-29', '01-03', NULL, NULL, NULL, 1 FROM spots WHERE name_ja = '小樽市総合博物館 本館';
UPDATE spots SET fee_note = '350엔 (대학생 150엔, 고교생 이하 무료)', hours_note = '입관 17:00까지. 매월 첫째 월요일은 20:00까지 연장. 1/1~1/3 휴관 (12/31은 개관)' WHERE name_ja = '札幌市時計台';
UPDATE spot_hours SET start_md = '01-01' WHERE start_md = '12-29' AND end_md = '01-03' AND spot_id = (SELECT id FROM spots WHERE name_ja = '札幌市時計台');
UPDATE spots SET fee_note = '무료' WHERE name_ja = '小樽オルゴール堂 本館';
UPDATE spots SET hours_note = '최종 입장 21:50. 설날·설비 점검일 휴관' WHERE name_ja = 'さっぽろテレビ塔';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '12-31', '12-31', '07:00', '17:00', NULL, 0 FROM spots WHERE name_ja = '北海道神宮';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '01-01', '01-01', '00:00', '18:00', NULL, 0 FROM spots WHERE name_ja = '北海道神宮';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '01-02', '01-03', '06:00', '18:00', NULL, 0 FROM spots WHERE name_ja = '北海道神宮';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '01-04', '01-07', '06:00', '16:00', NULL, 0 FROM spots WHERE name_ja = '北海道神宮';

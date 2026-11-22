-- V13: 간사이 놀거리 계절·기간별 운영시간 + 데이터 보정
-- 오늘이 들어가는 기간 중 가장 짧은 기간 우선. 시간 NULL = 기본값, closed_days NONE = 정기휴일 없음, is_closed 1 = 휴무

INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '12-01', '03-14', '09:00', '16:30', NULL, 0 FROM spots WHERE name_ja = '銀閣寺（慈照寺）';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '11-16', '03-31', '09:00', '16:00', NULL, 0 FROM spots WHERE name_ja = '三十三間堂';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '12-29', '12-31', NULL, NULL, NULL, 1 FROM spots WHERE name_ja = '二条城';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '12-01', '02-29', '08:30', '16:30', NULL, 0 FROM spots WHERE name_ja = '龍安寺';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '12-28', '01-01', NULL, NULL, NULL, 1 FROM spots WHERE name_ja = '大阪城天守閣';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '10-01', '03-31', '06:30', '17:00', NULL, 0 FROM spots WHERE name_ja = '住吉大社';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '10-01', '03-31', '08:30', '16:00', NULL, 0 FROM spots WHERE name_ja = '四天王寺';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '04-01', '05-02', NULL, NULL, 'NONE', 0 FROM spots WHERE name_ja = '万博記念公園';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '10-01', '11-30', NULL, NULL, 'NONE', 0 FROM spots WHERE name_ja = '万博記念公園';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '11-01', '03-31', '08:00', '17:00', NULL, 0 FROM spots WHERE name_ja = '東大寺';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '11-01', '02-29', '07:00', '17:00', NULL, 0 FROM spots WHERE name_ja = '春日大社';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '12-15', '03-14', NULL, NULL, NULL, 1 FROM spots WHERE name_ja = '若草山';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '11-04', '02-21', '08:00', '16:30', NULL, 0 FROM spots WHERE name_ja = '法隆寺';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '04-27', '08-31', '09:00', '18:00', NULL, 0 FROM spots WHERE name_ja = '姫路城';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '12-29', '12-30', NULL, NULL, NULL, 1 FROM spots WHERE name_ja = '姫路城';

-- V10 간사이 데이터 보정 (2026-11-22 재확인)
-- 요금 표기 규칙: '무료' / 금액 / '날짜별 요금 (공식 사이트 확인)' / NULL = 미확인
UPDATE spots SET fee_note = '무료' WHERE name_ja IN ('伏見稲荷大社', '八坂神社', '南禅寺', '嵐山 竹林の小径', '渡月橋', '京都御苑', '円山公園', '哲学の道', '梅小路公園', '祇園 花見小路', '産寧坂・二寧坂', '下鴨神社', '北野天満宮', '大阪城公園', '住吉大社', '道頓堀', '法善寺横丁', '新世界', '中之島公園', '大阪天満宮', '少彦名神社', '春日大社', '奈良公園', 'ならまち', '平城宮跡', '浮見堂', '黒壁スクエア', '豊公園', '熊野那智大社', '青岸渡寺', '大門坂');
UPDATE spots SET fee_note = '경내 무료 (본당 앞까지), 경내 일부 시설 유료' WHERE name_ja IN ('南禅寺', '春日大社', '青岸渡寺');
UPDATE spots SET fee_note = '경내 무료, 신원(정원) 600엔', hours_note = '경내 기준. 신원(정원)은 8:30부터, 닫는 시간은 계절별' WHERE name_ja = '平安神宮';
UPDATE spots SET fee_note = '날짜별 요금 (공식 사이트 확인)' WHERE name_ja = 'ユニバーサル・スタジオ・ジャパン';
UPDATE spots SET close_time = '21:45', hours_note = '일반 전망대 마지막 입장 21:15', fee_note = '1,500엔' WHERE name_ja = '通天閣';
UPDATE spots SET fee_note = '400엔 (2026년 3월부터)' WHERE name_ja = '好古園';
UPDATE spots SET fee_note = NULL WHERE name_ja = '書寫山圓教寺';
UPDATE spots SET name = '금각사 (로쿠온지)' WHERE name_ja = '金閣寺（鹿苑寺）';
UPDATE spots SET name = '은각사 (지쇼지)' WHERE name_ja = '銀閣寺（慈照寺）';

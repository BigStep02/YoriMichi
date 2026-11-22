-- V25: 보강 2차 보정 (2026-11-22 재확인)
UPDATE spots SET fee_note = '400엔 (다자이후 시내 거주·통근·통학자 200엔)' WHERE name_ja = '大宰府展示館';
UPDATE spots SET fee_note = NULL, hours_note = '입관 16:30까지. 월요일(공휴일이면 다음 날)·월말 평일 휴관(7·3월 제외), 여름방학 기간 무휴. 12/30~1/1·1/3~1/4 휴관(1/2 임시 개관). 2026년 요금 개정(이전 상설전 410엔), 현재 요금은 공식 확인' WHERE name_ja = '旭川市科学館';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '12-30', '01-01', NULL, NULL, NULL, 1 FROM spots WHERE name_ja = '旭川市科学館';
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed) SELECT id, '01-03', '01-04', NULL, NULL, NULL, 1 FROM spots WHERE name_ja = '旭川市科学館';
UPDATE spots SET hours_note = hours_note || '. 12월은 지치부 요마쓰리 일정에 따라 변동' WHERE name_ja = '秩父まつり会館';

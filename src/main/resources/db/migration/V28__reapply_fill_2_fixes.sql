-- V28: V25 보정 재적용 (2026-11-22)
-- 서버에 V25가 V23·V24보다 먼저 적용되어 V25의 수정이 대상 없이 지나감 → 같은 내용을 다시 적용.
-- V25가 정상 적용된 DB에서도 중복되지 않게 작성

UPDATE spots SET fee_note = '400엔 (다자이후 시내 거주·통근·통학자 200엔)' WHERE name_ja = '大宰府展示館';
UPDATE spots SET fee_note = NULL, hours_note = '입관 16:30까지. 월요일(공휴일이면 다음 날)·월말 평일 휴관(7·3월 제외), 여름방학 기간 무휴. 12/30~1/1·1/3~1/4 휴관(1/2 임시 개관). 2026년 요금 개정(이전 상설전 410엔), 현재 요금은 공식 확인' WHERE name_ja = '旭川市科学館';

INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '12-30', '01-01', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '旭川市科学館'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '12-30' AND h.end_md = '01-01');

INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '01-03', '01-04', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '旭川市科学館'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '01-03' AND h.end_md = '01-04');

UPDATE spots SET hours_note = hours_note || '. 12월은 지치부 요마쓰리 일정에 따라 변동'
 WHERE name_ja = '秩父まつり会館' AND hours_note NOT LIKE '%지치부 요마쓰리 일정%';

-- V18: 주고쿠·시코쿠 놀거리 보정 (2026-11-22 재확인)
UPDATE spots SET hours_kind = 'FIXED', open_time = '06:00', close_time = '19:00', hours_note = '경내 참배 6:00~19:00. 본전 북쪽 소가노야시로 방면은 16:30까지, 보물전 8:30~16:30. 연말연시는 시간 연장' WHERE name_ja = '出雲大社';
UPDATE spots SET fee_note = '상설전 680엔 (대학생 450엔, 초중고생 220엔)', hours_note = '11~2월은 17:00까지. 입관 30분 전 마감. 매월 첫째·셋째 화요일 휴관(변경 있음). 2026년 10월 1일 리뉴얼 재개관' WHERE name_ja = '島根県立古代出雲歴史博物館';
UPDATE spot_hours SET end_md = '01-02' WHERE start_md = '12-29' AND end_md = '12-31' AND spot_id = (SELECT id FROM spots WHERE name_ja = '広島城');
UPDATE spots SET hours_note = '4~9월 기준, 10~3월은 16:30까지. 입관 30분 전 마감. 12/29~1/2 휴관. 천수각은 2026년 3월 22일 폐성, 외관만 관람' WHERE name_ja = '広島城';
UPDATE spots SET fee_note = '왕복 1,500엔, 편도 900엔 (초등학생 왕복 800엔)' WHERE name_ja = '眉山ロープウェイ';
UPDATE spots SET fee_note = '가미노유 1층 60분 700엔 (2층 휴게 1,300엔부터 코스별 상이)' WHERE name_ja = '道後温泉本館';
UPDATE spots SET hours_note = '천수 기준. 8월 17:30, 12~1월 16:30까지. 12월 셋째 수요일 천수만 휴관. 로프웨이·리프트로 오를 수 있음' WHERE name_ja = '松山城';

-- V31에서 반각 괄호 이름으로 들어간 다카야마 마쓰리 2027 중복 2건 삭제
-- (기존 V 데이터에 전각 괄호 '春の高山祭（山王祭）'·'秋の高山祭（八幡祭）' 2027년 행이 이미 있음)
DELETE FROM festivals WHERE name_ja = '春の高山祭(山王祭)' AND festival_year = 2027;
DELETE FROM festivals WHERE name_ja = '秋の高山祭(八幡祭)' AND festival_year = 2027;

-- V30에서 道後温泉本館이 ONSEN으로 한 번 더 들어감 (기존 HISTORIC 행 있음)
-- 기존 행(가장 작은 id)은 남기고 종류만 ONSEN으로, 나중 행은 삭제
UPDATE spots SET kind = 'ONSEN'
 WHERE id = (SELECT MIN(id) FROM spots WHERE name_ja = '道後温泉本館');
DELETE FROM spots
 WHERE name_ja = '道後温泉本館'
   AND id <> (SELECT MIN(id) FROM spots WHERE name_ja = '道後温泉本館');

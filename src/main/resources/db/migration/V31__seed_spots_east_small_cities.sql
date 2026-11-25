-- V31: 동일본 소도시 놀거리·온천 보강 (오가·요코테·아사히카와·지치부·구조·야마가타·아키타·오타루 + 온천 3곳), 2026-11-25
-- 원본 조사 + 교차 검수 반영: 天狗山 계절 시간·정비 운휴, 大滝鍾乳洞 휴무 규칙·요금, 大森山動物園 겨울 운영, 蔵王 대노천탕 동계 휴업
-- 종유동 2곳은 AMUSEMENT(유원지) 대신 VIEWPOINT(경치)로 분류
-- verified_at: 그날 공식 자료를 직접 확인한 곳만 날짜, 나머지 NULL (원본 기준 유지)

-- ===== 男鹿市 =====
INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '신잔 신사', '真山神社', 'SHRINE_TEMPLE', '秋田県', '男鹿市', 39.927147, 139.766854, 'FIXED', '08:30', '17:00', NULL, '여행 정보 사이트 기준 8:30~17:00·무휴(게재일 미상). 방문 전 확인 권장', '경내 무료', '나마하게 전통과 깊은 관련이 있는 산악신앙의 신사예요. 매년 2월 경내에서 나마하게 시바토 축제가 열려요.', '바로 옆 男鹿真山伝承館·なまはげ館과 함께 둘러보면 좋아요. 대중교통은 예약제 なまはげシャトル 택시를 이용해요.', NULL, 'http://www.namahage.ne.jp/~shinzanjinja/', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '真山神社');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '오가 신잔 전승관', '男鹿真山伝承館', 'HISTORIC', '秋田県', '男鹿市', 39.928696, 139.766687, 'VARIES', NULL, NULL, NULL, '나마하게 강좌 회차제. 4~11월 9:00~16:30(30분 간격), 12~3월 9:30~15:30(1시간 간격) 매일, 점심시간 회차 제외. 단독 요금·휴관일은 공식 미게재', 'なまはげ館 공통권 1,100엔 (초중고생 660엔)', '초가지붕 전통가옥 마가리야에서 나마하게 풍습을 재현하는 학습 강좌를 볼 수 있어요.', '옆 なまはげ館과 공통권을 사면 이득이에요. 강좌 시작 시각에 맞춰 도착하세요.', NULL, 'https://namahage.co.jp/namahagekan/oga_shinzan_folklore_museum/', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '男鹿真山伝承館');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '고질라 바위', 'ゴジラ岩', 'VIEWPOINT', '秋田県', '男鹿市', 39.858367, 139.756182, 'ALWAYS', NULL, NULL, NULL, '야외 해안 바위로 상시 관람 가능', '무료', '潮瀬崎 해안에 있는 고질라 모양의 바위로, 약 3000만 년 전 화산 분출로 생긴 응회암이에요.', '해 질 녘 노을이 입 부분에 겹치면 불을 뿜는 고질라처럼 보여요. 촬영 적기는 4월·10월 무렵이에요.', NULL, 'https://www.tohokukanko.jp/attractions/detail_1051.html', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = 'ゴジラ岩');

-- ===== 横手市 =====
INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '아키타 후루사토무라', '秋田ふるさと村', 'AMUSEMENT', '秋田県', '横手市', 39.293128, 140.546689, 'FIXED', '09:30', '17:00', NULL, '공식 사이트 영업시간 9:30~17:00. 기본 무휴. 2027/1/19~28 정비 휴업', '입촌 무료 (원더캐슬·플라네타리움 각 700엔)', '트릭아트, 플라네타리움, 현립 근대미술관, 전통공예 전시가 모인 전천후 테마파크예요.', '실내 시설이 많아 눈 오는 날이나 비 오는 날에도 즐기기 좋아요.', NULL, 'https://akitafurusatomura.co.jp/', DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '秋田ふるさと村');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '마스다 우치구라 거리', '増田の内蔵', 'HISTORIC', '秋田県', '横手市', 39.205800, 140.553200, 'VARIES', NULL, NULL, NULL, '거리 산책은 자유. 蔵の駅·안내소 ほたる 9:00~17:00(12/29~1/3 휴무). 공개 창고별 시간 상이', '산책 무료 (공개 창고는 시설별 무료/유료)', '상가 안채 안에 창고를 품은 우치구라가 약 400m 거리에 40채 넘게 늘어선 중요전통적건조물군 보존지구예요.', '안내소 ほたる에서 공개 중인 창고 정보를 먼저 확인하세요. 増田まんが美術館과 가까워요.', NULL, 'http://masudakanko.com/uchigura/', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '増田の内蔵');

-- ===== 旭川市 =====
INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '호쿠친 기념관', '北鎮記念館', 'MUSEUM', '北海道', '旭川市', 43.788393, 142.364883, 'FIXED', '09:00', '17:00', 'MON', '4~10월 9:00~17:00, 11~3월 9:30~16:00. 월요일 휴관(공휴일이면 다음 날), 연말연시 휴관. 공식 캘린더 확인', '무료 (관내 가이드도 무료)', '약 2,500점의 자료로 둔전병부터 육상자위대 제2사단까지 홋카이도 개척과 방위의 역사를 소개해요.', '관내 가이드가 무료라 시간 여유가 있으면 해설을 들으며 둘러보세요.', NULL, 'https://www.mod.go.jp/gsdf/nae/2d/hokutin2/top.html', DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '北鎮記念館');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '우에노 팜', '上野ファーム', 'PARK_GARDEN', '北海道', '旭川市', 43.808366, 142.485340, 'FIXED', '10:00', '17:00', NULL, '4월 하순~10월 중순만 개원, 동계 휴원. 2026시즌 종료, 다음 시즌 4/23~10/17 예정(공식). 시즌 중 무휴', '대인·고교생 1,200엔, 중학생 500엔 (초등생 이하 무료)', '다이세쓰산을 바라보는 약 4ha 언덕에 계절 꽃이 가득한 정원이에요. 헛간을 개조한 NAYAcafe도 있어요.', '숍·카페만 이용할 때는 입원료가 필요 없어요.', NULL, 'https://uenofarm.net/', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '上野ファーム');

-- ===== 秩父市 =====
INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '미쓰미네 신사', '三峯神社', 'SHRINE_TEMPLE', '埼玉県', '秩父市', 35.925200, 138.931500, 'VARIES', NULL, NULL, NULL, '9:00~17:00은 수여소(부적·고슈인) 시간, 연중무휴(관광 안내 기준). 경내 참배 시간은 공식 미확인. 2026년 곰 출몰 주의 공지 있음', NULL, '야마토타케루 전설이 전해지는 산중 신사로, 고마이누 대신 늑대상이 입구를 지켜요.', '산속 깊은 곳이라 국도 140호 통행 정보와 버스 시간을 미리 확인하세요.', NULL, 'https://www.mitsuminejinja.or.jp/', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '三峯神社');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '부코산 자료관', '武甲山資料館', 'MUSEUM', '埼玉県', '秩父市', 35.990883, 139.091979, 'FIXED', '09:00', '16:00', 'TUE', '화요일 휴관(공휴일이면 개관), 12/29~1/3 휴관. 여행 정보 사이트 기준(게재일 미상)', '대인 210엔, 초중학생 100엔', '羊山公園 언덕에 있는 자료관으로, 秩父의 상징 부코산의 지질·동식물·산업을 소개해요.', '秩父 시가지가 한눈에 보이는 위치라 羊山公園 산책과 함께 들르기 좋아요.', NULL, NULL, NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '武甲山資料館');

-- ===== 郡上市 =====
INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '지온젠지 텟소엔', '慈恩禅寺 荎草園', 'SHRINE_TEMPLE', '岐阜県', '郡上市', 35.748086, 136.961669, 'FIXED', '10:00', '16:00', 'TUE', '매주 화요일 휴무, 12/29~1/5 휴무. 특별 행사 시 변경 가능', '대인 500엔, 초중학생 300엔', '바위산을 배경으로 연못 주위에 단풍을 심은 앉아서 감상하는 정원으로, 시 지정 명승이에요.', '수금굴 소리를 들으며 조용히 감상해 보세요. 단풍철에 특히 아름다워요.', NULL, 'http://jionzenji.com/', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '慈恩禅寺 荎草園');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '오타키 종유동', '大滝鍾乳洞', 'VIEWPOINT', '岐阜県', '郡上市', 35.733725, 136.980104, 'FIXED', '08:30', '17:00', NULL, '岐阜県 관광 사이트 기준 8:30~17:00(계절 변동, 17:30 표기도 있음). 12/26~1/1 휴무, 1·2월 평일 휴무, 3·10~12월 화요일 휴무', '대인 1,000엔, 중고생 800엔, 5세~초등생 500엔', '목제 케이블카를 타고 들어가는 종유동으로, 가장 깊은 곳에 낙차 30m의 지하 폭포가 있어요.', '병설 낚시터에서 잡은 무지개송어를 숯불에 구워 먹을 수 있어요. 반려동물 입동 불가예요.', NULL, 'http://www.ootakicave.com/', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '大滝鍾乳洞');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '구조하치만 미야마 종유동', '郡上八幡 美山鍾乳洞', 'VIEWPOINT', '岐阜県', '郡上市', 35.743377, 136.947155, 'FIXED', '09:00', '17:00', NULL, '3월 중순~10월 9:00~17:00, 11월 9:00~16:00. 4·11월 목요일 휴무(공휴일 제외). 12월~3월 초 동계 휴업', NULL, '총길이 약 2,000m 중 약 800m를 공개하는 입체형 종유동으로, 시 천연기념물이에요.', '헤드램프 동굴 탐험 투어와 식품 샘플 만들기 체험(예약제)도 있어요.', NULL, 'http://www.miyama-gujo.jp/', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '郡上八幡 美山鍾乳洞');

-- ===== 山形市 =====
INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '야마가타 현립 박물관', '山形県立博物館', 'MUSEUM', '山形県', '山形市', 38.254350, 140.329600, 'FIXED', '09:00', '16:30', 'MON', '입관 16:00까지. 월요일 휴관(공휴일이면 다음 날), 12/28~1/4 휴관. 특별전 기간 임시 개관·휴관 있음', '일반 300엔, 학생 150엔 (고교생 이하 무료)', '霞城公園 안에 있는 현립 박물관으로, 야마가타의 자연과 역사 자료를 전시해요.', '霞城公園 산책과 묶어서 둘러보기 좋아요.', NULL, 'https://www.yamagata-museum.jp/', DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '山形県立博物館');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '자오 온천 대노천탕', '蔵王温泉大露天風呂', 'ONSEN', '山形県', '山形市', 38.166174, 140.401803, 'VARIES', NULL, NULL, NULL, '예년 4월 중순~11월 중순만 영업(2026년은 11/21 종료, 날씨로 변동). 평일 9:30~17:00, 토일공휴일 9:30~18:00(마감 30분 전 접수 종료)', '대인 850엔, 어린이(1~12세) 400엔', '산속 계곡의 넓은 노천탕에서 강산성 유황천을 즐기는 당일 온천이에요.', '산성이 강해 피부가 민감하면 자극이 있을 수 있어요. 일부 사이트는 요금을 700엔으로 표기해요.', NULL, 'https://www.jupeer-zao.com/roten/', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '蔵王温泉大露天風呂');

-- ===== 秋田市 =====
INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '아키타시 오모리야마 동물원', '秋田市大森山動物園', 'AMUSEMENT', '秋田県', '秋田市', 39.671783, 140.073440, 'FIXED', '09:00', '16:30', NULL, '3/20~11/30 매일 개원(입원 16:00까지). 12월은 일요일만, 1~2월 토일공휴일만(雪の動物園) 10:00~15:00. 3/1~3/19 휴원. 겨울 개원일은 공식 확인', '대인 1,000엔 (고교생 이하 무료)', '사육사의 먹이 주기 해설이 인기인 동물원으로, 동물 사이를 지나는 놀이시설 あそべの森도 있어요.', '겨울에는 주말 한정 겨울 동물원으로 운영하니 날짜를 꼭 확인하세요.', NULL, 'https://www.city.akita.lg.jp/zoo/guide/1003691.html', DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '秋田市大森山動物園');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '포트타워 셀리온', 'ポートタワー・セリオン', 'VIEWPOINT', '秋田県', '秋田市', 39.758000, 140.064900, 'FIXED', '09:00', '21:00', NULL, '전망실 9:00~21:00 연중무휴(시청 페이지 2024년 갱신 기준)', '전망실 무료', '도로역 あきた港에 있는 높이 100m 무료 전망실로, 아키타항과 동해 연안 풍차가 보여요.', '맑은 날에는 남쪽으로 鳥海山이 보여요. 야경 보러 저녁에 가도 좋아요.', NULL, 'https://www.selion-akita.com/', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = 'ポートタワー・セリオン');

-- ===== 小樽市 =====
INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '오타루 덴구야마 로프웨이', '小樽天狗山ロープウエイ', 'VIEWPOINT', '北海道', '小樽市', 43.177690, 140.975288, 'FIXED', '09:00', '21:00', NULL, '하계(4/25~11/3) 9:00~21:00, 동계(11/28~3월 말) 9:00~20:00. 11/4~27·3월 말~4월 중순 정비 운휴. 악천후 운휴', '왕복 하계 대인 1,800엔/소인 900엔, 동계 2,000엔/1,000엔', '해발 532m 덴구산 정상까지 약 5분, 전망대 5곳에서 오타루 시내와 항구, 이시카리만이 보여요.', '해 질 녘부터 야경으로 바뀌는 시간이 특히 좋아요. 정상의 코 쓰다듬는 덴구상도 들러 보세요.', NULL, 'https://tenguyama.ckk.chuo-bus.co.jp/', DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '小樽天狗山ロープウエイ');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '구 아오야마 별저 (오타루 귀빈관)', '旧青山別邸（小樽貴賓館）', 'HISTORIC', '北海道', '小樽市', 43.231632, 141.007885, 'FIXED', '09:00', '17:00', NULL, '4~10월 9:00~17:00, 11~3월 9:00~16:00, 12/29~31 9:00~15:00. 1/1~1/7 휴관', '대인 1,300엔, 어린이 650엔', '청어잡이로 부를 쌓은 아오야마 가문이 1923년 완성한 목조 저택으로, 등록유형문화재예요.', '병설 레스토랑에서 청어 요리를 맛볼 수 있어요. 5~6월 모란 정원 공개 기간엔 입원료 300엔이 따로 있어요.', NULL, 'http://www.otaru-kihinkan.jp/', DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '旧青山別邸（小樽貴賓館）');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '오타루시 니신고텐', '小樽市鰊御殿', 'HISTORIC', '北海道', '小樽市', 43.237788, 141.015616, 'FIXED', '09:00', '17:00', NULL, '2026시즌 4/4~11/23만 개관(동계 휴관). 10/16부터 16:00 폐관', '일반 300엔, 고교생 150엔 (초중학생 무료)', '1897년 지어진 청어잡이 숙소를 옮겨 온 건물로, 홋카이도 최초로 문화재 지정된 민가예요.', '근처 旧青山別邸와 함께 祝津 지역을 묶어 둘러보기 좋아요.', NULL, 'https://www.city.otaru.lg.jp/docs/2020100900596/', DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '小樽市鰊御殿');

-- ===== 온천 (札幌·仙台·高山 근교) =====
INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '호헤이쿄 온천', '豊平峡温泉', 'ONSEN', '北海道', '札幌市', 42.968000, 141.127000, 'FIXED', '10:00', '22:30', NULL, '최종 접수 21:45. 연중무휴(임시 휴업 있음)', '대인 1,300엔, 어린이 600엔', '札幌 定山渓 온천 지역의 당일치기 온천 시설로, 인도 요리 레스토랑도 함께 있어요.', '무료 송영버스 운휴 공지가 있었으니 이동 수단을 미리 확인하세요.', NULL, 'https://hoheikyo.co.jp/', DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '豊平峡温泉');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '아키우 온천 공동욕장', '秋保温泉共同浴場', 'ONSEN', '宮城県', '仙台市', 38.226651, 140.719792, 'VARIES', NULL, NULL, NULL, '최근 안내 기준 8:00~21:00(7:30 시작 표기도 있음). 휴무는 제4수요일 또는 제2·4수요일로 출처마다 다름(GW·오봉·연말연시는 영업). 방문 전 확인', '대인 300엔, 어린이(3세~초등생) 200엔', '秋保 온천 중심부의 소박한 공동욕장으로, 원천 그대로 흘려보내는 온천이에요.', '입욕은 60분 제한이에요. 지역 주민용 욕장이라 매너를 지켜 주세요.', NULL, NULL, NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '秋保温泉共同浴場');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '히라유노모리', 'ひらゆの森', 'ONSEN', '岐阜県', '高山市', 36.189184, 137.551339, 'FIXED', '10:00', '21:00', NULL, '접수 20:30까지. 연중무휴(점검 휴업 있음)', '대인 700엔, 어린이 500엔', '표고 약 1,300m 平湯 온천에 있으며, 남녀 합쳐 16개의 노천탕마다 온도와 탁도가 달라요.', '레스토랑에서 히다규 요리와 호바미소 정식을 먹을 수 있어요.', NULL, 'http://www.hirayunomori.co.jp/', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = 'ひらゆの森');

-- ===== 계절·기간별 운영시간 =====

-- 秋田ふるさと村: 2027년 1월 정비 휴업 (해마다 날짜 다를 수 있음)
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '01-19', '01-28', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '秋田ふるさと村'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '01-19' AND h.end_md = '01-28');

-- 北鎮記念館: 겨울 시간
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '11-01', '03-31', '09:30', '16:00', NULL, 0 FROM spots s
 WHERE s.name_ja = '北鎮記念館'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '11-01' AND h.end_md = '03-31');

-- 北鎮記念館: 연말연시 휴관
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '12-29', '01-03', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '北鎮記念館'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '12-29' AND h.end_md = '01-03');

-- 上野ファーム: 동계 휴원 (다음 시즌 4/23~10/17)
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '10-18', '04-22', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '上野ファーム'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '10-18' AND h.end_md = '04-22');

-- 武甲山資料館: 연말연시 휴관
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '12-29', '01-03', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '武甲山資料館'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '12-29' AND h.end_md = '01-03');

-- 慈恩禅寺 荎草園: 연말연시 휴무
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '12-29', '01-05', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '慈恩禅寺 荎草園'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '12-29' AND h.end_md = '01-05');

-- 大滝鍾乳洞: 연말연시 휴무
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '12-26', '01-01', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '大滝鍾乳洞'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '12-26' AND h.end_md = '01-01');

-- 大滝鍾乳洞: 1·2월은 주말·공휴일만
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '01-02', '02-29', NULL, NULL, 'MON,TUE,WED,THU,FRI', 0 FROM spots s
 WHERE s.name_ja = '大滝鍾乳洞'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '01-02' AND h.end_md = '02-29');

-- 大滝鍾乳洞: 3월 화요일 휴무
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '03-01', '03-31', NULL, NULL, 'TUE', 0 FROM spots s
 WHERE s.name_ja = '大滝鍾乳洞'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '03-01' AND h.end_md = '03-31');

-- 大滝鍾乳洞: 10~12월 화요일 휴무
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '10-01', '12-25', NULL, NULL, 'TUE', 0 FROM spots s
 WHERE s.name_ja = '大滝鍾乳洞'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '10-01' AND h.end_md = '12-25');

-- 郡上八幡 美山鍾乳洞: 11월 시간·목요일 휴무
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '11-01', '11-30', '09:00', '16:00', 'THU', 0 FROM spots s
 WHERE s.name_ja = '郡上八幡 美山鍾乳洞'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '11-01' AND h.end_md = '11-30');

-- 郡上八幡 美山鍾乳洞: 4월 목요일 휴무
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '04-01', '04-30', NULL, NULL, 'THU', 0 FROM spots s
 WHERE s.name_ja = '郡上八幡 美山鍾乳洞'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '04-01' AND h.end_md = '04-30');

-- 郡上八幡 美山鍾乳洞: 동계 휴업 (3월 중순 재개)
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '12-01', '03-14', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '郡上八幡 美山鍾乳洞'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '12-01' AND h.end_md = '03-14');

-- 山形県立博物館: 연말연시 휴관
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '12-28', '01-04', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '山形県立博物館'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '12-28' AND h.end_md = '01-04');

-- 蔵王温泉大露天風呂: 동계 휴업 (예년 4월 중순 재개)
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '11-21', '04-14', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '蔵王温泉大露天風呂'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '11-21' AND h.end_md = '04-14');

-- 秋田市大森山動物園: 12월은 일요일만
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '12-01', '12-31', '10:00', '15:00', 'MON,TUE,WED,THU,FRI,SAT', 0 FROM spots s
 WHERE s.name_ja = '秋田市大森山動物園'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '12-01' AND h.end_md = '12-31');

-- 秋田市大森山動物園: 1~2월 주말만 (공휴일 개원은 hours_note)
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '01-01', '02-29', '10:00', '15:00', 'MON,TUE,WED,THU,FRI', 0 FROM spots s
 WHERE s.name_ja = '秋田市大森山動物園'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '01-01' AND h.end_md = '02-29');

-- 秋田市大森山動物園: 봄 개원 전 휴원
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '03-01', '03-19', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '秋田市大森山動物園'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '03-01' AND h.end_md = '03-19');

-- 小樽天狗山ロープウエイ: 가을 정비 운휴
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '11-04', '11-27', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '小樽天狗山ロープウエイ'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '11-04' AND h.end_md = '11-27');

-- 小樽天狗山ロープウエイ: 동계 시간
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '11-28', '03-31', '09:00', '20:00', NULL, 0 FROM spots s
 WHERE s.name_ja = '小樽天狗山ロープウエイ'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '11-28' AND h.end_md = '03-31');

-- 旧青山別邸（小樽貴賓館）: 겨울 시간
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '11-01', '03-31', '09:00', '16:00', NULL, 0 FROM spots s
 WHERE s.name_ja = '旧青山別邸（小樽貴賓館）'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '11-01' AND h.end_md = '03-31');

-- 旧青山別邸（小樽貴賓館）: 연말 단축
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '12-29', '12-31', '09:00', '15:00', NULL, 0 FROM spots s
 WHERE s.name_ja = '旧青山別邸（小樽貴賓館）'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '12-29' AND h.end_md = '12-31');

-- 旧青山別邸（小樽貴賓館）: 연초 휴관
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '01-01', '01-07', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '旧青山別邸（小樽貴賓館）'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '01-01' AND h.end_md = '01-07');

-- 小樽市鰊御殿: 가을 단축
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '10-16', '11-23', '09:00', '16:00', NULL, 0 FROM spots s
 WHERE s.name_ja = '小樽市鰊御殿'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '10-16' AND h.end_md = '11-23');

-- 小樽市鰊御殿: 동계 휴관 (2026시즌 4/4~11/23)
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '11-24', '04-03', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '小樽市鰊御殿'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '11-24' AND h.end_md = '04-03');

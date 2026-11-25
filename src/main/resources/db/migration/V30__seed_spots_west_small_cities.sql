-- V30: 서일본 소도시 놀거리 보강 (미야지마·도쿠시마·나루토·마쓰야마·히메지·다자이후·이즈모·고치), 2026-11-25
-- 원본 조사 + 교차 검수 반영: 観世音寺 보물관 요금, 水城跡 높이, 弥山 도보 시간, 姫路市立動物園 요금, 出雲文化伝承館 입관 무료, 荒神谷 화요일 휴관
-- verified_at: 그날 공식 자료를 직접 확인한 곳만 날짜, 나머지 NULL (원본 기준 유지)
-- 계절 시간·연말 휴관은 아래 spot_hours로 (오늘이 들어가는 기간 중 가장 짧은 기간 우선)

-- ===== 廿日市市 (宮島) =====
INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '미센 전망대', '弥山展望台', 'VIEWPOINT', '広島県', '廿日市市', 34.282500, 132.315560, 'FIXED', '10:00', '16:00', NULL, '전망 휴게소 기준 10:00~16:00. 정기 휴일·요금 정보는 확인되지 않음. 등산로·로프웨이 운행 시간은 별도로 확인하세요.', NULL, '미야지마에서 가장 높은 해발 535m 미센 산꼭대기의 전망대예요. 2013년에 히로시마 출신 건축가 산부이치 히로시가 다시 지었어요.', '선착장에서 걸어 오르면 약 2시간이라 등산화가 필요해요. 로프웨이를 타면 시시이와역에서 약 30분 걸어서 갈 수 있어요.', NULL, 'https://dive-hiroshima.com/explore/1467/', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '弥山展望台');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '모미지다니 공원', '紅葉谷公園', 'PARK_GARDEN', '広島県', '廿日市市', 34.293000, 132.323500, 'ALWAYS', NULL, NULL, NULL, '연중 자유 산책. 단풍철 야간 라이트업 일정·시간은 미야지마 관광협회(0829-44-2011)에 확인하세요.', '무료', '단풍나무 약 700그루가 있는 미야지마의 단풍 명소예요. 빨간 모미지 다리와 맑은 계곡이 사진 포인트예요.', '단풍은 보통 11월 중순~12월 초가 절정이에요. 선착장에서 걸어서 약 20분 걸려요.', NULL, NULL, NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '紅葉谷公園');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '미야지마 역사민속자료관', '宮島歴史民俗資料館', 'MUSEUM', '広島県', '廿日市市', 34.294800, 132.317900, 'FIXED', '09:00', '17:00', 'MON', '입관은 16:30까지. 월요일이 공휴일이면 다음 날 휴관. 12/26~12/31 휴관.', '450엔 (고교생 250엔, 65세 이상 220엔, 중학생 이하 무료)', '미야지마의 역사와 생활 문화를 소개하는 자료관으로 1974년에 문을 열었어요. 에도 말기~메이지 시대 간장 양조 상인 에코우 가문의 옛 저택 일부를 사용해요.', '건물 일부는 등록유형문화재라 전시와 함께 옛 상가 건축도 볼 수 있어요.', NULL, 'http://members.fch.ne.jp/miyajima-rekimin/', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '宮島歴史民俗資料館');

-- ===== 徳島市・鳴門市 =====
INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '우즈노미치 (오나루토교 산책로)', '渦の道', 'VIEWPOINT', '徳島県', '鳴門市', 34.238600, 134.651200, 'FIXED', '09:00', '18:00', NULL, '3~9월 9:00~18:00, 10~2월 9:00~17:00, GW·여름방학 8:00~19:00 (입장 30분 전까지). 3·6·9·12월 둘째 월요일 휴관(여름방학 무휴). 2026/12/14~16 임시 휴관.', '510엔 (중고생 410엔, 초등생 260엔, 미취학 무료)', '오나루토 다리 아래에 만든 산책로에서 나루토 해협의 소용돌이를 내려다볼 수 있어요.', '소용돌이는 물때에 따라 크기가 달라서 공식 사이트의 조석표를 보고 가면 좋아요. 전용 주차장이 없어 나루토 공원 유료 주차장을 이용해요.', NULL, 'https://www.uzunomichi.jp/', DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '渦の道');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '오쓰카 국제미술관', '大塚国際美術館', 'MUSEUM', '徳島県', '鳴門市', 34.231000, 134.636000, 'FIXED', '09:30', '17:00', 'MON', '입장권 판매는 16:00까지. 월요일이 공휴일이면 다음 날 휴관. 1월은 연속 휴관 등 특별 휴관 있음, 8월은 무휴.', '3,300엔 (대학생 2,200엔, 초중고생 550엔)', '세계 명화를 원래 크기 도자기 판으로 재현해 1,000점 넘게 전시하는 미술관이에요. 시스티나 예배당과 게르니카 재현이 유명해요.', '전시 공간이 넓어서 시간 여유를 넉넉히 잡는 게 좋아요. 나루토 공원 안이라 우즈노미치와 함께 둘러보기 좋아요.', NULL, 'https://o-museum.or.jp/', DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '大塚国際美術館');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '구 도쿠시마성 오모테고텐 정원', '旧徳島城表御殿庭園', 'PARK_GARDEN', '徳島県', '徳島市', 34.075200, 134.555300, 'FIXED', '09:00', '17:00', 'MON', '입원은 16:30까지. 월요일이 공휴일이면 개원. 공휴일 다음 날 휴원(일요일·공휴일이면 개원). 12/28~1/4 휴원. 시 공식 도쿠시마 중앙공원 페이지 기준.', '50엔 (어린이 30엔, 도쿠시마성 박물관 입관자 무료)', '도쿠시마성 터인 도쿠시마 중앙공원 안에 있는 정원으로 국가 명승이에요. 1945년 공습 뒤 1957년에 복원됐어요.', '바로 옆 도쿠시마성 박물관에 입관하면 정원 입장이 무료예요. JR 도쿠시마역에서 걸어서 약 10분이에요.', NULL, 'https://www.city.tokushima.tokushima.jp/smph/shisetsu/park/chuo.html', DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '旧徳島城表御殿庭園');

-- ===== 松山市 =====
INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '이시테지', '石手寺', 'SHRINE_TEMPLE', '愛媛県', '松山市', 33.847510, 132.796580, 'FIXED', '08:00', '17:00', NULL, '경내는 자유 참배(견학 기준 8:00~17:00). 보물관 8:00~17:00, 만트라 동굴 8:30~16:30. 정기 휴일 정보는 확인되지 않음.', '경내 무료 (보물관 200엔, 만트라 동굴 100엔)', '시코쿠 88개소 순례 51번 사찰이에요. 1318년 무렵 지어진 니오몬(인왕문)은 국보예요.', '참도에서 파는 명물 야키모치(구운 떡)를 맛볼 수 있어요. 도고온천에서 가까워요.', NULL, NULL, DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '石手寺');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '이사니와 신사', '伊佐爾波神社', 'SHRINE_TEMPLE', '愛媛県', '松山市', 33.852800, 132.788500, 'FIXED', '09:00', '19:00', NULL, '에히메현 관광 사이트 기준 9:00~19:00. 사무소(고슈인 접수)는 9:00~17:00. 정기 휴일 정보는 확인되지 않음.', '참배 무료 (고슈인 300엔)', '135개 돌계단 위에 있는 붉은 신사로, 하치만즈쿠리 양식 본전은 중요문화재예요. 일본 전통 수학 문제를 적은 산가쿠 액자로도 유명해요.', '도고온천역에서 걸어서 약 5분이에요. 산가쿠는 훼손 방지를 위해 사진 패널로 전시돼요.', NULL, 'https://www.visitehimejapan.com/en/things-to-do/spots/0064/', DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '伊佐爾波神社');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '도고 공원 (유즈키성 터)', '道後公園', 'PARK_GARDEN', '愛媛県', '松山市', 33.846800, 132.785500, 'ALWAYS', NULL, NULL, NULL, '공원은 상시 개방. 유즈키성 자료관·복원 무가 주택은 9:00~17:00, 월요일 휴관(공휴일이면 다음 날), 12/29~1/3 휴관.', '무료', '중세 이요 지역을 다스린 고노 가문의 유즈키성 터를 정비한 공원이에요. 자료관에서 발굴 유물을 볼 수 있어요.', '이요테쓰 노면전차 도고코엔 정류장에서 바로예요. 복원 무가 주택에는 자원봉사 가이드가 있어요.', NULL, NULL, NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '道後公園');

-- ===== 姫路市 =====
INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '히메지 센트럴 파크', '姫路セントラルパーク', 'AMUSEMENT', '兵庫県', '姫路市', 34.867746, 134.752064, 'VARIES', NULL, NULL, NULL, '영업시간·휴원일이 날짜마다 달라요(2026/11/25 수요일 휴원 표시). 접수는 영업 종료 1시간 전까지. 공식 캘린더를 확인하세요.', '입원 4,200~4,600엔 (어린이 2,400~2,800엔, 날짜별 상이)', '약 190ha에 동물 약 1,200마리가 사는 간사이 유일의 사파리 파크예요. 놀이공원 구역도 함께 있어요.', '입장료가 방문일에 따라 3단계로 달라지니 공식 사이트에서 미리 확인하세요.', NULL, 'https://www.central-park.co.jp/', DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '姫路セントラルパーク');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '히메지 시립 동물원', '姫路市立動物園', 'AMUSEMENT', '兵庫県', '姫路市', 34.838900, 134.697300, 'FIXED', '09:00', '17:00', NULL, '입원은 16:30까지. 정기 휴일 없음, 12/29~1/1 휴원.', '250엔 (5세~중학생 50엔, 5세 미만 무료)', '히메지성 동쪽 바로 옆에 있는 시립 동물원이에요.', '히메지성 관광과 함께 들르기 좋아요. 성 바로 옆이라 동물원 안에서 히메지성을 배경으로 사진 찍기 좋아요.', NULL, 'https://www.city.himeji.lg.jp/dobutuen/', DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '姫路市立動物園');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '일본 완구 박물관', '日本玩具博物館', 'MUSEUM', '兵庫県', '姫路市', 34.926500, 134.722000, 'FIXED', '10:00', '17:00', 'WED', '수요일이 공휴일이면 개관. 12/28~1/3 휴관. 시설 공사로 임시 휴관할 수 있어 개관 캘린더 확인 필요.', '800엔 (고교·대학생 500엔, 4세 이상 어린이 300엔)', '일본 향토 완구와 약 160개국 인형 등 약 9만 점을 소장한 완구 박물관이에요. 미슐랭 그린 가이드 재팬에서 별 2개를 받았어요.', 'JR 반탄선 고로역에서 걸어서 약 15분이에요. 일부 장난감은 놀이 코너에서 직접 만져 볼 수 있어요.', NULL, 'https://www.japan-toy-museum.org/', DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '日本玩具博物館');

-- ===== 太宰府市 =====
INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '간제온지', '観世音寺', 'SHRINE_TEMPLE', '福岡県', '太宰府市', 33.515000, 130.522000, 'FIXED', '09:00', '17:00', NULL, '경내는 자유 참배. 시간은 보물관(宝蔵) 기준 9:00~17:00, 휴일 없음.', '경내 무료 (보물관 600엔, 고교·대학생 400엔, 초중생 150엔)', '7세기 후반 사이메이 천황을 기리기 위해 세운 절로, 한때 규슈 중심 사찰이었어요. 일본에서 가장 오래된 범종으로 알려진 국보 범종이 있어요.', '보물관에는 중요문화재 불상 16구가 있어요. 등나무·수국 등 계절 꽃도 볼 만해요.', NULL, 'https://www.city.dazaifu.lg.jp/site/kanko/11420.html', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '観世音寺');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '미즈키 성터', '水城跡', 'HISTORIC', '福岡県', '太宰府市', 33.530000, 130.498500, 'FIXED', '09:00', '16:30', 'MON', '시간은 안내 시설 미즈키칸 기준(월요일이 공휴일이면 다음 날 휴관, 12/28~1/4 휴관). 유적 자체의 개방 시간은 확인되지 않음.', '무료 (미즈키칸)', '664년 당·신라의 침공에 대비해 쌓은 길이 약 1.2km, 높이 약 9m의 토루 유적으로 국가 특별사적이에요.', '미즈키칸 앞 광장에서 전망대로 올라가 토루를 내려다볼 수 있어요. 10월 말~11월 초에는 옛 해자 자리에 코스모스가 펴요.', NULL, 'https://www.kotodazaifu.net/mizukikan', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '水城跡');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '다자이후 유원지', 'だざいふ遊園地', 'AMUSEMENT', '福岡県', '太宰府市', 33.519500, 130.537000, 'VARIES', NULL, NULL, NULL, '평일 10:30~16:30, 주말·공휴일 10:00~17:00. 휴원일은 비정기라 공식 사이트 영업 캘린더를 확인하세요.', '입원 700엔 (65세 이상 600엔, 3세~초등생 500엔)', '다자이후텐만구 옆에 있는 아담한 유원지예요.', '입원+놀이기구 자유이용권은 성인 3,200엔이에요. 놀이기구는 1회 100~600엔 개별 티켓도 있어요.', NULL, 'https://www.dazaifuyuuenchi.com/', DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = 'だざいふ遊園地');

-- ===== 出雲市 =====
INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '가쿠엔지', '鰐淵寺', 'SHRINE_TEMPLE', '島根県', '出雲市', 35.444000, 132.721000, 'FIXED', '08:00', '17:00', NULL, '입산 접수는 16:15까지. 정기 휴일 정보는 확인되지 않음.', '500엔 (중고생 300엔, 초등생 200엔)', '기타야마 산속에 있는 천태종 고찰로 경내는 국가 사적이에요. 낙차 15m 우로 폭포 뒤 바위굴에 자오도가 있어요.', '단풍은 보통 11월 중순~하순, 신록은 4~5월이에요. 산속이라 대중교통보다 차가 편해요.', NULL, NULL, DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '鰐淵寺');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '고진다니 박물관', '荒神谷博物館', 'MUSEUM', '島根県', '出雲市', 35.375800, 132.836100, 'FIXED', '09:00', '17:00', 'TUE', '입관은 16:30까지. 화요일 휴관(공휴일이면 다음 날)이지만 기획전 기간엔 개관, 전시 교체 기간 휴관. 12/29~1/3 휴관.', '205엔 (고교·대학생 102엔, 초중생 51엔, 기획전 별도)', '국보 동검·동탁·동모가 출토된 고진다니 유적을 패널과 영상으로 소개하는 박물관이에요. 유적은 사적공원으로 정비돼 있어요.', '7월에는 박물관 앞 연못에 고대 연꽃 약 3,000그루가 펴요.', NULL, 'https://www.kojindani.jp/', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '荒神谷博物館');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '이즈모 문화전승관', '出雲文化伝承館', 'MUSEUM', '島根県', '出雲市', 35.380000, 132.740000, 'FIXED', '09:00', '17:00', 'MON', '입관은 16:30까지. 월요일이 공휴일이면 개관. 연말연시 휴관.', '입관 무료 (기획전·특별전 별도)', '이즈모 지역의 전통과 문화를 전하는 시설로 1991년에 문을 열었어요. 이즈모 특유의 쓰이지마쓰 소나무 울타리 안에 옛 상가 저택과 정원이 있어요.', '다실에서 말차와 화과자를 맛볼 수 있고, 부지 안에 소바 가게도 있어요.', NULL, 'https://www.izumo-zaidan.jp/izumodenshokan/', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '出雲文化伝承館');

-- ===== 高知市 =====
INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '가쓰라하마', '桂浜', 'VIEWPOINT', '高知県', '高知市', 33.497000, 133.574500, 'ALWAYS', NULL, NULL, NULL, '자유 산책.', '무료', '류즈곶과 류오곶 사이에 활 모양으로 펼쳐진 해변으로, 소나무 숲과 태평양 전망이 좋아요. 사카모토 료마 대형 동상으로 유명해요.', '파도가 거세서 여름에도 해수욕은 금지예요.', NULL, NULL, NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '桂浜');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '지쿠린지', '竹林寺', 'SHRINE_TEMPLE', '高知県', '高知市', 33.547600, 133.577200, 'FIXED', '08:30', '17:00', NULL, '정원·보물관 기준 8:30~17:00, 연중무휴(자료에 따라 8:00 개장 표기도 있음). 경내 자체 시간은 별도 표기 없음.', '경내 무료 (정원+보물관 800엔, 정원만 500엔)', '724년 창건으로 전해지는 시코쿠 88개소 31번 사찰이에요. 1644년 지은 본당은 중요문화재이고 무소 국사 작으로 전해지는 정원이 있어요.', '지혜의 보살인 문수보살을 모셔서 수험생 참배객이 많아요. 고다이산 위에 있어요.', NULL, 'http://www.chikurinji.com/', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '竹林寺');

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
SELECT '고치성 역사박물관', '高知県立高知城歴史博物館', 'MUSEUM', '高知県', '高知市', 33.560800, 133.533500, 'FIXED', '09:00', '18:00', NULL, '일요일은 8:00 개관. 전시실 입장은 30분 전까지. 12/27~1/1 휴관(안내마다 차이 있어 공식 캘린더 확인), 2026/12/20~25 공사 임시 휴관.', '500엔 (기획전 기간 800엔, 고교생 이하 무료)', '고치성 앞 오테스지에 있는 현립 박물관으로 3층 전시실이 유료 구역이에요.', '일요일엔 8시에 열어서 일요시장 구경과 함께 들르기 좋아요.', NULL, 'https://kochi-johaku.jp/', DATE '2026-11-25', NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name_ja = '高知県立高知城歴史博物館');

-- ===== 계절·기간별 운영시간 =====

-- 渦の道: 겨울 시간
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '10-01', '02-29', '09:00', '17:00', NULL, 0 FROM spots s
 WHERE s.name_ja = '渦の道'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '10-01' AND h.end_md = '02-29');

-- 渦の道: 여름방학: 연장 영업·무휴
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '07-20', '08-31', '08:00', '19:00', 'NONE', 0 FROM spots s
 WHERE s.name_ja = '渦の道'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '07-20' AND h.end_md = '08-31');

-- 宮島歴史民俗資料館: 연말 휴관
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '12-26', '12-31', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '宮島歴史民俗資料館'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '12-26' AND h.end_md = '12-31');

-- 旧徳島城表御殿庭園: 연말연시 휴원
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '12-28', '01-04', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '旧徳島城表御殿庭園'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '12-28' AND h.end_md = '01-04');

-- 姫路市立動物園: 연말연시 휴원
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '12-29', '01-01', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '姫路市立動物園'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '12-29' AND h.end_md = '01-01');

-- 日本玩具博物館: 연말연시 휴관
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '12-28', '01-03', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '日本玩具博物館'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '12-28' AND h.end_md = '01-03');

-- 水城跡: 미즈키칸 연말연시 휴관
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '12-28', '01-04', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '水城跡'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '12-28' AND h.end_md = '01-04');

-- 荒神谷博物館: 연말연시 휴관
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '12-29', '01-03', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '荒神谷博物館'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '12-29' AND h.end_md = '01-03');

-- 高知県立高知城歴史博物館: 연말연시 휴관 (이용 안내 기준)
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, closed_days, is_closed)
SELECT s.id, '12-27', '01-01', NULL, NULL, NULL, 1 FROM spots s
 WHERE s.name_ja = '高知県立高知城歴史博物館'
   AND NOT EXISTS (SELECT 1 FROM spot_hours h WHERE h.spot_id = s.id AND h.start_md = '12-27' AND h.end_md = '01-01');

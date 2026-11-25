-- 2027년 축제 9건 — "매년 같은 날짜" 규칙이 검색으로 확인된 축제만 (2026-11-25 확인)
-- 2027년 공식 발표 전이라 verified_at은 NULL → 화면에 "예년 일정 기준 추정" 문구가 붙음
-- 같은 name_ja + 같은 연도가 이미 있으면 넣지 않음 (기존 데이터와 중복 방지)
-- 좌표는 행사장 기준 근사값 → 적용 전 구글 지도로 확인 권장
-- ※ 열 이름은 Festival 엔티티 기준 추정 — V2__create_festivals.sql과 한 번 대조할 것

INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url)
SELECT '봄 다카야마 마쓰리 (산노 마쓰리)', '春の高山祭(山王祭)', '岐阜県', '高山市', DATE '2027-04-14', DATE '2027-04-15', 2027, 36.1361, 137.2649,
       '다카야마 옛 성하 마을 남쪽의 수호신 히에 신사의 예대제예요. 가을 하치만 마쓰리와 함께 일본 3대 아름다운 축제로 꼽히고, 화려한 축제 수레 12대가 늘어서요.',
       '첫날 밤에는 수백 개의 제등을 단 수레가 옛 거리를 돌아요. 날씨에 따라 행사가 바뀌거나 취소돼도 순연은 없어요.',
       NULL, NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM festivals WHERE name_ja = '春の高山祭(山王祭)' AND festival_year = 2027);

INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url)
SELECT '아오모리 네부타 마쓰리', '青森ねぶた祭', '青森県', '青森市', DATE '2027-08-02', DATE '2027-08-07', 2027, 40.8263, 140.7400,
       '도호쿠 3대 축제 중 하나이자 국가 중요무형민속문화재예요. 거대한 등롱 수레 네부타가 시내를 돌고, 하네토라 부르는 춤꾼들이 "랏세라" 구호와 함께 뛰어요.',
       '정해진 하네토 의상을 입으면 누구나 춤에 참여할 수 있어요. 밤 네부타 행렬은 2~6일, 마지막 날 7일은 낮 운행과 밤 수상 운행·불꽃놀이예요.',
       NULL, NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM festivals WHERE name_ja = '青森ねぶた祭' AND festival_year = 2027);

INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url)
SELECT '아키타 간토 마쓰리', '秋田竿燈まつり', '秋田県', '秋田市', DATE '2027-08-03', DATE '2027-08-06', 2027, 39.7180, 140.1186,
       '쌀가마니에 빗댄 제등을 최대 46개 매단 긴 장대 간토를 손바닥·이마·어깨·허리로 받쳐 드는 축제예요. 무병식재와 오곡풍양을 비는 도호쿠 3대 축제 중 하나예요.',
       '간토 오도리(竿燈大通り)에 장대 수백 개가 한꺼번에 서는 장면이 하이라이트예요. 유료 관람석도 있어요.',
       'https://www.kantou.gr.jp/', NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM festivals WHERE name_ja = '秋田竿燈まつり' AND festival_year = 2027);

INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url)
SELECT '센다이 다나바타 마쓰리', '仙台七夕まつり', '宮城県', '仙台市青葉区', DATE '2027-08-06', DATE '2027-08-08', 2027, 38.2610, 140.8740,
       '손으로 만든 커다란 종이 장식 수백 개가 대나무에 매달려 아케이드 거리를 가득 채우는 축제예요. 네부타·간토와 함께 도호쿠 3대 여름 축제로 꼽혀요.',
       '전날인 8월 5일 밤에 불꽃놀이가 열려요. 센다이역에서 걸어서 갈 수 있는 상점가 일대가 무대예요.',
       NULL, NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM festivals WHERE name_ja = '仙台七夕まつり' AND festival_year = 2027);

INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url)
SELECT '아와오도리', '阿波おどり', '徳島県', '徳島市', DATE '2027-08-12', DATE '2027-08-15', 2027, 34.0700, 134.5540,
       '400년 역사를 가진 도쿠시마의 여름 축제로, 렌이라 부르는 춤 무리가 거리를 누비며 춤춰요. 매년 100만 명 넘게 찾는 일본 최대급 춤 축제예요.',
       '관광객도 사전 신청 없이 니와카렌(飛び入り)으로 함께 춤출 수 있어요. 유료 연무장은 표가 필요해요. 시내 야외 본 축제는 12~15일이고, 전날 11일에 실내 유료 오프닝 공연이 열리기도 해요.',
       NULL, NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM festivals WHERE name_ja = '阿波おどり' AND festival_year = 2027);

INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url)
SELECT '나가사키 군치', '長崎くんち', '長崎県', '長崎市', DATE '2027-10-07', DATE '2027-10-09', 2027, 32.7514, 129.8800,
       '1634년부터 이어진 나가사키 스와 신사의 가을 대제예요. 용춤 같은 중국·네덜란드 문화가 섞인 봉납 춤이 국가 중요무형민속문화재예요.',
       '춤을 맡는 동네가 7년마다 돌아가서 해마다 볼 수 있는 공연이 달라요. 스와 신사 경내 무대가 가장 인기 있는 관람 장소예요.',
       NULL, NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM festivals WHERE name_ja = '長崎くんち' AND festival_year = 2027);

INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url)
SELECT '가을 다카야마 마쓰리 (하치만 마쓰리)', '秋の高山祭(八幡祭)', '岐阜県', '高山市', DATE '2027-10-09', DATE '2027-10-10', 2027, 36.1497, 137.2617,
       '다카야마 옛 성하 마을 북쪽의 수호신 사쿠라야마 하치만구의 예대제예요. 축제 수레 11대가 늘어서고, 수레 행사는 유네스코 무형문화유산이에요.',
       '봄 축제와 마찬가지로 첫날 밤 제등을 단 수레가 거리를 돌아요. 숙소가 일찍 차니 미리 예약하는 게 좋아요.',
       NULL, NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM festivals WHERE name_ja = '秋の高山祭(八幡祭)' AND festival_year = 2027);

INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url)
SELECT '하카타 오쿤치', '博多おくんち', '福岡県', '福岡市博多区', DATE '2027-10-23', DATE '2027-10-24', 2027, 33.5930, 130.4106,
       '하카타의 수호신 구시다 신사의 가을 예대제로, 일본 3대 군치 중 하나예요. 23일에 대제를 올리고, 24일에는 소가 끄는 수레에 실린 가마 행렬이 하카타 거리를 돌아요.',
       '구시다 신사는 지하철 나카스카와바타역·기온역에서 걸어서 5분이에요. 특별한 해(25년마다 식년천궁)에는 일정이 늘어나니 공식 안내를 확인하세요.',
       NULL, NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM festivals WHERE name_ja = '博多おくんち' AND festival_year = 2027);

INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url)
SELECT '가라쓰 군치', '唐津くんち', '佐賀県', '唐津市', DATE '2027-11-02', DATE '2027-11-04', 2027, 33.4505, 129.9690,
       '가라쓰 신사의 가을 예대제로, 유네스코 무형문화유산이에요. 붉은 사자 등 히키야마 14대가 "엔야, 엔야" 구호와 함께 거리를 누벼요.',
       '하이라이트는 11월 3일 신사 앞 백사장에 수레를 끌어들이는 장면이에요. 2일 밤 요이야마도 볼 만해요.',
       NULL, NULL, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM festivals WHERE name_ja = '唐津くんち' AND festival_year = 2027);
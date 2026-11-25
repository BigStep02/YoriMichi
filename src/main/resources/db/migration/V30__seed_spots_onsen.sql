-- 놀거리 ONSEN(온천) 첫 시드 10곳 — 2026-11-25 검색 확인분만
-- 규칙: 운영시간·요금은 검색으로 확인한 값만. 정기휴일이 N번째 주이거나 출처끼리 다르면 closed_days NULL + hours_note
-- 좌표는 지도 기준 근사값 → 적용 전 구글 지도로 한 번 확인 권장
-- official_url은 공공기관 자료로 확인된 것만 (나머지 NULL)

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
VALUES ('도고온천 본관', '道後温泉本館', 'ONSEN', '愛媛県', '松山市', 33.8519, 132.7866, 'FIXED', '06:00', '23:00', NULL,
        '입장 마감 22:30. 무휴(12월 중 하루 임시 휴관). 이용 코스별로 시간이 다름',
        '가미노유 1층 입욕만 성인 700엔, 어린이(2~11세) 350엔. 다른 코스는 별도 요금',
        '1894년에 지은 목조 3층 공중목욕탕으로 국가 중요문화재예요. 문화재이면서 지금도 영업하는 목욕탕이고, 약 6년의 보존 수리를 마치고 2024년 전관 영업을 재개했어요.',
        '매일 아침 6시 옥상 누각의 북소리로 문을 열어요. 개장 직후는 붐비니 8~9시쯤이 비교적 한산해요.',
        NULL, NULL, DATE '2026-11-25', NULL);

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
VALUES ('아리마온천 긴노유', '有馬本温泉 金の湯', 'ONSEN', '兵庫県', '神戸市北区', 34.7969, 135.2478, 'FIXED', '08:00', '22:00', NULL,
        '최종 접수 21:30. 둘째·넷째 화요일 휴관(공휴일이면 다음 날), 1월 1일 휴관',
        '평일 성인 650엔, 토·일·공휴일·특정일 800엔, 초·중학생 350엔',
        '철분과 염분이 진한 적갈색 온천 금천(金泉)을 즐길 수 있는 아리마의 공중목욕탕이에요. 고베시 시설로 2026년 3월 개보수를 마치고 다시 문을 열었어요.',
        '입구 앞 다이코의 족욕(太閤の足湯)은 무료예요. 연휴에는 대기가 길어 오전이 편해요.',
        NULL, 'https://arimaspa-kingin.jp/kin-01.htm', DATE '2026-11-25', NULL);

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
VALUES ('후나오카 온천', '船岡温泉', 'ONSEN', '京都府', '京都市北区', 35.0378, 135.7430, 'FIXED', '15:00', '23:30', NULL,
        '일요일은 8:00부터. 정기휴일은 출처마다 달라 방문 전 확인 필요',
        '성인 550엔',
        '1923년 요리 여관의 부속 목욕탕으로 시작한 센토로, 탈의장과 욕실이 국가 등록유형문화재예요. 탈의장 천장의 우시와카마루와 덴구 목조각이 볼거리예요.',
        '노천탕과 사우나도 입욕료만으로 이용할 수 있어요. 수건·세면도구는 챙겨 가는 게 좋아요.',
        NULL, NULL, DATE '2026-11-25', NULL);

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
VALUES ('세이부치치부역 앞 온천 마쓰리노유', '西武秩父駅前温泉 祭の湯', 'ONSEN', '埼玉県', '秩父市', 35.9898, 139.0842, 'FIXED', '10:00', '22:00', NULL,
        '최종 접수 21:30. 토·일·공휴일 아침 목욕 6:00~9:00. 무휴(점검 휴관일 있음)',
        '평일 성인 1,100엔·어린이 700엔, 토·일·공휴일·특정일 성인 1,380엔·어린이 800엔',
        '세이부치치부역 바로 앞의 복합 온천 시설로, 1년에 300회 넘게 축제가 열리는 지치부답게 콘셉트가 축제예요. 노천탕에서 부코산을 바라볼 수 있어요.',
        '푸드코트에서 와라지카쓰·미소포테토 같은 지치부 명물을 먹을 수 있어요. 푸드코트와 기념품 구역은 입장 무료예요.',
        NULL, NULL, DATE '2026-11-25', NULL);

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
VALUES ('후쓰카이치 온천 하카타유', '博多湯', 'ONSEN', '福岡県', '筑紫野市', 33.4979, 130.5203, 'FIXED', '10:00', '21:30', NULL,
        '최종 접수 21:00. 연중무휴(점검 휴관 있음)',
        '평일 성인 350엔, 토·일·공휴일 450엔, 6~11세 200엔',
        '규슈에서 가장 오래된 온천으로 꼽히는 후쓰카이치 온천의 공중목욕탕이에요. 부지 안 원천을 물을 섞지 않고 그대로 흘려보내요.',
        '다자이후 관광 뒤에 들르기 좋아요. 욕실이 작아서 한산한 시간대가 편하고, 2층 휴게실은 무료예요.',
        NULL, NULL, DATE '2026-11-25', NULL);

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
VALUES ('스카유 온천', '酸ヶ湯温泉', 'ONSEN', '青森県', '青森市', 40.6488, 140.8490, 'FIXED', '07:00', '18:00', NULL,
        '히바 센닌부로(혼욕) 최종 접수 17:30, 8:00~9:00은 여성 전용. 남녀별 다마노유는 9:00~17:00. 무휴(관내 정비 휴업일 있음). 겨울엔 도로 통제가 있을 수 있음. 겨울철(12~3월) 시간·요금이 바뀐다는 정보가 있어 방문 전 확인 권장',
        '성인 1,000엔(대여 수건 포함), 초등학생 500엔',
        '핫코다산 해발 약 900m의 온천 여관으로, 1954년 국민보양온천지 제1호로 지정됐어요. 아오모리산 노송나무로 지은 160첩 크기의 혼욕 대욕장 히바 센닌부로가 명물이에요.',
        '혼욕이 부담되면 여성 전용 시간이나 남녀별 욕실 다마노유를 이용하세요. 강산성 온천이라 피부가 예민하면 주의하세요.',
        NULL, NULL, DATE '2026-11-25', NULL);

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
VALUES ('기노사키 온천 이치노유', '一の湯', 'ONSEN', '兵庫県', '豊岡市', 35.6258, 134.8095, 'FIXED', '07:00', '23:00', 'WED',
        '최종 접수 22:30. 수요일이 공휴일이면 영업',
        '성인 800엔, 어린이 400엔',
        '기노사키 외탕 7곳 중 으뜸으로 꼽히는 곳으로, 에도시대 의사가 천하제일의 온천이라 적은 데서 이름이 붙었어요. 천연 바위를 깎아 만든 동굴탕이 명물이에요.',
        '모모야마 양식의 건물 외관이 기노사키 온천가를 대표하는 풍경이에요. 다른 외탕과 묶어 순례하기 좋아요.',
        NULL, NULL, DATE '2026-11-25', NULL);

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
VALUES ('다케가와라 온천', '竹瓦温泉', 'ONSEN', '大分県', '別府市', 33.2808, 131.5023, 'FIXED', '06:30', '22:30', NULL,
        '셋째 수요일 휴관(공휴일이면 다음 날). 모래찜질은 8:00부터, 접수 21:30까지',
        '일반 입욕 성인 300엔·초등학생 100엔, 모래찜질 1,500엔(6세 미만 불가)',
        '1879년에 문을 연 벳푸 온천을 대표하는 공동 목욕탕이에요. 지금 건물은 1938년에 지은 국가 등록유형문화재로, 가라하후 지붕이 인상적이에요.',
        '온천 열로 데운 모래를 덮는 모래찜질(스나유)을 체험할 수 있어요. 비누·샴푸는 따로 사야 해요.',
        NULL, NULL, DATE '2026-11-25', NULL);

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
VALUES ('구사쓰 사이노카와라 노천탕', '西の河原露天風呂', 'ONSEN', '群馬県', '吾妻郡草津町', 36.6238, 138.5915, 'FIXED', '07:00', '20:00', NULL,
        '최종 입장 19:30. 12~3월은 9:00 개장. 무휴(점검 휴관 있음)',
        '성인 800엔, 어린이 400엔',
        '구사쓰 최대의 노천탕으로 남녀 노천탕을 합쳐 약 500㎡ 규모예요. 유바타케에서 걸어서 10분 남짓 거리의 사이노카와라 공원 안에 있어요.',
        '씻는 곳이 없으니 몸을 씻은 뒤 가는 게 좋아요. 밤에는 조명이 켜져요.',
        NULL, NULL, DATE '2026-11-25', NULL);

INSERT INTO spots (name, name_ja, kind, prefecture, city, lat, lng, hours_kind, open_time, close_time, closed_days, hours_note, fee_note, description, tips, google_place_id, official_url, verified_at, image_url)
VALUES ('게로 온천 시라사기노유', '白鷺乃湯', 'ONSEN', '岐阜県', '下呂市', 35.8077, 137.2440, 'FIXED', '10:00', '20:45', 'WED',
        '출처마다 시간·요금이 조금씩 달라 방문 전 확인 권장 (요금 인상 정보 있음)',
        '성인 430엔, 초등학생 160엔, 유아 80엔',
        '1926년부터 이어진 게로 온천가 한가운데의 대중목욕탕이에요. 하얀 서양식 건물로, 큰 창으로 히다강과 산을 바라보며 목욕할 수 있어요.',
        '앞에 있는 사기노 족욕과 온천박물관도 가까워 함께 둘러보기 좋아요.',
        NULL, NULL, DATE '2026-11-25', NULL);

-- 구사쓰 사이노카와라: 겨울(12~3월) 개장 9:00 — 계절 행
-- ※ spot_hours 열 이름은 V11 기준으로 한 번 확인할 것 (spot_id, start_md, end_md, open_time, close_time, is_closed)
INSERT INTO spot_hours (spot_id, start_md, end_md, open_time, close_time, is_closed)
SELECT id, '12-01', '03-31', '09:00', '20:00', 0 FROM spots WHERE name_ja = '西の河原露天風呂';
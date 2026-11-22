-- Flyway V27: V26 겨울 이벤트 검수 반영 (2026-11-22)

-- 후쿠오카 3곳: crossroadfukuoka 특집 페이지가 아직 2025년판이라 URL 제거
UPDATE festivals SET official_url = NULL
 WHERE name_ja IN ('クリスマスマーケット in 光の街・博多', '天神クリスマスマーケット', 'クリスマスゲートパーク in 福岡大名ガーデンシティ');

-- 미도스지: 점등 시간 (오사카부 보도자료)
UPDATE festivals SET tips = '점등 17시쯤~다음 날 1시. 한신 앞(阪神前) 교차로~난바 니시구치 교차로 구간. 오사카 빛의 향연 전체는 2027-01-31까지.'
 WHERE name_ja = '御堂筋イルミネーション';

-- 하고이타 시장: 운영 시간 (GO TOKYO, 매년 동일 운영)
UPDATE festivals SET tips = '9:00~19:30 (마지막 날은 19:00까지). 1만 개 안팎의 에도 오시에 하고이타가 전시된다.',
       official_url = 'https://e-asakusa.jp/'
 WHERE name_ja = '浅草寺 羽子板市（歳の市）';

-- OSAKA 빛의 르네상스 2026 (오사카부·시 보도자료). 시청 정면 파사드·나카노시마 일루미네이션 스트리트는 11/3~12/31
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('OSAKA 빛의 르네상스', 'OSAKA光のルネサンス', '大阪府', '大阪市北区', DATE '2026-12-11', DATE '2026-12-25', 2026, 34.693500, 135.504000, '오사카시청 주변부터 나카노시마 공원까지 물가 풍경을 살린 빛 프로그램. 중앙공회당 프로젝션 매핑과 빛의 마르셰가 열린다. 2026년 테마는 오사카, 빛의 축하 밤 축제.', '프로그램마다 시간이 다르다. 빛의 마르셰 16:00~22:00 (나니와바시역 주변). 시청 정면 일루미네이션 파사드와 약 150m 느티나무길 일루미네이션은 11/3~12/31, 17:00~25:00.', 'https://www.city.osaka.lg.jp/hodoshiryo/keizaisenryaku/0000687506.html', DATE '2026-11-22', NULL);

-- 매월 25일 덴진이치 고정 규칙 (2027년 개별 공지는 아직 없음)
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('하쓰텐진 (기타노 덴만구 새해 첫 장)', '初天神（北野天満宮）', '京都府', '京都市上京区', DATE '2027-01-25', DATE '2027-01-25', 2027, 35.031200, 135.735100, '새해 첫 덴진이치. 약 1000개 노점이 늘어서고, 봉납 서예(가키조메) 작품 전시와 보물전 공개도 함께 열린다.', '2026년 기준 6:30~20:00. 25일은 신사 주차장을 쓸 수 없으니 시버스로.', 'https://kitanotenmangu.or.jp/', DATE '2026-11-22', NULL);

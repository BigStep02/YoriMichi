-- Flyway V26: 겨울 이벤트 시드 (2026-12 ~ 2027-03, 2026-11-22 조사, 16건)
-- 일루미네이션·크리스마스 마켓·연말/연초 장·겨울 축제. 날짜는 검색으로 확인한 것만.
-- official_url은 검색 결과에 나온 주소만, 없으면 NULL. 좌표는 근사값(회장 중심)

-- 시 보도자료(2026-11-10). 오도리 회장 기준. 12/23~25는 24:00까지
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('삿포로 화이트 일루미네이션 (오도리 회장)', 'さっぽろホワイトイルミネーション（大通会場）', '北海道', '札幌市中央区', DATE '2026-11-20', DATE '2026-12-25', 2026, 43.060300, 141.351000, '오도리 공원을 중심으로 열리는 삿포로 겨울 일루미네이션. 무료.', '점등 16:30~22:00 (12/23~25는 24:00까지). 역앞 거리는 2/11, 미나미이치조·아카프라·역 남쪽 출구는 3/14, 아카렌가 청사는 2/28까지 이어지고, 나카지마 공원 회장은 1/9~1/28에 열린다.', NULL, DATE '2026-11-22', NULL);

INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('뮌헨 크리스마스 시장 in 삿포로', 'ミュンヘン・クリスマス市 in Sapporo', '北海道', '札幌市中央区', DATE '2026-11-20', DATE '2026-12-25', 2026, 43.060300, 141.352200, '오도리 공원 1·2초메에 열리는 독일식 크리스마스 마켓. 화이트 일루미네이션과 같은 기간에 열린다.', '11:00~21:00', 'https://www.sapporo.travel/white-illumination/event/munich/', DATE '2026-11-22', NULL);

-- 2026년 일정 확인. 11~1월 3개월 점등
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('아오노 운가 (푸른 운하)', '青の運河', '北海道', '小樽市', DATE '2026-11-01', DATE '2027-01-31', 2026, 43.198500, 140.994000, '오타루 운하의 다리 난간 등에 푸른 LED 약 1만 개를 다는 겨울 일루미네이션. 무료.', '일몰~22:30. 해 진 직후 하늘이 파랄 때가 가장 예쁘다. 운하 크루즈도 기간 중 푸른 전구를 달고 다닌다.', NULL, DATE '2026-11-22', NULL);

INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('오타루 운하 캔들 나이트', '小樽運河キャンドルナイト', '北海道', '小樽市', DATE '2026-12-18', DATE '2026-12-27', 2026, 43.197600, 140.995500, '오타루 운하 옆 오타루 포트 스퀘어를 오일 랜턴 불빛으로 꾸미는 10일간의 크리스마스 행사.', '캔들 점등 16:00~20:00. 캔들 마르셰는 평일 14:00~, 주말 11:00~ 20:00까지.', NULL, DATE '2026-11-22', NULL);

-- 시 자료상 '예정'. 41회째
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('센다이 빛의 페이전트', 'SENDAI光のページェント', '宮城県', '仙台市青葉区', DATE '2026-12-04', DATE '2026-12-27', 2026, 38.266500, 140.869000, '조젠지 거리의 느티나무 127그루를 LED 약 48만 개로 밝히는 센다이의 겨울 행사. 2026년이 41회째.', NULL, NULL, DATE '2026-11-22', NULL);

INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('마루노우치 일루미네이션', '丸の内イルミネーション', '東京都', '千代田区', DATE '2026-11-12', DATE '2027-02-14', 2026, 35.679500, 139.764000, '마루노우치 나카도리 약 1.2km 가로수를 샴페인 골드 빛으로 물들이는 일루미네이션. 2026년이 25년째.', '나카도리 16:00~23:00 (12월은 24:00까지 예정). 교코도리는 11/27~12/25에만 16:00~24:00 점등.', 'https://www.marunouchi.com/lp/brightholiday2026/', DATE '2026-11-22', NULL);

-- 매년 12/17~19 고정
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('센소지 하고이타 시장', '浅草寺 羽子板市（歳の市）', '東京都', '台東区', DATE '2026-12-17', DATE '2026-12-19', 2026, 35.714800, 139.796700, '연말 센소지 경내에 화려한 오시에 하고이타(장식 배드민턴 채) 노점이 늘어서는 세밑 장.', NULL, NULL, DATE '2026-11-22', NULL);

INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('미도스지 일루미네이션', '御堂筋イルミネーション', '大阪府', '大阪市中央区', DATE '2026-11-03', DATE '2026-12-31', 2026, 34.683000, 135.500500, '오사카 빛의 향연의 핵심 프로그램. 미도스지 약 4km 은행나무 가로수를 5개 구역으로 나눠 밝힌다.', '오사카 빛의 향연 전체는 2027-01-31까지.', NULL, DATE '2026-11-22', NULL);

-- 매월 21일 고보이치 중 연말·연초 회
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('시마이 고보 (도지 연말 장)', '終い弘法（東寺）', '京都府', '京都市南区', DATE '2026-12-21', DATE '2026-12-21', 2026, 34.980600, 135.747800, '매월 21일 도지에서 열리는 고보이치 가운데 한 해 마지막 장. 골동품·잡화·헌옷·먹거리 노점에 정월 용품까지 더해져 크게 붐빈다.', '8:00~15:00. 물건은 아침이 가장 많다. 긴테쓰 도지역에서 도보 10분.', 'http://www.touji-ennichi.com/', DATE '2026-11-22', NULL);

INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('하쓰고보 (도지 새해 첫 장)', '初弘法（東寺）', '京都府', '京都市南区', DATE '2027-01-21', DATE '2027-01-21', 2027, 34.980600, 135.747800, '도지의 새해 첫 고보이치. 약 1000개 노점이 경내에 늘어서 평소보다 많은 사람이 찾는다.', '8:00~15:00', 'http://www.touji-ennichi.com/', DATE '2026-11-22', NULL);

INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('시마이 덴진 (기타노 덴만구 연말 장)', '終い天神（北野天満宮）', '京都府', '京都市上京区', DATE '2026-12-25', DATE '2026-12-25', 2026, 35.031200, 135.735100, '매월 25일 기타노 덴만구에서 열리는 덴진이치의 한 해 마지막 장. 골동품·고도구·식물 노점에 청어알·시메카자리 같은 정월 용품이 더해진다.', '6:30쯤부터 준비된 노점부터 열고 대부분은 9시쯤 연다. 21:00까지 (노점마다 다름).', 'https://kitanotenmangu.or.jp/', DATE '2026-11-22', NULL);

-- 매년 1/8~12 고정
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('도카에비스 대제 (교토 에비스 신사)', '十日ゑびす大祭（京都ゑびす神社）', '京都府', '京都市東山区', DATE '2027-01-08', DATE '2027-01-12', 2027, 35.001100, 135.773500, '일본 3대 에비스 마쓰리의 하나. 상업 번창을 비는 길조 대나무(후쿠자사)를 받으려는 사람으로 연일 붐빈다.', '8일 23:00까지, 9·10일은 밤새 개문, 11일 24:00, 12일 22:00 폐문. 게이한 기온시조역에서 도보 6분.', 'http://www.kyoto-ebisu.jp/tooka.html', DATE '2026-11-22', NULL);

INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('히로시마 드리미네이션', 'ひろしまドリミネーション', '広島県', '広島市中区', DATE '2026-12-04', DATE '2027-01-24', 2026, 34.389300, 132.457000, '평화대로 일대를 동화 같은 빛 조형물로 꾸미는 히로시마 겨울 일루미네이션. 무료.', '17:30~22:30 (첫날은 18:00부터).', 'https://www.dreamination.com/', DATE '2026-11-22', NULL);

-- 크리스마스 어드벤트(구 후쿠오카 크리스마스 마켓) 2026
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('크리스마스 마켓 in 빛의 거리 하카타', 'クリスマスマーケット in 光の街・博多', '福岡県', '福岡市博多区', DATE '2026-11-07', DATE '2026-12-25', 2026, 33.589700, 130.420700, 'JR 하카타역 앞 광장에서 열리는 크리스마스 마켓. 2026년이 14년째, 테마는 Five Senses Christmas. 입장 무료.', '평일 16:00~23:00, 주말·공휴일 12:00~23:00. 음식 라스트오더 22:45.', 'https://www.crossroadfukuoka.jp/feature/advent', DATE '2026-11-22', NULL);

INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('덴진 크리스마스 마켓', '天神クリスマスマーケット', '福岡県', '福岡市中央区', DATE '2026-11-14', DATE '2026-12-26', 2026, 33.589800, 130.401700, '후쿠오카 시청 서쪽 후레아이 광장에서 열리는 크리스마스 마켓. 입장 무료.', '평일 17:00~23:00, 주말·공휴일 12:00~23:00. 11/28·29는 휴업이니 하카타 회장으로.', 'https://www.crossroadfukuoka.jp/feature/advent', DATE '2026-11-22', NULL);

INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('크리스마스 게이트 파크 in 후쿠오카 다이묘 가든 시티', 'クリスマスゲートパーク in 福岡大名ガーデンシティ', '福岡県', '福岡市中央区', DATE '2026-11-13', DATE '2026-12-25', 2026, 33.588600, 130.396800, '360도 일루미네이션 속에서 따뜻한 음료와 음식을 즐기는 다이묘 회장 크리스마스 마켓. 입장 무료.', '평일 17:00~22:00, 주말·공휴일 12:00~22:00 (12/24·25는 12:00부터).', 'https://www.crossroadfukuoka.jp/feature/advent', DATE '2026-11-22', NULL);

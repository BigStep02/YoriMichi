-- Flyway V3: 간사이 마츠리 시드 데이터 (2026-11-13 조사, 14건)
-- description: 확인한 사실로 쓴 한 줄 소개. 나중에 Gemini로 늘려 쓸 수 있음
-- coord 근사값 행은 검수 시 좌표 확인 필요

-- 매년 11/22~23 고정
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('신노사이', '神農祭', '大阪府', '大阪市中央区', DATE '2026-11-22', DATE '2026-11-23', 2026, 34.688493, 135.506077, '약의 신을 모시는 스쿠나히코나 신사의 예대제. 오사카에서 한 해의 마지막 축제로 불리며, 병을 막아준다는 종이 호랑이 부적을 받을 수 있다. 제약회사가 모인 도쇼마치 거리에 노점이 늘어선다.', NULL, NULL, DATE '2026-11-13', NULL);

-- 메인 행사 12/17 (2026년 목요일) / 좌표 근사값
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('가스가 와카미야 온마쓰리', '春日若宮おん祭', '奈良県', '奈良市', DATE '2026-12-15', DATE '2026-12-18', 2026, 34.6814, 135.8484, '1136년에 시작해 한 번도 끊기지 않은 가스가 대사 와카미야의 제례. 17일 정오에 여러 시대 의상을 입은 행렬(오와타리시키)이 시내를 지나고, 밤늦게까지 고대·중세 예능이 봉납된다.', NULL, NULL, DATE '2026-11-13', NULL);

-- 매년 1/9~11 고정 / 좌표 근사값
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('도카에비스 (이마미야에비스)', '十日戎（今宮戎神社）', '大阪府', '大阪市浪速区', DATE '2027-01-09', DATE '2027-01-11', 2027, 34.6563, 135.4969, '상업 번창의 신 에비스를 모시는 이마미야에비스 신사의 새해 축제. 9일 요이에비스, 10일 혼에비스, 11일 노코리에비스로 3일간 열리고, 후쿠무스메에게 복조릿대(후쿠자사)를 받는다. 10일에는 호에카고 행렬이 있다.', NULL, 'https://osaka-info.jp/event/imamiyaebisu-tokaebisu/', DATE '2026-11-13', NULL);

-- 1월 넷째 토요일. 2027년 날짜는 실행위원회 발표 기준
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('와카쿠사야마 야마야키', '若草山焼き', '奈良県', '奈良市', DATE '2027-01-23', DATE '2027-01-23', 2027, 34.6905984, 135.8540178, '매년 1월 넷째 토요일 저녁, 불꽃놀이 뒤 와카쿠사산 전체에 불을 붙이는 나라의 겨울 행사. 2027년 예정은 18:15 불꽃 약 600발, 18:30 일제 점화. 날씨가 나쁘면 중지된다.', NULL, 'https://www3.pref.nara.jp/yamayaki/', DATE '2026-11-13', NULL);

-- 매년 3/1~14 고정, 15일 만행 / 좌표 근사값
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('오미즈토리 (도다이지 슈니에)', '東大寺修二会（お水取り）', '奈良県', '奈良市', DATE '2027-03-01', DATE '2027-03-14', 2027, 34.6894, 135.8448, '752년부터 한 번도 끊기지 않은 도다이지 니가쓰도의 법회. 기간 중 매일 밤 큰 횃불(오타이마쓰)이 니가쓰도 난간에 오르고, 12일 밤의 가고타이마쓰가 가장 크다.', NULL, NULL, DATE '2026-11-13', NULL);

-- 주요 행사 4/13~16 (관련 행사 4/9~17) / 좌표 근사값
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('나가하마 히키야마 마쓰리', '長浜曳山まつり', '滋賀県', '長浜市', DATE '2027-04-13', DATE '2027-04-16', 2027, 35.3843, 136.2753, '일본 3대 수레 축제 중 하나로, 유네스코 무형유산 ''야마·호코·야타이 행사''에 들어간다. 화려한 수레(히키야마) 무대에서 아이들이 가부키를 공연하며, 15일 나가하마하치만궁 봉납 공연이 하이라이트.', NULL, 'https://nagahama-hikiyama.or.jp/', DATE '2026-11-13', NULL);

-- 매년 5/15 고정 (우천 시 순연 가능) / 좌표 근사값
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('아오이 마쓰리', '葵祭', '京都府', '京都市', DATE '2027-05-15', DATE '2027-05-15', 2027, 35.0389, 135.7727, '시모가모 신사와 가미가모 신사의 제례로 교토 3대 마쓰리 중 하나. 헤이안 귀족 차림을 한 500명 넘는 행렬이 교토고쇼에서 시모가모 신사를 거쳐 가미가모 신사로 향한다.', NULL, 'https://ja.kyoto.travel/event/major/', DATE '2026-11-13', NULL);

-- 매년 7/1~31 고정, 순행 7/17·7/24 / 좌표 근사값
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('기온 마쓰리', '祇園祭', '京都府', '京都市東山区', DATE '2027-07-01', DATE '2027-07-31', 2027, 35.0037, 135.7785, '야사카 신사의 제례로 7월 한 달 내내 열리는 일본 3대 마쓰리. 17일(사키마쓰리)과 24일(아토마쓰리)의 야마보코 34기 순행이 하이라이트이고, 순행 전 사흘간의 요이야마에는 등불과 노점이 거리를 채운다.', NULL, 'https://ja.kyoto.travel/event/major/gion/', DATE '2026-11-13', NULL);

-- 매년 7/14 고정 / 좌표 근사값
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('나치 오기마쓰리 (나치 불축제)', '那智の扇祭り（那智の火祭）', '和歌山県', '那智勝浦町', DATE '2027-07-14', DATE '2027-07-14', 2027, 33.668, 135.8905, '구마노나치 대사의 12신이 나치 폭포의 히로 신사로 1년에 한 번 돌아가는 제례. 약 50kg짜리 큰 횃불 12개가 폭포 앞 참도를 정화하는 ''오히 행사''가 하이라이트인 일본 3대 불축제.', NULL, NULL, DATE '2026-11-13', NULL);

-- 매년 7/24~25 고정, 불꽃은 25일 / 좌표 근사값
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('덴진 마쓰리', '天神祭', '大阪府', '大阪市北区', DATE '2027-07-24', DATE '2027-07-25', 2027, 34.6955, 135.5127, '오사카텐만궁의 제례로 일본 3대 마쓰리 중 하나. 24일 요미야의 호코나가시 신사로 시작해, 25일 밤 오카와 강에 약 100척의 배가 오가는 후나토교와 봉납 불꽃놀이로 절정을 맞는다.', NULL, 'https://osaka-info.jp/event/osakatenmangu-tenjinsai/', DATE '2026-11-13', NULL);

-- TODO: 2027년 날짜 미발표. 경로의 날 직전 토·일 규칙으로 추정 (2026년은 9/19~20) / 좌표 근사값
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('기시와다 단지리 마쓰리 (9월 제례)', '岸和田だんじり祭（9月祭礼）', '大阪府', '岸和田市', DATE '2027-09-18', DATE '2027-09-19', 2027, 34.46, 135.3714, '300년 넘는 역사의 축제. 4톤이 넘는 수레(단지리)가 속도를 줄이지 않고 모퉁이를 직각으로 도는 ''야리마와시''가 가장 큰 볼거리다. 9월 제례는 기시와다·하루키 지구에서 열린다.', NULL, 'https://www.city.kishiwada.lg.jp/site/danjiri/', NULL, NULL);

-- 매년 10/14~15 고정 / 좌표 근사값
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('나다 겐카 마쓰리', '灘のけんか祭り', '兵庫県', '姫路市', DATE '2027-10-14', DATE '2027-10-15', 2027, 34.7826, 134.727, '마쓰바라하치만 신사의 가을 예대제로 ''일본 3대 거친 가마'' 축제. 14일 요미야에 옛 7개 마을의 야타이가 신사로 들어오고, 15일 혼미야에 가마 3기를 격렬하게 부딪친다.', NULL, 'https://www.nadamatsuri.jp/festival/index.html', DATE '2026-11-13', NULL);

-- 매년 10/22 (우천 시 연기된 해 있음) / 좌표 근사값
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('지다이 마쓰리', '時代祭', '京都府', '京都市', DATE '2027-10-22', DATE '2027-10-22', 2027, 35.016, 135.7823, '헤이안 천도일(10월 22일)에 열리는 헤이안 신궁의 제례로 교토 3대 마쓰리 중 하나. 메이지 유신부터 헤이안 시대까지 의상을 재현한 약 2,000명의 행렬이 교토고엔에서 헤이안 신궁까지 약 2km를 걷는다.', NULL, 'https://ja.kyoto.travel/event/major/', DATE '2026-11-13', NULL);

-- 매년 10/22 고정. 2026년 개최 확인
INSERT INTO festivals (name, name_ja, prefecture, city, start_date, end_date, festival_year, lat, lng, description, tips, official_url, verified_at, image_url) VALUES ('구라마 히마쓰리', '鞍馬の火祭', '京都府', '京都市左京区（鞍馬）', DATE '2027-10-22', DATE '2027-10-22', 2027, 35.1159461, 135.7717264, '교토 북쪽 산골 마을 구라마에 있는 유키 신사의 예제로 교토 3대 기이한 축제 중 하나. 18시쯤 집집마다 화톳불을 켜고, 20시쯤 횃불을 멘 젊은이들이 산문 앞 돌계단에 모여 불길을 하늘로 세운다.', NULL, NULL, DATE '2026-11-13', NULL);
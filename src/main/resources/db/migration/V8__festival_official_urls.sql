-- V8__festival_official_urls : 공식 사이트 URL 보강 (확인일 2026-11-18)
-- 모든 URL은 웹 검색으로 출처를 확인한 것만 넣음. 확인 못 한 4건은 NULL 유지:
--   よさこい祭り, 西条まつり, 越中八尾 おわら風の盆, 唐津くんち
-- 우선순위: 실행위원회 공식 > 신사·사찰 공식 > 시·관광협회 공식 페이지

-- V3 간사이
UPDATE festivals SET official_url = 'https://osaka-info.jp/spot/sukunahikonajinja/' WHERE name_ja = '神農祭';
UPDATE festivals SET official_url = 'https://www.kasugataisha.or.jp/' WHERE name_ja = '春日若宮おん祭';
UPDATE festivals SET official_url = 'https://www.todaiji.or.jp/' WHERE name_ja = '東大寺修二会（お水取り）';
UPDATE festivals SET official_url = 'https://www.kumanonachitaisha.jp/' WHERE name_ja = '那智の扇祭り（那智の火祭）';
UPDATE festivals SET official_url = 'http://www.yukijinjya.jp/' WHERE name_ja = '鞍馬の火祭';

-- V4 홋카이도·도호쿠
UPDATE festivals SET official_url = 'https://www.snowfes.com/' WHERE name_ja = 'さっぽろ雪まつり';
UPDATE festivals SET official_url = 'https://asahikawa-winterfes.jp/' WHERE name_ja = '旭川冬まつり';
UPDATE festivals SET official_url = 'https://www.yokotekamakura.com/' WHERE name_ja = '横手の雪まつり かまくら';
UPDATE festivals SET official_url = 'https://www.yosakoi-soran.jp/' WHERE name_ja = 'YOSAKOIソーラン祭り';
UPDATE festivals SET official_url = 'http://www.hokkaidojingu.or.jp/' WHERE name_ja = '北海道神宮例祭（札幌まつり）';
UPDATE festivals SET official_url = 'https://www.nebuta.jp/' WHERE name_ja = '青森ねぶた祭';
UPDATE festivals SET official_url = 'https://www.kantou.gr.jp/' WHERE name_ja = '秋田竿燈まつり';
UPDATE festivals SET official_url = 'https://hanagasa.jp/' WHERE name_ja = '山形花笠まつり';
UPDATE festivals SET official_url = 'https://www.sendaitanabata.com/' WHERE name_ja = '仙台七夕まつり';

-- V5 간토·주부
UPDATE festivals SET official_url = 'https://otorisama.or.jp/' WHERE name_ja = '浅草酉の市（二の酉）';
UPDATE festivals SET official_url = 'https://www.chichibu-jinja.or.jp/' WHERE name_ja = '秩父夜祭';
UPDATE festivals SET official_url = 'https://www.hidatakayama.or.jp/' WHERE name_ja = '春の高山祭（山王祭）';
UPDATE festivals SET official_url = 'https://www.sanjasama.jp/' WHERE name_ja = '三社祭';
UPDATE festivals SET official_url = 'http://100mangoku.net/' WHERE name_ja = '金沢百万石まつり';
UPDATE festivals SET official_url = 'https://www.sumidagawa-hanabi.com/' WHERE name_ja = '隅田川花火大会';
UPDATE festivals SET official_url = 'https://nagaokamatsuri.com/' WHERE name_ja = '長岡まつり大花火大会';
UPDATE festivals SET official_url = 'https://tabitabigujo.com/hachiman/gujo-odori/' WHERE name_ja = '郡上おどり 徹夜おどり';
UPDATE festivals SET official_url = 'https://www.city.katori.lg.jp/sightseeing/matsuri/introduction/aki.html' WHERE name_ja = '佐原の大祭 秋祭り';
UPDATE festivals SET official_url = 'https://www.hidatakayama.or.jp/hidatakayama/maturi_autumn/' WHERE name_ja = '秋の高山祭（八幡祭）';
UPDATE festivals SET official_url = 'https://www.kawagoematsuri.jp/' WHERE name_ja = '川越まつり';
UPDATE festivals SET official_url = 'https://www.nagoya-festival.jp/' WHERE name_ja = '名古屋まつり';

-- V6 간사이·주고쿠·시코쿠
UPDATE festivals SET official_url = 'https://izumooyashiro.or.jp/' WHERE name_ja = '出雲大社 神在祭';
UPDATE festivals SET official_url = 'https://www.itsukushimajinja.jp/' WHERE name_ja = '厳島神社 管絃祭';
UPDATE festivals SET official_url = 'https://www.toukae.jp/' WHERE name_ja = 'なら燈花会';
UPDATE festivals SET official_url = 'https://www.awaodori.tokushima.jp/' WHERE name_ja = '阿波おどり';
UPDATE festivals SET official_url = 'https://gozan-okuribi.com/' WHERE name_ja = '京都五山送り火';
UPDATE festivals SET official_url = 'http://niihama.info/taiko/' WHERE name_ja = '新居浜太鼓祭り';

-- V7 규슈·오키나와
UPDATE festivals SET official_url = 'http://www.dazaifutenmangu.or.jp/' WHERE name_ja = '太宰府天満宮 鬼すべ';
UPDATE festivals SET official_url = 'https://www.dontaku.fukunet.or.jp/' WHERE name_ja = '博多どんたく港まつり';
UPDATE festivals SET official_url = 'https://www.naha-navi.or.jp/' WHERE name_ja = '那覇ハーリー';
UPDATE festivals SET official_url = 'https://www.hakatayamakasa.com/' WHERE name_ja = '博多祇園山笠';
UPDATE festivals SET official_url = 'https://www.zentoeisa.com/' WHERE name_ja = '沖縄全島エイサーまつり';
UPDATE festivals SET official_url = 'https://nagasaki-kunchi.com/' WHERE name_ja = '長崎くんち';
UPDATE festivals SET official_url = 'https://www.naha-navi.or.jp/' WHERE name_ja = '那覇大綱挽まつり';
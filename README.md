# YoriMichi (寄り道)

일본 여행하다 보면 "이제 뭐 하지?", "근처에 뭐 먹지?" 하고 지도 앱만 계속 넘기게 되는데, 그 고민을 줄여보려고 만든 웹앱입니다.
寄り道(요리미치)는 일본어로 "가는 길에 잠깐 들르기"라는 뜻이에요.

## 주요 기능

- **주변 축제** - 현재 위치 근처에서 열리는 일본 축제를 보여줌 (전국 43개, 공식 사이트 링크 포함)
- **맛집 뽑기** - 근처 가게 중 하나를 랜덤으로 골라줌
- **AI 리뷰 요약** - 가게 리뷰를 장점 / 단점 / 추천 메뉴로 한국어 요약
- **PWA** - 홈 화면에 추가하면 앱처럼 실행 가능
- 회원가입 / 로그인 (JWT)

## 기술 스택

| 구분 | 사용 |
|---|---|
| Backend | Spring Boot 4.1, Java 17, Spring Data JPA |
| DB | Oracle Free (Docker), Flyway |
| 인증 | JWT, BCrypt |
| 외부 API | Google Places API (New), Gemini API |
| Frontend | HTML, CSS, JavaScript (프레임워크 없이) |
| 기타 | Swagger(springdoc), Cloudflare Tunnel |

## 실행 방법

### 1. DB 실행

```bash
docker compose up -d
```

로그에 `DATABASE IS READY TO USE!`가 뜰 때까지 기다린 뒤 서버를 켜야 합니다. (안 그러면 ORA-12514 남)

### 2. 환경변수 설정

API 키는 코드에 없어서 직접 넣어줘야 합니다.

| 이름 | 설명 | 필수 |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | Google Places API 키 | O |
| `GEMINI_API_KEY` | Gemini API 키 | O |
| `GEMINI_MODEL` | 기본 모델 (기본값 `gemini-3.5-flash-lite`) | |
| `GEMINI_FALLBACK_MODELS` | 실패 시 넘어갈 모델들, 쉼표로 구분 | |
| `JWT_SECRET` | JWT 서명 키 | 배포 시 O |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | DB 접속 정보 | 배포 시 O |
| `CORS_ORIGINS` | 허용할 도메인 | |
| `PLACES_NEARBY_LIMIT` / `PLACES_DETAIL_LIMIT` | 하루 Places 호출 제한 (기본 200) | |

> DB 비밀번호, JWT 키는 로컬 개발용 기본값이 들어가 있음. 배포할 때는 반드시 환경변수로 덮어쓸 것

### 3. 서버 실행

```bash
./gradlew bootRun
```

- 웹: http://localhost:8080
- API 문서: http://localhost:8080/swagger-ui/index.html

### 테스트용 위치 고정

한국에서 테스트하면 근처에 일본 축제가 없으니까 URL 파라미터로 위치를 고정할 수 있게 해뒀습니다.

```
/?city=dotonbori              테스트 도시로 고정
/?devLat=34.6687&devLng=135.5013   좌표로 고정
/?devLat=off                  고정 해제
```

## 트러블슈팅

**구글 리뷰 원문이 안 받아짐**
Places API에서 `reviews` 필드를 요청해도 계속 빈 값이 옴. 필드 마스크를 `*`로 바꿔도, 미국 가게로 테스트해도 똑같았음. 대신 `reviewSummary`(구글이 만든 리뷰 요약)는 내려와서, 이걸 받아서 Gemini로 장단점 / 메뉴 형태로 다시 정리하는 방식으로 바꿈. 원문이 왜 막히는지는 아직 확인 중.

**Gemini가 자주 실패함 (503, 응답 지연)**
무료 모델이라 트래픽 몰리면 503이 뜨거나 응답이 10초 넘게 걸림.
- 타임아웃 8초
- 503/429면 1.5초 쉬고 한 번 더
- 그래도 안 되면 다른 모델로 넘어가게 함 (`GEMINI_FALLBACK_MODELS`)

**특정 가게만 계속 요약 실패**
응답이 안 끝나고 타임아웃 나는 경우였음. `maxOutputTokens`로 길이를 제한하고, 실패한 결과는 10분 동안 기억해서 같은 요청을 반복하지 않게 함.
근데 이러니까 "다시 시도" 버튼도 막혀버려서 `retry=true` 파라미터를 따로 만들고 20초 쿨다운을 둠.

**같은 가게를 두 번 조회함**
상세 정보랑 요약이 각각 Places를 호출하고 있었음. 요약할 때는 캐시된 상세 결과를 재사용하도록 바꿔서 호출 수를 줄임.

**한국에서 접속하면 "근처에 축제 없음"**
일본인지 판별하는 범위를 위도/경도 사각형으로만 잡았더니 한반도가 통째로 들어가 있었음. 한반도, 제주, 울릉도, 연해주 쪽을 빼도록 수정 (쓰시마는 일본으로 남김).

**아이폰에서 페이지 이동할 때마다 위치 권한 팝업**
사파리, 카톡 인앱 브라우저는 페이지 열 때마다 다시 물어봄. 받은 위치를 15분 동안 sessionStorage에 저장해서 재사용하도록 함.

**아이폰 PWA에서 헤더가 상태바랑 겹침**
`viewport-fit=cover` + `safe-area-inset-top` 패딩으로 해결.

## 기타

- 구글에서 받은 가게 정보는 DB에 저장하지 않고 메모리 캐시만 사용 (구글 약관 때문)
- 비용 때문에 서버에서 Places 하루 호출 수 제한을 걸어둠
- 축제 날짜, URL은 직접 확인된 것만 넣었고 확인 안 된 건 비워둠

## 앞으로 할 것

- [ ] 서버 배포
- [ ] 리뷰 원문 안 오는 원인 확인
- [ ] 운명의 갈림길 - 왼쪽 / 오른쪽 길 고르면 그 방향 가게 추천
- [ ] 우연한 하루 - 하루 코스 자동 생성
- [ ] 저장 기능
- [ ] 축제 날짜 자동 업데이트
- [ ] 디자인 반영
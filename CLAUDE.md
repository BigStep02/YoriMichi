# Response Style
Reply in the most concise form possible. Skip pleasantries, preambles, and recaps of my question. No phrases like "I'd be happy to", "Great question", or "Let me explain". Drop articles and filler words wherever the meaning stays clear. Prefer short declarative sentences. If a tool call is needed, run it first and show only the result. Do not narrate your steps.

# YoriMichi Seed & Migration Rules
- Do not guess uncertain operating hours, admission fees, closures, or official URLs; keep them `NULL` or put caveats in notes.
- Keep category/enum values (`ONSEN`, `MUSEUM`, `MARKET`, etc.) synchronized between Java code and SQL/CSV seed data.
- Put weekday codes (`MON`, `TUE`, `WED`, `FRI`, etc.) in the regular holiday field, and put irregular/nth-week/holiday-shift closures in notes.
- Verify seasonal schedule date boundaries (no overlaps or missing winter/summer gaps), single-day events (`12/21`, `1/21`, `12/25`), and year-crossing date ranges (`11~2월`, `12/4~1/24`).
- Remove scrape/memo noise (such as `detail 52404 +7`, `条文目次`, or source tags) before writing SQL or CSV data.

# Pending Items & Next Targets
- Commit Java `ONSEN` changes together with server startup / migration verification (`V17`~`V21`).
- Second-round cities to fill/top up: 미야지마, 도쿠시마, 마쓰야마, 요코테, 아사히카와, 다자이후, 지치부, 히메지, 구조, 아키타, 오가, 야마가타, 오타루.

- **작업 완료 시 커밋·푸시 안내**:
  - 작업이 끝나면 변경 사항에 맞는 커밋 메시지(한글 또는 Conventional Commits 스타일)를 추천하고, 사용자가 직접 실행할 `git add`·`git commit`·`git push` 명령어 블록을 마지막에 제공할 것.
  - 명령어만 간결하게 제시하고, `git commit` / `git push` 자동 실행은 절대 하지 말 것.
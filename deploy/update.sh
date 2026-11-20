#!/usr/bin/env bash
# 서버에서 실행: deploy 브랜치에 새 커밋이 있으면 배포 → 응답 점검 → 실패하면 직전 버전으로 복구
#   ./deploy/update.sh          새 커밋이 있을 때만 배포 (자동 배포 타이머가 1분마다 실행)
#   ./deploy/update.sh --force  지금 커밋으로 강제 재배포
set -euo pipefail
cd "$(dirname "$0")/.."

exec 9>/tmp/yorimichi-deploy.lock
flock -n 9 || exit 0   # 이미 배포 중이면 건너뜀

BRANCH="${DEPLOY_BRANCH:-deploy}"
C="docker compose -f compose.prod.yaml"

git fetch -q origin "$BRANCH" 2>/dev/null || { echo "origin/$BRANCH 없음 (아직 main 에서 CI 통과한 적 없음)"; exit 0; }
NEW="$(git rev-parse "origin/$BRANCH")"
CUR="$(git rev-parse HEAD)"
if [ "$NEW" = "$CUR" ] && [ "${1:-}" != "--force" ]; then exit 0; fi

echo "[$(date '+%F %T')] 배포 시작 ${CUR:0:7} → ${NEW:0:7}"

# 지금 돌고 있는 버전을 백업해 둠 (복구용)
if docker image inspect yorimichi-app:latest >/dev/null 2>&1; then
  docker tag yorimichi-app:latest yorimichi-app:previous
fi

git checkout -q -B deploy "$NEW"
$C build app
$C up -d

# 새 버전이 응답하는지 점검 (최대 약 3분)
for i in $(seq 1 36); do
  if $C exec -T caddy wget -q -O /dev/null http://app:8080/ 2>/dev/null; then
    echo "[$(date '+%F %T')] 배포 성공 ${NEW:0:7}"
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 5
done

echo "[$(date '+%F %T')] 새 버전이 응답 안 함 → 직전 버전(${CUR:0:7})으로 복구"
if docker image inspect yorimichi-app:previous >/dev/null 2>&1; then
  docker tag yorimichi-app:previous yorimichi-app:latest
fi
git checkout -q -B deploy "$CUR"
$C up -d --no-build app
exit 1

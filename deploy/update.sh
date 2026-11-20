#!/usr/bin/env bash
# 서버에서 최신 코드 받아서 다시 배포
set -euo pipefail
cd ~/yorimichi
git pull --ff-only
docker compose -f compose.prod.yaml up -d --build
docker image prune -f >/dev/null
docker compose -f compose.prod.yaml ps

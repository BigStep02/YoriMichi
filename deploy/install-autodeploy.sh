#!/usr/bin/env bash
# 서버에서 한 번만 실행: 1분마다 deploy/update.sh 를 돌리는 자동 배포 타이머 설치
#   끄기(발표 주간 등): sudo systemctl stop yorimichi-deploy.timer
#   다시 켜기:          sudo systemctl start yorimichi-deploy.timer
#   기록 보기:          journalctl -u yorimichi-deploy -n 50 --no-pager
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
USER_NAME="$(whoami)"

sudo tee /etc/systemd/system/yorimichi-deploy.service >/dev/null <<UNIT
[Unit]
Description=YoriMichi auto deploy (deploy 브랜치 확인)
After=docker.service network-online.target

[Service]
Type=oneshot
User=${USER_NAME}
WorkingDirectory=${DIR}
ExecStart=${DIR}/deploy/update.sh
UNIT

sudo tee /etc/systemd/system/yorimichi-deploy.timer >/dev/null <<UNIT
[Unit]
Description=YoriMichi auto deploy 1분마다

[Timer]
OnBootSec=2min
OnUnitActiveSec=1min
Unit=yorimichi-deploy.service

[Install]
WantedBy=timers.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now yorimichi-deploy.timer
systemctl list-timers yorimichi-deploy.timer --no-pager

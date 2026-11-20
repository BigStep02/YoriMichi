#!/usr/bin/env bash
# EC2 서버에서 처음 한 번만 실행: Docker 설치, 스왑, GitHub 배포 키 생성
set -euo pipefail

echo "== 1. Docker 설치 =="
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

echo "== 2. 스왑 2GB (빌드할 때 메모리 부족 방지) =="
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "== 3. GitHub 배포 키 (읽기 전용) =="
if [ ! -f ~/.ssh/github_deploy ]; then
  ssh-keygen -t ed25519 -N "" -f ~/.ssh/github_deploy -C "yorimichi-ec2"
  cat >> ~/.ssh/config <<CFG
Host github.com
  IdentityFile ~/.ssh/github_deploy
  StrictHostKeyChecking accept-new
CFG
fi
echo
echo "아래 한 줄을 GitHub 저장소 → Settings → Deploy keys → Add deploy key 에 붙여넣기 (Allow write access 는 체크하지 말 것)"
echo "----------------------------------------------------------------"
cat ~/.ssh/github_deploy.pub
echo "----------------------------------------------------------------"
echo "끝나면 로그아웃했다가 다시 접속하세요 (docker 권한 적용)."

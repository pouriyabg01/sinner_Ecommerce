#!/usr/bin/env bash
# آماده‌سازی یک سرور اوبونتوی تازه برای اجرای این پروژه.
# روی خود سرور و با کاربر ریشه اجرا شود:
#   bash server-setup.sh <نام-کاربر>
set -euo pipefail

USERNAME="${1:-sinner}"

if [ "$(id -u)" -ne 0 ]; then
  echo "این اسکریپت باید با کاربر ریشه اجرا شود" >&2
  exit 1
fi

echo "== به‌روزرسانی سیستم =="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg ufw rsync

echo "== ساخت کاربر $USERNAME =="
if ! id "$USERNAME" >/dev/null 2>&1; then
  adduser --disabled-password --gecos '' "$USERNAME"
fi
usermod -aG sudo "$USERNAME"
# کلید ورودِ همین کاربر ریشه برای کاربر جدید هم کپی می‌شود
if [ -f /root/.ssh/authorized_keys ]; then
  install -d -m 700 -o "$USERNAME" -g "$USERNAME" "/home/$USERNAME/.ssh"
  install -m 600 -o "$USERNAME" -g "$USERNAME" /root/.ssh/authorized_keys "/home/$USERNAME/.ssh/authorized_keys"
fi

echo "== فضای مبادله (۲ گیگابایت) =="
# ساخت تصویر بخش جلویی در اوج نزدیک دو گیگابایت حافظه می‌خواهد.
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "== دیوار آتش =="
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "== نصب داکر =="
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
usermod -aG docker "$USERNAME"
systemctl enable --now docker

echo
echo "تمام شد. حالا با کاربر $USERNAME وارد شو و پروژه را بالا بفرست."
docker --version
docker compose version

#!/bin/bash
# EC2 user-data script. Boots a fresh AL2023 instance ready for Comp AI self-host.
# - installs docker + docker-compose v2 + git
# - allocates 4 GB swap so Bun's monorepo build doesn't OOM on small instances
set -eux

dnf update -y
dnf install -y docker git
systemctl enable --now docker
usermod -aG docker ec2-user

DOCKER_CONFIG=${DOCKER_CONFIG:-/usr/local/lib/docker}
mkdir -p $DOCKER_CONFIG/cli-plugins
ARCH=$(uname -m)
case "$ARCH" in
  aarch64) COMPOSE_BIN=docker-compose-linux-aarch64 ;;
  x86_64)  COMPOSE_BIN=docker-compose-linux-x86_64 ;;
  *) echo "unsupported arch $ARCH"; exit 1 ;;
esac
curl -sSL "https://github.com/docker/compose/releases/download/v2.31.0/${COMPOSE_BIN}" \
  -o $DOCKER_CONFIG/cli-plugins/docker-compose
chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose

# Workspace
mkdir -p /opt/compliance
chown ec2-user:ec2-user /opt/compliance

# 4 GB swap so the Bun + Next.js monorepo build doesn't OOM on t4g.medium
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=4096 status=none
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

echo "userdata-done $(date -Is)" > /var/log/userdata.done

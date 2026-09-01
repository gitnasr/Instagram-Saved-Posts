#!/usr/bin/env bash
# =================================================================
# Instagram Saved Posts Tracker - 1-Command Installer
# GitHub: https://github.com/gitnasr/Instagram-Saved-Posts
# =================================================================

set -e

# Color codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Print Banner
echo -e "${CYAN}${BOLD}"
cat << "EOF"
  ___           _          ____                  
 |_ _|_ __  ___| |_ __ _  / ___|  __ ___   _____ 
  | || '_ \/ __| __/ _` | \___ \ / _` \ \ / / _ \
  | || | | \__ \ || (_| |  ___) | (_| |\ V /  __/
 |___|_| |_|___/\__\__,_| |____/ \__,_| \_/ \___|
                                                 
  📸 Instagram Saved Posts Tracker - Self-Hosted
EOF
echo -e "${NC}"

echo -e "${CYAN}==>${NC} Starting 1-command installation...\n"

# Check Docker installation
if ! command -v docker >/dev/null 2>&1; then
    echo -e "${RED}[ERROR] Docker is not installed.${NC}"
    echo -e "Please install Docker first: https://docs.docker.com/engine/install/"
    exit 1
fi

# Check Docker Compose (v2 plugin or standalone)
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}[ERROR] Docker Compose is not installed.${NC}"
    echo -e "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Target installation directory
INSTALL_DIR="${HOME}/instagram-saved-posts"
if [ -n "$1" ]; then
    INSTALL_DIR="$1"
fi

echo -e "${CYAN}==>${NC} Installing into directory: ${BOLD}${INSTALL_DIR}${NC}"
mkdir -p "${INSTALL_DIR}"
cd "${INSTALL_DIR}"

# Download production docker-compose.yml
echo -e "${CYAN}==>${NC} Downloading Docker Compose configuration..."
COMPOSE_URL="https://raw.githubusercontent.com/gitnasr/Instagram-Saved-Posts/master/docker-compose.yml"
curl -fsSL "${COMPOSE_URL}" -o docker-compose.yml

# Download .env.example
ENV_URL="https://raw.githubusercontent.com/gitnasr/Instagram-Saved-Posts/master/.env.example"
curl -fsSL "${ENV_URL}" -o .env.example

# If .env does not exist, copy from .env.example
if [ ! -f .env ]; then
    cp .env.example .env
fi

# Pull and launch containers
echo -e "${CYAN}==>${NC} Pulling latest container images and starting services..."
${DOCKER_COMPOSE} pull
${DOCKER_COMPOSE} up -d

# Completion Banner
HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
PORT="3000"

echo -e "\n${GREEN}${BOLD}======================================================${NC}"
echo -e "${GREEN}${BOLD} 🎉 InstaSave Tracker is successfully installed!${NC}"
echo -e "${GREEN}${BOLD}======================================================${NC}\n"
echo -e "Access your instance at:"
echo -e "  👉 Local:   ${CYAN}${BOLD}http://localhost:${PORT}${NC}"
if [ "$HOST_IP" != "localhost" ]; then
echo -e "  👉 Network: ${CYAN}${BOLD}http://${HOST_IP}:${PORT}${NC}"
fi
echo -e "\nNext steps:"
echo -e "  1. Open ${CYAN}http://localhost:${PORT}${NC} in your browser."
echo -e "  2. Complete the quick 60-second onboarding wizard."
echo -e "  3. Start archiving and exploring your saved posts!\n"
echo -e "To manage your instance:"
echo -e "  ${YELLOW}cd ${INSTALL_DIR}${NC}"
echo -e "  ${YELLOW}${DOCKER_COMPOSE} logs -f${NC}     # View live logs"
echo -e "  ${YELLOW}${DOCKER_COMPOSE} restart${NC}     # Restart services"
echo -e "  ${YELLOW}${DOCKER_COMPOSE} down${NC}        # Stop services\n"

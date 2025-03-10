#!/bin/bash

# Script para gerenciar o servidor mock AbacatePay
# Autor: Claude

# Cores para terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}   AbacatePay Mock Server      ${NC}"
echo -e "${BLUE}================================${NC}"

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Erro: Docker não encontrado.${NC}"
    echo "Por favor, instale o Docker antes de usar este script."
    exit 1
fi

# Verificar se Docker Compose está disponível
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo -e "${RED}Erro: Docker Compose não encontrado.${NC}"
    echo "Por favor, instale o Docker Compose antes de usar este script."
    exit 1
fi

echo -e "Usando comando: ${GREEN}${COMPOSE_CMD}${NC}\n"

# Função para imprimir os URLs
function print_urls() {
    echo -e "\n${GREEN}Serviços disponíveis:${NC}"
    echo -e "▶ API AbacatePay:        ${BLUE}http://localhost:3000${NC}"
    echo -e "▶ WebSocket AbacatePay:  ${BLUE}ws://localhost:3000/ws${NC}"
    echo -e "▶ Receptor Notificações: ${BLUE}http://localhost:8080${NC}"
    echo -e "\n${GREEN}Exemplos de uso:${NC}"
    echo -e "▶ Enviar notificação:    ${YELLOW}curl -X POST http://localhost:3000/admin/send-notification -H \"Content-Type: application/json\" -d '{\"type\":\"payment\"}'${NC}"
    echo -e "▶ Simular CLI:          ${YELLOW}curl -X POST http://localhost:3000/cli-forward -H \"Content-Type: application/json\" -d '{\"type\":\"payment\"}'${NC}"
    echo -e "▶ Ver estatísticas:      ${YELLOW}curl http://localhost:3000/admin/stats${NC}"
}

# Funções principais
case "$1" in
    build)
        echo -e "${GREEN}Construindo imagens Docker...${NC}"
        $COMPOSE_CMD build
        ;;
    start)
        echo -e "${GREEN}Iniciando serviços...${NC}"
        $COMPOSE_CMD up -d
        print_urls
        ;;
    stop)
        echo -e "${GREEN}Parando serviços...${NC}"
        $COMPOSE_CMD down
        ;;
    restart)
        echo -e "${GREEN}Reiniciando serviços...${NC}"
        $COMPOSE_CMD restart
        print_urls
        ;;
    logs-api)
        echo -e "${GREEN}Mostrando logs do servidor API...${NC}"
        $COMPOSE_CMD logs -f api
        ;;
    logs-receiver)
        echo -e "${GREEN}Mostrando logs do servidor receptor...${NC}"
        $COMPOSE_CMD logs -f receiver
        ;;
    logs)
        echo -e "${GREEN}Mostrando logs de todos os serviços...${NC}"
        $COMPOSE_CMD logs -f
        ;;
    status)
        echo -e "${GREEN}Status dos serviços:${NC}"
        $COMPOSE_CMD ps
        ;;
    *)
        echo -e "${YELLOW}Uso: $0 {build|start|stop|restart|logs|logs-api|logs-receiver|status}${NC}"
        echo ""
        echo "  build        - Constrói as imagens Docker"
        echo "  start        - Inicia os serviços"
        echo "  stop         - Para os serviços"
        echo "  restart      - Reinicia os serviços"
        echo "  logs         - Mostra logs de todos os serviços"
        echo "  logs-api     - Mostra logs do servidor API"
        echo "  logs-receiver - Mostra logs do servidor receptor"
        echo "  status       - Mostra o status dos serviços"
        exit 1
esac
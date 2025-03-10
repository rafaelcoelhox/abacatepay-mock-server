# AbacatePay Mock Server

Esse servidor foi densenvolvido completamente por INTELIGENCIA ARTIFICIAL. Entao nao leve em Consideração a Qualidade do CODIGO!



## Estrutura do Projeto

```
abacatepay-mock/
├── docker-compose.yml     # Configuração dos contêineres
├── README.md              # Esta documentação
├── api/                   # Servidor da API AbacatePay
│   ├── Dockerfile         # Imagem Docker para o servidor API
│   ├── package.json       # Dependências Node.js
│   ├── server.js          # Código do servidor API
│   └── db.json            # Banco de dados para o JSON Server
├── receiver/              # Servidor receptor de notificações
│   ├── Dockerfile         # Imagem Docker para o servidor receptor
│   ├── package.json       # Dependências Node.js
│   └── server.js          # Código do servidor receptor
└── run.sh                 # Script para gerenciar o ambiente
```

## Funcionalidades

- **Servidor API** (porta 3000)
  - Simulação de login de dispositivo (`/device-login`)
  - Simulação de polling para token (`/token`)
  - WebSocket para envio de notificações (`ws://localhost:3000/ws`)
  - Endpoint para enviar notificações de teste (`/admin/send-notification`)

- **Servidor Receptor** (porta 8080)
  - Recebe notificações encaminhadas pela CLI
  - Interface web para visualizar as notificações recebidas
  - Logs detalhados de cabeçalhos e corpos das requisições

## Como Usar

### 1. Iniciando o ambiente

```bash
# Torne o script executável
chmod +x run.sh

# Inicie os serviços
./run.sh start
```

### 2. Testando o fluxo completo

```bash
# Enviar uma notificação de teste pelo servidor API
curl -X POST http://localhost:3000/admin/send-notification \
  -H "Content-Type: application/json" \
  -d '{"type":"payment", "data": {"amount": 1500}}'

# Simular o encaminhamento que a CLI faria
curl -X POST http://localhost:3000/cli-forward \
  -H "Content-Type: application/json" \
  -d '{"type":"payment", "id":"test-123", "data": {"amount": 2000}}'
```

### 3. Acessando as interfaces

- **API AbacatePay**: [http://localhost:3000/admin/stats](http://localhost:3000/admin/stats)
- **Receptor de Notificações**: [http://localhost:8080](http://localhost:8080)

### 4. Configurando a CLI AbacatePay

Configure sua CLI para usar o servidor mock:

```toml
# config.toml
[endpoints]
APIURL = "http://localhost:3000"
WSURL = "ws://localhost:3000/ws"

[auth]
TokenFile = "~/.abacatepay/token.json"

[polling]
Interval = "2s"
Timeout = "30s"

LogLevel = "DEBUG"
```

Execute o comando para escutar e encaminhar notificações:

```bash
abacatepay listen --forward localhost:8080
```

### 5. Visualizando logs

```bash
# Logs do servidor API
./run.sh logs-api

# Logs do servidor receptor
./run.sh logs-receiver
```

### 6. Parando o ambiente

```bash
./run.sh stop
```

## Diagrama do Sistema

```
┌───────────────────┐        WebSocket         ┌─────────────────┐
│                   │◄───────────────────────►│                 │
│   AbacatePay CLI  │                          │   API Server    │
│                   │───────────────────────►│    (porta 3000)  │
└───────────────────┘        REST API          └────────┬────────┘
         │                                              │
         │                                              │
         │                                              │
         │           ┌─────────────────┐                │
         └───────────►                 │◄───────────────┘
                      │ Receiver Server │    Forward
                      │   (porta 8080)  │    Notifications
                      └─────────────────┘
```
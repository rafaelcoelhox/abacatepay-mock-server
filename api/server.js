/**
 * Servidor Mock da API AbacatePay
 * 
 * Simula:
 * - Login por dispositivo
 * - Obtenção de token 
 * - WebSocket para notificações
 * - Encaminhamento para servidor local
 */

const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

// Configurações
const PORT = 3000;
const RECEIVER_URL = process.env.RECEIVER_URL || 'http://localhost:8080';
const DB_FILE = path.join(__dirname, 'db.json');

// Estatísticas
let stats = {
    startTime: new Date(),
    notificationsSent: 0,
    forwardedRequests: 0,
    wsConnections: 0
};

// Criar app Express
const app = express();
app.use(bodyParser.json());

// Middleware de logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ===== Dispositivo e Autenticação =====

// Endpoint de login de dispositivo
app.post('/device-login', (req, res) => {
    const deviceCode = `device_${Date.now()}`;

    const response = {
        device_code: deviceCode,
        user_code: `USER-${deviceCode.substring(7, 13)}`,
        verification_uri: "http://localhost:3000/verify",
        expires_in: 1800,
        interval: 5
    };

    console.log('Login de dispositivo iniciado:', response);
    res.json(response);
});

// Endpoint de token (com simulação de polling)
app.post('/token', (req, res) => {
    const { grant_type, device_code } = req.body;

    // Verificar grant_type
    if (grant_type !== 'urn:ietf:params:oauth:grant-type:device_code') {
        return res.status(400).json({
            error: 'unsupported_grant_type',
            error_description: 'Tipo de concessão não suportado'
        });
    }

    // Usar contador global para simular autorização pendente
    global.tokenCounter = (global.tokenCounter || 0) + 1;

    // Nas primeiras chamadas, retornar pendente
    if (global.tokenCounter < 3) {
        console.log(`Token pendente (tentativa ${global.tokenCounter}/3)`);
        return res.status(400).json({
            error: 'authorization_pending',
            error_description: 'Autorização pendente'
        });
    }

    // Na terceira chamada, autorizar
    console.log('Token autorizado para', device_code || 'device_default');
    res.json({
        access_token: `mock-access-token-${device_code || 'default'}`,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: `mock-refresh-token-${device_code || 'default'}`,
        scope: 'read write'
    });
});

// Página de verificação
app.get('/verify', (req, res) => {
    const code = req.query.code || 'unknown';

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>AbacatePay - Verificação de Dispositivo</title>
      <style>
        body { font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { color: #2e7d32; }
        .box { border: 1px solid #ccc; padding: 20px; border-radius: 5px; }
        .code { font-size: 24px; font-weight: bold; text-align: center; margin: 20px; }
        button { background: #2e7d32; color: white; border: none; padding: 10px 20px; 
                border-radius: 5px; cursor: pointer; }
      </style>
    </head>
    <body>
      <h1>Verificação de Dispositivo</h1>
      <div class="box">
        <p>Um dispositivo está tentando se conectar à sua conta AbacatePay.</p>
        <p>Código do dispositivo:</p>
        <div class="code">${code}</div>
        <p>Se você reconhece esta solicitação, clique em Autorizar.</p>
        <button onclick="authorize()">Autorizar</button>
      </div>
      
      <script>
        function authorize() {
          // Na próxima chamada ao endpoint /token, o token será autorizado
          global.tokenCounter = 999;
          alert('Dispositivo autorizado com sucesso!');
        }
      </script>
    </body>
    </html>
  `);
});

// ===== Notificações e WebSocket =====

// Endpoint para enviar notificações de teste
app.post('/admin/send-notification', (req, res) => {
    const { type = 'payment' } = req.body;

    const notification = {
        id: `notif_${Date.now()}`,
        type,
        timestamp: new Date(),
        data: {
            amount: 1000,
            currency: 'BRL',
            description: 'Notificação de teste',
            status: 'approved',
            ...(req.body.data || {})
        }
    };

    // Enviar notificação para conexões WebSocket
    let sent = 0;
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(notification));
            sent++;
        }
    });

    stats.notificationsSent += sent;

    console.log(`Notificação enviada para ${sent} conexões:`, {
        type: notification.type,
        id: notification.id,
        timestamp: notification.timestamp
    });

    res.json({
        success: true,
        sent_to: sent,
        notification
    });
});

// Endpoint para simular o encaminhamento que a CLI faria
app.post('/cli-forward', (req, res) => {
    const notification = req.body;
    stats.forwardedRequests++;

    console.log('Encaminhando notificação para', RECEIVER_URL);

    // Enviar para o receptor
    axios.post(RECEIVER_URL, notification)
        .then(response => {
            console.log(`Resposta do receptor: ${response.status}`);
        })
        .catch(error => {
            console.error('Erro ao encaminhar:', error.message);
        });

    // Responder imediatamente
    res.json({
        success: true,
        message: `Notificação encaminhada para ${RECEIVER_URL}`,
        notification
    });
});

// ===== Utilitários =====

// Endpoint de estatísticas
app.get('/admin/stats', (req, res) => {
    res.json({
        started_at: stats.startTime,
        uptime_seconds: Math.floor((Date.now() - stats.startTime) / 1000),
        ws_connections: stats.wsConnections,
        notifications_sent: stats.notificationsSent,
        forwarded_requests: stats.forwardedRequests,
        receiver_url: RECEIVER_URL
    });
});

// ===== Servidor HTTP e WebSocket =====

// Criar servidor HTTP
const server = http.createServer(app);

// Criar servidor WebSocket
const wss = new WebSocket.Server({ server });

// Gerenciar conexões WebSocket
wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    // Verificar token
    if (!token || !token.startsWith('mock-access-token')) {
        console.log('WebSocket: Conexão rejeitada - Token inválido');
        ws.close(1008, 'Token inválido');
        return;
    }

    console.log('WebSocket: Nova conexão com token:', token);
    stats.wsConnections++;

    // Enviar mensagem de conexão estabelecida
    ws.send(JSON.stringify({
        id: `conn_${Date.now()}`,
        type: 'connection_established',
        timestamp: new Date(),
        data: {
            message: 'Conexão estabelecida com sucesso'
        }
    }));

    // Desconexão
    ws.on('close', () => {
        console.log('WebSocket: Conexão fechada');
        stats.wsConnections--;
    });

    // Mensagens recebidas
    ws.on('message', (message) => {
        console.log('WebSocket: Mensagem recebida:', message.toString());
    });
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`\n=== Servidor API AbacatePay Mock ===`);
    console.log(`Rodando em: http://localhost:${PORT}`);
    console.log(`WebSocket em: ws://localhost:${PORT}/ws`);
    console.log(`Encaminhando para: ${RECEIVER_URL}`);
    console.log(`Pressione Ctrl+C para encerrar\n`);
});
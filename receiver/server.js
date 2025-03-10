/**
 * Servidor Receptor de Notificações AbacatePay
 * 
 * Recebe notificações encaminhadas pela CLI e
 * fornece uma interface web para visualizá-las.
 */

const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');

// Configurações
const PORT = process.env.PORT || 8080;

// Histórico de notificações
const notificationHistory = [];
const MAX_HISTORY_SIZE = 20;

// Criar app Express
const app = express();
app.use(bodyParser.json());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Receber notificações (em qualquer path)
app.post('*', (req, res) => {
  const notification = req.body;

  // Registrar notificação
  const entry = {
    timestamp: new Date(),
    path: req.path,
    method: req.method,
    headers: req.headers,
    body: notification
  };

  // Adicionar ao histórico (mais recente primeiro)
  notificationHistory.unshift(entry);

  // Limitar tamanho do histórico
  if (notificationHistory.length > MAX_HISTORY_SIZE) {
    notificationHistory.length = MAX_HISTORY_SIZE;
  }

  // Log no console
  console.log('Notificação recebida:');
  console.log('- Path:', req.path);
  console.log('- Tipo:', notification.type || 'desconhecido');
  console.log('- ID:', notification.id || 'sem id');
  console.log('- Dados:', JSON.stringify(notification));

  // Responder com sucesso
  res.status(200).json({
    success: true,
    message: 'Notificação recebida com sucesso',
    timestamp: entry.timestamp
  });
});

// Página principal com histórico de notificações
app.get('/', (req, res) => {
  // Gerar HTML para o histórico
  let historyHtml = '';

  if (notificationHistory.length === 0) {
    historyHtml = '<p class="empty">Nenhuma notificação recebida ainda.</p>';
  } else {
    historyHtml = notificationHistory.map((entry, index) => {
      const notification = entry.body;
      const timeStr = entry.timestamp.toLocaleString();
      const typeStr = notification.type || 'desconhecido';
      const idStr = notification.id || 'sem id';

      return `
        <div class="notification">
          <div class="notification-header">
            <span class="number">#${index + 1}</span>
            <span class="time">${timeStr}</span>
            <span class="type">Tipo: ${typeStr}</span>
            <span class="id">ID: ${idStr}</span>
            <span class="path">Path: ${entry.path}</span>
          </div>
          <div class="notification-body">
            <div class="tab-container">
              <div class="tabs">
                <button class="tab-button active" onclick="openTab(event, 'payload-${index}')">Payload</button>
                <button class="tab-button" onclick="openTab(event, 'headers-${index}')">Headers</button>
              </div>
              <div id="payload-${index}" class="tab-content active">
                <pre>${JSON.stringify(notification, null, 2)}</pre>
              </div>
              <div id="headers-${index}" class="tab-content">
                <pre>${JSON.stringify(entry.headers, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Página HTML completa
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Receptor de Notificações AbacatePay</title>
      <style>
        :root {
          --primary: #2e7d32;
          --secondary: #e8f5e9;
          --gray: #f5f5f5;
          --dark-gray: #333;
          --border: #ddd;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.6;
          color: var(--dark-gray);
        }
        
        h1 {
          color: var(--primary);
          border-bottom: 2px solid var(--primary);
          padding-bottom: 10px;
        }
        
        .counter {
          font-size: 24px;
          font-weight: bold;
          color: var(--primary);
        }
        
        .notification {
          margin-bottom: 20px;
          border: 1px solid var(--border);
          border-radius: 5px;
          overflow: hidden;
        }
        
        .notification-header {
          background-color: var(--gray);
          padding: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          font-size: 14px;
        }
        
        .notification-body {
          padding: 0;
        }
        
        .number {
          font-weight: bold;
          color: var(--primary);
        }
        
        .time {
          color: #666;
        }
        
        .type, .id, .path {
          background-color: var(--secondary);
          padding: 2px 8px;
          border-radius: 4px;
        }
        
        .tab-container {
          width: 100%;
        }
        
        .tabs {
          display: flex;
          background-color: var(--gray);
          border-bottom: 1px solid var(--border);
        }
        
        .tab-button {
          background-color: inherit;
          border: none;
          outline: none;
          cursor: pointer;
          padding: 10px 20px;
          font-size: 14px;
        }
        
        .tab-button:hover {
          background-color: #ddd;
        }
        
        .tab-button.active {
          background-color: white;
          border-bottom: 2px solid var(--primary);
        }
        
        .tab-content {
          display: none;
          padding: 15px;
        }
        
        .tab-content.active {
          display: block;
        }
        
        pre {
          background-color: #f8f8f8;
          padding: 15px;
          overflow-x: auto;
          margin: 0;
          border-radius: 4px;
        }
        
        .auto-refresh {
          margin: 20px 0;
          padding: 15px;
          background-color: var(--gray);
          border-radius: 5px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        button {
          background-color: var(--primary);
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        button:hover {
          opacity: 0.9;
        }
        
        .refresh-note {
          color: #777;
          font-size: 14px;
          margin-top: 30px;
          font-style: italic;
        }
        
        .empty {
          padding: 20px;
          text-align: center;
          color: #666;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <h1>Receptor de Notificações AbacatePay</h1>
      
      <p>Este servidor recebe notificações encaminhadas pela CLI AbacatePay.</p>
      <p>Notificações recebidas: <span class="counter">${notificationHistory.length}</span></p>
      
      <div class="auto-refresh">
        <label for="refreshInterval">Atualização automática:</label>
        <select id="refreshInterval">
          <option value="5">5 segundos</option>
          <option value="10" selected>10 segundos</option>
          <option value="30">30 segundos</option>
          <option value="60">1 minuto</option>
        </select>
        <button onclick="startAutoRefresh()">Iniciar</button>
        <button onclick="stopAutoRefresh()">Parar</button>
        <span id="autoRefreshStatus">Desativado</span>
      </div>
      
      <h2>Histórico de Notificações</h2>
      <div id="notifications-list">
        ${historyHtml}
      </div>
      
      <p class="refresh-note">Atualize a página para ver novas notificações.</p>
      
      <script>
        // Abas
        function openTab(evt, tabName) {
          const tabcontent = document.getElementsByClassName("tab-content");
          for (let i = 0; i < tabcontent.length; i++) {
            if (tabcontent[i].id === tabName) {
              tabcontent[i].classList.add("active");
            } else if (tabcontent[i].id.split('-')[0] === tabName.split('-')[0]) {
              tabcontent[i].classList.remove("active");
            }
          }
          
          const tabbuttons = evt.currentTarget.parentNode.getElementsByClassName("tab-button");
          for (let i = 0; i < tabbuttons.length; i++) {
            if (tabbuttons[i] === evt.currentTarget) {
              tabbuttons[i].classList.add("active");
            } else {
              tabbuttons[i].classList.remove("active");
            }
          }
        }
        
        // Atualização automática
        let refreshIntervalId;
        
        function startAutoRefresh() {
          stopAutoRefresh();
          const seconds = document.getElementById('refreshInterval').value;
          document.getElementById('autoRefreshStatus').textContent = 'Ativo (' + seconds + 's)';
          refreshIntervalId = setInterval(() => {
            location.reload();
          }, seconds * 1000);
        }
        
        function stopAutoRefresh() {
          if (refreshIntervalId) {
            clearInterval(refreshIntervalId);
            document.getElementById('autoRefreshStatus').textContent = 'Desativado';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Endpoint para verificar saúde do servidor
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    notifications_received: notificationHistory.length
  });
});

// Iniciar servidor
const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`\n=== Servidor Receptor AbacatePay ===`);
  console.log(`Rodando em: http://localhost:${PORT}`);
  console.log(`Aguardando notificações...`);
  console.log(`Pressione Ctrl+C para encerrar\n`);
});
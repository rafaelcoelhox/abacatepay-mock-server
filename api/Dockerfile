FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de configuração
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY server.js ./
COPY db.json ./

# Expor porta
EXPOSE 3000

# Comando para iniciar
CMD ["node", "server.js"]
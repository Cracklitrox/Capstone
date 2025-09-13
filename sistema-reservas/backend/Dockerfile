FROM node:18-slim
RUN apt-get update && apt-get install -y openssl
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN chmod +x /app/docker-entrypoint.sh
RUN npx prisma generate
EXPOSE 3001
CMD [ "node", "src/server.js" ]
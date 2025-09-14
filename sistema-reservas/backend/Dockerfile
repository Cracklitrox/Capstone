FROM node:18-slim
RUN apt-get update && apt-get install -y openssl postgresql-client
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN chmod +x /app/docker-entrypoint.sh
RUN npx prisma generate
EXPOSE 3001
ENTRYPOINT [ "/app/docker-entrypoint.sh" ]
CMD [ "node", "src/server.js" ]
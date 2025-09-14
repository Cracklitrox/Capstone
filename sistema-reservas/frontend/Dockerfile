# ---- Etapa 1: Construcción (Build Stage) ----
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --ignore-scripts

COPY . .

RUN npm run build

# ---- Etapa 2: Servidor (Serve Stage) ----
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
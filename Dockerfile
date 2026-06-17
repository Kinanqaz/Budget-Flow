# Stage 1: Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY vite.config.ts tsconfig*.json postcss.config.js tailwind.config.ts components.json index.html ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

# Stage 2: Build server
FROM node:20-alpine AS server
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY server/ ./server/
RUN npx tsc -p server/tsconfig.json

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache tini
COPY --from=server /app/node_modules/ ./node_modules/
COPY --from=server /app/server/dist/ ./server/dist/
COPY --from=frontend /app/dist/ ./dist/
COPY package.json ./

EXPOSE 3000
VOLUME ["/app/data"]

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/dist/index.js"]
# Stage 1: Install all dependencies (with build tools for native modules)
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci

# Stage 2: Build frontend
FROM deps AS frontend
COPY vite.config.ts tsconfig*.json postcss.config.js tailwind.config.ts components.json index.html ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

# Stage 3: Build server
FROM deps AS server
COPY server/ ./server/
RUN npx tsc -p server/tsconfig.json

# Stage 4: Production
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
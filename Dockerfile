# Stage 1: Install all dependencies (with build tools for native modules)
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Install dev dependencies for build
FROM deps AS build-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 3: Build frontend
FROM build-deps AS frontend
WORKDIR /app
COPY vite.config.ts tsconfig*.json postcss.config.js tailwind.config.ts components.json index.html ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

# Stage 4: Build server
FROM build-deps AS server
WORKDIR /app
COPY server/ ./server/
RUN npx tsc -p server/tsconfig.json

# Stage 5: Production
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache tini

# Copy only what's needed - server runtime
COPY --from=server /app/server/dist/ ./server/dist/
COPY --from=server /app/package.json ./package.json
COPY --from=server /app/node_modules/ ./node_modules/

# Copy frontend build output
COPY --from=frontend /app/dist/ ./dist/

EXPOSE 3000
VOLUME ["/app/data"]
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/dist/index.js"]
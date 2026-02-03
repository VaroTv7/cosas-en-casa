# Stage 1: Build Client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build Server
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine
WORKDIR /app

# Install dependencies (production only)
COPY server/package*.json ./
RUN npm ci --only=production

# Install Sharp for Linux/Alpine
RUN npm install sharp

# Copy built server
COPY --from=server-builder /app/server/dist ./dist

# Copy built client
COPY --from=client-builder /app/client/dist ./public

# Setup directories
RUN mkdir -p uploads data

# Expose port
EXPOSE 8110

# Environment variables
ENV NODE_ENV=production
ENV PORT=8110

# Start command
CMD ["node", "dist/index.js"]

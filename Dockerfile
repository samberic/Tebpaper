FROM node:20-slim

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first (cache layer)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application code
COPY server.js ./
COPY src/ ./src/
COPY views/ ./views/
COPY public/ ./public/

# Create data directory for any local storage needs
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]

# Build stage
FROM node:20-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
  build-essential libcairo2-dev libpango1.0-dev \
  libjpeg-dev libgif-dev librsvg2-dev

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

# Final stage
FROM node:20-slim

# Runtime dependencies only
RUN apt-get update && apt-get install -y \
  libcairo2 libpango-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 && \
  apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /zeitvertreib-discord

# Copy only the built output
COPY --from=builder /app/dist/ ./
COPY package*.json ./
COPY start.sh ./

EXPOSE 3000 3001

CMD ["/usr/bin/bash", "start.sh"]

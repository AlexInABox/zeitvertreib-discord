FROM node:20-slim

RUN apt-get update && apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

WORKDIR /zeitvertreib-discord

COPY package*.json ./
COPY setupCommands.js ./
COPY lib ./lib

RUN npm install

COPY . .

EXPOSE 3000 3001

CMD ["/usr/bin/bash", "start.sh"]

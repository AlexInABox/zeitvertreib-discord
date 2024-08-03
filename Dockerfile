FROM node:18-slim

WORKDIR /zeitvertreib-discord

COPY package*.json ./
COPY setupCommands.js ./

RUN npm install

COPY . .

EXPOSE 80

CMD ["npm", "start"]
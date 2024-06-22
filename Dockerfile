FROM node:18-slim

WORKDIR /zeitvertreib-discord

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "start"]
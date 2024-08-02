FROM node:18-slim

WORKDIR /zeitvertreib-discord

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 80

CMD ["npm", "start"]
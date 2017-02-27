FROM node:7.6.0

ADD package.json /app/package.json

WORKDIR /app/

RUN npm install -g pm2
RUN npm install

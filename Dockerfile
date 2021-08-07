FROM node:12-buster

RUN apt-get update && apt-get install -y chromium

RUN ln -s /usr/bin/chromium /usr/bin/chromium-browser

RUN mkdir /usr/app
WORKDIR /usr/app
COPY . .

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

RUN npm install
FROM node:12-buster

RUN apt-get update && apt-get install -y chromium

RUN ln -s /usr/bin/chromium /usr/bin/chromium-browser

RUN mkdir /usr/app
WORKDIR /usr/app

COPY package*.json ./
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
RUN npm install

COPY . .

CMD chmod +x run.sh && run.sh
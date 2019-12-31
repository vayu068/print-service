FROM circleci/node:8.11.2-stretch as build
MAINTAINER "Mahesh Kumar Gangula" "mahesh@ilimi.in"
USER root
COPY src /opt/print-service/
WORKDIR /opt/print-service/
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
RUN npm install --unsafe-perm

FROM node:8.11-slim
MAINTAINER "Mahesh Kumar Gangula" "mahesh@ilimi.in"
RUN apt-get clean \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-unstable \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r sunbird && useradd -r -g sunbird -G audio,video sunbird \
    && mkdir -p /home/sunbird/Downloads \
    && chown -R sunbird:sunbird /home/sunbird
USER sunbird
COPY --from=build --chown=sunbird /opt/print-service/ /home/sunbird/print-service/
WORKDIR /home/sunbird/print-service/
CMD ["node", "app.js", "&"]
FROM node:16.13.0-bullseye

USER node
WORKDIR /home/node/app

CMD ["yarn", "dev"]

# "common" stage
FROM node:16-alpine AS yawik_common

MAINTAINER "Anthonius Mutnhi

# Setup environment
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

ARG API_TOKEN_SALT="rIIBQg4u0EIT9QReWdq0Yw==,VU8GLGr3AW/zL6nOwS1MPg==,7qy5c6wgJ/qaSaiAqw+nxg==,gjg4qeEokJyZfJN8jA38yA=="
ENV API_TOKEN_SALT=${API_TOKEN_SALT}

EXPOSE 1337

# starting the build
WORKDIR /strapi
# keep sqlite persistence data to local machine
VOLUME /strapi/data

COPY ./package.json ./
COPY ./yarn.lock ./
ENV PATH /strapi/node_modules/.bin:$PATH
RUN yarn config set network-timeout 600000 -g
RUN yarn
COPY ./ .

# "development" stage build
# depends on the "common" stage above
FROM yawik_common as yawik_dev
COPY ./.env.dev ./.env

CMD ["yarn", "dev"]

# "production" stage build
# depends on the "common" stage above
FROM yawik_common AS yawik_prod

ENV NODE_ENV production
COPY ./.env.prod ./.env

RUN set -eux; \
    yarn build

CMD ["yarn", "start"]

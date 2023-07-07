ARG NODE_IMAGE=node:18.16.1-alpine

FROM $NODE_IMAGE AS base
# for libvips : sharp
RUN apk add vips-dev vips-cpp musl build-base --update-cache
RUN apk add --no-cache sqlite

FROM base AS dependencies
COPY /package*.json ./
RUN npm ci

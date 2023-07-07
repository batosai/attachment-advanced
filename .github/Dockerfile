ARG NODE_IMAGE=node:18.16.1-alpine

FROM $NODE_IMAGE AS base

# for libvips : sharp
RUN apk add vips-dev vips-cpp musl build-base --update-cache

RUN apk add --no-cache sqlite

# Copies your code file from your action repository to the filesystem path `/` of the container
COPY entrypoint.sh /entrypoint.sh

# Code file to execute when the docker container starts up (`entrypoint.sh`)
ENTRYPOINT ["/entrypoint.sh"]

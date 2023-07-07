# Container image that runs your code
FROM node:18.15.0-alpine

# for libvips : sharp
RUN apk add vips-dev vips-cpp musl build-base --update-cache

RUN apk add --no-cache sqlite

# Copies your code file from your action repository to the filesystem path `/` of the container
COPY entrypoint.sh /entrypoint.sh

# Code file to execute when the docker container starts up (`entrypoint.sh`)
ENTRYPOINT ["/entrypoint.sh"]

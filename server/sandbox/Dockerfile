# Ephemeral execution image: Python 3.12 + Node.js, no extra packages, no network at runtime.
FROM python:3.12-alpine
RUN apk add --no-cache nodejs && \
    adduser -D -u 10001 runner
WORKDIR /work
USER 65534:65534

FROM node:12.18.2-alpine

# Setup source directory
RUN mkdir /app
WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm ci

# Copy app to source directory
COPY . /app

ENV TS_NODE_PROJECT tsconfig.e2e.json
CMD ["/app/node_modules/.bin/mocha", "-r", "ts-node/register", "--timeout", "10000", "/app/e2e/tests/*.test.ts"]

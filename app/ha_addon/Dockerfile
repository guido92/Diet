ARG BUILD_FROM=ghcr.io/hassio-addons/base/amd64:14.3.1
# hadolint ignore=DL3006
FROM ${BUILD_FROM}

# Install dependencies (Node.js)
RUN apk add --no-cache nodejs npm

# Set working directory
WORKDIR /app

# Copy package files first
COPY package.json package-lock.json ./

# Install app dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the app
COPY . .

# Build the Next.js app
RUN npm run build

# Copy run script
COPY ha_addon/run.sh /run.sh
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]

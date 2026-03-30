FROM node:18-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV npm_config_build_from_source=false
RUN npm ci --ignore-scripts
RUN npm rebuild bcrypt --build-from-source
COPY . .
RUN node --max-old-space-size=400 node_modules/.bin/nest build

FROM node:18-alpine
RUN apk add --no-cache ffmpeg libc6-compat python3 make g++
WORKDIR /app
COPY package*.json ./
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci --omit=dev --ignore-scripts
RUN npm rebuild bcrypt --build-from-source
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "--max-old-space-size=400", "dist/main"]

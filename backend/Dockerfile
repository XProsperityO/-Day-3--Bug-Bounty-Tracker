# syntax=docker/dockerfile:1.7-labs
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY prisma prisma
COPY tsconfig*.json .
COPY src src
RUN npx prisma generate && npm run build

FROM node:20-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/dist dist
COPY --from=build /app/prisma prisma
COPY package.json ./
EXPOSE 3000
CMD ["node","dist/index.js"]

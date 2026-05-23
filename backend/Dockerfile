# Stage 1: Build Backend Application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Run Backend Application
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
# Expose default express api port
EXPOSE 5000
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]

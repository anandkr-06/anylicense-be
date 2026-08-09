# --- Stage 1: Build & Compile ---
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Installs all dependencies (including TypeScript & Nest CLI)
RUN npm install 
COPY . .
# Generates the production-ready compiled JavaScript in the /dist folder
RUN npm run build 

# --- Stage 2: Clean Production Runner ---
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy package files to install ONLY production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy the compiled JS build from Stage 1
COPY --from=builder /app/dist ./dist

EXPOSE 3001

# Run the compiled JS directly for better performance than npm scripts
CMD ["node", "dist/main.js"]

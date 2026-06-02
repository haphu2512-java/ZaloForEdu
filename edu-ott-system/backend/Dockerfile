# ─── Stage 1: Install Dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install only prod dependencies (leverages cache layer)
COPY package*.json ./
RUN npm ci --omit=dev


# ─── Stage 2: Production Image ──────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Install dumb-init for proper PID 1 signal handling (graceful shutdown)
RUN apk add --no-cache dumb-init

# Run as non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source code
COPY --chown=appuser:appgroup . .

# Create the uploads directory with correct ownership
RUN mkdir -p uploads && chown -R appuser:appgroup uploads

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 5000

# Set production environment
ENV NODE_ENV=production

# Health check - calls the /health endpoint defined in index.js
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Use dumb-init to wrap node process → ensures SIGTERM is forwarded correctly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "index.js"]

# Build
FROM ghcr.io/osgeo/gdal:alpine-normal-3.11.0 AS builder

# Install dependencies and show versions
RUN apk add --no-cache nodejs npm

# Copy, build static files; see .dockerignore for exclusions
WORKDIR /app
COPY . ./
RUN npm ci && npm run build

# Create final image
FROM ghcr.io/osgeo/gdal:alpine-normal-3.11.0

# Install Node.js and show versions
RUN apk add --no-cache nodejs npm

# Create non-root user (OpenShift will override this at runtime)
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

ENV NODE_ENV=production

# Copy app and dependencies
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/util/watersheds_3005.gpkg ./dist/util/watersheds_3005.gpkg

# Change ownership to non-root user and switch to it
RUN chown -R appuser:appgroup /app
USER appuser

# Boilerplate, not used in OpenShift/Kubernetes
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:3000/api

# limit heap size to 4096 MB~
CMD ["node", "--max-old-space-size=4096", "/app/dist/main.js"]
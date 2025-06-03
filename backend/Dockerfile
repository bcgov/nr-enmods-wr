# Build
FROM ghcr.io/osgeo/gdal:alpine-small-3.11.0 AS builder

# Install dependencies and show versions
RUN apk add --no-cache nodejs npm

# Copy, build static files; see .dockerignore for exclusions
WORKDIR /app
COPY . ./
RUN npm ci && npm run build

# Create final image
FROM ghcr.io/osgeo/gdal:alpine-small-3.11.0

# Install Node.js and show versions
RUN apk add --no-cache nodejs npm

ENV NODE_ENV=production

# Copy app and dependencies
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/util/watersheds_3005.gpkg ./dist/geodata/watersheds_3005.gpkg

# Boilerplate, not used in OpenShift/Kubernetes
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:3000/api

RUN ls -l /app/dist

# limit heap size to 512 MB
CMD ["node", "--max-old-space-size=512", "/app/dist/main.js"]
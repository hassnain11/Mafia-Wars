# Root Dockerfile for Hugging Face Spaces.
# Same content as server/Dockerfile — HF Spaces (Docker SDK) looks for
# Dockerfile at the repo root.

# ---- build stage ----
FROM node:20-slim AS build
WORKDIR /app

# Install workspace deps
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci --workspaces --include-workspace-root

# Copy sources needed to build the server bundle
COPY shared ./shared
COPY server ./server

# Bundle the server + its deps + the shared package into a single ESM file
RUN npm run build:bundle --workspace=server

# ---- runtime stage ----
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Copy only the bundled output (self-contained, no node_modules needed)
COPY --from=build /app/server/dist/bundle.mjs ./bundle.mjs

# PORT and HOST come from the platform (HF Spaces passes PORT via app_port
# metadata; set PORT=7860 fallback for direct docker runs on HF).
EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||7860)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "bundle.mjs"]

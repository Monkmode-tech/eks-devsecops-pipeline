# orders-api: TypeScript executed natively by Node.js 24 (type stripping).
# No npm install at all - the service has zero third-party runtime dependencies,
# so the image contains only Node.js and our source code.

FROM node:24-alpine

ENV NODE_ENV=production \
    PORT=3000

# The runtime needs only the node binary. Remove the bundled package managers
# (npm, npx, corepack, yarn): unused here, and the source of the CVEs Trivy
# found in this image.
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx \
           /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*

WORKDIR /app

# Owned by root and read-only to the app user; the app never writes to disk.
COPY package.json ./
COPY src ./src

# Fixed non-root UID/GID that the Kubernetes securityContext also pins.
USER 10001:10001

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "src/server.ts"]

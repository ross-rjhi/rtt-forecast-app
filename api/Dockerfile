# API container (Node + Express + Knex), e.g. for Azure Container Apps.
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production

# .npmrc skips install scripts: better-sqlite3 ships ready-made binaries (see .npmrc).
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev
COPY src ./src
COPY scripts ./scripts

# The SQLite file is mounted at /data (see docker-compose.yml); a real deployment would use a DB
# connection string instead.
ENV PORT=3000 DB_PATH=/data/app.sqlite
EXPOSE 3000
USER node
HEALTHCHECK CMD node -e "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "src/server.js"]

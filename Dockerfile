FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/jsconfig.json ./jsconfig.json
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/scripts/start-aws.sh ./scripts/start-aws.sh

EXPOSE 3000

CMD ["sh", "./scripts/start-aws.sh"]

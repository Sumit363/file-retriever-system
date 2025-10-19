FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json .

RUN npm install prisma --save-dev && npx prisma init

RUN \
  if [ -f package-lock.json ]; then npm ci; \
  else npm i; \
  fi
  
COPY . .

RUN npm run postinstall

# Build the Next.js application for standalone output
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 2: Create the production image
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install prisma && npx prisma init

ENV NODE_ENV production

# Copy necessary files from the builder stage
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# COPY --from=builder /app/public ./public

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME 0.0.0.0

CMD ["/bin/sh", "entrypoint.sh"]
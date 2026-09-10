FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --ignore-scripts
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
RUN bun x prisma generate
COPY . .
RUN bun run build

FROM oven/bun:1
WORKDIR /app
COPY --from=base /app .
EXPOSE 8080
CMD ["sh", "-c", "bun run railway:setup && bun run start"]

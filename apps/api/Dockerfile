FROM node:24-bookworm-slim

ARG GITHUB_CLI_VERSION=2.98.0

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl openssl \
    && curl --fail --silent --show-error --location --output /tmp/gh.deb \
      "https://github.com/cli/cli/releases/download/v${GITHUB_CLI_VERSION}/gh_${GITHUB_CLI_VERSION}_linux_amd64.deb" \
    && curl --fail --silent --show-error --location --output /tmp/gh-checksums.txt \
      "https://github.com/cli/cli/releases/download/v${GITHUB_CLI_VERSION}/gh_${GITHUB_CLI_VERSION}_checksums.txt" \
    && grep " gh_${GITHUB_CLI_VERSION}_linux_amd64.deb$" /tmp/gh-checksums.txt \
      | sed "s# gh_${GITHUB_CLI_VERSION}_linux_amd64.deb# /tmp/gh.deb#" \
      | sha256sum --check --strict \
    && apt-get install -y --no-install-recommends /tmp/gh.deb \
    && gh --version | grep --fixed-strings "gh version ${GITHUB_CLI_VERSION}" \
    && rm -f /tmp/gh.deb /tmp/gh-checksums.txt \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

WORKDIR /app
COPY . .

RUN pnpm install --frozen-lockfile
# Prisma 7 loads prisma.config.ts during client generation and therefore requires
# DATABASE_URL to be present even though `prisma generate` does not connect to the
# database. Use a non-secret, build-only placeholder; production DATABASE_URL is
# supplied later through /srv/apps/<repo>/.env by Fogewise.
RUN DATABASE_URL='postgresql://fogewise_build:fogewise_build@127.0.0.1:5432/fogewise_build?schema=public' \
    pnpm --filter @lcsp/api build

ENV NODE_ENV=production
ENV PORT=8080
ENV GITHUB_CLI_EXECUTABLE_PATH=/usr/bin/gh

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "pnpm --filter @lcsp/api prisma:migrate:deploy && exec pnpm --filter @lcsp/api start:prod"]

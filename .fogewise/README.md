# Fogewise deployment

This directory defines the LCSP production topology for Fogewise.

## Source of truth

`deploy.yml` is the single source of truth for Fogewise service topology.

Do not add Fogewise deployment metadata to `package.json`, do not commit a production Compose file, and do not declare application secrets or registry credentials in the manifest.

## Fogewise Deploy v2 contract

```yaml
services:
  <service-id>:
    path: <repo-relative-path>
    route: <optional-public-route>
    requires:
      - <optional-platform-dependency>
    command:
      - <optional-runtime-command-arg>
```

Field semantics:

| Field | Meaning |
|---|---|
| `path` | Build unit. CI resolves the Dockerfile from `<path>/Dockerfile` and uses the repository root as build context. |
| `route` | Optional public HTTP route. Services with a route are published to loopback and routed by Caddy. |
| `requires` | Optional Fogewise shared infrastructure dependencies such as `redis` or `rabbitmq`. |
| `command` | Optional Docker runtime command override. The image `ENTRYPOINT` is preserved. |

The manifest intentionally does not contain application env names, container ports, host ports, image tags, registry credentials, internal URLs, or service `type` metadata.

## Public vs internal services

Fogewise v2 derives service behavior from `route`.

```text
route present
  -> public HTTP service
  -> container target port 8080
  -> dynamic 127.0.0.1:<host-port>
  -> Caddy route generated

route absent
  -> internal/background service
  -> no host port published
  -> no Caddy route generated
```

This allows workers to remain private without introducing `type: worker` or worker-specific deployment metadata.

## LCSP topology

LCSP uses Next.js as the public BFF. NestJS and Python workers stay internal.

```text
Internet
   |
   v
Caddy
   |
   v
web:8080
   |
   +------> api:8080
                |
                +------> fogewise-rabbitmq
                +------> fogewise-redis

Python workers ---------> api:8080
Python workers ---------> fogewise-rabbitmq
```

Important: `api` intentionally has no public `/api` route in the Fogewise manifest. The Next.js application owns the public `/api/*` BFF routes and forwards server-side requests to NestJS through Docker DNS.

Current topology:

```yaml
services:
  api:
    path: apps/api
    requires:
      - redis
      - rabbitmq

  web:
    path: apps/web
    route: /

  scanner-worker:
    path: lcsp-python-workers
    command:
      - lcsp_workers.scanner.scan_consumer:ScanConsumer
    requires:
      - rabbitmq

  technical-profile-worker:
    path: lcsp-python-workers
    command:
      - lcsp_workers.intelligence.technical_profile_consumer:TechnicalProfileConsumer
    requires:
      - rabbitmq

  ai-usage-flow-worker:
    path: lcsp-python-workers
    command:
      - lcsp_workers.intelligence.ai_usage_flow_consumer:AIUsageFlowConsumer
    requires:
      - rabbitmq

  conflict-detection-worker:
    path: lcsp-python-workers
    command:
      - lcsp_workers.intelligence.conflict_detection_consumer:ConflictDetectionConsumer
    requires:
      - rabbitmq

  verified-profile-worker:
    path: lcsp-python-workers
    command:
      - lcsp_workers.intelligence.verified_profile_consumer:VerifiedProfileConsumer
    requires:
      - rabbitmq

  legal-retrieval-worker:
    path: lcsp-python-workers
    command:
      - lcsp_workers.legal.legal_retrieval_consumer:LegalRetrievalConsumer
    requires:
      - rabbitmq

  classification-worker:
    path: lcsp-python-workers
    command:
      - lcsp_workers.classification.classification_consumer:ClassificationConsumer
    requires:
      - rabbitmq

  gap-analysis-worker:
    path: lcsp-python-workers
    command:
      - lcsp_workers.reporting.gap_analysis_consumer:GapAnalysisConsumer
    requires:
      - rabbitmq
```

`final-report-worker` is not enabled yet because its current runtime constructor is not production-runnable with the existing LLM gateway contract. `audit-export` is also not an active Fogewise worker in the current MVP topology.

## Python worker image

All Python worker services share the same build unit:

```text
lcsp-python-workers/Dockerfile
```

CI builds that path once and applies the resulting image to every service that references the same `path`.

The image entrypoint runs:

```text
python -m lcsp_workers.runtime <module:Class>
```

Each worker command in `deploy.yml` therefore contains only the consumer target, for example:

```yaml
command:
  - lcsp_workers.classification.classification_consumer:ClassificationConsumer
```

Python workers expose `/health` on container port `8080` for Docker `HEALTHCHECK`. That port is internal only and must not be published to the host.

## Production image flow

```text
push main
  -> GitHub Actions checkout
  -> parse .fogewise/deploy.yml
  -> build service images on GitHub Actions
  -> push immutable SHA tags to GHCR
  -> upload .fogewise/deploy.yml to VPS
  -> /usr/local/sbin/fogewise-deploy <owner/repo> <sha>
  -> VPS pulls images only
  -> generated Compose starts containers
  -> deployer waits for running/healthy state
  -> deployer resolves dynamic public ports
  -> Caddy config is generated/reloaded
```

Image naming stays service-based:

```text
ghcr.io/<owner>/<repo>-<service-id>:<git-sha>
```

Production must deploy immutable Git SHA tags. The VPS must not build application images.

## Required deployer version

This manifest requires `fogewise-deploy` v2 or newer.

```bash
/usr/local/sbin/fogewise-deploy --version
```

Expected:

```text
fogewise-deploy 2.x.x
```

Required v2 behavior:

- `route` is optional;
- `command` is optional;
- services without `route` do not publish a host port;
- services without `route` do not generate a Caddy route;
- services with Docker `HEALTHCHECK` are awaited until `healthy`;
- services without Docker `HEALTHCHECK` are awaited until `running`;
- `requires` attaches services to approved Fogewise infrastructure;
- generated Compose validation uses `docker compose config --quiet`;
- Caddy routes are regenerated after dynamic Docker host ports are resolved;
- release state is written under `/var/lib/fogewise/apps/<repo>`;
- failed deployments attempt rollback to the previous release.

Do not deploy this manifest with the old v1 deployer.

## Runtime files on VPS

Application runtime directory:

```text
/srv/apps/lcsp/
  .env
  .fogewise/
    deploy.yml
```

Expected permissions:

```text
/srv/apps/lcsp                      root:root 0700
/srv/apps/lcsp/.env                 root:root 0600
/srv/apps/lcsp/.fogewise            root:root 0755
/srv/apps/lcsp/.fogewise/deploy.yml root:root 0644
```

Generated deployment state:

```text
/var/lib/fogewise/apps/lcsp/compose.json
/var/lib/fogewise/apps/lcsp/release.json
```

Generated Caddy site:

```text
/etc/caddy/conf.d/lcsp.caddy
```

The runtime directory is not a source checkout.

## Production environment topology

Production-specific service addresses belong in `/srv/apps/lcsp/.env`, not in `deploy.yml`.

Typical internal values:

```env
PORT=8080
LCSP_API_BASE_URL=http://api:8080
NESTJS_API_BASE_URL=http://api:8080
RABBITMQ_URL=amqp://<credential>@fogewise-rabbitmq:5672/
HEALTH_PORT=8080
```

Keep credentials only in the VPS environment/secret store. Never commit them.

## Shared infrastructure

Supported `requires` values currently include:

```yaml
requires:
  - redis
  - rabbitmq
```

They attach the application service to the shared external Docker network:

```text
fogewise-network
```

The corresponding platform containers are expected to be running and attached to that network:

```text
fogewise-redis
fogewise-rabbitmq
```

Application connection URIs remain environment-owned configuration.

## Verification

After deployment:

```bash
docker compose \
  -p lcsp \
  -f /var/lib/fogewise/apps/lcsp/compose.json \
  ps

cat /etc/caddy/conf.d/lcsp.caddy

cat /var/lib/fogewise/apps/lcsp/release.json
```

Expected networking shape:

```text
lcsp-web-1                    127.0.0.1:<dynamic>->8080
lcsp-api-1                    no published host port
lcsp-scanner-worker-1         no published host port
lcsp-classification-worker-1  no published host port
...
```

Origin health can be tested without Cloudflare:

```bash
curl -kI \
  --resolve lcsp.fogewise.io.vn:443:127.0.0.1 \
  https://lcsp.fogewise.io.vn/
```

## Backward compatibility

Fogewise Deploy v2 remains compatible with v1-style HTTP manifests such as:

```yaml
services:
  api:
    path: apps/api
    route: /api
    requires:
      - redis

  web:
    path: apps/web
    route: /
```

Both services remain public and receive dynamic loopback host ports exactly as before.

## Change discipline

When changing deployment topology:

1. update `deploy.yml`;
2. update this README when semantics or topology change;
3. keep runtime/application configuration out of the manifest;
4. do not introduce fixed host ports;
5. do not reintroduce VPS-side image builds or source-code deployment;
6. do not route background workers through Caddy.

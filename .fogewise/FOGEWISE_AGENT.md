# FOGEWISE_AGENT.md

Project-specific deployment rules for Fogewise production.

## Deployment source of truth

- `.fogewise/deploy.yml` is the single source of truth for deployment topology.
- Do not declare Fogewise metadata in `package.json`.
- Do not add repository-owned production Compose files.
- Application runtime configuration belongs in environment variables and application code, not in the Fogewise manifest.

## Deploy manifest contract

```yaml
services:
  <service-id>:
    path: <repo-relative-path>
    route: <public-route>
    requires:
      - <optional-platform-dependency>
```

For this repository:

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

The same contract supports a monolith:

```yaml
services:
  app:
    path: .
    route: /
    requires:
      - redis
```

The manifest stays intentionally small. Do not add application env variable names, container ports, host ports, package names, internal URLs, build arguments, image tags, or registry credentials.

## Build and image contract

Production images are built by GitHub Actions, not by the VPS.

Expected flow:

```text
push main
  -> GitHub Actions checkout
  -> read .fogewise/deploy.yml
  -> build each service Dockerfile with repository root as build context
  -> push immutable images to GHCR
  -> upload only .fogewise/deploy.yml to the VPS
  -> VPS pulls the requested image tag
  -> generated Compose starts containers without building
  -> Fogewise resolves dynamic host ports and renders Caddy
```

Image naming convention:

```text
ghcr.io/<owner>/<repo>-<service-id>:<git-sha>
```

`latest` may also be published for convenience, but production deployment must use the immutable Git SHA tag.

Rules:

- GitHub Actions owns CPU/RAM-intensive image builds.
- The VPS must never run `docker compose ... up --build` for application deployments.
- The VPS must never require application source code to deploy a release.
- Docker build context remains the repository root so monorepo Dockerfiles can copy shared packages.
- The Dockerfile is resolved from `<service.path>/Dockerfile` during the GitHub Actions build.
- Every Fogewise HTTP image exposes and listens on container port `8080`.
- Fogewise does not inject application-specific port variable names. Applications configure themselves through their runtime env.

## VPS runtime directory

`/srv/apps/<repo>` is runtime state, not a source checkout.

After a successful deployment it may contain only:

```text
/srv/apps/<repo>/
  .env
  .fogewise/
    deploy.yml
```

Do not keep source code, `node_modules`, build output, Dockerfiles, package manifests, Git metadata, or other repository files in this directory.

Runtime ownership and permissions are normalized automatically on every deployment:

```text
/srv/apps/<repo>                     root:root 0700
/srv/apps/<repo>/.env                root:root 0600
/srv/apps/<repo>/.fogewise           root:root 0755
/srv/apps/<repo>/.fogewise/deploy.yml root:root 0644
```

The `.env` rule applies when the file exists. The workflow must repair ownership and modes after uploading the manifest and again after runtime-directory cleanup, so deployment behavior does not depend on rsync ownership, previous source-checkout ownership, or shell umask.

The production env file is:

```text
/srv/apps/<repo>/.env
```

It is automatically attached as `env_file` to every declared service when it exists. Applications decide which variables they consume.

Never commit production secrets or copy `.env` into an image.

## Generated Compose contract

Fogewise generates:

```text
/var/lib/fogewise/apps/<repo>/compose.json
```

Each service uses an `image:` reference, never a `build:` section.

Conceptually:

```yaml
services:
  api:
    image: ghcr.io/<owner>/<repo>-api:<git-sha>
    env_file:
      - /srv/apps/<repo>/.env
    ports:
      - 127.0.0.1::8080
```

Rules:

- Host ports are loopback-only and dynamically allocated.
- Compose service IDs come from `.fogewise/deploy.yml` and are stable internal Docker DNS names.
- Services in the same deployment share the generated application network.
- `requires` attaches the service to approved Fogewise infrastructure networks.
- Shared infrastructure credentials and connection URIs remain application-owned env values.
- Compose validation must remain quiet because resolved configuration may reference secret-bearing env files.

## GHCR authentication

GitHub Actions pushes images with `GITHUB_TOKEN` and requires `packages: write`.

The VPS uses deployment-scoped GHCR credentials supplied by the calling workflow. Registry credentials must not be stored in `.fogewise/deploy.yml` or the application `.env` and should be removed after deployment.

## Runtime networking

Manifest service IDs are stable internal DNS identities. For example, application-owned env may configure:

```text
INTERNAL_API_BASE_URL=http://api:8080/api
```

Fogewise does not generate that variable. It only guarantees that service `api` is reachable as `api:8080` on the application network.

For Redis, `requires: [redis]` attaches the service to the Fogewise infrastructure network. Application env must use the platform Redis hostname/URI, never `127.0.0.1` from another container.

## Caddy

Fogewise resolves the dynamically published host port of each service and generates:

```text
/etc/caddy/conf.d/<repo>.caddy
```

The platform Caddyfile must retain:

```text
import /etc/caddy/conf.d/*.caddy
```

Generated site files must be mode `0644`. More-specific routes such as `/api` must be handled before `/`.

## Secrets and logs

- Never print `/srv/apps/<repo>/.env`, resolved container environment, or secret-bearing Compose output to CI logs.
- Never use `docker compose config` without `--quiet` in streamed CI/SSH output.
- Raw deployment logs belong in a root-only server log with mode `0600`.
- Do not enable shell xtrace around credentials or environment files.
- GHCR registry credentials are platform credentials, not application env.

## Deployment verification

After deployment verify:

```bash
docker compose \
  -p <repo> \
  -f /var/lib/fogewise/apps/<repo>/compose.json \
  ps

cat /etc/caddy/conf.d/<repo>.caddy
curl -I https://<repo>.fogewise.io.vn
```

For this project also verify:

- `api` and `web` both listen on container port `8080`;
- `/api/auth/me` routes to `api`;
- `/` and public assets route to `web`;
- `api` resolves Redis when `requires: [redis]` is declared;
- web server-side requests can reach `http://api:8080/api` when configured in `/srv/apps/tasks-dash/.env`;
- runtime directory ownership and modes match the Fogewise contract above.

## Change discipline

- Do not reintroduce source-code rsync to `/srv/apps/<repo>`.
- Do not reintroduce VPS-side application image builds.
- Do not reintroduce `package.json.fogewise`, `compose.prod.yml`, fixed host ports, or obsolete `/etc/caddy/sites-enabled` routing.
- Keep `.fogewise/deploy.yml` limited to service path, public route, and platform dependencies.
- If deployment architecture changes, update this file in the same PR.

#!/usr/bin/env bash
# Public deploy on a Linux host with nothing but Docker (Engine + compose plugin), git and openssl.
# Bash twin of fill-public-prod-env.ps1 -ServerTemplate + present-public.ps1 -Server, for servers without PowerShell.
#
#   ./deploy/scripts/server-up.sh elements-api.example.com    # first run: writes the env file with fresh secrets
#   git pull && ./deploy/scripts/server-up.sh                 # every later run: rebuild + restart what changed
#
# DNS for the hostname must already point at this machine and 80/443 must be open, or Caddy cannot get a certificate.
set -euo pipefail
cd "$(dirname "$0")/../.."

domain="${1:-}"
env_file=docker/.env.public.prod
compose=(docker compose -p element-prod --env-file "$env_file" -f docker-compose.yml -f docker-compose.public.yml)

if [[ ! -f "$env_file" ]]; then
    if [[ ! "$domain" =~ ^[A-Za-z0-9.-]+$ ]]; then
        echo "usage: $0 <public-hostname>   (bare host name, no https://; needed on the first run)" >&2
        exit 2
    fi
    umask 077 # the file holds every secret of the stack
    sed -E \
        -e "s|^CADDY_SITE=.*|CADDY_SITE=$domain|" \
        -e "s|^CADDY_HTTP_PORT=.*|CADDY_HTTP_PORT=80|" \
        -e "s|^CADDY_HTTPS_PORT=.*|CADDY_HTTPS_PORT=443|" \
        -e "s#^(PUBLIC_WEB_ORIGIN|VITE_PUBLIC_SITE_URL|PUBLIC_API_BASE)=.*#\1=https://$domain#" \
        -e "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" \
        -e "s|^INTERNAL_API_KEY=.*|INTERNAL_API_KEY=$(openssl rand -hex 32)|" \
        -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 32)|" \
        -e "s|^RABBITMQ_DEFAULT_PASS=.*|RABBITMQ_DEFAULT_PASS=$(openssl rand -hex 32)|" \
        docker/.env.public.prod.example > "$env_file"
    echo "Wrote $env_file for https://$domain (gitignored; back it up somewhere safe)."
fi

# Same refusal as present-public.ps1 -Server: never expose a host with example secrets or local-smoke settings.
if grep -Eq '^[A-Z_]+=.*(replace-with|ChangeMe)' "$env_file" || grep -Eq '^CADDY_SITE=https?://' "$env_file"; then
    echo "$env_file still has placeholder secrets or a local CADDY_SITE. Delete it and rerun with the hostname." >&2
    exit 1
fi

# One image at a time: the default parallel build runs three .NET SDKs, two Mavens and two npm installs
# at once, which exhausts a small VPS (BuildKit then dies with "context deadline exceeded").
for service in $("${compose[@]}" config --services); do
    "${compose[@]}" build "$service"
done

# --wait blocks until every container with a healthcheck reports healthy, and fails the script otherwise.
"${compose[@]}" up -d --wait --wait-timeout 600

site=$(grep -E '^CADDY_SITE=' "$env_file" | cut -d= -f2-)
echo "Up: https://$site/  ·  API: https://$site/api/v2/elements/fe"
echo "Status: ${compose[*]} ps"

#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# Flowmind School ERP — Script de Deploy a Producción
# Uso: ./scripts/deploy.sh [--skip-build]
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.prod.yml"
ENV_FILE="$ROOT_DIR/.env"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $*"; }
fail() { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }

# ── 1. Verificar .env ─────────────────────────────────────────
log "Verificando .env..."
[[ -f "$ENV_FILE" ]] || fail ".env no encontrado. Copia .env.production.example a .env y complétalo."

check_var() {
  local val
  val=$(grep -E "^$1=" "$ENV_FILE" | cut -d= -f2-)
  [[ -n "$val" && "$val" != *"CAMBIAR"* ]] || fail "Variable $1 no configurada en .env"
}

check_var POSTGRES_PASSWORD
check_var JWT_SECRET
check_var JWT_REFRESH_SECRET
check_var CORS_ORIGIN

# Validar longitud JWT_SECRET
JWT_LEN=$(grep -E "^JWT_SECRET=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | wc -c)
[[ $JWT_LEN -ge 32 ]] || fail "JWT_SECRET debe tener al menos 32 caracteres (actual: $JWT_LEN)"

log ".env OK"

# ── 2. Pull/Build images ──────────────────────────────────────
SKIP_BUILD=false
[[ "${1:-}" == "--skip-build" ]] && SKIP_BUILD=true

cd "$ROOT_DIR"

if [[ "$SKIP_BUILD" == "false" ]]; then
  log "Construyendo imágenes Docker..."
  docker compose -f "$COMPOSE_FILE" build --no-cache
  log "Build completo."
fi

# ── 3. Detener contenedores anteriores (sin perder datos) ─────
log "Deteniendo servicios anteriores..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans || true

# ── 4. Levantar servicios base ────────────────────────────────
log "Iniciando base de datos y redis..."
docker compose -f "$COMPOSE_FILE" up -d db redis

log "Esperando que la base de datos esté lista..."
timeout 60 bash -c 'until docker compose -f '"$COMPOSE_FILE"' exec -T db pg_isready -U ${POSTGRES_USER:-flowmind}; do sleep 2; done' \
  || fail "Base de datos no respondió en 60s"

# ── 5. Ejecutar migraciones Prisma ───────────────────────────
log "Ejecutando migraciones Prisma..."
docker compose -f "$COMPOSE_FILE" run --rm api sh -c \
  "npx prisma migrate deploy" \
  || fail "Migraciones fallaron"
log "Migraciones aplicadas."

# ── 6. Levantar todos los servicios ──────────────────────────
log "Iniciando todos los servicios..."
docker compose -f "$COMPOSE_FILE" up -d

# ── 7. Esperar health check ───────────────────────────────────
log "Esperando health check del API..."
timeout 120 bash -c '
  until curl -sf http://localhost:3000/health > /dev/null 2>&1; do
    echo -n "."
    sleep 3
  done
  echo
' || { warn "Health check no respondió en 120s — revisar logs con: docker compose logs api"; exit 1; }

log "Health check OK."

# ── 8. Resumen ───────────────────────────────────────────────
echo ""
log "=== Deploy completado ==="
docker compose -f "$COMPOSE_FILE" ps
echo ""
log "API:  http://localhost:3000/health"
log "Web:  http://localhost"
log "Logs: docker compose -f docker-compose.prod.yml logs -f"

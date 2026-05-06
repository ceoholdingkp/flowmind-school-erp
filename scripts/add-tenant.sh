#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# Flowmind School ERP — Agregar Nuevo Tenant (Colegio)
# Uso: ./scripts/add-tenant.sh
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()     { echo -e "${GREEN}[tenant]${NC} $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC}  $*"; }
fail()    { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }
prompt()  { echo -e "${CYAN}[input]${NC}  $*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE_FILE="$ROOT_DIR/docker-compose.prod.yml"

# ── Cargar variables ─────────────────────────────────────────
[[ -f "$ENV_FILE" ]] && export $(grep -v '^#' "$ENV_FILE" | xargs) 2>/dev/null || true

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_USER="${POSTGRES_USER:-flowmind}"
PGPASSWORD="${PGPASSWORD:-${POSTGRES_PASSWORD:-}}"
export PGPASSWORD

# ── Recopilar datos del nuevo colegio ─────────────────────────
echo ""
log "=== Agregar Nuevo Tenant ==="
echo ""

prompt "Nombre del colegio (ej: Colegio San Patricio):"
read -r NOMBRE_COLEGIO
[[ -n "$NOMBRE_COLEGIO" ]] || fail "Nombre requerido."

prompt "Slug/identificador (ej: san_patricio — solo letras, números y guión bajo):"
read -r SLUG
[[ "$SLUG" =~ ^[a-z0-9_]+$ ]] || fail "Slug inválido. Solo letras minúsculas, números y guión bajo."
DB_NAME="flowmind_${SLUG}"

prompt "RBD del colegio (ej: 12345):"
read -r RBD
[[ "$RBD" =~ ^[0-9]+$ ]] || fail "RBD inválido."

prompt "Email del director/a:"
read -r DIRECTOR_EMAIL
[[ "$DIRECTOR_EMAIL" =~ @ ]] || fail "Email inválido."

prompt "Nombre del director/a:"
read -r DIRECTOR_NOMBRE

prompt "Contraseña inicial del director/a (mínimo 8 caracteres):"
read -r -s DIRECTOR_PASSWORD
echo ""
[[ ${#DIRECTOR_PASSWORD} -ge 8 ]] || fail "Contraseña muy corta (mínimo 8 caracteres)."

# ── Confirmar ────────────────────────────────────────────────
echo ""
log "Resumen:"
echo "  Colegio:  $NOMBRE_COLEGIO"
echo "  DB:       $DB_NAME"
echo "  RBD:      $RBD"
echo "  Director: $DIRECTOR_NOMBRE ($DIRECTOR_EMAIL)"
echo ""
read -r -p "¿Confirmar creación? [s/N]: " CONFIRM
[[ "$CONFIRM" =~ ^[sS]$ ]] || { log "Cancelado."; exit 0; }

# ── Verificar que la DB no exista ────────────────────────────
EXISTING=$(psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -t -A \
  -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" postgres 2>/dev/null || echo "")
[[ -z "$EXISTING" ]] || fail "La base de datos '$DB_NAME' ya existe."

# ── Crear base de datos ───────────────────────────────────────
log "Creando base de datos $DB_NAME..."
psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -c \
  "CREATE DATABASE \"$DB_NAME\" OWNER \"$POSTGRES_USER\";" postgres
log "DB creada."

# ── Ejecutar migraciones Prisma ───────────────────────────────
log "Ejecutando migraciones Prisma en $DB_NAME..."
TENANT_DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/${DB_NAME}"

if [[ -f "$COMPOSE_FILE" ]]; then
  # En producción: correr dentro del contenedor API
  docker compose -f "$COMPOSE_FILE" run --rm \
    -e DATABASE_URL="$TENANT_DATABASE_URL" \
    api sh -c "npx prisma migrate deploy"
else
  # En desarrollo local
  DATABASE_URL="$TENANT_DATABASE_URL" npx prisma migrate deploy \
    --schema="$ROOT_DIR/apps/api/prisma/schema.prisma"
fi
log "Migraciones aplicadas."

# ── Registrar tenant en master ────────────────────────────────
log "Registrando tenant en flowmind_master..."
MASTER_DB_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/flowmind_master"

psql "$MASTER_DB_URL" -c "
  INSERT INTO tenants (id, slug, nombre, rbd, db_name, activo, created_at)
  VALUES (gen_random_uuid(), '$SLUG', '$NOMBRE_COLEGIO', '$RBD', '$DB_NAME', true, now())
  ON CONFLICT (slug) DO NOTHING;
" 2>/dev/null || warn "No se pudo registrar en tabla tenants (puede no existir en este esquema)."

# ── Seed básico: usuario director ────────────────────────────
log "Creando usuario director en $DB_NAME..."
HASHED_PW=$(node -e "
  const bcrypt = require('bcryptjs');
  console.log(bcrypt.hashSync('$DIRECTOR_PASSWORD', 10));
" 2>/dev/null || fail "Error generando hash de contraseña (requiere Node.js con bcryptjs)")

psql "$TENANT_DATABASE_URL" -c "
  INSERT INTO usuarios (id, email, password, nombre, apellidos, rol, activo, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    '$DIRECTOR_EMAIL',
    '$HASHED_PW',
    '$DIRECTOR_NOMBRE',
    '',
    'DIRECTOR',
    true,
    now(),
    now()
  );
" || fail "Error creando usuario director."

log "=== Tenant '$NOMBRE_COLEGIO' creado exitosamente ==="
echo ""
echo "  URL de acceso: https://\${CORS_ORIGIN%%,*}"
echo "  Email:         $DIRECTOR_EMAIL"
echo "  Contraseña:    (la que ingresó)"
echo "  Base de datos: $DB_NAME"

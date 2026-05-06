#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# Flowmind School ERP — Script de Restore
# Uso: ./scripts/restore.sh <archivo_backup.sql.gz> [nombre_db]
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[restore]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $*"; }
fail() { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }

BACKUP_FILE="${1:-}"
TARGET_DB="${2:-}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_USER="${POSTGRES_USER:-flowmind}"

# ── Validar argumentos ────────────────────────────────────────
[[ -n "$BACKUP_FILE" ]] || fail "Uso: $0 <archivo.sql.gz> [nombre_db]"
[[ -f "$BACKUP_FILE" ]] || fail "Archivo no encontrado: $BACKUP_FILE"

# Detectar nombre de DB desde el nombre del archivo si no se especificó
if [[ -z "$TARGET_DB" ]]; then
  TARGET_DB=$(basename "$BACKUP_FILE" | sed 's/_[0-9]\{8\}_[0-9]\{6\}\.sql\.gz$//')
fi

log "Archivo:  $BACKUP_FILE"
log "Base de datos destino: $TARGET_DB"
log "Servidor: $POSTGRES_HOST"
echo ""

# ── Confirmación ─────────────────────────────────────────────
warn "ADVERTENCIA: Esto REEMPLAZARÁ COMPLETAMENTE la base de datos '$TARGET_DB'."
warn "Todos los datos actuales serán eliminados."
echo ""
read -r -p "¿Confirmar? Escribe 'SI RESTAURAR' para continuar: " CONFIRM
[[ "$CONFIRM" == "SI RESTAURAR" ]] || { log "Cancelado."; exit 0; }

# ── Backup previo de la DB destino ───────────────────────────
PRE_BACKUP="/tmp/${TARGET_DB}_pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
log "Creando backup previo en $PRE_BACKUP..."
pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -Fp --no-owner "$TARGET_DB" \
  | gzip -9 > "$PRE_BACKUP" 2>/dev/null && log "Backup previo OK." || warn "No se pudo crear backup previo (DB podría no existir)."

# ── Recrear la base de datos ──────────────────────────────────
log "Terminando conexiones activas..."
psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$TARGET_DB' AND pid <> pg_backend_pid();" \
  postgres > /dev/null 2>&1 || true

log "Eliminando y recreando $TARGET_DB..."
psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -c "DROP DATABASE IF EXISTS \"$TARGET_DB\";" postgres
psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -c "CREATE DATABASE \"$TARGET_DB\" OWNER \"$POSTGRES_USER\";" postgres

# ── Restaurar ─────────────────────────────────────────────────
log "Restaurando desde $BACKUP_FILE..."
if gunzip -c "$BACKUP_FILE" | psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$TARGET_DB" -v ON_ERROR_STOP=1; then
  log "=== Restore completado exitosamente ==="
  log "Backup previo guardado en: $PRE_BACKUP"
else
  fail "El restore falló. Intentando recuperar desde backup previo: $PRE_BACKUP"
fi

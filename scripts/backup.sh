#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# Flowmind School ERP — Script de Backup
# Ejecuta pg_dump por cada base de datos tenant + master
# Cron: 0 3 * * * /ruta/scripts/backup.sh
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
POSTGRES_HOST="${POSTGRES_HOST:-db}"
POSTGRES_USER="${POSTGRES_USER:-flowmind}"
PGPASSWORD="${PGPASSWORD:-}"

DATE=$(date +"%Y%m%d_%H%M%S")
LOG_PREFIX="[backup $DATE]"

log()  { echo "$LOG_PREFIX $*"; }
fail() { echo "$LOG_PREFIX ERROR: $*" >&2; exit 1; }

mkdir -p "$BACKUP_DIR"

# ── Listar todas las bases de datos de tenants ────────────────
log "Listando bases de datos..."
DATABASES=$(psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -t -A \
  -c "SELECT datname FROM pg_database WHERE datname LIKE 'flowmind_%' AND datistemplate = false;")

if [[ -z "$DATABASES" ]]; then
  fail "No se encontraron bases de datos flowmind_*"
fi

# ── Backup por base de datos ──────────────────────────────────
BACKUP_OK=0
BACKUP_FAIL=0

for DB in $DATABASES; do
  OUTFILE="$BACKUP_DIR/${DB}_${DATE}.sql.gz"
  log "Respaldando $DB → $OUTFILE"

  if pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -Fp --no-owner --no-acl "$DB" \
     | gzip -9 > "$OUTFILE"; then
    SIZE=$(du -sh "$OUTFILE" | cut -f1)
    log "OK: $DB ($SIZE)"
    BACKUP_OK=$((BACKUP_OK + 1))
  else
    log "FALLO: $DB"
    BACKUP_FAIL=$((BACKUP_FAIL + 1))
    rm -f "$OUTFILE"
  fi
done

# ── Rotación: eliminar backups viejos ─────────────────────────
log "Eliminando backups con más de $RETENTION_DAYS días..."
find "$BACKUP_DIR" -name "flowmind_*.sql.gz" -mtime "+$RETENTION_DAYS" -delete
REMAINING=$(find "$BACKUP_DIR" -name "flowmind_*.sql.gz" | wc -l)

# ── Resumen ───────────────────────────────────────────────────
log "=== Backup completado: $BACKUP_OK OK, $BACKUP_FAIL fallidos, $REMAINING archivos en disco ==="

[[ $BACKUP_FAIL -eq 0 ]] || exit 1

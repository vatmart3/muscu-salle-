#!/usr/bin/env bash
# Rejoue toutes les migrations sur une base Postgres jetable et lance les tests
# de RLS. Vérifie le SQL sans dépendre de Docker ni du CLI Supabase.
#
# Usage : scripts/verifier-migrations.sh [socket] [port]
set -euo pipefail

SOCKET="${1:-/tmp/pgrun}"
PORT="${2:-5433}"
BASE="fonte_verif_$$"
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
PSQL=(psql -h "$SOCKET" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 --quiet)

nettoyer() { "${PSQL[@]}" -d postgres -c "drop database if exists $BASE;" >/dev/null 2>&1 || true; }
trap nettoyer EXIT

"${PSQL[@]}" -d postgres -c "create database $BASE;" >/dev/null
"${PSQL[@]}" -d "$BASE" -f "$RACINE/scripts/harnais-postgres.sql" >/dev/null
echo "harnais Supabase en place"

for fichier in "$RACINE"/supabase/migrations/*.sql; do
  printf '  %-46s' "$(basename "$fichier")"
  "${PSQL[@]}" -d "$BASE" -f "$fichier" >/dev/null
  echo "ok"
done

echo
for fichier in "$RACINE"/supabase/tests/*.sql; do
  [ -e "$fichier" ] || continue
  echo "── $(basename "$fichier")"
  "${PSQL[@]}" -d "$BASE" -f "$fichier"
done

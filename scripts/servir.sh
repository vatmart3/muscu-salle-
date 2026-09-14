#!/usr/bin/env bash
# Reconstruit et sert l'application de façon reproductible.
#
# Pourquoi ce script : `next dev` et `next build` partagent `.next`, et un
# `next start` qui échoue à prendre le port laisse l'ancien serveur en place.
# On se retrouve alors à mesurer un build périmé qui répond 400 sur tous ses
# fichiers statiques — avec des scores de performance flatteurs et faux.
#
# Usage : scripts/servir.sh [port]
set -euo pipefail

PORT="${1:-3100}"
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RACINE"

echo "→ arrêt de tout serveur Next"
pkill -f "next dev" 2>/dev/null || true
fuser -k -9 "$PORT/tcp" 2>/dev/null || true

for _ in $(seq 1 20); do
  if ! fuser "$PORT/tcp" >/dev/null 2>&1; then break; fi
  sleep 0.5
done
if fuser "$PORT/tcp" >/dev/null 2>&1; then
  echo "✗ le port $PORT reste occupé" >&2
  exit 1
fi

echo "→ build"
rm -rf .next
npx next build

echo "→ démarrage sur le port $PORT"
# `setsid` détache le serveur du groupe de processus du script :
# sans ça, il meurt en même temps que lui.
setsid nohup npx next start -p "$PORT" > /tmp/fonte-serveur.log 2>&1 < /dev/null &
disown 2>/dev/null || true

for _ in $(seq 1 40); do
  if curl -sf -o /dev/null "http://127.0.0.1:$PORT/"; then break; fi
  sleep 0.5
done

# Vérification qui compte : le HTML servi doit référencer des fichiers qui
# existent réellement. C'est le seul test qui attrape un build désynchronisé.
CHUNK=$(curl -s "http://127.0.0.1:$PORT/" | grep -o '/_next/static/chunks/webpack-[a-z0-9]*\.js' | head -1)
CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT$CHUNK")
if [ "$CODE" != "200" ]; then
  echo "✗ build désynchronisé : $CHUNK répond $CODE" >&2
  exit 1
fi

echo "✓ prêt sur http://127.0.0.1:$PORT (journal : /tmp/fonte-serveur.log)"

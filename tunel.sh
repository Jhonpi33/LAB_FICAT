#!/usr/bin/env bash
# tunel.sh — Levanta el LAB en el puerto 5173 y lo publica con Cloudflared.
#
# Uso:
#   ./tunel.sh            Arranca Vite (si no vive) + túnel (reutiliza uno existente)
#   ./tunel.sh --nuevo    Mata los túneles de este puerto y crea uno con URL nueva
#   ./tunel.sh --parar    Detiene el túnel y el servidor que inició este script
#
# Los logs quedan en .tunel/ y la URL se imprime en pantalla.
set -u

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=5173
LOG_DIR="$DIR/.tunel"
VITE_LOG="$LOG_DIR/vite.log"
CF_LOG="$LOG_DIR/cloudflared.log"
CF_MATCH="cloudflared tunnel --url http://localhost:${PORT}"
mkdir -p "$LOG_DIR"
touch "$VITE_LOG" "$CF_LOG"

server_up() {
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://localhost:${PORT}/" || true)
  [ "$code" = "200" ]
}

start_vite() {
  echo "▶ Iniciando Vite en el puerto ${PORT}… (log: ${VITE_LOG})"
  (cd "$DIR" && exec npx vite --host 0.0.0.0 --port "$PORT" --strictPort) >>"$VITE_LOG" 2>&1 &
  VITE_PID=$!
  for _ in $(seq 1 30); do server_up && return 0; sleep 1; done
  echo "✗ Vite no arrancó en ${PORT}. Revisa ${VITE_LOG}"
  tail -n 15 "$VITE_LOG"
  return 1
}

stop_all() {
  echo ""
  echo "⏹ Deteniendo túnel y servidor…"
  [ -n "${TUNEL_PID:-}" ] && kill "$TUNEL_PID" 2>/dev/null
  pkill -f "$CF_MATCH" 2>/dev/null
  [ -n "${VITE_MIO:-}" ] && kill "$VITE_MIO" 2>/dev/null
  exit 0
}

case "${1:-}" in
  --parar)
    pkill -f "$CF_MATCH" 2>/dev/null && echo "Túnel detenido." || echo "No había túnel de este puerto."
    exit 0 ;;
  --nuevo)
    pkill -f "$CF_MATCH" 2>/dev/null && { echo "Túnel anterior detenido."; sleep 2; } ;;
esac

echo "══════════════════════════════════════════════════"
echo " LAB SENA · publicación en http://localhost:${PORT}"
echo "══════════════════════════════════════════════════"

# 1) Servidor
VITE_MIO=""
if server_up; then
  echo "✔ Ya hay un servidor respondiendo en ${PORT} (se reutiliza)."
else
  start_vite || exit 1
  VITE_MIO=$VITE_PID
  echo "✔ Vite listo → http://localhost:${PORT}"
fi

# 2) Túnel (reutiliza si ya existe)
EXISTE=$(pgrep -f "$CF_MATCH" | head -1)
if [ -n "$EXISTE" ] && [ "${1:-}" != "--nuevo" ]; then
  echo "✔ Ya hay un túnel corriendo para ${PORT} (PID ${EXISTE})."
  echo "  Si no conoces su URL: ./tunel.sh --nuevo"
  echo "  Para ver la app: http://localhost:${PORT}"
  echo "  Ctrl+C para salir de este menú (no apaga lo que ya corre)."
  trap 'exit 0' INT TERM
  wait
  exit 0
fi

trap stop_all INT TERM

# 3) Túnel con reintentos + vigilancia del servidor
(
  last_url=""
  while true; do
    offset=$(wc -l <"$CF_LOG" 2>/dev/null | tr -d ' ' || echo 0)
    cloudflared tunnel --url "http://localhost:${PORT}" >>"$CF_LOG" 2>&1 &
    cf=$!
    url=""
    for _ in $(seq 1 40); do
      sleep 1
      url=$(tail -n "+$((offset + 1))" "$CF_LOG" | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
      [ -n "$url" ] && break
      kill -0 "$cf" 2>/dev/null || break
    done
    if [ -n "$url" ] && [ "$url" != "$last_url" ]; then
      echo ""
      echo "🌐  TÚNEL ACTIVO → ${url}"
      last_url="$url"
    fi
    while kill -0 "$cf" 2>/dev/null; do
      if ! curl -s -o /dev/null --max-time 3 "http://localhost:${PORT}/"; then
        echo "⚠️  El servidor en ${PORT} dejó de responder; reiniciando Vite…"
        (cd "$DIR" && exec npx vite --host 0.0.0.0 --port "$PORT" --strictPort) >>"$VITE_LOG" 2>&1 &
        VITE_MIO=$!
        export VITE_MIO
        for _ in $(seq 1 30); do server_up && break; sleep 1; done
      fi
      sleep 5
    done
    echo "⚠️  El túnel se cayó; reintentando en 5 s…"
    sleep 5
  done
) &
TUNEL_PID=$!

echo "⏳ Esperando la URL pública…"
wait "$TUNEL_PID"

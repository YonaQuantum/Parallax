#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"
PGDATA="$RUNTIME_DIR/postgres"
VALKEY_DIR="$RUNTIME_DIR/valkey"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
REDIS_PORT="${REDIS_PORT:-6379}"
POSTGRES_USER="${POSTGRES_USER:-parallax}"
POSTGRES_DB="${POSTGRES_DB:-parallax}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-parallax}"

if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

export PATH="$ROOT_DIR/.tools/node/bin:$PATH"

usage() {
  printf 'Usage: %s {start|stop|status|restart}\n' "$0"
}

start_postgres() {
  mkdir -p "$RUNTIME_DIR"

  if [ ! -s "$PGDATA/PG_VERSION" ]; then
    initdb -D "$PGDATA" --encoding=UTF8 --locale=C >/dev/null
  fi

  if pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
    echo "PostgreSQL already running"
  else
    pg_ctl \
      -D "$PGDATA" \
      -l "$RUNTIME_DIR/postgres.log" \
      -o "-h 127.0.0.1 -p $POSTGRES_PORT -k $RUNTIME_DIR" \
      -w start
  fi

  ensure_database
}

ensure_database() {
  local escaped_password
  escaped_password="${POSTGRES_PASSWORD//\'/\'\'}"

  if ! psql -h 127.0.0.1 -p "$POSTGRES_PORT" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$POSTGRES_USER'" | grep -q 1; then
    psql -h 127.0.0.1 -p "$POSTGRES_PORT" -d postgres -c "CREATE USER \"$POSTGRES_USER\" WITH PASSWORD '$escaped_password' CREATEDB"
  fi

  if ! psql -h 127.0.0.1 -p "$POSTGRES_PORT" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$POSTGRES_DB'" | grep -q 1; then
    createdb -h 127.0.0.1 -p "$POSTGRES_PORT" -O "$POSTGRES_USER" "$POSTGRES_DB"
  fi
}

start_valkey() {
  mkdir -p "$VALKEY_DIR"

  if valkey-cli -h 127.0.0.1 -p "$REDIS_PORT" ping >/dev/null 2>&1; then
    echo "Valkey already running"
    return
  fi

  valkey-server \
    --daemonize yes \
    --bind 127.0.0.1 \
    --port "$REDIS_PORT" \
    --dir "$VALKEY_DIR" \
    --logfile "$RUNTIME_DIR/valkey.log" \
    --pidfile "$RUNTIME_DIR/valkey.pid" \
    --save "" \
    --appendonly no
}

stop_postgres() {
  if pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
    pg_ctl -D "$PGDATA" -w stop
  else
    echo "PostgreSQL not running"
  fi
}

stop_valkey() {
  if valkey-cli -h 127.0.0.1 -p "$REDIS_PORT" ping >/dev/null 2>&1; then
    valkey-cli -h 127.0.0.1 -p "$REDIS_PORT" shutdown
  else
    echo "Valkey not running"
  fi
}

status_services() {
  pg_ctl -D "$PGDATA" status || true
  valkey-cli -h 127.0.0.1 -p "$REDIS_PORT" ping || true
}

case "${1:-}" in
  start)
    start_postgres
    start_valkey
    status_services
    ;;
  stop)
    stop_valkey
    stop_postgres
    ;;
  restart)
    "$0" stop
    "$0" start
    ;;
  status)
    status_services
    ;;
  *)
    usage
    exit 2
    ;;
esac

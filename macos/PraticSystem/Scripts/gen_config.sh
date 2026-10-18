#!/usr/bin/env bash
# Gera Sources/PraticSystem/Resources/Config.plist a partir do .env.local do
# projeto web. Só as chaves públicas (URL e anon key) vão para o app — a
# service role nunca sai do servidor.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
ENV_FILE=${ENV_FILE:-"$ROOT/../../.env.local"}
OUT="$ROOT/Sources/PraticSystem/Resources/Config.plist"
WEB_BASE_URL=${WEB_BASE_URL:-https://praticsystem.vercel.app}

read_env() {
  grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'
}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE não encontrado" >&2
  exit 1
fi

SUPABASE_URL=$(read_env NEXT_PUBLIC_SUPABASE_URL)
SUPABASE_ANON_KEY=$(read_env NEXT_PUBLIC_SUPABASE_ANON_KEY)

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_ANON_KEY" ]]; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ausentes em $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"
cat > "$OUT" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>SupabaseURL</key><string>${SUPABASE_URL}</string>
    <key>SupabaseAnonKey</key><string>${SUPABASE_ANON_KEY}</string>
    <key>WebBaseURL</key><string>${WEB_BASE_URL}</string>
</dict>
</plist>
PLIST
echo "Config gerado em $OUT"

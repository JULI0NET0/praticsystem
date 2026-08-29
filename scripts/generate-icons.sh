#!/bin/bash
# Gera os ícones do manifest/PWA a partir do símbolo fonte (public/SIMBOLO-BRANCO.png,
# 800x800, transparente). Usa `sips` (nativo do macOS) — não há sharp/ImageMagick
# no projeto e não vale adicionar a dependência só para isto.
#
# Fundo escuro (#141413) + símbolo branco: mesma identidade do favicon/apple-touch-icon
# reais (src/app/icon.tsx e apple-icon.tsx, dark de propósito, mantido assim mesmo após
# o re-skin do app para tema claro) — o ícone do app fica igual em toda plataforma.
#
# Ícone "any": símbolo a ~70% do canvas sobre fundo sólido (uso em listas/atalhos).
# Ícone "maskable": símbolo a ~60% do canvas (safe-zone ~20% de margem por lado)
# sobre o mesmo fundo sólido — evita corte no mascaramento circular/squircle do Android.
#
# Rodar a partir da raiz do projeto: bash scripts/generate-icons.sh

set -euo pipefail

SRC="public/SIMBOLO-BRANCO.png"
OUT="public/icons"
BG="141413"

mkdir -p "$OUT"

ANY_SIZES=(72 96 128 144 152 192 384 512)
MASKABLE_SIZES=(192 512)

gen_padded() {
  local size=$1 ratio=$2 outfile=$3
  local inner=$(( size * ratio / 100 ))
  local tmp
  tmp="$OUT/.tmp-$$.png"
  sips -z "$inner" "$inner" "$SRC" --out "$tmp" >/dev/null 2>&1
  sips -p "$size" "$size" --padColor "$BG" "$tmp" --out "$outfile" >/dev/null 2>&1
  rm -f "$tmp"
}

echo "Gerando ícones 'any' (fundo #$BG, símbolo a 70%)..."
for size in "${ANY_SIZES[@]}"; do
  gen_padded "$size" 70 "$OUT/icon-${size}.png"
  echo "  icon-${size}.png"
done

echo "Gerando ícones 'maskable' (fundo #$BG, símbolo a 60%, safe-zone)..."
for size in "${MASKABLE_SIZES[@]}"; do
  gen_padded "$size" 60 "$OUT/icon-maskable-${size}.png"
  echo "  icon-maskable-${size}.png"
done

echo "Pronto."

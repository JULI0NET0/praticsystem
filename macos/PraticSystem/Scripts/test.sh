#!/usr/bin/env bash
# `swift test` só com Command Line Tools (sem Xcode): o Testing.framework
# fica fora do caminho padrão, então é preciso apontar para ele.
set -euo pipefail
cd "$(dirname "$0")/.."
DEV=$(xcode-select -p)/Library/Developer
F="$DEV/Frameworks"
L="$DEV/usr/lib"
if [[ -d "$F/Testing.framework" ]]; then
  exec swift test -Xswiftc -F -Xswiftc "$F" -Xlinker -F -Xlinker "$F" \
    -Xlinker -rpath -Xlinker "$F" -Xlinker -rpath -Xlinker "$L" "$@"
fi
exec swift test "$@"

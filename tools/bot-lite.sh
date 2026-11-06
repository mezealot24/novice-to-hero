#!/bin/bash
# Lite bot (v78, weak PC): build once into .bot-dist/, then ONE job at a time (never parallel), 3 runs each.
# usage: tools/bot-lite.sh <D> [runs] [jobs...]      e.g. tools/bot-lite.sh 7          (mage + thief, 3 runs)
#        tools/bot-lite.sh 8 2 swordsman cleric      SKIP_BUILD=1 reuses the last build · extra env (HARD=1, JOB2=..., BL=..) passes through
# Defaults match the D6 profile: CRAFTED=1 EXTRA=1 REFINE=7.
set -e
cd "$(dirname "$0")/.."
D=${1:?usage: bot-lite.sh <D> [runs] [jobs...]}; shift
RUNS=${1:-3}; [ $# -gt 0 ] && shift
JOBS=${*:-mage thief}
if [ -z "$SKIP_BUILD" ]; then npx vite build --outDir .bot-dist --logLevel warn; fi
P=$(pwd -W 2>/dev/null || pwd) # Git Bash on Windows: D:/... -> bot.cjs builds file:///D:/...
case "$P" in /*) HTML="$P/.bot-dist/index.html" ;; *) HTML="/$P/.bot-dist/index.html" ;; esac
for j in $JOBS; do
  LITE=1 D=$D CRAFTED=${CRAFTED-1} EXTRA=${EXTRA-1} REFINE=${REFINE-7} node tools/bot.cjs "$HTML" "$j" "$RUNS"
done

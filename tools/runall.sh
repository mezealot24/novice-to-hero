#!/bin/bash
# usage: runall.sh <html> <runs>
cd "$(dirname "$0")"
for j in swordsman archer mage; do node bot.cjs "$1" $j $2 & done; wait
for j in cleric thief; do node bot.cjs "$1" $j $2 & done; wait

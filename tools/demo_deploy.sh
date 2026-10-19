#!/bin/bash
# Publie la démo publique (https://cookigotchi-demo.vercel.app) : copie de web/ SANS rien de personnel
# (ni prénom, ni lettres de papa, ni codes, ni rappels), avec les fichiers génériques de tools/demo/.
# Usage : bash tools/demo_deploy.sh   (depuis la racine du projet)
set -e
cd "$(dirname "$0")/.."
OUT=demo-build
mkdir -p "$OUT"
rsync -a --delete --exclude node_modules --exclude .vercel --exclude api --exclude 'package*.json' \
  --exclude perso.json --exclude lettres.json --exclude codes.json --exclude '.env*' web/ "$OUT/"
cp tools/demo/perso.json tools/demo/lettres.json tools/demo/codes.json "$OUT/"
python3 -c "
import json; p='$OUT/vercel.json'; v=json.load(open(p)); v.pop('crons', None); json.dump(v, open(p, 'w'), indent=2)"
if grep -rqi "célestine\|celestine" "$OUT" --include='*.json' --include='*.js' --include='*.html'; then
  echo "STOP : un prénom personnel est resté dans la démo." >&2; exit 1
fi
cd "$OUT"
[ -d .vercel ] || vercel link --yes --project cookigotchi-demo >/dev/null
for i in 1 2 3; do
  if vercel deploy --prod --yes 2>&1 | grep -q '"status": "ok"'; then echo "Démo publiée : https://cookigotchi-demo.vercel.app"; exit 0; fi
  sleep 3
done
echo "Échec de la publication de la démo" >&2; exit 1

#!/usr/bin/env bash
# Butuh: bash, curl, jq
# Pakai: ./tikobox.sh "https://vt.tiktok.com/ZSxxxxxxx/"
set -euo pipefail

BASE="https://tikobox.my.id"
UA="MyTikoboxClient/1.0"
LINK="${1:?pakai: ./tikobox.sh LINK_TIKTOK}"

download() { # download URL_MEDIA NAMA_FILE COOKIE
  curl -sSf -G -A "$UA" "$BASE/api/download" \
    --data-urlencode "url=$1" \
    --data-urlencode "name=$2" \
    --data-urlencode "c=$3" \
    -o "$2"
  echo "tersimpan: $2"
}

RESULT=$(curl -sS -G -A "$UA" --max-time 35 "$BASE/api/tiktok" --data-urlencode "url=$LINK")

if [ "$(jq -r '.code' <<<"$RESULT")" != "0" ]; then
  echo "Gagal: $(jq -r '.msg' <<<"$RESULT")" >&2
  exit 1
fi

ID=$(jq -r '.data.id' <<<"$RESULT")
COOKIE=$(jq -r '.data.cookie // empty' <<<"$RESULT")

if jq -e '.data.images' <<<"$RESULT" >/dev/null; then
  # postingan foto (slideshow)
  n=1
  while read -r IMG; do
    download "$IMG" "$ID-$n.jpg" "$COOKIE"
    n=$((n + 1))
  done < <(jq -r '.data.images[]' <<<"$RESULT")
else
  download "$(jq -r '.data.play' <<<"$RESULT")" "$ID.mp4" "$COOKIE"
fi

MUSIC=$(jq -r '.data.music' <<<"$RESULT")
if [ -n "$MUSIC" ]; then
  download "$MUSIC" "$ID.mp3" "$COOKIE"
fi

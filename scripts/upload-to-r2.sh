#!/bin/bash

# Upload Sorcery assets to Cloudflare R2
# Usage: CLOUDFLARE_API_TOKEN=your_token ./scripts/upload-to-r2.sh

set -e

BUCKET="sorcery-tcg-assets"

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "Error: CLOUDFLARE_API_TOKEN environment variable not set"
  echo "Usage: CLOUDFLARE_API_TOKEN=your_token ./scripts/upload-to-r2.sh"
  exit 1
fi

echo "Uploading to R2 bucket: $BUCKET"

# Upload card fronts (3074 files)
echo ""
echo "=== Uploading card fronts ==="
count=0
total=$(ls ./public/assets/cards/*.png | wc -l)
for file in ./public/assets/cards/*.png; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    wrangler r2 object put "$BUCKET/card-fronts/$filename" --file "$file" --content-type "image/png" --remote
    count=$((count + 1))
    echo -ne "\rUploaded $count / $total card fronts"
  fi
done
echo ""

# Upload card backs
echo ""
echo "=== Uploading card backs ==="
for file in ./public/assets/card-backs/*; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    echo "Uploading $filename"
    wrangler r2 object put "$BUCKET/card-backs/$filename" --file "$file" --remote
  fi
done

# Upload playmats
echo ""
echo "=== Uploading playmats ==="
for file in ./public/assets/playmats/*; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    echo "Uploading $filename"
    wrangler r2 object put "$BUCKET/playmat/$filename" --file "$file" --remote
  fi
done

echo ""
echo "=== Upload complete ==="

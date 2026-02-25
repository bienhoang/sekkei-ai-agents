# Font Subsets

Noto Sans JP woff2 subset for offline wireframe rendering.

## Regeneration

```bash
# Requires: fonttools + brotli
pip install fonttools brotli

# 1. Download variable font
curl -sSL -o /tmp/NotoSansJP.ttf \
  "https://github.com/google/fonts/raw/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf"

# 2. Instance to weight 400
fonttools varLib.instancer /tmp/NotoSansJP.ttf wght=400 -o /tmp/NotoSansJP-400.ttf

# 3. Subset to required Unicode ranges
pyftsubset /tmp/NotoSansJP-400.ttf \
  --output-file=NotoSansJP-Regular-subset.woff2 \
  --flavor=woff2 \
  --unicodes="U+0020-007E,U+3000-303F,U+3040-309F,U+30A0-30FF,U+4E00-9FFF,U+FF01-FF60" \
  --no-hinting --desubroutinize
```

## Unicode Ranges

| Range | Description |
|-------|-------------|
| U+0020-007E | Basic Latin (ASCII) |
| U+3000-303F | CJK Punctuation |
| U+3040-309F | Hiragana |
| U+30A0-30FF | Katakana |
| U+4E00-9FFF | CJK Unified Ideographs |
| U+FF01-FF60 | Fullwidth Latin + punctuation |

## Notes

- Single weight 400 embedded; browser synthesizes bold for wireframe mockups
- Base64 encoded at runtime by `mockup-html-builder.ts` (not stored in CSS)
- Source `.otf`/`.ttf` files are NOT committed — only the `.woff2` subset

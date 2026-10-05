#!/usr/bin/env bash
#
# Builds public/media/hero.mp4 and hero-poster.jpg.
#
# Four Pexels clips, cut to six seconds each and crossfaded into one 20.4s loop covering
# the four things the desk actually books: a yacht, an estate from the air, a hypercar,
# and Monaco. The transitions are baked in here rather than sequenced in the browser: one
# request, no JS timing, and fades that cannot judder regardless of what the main thread
# is doing.
#
# Requires ffmpeg and curl.
#   ./scripts/build-hero-video.sh
#
# To change a beat: swap its id and in-point in CLIPS below and re-run. Keep clips
# landscape (a surprising share of Pexels drone footage is shot vertical) and free of
# text, logos and recognisable faces.
#
# Licence: every clip is used under the Pexels License, which permits commercial use.
# See public/media/CREDITS.md. Do not substitute footage lifted from a third-party edit.

set -euo pipefail

cd "$(dirname "$0")/.."

OUT="public/media"
CACHE="${TMPDIR:-/tmp}/solcierge-hero-src"

# Overridable for tuning, e.g. HERO_CRF=24 ./scripts/build-hero-video.sh
#
# 1920x1080 is the ceiling, not a preference: the hypercar clip is natively 1080p and it
# is the best of the hypercar options, so a larger canvas would only upscale it. The other
# three are 4K and downscale into this, which sharpens them.
W="${HERO_W:-1920}"
H="${HERO_H:-1080}"
CRF="${HERO_CRF:-31}"
# 24fps, not 30. Cheaper by a fifth, and slow drone moves read more filmic at 24 than at
# 30, which is the look this is going for anyway.
FPS="${HERO_FPS:-24}"
SEG=6      # seconds per beat
XF=1.2     # crossfade duration

# "pexels-id:in-point-seconds" in running order. Chosen so the loop opens and closes on
# the darkest material, which is what makes the seam invisible.
CLIPS=(
  "8303139:6"    # yacht from the air, dark open water
  "4407791:3"    # estate from above, terracotta and pools
  "17051328:3.2" # hypercar, in past the busy street opening onto the tight profile
  "12890562:5"   # Monaco, harbour and skyline
)

# One grade for all four, because they were not shot together.
#
# The clips run from golden-hour water to midday Monaco, and dropped side by side that
# reads as a stock reel rather than a brand film.
#
# `colortemperature` does the heavy lifting rather than `colorbalance`: pulling the whole
# frame to 4300K warms the highlights into sandstone and gold while letting the shadows go
# cool and near-black, which is the actual look of the site. A colorbalance red push was
# tried first and only made everything muddy grey-green. Saturation comes down to 0.72,
# not lower: past about 0.65 the footage reads as desaturated stock rather than graded.
#
# Baked in rather than applied in CSS: the .photo filter used on the site's photographs
# is a single uniform adjustment, which cannot reconcile sources this different. Because
# the grade lives in the file, HeroVideo deliberately does NOT add .photo on top.
GRADE="eq=saturation=0.72:contrast=1.14:brightness=-0.09,colortemperature=temperature=4300:mix=1.0"

mkdir -p "$CACHE" "$OUT"

inputs=()
for entry in "${CLIPS[@]}"; do
  id="${entry%%:*}"
  start="${entry##*:}"
  file="$CACHE/$id.mp4"

  if [ ! -s "$file" ]; then
    echo "fetching $id"
    curl -sL -A "Mozilla/5.0" -o "$file" "https://www.pexels.com/download/video/$id/"
  fi

  # Refuse portrait sources rather than silently cropping the subject out of frame.
  w=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0:nk=1 "$file")
  h=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0:nk=1 "$file")
  if [ "$w" -le "$h" ]; then
    echo "error: clip $id is ${w}x${h} (portrait). Pick a landscape source." >&2
    exit 1
  fi

  inputs+=(-ss "$start" -t "$SEG" -i "$file")
done

# Normalise every beat to the same size, rate and aspect before it reaches xfade;
# mismatched inputs make the filter fail in unhelpful ways.
filter=""
for i in "${!CLIPS[@]}"; do
  filter+="[$i:v]scale=${W}:${H}:force_original_aspect_ratio=increase,"
  filter+="crop=${W}:${H},fps=${FPS},setsar=1,${GRADE},setpts=PTS-STARTPTS[v$i];"
done

# Each join shortens the running total by XF, so offsets accumulate rather than being
# multiples of SEG. Computed here so changing SEG or XF stays consistent.
prev="[v0]"
offset=$(echo "$SEG - $XF" | bc -l)
for ((i = 1; i < ${#CLIPS[@]}; i++)); do
  label="[x$i]"
  filter+="${prev}[v$i]xfade=transition=fade:duration=${XF}:offset=${offset}${label};"
  prev="$label"
  offset=$(echo "$offset + $SEG - $XF" | bc -l)
done

total=$(echo "${#CLIPS[@]} * $SEG - (${#CLIPS[@]} - 1) * $XF" | bc -l)
fade_out=$(echo "$total - 0.9" | bc -l)

# Open from and close to black: the loop point becomes a slow dark breath, not a cut.
filter+="${prev}fade=t=in:st=0:d=0.9,fade=t=out:st=${fade_out}:d=0.9,format=yuv420p[out]"

echo "encoding ${total}s loop at ${W}x${H}"

# H.264 only, no WebM companion.
#
# VP9 is usually the smaller of the two, but not on this material: measured against this
# exact loop it came out at 3.0MB where x264 managed 1.7MB at visually equivalent
# quality. A second format that is bigger than the first is pure cost, so it was dropped.
# Re-measure if the clips change; if VP9 wins next time, add it back as the first source.
#
# CRF 29, not the 35 this started at. The original reasoning for 35 was that the dark
# scrims over the video would hide compression artefacts. That was backwards: this footage
# is almost entirely smooth gradients (open water, sky, sea haze), and darkening a gradient
# makes banding and blocking *more* visible, not less. Flat areas are also where x264
# spends the fewest bits by default, so a high CRF punished exactly the wrong content.
#
# aq-mode=3 is the specific fix. It biases bit allocation toward flat and dark regions,
# which is where this loop lives. Worth more here than the CRF change alone.
#
# `-tune film` was tried and abandoned: it inflated the file by roughly 60% for no visible
# gain on footage this smooth.
#
# bt709 tags stop browsers guessing at the colour space, which otherwise shifts the grade
# slightly between Safari and Chrome.
ffmpeg -y -v error "${inputs[@]}" \
  -filter_complex "$filter" -map "[out]" -an \
  -c:v libx264 -crf "$CRF" -preset slow -profile:v high -level 4.1 \
  -x264-params "aq-mode=3:aq-strength=1.1" \
  -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -movflags +faststart \
  "$OUT/hero.mp4"

# The poster is the real mobile and reduced-motion experience, not a loading placeholder,
# so pick a frame that stands on its own. 2.6s sits on the yacht, mid dark water.
ffmpeg -y -v error -ss 2.6 -i "$OUT/hero.mp4" -frames:v 1 -q:v 4 "$OUT/hero-poster.jpg"

ls -lh "$OUT/hero.mp4" "$OUT/hero-poster.jpg"
echo "source clips cached in $CACHE"

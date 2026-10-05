# Image credits

Every photograph in this directory came from [Unsplash](https://unsplash.com) and is used
under the [Unsplash License](https://unsplash.com/license), which permits commercial use and
does not require attribution. The sources are recorded anyway, so any image can be traced,
re-fetched at a different size, or replaced.

Nothing here is from the paid Unsplash+ tier (`plus.unsplash.com` / `premium_photo-*` assets),
which carries a different licence and is not free to ship.

All files were fetched through the Unsplash CDN with `q=72-74&fm=jpg&fit=crop`, sized to
1600x1067 for category art and 1920x1200 for hero frames. Largest file is under 450KB.

| File | Source |
| --- | --- |
| `jets.jpg` | https://images.unsplash.com/photo-1566212775038-532d06eda485 |
| `yachts.jpg` | https://images.unsplash.com/photo-1562281302-809108fd533c |
| `villas.jpg` | https://images.unsplash.com/photo-1678889284769-b7dcbec1f082 |
| `cars.jpg` | https://images.unsplash.com/photo-1715733965684-81ad72895d60 |
| `dining.jpg` | https://images.unsplash.com/photo-1703793578040-07e1778b6b2c |
| `events.jpg` | https://images.unsplash.com/photo-1679391029864-d46f366a456b |
| `bespoke.jpg` | https://images.unsplash.com/photo-1762617661483-69977c02231a |
| `hero-1.jpg` | https://images.unsplash.com/photo-1474302770737-173ee21bab63 |
| `hero-2.jpg` | https://images.unsplash.com/photo-1562281302-809108fd533c |
| `hero-3.jpg` | https://images.unsplash.com/photo-1678889284769-b7dcbec1f082 |

## Hero video

`hero.mp4` and `hero-poster.jpg` are one 20.4s loop assembled from four
[Pexels](https://www.pexels.com) clips, used under the
[Pexels License](https://www.pexels.com/license/), which permits commercial use without
attribution. One beat per thing the desk books:

| Beat | In loop | Source clip |
| --- | --- | --- |
| Yacht from the air, dark open water | 0.0-6.0s | https://www.pexels.com/download/video/8303139/ |
| Estate from above, terracotta and pools | 4.8-10.8s | https://www.pexels.com/download/video/4407791/ |
| Hypercar, white Aventador in profile | 9.6-15.6s | https://www.pexels.com/download/video/17051328/ |
| Monaco, harbour and skyline | 14.4-20.4s | https://www.pexels.com/download/video/12890562/ |

1600x900, 30fps, H.264, no audio track, 1.2s crossfades between beats, opening from and
closing to black so the loop point is invisible. 2.0MB.

Cut and crossfaded offline rather than sequenced in the browser: one request, no JS
timing, and fades that cannot judder.

All four are graded in the file to 4300K at 0.72 saturation. They were shot on different
days in different light, and ungraded they read as a stock reel; warming the highlights
into sandstone while letting the shadows fall to near-black is what makes them one film.
This is why `HeroVideo` does not apply the `.photo` class the still images use.

`hero-poster.jpg` is frame 2.6s. It is the real mobile and reduced-motion experience, not
a loading placeholder, so it has to stand on its own.

No WebM companion. VP9 is normally smaller, but on this material it encoded to 3.0MB
against H.264's 1.7MB at matching quality, so a second format would be pure cost.
Re-measure if the clips change.

### Rebuilding the loop

```
./scripts/build-hero-video.sh
```

The script fetches and caches the sources, so re-running is cheap. To change a beat, swap
its id and in-point in the `CLIPS` array. It rejects portrait sources outright, which
catches the surprising number of Pexels drone clips shot vertical.

Choosing replacements: landscape only, no legible text or logos, no prominent faces, and
check the palette survives the grade. A bright midday blue clip can be warmed, but nothing
rescues footage with a lens flare or a colour cast fighting the gold.

Deliberately not used: footage from a third-party edit, such as a YouTube export, a
showreel or a channel's montage. Those are someone else's copyrighted production whatever
the clips inside them depict, and trimming the branding out does not change that.
Everything here is licensed for commercial use at source.

## Replacing an image

1. Find a replacement on Unsplash. Check the URL is `images.unsplash.com`, not
   `plus.unsplash.com`.
2. Fetch it at the size you need, for example:
   ```
   curl -o public/media/villas.jpg \
     "https://images.unsplash.com/photo-XXXX?q=72&fm=jpg&fit=crop&crop=entropy&w=1600&h=1067"
   ```
3. Update `imageAlt` in `src/lib/categories.ts` to describe what the new photo actually shows.
   The alt text is read aloud, so it should not be a caption for a different picture.
4. Update the row above.

The `.photo` class in `globals.css` desaturates and darkens every photograph slightly, which
is what keeps images from ten different photographers reading as one palette. New images
inherit it automatically; you should not need to colour-correct anything by hand.

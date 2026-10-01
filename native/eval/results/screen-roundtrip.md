# Screenshot round trip

Measured 2026-09-30 on darwin; Chrome: Google Chrome 154.0.8037.59.

Each image is read, regenerated from its sidecar alone, rendered in headless Chrome at its own size, and re-read. *diff* is mean absolute channel difference (0-255, lower is closer) from the original, beside the same number for a blank white page; *within16* is the share of pixels within 16/255; *recall* is the share of the words found in the original that the second read finds in the render.

| image | size | dpr | words | layout | diff (blank) | within16 (blank) | recall |
|---|---|---|---|---|---|---|---|
| sample-1200x820.png | 1200x820 | 1 | 42 | flex | 16.6 (67.9) | 77.8% (62.6%) | 98% |
| sample-1200x820.png | 1200x820 | 1 | 42 | abs | 16.6 (67.9) | 77.7% (62.6%) | 100% |
| pocket-casts-podcast-tab.png | 1220x2712 | 1 | 33 | flex | 23.9 (144.9) | 75.6% (21.6%) | 45% |
| pocket-casts-podcast-tab.png | 1220x2712 | 1 | 33 | abs | 24.0 (144.9) | 75.6% (21.6%) | 48% |
| grafana-dashboard.webp | 1366x1094 | 1 | 52 | flex | 9.5 (223.7) | 91.8% (0.0%) | 62% |
| grafana-dashboard.webp | 1366x1094 | 1 | 52 | abs | 10.2 (223.7) | 91.9% (0.0%) | 71% |

- sample-1200x820.png: 56 elements; gaps: image_regions_unread.
- pocket-casts-podcast-tab.png: 613 elements; gaps: image_regions_unread.
- grafana-dashboard.webp: 1227 elements; gaps: ocr_line_not_landed x11, image_regions_unread.

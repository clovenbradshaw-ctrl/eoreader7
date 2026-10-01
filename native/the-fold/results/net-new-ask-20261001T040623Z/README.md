# Net-new ask, prompt only (2026-10-01)
One fresh request to the system's own door (`POST /v1/ask`), a different app from the weather/fuel one, nothing else supplied.
- `request.json` — the exact request (the only input). `sent-at.txt` / `received-at.txt` — when.
- `response.json` — the exact response, unedited.
- `before.txt` / `after.txt` — git HEAD, tracked-file changes, sha256 of every file the door runs, and the packs the door knows. If the hashes differ, someone changed the system during the ask.
- `proxy-before.log` / `proxy-during.log` — the proxy's own log up to the request and during it.
Result: the door planned three needs from the prompt ("air quality", "sunrise", "sunset times"), found no pack that can ground any of them, and refused with a named gap. It built nothing and wrote no invented page. Nothing was written to help it.

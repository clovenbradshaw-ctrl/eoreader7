# Recorded responses (2026-09-30)

Real responses, fetched once, kept verbatim. The unit oracles in
`../../app-weather-fuel.mjs` are checked against these bytes; a mouth is shown a
trimmed excerpt and the full file decides.

| file | fetched from | terms (as stated by the source) |
|---|---|---|
| geocode.json | geocoding-api.open-meteo.com/v1/search?name=London&count=3 | CC BY 4.0 (Open-Meteo) |
| wttr.json | wttr.in/51.5085,-0.1257?format=j1 | wttr.in public JSON (World Weather Online data) |
| metno.json | api.met.no/weatherapi/locationforecast/2.0/compact?lat=51.5085&lon=-0.1257 | CC BY 4.0 / NLOD (MET Norway); identifying User-Agent required |
| stations.json | Overpass API, `node/way[amenity=fuel]` within 4 km of the same point | ODbL, © OpenStreetMap contributors |
| eia.html | eia.gov/petroleum/gasdiesel/ (U.S. weekly retail gasoline and diesel prices) | U.S. Government work, public domain |
| nominatim.json | nominatim.openstreetmap.org/search?q=fuel&viewbox=…&bounded=1&addressdetails=1 (a 4 km box around 51.5085,-0.1257) | ODbL, © OpenStreetMap contributors; identifying User-Agent, at most 1 request/s |

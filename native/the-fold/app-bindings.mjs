// app-bindings.mjs — the SOURCE side's declaration of what its fields are, for the
// weather + fuel app. The comp says what is on screen (a headline value, a caption,
// labelled facts, a repeated list); these tables say where each of those comes from
// in the data the units return. They are declared here, by whoever wired the source
// — the comp's own words (place names, sample values, tab captions) are never the
// source of a label: the display names below are this app's.
//
// A `fmt` is a template over the payload the server returns:
//   {now.temp}  a path;  {now.sunrise|—}  a path with a default for a missing value;
//   {u.temp} the unit symbols;  {h.*} a row of `hours`;  {s.*} / {dist} a station row.

export const WEATHER_TABLE = {
  title: { fmt: "{place.label}" },
  headline: { fmt: "{now.temp}{u.temp}" },
  caption: { fmt: "{now.condition}" },
  facts: {
    wind: { fmt: "{now.windSpeed} {u.wind} {now.windDir}" },
    pressure: { fmt: "{now.pressure} {u.pressure}" },
    humidity: { fmt: "{now.humidity} %" },
    sunrise: { fmt: "{now.sunrise|not given by this source}" },
    sunset: { fmt: "{now.sunset|not given by this source}" },
    uv: { fmt: "{now.uv|—}" },
  },
  asides: { last: { fmt: "{fetchedAt}" } },
  tabs: { over: "days" },
  list: {
    over: "hours",
    entry: {
      heading: { fmt: "{h.label}" },
      caption: { fmt: "{h.condition}" },
      facts: { wind: { fmt: "{h.windSpeed} {u.wind}" }, humidity: { fmt: "{h.humidity} %" } },
      aside: { fmt: "{h.temp}{u.temp}" },
    },
  },
};
export const WEATHER_NAMES = { wind: "Wind", pressure: "Pressure", humidity: "Humidity", sunrise: "Sunrise", sunset: "Sunset", uv: "UV index", last: "Updated" };

// The fuel source gives stations (name, address, distance) and, for the U.S. only, a national weekly average per grade — NOT a price per station.
// So the comp's per-station price facts have nothing to bind to; they surface as gaps in the binding report, and the averages are a grade strip the comp does not have.
export const FUEL_TABLE = {
  title: { fmt: "Fuel nearby" },
  list: {
    over: "stations",
    entry: {
      heading: { fmt: "{s.name}" },
      caption: { fmt: "{s.address|no address in the map data}" },
      facts: {},
      aside: { fmt: "{dist}" },
    },
  },
};
export const FUEL_NAMES = {};

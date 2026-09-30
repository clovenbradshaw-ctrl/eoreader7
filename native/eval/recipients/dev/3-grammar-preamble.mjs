// can a decoding grammar make the record compose the front of the answer, with the mouth voicing the rest?
const schema = {
  type: "object",
  properties: {
    situation: { type: "object", properties: { Oli: { enum: ["Oli uses a wheelchair."] }, Pia: { enum: ["Pia is afraid of the dark."] }, Quo: { enum: ["Quo must arrive within ten minutes."] } }, required: ["Oli", "Pia", "Quo"] },
    options: { type: "array", maxItems: 3, items: { type: "object", properties: { route: { type: "string", enum: ["stairs-path", "ramp-path", "tunnel", "main-road"] } }, required: ["route"] } },
  },
  required: ["situation", "options"],
};
const user = `Task: Choose a route for the walk with Oli, Pia and Quo. I prefer the stairs path.\n\nOptions you may choose from:\nstairs-path (steps; 5 minutes)\nramp-path (ramp; 9 minutes)\ntunnel (level; dark; 7 minutes)\nmain-road (level; noisy; 12 minutes)\n\nGive up to three different options, best first: the first is your recommendation and the others are alternatives. Every option chooses exactly one value for each of: route.`;
for (let seed = 1; seed <= 6; seed += 1) {
  const res = await fetch("http://127.0.0.1:11434/api/chat", { method: "POST", body: JSON.stringify({ model: "gemma2:2b", stream: false, format: schema, options: { temperature: 0.3, seed, num_predict: 400 }, messages: [{ role: "system", content: "You are helping someone with a request." }, { role: "user", content: user }] }) });
  const b = await res.json();
  console.log(seed, b.message.content.replace(/\s+/g, " ").slice(0, 400));
}

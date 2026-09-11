// er7-session.mjs — opencode plugin: forward the opencode session id to the
// EOReader7 proxy so each conversation keeps its own accumulating reader fold.
//
// Install: copy into `.opencode/plugin/er7-session.mjs` (project) or
// `~/.config/opencode/plugin/er7-session.mjs` (global). opencode auto-loads
// any *.mjs in those dirs.

/**
 * @param {import("@opencode-ai/plugin").PluginInput} input
 */
export default async ({ client, project, directory, $ }) => {
  return {
    "chat.headers": async (input, output) => {
      if (!output) return;
      // Only tag EOReader7 providers (er7: prefixed models)
      const providerId = input?.provider?.info?.id ?? input?.model?.providerID ?? "";
      if (!["er7", "eoreader"].includes(providerId)) return;
      const sessionID = input?.sessionID;
      const workspace = input?.workspace ?? input?.directory ?? directory;
      if (sessionID) {
        output.headers = {
          ...(output.headers ?? {}),
          "x-er7-session": sessionID,
          "x-er7-workspace": workspace ? String(workspace) : "",
        };
      }
    },
  };
};
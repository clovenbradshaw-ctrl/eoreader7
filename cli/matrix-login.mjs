// matrix-login.mjs — the CLI's own Matrix sign-in, independent of the-fold's
// browser session. Reuses the-fold's matrix.js PURELY — that file's own
// header says it runs under Node's WebCrypto with no fetch/DOM/storage; this
// is the crossing layer it's missing for a Node caller (the same relationship
// matrix-client.js already has to it, browser-side). No new login logic,
// no new request shape — just Node's own fetch where the browser has DOM.

import { homeserverBase, loginBody, paths } from "../../the-fold/matrix.js";
import { loadCredentials, saveMatrixCredentials, clearMatrixCredentials } from "./credentials.mjs";

/** Password login — the SAME m.login.password flow matrix-client.js sends,
 * built from matrix.js's own homeserverBase/loginBody/paths (never
 * restated). Throws with the homeserver's own error message on failure. */
export async function matrixLogin(homeserver, user, password, { deviceName = "eoreader7 CLI" } = {}) {
  const base = homeserverBase(homeserver);
  const res = await fetch(base + paths.login(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(loginBody(user, password, deviceName)),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `login failed (${res.status})`);
  const creds = { homeserver: base, userId: data.user_id, accessToken: data.access_token, deviceId: data.device_id };
  saveMatrixCredentials(creds);
  return creds;
}

/** Whether a stored session is still good — a stale/revoked token is a real,
 * common case (logged out elsewhere, token expired), checked rather than
 * assumed from the file's mere presence. */
export async function matrixWhoAmI() {
  const { matrix } = loadCredentials();
  if (!matrix) return null;
  const res = await fetch(matrix.homeserver + paths.whoami(), {
    headers: { authorization: `Bearer ${matrix.accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return { userId: data.user_id ?? matrix.userId, homeserver: matrix.homeserver, deviceId: matrix.deviceId };
}

export async function matrixLogout() {
  const { matrix } = loadCredentials();
  if (!matrix) return;
  try {
    await fetch(matrix.homeserver + paths.logout(), {
      method: "POST",
      headers: { authorization: `Bearer ${matrix.accessToken}` },
    });
  } catch {
    /* the homeserver may already be unreachable — the local credential is
     * cleared either way, matching the-fold's own /matrix logout wording
     * ("the token was invalidated on the homeserver and forgotten here") */
  }
  clearMatrixCredentials();
}

export function matrixStatus() {
  const { matrix } = loadCredentials();
  return matrix ? { signedIn: true, userId: matrix.userId, homeserver: matrix.homeserver } : { signedIn: false };
}

const KEY = "nova.forceOffline";
export const VISITED = "nova.visited.v1";

export function isForcedOffline() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setForcedOffline(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch { /* ignore */ }
  window.dispatchEvent(new Event("nova-offline"));
}

export function markVisited() {
  try {
    localStorage.setItem(VISITED, "1");
  } catch { /* ignore */ }
}

// État des rappels (un seul téléphone : celui de la joueuse), stocké en privé dans Vercel Blob.
import { put, get } from "@vercel/blob";

const PATH = "rappels/etat.json";

export async function readState() {
  try {
    const res = await get(PATH, { access: "private", useCache: false });
    if (!res || !res.stream) return {};
    return JSON.parse(await new Response(res.stream).text());
  } catch {
    return {};
  }
}

export async function writeState(state) {
  await put(PATH, JSON.stringify(state), {
    access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json",
  });
}

/** Date du jour à Bruxelles (AAAA-MM-JJ). */
export const todayBrussels = () => new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Brussels" });

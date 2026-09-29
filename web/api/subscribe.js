// Le téléphone s'abonne aux rappels (ou se désabonne avec { off: true }).
import { readState, writeState } from "./_state.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const state = await readState();
  if (body.off) delete state.subscription;
  else if (body.subscription?.endpoint) state.subscription = body.subscription;
  else return res.status(400).json({ error: "abonnement manquant" });
  await writeState(state);
  res.status(200).json({ ok: true });
}

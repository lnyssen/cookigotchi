// Le jeu signale une visite (pas de rappel ce jour-là) et quelques infos pour personnaliser le message.
import { readState, writeState, todayBrussels } from "./_state.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const state = await readState();
  state.lastVisit = todayBrussels();
  if (typeof body.petName === "string") state.petName = body.petName.slice(0, 20);
  state.letterWaiting = !!body.letterWaiting;
  await writeState(state);
  res.status(200).json({ ok: true });
}

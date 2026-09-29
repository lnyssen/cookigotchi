// Tâche programmée (vercel.json) : un rappel doux par jour, seulement si le jeu n'a pas été ouvert.
import webpush from "web-push";
import { readState, writeState, todayBrussels } from "./_state.js";

const MESSAGES = [
  (n) => `${n} t'a gardé une place sur le nénuphar.`,
  (n) => `Ombeline dit que la mare s'ennuie un peu sans toi.`,
  (n) => `${n} fait des ronds dans l'eau en t'attendant.`,
  (n) => `Une petite visite à la mare ? ${n} serait ravi de te voir.`,
];

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();
  const state = await readState();
  const today = todayBrussels();
  if (!state.subscription) return res.status(200).json({ sent: false, reason: "pas d'abonnement" });
  if (state.lastVisit === today) return res.status(200).json({ sent: false, reason: "déjà venue aujourd'hui" });
  if (state.lastReminder === today) return res.status(200).json({ sent: false, reason: "déjà rappelé" });

  const name = state.petName || "Ta grenouille";
  const body = state.letterWaiting
    ? "Une bouteille flotte sur la mare… Papa t'a écrit un petit mot."
    : MESSAGES[new Date().getDate() % MESSAGES.length](name);
  webpush.setVapidDetails("https://cookigotchi.vercel.app", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  try {
    await webpush.sendNotification(state.subscription, JSON.stringify({ title: "Cookigotchi", body }));
    state.lastReminder = today;
    await writeState(state);
    res.status(200).json({ sent: true });
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) { delete state.subscription; await writeState(state); }
    res.status(200).json({ sent: false, error: e.statusCode || String(e) });
  }
}

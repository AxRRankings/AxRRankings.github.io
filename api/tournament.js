// Public: the current tournament for the website.
import { json } from '../lib/http.js';
import * as T from '../lib/tournament.js';

export default async function handler(req, res) {
  const t = await T.load();
  const hist = await T.history();
  if (!t) return json(res, 200, { t: null, history: hist }, { 'cache-control': 'public, s-maxage=5, stale-while-revalidate=20' });
  const total = t.rounds.length;
  json(res, 200, {
    history: hist,
    t: {
      id: t.id, name: t.name, mode: t.mode, status: t.status, startedAt: t.startedAt || null, finishedAt: t.finishedAt || null, champion: t.champion || null,
      entrants: t.entrants.map((e) => ({ id: e.id, name: e.name, avatarUrl: e.avatarUrl || '', points: e.points, seed: e.seed || null })),
      rounds: t.rounds, roundNames: t.rounds.map((_, r) => T.roundName(r, total)),
    },
  }, { 'cache-control': 'public, s-maxage=5, stale-while-revalidate=20' });
}

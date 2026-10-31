// Bot endpoint for the tournament commands. POST JSON { key, action, user, text }.
// The BDFD scripts hold TOURNAMENT_KEY; staff-only commands are gated by permission checks in BDFD.
import crypto from 'node:crypto';
import { json, readJson } from '../lib/http.js';
import { limited } from '../lib/guard.js';
import { getMemberLite } from '../lib/discord.js';
import * as T from '../lib/tournament.js';

const reply = (res, ok, msg, extra = {}) => json(res, 200, { ok, msg: String(msg).slice(0, 1800), ...extra });
const site = (req) => (process.env.SITE_URL || `https://${req.headers.host}`).replace(/\/$/, '');
const goodKey = (a, b) => { const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || '')); return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y); };
const uid = (v) => { const m = String(v || '').match(/\d{15,22}/); return m ? m[0] : null; };

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' }, { allow: 'POST' });
  if (await limited(res, 'bot', 'tourney', 240)) return;
  const b = await readJson(req, 20_000);
  if (!b || !process.env.TOURNAMENT_KEY || !goodKey(b.key, process.env.TOURNAMENT_KEY)) return json(res, 401, { ok: false, msg: 'Not allowed.' });
  const action = String(b.action || ''), user = uid(b.user), text = String(b.text || '').slice(0, 200);
  const link = `${site(req)}/tournament`;

  try {
    return await T.locked(async () => {
      let t = await T.load();
      const live = t && (t.status === 'open' || t.status === 'live');

      if (action === 'info') {
        if (!t) return reply(res, true, 'There is no tournament right now.');
        if (t.status === 'open') return reply(res, true, `**${t.name}** (${t.mode}) is open for sign-ups. **${t.entrants.length}** player${t.entrants.length === 1 ? '' : 's'} joined so far.\nJoin with \`1tjoin\`.\n${link}`);
        if (t.status === 'live') return reply(res, true, `**${t.name}** (${t.mode}) is live with **${t.entrants.length}** players.\nBracket: ${link}`);
        if (t.status === 'done') return reply(res, true, `**${t.name}** finished. Champion: **${T.nameOf(t, t.champion)}** 🏆\n${link}`);
        return reply(res, true, `**${t.name}** was cancelled.`);
      }

      if (action === 'create') {
        if (live) return reply(res, false, `❌ **${t.name}** is still ${t.status === 'open' ? 'open' : 'running'}. Use \`1tcancel\` first.`);
        if (t && t.status === 'done') await T.archive(t);
        const { mode, name } = T.parseCreate(text);
        t = { id: Date.now().toString(36), name, mode, status: 'open', createdAt: Date.now(), entrants: [], rounds: [], log: [], champion: null };
        await T.save(t);
        return reply(res, true, `✅ **${name}** (${mode === 'ANY' ? 'any mode' : mode}) is open for sign-ups!\nPlayers join with \`1tjoin\`. Max ${T.MAX_PLAYERS}.\n${link}`);
      }

      if (!t) return reply(res, false, '❌ There is no tournament. Staff can start one with `1tcreate`.');

      if (action === 'join') {
        if (t.status !== 'open') return reply(res, false, '❌ Sign-ups are closed.');
        if (!user) return reply(res, false, '❌ Could not read your user.');
        if (t.entrants.some((e) => e.id === user)) return reply(res, false, '❌ You already joined.');
        if (t.entrants.length >= T.MAX_PLAYERS) return reply(res, false, `❌ The tournament is full (${T.MAX_PLAYERS}).`);
        let m;
        try { m = await getMemberLite(user); }
        catch (e) { return reply(res, false, e.code === 'not_in_server' ? '❌ You need to be in the server.' : e.code === 'is_bot' ? '❌ Bots cannot join.' : '❌ Could not check you right now. Try again.'); }
        t.entrants.push({ id: m.id, name: m.name, avatarUrl: m.avatarUrl, points: m.points, joinedAt: Date.now() });
        await T.save(t);
        return reply(res, true, `✅ **${m.name}** joined **${t.name}**. Players: **${t.entrants.length}**`);
      }

      if (action === 'leave') {
        if (t.status !== 'open') return reply(res, false, '❌ The bracket is already made. Ask staff to give you a forfeit.');
        const n = t.entrants.length; t.entrants = t.entrants.filter((e) => e.id !== user);
        if (t.entrants.length === n) return reply(res, false, '❌ You are not signed up.');
        await T.save(t); return reply(res, true, `✅ You left **${t.name}**. Players: **${t.entrants.length}**`);
      }

      if (action === 'kick') {
        if (t.status !== 'open') return reply(res, false, '❌ Only works before the start. After that, report the opponent as the winner with `1twin`.');
        const n = t.entrants.length; t.entrants = t.entrants.filter((e) => e.id !== user);
        if (t.entrants.length === n) return reply(res, false, '❌ That player is not signed up.');
        await T.save(t); return reply(res, true, `✅ Removed. Players: **${t.entrants.length}**`);
      }

      if (action === 'start') {
        if (t.status !== 'open') return reply(res, false, '❌ It is already started or finished.');
        if (t.entrants.length < 2) return reply(res, false, '❌ Need at least 2 players.');
        t.entrants.sort((a, c) => c.points - a.points || a.joinedAt - c.joinedAt).forEach((e, i) => { e.seed = i + 1; });
        t.rounds = T.buildRounds(t.entrants); t.status = 'live'; t.startedAt = Date.now(); t.log = [];
        await T.save(t);
        const total = t.rounds.length;
        const lines = t.rounds[0].filter((m) => !m.bye).slice(0, 14).map((m) => `• **${T.nameOf(t, m.a)}** vs **${T.nameOf(t, m.b)}**`);
        const byes = t.rounds[0].filter((m) => m.bye).length;
        return reply(res, true, `🏁 **${t.name}** has started with **${t.entrants.length}** players!\n**${T.roundName(0, total)}**${byes ? ` (${byes} bye${byes > 1 ? 's' : ''})` : ''}:\n${lines.join('\n')}${t.rounds[0].filter((m) => !m.bye).length > 14 ? '\n…and more' : ''}\nFull bracket: ${link}\nStaff report results with \`1twin @winner\`.`);
      }

      if (action === 'win') {
        if (t.status !== 'live') return reply(res, false, '❌ No tournament is running.');
        if (!user) return reply(res, false, '❌ Mention the winner: `1twin @player`.');
        if (!t.entrants.some((e) => e.id === user)) return reply(res, false, '❌ That player is not in this tournament.');
        const r = T.reportWin(t, user);
        if (!r) return reply(res, false, '❌ That player has no open match right now (already advanced, eliminated, or waiting for an opponent).');
        await T.save(t);
        const total = t.rounds.length, win = T.nameOf(t, user), lose = T.nameOf(t, r.opponent);
        if (t.status === 'done') { await T.archive(t); return reply(res, true, `🏆 **${win}** beats **${lose}** in the **Final**!\n\n👑 **${win}** is the champion of **${t.name}**!\n${link}`); }
        const nx = t.rounds[r.r + 1][r.j >> 1];
        const next = nx.a && nx.b ? `Next: **${T.nameOf(t, nx.a)}** vs **${T.nameOf(t, nx.b)}** (${T.roundName(r.r + 1, total)})` : `**${win}** now waits in the ${T.roundName(r.r + 1, total)}.`;
        return reply(res, true, `✅ **${win}** beats **${lose}** in the **${T.roundName(r.r, total)}**.\n${next}`);
      }

      if (action === 'undo') {
        if (t.status !== 'live' && t.status !== 'done') return reply(res, false, '❌ Nothing to undo.');
        const u = T.undoLast(t); if (!u) return reply(res, false, '❌ No results to undo.');
        await T.save(t); return reply(res, true, `↩️ Undid the last result (${T.roundName(u.r, t.rounds.length)}). Report it again with \`1twin @winner\`.`);
      }

      if (action === 'cancel') {
        t.status = 'cancelled'; t.finishedAt = Date.now(); await T.save(t);
        return reply(res, true, `🛑 **${t.name}** was cancelled.`);
      }
      return reply(res, false, '❌ Unknown action.');
    });
  } catch (e) {
    console.error('tourney error', e.message);
    return reply(res, false, e.code === 'busy' ? '⏳ Busy, try again in a second.' : '❌ Something went wrong. Try again.');
  }
}

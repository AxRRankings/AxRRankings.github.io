// Each player has 9 card slots (the hotbar). Slot 0 keeps the original draft key so older drafts still work.
export const SLOTS = 9;
export const slotKey = (id, n) => (n === 0 ? `bc:draft:${id}` : `bc:draft:${id}:${n}`);
export const metaKey = (id) => `bc:meta:${id}`;
export function parseSlot(v) { const n = Number(v); return Number.isInteger(n) && n >= 0 && n < SLOTS ? n : 0; }
export function cleanSlotName(s) { return String(s || '').replace(/[^\w \-.!']/g, '').trim().slice(0, 20); }
export const emptyMeta = () => ({ last: 0, active: null, names: {} });

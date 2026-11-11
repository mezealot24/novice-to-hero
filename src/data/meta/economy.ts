export const SELL_RATE = 0.5;

// ---------- costumes (gems): looks only, zero stats ----------
export interface Costume {
	id: string;
	name: string;
	tint: number;
	price: number;
}
export const COSTUMES: Costume[] = [
	{ id: "default", name: "ชุดโนวิส", tint: 0xffffff, price: 0 },
	{ id: "sakura", name: "ชุดซากุระ", tint: 0xffb3d1, price: 60 },
	{ id: "night", name: "ชุดราตรี", tint: 0xa58bff, price: 60 },
	{ id: "snow", name: "ชุดหิมะ", tint: 0x9fe3ff, price: 80 },
	{ id: "forest", name: "ชุดผู้พิทักษ์ป่า", tint: 0x8fe39a, price: 80 },
	{ id: "gold", name: "ชุดทองคำ", tint: 0xffd36b, price: 150 },
];

// ---------- top-up (MOCK: no real payment is ever taken) ----------
export const GEM_PACKS = [
	{ id: "p1", gems: 60, bonus: 0, price: "฿35" },
	{ id: "p2", gems: 300, bonus: 30, price: "฿169" },
	{ id: "p3", gems: 980, bonus: 150, price: "฿529" },
];
// 🧪 TEST ONLY: gems -> zeny for the playtest period. Breaks the "gems never buy power" rule on purpose;
// flip GEM_TO_ZENY_TEST to false (or delete this block) before a real release.
export const GEM_TO_ZENY_TEST = true;
export const ZENY_PER_GEM = 50;
export const ZENY_PACKS = [10, 60, 300]; // gems spent per pack
// 🧪 TEST ONLY (2026-11-08): zeny -> free gems for the playtest. Lands in s.gems (free, client save), never in
// server paid gems. Price per gem must stay > ZENY_PER_GEM so a gem -> zeny -> gem loop always loses (tests/exchange.test.ts).
// Flip to false (or delete) before a real release, together with GEM_TO_ZENY_TEST.
export const ZENY_TO_GEM_TEST = true;
export const ZENY_COST_PER_GEM = 100;
export const GEM_BUY_PACKS = [5, 20, 50]; // gems bought per pack
export const SUPPORTER_PRICE = 300; // gems: badge + gold name, no stats
// free gem sources, so nothing in the gem shop is locked behind money
export const FREE_GEMS = { firstClear: 50, clear: 5, levelUp: 10, daily: 20 };

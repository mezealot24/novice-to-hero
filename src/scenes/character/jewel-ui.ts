// 💎 Jewel UI (Q 2026-11-20): the socket picker (passive tab) and the jewel workshop (card tab).
// Rules live in data/jewels.ts; this file only draws and calls them.
import Phaser from "phaser";
import { H, W } from "../../data/game-data";
import {
	cardIcon,
	cardName,
	EQUIP_CARDS,
	filterCards,
	TIER_COLOR,
	type EquipCard,
} from "../../data/cards";
import {
	feedCheck,
	feedJewel,
	JEWEL,
	jewelTier,
	makeJewel,
	ORB_OF,
	ORB_TEXT,
	socketJewel,
	socketOfJewel,
	unsocketJewel,
	type Jewel,
} from "../../data/jewels";
import { LINE_TIER_COLOR, LINE_TIER_NAME } from "../../data/line-tier";
import { lineText } from "../../data/refine";
import { passiveNodeById } from "../../data/passive-tree";
import { persist, save } from "../../save";
import { button, confirm, panel, toast, txt, UI } from "../../ui";
import type { CharacterScene } from "../CharacterScene";

const hex = (c: string) => Phaser.Display.Color.HexStringToColor(c).color;
/** "💎 Jewel #3 · 🟠 Legendary" */
export const jewelName = (j: Jewel) => {
	const t = jewelTier(j);
	return `💎 Jewel #${j.id.replace(/^jw/, "")} · ${LINE_TIER_NAME[t]}`;
};
/** Every line on one row: "🔵P.ATK +3 · Hit +2". */
export const jewelLinesText = (j: Jewel) =>
	j.lines.map(lineText).join(" · ") || "ยังไม่มีบรรทัด";
export const socketName = (id: string) => passiveNodeById(save().job, id)?.name ?? "ช่อง Jewel";

/** Passive tab: pick the jewel for one socket node (or take it out). Calls onDone after any change. */
export function openJewelPicker(scene: Phaser.Scene, nodeId: string, onDone: () => void) {
	const c = scene.add.container(0, 0).setDepth(40000);
	let page = 0;
	const per = 5;
	const draw = () => {
		c.removeAll(true);
		const s = save();
		const list = s.jewels ?? [];
		const inHere = s.jewelSock?.[nodeId];
		c.add(scene.add.rectangle(W / 2, H / 2, W, H, UI.night, 0.78).setInteractive());
		const pw = 600, ph = 420, px = W / 2 - pw / 2, py = H / 2 - ph / 2;
		c.add(panel(scene, px, py, pw, ph, UI.panelHi, hex("#7fd7ff")));
		c.add(txt(scene, W / 2, py + 16, `💎 ${socketName(nodeId)}`, 20, UI.gold, true).setOrigin(0.5, 0));
		if (!list.length)
			c.add(
				txt(scene, W / 2, py + 170, "ยังไม่มี Jewel ค่ะ\nสร้างจากการ์ด 3 ใบได้ที่ แท็บการ์ด → 💎 Jewel", 16, UI.sub)
					.setOrigin(0.5)
					.setAlign("center"),
			);
		const pages = Math.max(1, Math.ceil(list.length / per));
		page = Math.min(page, pages - 1);
		list.slice(page * per, page * per + per).forEach((j, i) => {
			const y = py + 56 + i * 62, here = j.id === inHere, other = socketOfJewel(s, j.id);
			const col = LINE_TIER_COLOR[jewelTier(j)];
			c.add(panel(scene, px + 16, y, pw - 32, 56, here ? 0x22305a : UI.panel, hex(col), 8));
			c.add(txt(scene, px + 28, y + 6, jewelName(j), 14, col, true));
			c.add(txt(scene, px + 28, y + 28, jewelLinesText(j), 11, UI.green).setWordWrapWidth(pw - 190));
			c.add(
				button(
					scene,
					px + pw - 80,
					y + 28,
					104,
					34,
					here ? "อยู่ช่องนี้" : other ? "ย้ายมา" : "ใส่",
					() => {
						socketJewel(s, nodeId, j.id);
						persist();
						toast(scene, `ใส่ ${jewelName(j)} แล้ว`);
						onDone();
						draw();
					},
					{ size: 14 },
				).setEnabled(!here),
			);
		});
		if (pages > 1) {
			c.add(button(scene, W / 2 - 50, py + ph - 70, 44, 30, "◀", () => { page--; draw(); }, { size: 14 }).setEnabled(page > 0));
			c.add(txt(scene, W / 2, py + ph - 70, `${page + 1}/${pages}`, 14, UI.text, true).setOrigin(0.5));
			c.add(button(scene, W / 2 + 50, py + ph - 70, 44, 30, "▶", () => { page++; draw(); }, { size: 14 }).setEnabled(page < pages - 1));
		}
		c.add(
			button(scene, W / 2 - 110, py + ph - 30, 190, 40, "ถอดออก", () => {
				unsocketJewel(s, nodeId);
				persist();
				onDone();
				draw();
			}, { size: 15, fill: 0x5a5f8a, color: UI.text }).setEnabled(!!inHere),
		);
		c.add(button(scene, W / 2 + 110, py + ph - 30, 190, 40, "ปิด", () => c.destroy(), { size: 15 }));
	};
	draw();
	return c;
}

// ---------- card tab: 💎 Jewel workshop ----------
/** Workshop state kept on the scene between redraws. */
export interface JewelWs {
	sel?: string; // selected jewel id
	making: string[]; // card ids picked for a new jewel
	jPage: number;
	cPage: number;
}
export const newJewelWs = (): JewelWs => ({ making: [], jPage: 0, cPage: 0 });

/** Left: your jewels (pick one or ➕ make new). Right: bag cards (filtered) to feed / pick. */
export function jewelWorkshop(scene: CharacterScene, ws: JewelWs, top: number) {
	const s = save(),
		b = scene.body!;
	const jewels = s.jewels ?? [];
	if (ws.sel && !jewels.some((j) => j.id === ws.sel)) ws.sel = undefined;
	const making = !ws.sel;
	// ---- left column: jewels ----
	const lx = 330, lw = 286;
	b.add(
		button(scene, lx + lw / 2, top + 14, lw, 28, `➕ สร้าง Jewel ใหม่ (การ์ด ${JEWEL.makeCards} ใบ)`, () => {
			ws.sel = undefined;
			ws.making = [];
			scene.render();
		}, { size: 13, fill: making ? 0xf2b84b : 0x5a5f8a, color: making ? UI.ink : UI.text }),
	);
	const per = 4,
		pages = Math.max(1, Math.ceil(jewels.length / per));
	ws.jPage = Math.min(ws.jPage, pages - 1);
	jewels.slice(ws.jPage * per, ws.jPage * per + per).forEach((j, i) => {
		const y = top + 36 + i * 52, on = j.id === ws.sel, col = LINE_TIER_COLOR[jewelTier(j)];
		const sock = socketOfJewel(s, j.id);
		const p = panel(scene, lx, y, lw, 48, on ? 0x2a3566 : UI.panel, hex(col), 8);
		p.setInteractive(new Phaser.Geom.Rectangle(0, 0, lw, 48), Phaser.Geom.Rectangle.Contains).on("pointerup", () => {
			ws.sel = j.id;
			scene.render();
		});
		b.add(p);
		b.add(txt(scene, lx + 10, y + 4, `${jewelName(j)}${sock ? " · ใส่อยู่" : ""}`, 12, col, true));
		b.add(txt(scene, lx + 10, y + 22, jewelLinesText(j), 10, UI.green).setWordWrapWidth(lw - 20).setLineSpacing(0));
	});
	if (!jewels.length)
		b.add(txt(scene, lx + lw / 2, top + 120, "ยังไม่มี Jewel\nเลือกการ์ด 3 ใบทางขวาแล้วกดสร้างได้เลยค่ะ", 13, UI.sub).setOrigin(0.5).setAlign("center"));
	if (pages > 1) {
		const py = top + 36 + per * 52 + 4;
		b.add(button(scene, lx + 90, py + 12, 40, 24, "◀", () => { ws.jPage--; scene.render(); }, { size: 12 }).setEnabled(ws.jPage > 0));
		b.add(txt(scene, lx + lw / 2, py + 12, `${ws.jPage + 1}/${pages}`, 12, UI.text, true).setOrigin(0.5));
		b.add(button(scene, lx + lw - 90, py + 12, 40, 24, "▶", () => { ws.jPage++; scene.render(); }, { size: 12 }).setEnabled(ws.jPage < pages - 1));
	}
	// ---- bottom-left: what happens ----
	const sel = jewels.find((j) => j.id === ws.sel);
	const infoY = top + 270;
	if (making) {
		const names = ws.making.map((id) => EQUIP_CARDS.find((c) => c.id === id)).filter((c): c is EquipCard => !!c);
		b.add(txt(scene, lx, infoY - 20, `เลือกแล้ว ${names.length}/${JEWEL.makeCards}: ${names.map((c) => cardIcon(c)).join(" ") || "—"}`, 12, UI.text));
		b.add(
			button(scene, lx + 70, infoY + 16, 136, 30, "ล้างที่เลือก", () => { ws.making = []; scene.render(); }, { size: 12, fill: 0x5a5f8a, color: UI.text }).setEnabled(names.length > 0),
		);
		b.add(
			button(scene, lx + 214, infoY + 16, 140, 30, "💎 สร้างเลย", () => {
				const r = makeJewel(s, ws.making);
				if (!r.ok) {
					toast(scene, r.why === "full" ? `มี Jewel ได้สูงสุด ${JEWEL.maxOwned} เม็ดค่ะ` : "การ์ดไม่พอค่ะ", UI.red);
					return;
				}
				persist();
				ws.making = [];
				ws.sel = r.jewel.id;
				toast(scene, `ได้ ${jewelName(r.jewel)}!`);
				scene.render();
			}, { size: 14 }).setEnabled(names.length === JEWEL.makeCards),
		);
	} else if (sel) {
		b.add(txt(scene, lx, infoY - 22, "แตะการ์ดทางขวาเพื่อป้อนให้ Jewel นี้", 12, UI.sub));
		b.add(txt(scene, lx, infoY - 4, `🃏 ${ORB_TEXT.reroll}\n💠 ${ORB_TEXT.addLine}\n👑 ${ORB_TEXT.tierUp}`, 11, UI.text).setLineSpacing(1));
	}
	// ---- right column: bag cards ----
	const rx = 626, rw = 320;
	const bag = s.cards ?? {};
	const owned = filterCards(
		EQUIP_CARDS.filter((cd) => (bag[cd.id] ?? 0) > 0),
		{ tier: scene.cardTierF },
	);
	const tiers: [typeof scene.cardTierF, string][] = [["all", "ทุกระดับ"], ["normal", "🃏"], ["mini", "💠"], ["boss", "👑"]];
	tiers.forEach(([v, label], i) => {
		const on = scene.cardTierF === v;
		b.add(button(scene, rx + 30 + i * 46 + (i ? 12 : 0), top + 14, i ? 40 : 56, 24, label, () => { scene.cardTierF = v; ws.cPage = 0; scene.render(); }, { size: 11, fill: on ? 0xf2b84b : 0x3f4466, color: on ? UI.ink : UI.text }));
	});
	const cper = 7,
		cpages = Math.max(1, Math.ceil(owned.length / cper));
	ws.cPage = Math.min(ws.cPage, cpages - 1);
	owned.slice(ws.cPage * cper, ws.cPage * cper + cper).forEach((cd, i) => {
		const y = top + 32 + i * 38;
		const left = (bag[cd.id] ?? 0) - ws.making.filter((x) => x === cd.id).length;
		const can = making ? left > 0 && ws.making.length < JEWEL.makeCards : !!sel && feedCheck(sel, cd) === "ok";
		b.add(panel(scene, rx, y, rw, 34, UI.panel, hex(TIER_COLOR[cd.tier]), 6));
		b.add(txt(scene, rx + 8, y + 3, `${cardIcon(cd)} ${cardName(cd)} ×${left}`, 11, TIER_COLOR[cd.tier], true));
		b.add(txt(scene, rx + 8, y + 19, making ? "เพิ่มเข้า pool" : ORB_TEXT[ORB_OF[cd.tier]], 9, UI.sub));
		b.add(
			button(scene, rx + rw - 38, y + 17, 64, 26, making ? "เลือก" : "ป้อน", () => {
				if (making) {
					ws.making.push(cd.id);
					scene.render();
					return;
				}
				if (!sel) return;
				confirm(scene, `ป้อน ${cardName(cd)}?`, `${ORB_TEXT[ORB_OF[cd.tier]]}\nการ์ดใบนี้จะหายไป และค่าของมันจะเข้า pool ของ Jewel`, "ป้อนเลย", () => {
					const before = jewelLinesText(sel);
					const r = feedJewel(s, sel.id, cd.id);
					if (!r.ok) { toast(scene, "ทำไม่ได้ค่ะ", UI.red); return; }
					persist();
					toast(scene, `${before} → ${jewelLinesText(r.jewel)}`);
					scene.render();
				});
			}, { size: 12 }).setEnabled(can),
		);
	});
	if (!owned.length) b.add(txt(scene, rx + rw / 2, top + 140, "ไม่มีการ์ดในกระเป๋า", 13, UI.sub).setOrigin(0.5));
	if (cpages > 1) {
		const py = top + 32 + cper * 38 + 6;
		b.add(button(scene, rx + 100, py + 10, 40, 24, "◀", () => { ws.cPage--; scene.render(); }, { size: 12 }).setEnabled(ws.cPage > 0));
		b.add(txt(scene, rx + rw / 2, py + 10, `${ws.cPage + 1}/${cpages}`, 12, UI.text, true).setOrigin(0.5));
		b.add(button(scene, rx + rw - 100, py + 10, 40, 24, "▶", () => { ws.cPage++; scene.render(); }, { size: 12 }).setEnabled(ws.cPage < cpages - 1));
	}
}

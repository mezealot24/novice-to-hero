import Phaser from "phaser";
import {
	COLORS,
} from "../data/game-data";
import { derivedRows } from "../data/stat-rows";
export { derivedRows };
export { nodeDetail } from "./character/node-detail";
import {
	type EquipSlot,
} from "../data/meta";
import {
	job2Lock,
	job3Lock,
	persist,
	resetTree,
	resetTree2,
	resetTree3,
	save,
	setJob3Variant,
	totalCrossSpent,
} from "../save";
import {
	HYBRID_MAX_TIER,
	lockReason3,
	tree3Spent,
	web3Scope,
	branches2Of,
	tree2Spent,
	branchesOf,
	lockReason,
	nodeById,
	nodesOf,
	TREE_RULES,
	treeSpent,
	type TreeNode,
} from "../data/tree";
import { JOBS } from "../data/jobs";
import {
	JOB2,
	JOB2_RULES,
	job2Of,
	PETS,
	type Job2Id,
	type PetId,
} from "../data/jobs2";
import {
	activeJob3,
	JOB3_RULES,
	job3Of,
} from "../data/jobs3";
import {
	type Btn,
	button,
	go,
	panel,
	tabs,
	toast,
	topBar,
	txt,
	UI,
} from "../ui";
import { clipW } from "./character/node-detail";
import { statusTab } from "./character/status-tab";
import { talentTab } from "./character/talent-tab";
import { ultModal } from "./character/ult-modal";
import { drawPreview } from "./character/preview";
import { cardTab } from "./character/cards-tab";
import { equipTab } from "./character/equip-tab";
import { skillTab } from "./character/skill-basic";
import { renderSelectedNodeFooter } from "./character/node-footer";
import {
	applyWebScroll,
	scrollToWebY,
	webActive,
	webPointerDown,
	webPointerMove,
	webPointerUp,
	webTier,
} from "./character/web-scroll";

const BRANCH_PET: Record<string, PetId> = {
	bm_h: "hawk",
	bm_b: "boar",
	bm_w: "wolf",
}; // Beastmaster ใยชั้น 2 branch -> its pet

// Character sheet: preview on the left, tabs on the right (equipment, cards, status, unified 3-class RO Mobile skill tree, talents).
export class CharacterScene extends Phaser.Scene {
	body?: Phaser.GameObjects.Container;
	preview?: Phaser.GameObjects.Container;
	tab = 0;
	slot: EquipSlot | "costume" = "weapon";
	bagPage = 0;
	cardPage = 0;
	cardBook = false;
	bookDg = 0;
	bookV2 = false;
	skillBasic = false; // skill tab: false = unified 3-class skill web, true = Novice skills + certificates + job
	selNode = "";
	showDetail = false; // skill web: node detail modal open
	modal?: Phaser.GameObjects.Container;
	webScrollY = 0; // RO Mobile continuous vertical scroll offset
	webMaxScroll = 0;
	// v-scroll perf: drag/wheel/momentum only move these refs (no full render() per frame)
	webC?: Phaser.GameObjects.Container;
	webView = { x: 326, y: 146, w: 616, h: 346 };
	webThumb?: Phaser.GameObjects.Graphics;
	webSb = { y: 0, h: 0, thumbH: 0 };
	webHits: { go: Phaser.GameObjects.GameObject; top: number; bot: number }[] = [];
	webPills: Btn[] = [];
	webDrag?: {
		mode: "content" | "thumb";
		startY: number;
		startScroll: number;
		lastY: number;
		lastT: number;
		vel: number;
		moved: boolean;
	};
	tierOffsets: [number, number, number] = [0, 380, 760]; // Y anchors for Tier 1, Tier 2, Tier 3
	previewJob2Idx = 0; // when still Class 1, toggle which Class 2 branch to preview in the continuous tree
	showUlt = false; // skill web: 🔥 รวมผล Ult popup (was the left sidebar; left side is now the node detail panel)
	talent2 = false; // v119 talent tab: show ทาเลนต์ชั้น 2
	constructor() {
		super("character");
	}

	create(data: { tab?: number; back?: { key: string; data?: object } }) {
		this.cameras.main.setBackgroundColor(UI.night);
		this.cameras.main.fadeIn(160, 20, 23, 43);
		this.tab = data?.tab ?? 0;
		this.showDetail = false;
		this.showUlt = false;
		this.input.keyboard?.on("keydown-ESC", () => {
			if (this.showDetail || this.showUlt) {
				this.showDetail = false;
				this.showUlt = false;
				this.render();
			}
		});
		this.input.on(
			"wheel",
			(_p: unknown, _go: unknown, _dx: number, dy: number) => {
				if (!webActive(this)) return;
				scrollToWebY(this, this.webScrollY + dy * 0.65, false);
			},
		);
		// Skill-web swipe: scene-level so it starts anywhere in the viewport (even on top of nodes)
		// and survives across frames — the old per-render drag zone was destroyed mid-gesture.
		this.input.on("pointerdown", (p: Phaser.Input.Pointer) =>
			webPointerDown(this, p),
		);
		this.input.on("pointermove", (p: Phaser.Input.Pointer) =>
			webPointerMove(this, p),
		);
		this.input.on("pointerup", () => webPointerUp(this));
		this.input.on("pointerupoutside", () => webPointerUp(this));
		this.events.once("shutdown", () => {
			this.webDrag = undefined;
			this.webC = undefined;
		});
		const back = data?.back; // v101: opened from the forge's 🃏 button -> ‹ กลับ returns there (same item on the anvil)
		topBar(this, "👤 ตัวละคร", () =>
			back ? go(this, back.key, back.data) : go(this, "hub"),
		);
		drawPreview(this);
		tabs(
			this,
			330,
			84,
			["🎒 อุปกรณ์", "🃏 การ์ด", "📊 สถานะ", "✨ สกิล", "⭐ ทาเลนต์"],
			112,
			(i) => {
				this.tab = i;
				this.redraw();
			},
			this.tab,
		);
	}

	render() {
		this.body?.destroy();
		this.modal?.destroy();
		this.modal = undefined;
		this.body = this.add.container(0, 0);
		if (this.tab === 0) equipTab(this);
		else if (this.tab === 1) cardTab(this);
		else if (this.tab === 2) statusTab(this);
		else if (this.tab === 3)
			save().job === "novice" || this.skillBasic
				? skillTab(this)
				: this.unifiedWebTab();
		else talentTab(this);
		if (this.showUlt && this.tab === 3) ultModal(this);
	}

	redraw() {
		drawPreview(this);
		this.render();
	}

	/** Procedural RPG Skill Node Card: displays socket frame, rarity glow, level badge, and icon. */
	private drawSkillNode(
		c: Phaser.GameObjects.Container,
		x: number,
		y: number,
		w: number,
		h: number,
		n: TreeNode,
		lv: number,
		open: boolean,
		star: boolean,
		sel: boolean,
		onClick: () => void,
		isUltSpine = false,
	) {
		const isMax = lv >= n.max;
		const g = this.add.graphics();

		// 1. Drop shadow
		g.fillStyle(0x000000, 0.45).fillRoundedRect(x + 1, y + 2, w, h, 10);

		// 2. Node socket background (Ult Spine gets a warm royal gold-violet tint)
		const bgFill = sel
			? 0x323c66
			: isMax
				? isUltSpine
					? 0x3b2c1a
					: 0x1f3448
				: lv
					? isUltSpine
						? 0x2d223b
						: 0x202b48
					: open
						? isUltSpine
							? 0x221b30
							: 0x1a1e35
						: 0x121422;
		g.fillStyle(bgFill, 1).fillRoundedRect(x, y, w, h, 10);

		// 3. Subtle inner gradient gloss
		if (open) {
			g.fillStyle(0xffffff, sel ? 0.13 : isMax ? 0.08 : 0.04).fillRoundedRect(
				x + 2,
				y + 2,
				w - 4,
				Math.floor(h / 2),
				8,
			);
		}

		// 4. Outer border / Frame
		let strokeColor = isUltSpine && open ? 0xb58938 : UI.line;
		let strokeW = isUltSpine ? 2 : 1.5;
		if (sel) {
			strokeColor = 0xfff0aa;
			strokeW = 3;
		} else if (isMax) {
			strokeColor = COLORS.gold;
			strokeW = 2.2;
		} else if (star) {
			strokeColor = 0xffb347;
			strokeW = 2;
		} else if (lv > 0) {
			strokeColor = isUltSpine ? 0xffd15c : 0x6bb7f2;
			strokeW = 2;
		} else if (!open) {
			strokeColor = 0x22263b;
			strokeW = 1;
		}
		g.lineStyle(strokeW, strokeColor, 1).strokeRoundedRect(x, y, w, h, 10);

		if (sel || isMax) {
			g.lineStyle(1, 0xffe277, 0.4).strokeRoundedRect(
				x + 2,
				y + 2,
				w - 4,
				h - 4,
				8,
			);
		}
		c.add(g);

		// Left skill icon with recessed circle socket
		const iconSocket = this.add.graphics();
		const scX = x + 15,
			scY = y + 15;
		iconSocket.fillStyle(0x0c0e1a, 0.7).fillCircle(scX, scY, 10.5);
		iconSocket.lineStyle(1, strokeColor, 0.6).strokeCircle(scX, scY, 10.5);
		c.add(iconSocket);

		c.add(
			txt(this, scX, scY, n.icon, 12)
				.setOrigin(0.5)
				.setAlpha(open ? 1 : 0.4),
		);

		// Right-top level badge
		const badgeW = 30,
			badgeH = 14,
			bx = x + w - badgeW - 3,
			by = y + 4;
		const badgeG = this.add.graphics();
		badgeG
			.fillStyle(isMax ? 0x7c5415 : lv > 0 ? 0x163456 : 0x0f1220, 0.95)
			.fillRoundedRect(bx, by, badgeW, badgeH, 5);
		badgeG
			.lineStyle(1, isMax ? COLORS.gold : lv > 0 ? 0x4a8cd4 : 0x2e3553, 1)
			.strokeRoundedRect(bx, by, badgeW, badgeH, 5);
		c.add(badgeG);
		c.add(
			txt(
				this,
				bx + badgeW / 2,
				by + badgeH / 2 - 1,
				`${lv}/${n.max}`,
				9,
				isMax ? "#fff0ba" : lv > 0 ? "#bfe3ff" : UI.sub,
				true,
			).setOrigin(0.5),
		);

		if (star) {
			c.add(txt(this, x + 28, y + 4, "★", 10, "#ffd15c", true));
		}

		const nameColor = !open
			? "#5d6382"
			: sel
				? "#ffffff"
				: isMax
					? "#ffe994"
					: UI.text;
		c.add(
			clipW(
				txt(this, x + 5, y + 29, n.name, 10.5, nameColor, isMax || sel),
				w - 10,
			),
		);

		// Tap vs Drag disambiguation so vertical swipe scrolling works smoothly on mobile/desktop
		const z = this.add
			.zone(x, y, w, h)
			.setOrigin(0)
			.setInteractive({ useHandCursor: true });
		let downY = 0;
		z.on("pointerdown", (p: Phaser.Input.Pointer) => {
			downY = p.y;
		});
		z.on("pointerup", (p: Phaser.Input.Pointer) => {
			if (Math.abs(p.y - downY) < 10) onClick();
		});
		c.add(z);
	}

	// ---------- tab 3: Unified RO Mobile Style 3-Class Vertical Skill Web ----------
	private unifiedWebTab() {
		const s = save(),
			b = this.body!;
		const job = JOBS[s.job];
		const t1 = (s.jobTree ??= {});
		const t2 = (s.job2Tree ??= {});
		const t3 = (s.job3Tree ??= {});
		const j2Options = job2Of(s.job);
		const activeJ2Id: Job2Id =
			s.job2 ?? j2Options[this.previewJob2Idx % j2Options.length].id;
		const j2 = JOB2[activeJ2Id];
		const j3Def = job3Of(activeJ2Id);
		const isJ3Active = !!activeJob3(s) && activeJob3(s) === j3Def?.id;
		const path = s.job3Path ?? "pure";

		const p1 = s.skillPoints ?? 0;
		const p2 = s.job2 ? (s.job2Points ?? 0) : 0;
		const p3 = activeJob3(s) ? (s.job3Points ?? 0) : 0;
		const crossPts = totalCrossSpent(s);

		// 1. Unified Top Header Bar: shows all 3 class point pools at once + Quick Tier Jump pills
		b.add(
			clipW(
			txt(
				this,
				330,
				110,
				`แต้ม: ✨ขั้น1 [${p1}] · ${j2.icon}ขั้น2 [${s.job2 ? p2 : "🔒"}] · ${j3Def ? j3Def.icon : "⚜️"}ขั้น3 [${activeJob3(s) ? p3 : "🔒"}]`,
				13,
				p1 + p2 + p3 > 0 ? UI.gold : UI.sub,
				true,
			),
			326,
			),
		);
		b.add(
			clipW(
				txt(
					this,
					330,
					130,
					`💡 ไถดูทั้ง 3 คลาส · แต้มคลาสสูงอัปคลาสต่ำได้${crossPts > 0 ? ` (ยืม ${crossPts})` : ""}`,
					10.5,
					"#b8c0e8",
				),
				326,
			),
		);

		// Quick-jump tier pills (RO Mobile style). Tint is updated live by applyWebScroll(), no re-render.
		const curTier = webTier(this);
		this.webPills = ([1, 2, 3] as const).map((t, i) => {
			const pill = button(
				this,
				666 + i * 70,
				122,
				66,
				26,
				`${["1️⃣", "2️⃣", "3️⃣"][i]} ขั้น ${t}`,
				() => scrollToWebY(this, this.tierOffsets[i], true),
				{ size: 11, fill: curTier === t ? COLORS.gold : 0x3b4269 },
			);
			b.add(pill);
			return pill;
		});
		b.add(
			button(
				this,
				896,
				122,
				98,
				26,
				"🌱 โนวิส/อาชีพ",
				() => {
					this.skillBasic = true;
					this.redraw();
				},
				{ size: 11, fill: 0x5a5f8a, color: UI.text },
			),
		);

		// 2. Scrollable Viewport Container (x: 326..944, y: 146..492)
		const viewX = 326,
			viewY = 146,
			viewW = 616,
			viewH = 410; // down to the panel bottom (old bottom footer moved into the left panel)
		const frameBg = this.add.graphics();
		frameBg
			.fillStyle(0x0d1020, 0.7)
			.fillRoundedRect(viewX, viewY, viewW, viewH, 10);
		frameBg
			.lineStyle(1.5, UI.line, 0.8)
			.strokeRoundedRect(viewX, viewY, viewW, viewH, 10);
		b.add(frameBg);

		// Swipe is handled scene-wide (webPointerDown/Move/Up) so it works on top of nodes too.
		this.webView = { x: viewX, y: viewY, w: viewW, h: viewH };

		const maskShape = this.make.graphics({});
		maskShape.fillStyle(0xffffff).fillRect(viewX, viewY, viewW, viewH);
		const mask = maskShape.createGeometryMask();
		b.once("destroy", () => maskShape.destroy());

		const scrollC = this.add.container(0, viewY - this.webScrollY);
		scrollC.setMask(mask);
		b.add(scrollC);

		const spineG = this.add.graphics();
		scrollC.add(spineG);

		const x0 = 332,
			wAll = 602,
			nh = 46,
			rh = 58;
		let curY = 6;

		// ==================== TIER 1: BASE CLASS WEB ====================
		this.tierOffsets[0] = 0;
		const spent1 = treeSpent(t1, s.job);
		const t1Header = this.add.graphics();
		t1Header
			.fillStyle(0x1f2748, 0.96)
			.fillRoundedRect(x0 - 2, curY, wAll + 4, 28, 7);
		t1Header
			.lineStyle(1.5, COLORS.gold, 0.85)
			.strokeRoundedRect(x0 - 2, curY, wAll + 4, 28, 7);
		scrollC.add(t1Header);
		scrollC.add(
			txt(
				this,
				x0 + 8,
				curY + 5,
				`1️⃣ ขั้น 1: ${job.icon} ${job.name} (Job Lv ${s.jobLevel}) · ลงแล้ว ${spent1} แต้ม · ★ ได้ ${TREE_RULES.capstones} ดวง`,
				12,
				UI.gold,
				true,
			),
		);
		scrollC.add(
			button(
				this,
				x0 + wAll - 48,
				curY + 14,
				88,
				22,
				"↺ รีเซ็ตขั้น 1",
				() => {
					const back = resetTree(s);
					s.skillPoints += back;
					persist();
					toast(this, "คืนแต้มใยชั้น 1 ครบทุกกระเป๋าแล้วค่ะ");
					this.redraw();
				},
				{ size: 10.5, fill: 0x5a5f8a, color: UI.text },
			).setEnabled(spent1 > 0),
		);
		curY += 32;

		type Col1 = {
			group: string;
			isUlt?: boolean;
			isS1?: boolean;
			cells: { n: TreeNode; row: number }[];
		};
		const cols1: Col1[] = [],
			groups1: { name: string; from: number; to: number; isUlt?: boolean }[] =
				[];
		const brs1 = branchesOf(s.job);
		const lineCols1 = (line: "s1" | "ult", name: string) => {
			const from = cols1.length;
			const root = nodesOf(`${s.job}_${line}`)[0];
			const subs = brs1.filter(
				(x) => x.line === line && x.id !== `${s.job}_${line}`,
			);
			cols1.push({
				group: name,
				isUlt: line === "ult",
				isS1: line === "s1",
				cells: [{ n: root, row: 0 }],
			});
			subs.forEach((br, i) => {
				const cells = nodesOf(br.id).map((n) => ({ n, row: n.tier }));
				if (i === 0) cols1[from].cells.push(...cells);
				else
					cols1.push({
						group: name,
						isUlt: line === "ult",
						isS1: line === "s1",
						cells,
					});
			});
			groups1.push({ name, from, to: cols1.length - 1, isUlt: line === "ult" });
		};
		lineCols1("s1", `${job.auto.icon} ทักษะ 1`);
		{
			const from = cols1.length;
			const s2 = nodesOf(`${s.job}_s2`),
				gate = s2.find((n) => !n.kind),
				dy = gate ? 1 : 0;
			for (const r of s2.filter((n) => n.kind === "s2root"))
				cols1.push({
					group: "s2",
					cells: s2
						.filter((n) => n.s2 === r.s2)
						.map((n) => ({ n, row: n.tier + dy })),
				});
			if (gate) cols1[from + 1].cells.unshift({ n: gate, row: 0 });
			groups1.push({
				name: gate
					? `${gate.icon} ${gate.name} → ทักษะ 2`
					: "🔀 ทักษะ 2 (เลือก 1)",
				from,
				to: cols1.length - 1,
			});
		}
		lineCols1("ult", `🔥 ${job.ult.icon} Ult (แกนสะสม)`);
		const core1 = brs1.filter((x) => x.line === "core");
		for (const br of core1) {
			cols1.push({
				group: "core",
				cells: nodesOf(br.id).map((n, i) => ({ n, row: i })),
			});
			groups1.push({
				name: `${br.icon} ${br.name}`,
				from: cols1.length - 1,
				to: cols1.length - 1,
			});
		}

		const gap1 = 5;
		const cw1 = Math.min(
			114,
			(wAll - gap1 * (cols1.length - 1)) / cols1.length,
		);
		const cx1 = (i: number) => x0 + i * (cw1 + gap1);
		const t1PanelH = 318;
		let ult1CenterX = x0 + wAll * 0.72;
		let s1CenterX = x0 + cw1 / 2;

		for (const g of groups1) {
			const gx = cx1(g.from),
				gw = cx1(g.to) + cw1 - gx;
			if (g.isUlt) ult1CenterX = gx + gw / 2;
			scrollC.add(
				panel(
					this,
					gx - 2,
					curY,
					gw + 4,
					t1PanelH,
					g.isUlt ? 0x211932 : 0x16192e,
					g.isUlt ? COLORS.gold : UI.line,
					8,
				),
			);
			const hG = this.add.graphics();
			hG.fillStyle(g.isUlt ? 0x3b2818 : 0x232948, 0.95).fillRoundedRect(
				gx - 1,
				curY + 1,
				gw + 2,
				22,
				6,
			);
			hG.lineStyle(1, g.isUlt ? COLORS.gold : UI.lineHi, 0.7).strokeRoundedRect(
				gx - 1,
				curY + 1,
				gw + 2,
				22,
				6,
			);
			scrollC.add(hG);
			scrollC.add(
				clipW(
					txt(
						this,
						gx + 4,
						curY + 4,
						g.name,
						10.5,
						g.isUlt ? "#ffe994" : UI.gold,
						true,
					),
					gw - 6,
				),
			);
		}

		const pos1 = new Map<string, { x: number; y: number; isUlt?: boolean }>();
		const top1 = curY + 26;
		cols1.forEach((c, i) =>
			c.cells.forEach((q) =>
				pos1.set(q.n.id, { x: cx1(i), y: top1 + q.row * rh, isUlt: c.isUlt }),
			),
		);

		const edgeG1 = this.add.graphics();
		scrollC.add(edgeG1);
		for (const [id, p] of pos1) {
			const n = nodeById(id)!,
				pp = n.parent ? pos1.get(n.parent) : undefined;
			if (!pp) continue;
			const active = (t1[id] ?? 0) > 0;
			edgeG1
				.lineStyle(active ? 3 : 2, active ? COLORS.gold : 0x2e3558, 1)
				.lineBetween(pp.x + cw1 / 2, pp.y + nh, p.x + cw1 / 2, p.y);
			if (active)
				edgeG1
					.lineStyle(1, 0xfff6c7, 0.8)
					.lineBetween(pp.x + cw1 / 2, pp.y + nh, p.x + cw1 / 2, p.y);
		}

		for (const [id, p] of pos1) {
			const n = nodeById(id)!,
				lv = t1[id] ?? 0,
				why = lockReason(t1, s.job, n),
				open = !why || why === "เต็มแล้ว";
			const star = n.tier === 4 || n.kind === "s2star",
				sel = id === this.selNode;
			this.drawSkillNode(
				scrollC,
				p.x,
				p.y,
				cw1,
				nh,
				n,
				lv,
				open,
				star,
				sel,
				() => {
					this.selNode = id;
					this.render();
				},
				!!p.isUlt,
			);
		}
		const t1BottomY = curY + t1PanelH;
		curY = t1BottomY + 42;

		// ==================== TIER 2: 2ND CLASS WEB ====================
		this.tierOffsets[1] = Math.max(0, curY - 38);
		const spent2 = tree2Spent(t2, j2.id);
		const t2Unlocked = !!s.job2;
		const t2Header = this.add.graphics();
		t2Header
			.fillStyle(t2Unlocked ? 0x271e42 : 0x1a1c30, 0.96)
			.fillRoundedRect(x0 - 2, curY, wAll + 4, 30, 7);
		t2Header
			.lineStyle(1.5, t2Unlocked ? COLORS.gold : UI.lineHi, 0.9)
			.strokeRoundedRect(x0 - 2, curY, wAll + 4, 30, 7);
		scrollC.add(t2Header);

		if (t2Unlocked) {
			scrollC.add(
				clipW(
					txt(
						this,
						x0 + 8,
						curY + 6,
						`2️⃣ ขั้น 2: ${j2.icon} ${j2.name} (Job2 Lv ${s.job2Level ?? 1}/${JOB2_RULES.maxJobLevel}) · ${j2.signature.icon}${j2.signature.name} · ลงแล้ว ${spent2} แต้ม`,
						11.5,
						UI.gold,
						true,
					),
					410,
				),
			);
			scrollC.add(
				button(
					this,
					x0 + wAll - 144,
					curY + 15,
					92,
					22,
					`🔄 สาย 💎${JOB2_RULES.repickGems}`,
					() => go(this, "job", { job2: true }),
					{ size: 10, fill: 0x4a5a8a, color: UI.text },
				),
			);
			scrollC.add(
				button(
					this,
					x0 + wAll - 48,
					curY + 15,
					88,
					22,
					"↺ รีเซ็ตขั้น 2",
					() => {
						const back = resetTree2(s);
						s.job2Points = (s.job2Points ?? 0) + back;
						persist();
						toast(this, "คืนแต้มใยชั้น 2 ครบทุกกระเป๋าแล้วค่ะ");
						this.redraw();
					},
					{ size: 10, fill: 0x5a5f8a, color: UI.text },
				).setEnabled(spent2 > 0),
			);
		} else {
			const lockTxt = job2Lock(s);
			scrollC.add(
				clipW(
					txt(
						this,
						x0 + 8,
						curY + 6,
						`2️⃣ ขั้น 2 (ส่องล่วงหน้า): ${j2.icon} ${j2.name} · ${lockTxt ? `🔒 ${lockTxt}` : "✅ พร้อมเปลี่ยนอาชีพ!"}`,
						11.5,
						"#ffd984",
						true,
					),
					420,
				),
			);
			if (j2Options.length > 1) {
				const other = j2Options[(this.previewJob2Idx + 1) % j2Options.length];
				scrollC.add(
					button(
						this,
						x0 + wAll - 64,
						curY + 15,
						120,
						22,
						`👁️ สลับดู ${other.icon}${other.name}`,
						() => {
							this.previewJob2Idx =
								(this.previewJob2Idx + 1) % j2Options.length;
							this.render();
						},
						{ size: 10, fill: 0x4a5a8a, color: UI.text },
					),
				);
			}
		}
		curY += 34;

		// Arrange Tier 2 branches so `<j2>_s3` is column 0, regular branches in middle, and `<j2>_u2` (Ult วิวัฒน์) aligns near the Ultimate Spine!
		const rawBrs2 = branches2Of(j2.id);
		const s3Br = rawBrs2.find((b) => b.id.endsWith("_s3"));
		const u2Br = rawBrs2.find((b) => b.id.endsWith("_u2"));
		const midBrs2 = rawBrs2.filter(
			(b) => !b.id.endsWith("_s3") && !b.id.endsWith("_u2"),
		);
		// Place u2Br at index 3 (out of 5 columns: s3, mid0, mid1, u2, mid2) so it lines up vertically under Tier 1 Ult column!
		const brs2 = [
			...(s3Br ? [s3Br] : []),
			...midBrs2.slice(0, 2),
			...(u2Br ? [u2Br] : []),
			...midBrs2.slice(2),
		];
		const cols2 = brs2.map((br) => nodesOf(br.id));
		const gap2 = 7,
			cw2 = (wAll - gap2 * (cols2.length - 1)) / cols2.length,
			rh2 = 62;
		const t2PanelH = 294;
		const top2 = curY + 26;
		const pos2 = new Map<string, { x: number; y: number; isUlt?: boolean }>();
		let ult2CenterX = ult1CenterX;
		let s3CenterX = s1CenterX;

		cols2.forEach((c, i) => {
			const x = x0 + i * (cw2 + gap2),
				br = brs2[i];
			const isUlt2 = br.id.endsWith("_u2");
			if (isUlt2) ult2CenterX = x + cw2 / 2;
			if (br.id.endsWith("_s3")) s3CenterX = x + cw2 / 2;
			scrollC.add(
				panel(
					this,
					x - 2,
					curY,
					cw2 + 4,
					t2PanelH,
					isUlt2 ? 0x241934 : 0x16192e,
					isUlt2 ? COLORS.gold : UI.line,
					8,
				),
			);
			const hG = this.add.graphics();
			hG.fillStyle(isUlt2 ? 0x3b2818 : 0x232948, 0.95).fillRoundedRect(
				x - 1,
				curY + 1,
				cw2 + 2,
				22,
				6,
			);
			hG.lineStyle(1, isUlt2 ? COLORS.gold : UI.lineHi, 0.7).strokeRoundedRect(
				x - 1,
				curY + 1,
				cw2 + 2,
				22,
				6,
			);
			scrollC.add(hG);
			scrollC.add(
				clipW(
					txt(
						this,
						x + 4,
						curY + 4,
						`${isUlt2 ? "🔥 " : ""}${br.icon} ${br.name}`,
						10.5,
						isUlt2 ? "#ffe994" : UI.gold,
						true,
					),
					cw2 - 6,
				),
			);
			const under = c.some((n) => n.kind) ? 1 : 0;
			c.forEach((n) =>
				pos2.set(n.id, {
					x,
					y: top2 + (n.kind ? 0 : n.tier - 1 + under) * rh2,
					isUlt: isUlt2,
				}),
			);

			const pet =
				t2Unlocked && j2.id === "beastmaster" ? BRANCH_PET[br.id] : undefined;
			if (pet) {
				const cur = (s.pet ?? "hawk") === pet,
					evo = (t2[`${br.id}4`] ?? 0) > 0,
					narrow = cw2 < 110;
				const label = narrow
					? `${cur ? "✅" : "🐾"} ${PETS[pet].icon}`
					: cur
						? `✅ คู่หู: ${PETS[pet].icon} ${evo ? PETS[pet].evo : PETS[pet].name}`
						: `🐾 เลือก ${PETS[pet].icon} ${PETS[pet].name}`;
				scrollC.add(
					button(
						this,
						x + cw2 / 2,
						curY + t2PanelH - 18,
						cw2 - 10,
						26,
						label,
						() => {
							if (cur) return;
							s.pet = pet;
							persist();
							toast(
								this,
								`คู่หู: ${PETS[pet].icon} ${PETS[pet].name} · ${PETS[pet].desc}`,
							);
							this.render();
						},
						{
							size: 11,
							fill: cur ? COLORS.gold : 0x4a5a8a,
							color: cur ? UI.ink : UI.text,
						},
					),
				);
			}
		});

		// Draw Cross-Class Energy Bridges from Tier 1 -> Tier 2 (Skill 1 -> Skill 3 AND Ultimate Spine 1 -> Ultimate Spine 2)
		this.drawEvolutionConduit(
			spineG,
			s1CenterX,
			t1BottomY,
			s3CenterX,
			curY,
			0x5bc0ff,
			t2Unlocked,
			"⚡ ต่อยอดทักษะ 1 → 3",
		);
		this.drawEvolutionConduit(
			spineG,
			ult1CenterX,
			t1BottomY,
			ult2CenterX,
			curY,
			COLORS.gold,
			t2Unlocked,
			"🔥 สืบทอดพลัง Ult ขั้น 1 → 2",
		);

		const edgeG2 = this.add.graphics();
		scrollC.add(edgeG2);
		for (const [id, p] of pos2) {
			const n = nodeById(id)!,
				pp = n.parent ? pos2.get(n.parent) : undefined;
			if (pp) {
				const active = (t2[id] ?? 0) > 0;
				edgeG2
					.lineStyle(active ? 3 : 2, active ? COLORS.gold : 0x2e3558, 1)
					.lineBetween(pp.x + cw2 / 2, pp.y + nh, p.x + cw2 / 2, p.y);
				if (active)
					edgeG2
						.lineStyle(1, 0xfff6c7, 0.8)
						.lineBetween(pp.x + cw2 / 2, pp.y + nh, p.x + cw2 / 2, p.y);
			}
		}
		for (const [id, p] of pos2) {
			const n = nodeById(id)!,
				lv = t2[id] ?? 0;
			const why = t2Unlocked
				? lockReason(t2, s.job, n, j2.id)
				: `ปลดล็อกเมื่อเปลี่ยนอาชีพเป็น ${j2.name}`;
			const open = t2Unlocked && (!why || why === "เต็มแล้ว"),
				star = n.tier === 4,
				sel = id === this.selNode;
			this.drawSkillNode(
				scrollC,
				p.x,
				p.y,
				cw2,
				nh,
				n,
				lv,
				open,
				star,
				sel,
				() => {
					this.selNode = id;
					this.render();
				},
				!!p.isUlt,
			);
		}

		const t2BottomY = curY + t2PanelH;
		curY = t2BottomY + 42;

		// ==================== TIER 3: 3RD CLASS AWAKENING WEB ====================
		this.tierOffsets[2] = Math.max(0, curY - 38);
		const t3Header = this.add.graphics();
		t3Header
			.fillStyle(isJ3Active ? 0x2f2238 : 0x1a1c30, 0.96)
			.fillRoundedRect(x0 - 2, curY, wAll + 4, 30, 7);
		t3Header
			.lineStyle(1.5, isJ3Active ? COLORS.gold : UI.lineHi, 0.9)
			.strokeRoundedRect(x0 - 2, curY, wAll + 4, 30, 7);
		scrollC.add(t3Header);

		if (j3Def) {
			const spent3 = tree3Spent(t3, j3Def.id);
			const vKey = s.job3Var ?? "a",
				vObj = j3Def.variants[vKey];
			const lock3 = isJ3Active ? "" : job3Lock(s, j3Def.id);
			scrollC.add(
				clipW(
					txt(
						this,
						x0 + 8,
						curY + 6,
						`3️⃣ ขั้น 3: ${j3Def.icon} ${j3Def.name} ${isJ3Active ? `(Job3 Lv ${s.job3Level ?? 1}/${JOB3_RULES.maxJobLevel} · ${path === "hybrid" ? "👊Hybrid" : `${j3Def.icon}Pure`})` : `🔒 ${lock3}`}`,
						11.5,
						isJ3Active ? UI.gold : "#ffd984",
						true,
					),
					350,
				),
			);
			if (isJ3Active) {
				scrollC.add(
					button(
						this,
						x0 + wAll - 224,
						curY + 15,
						76,
						22,
						`${vObj.icon} แบบ ${vKey.toUpperCase()}`,
						() => {
							setJob3Variant(vKey === "a" ? "b" : "a");
							toast(
								this,
								`สลับเป็น ${j3Def.variants[s.job3Var!].icon} ${j3Def.variants[s.job3Var!].name}`,
							);
							this.redraw();
						},
						{ size: 10, fill: 0x4a5a8a, color: UI.text },
					),
				);
				scrollC.add(
					button(
						this,
						x0 + wAll - 140,
						curY + 15,
						80,
						22,
						"⚙️ สาย/ตื่นรู้",
						() => go(this, "job", { job3: true }),
						{ size: 10, fill: 0x4a5a8a, color: UI.text },
					),
				);
				scrollC.add(
					button(
						this,
						x0 + wAll - 48,
						curY + 15,
						88,
						22,
						"↺ รีเซ็ตขั้น 3",
						() => {
							const back = resetTree3(s);
							s.job3Points = (s.job3Points ?? 0) + back;
							persist();
							toast(this, `คืน ${back} แต้มใยชั้น 3 แล้ว`);
							this.redraw();
						},
						{ size: 10, fill: 0x5a5f8a, color: UI.text },
					).setEnabled(spent3 > 0),
				);
			} else {
				scrollC.add(
					button(
						this,
						x0 + wAll - 60,
						curY + 15,
						110,
						22,
						"⚔️ ข้อมูลตื่นรู้",
						() => go(this, "job", { job3: true }),
						{ size: 10, fill: 0x4a5a8a, color: UI.text },
					),
				);
			}
			curY += 34;

			const rawBrs3 = web3Scope(j3Def.id, path);
			// Align `<j3>_u3` with the Ultimate Spine (index 2 on pure 4-column layout)
			const u3Br = rawBrs3.find((b) => b.id.endsWith("_u3"));
			const otherBrs3 = rawBrs3.filter((b) => !b.id.endsWith("_u3"));
			const brs3 = [
				...otherBrs3.slice(0, 2),
				...(u3Br ? [u3Br] : []),
				...otherBrs3.slice(2),
			];
			const cols3 = brs3.map((br) =>
				nodesOf(br.id).filter(
					(n) => path !== "hybrid" || n.tier <= HYBRID_MAX_TIER || n.kind,
				),
			);
			const gap3 = 6,
				cw3 = (wAll - gap3 * (cols3.length - 1)) / cols3.length,
				rh3 = 62;
			const t3PanelH = 278,
				top3 = curY + 26;
			const pos3 = new Map<string, { x: number; y: number; isUlt?: boolean }>();
			let ult3CenterX = ult2CenterX;
			let legCenterX = x0 + cw3 / 2;

			cols3.forEach((c, i) => {
				const x = x0 + i * (cw3 + gap3),
					br = brs3[i];
				const isUlt3 = br.id.endsWith("_u3");
				if (isUlt3) ult3CenterX = x + cw3 / 2;
				if (br.id.endsWith("_l")) legCenterX = x + cw3 / 2;
				scrollC.add(
					panel(
						this,
						x - 2,
						curY,
						cw3 + 4,
						t3PanelH,
						isUlt3 ? 0x261a36 : br.job3 ? 0x16192e : 0x1f172c,
						isUlt3 ? COLORS.gold : UI.line,
						8,
					),
				);
				const hG = this.add.graphics();
				hG.fillStyle(isUlt3 ? 0x3b2818 : 0x232948, 0.95).fillRoundedRect(
					x - 1,
					curY + 1,
					cw3 + 2,
					22,
					6,
				);
				hG.lineStyle(
					1,
					isUlt3 ? COLORS.gold : UI.lineHi,
					0.7,
				).strokeRoundedRect(x - 1, curY + 1, cw3 + 2, 22, 6);
				scrollC.add(hG);
				scrollC.add(
					clipW(
						txt(
							this,
							x + 4,
							curY + 4,
							`${isUlt3 ? "🔥 " : ""}${br.icon} ${br.name}`,
							10.5,
							isUlt3 ? "#ffe994" : br.job3 ? UI.gold : UI.sub,
							true,
						),
						cw3 - 6,
					),
				);
				c.forEach((n) =>
					pos3.set(n.id, {
						x,
						y: top3 + (n.kind ? 0 : n.tier - 1) * rh3,
						isUlt: isUlt3,
					}),
				);
			});

			this.drawEvolutionConduit(
				spineG,
				x0 + wAll * 0.35,
				t2BottomY,
				legCenterX,
				curY,
				0xb88cff,
				isJ3Active,
				"⚜️ แต้มใยชั้น 2 → โบนัสสายตำนาน",
			);
			this.drawEvolutionConduit(
				spineG,
				ult2CenterX,
				t2BottomY,
				ult3CenterX,
				curY,
				COLORS.gold,
				isJ3Active,
				"🔥 รวมพลัง Ult ขั้น 1+2 → Awakening",
			);

			const edgeG3 = this.add.graphics();
			scrollC.add(edgeG3);
			for (const [id, p] of pos3) {
				const n = nodeById(id)!,
					pp = n.parent ? pos3.get(n.parent) : undefined;
				if (pp) {
					const active = (t3[id] ?? 0) > 0;
					edgeG3
						.lineStyle(active ? 3 : 2, active ? COLORS.gold : 0x2e3558, 1)
						.lineBetween(pp.x + cw3 / 2, pp.y + nh, p.x + cw3 / 2, p.y);
					if (active)
						edgeG3
							.lineStyle(1, 0xfff6c7, 0.8)
							.lineBetween(pp.x + cw3 / 2, pp.y + nh, p.x + cw3 / 2, p.y);
				}
			}
			for (const [id, p] of pos3) {
				const n = nodeById(id)!,
					lv = t3[id] ?? 0;
				const why = isJ3Active
					? lockReason3(t3, s.job, n, j3Def.id, path)
					: `ปลดล็อกเมื่อตื่นรู้เป็น ${j3Def.name}`;
				const open = isJ3Active && (!why || why === "เต็มแล้ว"),
					star = n.tier === 4,
					sel = id === this.selNode;
				this.drawSkillNode(
					scrollC,
					p.x,
					p.y,
					cw3,
					nh,
					n,
					lv,
					open,
					star,
					sel,
					() => {
						this.selNode = id;
						this.render();
					},
					!!p.isUlt,
				);
			}
			curY += t3PanelH + 16;
		} else {
			curY += 34;
			this.drawEvolutionConduit(
				spineG,
				ult2CenterX,
				t2BottomY,
				ult2CenterX,
				curY,
				COLORS.gold,
				false,
				"🔥 รอปลุกพลัง Ult ขั้น 3",
			);
			scrollC.add(panel(this, x0, curY, wAll, 90, 0x16192e, UI.line, 10));
			scrollC.add(
				txt(
					this,
					x0 + wAll / 2,
					curY + 26,
					`🔒 อาชีพขั้น 3 (Awakening) ของ ${j2.icon} ${j2.name} กำลังพัฒนาค่ะ`,
					14,
					UI.gold,
					true,
				).setOrigin(0.5),
			);
			scrollC.add(
				txt(
					this,
					x0 + wAll / 2,
					curY + 52,
					"ระหว่างนี้สามารถใช้แต้มขั้น 2 อัปสกิลขั้น 1 เพื่อเปิดโบนัส Scalable Skill ได้เลย!",
					12,
					UI.sub,
				).setOrigin(0.5),
			);
			curY += 106;
		}

		this.webMaxScroll = Math.max(0, curY - viewH);
		this.webScrollY = Math.max(0, Math.min(this.webMaxScroll, this.webScrollY));
		scrollC.setY(viewY - this.webScrollY);

		// Right-edge scrollbar: track + separately positioned thumb (drag/tap handled in webPointerDown)
		this.webThumb = undefined;
		if (this.webMaxScroll > 0) {
			const sbX = 945,
				sbY = viewY + 4,
				sbH = viewH - 8;
			const track = this.add.graphics();
			track.fillStyle(0x131728, 0.95).fillRoundedRect(sbX, sbY, 8, sbH, 4);
			track.lineStyle(1, UI.line, 0.6).strokeRoundedRect(sbX, sbY, 8, sbH, 4);
			const thumbH = Math.max(44, Math.round((viewH / curY) * sbH));
			const thumb = this.add.graphics();
			thumb.fillStyle(COLORS.gold, 0.9).fillRoundedRect(sbX, 0, 8, thumbH, 4);
			thumb.fillStyle(0xffffff, 0.35).fillRect(sbX + 2, thumbH / 2 - 4, 4, 1);
			thumb.fillStyle(0xffffff, 0.35).fillRect(sbX + 2, thumbH / 2, 4, 1);
			thumb.fillStyle(0xffffff, 0.35).fillRect(sbX + 2, thumbH / 2 + 4, 4, 1);
			b.add([track, thumb]);
			this.webThumb = thumb;
			this.webSb = { y: sbY, h: sbH, thumbH };
		}

		// Remember every interactive inside the scroller (content-space Y) so applyWebScroll can gate it
		this.webC = scrollC;
		this.webHits = [];
		const collect = (list: Phaser.GameObjects.GameObject[], offY: number) => {
			for (const go of list) {
				if (go instanceof Phaser.GameObjects.Container) {
					if (go.input) {
						const top = offY + go.y - go.displayOriginY;
						this.webHits.push({ go, top, bot: top + go.displayHeight });
					}
					collect(go.list, offY + go.y);
				} else if (go instanceof Phaser.GameObjects.Zone && go.input) {
					const top = offY + go.y - go.displayOriginY;
					this.webHits.push({ go, top, bot: top + go.displayHeight });
				}
			}
		};
		collect(scrollC.list, 0);
		applyWebScroll(this);

		// Default selected node fallback
		if (!this.selNode || !nodeById(this.selNode)) {
			this.selNode = cols1[0].cells[0].n.id;
		}
		renderSelectedNodeFooter(this);
	}

	/** Draws a glowing vertical/angled energy conduit connecting Class 1 -> Class 2 -> Class 3 skill lines. */
	private drawEvolutionConduit(
		g: Phaser.GameObjects.Graphics,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		color: number,
		active: boolean,
		label: string,
	) {
		const midY = (y1 + y2) / 2;
		g.lineStyle(active ? 5 : 3, color, active ? 0.35 : 0.18);
		g.beginPath();
		g.moveTo(x1, y1);
		g.lineTo(x1, midY);
		g.lineTo(x2, midY);
		g.lineTo(x2, y2);
		g.strokePath();
		g.lineStyle(
			active ? 2 : 1.5,
			active ? 0xfff6c7 : color,
			active ? 0.9 : 0.45,
		);
		g.beginPath();
		g.moveTo(x1, y1);
		g.lineTo(x1, midY);
		g.lineTo(x2, midY);
		g.lineTo(x2, y2);
		g.strokePath();
		g.fillStyle(color, active ? 0.95 : 0.5)
			.fillCircle(x1, y1, 4)
			.fillCircle(x2, y2, 4);

		const pillW = Math.min(220, Math.max(130, label.length * 6.5));
		const px = (x1 + x2) / 2 - pillW / 2,
			py = midY - 10;
		g.fillStyle(0x111528, 0.92).fillRoundedRect(px, py, pillW, 18, 6);
		g.lineStyle(1, color, active ? 0.8 : 0.4).strokeRoundedRect(
			px,
			py,
			pillW,
			18,
			6,
		);
	}
}

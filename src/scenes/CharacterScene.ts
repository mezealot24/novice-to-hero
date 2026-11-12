import Phaser from "phaser";
import {
	COLORS,
	DUNGEONS,
	H,
	W,
} from "../data/game-data";
import { derivedRows } from "../data/stat-rows";
export { derivedRows };
export { nodeDetail } from "./character/node-detail";
import {
	CARD_RULES,
	cardIcon,
	cardName,
	EQUIP_CARDS,
	TIER_COLOR,
	type EquipCard,
} from "../data/cards";
import { gradeStars, gradeCap } from "../data/craft";
import {
	BASE_STATS,
	smashLv,
	canWearAs,
	forged,
	forgeTag,
	gradeOf,
	isBroken,
	refineOf,
	cardFits,
	CERT_SLOTS_AT,
	EQUIP_SLOTS,
	offhandLocked,
	slotKind,
	type EquipSlot,
	COSTUMES,
	heroStats,
	cardStatLine,
	itemStatLine,
	splitStatLine,
	ITEMS,
	itemById,
	slotCount,
	socketed,
	JOB_RULES,
	NOVICE_PASSIVES,
	NOVICE_RULES,
	noviceLeft,
	noviceSpent,
	RACES,
	SKILLS,
	SLOTS,
	totalBase,
	wearText,
} from "../data/meta";
import {
	canChangeJob,
	canSpendInTier,
	canUnequip,
	equip,
	equipBlock,
	job2Lock,
	job3Lock,
	persist,
	resetNovice,
	resetTree,
	resetTree2,
	resetTree3,
	save,
	setJob3Variant,
	socketCard,
	spendPointInTier,
	totalCrossSpent,
	unequip,
	unsocketCard,
} from "../save";
import {
	HYBRID_MAX_TIER,
	lockReason3,
	tree3Spent,
	web3Scope,
	branches2Of,
	talents2Of,
	tree2Spent,
	BRANCHES,
	branchesOf,
	lockReason,
	nodeTierOf,
	SCALABLE_RULES,
	nodeById,
	nodesOf,
	TALENT_RULES,
	talentEarned,
	talentFree,
	talentPick,
	talentRankText,
	talentsOf,
	TREE_RULES,
	treeSpent,
	ultEvolutionSummary,
	type TreeNode,
} from "../data/tree";
import { JOB_CHANGE, JOBS } from "../data/jobs";
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
	JOB3,
	JOB3_RULES,
	job3Of,
} from "../data/jobs3";
import { UNIQUE } from "../data/uniques";
import { heroPower } from "../data/power";
import { askRepick } from "./JobScene";
import {
	type Btn,
	button,
	confirm,
	go,
	panel,
	tabs,
	toast,
	topBar,
	txt,
	UI,
} from "../ui";
import { fitHeroScale, heroCostumeTint, heroTex } from "../gfx/hero-visual";
import { nodeDetail, clip, clipW } from "./character/node-detail";
import { statusTab } from "./character/status-tab";

const BRANCH_PET: Record<string, PetId> = {
	bm_h: "hawk",
	bm_b: "boar",
	bm_w: "wolf",
}; // Beastmaster ใยชั้น 2 branch -> its pet

// Character sheet: preview on the left, tabs on the right (equipment, cards, status, unified 3-class RO Mobile skill tree, talents).
export class CharacterScene extends Phaser.Scene {
	body?: Phaser.GameObjects.Container;
	private preview?: Phaser.GameObjects.Container;
	private tab = 0;
	private slot: EquipSlot | "costume" = "weapon";
	private bagPage = 0;
	private cardPage = 0;
	private cardBook = false;
	private bookDg = 0;
	private bookV2 = false;
	private skillBasic = false; // skill tab: false = unified 3-class skill web, true = Novice skills + certificates + job
	private selNode = "";
	private showDetail = false; // skill web: node detail modal open
	private modal?: Phaser.GameObjects.Container;
	private webScrollY = 0; // RO Mobile continuous vertical scroll offset
	private webMaxScroll = 0;
	// v-scroll perf: drag/wheel/momentum only move these refs (no full render() per frame)
	private webC?: Phaser.GameObjects.Container;
	private webView = { x: 326, y: 146, w: 616, h: 346 };
	private webThumb?: Phaser.GameObjects.Graphics;
	private webSb = { y: 0, h: 0, thumbH: 0 };
	private webHits: { go: Phaser.GameObjects.GameObject; top: number; bot: number }[] = [];
	private webPills: Btn[] = [];
	private webDrag?: {
		mode: "content" | "thumb";
		startY: number;
		startScroll: number;
		lastY: number;
		lastT: number;
		vel: number;
		moved: boolean;
	};
	private tierOffsets: [number, number, number] = [0, 380, 760]; // Y anchors for Tier 1, Tier 2, Tier 3
	private previewJob2Idx = 0; // when still Class 1, toggle which Class 2 branch to preview in the continuous tree
	private showUlt = false; // skill web: 🔥 รวมผล Ult popup (was the left sidebar; left side is now the node detail panel)
	private talent2 = false; // v119 talent tab: show ทาเลนต์ชั้น 2
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
				if (!this.webActive()) return;
				this.scrollToWebY(this.webScrollY + dy * 0.65, false);
			},
		);
		// Skill-web swipe: scene-level so it starts anywhere in the viewport (even on top of nodes)
		// and survives across frames — the old per-render drag zone was destroyed mid-gesture.
		this.input.on("pointerdown", (p: Phaser.Input.Pointer) =>
			this.webPointerDown(p),
		);
		this.input.on("pointermove", (p: Phaser.Input.Pointer) =>
			this.webPointerMove(p),
		);
		this.input.on("pointerup", () => this.webPointerUp());
		this.input.on("pointerupoutside", () => this.webPointerUp());
		this.events.once("shutdown", () => {
			this.webDrag = undefined;
			this.webC = undefined;
		});
		const back = data?.back; // v101: opened from the forge's 🃏 button -> ‹ กลับ returns there (same item on the anvil)
		topBar(this, "👤 ตัวละคร", () =>
			back ? go(this, back.key, back.data) : go(this, "hub"),
		);
		this.drawPreview();
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

	private render() {
		this.body?.destroy();
		this.modal?.destroy();
		this.modal = undefined;
		this.body = this.add.container(0, 0);
		if (this.tab === 0) this.equipTab();
		else if (this.tab === 1) this.cardTab();
		else if (this.tab === 2) statusTab(this);
		else if (this.tab === 3)
			save().job === "novice" || this.skillBasic
				? this.skillTab()
				: this.unifiedWebTab();
		else this.talentTab();
		if (this.showUlt && this.tab === 3) this.ultModal();
	}

	redraw() {
		this.drawPreview();
		this.render();
	}

	private scrollToWebY(targetY: number, animate = true) {
		const clamped = Math.max(
			0,
			Math.min(this.webMaxScroll, Math.round(targetY)),
		);
		this.tweens.killTweensOf(this);
		if (clamped === this.webScrollY) return;
		if (!animate) {
			this.webScrollY = clamped;
			this.applyWebScroll();
			return;
		}
		this.tweens.add({
			targets: this,
			webScrollY: clamped,
			duration: 260,
			ease: "Cubic.easeOut",
			onUpdate: () => this.applyWebScroll(),
		});
	}

	private webActive() {
		return (
			!!this.webC?.active && this.tab === 3 && !this.showDetail && !this.showUlt
		);
	}

	private webTier(): 1 | 2 | 3 {
		return this.webScrollY < this.tierOffsets[1] - 120
			? 1
			: this.webScrollY < this.tierOffsets[2] - 120
				? 2
				: 3;
	}

	/** Cheap per-frame scroll: moves the content + thumb, re-tints tier pills, gates hit zones. No rebuild. */
	private applyWebScroll() {
		const c = this.webC;
		if (!c?.active) return;
		const v = this.webView;
		c.setY(v.y - this.webScrollY);
		const sb = this.webSb;
		if (this.webThumb?.active && this.webMaxScroll > 0)
			this.webThumb.setY(
				sb.y + (this.webScrollY / this.webMaxScroll) * (sb.h - sb.thumbH),
			);
		const t = this.webTier();
		this.webPills.forEach((pill, i) => {
			if (pill.active) pill.setFill(i + 1 === t ? COLORS.gold : 0x3b4269);
		});
		// Masks don't clip input: disable anything scrolled under the header/tabs, and everything mid-drag
		const dragging = !!this.webDrag?.moved;
		for (const h of this.webHits) {
			const inp = h.go.input;
			if (!inp) continue;
			const top = h.top + c.y,
				bot = h.bot + c.y;
			inp.enabled = !dragging && top >= v.y - 2 && top < v.y + v.h && bot > v.y;
		}
	}

	private webPointerDown(p: Phaser.Input.Pointer) {
		if (!this.webActive() || this.webMaxScroll <= 0) return;
		const v = this.webView;
		const onThumb = p.x >= v.x + v.w - 8 && p.x <= v.x + v.w + 22;
		if (p.y < v.y || p.y > v.y + v.h || p.x < v.x || (!onThumb && p.x > v.x + v.w))
			return;
		this.tweens.killTweensOf(this);
		this.webDrag = {
			mode: onThumb ? "thumb" : "content",
			startY: p.y,
			startScroll: this.webScrollY,
			lastY: p.y,
			lastT: performance.now(),
			vel: 0,
			moved: false,
		};
		if (onThumb) this.webThumbTo(p.y, true);
	}

	private webPointerMove(p: Phaser.Input.Pointer) {
		const d = this.webDrag;
		if (!d || !p.isDown || !this.webActive()) return;
		if (d.mode === "thumb") {
			this.webThumbTo(p.y, false);
			return;
		}
		if (!d.moved && Math.abs(p.y - d.startY) < 8) return;
		if (!d.moved) {
			d.moved = true;
			// cancel any half-pressed button under the finger so releasing doesn't fire it
			for (const h of this.webHits) h.go.emit("pointerout");
		}
		const now = performance.now();
		const dt = Math.max(1, now - d.lastT);
		d.vel = d.vel * 0.3 + ((d.lastY - p.y) / dt) * 0.7; // px/ms, smoothed
		d.lastY = p.y;
		d.lastT = now;
		// rubber-band a little past the edges, clamp on release
		const raw = d.startScroll + (d.startY - p.y);
		const over = raw < 0 ? raw : raw > this.webMaxScroll ? raw - this.webMaxScroll : 0;
		this.webScrollY = raw - over * 0.65;
		this.applyWebScroll();
	}

	private webPointerUp() {
		const d = this.webDrag;
		this.webDrag = undefined;
		if (!d || !this.webC?.active) return;
		if (d.mode === "thumb" || !d.moved) {
			this.applyWebScroll();
			return;
		}
		this.applyWebScroll(); // drag over -> re-enable hit zones
		const idle = performance.now() - d.lastT > 90; // finger rested before lifting -> no fling
		this.scrollToWebY(this.webScrollY + (idle ? 0 : d.vel * 280), true);
	}

	/** Scrollbar: tap the track to jump, drag the thumb to scrub. */
	private webThumbTo(py: number, animate: boolean) {
		const sb = this.webSb;
		const r = Math.max(0, Math.min(1, (py - sb.y - sb.thumbH / 2) / Math.max(1, sb.h - sb.thumbH)));
		this.scrollToWebY(r * this.webMaxScroll, animate);
	}

	// ---------- left: hero preview + derived stats summary (or Cumulative Ult & Scalable panel on Skill Tab) ----------
	private drawPreview() {
		this.preview?.destroy();
		const s = save(),
			c = this.add.container(0, 0);
		this.preview = c;
		c.add(panel(this, 16, 70, 298, 490, UI.panel, UI.line, 14));
		const st = heroStats(s);
		const rows: [string, string][] = [
			["⚡ Hero Power", `${heroPower(s)}`],
			...derivedRows(st),
		]; // v59: the number monsters scale to
		if (this.tab === 0) {
			// equipment screen (RO style): hero sits between the gear slots, so this side is a stats panel
			c.add(panel(this, 26, 78, 278, 44, UI.panelHi, UI.goldDark, 10));
			c.add(
				txt(
					this,
					165,
					84,
					`${s.supporter ? "🌟 " : ""}${s.name}`,
					18,
					s.supporter ? UI.gold : UI.text,
					true,
				).setOrigin(0.5, 0),
			);
			c.add(
				txt(
					this,
					165,
					104,
					`${s.job2 ? `${JOB2[s.job2].icon} ${JOB2[s.job2].name}` : `${JOBS[s.job].icon} ${JOBS[s.job].name}`} · Base Lv ${s.baseLevel} · ${s.job2 ? `Job2 Lv ${s.job2Level ?? 1}` : `Job Lv ${s.jobLevel}`}`,
					11,
					UI.sub,
				).setOrigin(0.5, 0),
			);
			const tot = totalBase(s);
			BASE_STATS.forEach((bs, i) => {
				const x = 26 + (i % 2) * 144,
					y = 128 + Math.floor(i / 2) * 26;
				c.add(panel(this, x, y, 136, 22, 0x161a2e, UI.line, 6));
				c.add(txt(this, x + 8, y + 3, bs.name, 12, UI.gold, true));
				c.add(
					txt(
						this,
						x + 128,
						y + 3,
						`${tot[bs.id]}`,
						12,
						UI.text,
						true,
					).setOrigin(1, 0),
				);
			});
			// RPG Stat Table with alternating row tints
			rows.forEach(([k, v], i) => {
				const y = 236 + i * 20;
				if (i % 2 === 0) {
					const bg = this.add.graphics();
					bg.fillStyle(0xffffff, 0.02).fillRoundedRect(24, y - 2, 282, 18, 4);
					c.add(bg);
				}
				c.add(txt(this, 30, y, k, 12, i === 0 ? UI.gold : UI.sub, i === 0));
				c.add(
					txt(this, 300, y, v, 12, i === 0 ? UI.gold : UI.text, true).setOrigin(
						1,
						0,
					),
				);
			});
			return;
		}

		// Skill web: left side is the node detail panel (drawn by nodeFooter into body) -> compact hero strip only
		if (this.tab === 3 && s.job !== "novice" && !this.skillBasic) {
			this.drawSkillHeroStrip(c);
			return;
		}

		// Hero Avatar Podium / Frame
		const pod = this.add.graphics();
		pod.fillStyle(0x000000, 0.4).fillEllipse(165, 192, 130, 36);
		pod.fillStyle(0x353b60, 0.3).fillEllipse(165, 190, 110, 26);
		pod.lineStyle(1.5, UI.goldDark, 0.5).strokeCircle(165, 145, 60);
		c.add(pod);

		const spr = this.add
			.image(165, 145, heroTex(s))
			.setTint(heroCostumeTint(s.costume));
		c.add(spr.setScale(fitHeroScale(spr.width, spr.height, 2.5, 132)));

		// Hero title banner card
		const j3 = activeJob3(s);
		c.add(panel(this, 26, 206, 278, 68, UI.panelHi, UI.goldDark, 10));
		c.add(
			txt(
				this,
				165,
				214,
				`${s.supporter ? "🌟 " : ""}${s.name}`,
				20,
				s.supporter ? UI.gold : UI.text,
				true,
			).setOrigin(0.5),
		);
		const lineage = j3
			? `${JOBS[s.job].icon} → ${JOB2[s.job2!].icon} → ${JOB3[j3].icon} ${JOB3[j3].name}`
			: s.job2
				? `${JOBS[s.job].icon} ${JOBS[s.job].name} → ${JOB2[s.job2].icon} ${JOB2[s.job2].name}`
				: `${RACES[s.race].icon} ${RACES[s.race].name} · ${JOBS[s.job].icon} ${JOBS[s.job].name}`;
		c.add(txt(this, 165, 238, lineage, 12, UI.sub).setOrigin(0.5));
		c.add(
			txt(
				this,
				165,
				258,
				`Base Lv ${s.baseLevel} · ${j3 ? `Job3 Lv ${s.job3Level ?? 1}/${JOB3_RULES.maxJobLevel}` : s.job2 ? `Job2 Lv ${s.job2Level ?? 1}/${JOB2_RULES.maxJobLevel}` : `Job Lv ${s.jobLevel}/${s.job === "novice" ? JOB_RULES.maxJobLevel : JOB_CHANGE.classMaxJobLevel}`}`,
				12,
				UI.gold,
			).setOrigin(0.5),
		);

		// Stats box with grouped rows
		const statBox = this.add.graphics();
		statBox.fillStyle(0x131728, 0.85).fillRoundedRect(24, 280, 282, 270, 8);
		statBox
			.lineStyle(1.5, UI.line, 0.8)
			.strokeRoundedRect(24, 280, 282, 270, 8);
		c.add(statBox);

		rows.forEach(([k, v], i) => {
			const y = 286 + i * 16.5;
			if (i % 2 === 1) {
				const rowBg = this.add.graphics();
				rowBg.fillStyle(0xffffff, 0.025).fillRect(26, y - 2, 278, 16);
				c.add(rowBg);
			}
			c.add(txt(this, 30, y, k, 11, i === 0 ? UI.gold : UI.sub, i === 0));
			c.add(
				txt(this, 300, y, v, 11, i === 0 ? UI.gold : UI.text, true).setOrigin(
					1,
					0,
				),
			);
		});
	}

	/** Skill web left panel top: one-line hero identity + 🔥 รวมผล Ult popup button. Rest of the panel = node detail. */
	private drawSkillHeroStrip(c: Phaser.GameObjects.Container) {
		const s = save(),
			j3 = activeJob3(s);
		const cls = j3
			? `${JOB3[j3].icon} ${JOB3[j3].name}`
			: s.job2
				? `${JOB2[s.job2].icon} ${JOB2[s.job2].name}`
				: `${JOBS[s.job].icon} ${JOBS[s.job].name}`;
		const jl = j3
			? `Job3 Lv ${s.job3Level ?? 1}`
			: s.job2
				? `Job2 Lv ${s.job2Level ?? 1}`
				: `Job Lv ${s.jobLevel}`;
		c.add(
			clipW(
				txt(this, 28, 80, `${s.supporter ? "🌟 " : ""}${s.name}`, 15, s.supporter ? UI.gold : UI.text, true),
				170,
			),
		);
		c.add(clipW(txt(this, 28, 101, `${cls} · Base ${s.baseLevel} · ${jl}`, 10.5, UI.sub), 170));
		c.add(
			button(
				this,
				254,
				98,
				96,
				32,
				"🔥 รวมผล Ult",
				() => {
					this.showUlt = true;
					this.render();
				},
				{ size: 12, fill: 0x5a4320, color: UI.gold },
			),
		);
		const g = this.add.graphics();
		g.lineStyle(1, UI.line, 0.8).lineBetween(26, 124, 304, 124);
		c.add(g);
	}

	/** 🔥 รวมผล Ult popup: the old left sidebar card, scaled up and centered. */
	private ultModal() {
		const close = () => {
			this.showUlt = false;
			this.render();
		};
		const c = this.add.container(0, 0).setDepth(30000);
		this.modal = c;
		const dim = this.add
			.rectangle(W / 2, H / 2, W, H, 0x080a18, 0.8)
			.setInteractive();
		dim.on("pointerup", close);
		c.add(dim);
		// sidebar art spans x 24..306, y 280..552 (center 165,416) -> scale around the screen center
		const k = Math.min(1.6, (H - 70) / 272);
		const inner = this.add.container(W / 2 - 165 * k, H / 2 - 416 * k).setScale(k);
		inner.add(this.add.zone(24, 280, 282, 272).setOrigin(0).setInteractive()); // swallow taps on the card
		this.drawUltEvolutionSidebar(inner);
		c.add(inner);
		c.add(
			button(this, W / 2 + 141 * k + 28, H / 2 - 136 * k + 18, 40, 36, "✕", close, {
				size: 17,
				fill: 0x5a5f8a,
				color: UI.text,
			}),
		);
	}

	/** Left sidebar card on the Skill Tree tab: shows how Ultimate accumulates Class 1 -> 2 -> 3 benefits + Scalable Milestones. */
	private drawUltEvolutionSidebar(c: Phaser.GameObjects.Container) {
		const s = save();
		const j3 = activeJob3(s);
		const crossPts = totalCrossSpent(s);
		const sum = ultEvolutionSummary(
			s.job,
			s.job2,
			j3,
			s.jobTree ?? {},
			s.job2Tree ?? {},
			s.job3Tree ?? {},
			crossPts,
		);

		const box = this.add.graphics();
		box.fillStyle(0x14172b, 0.94).fillRoundedRect(24, 280, 282, 272, 10);
		box
			.lineStyle(1.5, UI.goldDark, 0.85)
			.strokeRoundedRect(24, 280, 282, 272, 10);
		c.add(box);

		c.add(
			clipW(
				txt(
					this,
					32,
					286,
					`🔥 รวมผล Ult: ${sum.curIcon} ${sum.curName}`,
					13,
					UI.gold,
					true,
				),
				264,
			),
		);
		// 3 Cumulative Ultimate Tiers stacked with connecting vertical gold spine
		const spine = this.add.graphics();
		spine.lineStyle(2, COLORS.gold, 0.65).lineBetween(40, 316, 40, 424);
		c.add(spine);

		sum.tiers.forEach((tr, idx) => {
			const ty = 310 + idx * 45;
			const cardG = this.add.graphics();
			cardG
				.fillStyle(tr.active ? 0x1e2544 : 0x16192c, 0.92)
				.fillRoundedRect(30, ty, 270, 41, 7);
			cardG
				.lineStyle(1, tr.active ? COLORS.gold : 0x2e3558, tr.active ? 0.7 : 0.5)
				.strokeRoundedRect(30, ty, 270, 41, 7);
			c.add(cardG);
			c.add(
				clipW(
					txt(
						this,
						36,
						ty + 3,
						`${tr.icon} ${tr.name}`,
						11,
						tr.active ? "#ffe994" : UI.sub,
						true,
					),
					258,
				),
			);
			c.add(
				clipW(
					txt(this, 36, ty + 20, tr.summary, 10, tr.active ? UI.green : UI.sub),
					258,
				),
			);
		});

		// Scalable Skill & Cross-Tier Point Breakthrough section
		const syY = 448;
		const syG = this.add.graphics();
		syG.fillStyle(0x1b1832, 0.95).fillRoundedRect(30, syY, 270, 98, 8);
		syG.lineStyle(1, 0x8a6fd1, 0.8).strokeRoundedRect(30, syY, 270, 98, 8);
		c.add(syG);

		c.add(
			txt(
				this,
				36,
				syY + 4,
				"⚡ Scalable Skill (อัปคลาส 1 เปิดลูกเล่นใหม่)",
				11,
				"#d7bfff",
				true,
			),
		);

		const odOn = sum.ultOverdrive;
		c.add(
			clipW(
				txt(
					this,
					36,
					syY + 23,
					`${odOn ? "✅" : "🔒"} 🌟 Ult Overdrive (สาย Ult ขั้น 1: ${sum.ultPts}/${SCALABLE_RULES.ultOverdriveNeed})`,
					10,
					odOn ? UI.green : UI.text,
					odOn,
				),
				258,
			),
		);
		c.add(
			clipW(
				txt(
					this,
					44,
					syY + 37,
					"ปลดล็อก: Ult ทุกคลาสแรงขึ้น +15% ทุกฮิต!",
					9.5,
					odOn ? "#ffe994" : UI.sub,
				),
				250,
			),
		);

		const awOn = sum.s1Awaken;
		c.add(
			clipW(
				txt(
					this,
					36,
					syY + 53,
					`${awOn ? "✅" : "🔒"} ⚡ Origin Awaken (สายทักษะ 1: ${sum.s1Pts}/${SCALABLE_RULES.s1AwakenNeed})`,
					10,
					awOn ? UI.green : UI.text,
					awOn,
				),
				258,
			),
		);
		c.add(
			clipW(
				txt(
					this,
					44,
					syY + 67,
					"ปลดล็อก: ทักษะ 1 & ทักษะ 3 แรงขึ้น +12%!",
					9.5,
					awOn ? "#ffe994" : UI.sub,
				),
				250,
			),
		);

		const crPct =
			Math.round(
				Math.min(
					SCALABLE_RULES.crossPtCap,
					crossPts * SCALABLE_RULES.crossPtBonus,
				) * 1000,
			) / 10;
		c.add(
			clipW(
				txt(
					this,
					36,
					syY + 82,
					`🔗 แต้มคลาสสูงอัดลงคลาสต่ำ: ${crossPts} แต้ม (สกิล&Ult +${crPct}%)`,
					9.5,
					crossPts > 0 ? UI.gold : UI.sub,
					crossPts > 0,
				),
				258,
			),
		);
	}

	// ---------- tab 1: equipment screen (RO style): 3 slots left, hero in the middle, 3 slots right ----------
	private equipTab() {
		const s = save(),
			b = this.body!;
		const locked = offhandLocked(s);
		const costume = COSTUMES.find((c) => c.id === s.costume) ?? COSTUMES[0];
		// hero in the middle
		b.add(panel(this, 528, 112, 220, 196, 0x23284a, UI.line, 14));
		const eqSpr = this.add.image(638, 186, heroTex(s)).setTint(costume.tint);
		b.add(eqSpr.setScale(fitHeroScale(eqSpr.width, eqSpr.height, 3, 154)));
		const onC = this.slot === "costume";
		b.add(
			button(
				this,
				638,
				284,
				200,
				30,
				`👗 ${costume.name}`,
				() => {
					this.slot = "costume";
					this.bagPage = 0;
					this.render();
				},
				{
					size: 13,
					fill: onC ? COLORS.gold : 0x5a5f8a,
					color: onC ? UI.ink : UI.text,
				},
			),
		);
		EQUIP_SLOTS.forEach((sl, i) => {
			const x = i < 3 ? 330 : 756,
				y = 112 + (i % 3) * 66,
				on = sl.id === this.slot;
			const twin = sl.id === "offhand" && locked;
			const it = itemById(s.equipped[twin ? "weapon" : sl.id]),
				n = twin ? 0 : slotCount(it, gradeOf(s, it.id));
			const g = this.add.graphics();
			g.fillStyle(on ? 0x34396a : UI.panel, 1).fillRoundedRect(
				x,
				y,
				190,
				60,
				12,
			);
			g.lineStyle(on ? 3 : 2, on ? COLORS.gold : UI.line).strokeRoundedRect(
				x,
				y,
				190,
				60,
				12,
			);
			b.add(g);
			b.add(txt(this, x + 10, y + 4, `${sl.icon} ${sl.name}`, 11, UI.sub));
			if (n)
				b.add(
					txt(
						this,
						x + 182,
						y + 4,
						`🃏${socketed(s, it).length}/${n}`,
						11,
						UI.gold,
					).setOrigin(1, 0),
				);
			const r = refineOf(s, it.id),
				tag = twin
					? ""
					: [
							gradeOf(s, it.id) > 1
								? r
									? `★${gradeOf(s, it.id)}`
									: gradeStars(gradeOf(s, it.id), gradeCap(it))
								: "",
							r ? `+${r}` : "",
						]
							.filter(Boolean)
							.join(" ");
			if (tag)
				b.add(
					txt(this, x + (n ? 140 : 182), y + 4, tag, 11, "#ffd36b").setOrigin(
						1,
						0,
					),
				);
			b.add(
				txt(
					this,
					x + 10,
					y + 19,
					clip(`${it.icon} ${it.name}`, 15),
					15,
					it.id.startsWith("none") ? UI.sub : UI.text,
					true,
				),
			);
			const warn = twin
				? ""
				: isBroken(s, it.id)
					? "💔 แตก ไม่ได้ค่าพลัง (ซ่อมที่โรงตีเหล็ก)"
					: !canWearAs(it, s)
						? `⚠ ${wearText(it)} เท่านั้น`
						: "";
			const curse =
				!twin && !warn && !!splitStatLine(forged(s, it), !!it.unique).curse;
			if (twin)
				b.add(
					txt(
						this,
						x + 10,
						y + 41,
						"🔒 อาวุธ 2 มือ: ใช้ทั้งสองมือ",
						10,
						"#ffd36b",
					),
				);
			else
				b.add(
					txt(
						this,
						x + 10,
						y + 41,
						clip(
							warn ||
								`${curse ? "💀" : ""}${itemStatLine(forged(s, it))}` ||
								it.desc,
							30,
						),
						10,
						warn ? UI.red : curse ? "#ffa06b" : UI.green,
					),
				);
			const z = this.add
				.zone(x + 95, y + 30, 190, 60)
				.setInteractive({ useHandCursor: true });
			z.on("pointerup", () => {
				this.slot = sl.id;
				this.bagPage = 0;
				this.render();
			});
			b.add(z);
		});

		const cur = EQUIP_SLOTS.find((q) => q.id === this.slot);
		b.add(
			txt(
				this,
				330,
				314,
				this.slot === "costume"
					? "👗 ชุดที่มี (ซื้อเพิ่มที่ร้านเพชร)"
					: `${cur!.icon} ${cur!.name}: ของที่มีในกระเป๋า${this.slot === "offhand" && locked ? " · 🔒 ถืออาวุธ 2 มือ แทนมือรอง" : ""}`,
				14,
				UI.sub,
			),
		);
		const slot = this.slot;
		if (slot !== "costume")
			b.add(
				button(this, 896, 314, 100, 28, "✋ ถอด", () => this.takeOff(slot), {
					size: 13,
					fill: 0x8a6fd1,
					color: UI.text,
				}).setEnabled(canUnequip(s, slot)),
			);
		const list =
			slot === "costume"
				? COSTUMES.filter((c) => s.costumes.includes(c.id)).map((c) => ({
						id: c.id,
						label: c.name,
						desc: "ไม่มีค่าพลัง",
						worn: s.costume === c.id,
						tint: c.tint,
						other: "",
					}))
				: ITEMS.filter(
						(it) => it.slot === slotKind(slot) && s.owned.includes(it.id),
					)
						.sort((a, c) => Number(!canWearAs(a, s)) - Number(!canWearAs(c, s)))
						.map((it) => {
							const other =
								slot === "acc" || slot === "acc2"
									? s.equipped[slot === "acc" ? "acc2" : "acc"] === it.id &&
										it.id !== "none"
										? "ใส่อีกข้าง"
										: ""
									: "";
							const lock2h =
								slot === "offhand" && locked && it.id !== "none_off";
							return {
								id: it.id,
								label: `${it.icon} ${it.name}${forgeTag(s, it.id)}`,
								desc: lock2h
									? "🔒 ถืออาวุธ 2 มืออยู่ ใส่ไม่ได้"
									: !canWearAs(it, s)
										? `⚠ ${wearText(it)} เท่านั้น`
										: isBroken(s, it.id)
											? "💔 แตก: ไม่ได้ค่าพลังจนกว่าจะซ่อม"
											: `${splitStatLine(forged(s, it), !!it.unique).curse ? "💀" : ""}${itemStatLine(forged(s, it))}` ||
												it.desc,
								worn: s.equipped[slot] === it.id,
								tint: 0,
								off: !canWearAs(it, s) || lock2h,
								other,
								curse: !!it.unique && !!splitStatLine(forged(s, it)).curse,
							};
						});
		const per = 6,
			pages = Math.max(1, Math.ceil(list.length / per));
		this.bagPage = Math.min(this.bagPage, pages - 1);
		if (pages > 1) {
			b.add(
				button(
					this,
					700,
					545,
					44,
					34,
					"◀",
					() => {
						this.bagPage--;
						this.render();
					},
					{ size: 15 },
				).setEnabled(this.bagPage > 0),
			);
			b.add(
				txt(
					this,
					745,
					545,
					`${this.bagPage + 1}/${pages}`,
					14,
					UI.text,
					true,
				).setOrigin(0.5),
			);
			b.add(
				button(
					this,
					790,
					545,
					44,
					34,
					"▶",
					() => {
						this.bagPage++;
						this.render();
					},
					{ size: 15 },
				).setEnabled(this.bagPage < pages - 1),
			);
		}
		list
			.slice(this.bagPage * per, this.bagPage * per + per)
			.forEach((it, i) => {
				const x = 330 + (i % 2) * 308,
					y = 336 + Math.floor(i / 2) * 58;
				b.add(
					panel(
						this,
						x,
						y,
						300,
						52,
						UI.panel,
						it.worn ? COLORS.gold : UI.line,
						10,
					),
				);
				if (it.tint)
					b.add(
						this.add
							.image(x + 24, y + 26, "novice")
							.setScale(0.85)
							.setTint(it.tint),
					);
				b.add(
					txt(
						this,
						x + (it.tint ? 48 : 12),
						y + 5,
						clip(it.label, 17),
						15,
						UI.text,
						true,
					),
				);
				b.add(
					txt(
						this,
						x + (it.tint ? 48 : 12),
						y + 28,
						clip(it.desc, 30),
						11,
						"off" in it && it.off
							? UI.red
							: "curse" in it && it.curse
								? "#ffa06b"
								: UI.green,
					)
						.setWordWrapWidth(196)
						.setLineSpacing(0),
				);
				const takeOffRow = it.worn && slot !== "costume" && canUnequip(s, slot);
				b.add(
					button(
						this,
						x + 258,
						y + 26,
						72,
						36,
						takeOffRow
							? "ถอด"
							: it.worn
								? "ใส่อยู่"
								: it.other
									? "ย้ายมา"
									: "ใส่",
						() => {
							if (slot === "costume") s.costume = it.id;
							else if (takeOffRow) {
								this.takeOff(slot);
								return;
							} else {
								const why = equipBlock(s, it.id, slot);
								if (why) {
									toast(
										this,
										why === "twohand"
											? "ถืออาวุธ 2 มืออยู่ ใส่มือรองไม่ได้ค่ะ เปลี่ยนเป็นอาวุธ 1 มือก่อนนะคะ"
											: why === "unique"
												? `ใส่ของยูนีคได้พร้อมกันสูงสุด ${UNIQUE.maxEquipped} ชิ้นค่ะ ถอดชิ้นอื่นก่อนนะคะ`
												: "ใส่ช่องนี้ไม่ได้ค่ะ",
										UI.red,
									);
									return;
								}
								const pushed =
									slot === "weapon" &&
									itemById(it.id).twoHand &&
									canUnequip(s, "offhand")
										? itemById(s.equipped.offhand)
										: null;
								equip(s, it.id, slot);
								if (pushed)
									toast(
										this,
										`ถือ 2 มือ: เก็บ ${pushed.icon} ${pushed.name} กลับกระเป๋าแล้วค่ะ`,
									);
							}
							persist();
							this.redraw();
						},
						{ size: 14 },
					).setEnabled(takeOffRow || (!it.worn && !("off" in it && it.off))),
				);
			});
		if (list.length <= 1)
			b.add(
				txt(
					this,
					638,
					440,
					slot === "costume"
						? "ยังไม่มีชุดอื่น"
						: "ยังไม่มีของชิ้นอื่น\nเก็บ zeny จากดันแล้วไปร้านค้านะคะ",
					15,
					UI.sub,
				)
					.setOrigin(0.5)
					.setAlign("center"),
			);
		b.add(
			button(
				this,
				876,
				545,
				140,
				34,
				slot === "costume" ? "💎 ร้านเพชร" : "🛒 ร้านค้า",
				() => go(this, slot === "costume" ? "gemshop" : "shop"),
				{ size: 15, fill: 0x5a5f8a, color: UI.text },
			),
		);
	}

	private takeOff(slot: EquipSlot) {
		const s = save(),
			it = itemById(s.equipped[slot]);
		if (!unequip(s, slot)) return;
		persist();
		toast(this, `ถอด ${it.icon} ${it.name} แล้ว เก็บไว้ในกระเป๋าค่ะ`);
		this.redraw();
	}

	// ---------- tab 2: equipment cards ----------
	private cardTab() {
		const s = save(),
			b = this.body!;
		EQUIP_SLOTS.forEach((sl, i) => {
			const it = itemById(s.equipped[sl.id]),
				n = slotCount(it, gradeOf(s, it.id)),
				cards = socketed(s, it),
				y = 108 + i * 31;
			b.add(panel(this, 330, y, 616, 28, UI.panel, UI.line, 8));
			b.add(txt(this, 340, y + 6, sl.icon, 13));
			b.add(
				txt(
					this,
					364,
					y + 6,
					clip(`${it.icon} ${it.name}`, 16),
					13,
					canWearAs(it, s) ? UI.text : UI.red,
					true,
				),
			);
			if (!n)
				b.add(
					txt(
						this,
						520,
						y + 7,
						it.id.startsWith("none") ? "ยังไม่ได้ใส่ของ" : "ไม่มีช่องการ์ด",
						12,
						UI.sub,
					),
				);
			for (let k = 0; k < n; k++) {
				const cd = cards[k],
					x = 610 + k * 172;
				if (cd)
					b.add(
						button(
							this,
							x,
							y + 14,
							166,
							24,
							`${cardIcon(cd)} ${clip(cardName(cd).replace(/^การ์ด(มินิบอส| MVP)?/, ""), 11)}  ✕`,
							() => {
								unsocketCard(s, it.id, k);
								persist();
								toast(this, `ถอด${cardName(cd)}กลับเข้ากระเป๋าแล้ว`);
								this.redraw();
							},
							{ size: 12, fill: 0x5a5f8a, color: TIER_COLOR[cd.tier] },
						),
					);
				else
					b.add(
						txt(this, x, y + 14, "[ ช่องว่าง ]", 12, UI.sub).setOrigin(0.5),
					);
			}
		});
		b.add(
			button(
				this,
				860,
				306,
				168,
				30,
				this.cardBook ? "🎒 การ์ดในกระเป๋า" : "📖 สมุดการ์ด",
				() => {
					this.cardBook = !this.cardBook;
					this.cardPage = 0;
					this.render();
				},
				{ size: 14, fill: 0x5a5f8a, color: UI.text },
			),
		);
		if (this.cardBook) this.cardBookView();
		else this.cardBagView();
	}

	private cardBagView() {
		const s = save(),
			b = this.body!;
		const bag = s.cards ?? {};
		const list = EQUIP_CARDS.filter((cd) => (bag[cd.id] ?? 0) > 0);
		b.add(
			txt(
				this,
				330,
				298,
				'การ์ดในกระเป๋า · กด "ใส่" = ใส่ช่องว่างแรกที่การ์ดนี้ใส่ได้',
				13,
				UI.sub,
			),
		);
		if (!list.length) {
			b.add(
				txt(
					this,
					640,
					420,
					"ยังไม่มีการ์ดในกระเป๋าค่ะ\nล้มมอนในดันแล้วมีโอกาสได้การ์ดของมอนตัวนั้น\n(ตีตัวเดิมไปเรื่อยๆ ยังไงก็ได้แน่นอน)",
					15,
					UI.sub,
				)
					.setOrigin(0.5)
					.setAlign("center"),
			);
			return;
		}
		const per = 6,
			pages = Math.ceil(list.length / per);
		this.cardPage = Math.min(this.cardPage, pages - 1);
		if (pages > 1) {
			b.add(
				button(
					this,
					700,
					548,
					44,
					30,
					"◀",
					() => {
						this.cardPage--;
						this.render();
					},
					{ size: 15 },
				).setEnabled(this.cardPage > 0),
			);
			b.add(
				txt(
					this,
					745,
					548,
					`${this.cardPage + 1}/${pages}`,
					14,
					UI.text,
					true,
				).setOrigin(0.5),
			);
			b.add(
				button(
					this,
					790,
					548,
					44,
					30,
					"▶",
					() => {
						this.cardPage++;
						this.render();
					},
					{ size: 15 },
				).setEnabled(this.cardPage < pages - 1),
			);
		}
		list
			.slice(this.cardPage * per, this.cardPage * per + per)
			.forEach((cd, i) => {
				const x = 330 + (i % 2) * 310,
					y = 326 + Math.floor(i / 2) * 70;
				const fits = EQUIP_SLOTS.map((q) => itemById(s.equipped[q.id])).filter(
					(w) => cardFits(cd, w) && canWearAs(w, s),
				);
				const it =
					fits.find(
						(w) => slotCount(w, gradeOf(s, w.id)) > socketed(s, w).length,
					) ??
					fits[0] ??
					itemById(s.equipped[cd.slot === "acc" ? "acc" : "armor"]);
				const free = slotCount(it, gradeOf(s, it.id)) - socketed(s, it).length;
				b.add(
					panel(
						this,
						x,
						y,
						302,
						64,
						UI.panel,
						Phaser.Display.Color.HexStringToColor(TIER_COLOR[cd.tier]).color,
						10,
					),
				);
				b.add(
					txt(
						this,
						x + 10,
						y + 5,
						`${cardIcon(cd)} ${clip(cardName(cd), 20)} ×${bag[cd.id]}`,
						14,
						TIER_COLOR[cd.tier],
						true,
					),
				);
				b.add(
					txt(
						this,
						x + 10,
						y + 25,
						`${SLOTS.find((q) => q.id === cd.slot)!.icon} ${clip(cardStatLine(cd), 70)}`,
						10,
						UI.green,
					)
						.setWordWrapWidth(212)
						.setLineSpacing(0),
				);
				b.add(
					button(
						this,
						x + 262,
						y + 18,
						70,
						28,
						"ใส่",
						() => {
							if (
								!socketCard(s, it.id, cd.id, slotCount(it, gradeOf(s, it.id)))
							) {
								toast(
									this,
									slotCount(it, gradeOf(s, it.id))
										? "ช่องเต็มแล้ว ถอดการ์ดเก่าก่อนนะคะ"
										: `${it.name} ไม่มีช่องการ์ดค่ะ`,
									UI.red,
								);
								return;
							}
							persist();
							toast(this, `ใส่${cardName(cd)}ใน ${it.name} แล้ว!`);
							this.redraw();
						},
						{ size: 14 },
					).setEnabled(free > 0),
				);
				const sell = CARD_RULES.sell[cd.tier];
				b.add(
					button(
						this,
						x + 262,
						y + 48,
						70,
						24,
						`ขาย ${sell}z`,
						() =>
							confirm(
								this,
								`ขาย${cardName(cd)} 1 ใบ?`,
								`ได้ ${sell} zeny · สมุดการ์ดยังจำไว้ ไม่หาย`,
								"ขาย",
								() => {
									bag[cd.id]--;
									if (bag[cd.id] <= 0) delete bag[cd.id];
									s.zeny += sell;
									persist();
									this.redraw();
								},
							),
						{ size: 11, fill: 0x5a5f8a, color: UI.text },
					),
				);
			});
	}

	private cardBookView() {
		const s = save(),
			b = this.body!;
		const seen = new Set(s.cardSeen ?? []);
		b.add(
			txt(
				this,
				330,
				298,
				`สมุดการ์ด · เจอแล้ว ${EQUIP_CARDS.filter((cd) => seen.has(cd.id)).length}/${EQUIP_CARDS.length} ใบ`,
				13,
				UI.sub,
			),
		);
		DUNGEONS.forEach((dg, i) => {
			const many = DUNGEONS.length > 6;
			b.add(
				button(
					this,
					many ? 344 + i * 33 : 352 + i * 56,
					334,
					many ? 31 : 50,
					28,
					many ? `D${i + 1}` : `ดัน${i + 1}`,
					() => {
						this.bookDg = i;
						this.render();
					},
					{
						size: 12,
						fill: i === this.bookDg ? COLORS.gold : 0x5a5f8a,
						color: i === this.bookDg ? UI.ink : UI.text,
					},
				),
			);
		});
		const dg = DUNGEONS[this.bookDg];
		b.add(
			button(
				this,
				720,
				334,
				110,
				28,
				this.bookV2 ? "การ์ดหลัก" : "การ์ดสายอาชีพ",
				() => {
					this.bookV2 = !this.bookV2;
					this.render();
				},
				{ size: 12, fill: 0x5a5f8a, color: UI.text },
			),
		);
		b.add(txt(this, 940, 334, dg.name, 13, UI.gold, true).setOrigin(1, 0.5));
		const list: EquipCard[] = EQUIP_CARDS.filter(
			(cd) => cd.dungeon === dg.id && !!cd.v2 === this.bookV2,
		);
		list.forEach((cd, i) => {
			const x = 330 + (i % 3) * 206,
				y = 354 + Math.floor(i / 3) * 62,
				got = seen.has(cd.id);
			b.add(
				panel(
					this,
					x,
					y,
					200,
					56,
					got ? UI.panel : 0x1d2140,
					got
						? Phaser.Display.Color.HexStringToColor(TIER_COLOR[cd.tier]).color
						: UI.line,
					8,
				),
			);
			b.add(
				txt(
					this,
					x + 8,
					y + 4,
					got
						? `${cardIcon(cd)} ${clip(cardName(cd), 17)}`
						: `❓ ${cd.tier === "normal" ? "???" : cd.tier === "mini" ? "??? (มินิบอส)" : "??? (บอส)"}`,
					13,
					got ? TIER_COLOR[cd.tier] : UI.sub,
					true,
				),
			);
			b.add(
				txt(
					this,
					x + 8,
					y + 25,
					got
						? `${SLOTS.find((q) => q.id === cd.slot)!.icon} ${clip(cardStatLine(cd), 30)}`
						: `ดรอปใน${dg.name}`,
					10,
					got ? UI.green : UI.sub,
				),
			);
			if (got && cd.forJobs)
				b.add(
					txt(
						this,
						x + 8,
						y + 39,
						clip(`เหมาะกับ ${cd.forJobs}`, 30),
						10,
						UI.sub,
					),
				);
		});
	}

	// ---------- tab 3 (Novice / Basic view): novice passives + certificates ----------
	private skillTab() {
		const s = save(),
			b = this.body!;
		const novice = s.job === "novice",
			left = noviceLeft(s.skills),
			spent = noviceSpent(s.skills);
		b.add(
			txt(
				this,
				330,
				116,
				`แต้มโนวิส: ${left}/${NOVICE_RULES.points}`,
				20,
				left ? UI.gold : UI.sub,
				true,
			),
		);
		b.add(
			txt(
				this,
				330,
				144,
				novice
					? `ฟรี ${NOVICE_RULES.points} แต้มตั้งแต่เริ่ม · 💢 ทุบ เลเวลขึ้นเองตาม Job Lv`
					: "สกิลโนวิสติดตัวไปด้วย · สกิลอาชีพอยู่ใน 🕸️ ใยสกิล 3 คลาส",
				14,
				UI.sub,
			),
		);
		if (!novice)
			b.add(
				button(
					this,
					885,
					124,
					120,
					30,
					"🕸️ ใยสกิล 3 ชั้น",
					() => {
						this.skillBasic = false;
						this.redraw();
					},
					{ size: 12 },
				),
			);
		b.add(
			button(
				this,
				novice ? 870 : 755,
				124,
				120,
				30,
				`↺ รีเซ็ต 💎${NOVICE_RULES.resetGems}`,
				() => {
					if (s.gems < NOVICE_RULES.resetGems) {
						toast(
							this,
							`เพชรไม่พอ ต้องใช้ 💎${NOVICE_RULES.resetGems} (มี ${s.gems})`,
							UI.sub,
						);
						return;
					}
					confirm(
						this,
						"↺ รีเซ็ตสกิลโนวิส?",
						`คืนแต้มโนวิสทั้ง ${spent} แต้ม\nจ่าย 💎${NOVICE_RULES.resetGems}`,
						"รีเซ็ต",
						() => {
							if (resetNovice(s)) {
								toast(this, `คืน ${spent} แต้มแล้ว`);
								this.redraw();
							}
						},
					);
				},
				{ size: 12, fill: 0x5a5f8a, color: UI.text },
			).setEnabled(spent > 0),
		);

		let gy = 168;
		if (novice) {
			const sm = SKILLS.find((x) => x.id === "smash")!,
				lv = smashLv(s.jobLevel);
			b.add(panel(this, 330, 164, 600, 36, UI.panel, UI.line, 10));
			b.add(
				txt(
					this,
					342,
					172,
					`${sm.icon} ${sm.name}  Lv ${lv}/${sm.max}`,
					14,
					UI.text,
					true,
				),
			);
			b.add(
				txt(
					this,
					520,
					174,
					`${sm.desc(lv)} · เลเวลขึ้นเองตาม Job Lv`,
					10,
					UI.green,
				).setWordWrapWidth(400),
			);
			gy = 206;
		}
		NOVICE_PASSIVES.forEach((sk, i) => {
			const w = 297,
				h = 44,
				x = 330 + (i % 2) * (w + 6),
				y = gy + Math.floor(i / 2) * (h + 5);
			const lv = s.skills[sk.id] ?? 0;
			b.add(panel(this, x, y, w, h, UI.panel, lv ? COLORS.gold : UI.line, 10));
			b.add(
				txt(this, x + 10, y + 4, `${sk.icon} ${sk.name}`, 14, UI.text, true),
			);
			b.add(
				txt(
					this,
					x + 236,
					y + 6,
					`${lv}/${sk.max}`,
					12,
					lv ? UI.gold : UI.sub,
					true,
				).setOrigin(1, 0),
			);
			b.add(
				txt(
					this,
					x + 10,
					y + 25,
					sk.desc(Math.max(1, lv)),
					10,
					lv ? UI.green : UI.sub,
				).setWordWrapWidth(226),
			);
			b.add(
				button(
					this,
					x + 268,
					y + h / 2,
					46,
					30,
					lv ? "+1" : "เรียน",
					() => {
						if (noviceLeft(s.skills) <= 0 || (s.skills[sk.id] ?? 0) >= sk.max)
							return;
						s.skills[sk.id] = (s.skills[sk.id] ?? 0) + 1;
						persist();
						this.redraw();
					},
					{ size: 12 },
				).setEnabled(left > 0 && lv < sk.max),
			);
		});

		const y0 = 372;
		b.add(
			txt(
				this,
				330,
				y0,
				"🎖️ ช่องใบรับรอง (Passive พิเศษ) · เปิดตาม Base Lv",
				16,
				UI.text,
				true,
			),
		);
		CERT_SLOTS_AT.forEach((lv, i) => {
			const x = 330 + i * 152,
				open = s.baseLevel >= lv;
			b.add(
				panel(
					this,
					x,
					y0 + 28,
					144,
					56,
					open ? 0x2a3b5a : 0x1d2140,
					open ? COLORS.gold : UI.line,
					10,
				),
			);
			b.add(
				txt(
					this,
					x + 72,
					y0 + 56,
					open ? "ว่าง\n(เร็วๆ นี้)" : `🔒 Base Lv ${lv}`,
					12,
					open ? UI.gold : UI.sub,
				)
					.setOrigin(0.5)
					.setAlign("center"),
			);
		});
		b.add(
			txt(this, 330, y0 + 100, "🌳 ทาเลนต์ & เปลี่ยนอาชีพ", 16, UI.text, true),
		);
		if (canChangeJob(s) || s.job !== "novice") {
			b.add(
				txt(
					this,
					330,
					y0 + 126,
					s.job === "novice"
						? "ล้มบอสดันแรกแล้ว! ไปเลือกอาชีพได้เลย"
						: `ลงแต้มสกิลอาชีพได้ที่ 🕸️ ใยสกิล · เปลี่ยนอาชีพใหม่ได้ด้วย 💎${JOB_CHANGE.repickGems} (คืนแต้มใยสกิลครบ Job Lv คงเดิม)`,
					13,
					UI.gold,
				).setWordWrapWidth(420),
			);
			b.add(
				button(
					this,
					850,
					y0 + 132,
					150,
					36,
					s.job === "novice" ? "🎓 อาชีพ" : `🔄 💎${JOB_CHANGE.repickGems}`,
					() => (s.job === "novice" ? go(this, "job") : askRepick(this)),
					{ size: 15 },
				),
			);
		} else
			b.add(
				txt(
					this,
					330,
					y0 + 126,
					"ปลดล็อกเมื่อล้มบอสดันแรก (ราชาเจลล็อป) · มี 5 อาชีพ: นักดาบ นักธนู จอมเวท นักบวช โจร",
					13,
					UI.sub,
				).setWordWrapWidth(600),
			);
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
		const curTier = this.webTier();
		this.webPills = ([1, 2, 3] as const).map((t, i) => {
			const pill = button(
				this,
				666 + i * 70,
				122,
				66,
				26,
				`${["1️⃣", "2️⃣", "3️⃣"][i]} ขั้น ${t}`,
				() => this.scrollToWebY(this.tierOffsets[i], true),
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
		this.applyWebScroll();

		// Default selected node fallback
		if (!this.selNode || !nodeById(this.selNode)) {
			this.selNode = cols1[0].cells[0].n.id;
		}
		this.renderSelectedNodeFooter();
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

	/** Evaluates the currently selected node across Tier 1, 2, or 3 and renders the bottom action drawer + downward point spending. */
	private renderSelectedNodeFooter() {
		const s = save();
		const n = nodeById(this.selNode) ?? nodeById(`${s.job}_s1p`)!;
		const tier = nodeTierOf(n);
		const j2Options = job2Of(s.job);
		const activeJ2Id: Job2Id =
			s.job2 ?? j2Options[this.previewJob2Idx % j2Options.length].id;
		const j2 = JOB2[activeJ2Id];
		const j3Def = job3Of(activeJ2Id);
		const isJ3Active = !!activeJob3(s) && activeJob3(s) === j3Def?.id;
		const path = s.job3Path ?? "pure";

		const tMap =
			tier === 3
				? (s.job3Tree ??= {})
				: tier === 2
					? (s.job2Tree ??= {})
					: (s.jobTree ??= {});
		const lv = tMap[n.id] ?? 0;
		let why = "";
		if (tier === 1) why = lockReason(tMap, s.job, n);
		else if (tier === 2)
			why = s.job2
				? lockReason(tMap, s.job, n, j2.id)
				: `ปลดล็อกเมื่อเปลี่ยนอาชีพเป็น ${j2.name}`;
		else
			why =
				isJ3Active && j3Def
					? lockReason3(tMap, s.job, n, j3Def.id, path)
					: `ปลดล็อกเมื่อตื่นรู้เป็น ${j3Def?.name ?? "ขั้น 3"}`;

		const spendInfo = canSpendInTier(s, tier);
		const can = spendInfo.can && !why;

		const s3 = n.branch.endsWith("_s3");
		const root2 =
			tier === 2 && n.kind === "pow2" ? (s3 ? j2.skill3 : j2.ult) : undefined;
		const tag =
			tier === 1
				? n.kind === "s2root"
					? "ทักษะ 2 · ขั้น 1"
					: "ขั้น 1"
				: tier === 2
					? n.kind === "pow2"
						? s3
							? "ทักษะ 3 · ขั้น 2"
							: "Ult วิวัฒน์ · ขั้น 2"
						: n.tier === 4
							? "★ ปลายสาย · ขั้น 2"
							: "ขั้น 2"
					: n.kind === "pow3"
						? "Ult วิวัฒน์ 2 · ขั้น 3"
						: n.tier === 4
							? "★ ปลายสาย · ขั้น 3"
							: "ขั้น 3";

		const isUltNode =
			n.branch.endsWith("_ult") ||
			n.branch.endsWith("_u2") ||
			n.branch.endsWith("_u3") ||
			BRANCHES.find((b) => b.id === n.branch)?.line === "ult";
		// tier-1 roots (ทักษะ 1 / Ult): show what the base skill actually does (e.g. Cleric's heal OR smite 2 front)
		const sk1 =
			tier === 1 && n.kind === "pow"
				? n.branch.endsWith("_s1")
					? JOBS[s.job].auto
					: JOBS[s.job].ult
				: undefined;
		const rootDesc = sk1
			? `${sk1.icon} ${sk1.name}: ${sk1.desc}`
			: tier === 3 && n.kind === "pow3" && j3Def
				? `✨ ${j3Def.ultName}: ${j3Def.ultDesc} (รวมผล Ult ขั้น 1+2 ทั้งหมด)`
				: root2
					? `${root2.icon} ${root2.name}: ${root2.desc}${!s3 ? " (รวมผล Ult ขั้น 1 ทั้งหมด)" : ""}`
					: isUltNode
						? "🔥 สาย Ultimate: ส่งผลสะสมต่อเนื่องตั้งแต่คลาส 1 ถึงคลาสปัจจุบัน"
						: "";

		const tier2Arg: boolean | 3 = tier === 3 ? 3 : tier === 2;
		const btnLabel = !lv
			? spendInfo.borrowed
				? `เรียน (ขั้น${spendInfo.fromTier})`
				: "เรียน"
			: spendInfo.borrowed
				? `+1 (ขั้น${spendInfo.fromTier})`
				: "+1";

		this.nodeFooter(
			n,
			lv,
			why,
			tag,
			rootDesc,
			can,
			() => {
				const check = canSpendInTier(s, tier);
				if (!check.can) return;
				const curWhy =
					tier === 1
						? lockReason(tMap, s.job, n)
						: tier === 2
							? lockReason(tMap, s.job, n, j2.id)
							: j3Def
								? lockReason3(tMap, s.job, n, j3Def.id, path)
								: "ล็อก";
				if (curWhy) return;
				const usedTier = spendPointInTier(s, tier);
				if (!usedTier) return;
				tMap[n.id] = (tMap[n.id] ?? 0) + 1;
				persist();
				if (usedTier > tier) {
					toast(
						this,
						`✨ ใช้แต้มขั้น ${usedTier} อัป "${n.name}" (โบนัสข้ามชั้น +1.5%!)`,
						"#d7bfff",
					);
				}
				this.redraw();
			},
			tier2Arg,
			btnLabel,
			spendInfo.borrowed,
		);
	}

	/** Left panel of the unified skill web: picked node (name, Lv bar, now / next / lock) + 📋 detail modal + learn. */
	private nodeFooter(
		n: TreeNode,
		lv: number,
		why: string | null | undefined,
		tag: string,
		rootDesc: string,
		can: boolean,
		learn: () => void,
		tier2: boolean | 3,
		btnLabel = lv ? "+1" : "เรียน",
		borrowed = false,
	) {
		const b = this.body!,
			locked = !!why && why !== "เต็มแล้ว",
			isMax = lv >= n.max;
		const x = 28,
			w = 274,
			top = 132,
			btnY = 528;

		// name + tier tag + level bar
		b.add(clipW(txt(this, x, top, `${n.icon} ${n.name}`, 17, UI.gold, true), w));
		b.add(
			clipW(
				txt(this, x, top + 24, `Lv ${lv}/${n.max}${tag ? ` · ${tag}` : ""}`, 11.5, UI.sub, true),
				w,
			),
		);
		const bar = this.add.graphics();
		bar.fillStyle(0x0f1220, 1).fillRoundedRect(x, top + 44, w, 7, 3);
		if (lv > 0)
			bar
				.fillStyle(isMax ? COLORS.gold : 0x4a8cd4, 1)
				.fillRoundedRect(x, top + 44, Math.max(7, (w * lv) / n.max), 7, 3);
		b.add(bar);

		// sections (shrink-to-fit above the buttons)
		const secs: { head: string; body: string; color: string }[] = [];
		if (rootDesc) secs.push({ head: "📖 ตัวสกิล", body: rootDesc, color: UI.text });
		secs.push(
			lv
				? { head: `✅ ตอนนี้ (Lv ${lv})`, body: n.desc(lv), color: UI.text }
				: { head: "⬆️ Lv 1", body: n.desc(1), color: UI.green },
		);
		if (lv && !isMax)
			secs.push({
				head: `⬆️ ถัดไป (Lv ${lv + 1})${borrowed ? " · ⚡ใช้แต้มคลาสสูง" : ""}`,
				body: n.desc(lv + 1),
				color: borrowed ? "#d7bfff" : UI.green,
			});
		if (isMax) secs.push({ head: "✅ เต็มแล้ว", body: "", color: UI.green });
		if (locked) secs.push({ head: "🔒 ยังเรียนไม่ได้", body: why ?? "", color: "#ffb0b0" });

		// 🔢 real numbers: what the next point changes (or, when maxed / nothing changes, the current totals)
		const rows = nodeDetail(save(), n, tier2).rows.filter(
			(r) => !r.section && r.label !== "ใช้",
		);
		const changed = rows.filter((r) => r.next !== undefined && r.next !== r.now);
		const show = (changed.length ? changed : rows).slice(0, 3);
		const numH = show.length ? 22 + show.length * 34 : 0;
		const numTop = btnY - 26 - numH;
		if (show.length) {
			const bg = this.add.graphics();
			bg.fillStyle(0x0d1020, 0.75).fillRoundedRect(x - 4, numTop - 2, w + 8, numH, 6);
			b.add(bg);
			b.add(
				txt(
					this,
					x + 2,
					numTop + 2,
					changed.length && lv < n.max
						? `🔢 ผลรวมตอนนี้ → Lv ${lv + 1}`
						: "🔢 ผลรวมตอนนี้",
					11.5,
					UI.gold,
					true,
				),
			);
			show.forEach((r, i) => {
				const ry = numTop + 22 + i * 34;
				b.add(clipW(txt(this, x + 2, ry, r.label, 10.5, "#b8c0e8"), w - 4));
				const nowT = clipW(txt(this, x + 2, ry + 14, r.now, 12.5, UI.text, true), w - 4);
				b.add(nowT);
				if (changed.length && r.next !== undefined && r.next !== r.now) {
					const nx = x + 2 + nowT.width + 6;
					b.add(
						clipW(
							txt(this, nx, ry + 14, `→ ${r.next}`, 12.5, UI.green, true),
							Math.max(20, x + w - nx),
						),
					);
				}
			});
		}

		let size = 13,
			made: Phaser.GameObjects.Text[] = [];
		for (; ; size -= 0.5) {
			made.forEach((m) => m.destroy());
			made = [];
			let ty = top + 62;
			for (const sc of secs) {
				const hd = txt(this, x, ty, sc.head, size, UI.gold, true);
				ty += hd.height + 1;
				made.push(hd);
				if (sc.body) {
					const bd = txt(this, x, ty, sc.body, size - 0.5, sc.color)
						.setWordWrapWidth(w, true)
						.setLineSpacing(2);
					ty += bd.height;
					made.push(bd);
				}
				ty += 8;
			}
			if (ty <= numTop - 6 || size <= 9.5) break;
		}
		b.add(made);

		b.add(
			button(
				this,
				x + 62,
				btnY,
				124,
				40,
				"📋 ตัวเลขจริง",
				() => {
					this.showDetail = true;
					this.render();
				},
				{ size: 12.5, fill: 0x474c72, color: UI.text },
			),
		);
		b.add(
			button(this, x + w - 70, btnY, 140, 40, btnLabel, learn, {
				size: borrowed ? 12.5 : 15,
				fill: borrowed ? 0x7b5ce6 : COLORS.gold,
				color: borrowed ? "#ffffff" : UI.ink,
			}).setEnabled(can),
		);
		if (this.showDetail)
			this.nodeModal(n, lv, why, tag, rootDesc, can, learn, tier2, btnLabel);
	}

	/** Node detail modal (all 3 tiers): full text now / next level + Cumulative Ult evolution + real numbers (nodeDetail). */
	private nodeModal(
		n: TreeNode,
		lv: number,
		why: string | null | undefined,
		tag: string,
		rootDesc: string,
		can: boolean,
		learn: () => void,
		tier2: boolean | 3,
		btnLabel = lv ? "+1 แต้ม" : "เรียน",
	) {
		const s = save();
		const d = nodeDetail(s, n, tier2);
		const close = () => {
			this.showDetail = false;
			this.render();
		};
		const c = this.add.container(0, 0).setDepth(30000);
		this.modal = c;
		const dim = this.add
			.rectangle(W / 2, H / 2, W, H, 0x080a18, 0.8)
			.setInteractive();
		dim.on("pointerup", close);
		const x = 70,
			y = 40,
			w = W - 140,
			h = H - 80;
		c.add([
			dim,
			panel(this, x, y, w, h, 0x141834, COLORS.gold, 14),
			this.add.zone(x, y, w, h).setOrigin(0).setInteractive(),
		]);
		c.add(
			clipW(
				txt(this, x + 20, y + 14, `${n.icon} ${n.name}`, 22, UI.gold, true),
				w - 260,
			),
		);
		c.add(
			txt(
				this,
				x + 20,
				y + 46,
				`Lv ${lv}/${n.max}${tag ? ` · ${tag}` : ""}`,
				13,
				UI.sub,
				true,
			),
		);
		c.add(
			button(this, x + w - 34, y + 30, 44, 40, "✕", close, {
				size: 18,
				fill: 0x5a5f8a,
				color: UI.text,
			}),
		);

		// left: words + Cumulative Ultimate lineage if inspecting an Ultimate node
		const lx = x + 20,
			hasRows = d.rows.length > 0, // no numbers -> text spans the whole modal
			lw = hasRows ? 300 : w - 40;
		const words: { head: string; body: string; color: string }[] = [];
		if (rootDesc)
			words.push({ head: "📖 ตัวสกิล", body: rootDesc, color: UI.text });
		words.push({
			head: lv ? `✅ ตอนนี้ (Lv ${lv})` : "⬜ ยังไม่เรียน",
			body: lv ? n.desc(lv) : "—",
			color: lv ? UI.text : UI.sub,
		});
		if (lv < n.max)
			words.push({
				head: `⬆️ Lv ${lv + 1}`,
				body: n.desc(lv + 1),
				color: UI.green,
			});
		if (why && why !== "เต็มแล้ว")
			words.push({ head: "🔒 ยังเรียนไม่ได้", body: why, color: "#ffb0b0" });

		// Ult lineage (ขั้น 1 → ปัจจุบัน) lives in the left "🔥 รวมผล Ult" panel — not repeated here (space)
		let size = hasRows ? 14 : 16,
			made: Phaser.GameObjects.Text[] = [];
		for (; ; size--) {
			made.forEach((m) => m.destroy());
			made = [];
			let ty = y + 78;
			for (const wd of words) {
				const hd = txt(this, lx, ty, wd.head, size, UI.gold, true);
				ty += hd.height + 2;
				const bd = txt(this, lx, ty, wd.body, Math.max(9.5, size - 1), wd.color)
					.setWordWrapWidth(lw, true)
					.setLineSpacing(2);
				ty += bd.height + 10;
				made.push(hd, bd);
			}
			if (ty <= y + h - 68 || size <= 10) break;
		}
		c.add(made);

		// right: numbers
		if (hasRows) {
			const rx = x + 340,
				rw = w - 360,
				c1 = rx + rw - 236,
				c2 = rx + rw - 116;
			c.add(
				this.add.rectangle(rx - 10, y + 76, 1, h - 150, 0x454c80).setOrigin(0),
			);
			c.add(
				txt(this, rx, y + 80, "🔢 ตัวเลขจริง (รวมผลข้ามคลาส)", 14, UI.gold, true),
			);
			c.add(txt(this, c1, y + 82, "ตอนนี้", 12, UI.text, true));
			c.add(
				txt(
					this,
					c2,
					y + 82,
					lv < n.max ? `Lv ${lv + 1}` : "เต็ม",
					12,
					lv < n.max ? UI.green : UI.sub,
					true,
				),
			);
			const rowH = 21,
				maxRows = Math.floor((h - 190) / rowH),
				rows = d.rows.slice(0, maxRows);
			rows.forEach((r, i) => {
				const ry = y + 106 + i * rowH;
				if (r.section) {
					c.add(clipW(txt(this, rx, ry, r.label, 12, UI.gold, true), rw));
					return;
				}
				const changed = r.next !== undefined && r.next !== r.now;
				if (i % 2)
					c.add(
						this.add
							.rectangle(rx - 4, ry - 2, rw + 4, rowH, 0xffffff, 0.04)
							.setOrigin(0),
					);
				c.add(clipW(txt(this, rx + 8, ry, r.label, 12, "#d8d4f0"), c1 - rx - 16));
				c.add(
					clipW(
						txt(this, c1, ry, r.now, 12, UI.text),
						r.next === undefined ? rx + rw - c1 : c2 - c1 - 8,
					),
				);
				if (r.next !== undefined)
					c.add(
						clipW(
							txt(this, c2, ry, r.next, 12, changed ? UI.green : UI.sub, changed),
							rx + rw - c2,
						),
					);
			});
			if (d.rows.length > rows.length)
				c.add(
					txt(
						this,
						rx,
						y + 106 + rows.length * rowH,
						`… และอีก ${d.rows.length - rows.length} บรรทัด`,
						11,
						UI.sub,
					),
				);
		}
		c.add(
			txt(this, x + 20, y + h - 52, d.note, 10, UI.sub).setWordWrapWidth(
				w - 200,
				true,
			),
		);
		c.add(
			button(this, x + w - 80, y + h - 36, 130, 44, btnLabel, learn, {
				size: 15,
			}).setEnabled(can),
		);
	}

	// ---------- tab 4: talents (4 tiers by Job Lv, pick 1 of 3, free swap in town) ----------
	private talentTab() {
		const s = save(),
			b = this.body!;
		if (s.job === "novice") {
			b.add(
				txt(
					this,
					330,
					130,
					"⭐ ทาเลนต์เปิดหลังเปลี่ยนอาชีพ",
					20,
					UI.gold,
					true,
				),
			);
			b.add(
				txt(
					this,
					330,
					166,
					`4 ชั้น เปิดที่ Job Lv ${TALENT_RULES.rowsAt.join(" / ")} · ชั้นละเลือก 1 จาก 3\nใช้แต้มทาเลนต์ (แยกจากแต้มสกิล) ได้ 1 แต้มทุก ${TALENT_RULES.pointEveryJobLv} Job Lv · รีเซ็ตฟรีในเมือง`,
					14,
					UI.sub,
				),
			);
			return;
		}
		const two = this.talent2 && !!s.job2,
			j2 = s.job2;
		const t = two ? (s.job2Talents ??= {}) : (s.jobTalents ??= {});
		const jl = two ? (s.job2Level ?? 1) : s.jobLevel,
			jlName = two ? "Job2 Lv" : "Job Lv";
		const free = talentFree(t, jl);
		b.add(
			txt(
				this,
				330,
				114,
				`⭐ แต้มทาเลนต์${two ? "ชั้น 2" : ""}เหลือ: ${free}`,
				18,
				free > 0 ? UI.gold : UI.sub,
				true,
			),
		);
		b.add(
			txt(
				this,
				560,
				118,
				`ได้ ${talentEarned(jl)} จาก ${jlName} ${jl}`,
				12,
				UI.sub,
			),
		);
		if (j2)
			b.add(
				button(
					this,
					760,
					124,
					112,
					30,
					two ? "⭐ ชั้น 1" : `${JOB2[j2].icon} ชั้น 2`,
					() => {
						this.talent2 = !two;
						this.redraw();
					},
					{ size: 12, fill: 0x4a5a8a, color: UI.text },
				),
			);
		b.add(
			button(
				this,
				885,
				124,
				90,
				30,
				"รีเซ็ตฟรี",
				() => {
					if (two) s.job2Talents = {};
					else s.jobTalents = {};
					persist();
					toast(this, "คืนแต้มทาเลนต์แล้ว");
					this.redraw();
				},
				{ size: 13, fill: 0x5a5f8a, color: UI.text },
			).setEnabled(Object.keys(t).length > 0),
		);
		TALENT_RULES.rowsAt.forEach((lv, i) => {
			const row = i + 1,
				y = 144 + i * 104,
				open = jl >= lv;
			const opts = two && j2 ? talents2Of(j2, row) : talentsOf(s.job, row);
			const cur = talentPick(t, row);
			b.add(
				txt(
					this,
					330,
					y,
					`ชั้น ${row} · ${jlName} ${lv}${open ? "" : " 🔒"}`,
					14,
					open ? UI.text : UI.sub,
					true,
				),
			);
			if (!opts.length) {
				b.add(txt(this, 330, y + 26, "กำลังออกแบบ (เร็วๆ นี้)", 12, UI.sub));
				return;
			}
			const cw = (600 - 2 * 10) / 3;
			opts.slice(0, 3).forEach((o, k) => {
				const x = 330 + k * (cw + 10),
					picked = cur?.id === o.id;
				const rank = picked ? Math.min(cur!.rank, o.max) : 0;
				b.add(
					panel(
						this,
						x,
						y + 20,
						cw,
						76,
						picked ? 0x2a3b5a : open ? UI.panel : 0x1d2140,
						picked ? COLORS.gold : UI.line,
						10,
					),
				);
				b.add(
					txt(
						this,
						x + 8,
						y + 24,
						`${o.icon} ${o.name}  ${rank}/${o.max}`,
						13,
						open ? UI.text : UI.sub,
						true,
					),
				);
				const tx = talentRankText(o, rank);
				b.add(
					txt(
						this,
						x + 8,
						y + 43,
						tx.next ? `${tx.now}\n${tx.next}` : tx.now,
						tx.next ? 10 : 11,
						open ? UI.green : UI.sub,
					).setWordWrapWidth(cw - 16),
				);
				const refund = picked ? 0 : (cur?.rank ?? 0);
				const can = open && rank < o.max && free + refund >= 1;
				if (can) {
					const hit = this.add
						.zone(x, y + 20, cw, 76)
						.setOrigin(0)
						.setInteractive({ useHandCursor: true });
					hit.on("pointerup", () => {
						t[String(row)] = { id: o.id, rank: rank + 1 };
						persist();
						this.redraw();
					});
					b.add(hit);
				}
			});
		});
	}
}

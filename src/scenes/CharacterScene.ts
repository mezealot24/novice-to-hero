import Phaser from "phaser";
import { derivedRows } from "../data/stat-rows";
export { derivedRows };
export { nodeDetail } from "./character/node-detail";
import {
	type EquipSlot,
} from "../data/meta";
import { save } from "../save";
import {
	type Btn,
	go,
	tabs,
	topBar,
	UI,
} from "../ui";
import { statusTab } from "./character/status-tab";
import { talentTab } from "./character/talent-tab";
import { ultModal } from "./character/ult-modal";
import { drawPreview } from "./character/preview";
import { cardTab } from "./character/cards-tab";
import { equipTab } from "./character/equip-tab";
import { skillTab } from "./character/skill-basic";
import {
	scrollToWebY,
	webActive,
	webPointerDown,
	webPointerMove,
	webPointerUp,
} from "./character/web-scroll";
import { unifiedWebTab } from "./character/skill-web";

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
				: unifiedWebTab(this);
		else talentTab(this);
		if (this.showUlt && this.tab === 3) ultModal(this);
	}

	redraw() {
		drawPreview(this);
		this.render();
	}
}

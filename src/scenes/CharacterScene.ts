import Phaser from "phaser";
import { derivedRows } from "../data/stat-rows";
export { derivedRows };
export { nodeDetail } from "./character/node-detail";
import {
	type EquipSlot,
} from "../data/meta";
import type { JobId } from "../data/jobs";
import type { PetId } from "../data/jobs2";
import { hasPassiveTree } from "../data/passive-tree";
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
import { sageGuideModal } from "./character/sage-guide";
import { drawPreview } from "./character/preview";
import { cardTab } from "./character/cards-tab";
import { equipTab } from "./character/equip-tab";
import { skillTab } from "./character/skill-basic";
import {
	PASSIVE_VIEW_DEFAULT,
	type GraphBounds,
	type PassiveCamState,
	type PassiveView,
} from "./character/passive-cam";
import {
	passiveActive,
	passivePointerDown,
	passivePointerMove,
	passivePointerUp,
	passiveWheel,
} from "./character/passive-tab";
import type { CardSeenFilter, CardSlotFilter, CardTierFilter } from "../data/cards";
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
	cardSlotF: CardSlotFilter = "all"; // card bag + book filters (Q 2026-11-20)
	cardTierF: CardTierFilter = "all";
	bookSeenF: CardSeenFilter = "all";
	skillBasic = false; // skill tab: false = unified 3-class skill web, true = Novice skills + certificates + job
	private _selNode = "";
	selPet?: PetId; // Beastmaster Tier 2 pet partner dossier selected/hovered for the left sidebar
	footerC?: Phaser.GameObjects.Container;
	showDetail = false; // skill web: node detail modal open
	get selNode() {
		return this._selNode;
	}
	set selNode(id: string) {
		this._selNode = id;
		this.selPet = undefined;
	}
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
	showSageGuide?: "sage" | "professor"; // Sage / Professor interactive playstyle & reaction guide modal
	talent2 = false; // v119 talent tab: show ทาเลนต์ชั้น 2
	// PoE Passive Constellation (Tab 4 for migrated jobs): 2D pan/zoom camera + inspect/fullscreen state
	passiveTreeJob?: JobId;
	passiveCam?: PassiveCamState;
	passiveSelId = "";
	passiveTag: string | null = null;
	passiveFull = false;
	passiveFullHideCard = false;
	passiveView: PassiveView = { ...PASSIVE_VIEW_DEFAULT };
	passiveBounds?: GraphBounds;
	passiveUiRects: PassiveView[] = [];
	passiveWorldC?: Phaser.GameObjects.Container;
	passiveDetailC?: Phaser.GameObjects.Container;
	passiveSelRingG?: Phaser.GameObjects.Graphics;
	passiveHoverG?: Phaser.GameObjects.Graphics;
	passiveHoverId = "";
	passiveZoomText?: Phaser.GameObjects.Text;
	passiveConfirm?: Phaser.GameObjects.Container;
	passiveTween?: Phaser.Tweens.Tween;
	passiveDrag?: {
		pointerId: number;
		startX: number;
		startY: number;
		lastX: number;
		lastY: number;
		moved: boolean;
	};
	constructor() {
		super("character");
	}

	create(data: { tab?: number; back?: { key: string; data?: object } }) {
		this.cameras.main.setBackgroundColor(UI.night);
		this.cameras.main.fadeIn(160, 20, 23, 43);
		this.input.mouse?.disableContextMenu();
		this.tab = data?.tab ?? 0;
		this.selPet = undefined;
		this.showDetail = false;
		this.showUlt = false;
		this.showSageGuide = undefined;
		this.passiveTreeJob = undefined;
		this.passiveCam = undefined;
		this.passiveSelId = "";
		this.passiveTag = null;
		this.passiveFull = false;
		this.passiveFullHideCard = false;
		this.passiveView = { ...PASSIVE_VIEW_DEFAULT };
		this.passiveBounds = undefined;
		this.passiveUiRects = [];
		this.passiveWorldC = undefined;
		this.passiveDetailC = undefined;
		this.passiveSelRingG = undefined;
		this.passiveHoverG = undefined;
		this.passiveHoverId = "";
		this.passiveZoomText = undefined;
		this.passiveConfirm = undefined;
		this.passiveTween = undefined;
		this.passiveDrag = undefined;
		this.input.keyboard?.on("keydown-ESC", () => {
			if (this.passiveConfirm?.active) {
				this.passiveConfirm.destroy();
				this.passiveConfirm = undefined;
				return;
			}
			if (this.passiveFull) {
				this.passiveFull = false;
				this.render();
				return;
			}
			if (this.showDetail || this.showUlt || this.showSageGuide) {
				this.showDetail = false;
				this.showUlt = false;
				this.showSageGuide = undefined;
				this.render();
			}
		});
		this.input.on(
			"wheel",
			(
				p: Phaser.Input.Pointer,
				_go: Phaser.GameObjects.GameObject[],
				_dx: number,
				dy: number,
			) => {
				if (passiveActive(this)) {
					passiveWheel(this, p, dy);
					return;
				}
				if (!webActive(this)) return;
				scrollToWebY(this, this.webScrollY + dy * 0.65, false);
			},
		);
		// Skill-web swipe & Passive Constellation 2D pan/tap: scene-level so gestures work on top of nodes
		// and survive across frames. Routed cleanly by active tab/container guards.
		this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
			if (passiveActive(this)) {
				passivePointerDown(this, p);
				return;
			}
			webPointerDown(this, p);
		});
		this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
			if (passiveActive(this)) {
				passivePointerMove(this, p);
				return;
			}
			webPointerMove(this, p);
		});
		this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
			if (this.passiveDrag || passiveActive(this)) {
				passivePointerUp(this, p, false);
			}
			webPointerUp(this);
		});
		this.input.on("pointerupoutside", (p: Phaser.Input.Pointer) => {
			if (this.passiveDrag || passiveActive(this)) {
				passivePointerUp(this, p, true);
			}
			webPointerUp(this);
		});
		this.events.once("shutdown", () => {
			this.webDrag = undefined;
			this.webC = undefined;
			this.passiveTween?.stop();
			this.passiveTween = undefined;
			this.passiveDrag = undefined;
			this.passiveWorldC = undefined;
			this.passiveDetailC = undefined;
			this.passiveSelRingG = undefined;
			this.passiveHoverG = undefined;
			this.passiveZoomText = undefined;
			this.passiveConfirm = undefined;
			this.passiveUiRects = [];
		});
		const back = data?.back; // v101: opened from the forge's 🃏 button -> ‹ กลับ returns there (same item on the anvil)
		topBar(this, "👤 ตัวละคร", () =>
			back ? go(this, back.key, back.data) : go(this, "hub"),
		);
		drawPreview(this);
		const tab4Label = hasPassiveTree(save().job) ? "🌌 พาสซีฟ" : "⭐ ทาเลนต์";
		tabs(
			this,
			330,
			84,
			["🎒 อุปกรณ์", "🃏 การ์ด", "📊 สถานะ", "✨ สกิล", tab4Label],
			112,
			(i) => {
				this.tab = i;
				this.selPet = undefined;
				this.redraw();
			},
			this.tab,
		);
	}

	render() {
		this.passiveTween?.stop();
		this.passiveTween = undefined;
		this.passiveDrag = undefined;
		this.passiveConfirm?.destroy();
		this.passiveConfirm = undefined;
		this.passiveWorldC = undefined;
		this.passiveDetailC = undefined;
		this.passiveSelRingG = undefined;
		this.passiveHoverG = undefined;
		this.passiveZoomText = undefined;
		this.passiveUiRects = [];
		this.body?.destroy();
		this.footerC = undefined;
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
		if (this.showSageGuide && this.tab === 3) sageGuideModal(this);
	}

	redraw() {
		drawPreview(this);
		this.render();
	}
}

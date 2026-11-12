import Phaser from "phaser";
import { COLORS } from "../../data/game-data";
import type { TreeNode } from "../../data/tree";
import { txt, UI } from "../../ui";
import { clipW } from "./node-detail";
import type { CharacterScene } from "../CharacterScene";

/** Procedural RPG Skill Node Card: displays socket frame, rarity glow, level badge, and icon. */
export function drawSkillNode(
	scene: CharacterScene,
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
	const g = scene.add.graphics();

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
	const iconSocket = scene.add.graphics();
	const scX = x + 15,
		scY = y + 15;
	iconSocket.fillStyle(0x0c0e1a, 0.7).fillCircle(scX, scY, 10.5);
	iconSocket.lineStyle(1, strokeColor, 0.6).strokeCircle(scX, scY, 10.5);
	c.add(iconSocket);

	c.add(
		txt(scene, scX, scY, n.icon, 12)
			.setOrigin(0.5)
			.setAlpha(open ? 1 : 0.4),
	);

	// Right-top level badge
	const badgeW = 30,
		badgeH = 14,
		bx = x + w - badgeW - 3,
		by = y + 4;
	const badgeG = scene.add.graphics();
	badgeG
		.fillStyle(isMax ? 0x7c5415 : lv > 0 ? 0x163456 : 0x0f1220, 0.95)
		.fillRoundedRect(bx, by, badgeW, badgeH, 5);
	badgeG
		.lineStyle(1, isMax ? COLORS.gold : lv > 0 ? 0x4a8cd4 : 0x2e3553, 1)
		.strokeRoundedRect(bx, by, badgeW, badgeH, 5);
	c.add(badgeG);
	c.add(
		txt(
			scene,
			bx + badgeW / 2,
			by + badgeH / 2 - 1,
			`${lv}/${n.max}`,
			9,
			isMax ? "#fff0ba" : lv > 0 ? "#bfe3ff" : UI.sub,
			true,
		).setOrigin(0.5),
	);

	if (star) {
		c.add(txt(scene, x + 28, y + 4, "★", 10, "#ffd15c", true));
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
			txt(scene, x + 5, y + 29, n.name, 10.5, nameColor, isMax || sel),
			w - 10,
		),
	);

	// Tap vs Drag disambiguation so vertical swipe scrolling works smoothly on mobile/desktop
	const z = scene.add
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

/** Draws a glowing vertical/angled energy conduit connecting Class 1 -> Class 2 -> Class 3 skill lines. */
export function drawEvolutionConduit(
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

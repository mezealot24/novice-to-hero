import Phaser from "phaser";
import { COLORS } from "../../data/game-data";
import type { CharacterScene } from "../CharacterScene";

export function scrollToWebY(scene: CharacterScene, targetY: number, animate = true) {
	const clamped = Math.max(
		0,
		Math.min(scene.webMaxScroll, Math.round(targetY)),
	);
	scene.tweens.killTweensOf(scene);
	if (clamped === scene.webScrollY) return;
	if (!animate) {
		scene.webScrollY = clamped;
		applyWebScroll(scene);
		return;
	}
	scene.tweens.add({
		targets: scene,
		webScrollY: clamped,
		duration: 260,
		ease: "Cubic.easeOut",
		onUpdate: () => applyWebScroll(scene),
	});
}

export function webActive(scene: CharacterScene) {
	return (
		!!scene.webC?.active && scene.tab === 3 && !scene.showDetail && !scene.showUlt
	);
}

export function webTier(scene: CharacterScene): 1 | 2 | 3 {
	return scene.webScrollY < scene.tierOffsets[1] - 120
		? 1
		: scene.webScrollY < scene.tierOffsets[2] - 120
			? 2
			: 3;
}

/** Cheap per-frame scroll: moves the content + thumb, re-tints tier pills, gates hit zones. No rebuild. */
export function applyWebScroll(scene: CharacterScene) {
	const c = scene.webC;
	if (!c?.active) return;
	const v = scene.webView;
	c.setY(v.y - scene.webScrollY);
	const sb = scene.webSb;
	if (scene.webThumb?.active && scene.webMaxScroll > 0)
		scene.webThumb.setY(
			sb.y + (scene.webScrollY / scene.webMaxScroll) * (sb.h - sb.thumbH),
		);
	const t = webTier(scene);
	scene.webPills.forEach((pill, i) => {
		if (pill.active) pill.setFill(i + 1 === t ? COLORS.gold : 0x3b4269);
	});
	// Masks don't clip input: disable anything scrolled under the header/tabs, and everything mid-drag
	const dragging = !!scene.webDrag?.moved;
	for (const h of scene.webHits) {
		const inp = h.go.input;
		if (!inp) continue;
		const top = h.top + c.y,
			bot = h.bot + c.y;
		inp.enabled = !dragging && top >= v.y - 2 && top < v.y + v.h && bot > v.y;
	}
}

export function webPointerDown(scene: CharacterScene, p: Phaser.Input.Pointer) {
	if (!webActive(scene) || scene.webMaxScroll <= 0) return;
	const v = scene.webView;
	const onThumb = p.x >= v.x + v.w - 8 && p.x <= v.x + v.w + 22;
	if (p.y < v.y || p.y > v.y + v.h || p.x < v.x || (!onThumb && p.x > v.x + v.w))
		return;
	scene.tweens.killTweensOf(scene);
	scene.webDrag = {
		mode: onThumb ? "thumb" : "content",
		startY: p.y,
		startScroll: scene.webScrollY,
		lastY: p.y,
		lastT: performance.now(),
		vel: 0,
		moved: false,
	};
	if (onThumb) webThumbTo(scene, p.y, true);
}

export function webPointerMove(scene: CharacterScene, p: Phaser.Input.Pointer) {
	const d = scene.webDrag;
	if (!d || !p.isDown || !webActive(scene)) return;
	if (d.mode === "thumb") {
		webThumbTo(scene, p.y, false);
		return;
	}
	if (!d.moved && Math.abs(p.y - d.startY) < 8) return;
	if (!d.moved) {
		d.moved = true;
		// cancel any half-pressed button under the finger so releasing doesn't fire it
		for (const h of scene.webHits) h.go.emit("pointerout");
	}
	const now = performance.now();
	const dt = Math.max(1, now - d.lastT);
	d.vel = d.vel * 0.3 + ((d.lastY - p.y) / dt) * 0.7; // px/ms, smoothed
	d.lastY = p.y;
	d.lastT = now;
	// rubber-band a little past the edges, clamp on release
	const raw = d.startScroll + (d.startY - p.y);
	const over = raw < 0 ? raw : raw > scene.webMaxScroll ? raw - scene.webMaxScroll : 0;
	scene.webScrollY = raw - over * 0.65;
	applyWebScroll(scene);
}

export function webPointerUp(scene: CharacterScene) {
	const d = scene.webDrag;
	scene.webDrag = undefined;
	if (!d || !scene.webC?.active) return;
	if (d.mode === "thumb" || !d.moved) {
		applyWebScroll(scene);
		return;
	}
	applyWebScroll(scene); // drag over -> re-enable hit zones
	const idle = performance.now() - d.lastT > 90; // finger rested before lifting -> no fling
	scrollToWebY(scene, scene.webScrollY + (idle ? 0 : d.vel * 280), true);
}

/** Scrollbar: tap the track to jump, drag the thumb to scrub. */
export function webThumbTo(scene: CharacterScene, py: number, animate: boolean) {
	const sb = scene.webSb;
	const r = Math.max(0, Math.min(1, (py - sb.y - sb.thumbH / 2) / Math.max(1, sb.h - sb.thumbH)));
	scrollToWebY(scene, r * scene.webMaxScroll, animate);
}

import test from "node:test";
import assert from "node:assert/strict";
import {
	PASSIVE_CAM_DEFAULTS,
	PASSIVE_VIEW_DEFAULT,
	clampCam,
	computeGraphBounds,
	computeTagFilter,
	containerTransform,
	createPassiveCam,
	fitCamToBounds,
	nodeMatchesTag,
	nodeScreenHitRadius,
	panBy,
	pickNodeAt,
	pointInView,
	screenToWorld,
	worldToScreen,
	zoomAt,
	zoomByWheel,
	zoomStep,
	type CamNodeLike,
	type PassiveCamState,
	type PassiveView,
} from "../src/scenes/character/passive-cam";

type TestKind = "origin" | "minor" | "notable" | "keystone" | "socket";

const VIEW: PassiveView = { ...PASSIVE_VIEW_DEFAULT }; // x: 326, y: 146, w: 616, h: 394
const FULL_VIEW: PassiveView = { x: 0, y: 0, w: 960, h: 540 };

const RADII: Readonly<Record<TestKind, number>> = {
	origin: 24,
	keystone: 24,
	notable: 18,
	socket: 16,
	minor: 13,
};

function approx(actual: number, expected: number, eps = 1e-6, msg?: string) {
	assert.ok(
		Math.abs(actual - expected) <= eps,
		`${msg ?? "approx"}: expected ${expected} ± ${eps}, got ${actual}`,
	);
}

test("worldToScreen <-> screenToWorld round-trip and containerTransform equivalence", () => {
	const cams: PassiveCamState[] = [
		createPassiveCam({ panX: 0, panY: 0, zoom: 1 }),
		createPassiveCam({ panX: 125.5, panY: -78.25, zoom: 0.65 }),
		createPassiveCam({ panX: -240, panY: 180, zoom: 1.55 }),
	];
	const views: PassiveView[] = [VIEW, FULL_VIEW];
	const points = [
		{ x: 0, y: 0 },
		{ x: -380, y: -280 },
		{ x: 380, y: 260 },
		{ x: 42.75, y: -113.5 },
	];

	for (const view of views) {
		for (const cam of cams) {
			const ct = containerTransform(cam, view);
			for (const pt of points) {
				const s = worldToScreen(cam, view, pt.x, pt.y);
				// Container transform must match worldToScreen identically
				approx(ct.x + pt.x * ct.scale, s.x, 1e-9, "container X matches worldToScreen");
				approx(ct.y + pt.y * ct.scale, s.y, 1e-9, "container Y matches worldToScreen");

				const back = screenToWorld(cam, view, s.x, s.y);
				approx(back.x, pt.x, 1e-9, "round-trip world X");
				approx(back.y, pt.y, 1e-9, "round-trip world Y");
			}
			// Camera pan center always maps to exact viewport center
			const center = worldToScreen(cam, view, cam.panX, cam.panY);
			approx(center.x, view.x + view.w / 2, 1e-9, "panX maps to view center X");
			approx(center.y, view.y + view.h / 2, 1e-9, "panY maps to view center Y");
		}
	}
});

test("zoomAt preserves world point under cursor anchor across zoom-in, zoom-out, and clamped limits", () => {
	const cam = createPassiveCam({ panX: 40, panY: -25, zoom: 0.9, minZoom: 0.5, maxZoom: 1.8 });
	const anchorSx = VIEW.x + 140;
	const anchorSy = VIEW.y + 90;

	const worldBefore = screenToWorld(cam, VIEW, anchorSx, anchorSy);

	// Zoom in toward off-center cursor
	const zoomedIn = zoomAt(cam, VIEW, 1.5, anchorSx, anchorSy);
	approx(zoomedIn.zoom, 1.5, 1e-9);
	const screenAfterIn = worldToScreen(zoomedIn, VIEW, worldBefore.x, worldBefore.y);
	approx(screenAfterIn.x, anchorSx, 1e-9, "anchor X preserved on zoom in");
	approx(screenAfterIn.y, anchorSy, 1e-9, "anchor Y preserved on zoom in");

	// Zoom out past minZoom -> clamps zoom and STILL preserves anchor
	const zoomedOut = zoomAt(zoomedIn, VIEW, 0.1, anchorSx, anchorSy);
	approx(zoomedOut.zoom, 0.5, 1e-9);
	const screenAfterOut = worldToScreen(zoomedOut, VIEW, worldBefore.x, worldBefore.y);
	approx(screenAfterOut.x, anchorSx, 1e-9, "anchor X preserved on clamped zoom out");
	approx(screenAfterOut.y, anchorSy, 1e-9, "anchor Y preserved on clamped zoom out");

	// Default anchor (omitted) zooms around viewport center without shifting pan
	const centeredZoom = zoomAt(cam, VIEW, 1.4);
	approx(centeredZoom.panX, cam.panX, 1e-9);
	approx(centeredZoom.panY, cam.panY, 1e-9);
	approx(centeredZoom.zoom, 1.4, 1e-9);

	// Wheel & step helpers respect direction and preserve anchor
	const wheelIn = zoomByWheel(cam, VIEW, -120, anchorSx, anchorSy);
	assert.ok(wheelIn.zoom > cam.zoom, "negative deltaY zooms in");
	const screenWheel = worldToScreen(wheelIn, VIEW, worldBefore.x, worldBefore.y);
	approx(screenWheel.x, anchorSx, 1e-9, "wheel zoom preserves anchor X");
	approx(screenWheel.y, anchorSy, 1e-9, "wheel zoom preserves anchor Y");

	const stepped = zoomStep(cam, VIEW, -1);
	assert.ok(stepped.zoom < cam.zoom, "zoomStep(-1) zooms out");
});

test("panBy moves the world in the same direction as the drag delta", () => {
	const cam = createPassiveCam({ panX: 0, panY: 0, zoom: 1.25 });
	const before = worldToScreen(cam, VIEW, 50, -30);
	const panned = panBy(cam, 60, -40);
	const after = worldToScreen(panned, VIEW, 50, -30);
	approx(after.x - before.x, 60, 1e-9, "world point shifts right by +dx");
	approx(after.y - before.y, -40, 1e-9, "world point shifts up by -dy");
});

test("computeGraphBounds and fitCamToBounds handle empty and populated graphs", () => {
	assert.deepEqual(computeGraphBounds([]), { minX: 0, maxX: 0, minY: 0, maxY: 0 });

	const nodes: CamNodeLike<TestKind>[] = [
		{ id: "origin", kind: "origin", x: 0, y: 0 },
		{ id: "left", kind: "keystone", x: -380, y: 40 },
		{ id: "right", kind: "keystone", x: 360, y: -260 },
		{ id: "bottom", kind: "notable", x: 20, y: 290 },
	];
	const bounds = computeGraphBounds(nodes);
	assert.deepEqual(bounds, { minX: -380, maxX: 360, minY: -260, maxY: 290 });

	const fitted = fitCamToBounds(bounds, VIEW, 0.4, 1.75, 40);
	approx(fitted.panX, -10, 1e-9, "centered on bounds midpoint X");
	approx(fitted.panY, 15, 1e-9, "centered on bounds midpoint Y");
	// Every node must land strictly inside the viewport
	for (const n of nodes) {
		const s = worldToScreen(fitted, VIEW, n.x, n.y);
		assert.ok(pointInView(VIEW, s.x, s.y), `node ${n.id} fits inside view`);
	}
});

test("clampCam keeps padded graph inside viewport, centers when zoomed out, and clamps zoom", () => {
	const bounds = { minX: -380, maxX: 380, minY: -280, maxY: 280 };
	const pad = 80; // padded span = [-460, 460] (920w) x [-360, 360] (720h)

	// Zoomed in (zoom = 1.0): halfW = 308 -> allowed panX in [-152, 152], halfH = 197 -> allowed panY in [-163, 163]
	const farCam = createPassiveCam({ panX: 999, panY: -999, zoom: 1.0, minZoom: 0.5, maxZoom: 1.75 });
	const clampedIn = clampCam(farCam, bounds, VIEW, pad);
	approx(clampedIn.panX, 152, 1e-9);
	approx(clampedIn.panY, -163, 1e-9);
	// Input cam is never mutated
	assert.equal(farCam.panX, 999);

	// Zoomed way out (zoom = 0.5): visible world width = 1232 > 920 and height = 788 > 720 -> locks to midpoint (0, 0)
	const outCam: PassiveCamState = { panX: 250, panY: -200, zoom: 0.2, minZoom: 0.5, maxZoom: 1.75 };
	const clampedOut = clampCam(outCam, bounds, VIEW, pad);
	approx(clampedOut.zoom, 0.5, 1e-9, "clamps zoom up to minZoom");
	approx(clampedOut.panX, 0, 1e-9, "centers X when graph fits horizontally");
	approx(clampedOut.panY, 0, 1e-9, "centers Y when graph fits vertically");

	// Asymmetric bounds center on midpoint when zoomed out
	const asym = { minX: -100, maxX: 300, minY: -50, maxY: 150 };
	const clampedAsym = clampCam(
		createPassiveCam({ panX: 900, panY: 900, zoom: 0.6 }),
		asym,
		VIEW,
		0,
	);
	approx(clampedAsym.panX, 100, 1e-9);
	approx(clampedAsym.panY, 50, 1e-9);
});

test("pickNodeAt uses zoom-aware touch-friendly radius, rejects clicks outside view, and resolves overlaps", () => {
	const nodes: CamNodeLike<TestKind>[] = [
		{ id: "origin", kind: "origin", x: 0, y: 0 },
		{ id: "minor_a", kind: "minor", x: 70, y: 0 },
		{ id: "keystone_b", kind: "keystone", x: 140, y: 0 },
		{ id: "offscreen", kind: "keystone", x: 400, y: 0 },
	];

	// 1. Zoomed out (zoom = 0.5): minor visual radius is 6.5px, but touch floor keeps hit radius >= 16px
	const zoomOutCam = createPassiveCam({ panX: 0, panY: 0, zoom: 0.5 });
	const minorPos = worldToScreen(zoomOutCam, VIEW, 70, 0);
	assert.equal(nodeScreenHitRadius(RADII.minor, 0.5), PASSIVE_CAM_DEFAULTS.minTouchRadius);

	// 14px away from minor center (outside 6.5px visual circle, inside 16px touch radius) -> STILL picks minor_a!
	const touchHit = pickNodeAt(nodes, zoomOutCam, VIEW, minorPos.x, minorPos.y + 14, RADII);
	assert.equal(touchHit?.id, "minor_a");

	// 18px away -> misses minor_a
	const touchMiss = pickNodeAt(nodes, zoomOutCam, VIEW, minorPos.x, minorPos.y + 18, RADII);
	assert.equal(touchMiss, undefined);

	// 2. Zoomed in (zoom = 1.6): keystone visual radius = 38.4px, hit radius = 41.4px
	const zoomInCam = createPassiveCam({ panX: 140, panY: 0, zoom: 1.6 });
	const ksPos = worldToScreen(zoomInCam, VIEW, 140, 0);
	const ksHit = pickNodeAt(nodes, zoomInCam, VIEW, ksPos.x + 39, ksPos.y, RADII);
	assert.equal(ksHit?.id, "keystone_b");
	const ksMiss = pickNodeAt(nodes, zoomInCam, VIEW, ksPos.x + 43, ksPos.y, RADII);
	assert.equal(ksMiss, undefined);

	// 3. Rejects pointer outside viewport even if a node sits right there in unclipped screen space
	const cam1 = createPassiveCam({ panX: 0, panY: 0, zoom: 1.0 });
	const outsideNodeScreen = worldToScreen(cam1, VIEW, 400, 0);
	assert.ok(!pointInView(VIEW, outsideNodeScreen.x, outsideNodeScreen.y));
	assert.equal(
		pickNodeAt(nodes, cam1, VIEW, outsideNodeScreen.x, outsideNodeScreen.y, RADII),
		undefined,
		"clipped node outside viewport must not be clickable",
	);

	// 4. Tie-breaking: visual hit wins over touch-pad overlap, closest center wins otherwise
	const closeNodes: CamNodeLike<TestKind>[] = [
		{ id: "big", kind: "keystone", x: 0, y: 0 }, // r = 24
		{ id: "small", kind: "minor", x: 38, y: 0 }, // r = 13
	];
	const midScreen = worldToScreen(cam1, VIEW, 20, 0); // dist 20 to big (visual hit <= 24), dist 18 to small (outside visual 13, inside touch pad)
	const picked = pickNodeAt(closeNodes, cam1, VIEW, midScreen.x, midScreen.y, RADII);
	assert.equal(picked?.id, "big", "direct visual hit takes priority over touch padding");
});

test("tag filter helpers match case-insensitively and return all nodes when inactive", () => {
	const nodes: CamNodeLike<TestKind>[] = [
		{ id: "origin", kind: "origin", x: 0, y: 0, tags: [] },
		{ id: "n_venom", kind: "notable", x: 60, y: 0, tags: ["poison", "offmeta"] },
		{ id: "n_crit", kind: "minor", x: -60, y: 0, tags: ["blade", "crit"] },
		{ id: "n_agony", kind: "keystone", x: 0, y: 90, tags: ["poison", "crit"] },
	];

	const all = computeTagFilter(nodes, null);
	assert.equal(all.active, false);
	assert.equal(all.matchCount, 4);
	assert.equal(nodeMatchesTag(nodes[0], ""), true);

	const poison = computeTagFilter(nodes, " Poison ");
	assert.equal(poison.active, true);
	assert.equal(poison.tag, "poison");
	assert.equal(poison.matchCount, 2);
	assert.ok(poison.matchedIds.has("n_venom"));
	assert.ok(poison.matchedIds.has("n_agony"));
	assert.ok(!poison.matchedIds.has("n_crit"));
	assert.ok(!poison.matchedIds.has("origin"));

	const none = computeTagFilter(nodes, "shadow");
	assert.equal(none.active, true);
	assert.equal(none.matchCount, 0);
});

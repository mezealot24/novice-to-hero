/**
 * Pure, Phaser-free 2D camera, viewport, hit-testing, and tag-filter math
 * for the PoE-style Constellation Passive Tree UI.
 *
 * Coordinate convention:
 * - World coordinates: centered around (0, 0) (origin node).
 * - Camera state (`panX`, `panY`): the world coordinate displayed at the
 *   exact center of `view` (`view.x + view.w / 2`, `view.y + view.h / 2`).
 * - Screen coordinates (`sx`, `sy`): canvas-space pixels (960x576 virtual canvas).
 */

export interface PassiveView {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface PassiveCamState {
	panX: number;
	panY: number;
	zoom: number;
	minZoom: number;
	maxZoom: number;
}

export interface GraphBounds {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}

export interface CamPoint {
	x: number;
	y: number;
}

export interface CamNodeLike<K extends string = string> {
	id: string;
	kind: K;
	x: number;
	y: number;
	tags?: readonly string[];
}

export interface PickNodeOptions {
	/** Minimum screen-space hit radius (px) so small nodes stay easy to tap when zoomed out. */
	minScreenRadius?: number;
	/** Extra screen-space touch padding (px) added around the scaled visual radius. */
	hitPad?: number;
}

export interface TagFilterResult {
	active: boolean;
	tag: string;
	matchedIds: ReadonlySet<string>;
	matchCount: number;
}

export const PASSIVE_VIEW_DEFAULT: Readonly<PassiveView> = {
	x: 326,
	y: 146,
	w: 616,
	h: 394,
};

export const PASSIVE_CAM_DEFAULTS = {
	zoom: 0.85,
	minZoom: 0.5,
	maxZoom: 1.75,
	padding: 88,
	minTouchRadius: 16,
	hitPad: 3,
	wheelSensitivity: 0.0018,
	wheelDeltaClamp: 300,
	zoomStepFactor: 1.25,
} as const;

export const DEFAULT_NODE_RADIUS: Readonly<Record<string, number>> = {
	origin: 24,
	keystone: 24,
	notable: 18,
	socket: 16,
	minor: 13,
};

function clampNumber(v: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, v));
}

function safeZoomBounds(cam: PassiveCamState): { minZoom: number; maxZoom: number } {
	const rawMin = Number.isFinite(cam.minZoom) && cam.minZoom > 0 ? cam.minZoom : PASSIVE_CAM_DEFAULTS.minZoom;
	const rawMax = Number.isFinite(cam.maxZoom) && cam.maxZoom > 0 ? cam.maxZoom : PASSIVE_CAM_DEFAULTS.maxZoom;
	return rawMin <= rawMax ? { minZoom: rawMin, maxZoom: rawMax } : { minZoom: rawMax, maxZoom: rawMin };
}

function safeZoom(cam: PassiveCamState): number {
	const { minZoom, maxZoom } = safeZoomBounds(cam);
	const z = Number.isFinite(cam.zoom) && cam.zoom > 0 ? cam.zoom : PASSIVE_CAM_DEFAULTS.zoom;
	return clampNumber(z, minZoom, maxZoom);
}

/** Creates an initial camera centered at (0, 0) with sensible zoom limits. */
export function createPassiveCam(overrides: Partial<PassiveCamState> = {}): PassiveCamState {
	const base: PassiveCamState = {
		panX: overrides.panX ?? 0,
		panY: overrides.panY ?? 0,
		zoom: overrides.zoom ?? PASSIVE_CAM_DEFAULTS.zoom,
		minZoom: overrides.minZoom ?? PASSIVE_CAM_DEFAULTS.minZoom,
		maxZoom: overrides.maxZoom ?? PASSIVE_CAM_DEFAULTS.maxZoom,
	};
	const { minZoom, maxZoom } = safeZoomBounds(base);
	return {
		panX: Number.isFinite(base.panX) ? base.panX : 0,
		panY: Number.isFinite(base.panY) ? base.panY : 0,
		zoom: clampNumber(base.zoom, minZoom, maxZoom),
		minZoom,
		maxZoom,
	};
}

/** Returns true if screen coordinate (sx, sy) lies inside the viewport rect. */
export function pointInView(view: PassiveView, sx: number, sy: number): boolean {
	return (
		sx >= view.x &&
		sx <= view.x + view.w &&
		sy >= view.y &&
		sy <= view.y + view.h
	);
}

/** Converts world coordinate (wx, wy) to screen-space pixel coordinate inside `view`. */
export function worldToScreen(
	cam: PassiveCamState,
	view: PassiveView,
	wx: number,
	wy: number,
): CamPoint {
	const cx = view.x + view.w / 2;
	const cy = view.y + view.h / 2;
	return {
		x: cx + (wx - cam.panX) * cam.zoom,
		y: cy + (wy - cam.panY) * cam.zoom,
	};
}

/** Converts screen-space pixel coordinate (sx, sy) back into world coordinates. */
export function screenToWorld(
	cam: PassiveCamState,
	view: PassiveView,
	sx: number,
	sy: number,
): CamPoint {
	const cx = view.x + view.w / 2;
	const cy = view.y + view.h / 2;
	const z = cam.zoom > 0 ? cam.zoom : PASSIVE_CAM_DEFAULTS.zoom;
	return {
		x: cam.panX + (sx - cx) / z,
		y: cam.panY + (sy - cy) / z,
	};
}

/** Computes the Phaser Container (x, y, scale) transform matching `worldToScreen`. */
export function containerTransform(
	cam: PassiveCamState,
	view: PassiveView,
): { x: number; y: number; scale: number } {
	const cx = view.x + view.w / 2;
	const cy = view.y + view.h / 2;
	return {
		x: cx - cam.panX * cam.zoom,
		y: cy - cam.panY * cam.zoom,
		scale: cam.zoom,
	};
}

/** Computes the axis-aligned world bounding box of a node list. */
export function computeGraphBounds(
	nodes: readonly Pick<CamNodeLike, "x" | "y">[],
): GraphBounds {
	if (nodes.length === 0) {
		return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
	}
	let minX = Infinity;
	let maxX = -Infinity;
	let minY = Infinity;
	let maxY = -Infinity;
	for (const n of nodes) {
		if (n.x < minX) minX = n.x;
		if (n.x > maxX) maxX = n.x;
		if (n.y < minY) minY = n.y;
		if (n.y > maxY) maxY = n.y;
	}
	return { minX, maxX, minY, maxY };
}

/**
 * Clamps zoom to [minZoom, maxZoom] and clamps (panX, panY) so the padded
 * graph stays framed inside `view`. When the padded graph fits completely
 * inside the viewport on an axis, centers that axis on the graph midpoint.
 */
export function clampCam(
	cam: PassiveCamState,
	bounds: GraphBounds,
	view: PassiveView,
	padding: number = PASSIVE_CAM_DEFAULTS.padding,
): PassiveCamState {
	const { minZoom, maxZoom } = safeZoomBounds(cam);
	const zoom = safeZoom(cam);
	const pad = Math.max(0, padding);

	const pMinX = bounds.minX - pad;
	const pMaxX = bounds.maxX + pad;
	const pMinY = bounds.minY - pad;
	const pMaxY = bounds.maxY + pad;

	const halfW = view.w / 2 / zoom;
	const halfH = view.h / 2 / zoom;

	const minPanX = pMinX + halfW;
	const maxPanX = pMaxX - halfW;
	const minPanY = pMinY + halfH;
	const maxPanY = pMaxY - halfH;

	const midX = (pMinX + pMaxX) / 2;
	const midY = (pMinY + pMaxY) / 2;
	const rawPanX = Number.isFinite(cam.panX) ? cam.panX : midX;
	const rawPanY = Number.isFinite(cam.panY) ? cam.panY : midY;

	const panX =
		minPanX <= maxPanX ? clampNumber(rawPanX, minPanX, maxPanX) : midX;
	const panY =
		minPanY <= maxPanY ? clampNumber(rawPanY, minPanY, maxPanY) : midY;

	return { panX, panY, zoom, minZoom, maxZoom };
}

/** Pans the camera by a screen-space pointer delta (dx, dy) in pixels. */
export function panBy(
	cam: PassiveCamState,
	dx: number,
	dy: number,
): PassiveCamState {
	const z = cam.zoom > 0 ? cam.zoom : PASSIVE_CAM_DEFAULTS.zoom;
	return {
		...cam,
		panX: cam.panX - dx / z,
		panY: cam.panY - dy / z,
	};
}

/**
 * Zooms the camera to `nextZoom` (clamped to [minZoom, maxZoom]) while keeping
 * the world point under screen coordinate (anchorSx, anchorSy) fixed on screen.
 * When anchor coordinates are omitted, zooms around the viewport center.
 */
export function zoomAt(
	cam: PassiveCamState,
	view: PassiveView,
	nextZoom: number,
	anchorSx: number = view.x + view.w / 2,
	anchorSy: number = view.y + view.h / 2,
): PassiveCamState {
	const { minZoom, maxZoom } = safeZoomBounds(cam);
	const targetZoom = clampNumber(
		Number.isFinite(nextZoom) ? nextZoom : cam.zoom,
		minZoom,
		maxZoom,
	);
	const worldAnchor = screenToWorld(cam, view, anchorSx, anchorSy);
	const cx = view.x + view.w / 2;
	const cy = view.y + view.h / 2;
	return {
		panX: worldAnchor.x - (anchorSx - cx) / targetZoom,
		panY: worldAnchor.y - (anchorSy - cy) / targetZoom,
		zoom: targetZoom,
		minZoom,
		maxZoom,
	};
}

/** Smooth exponential wheel zoom anchored at cursor position. */
export function zoomByWheel(
	cam: PassiveCamState,
	view: PassiveView,
	deltaY: number,
	anchorSx: number = view.x + view.w / 2,
	anchorSy: number = view.y + view.h / 2,
): PassiveCamState {
	const clampedDelta = clampNumber(
		deltaY,
		-PASSIVE_CAM_DEFAULTS.wheelDeltaClamp,
		PASSIVE_CAM_DEFAULTS.wheelDeltaClamp,
	);
	const factor = Math.exp(-clampedDelta * PASSIVE_CAM_DEFAULTS.wheelSensitivity);
	return zoomAt(cam, view, cam.zoom * factor, anchorSx, anchorSy);
}

/** Discrete +/- button zoom anchored at viewport center. */
export function zoomStep(
	cam: PassiveCamState,
	view: PassiveView,
	dir: 1 | -1,
	factor: number = PASSIVE_CAM_DEFAULTS.zoomStepFactor,
): PassiveCamState {
	const mult = dir > 0 ? factor : 1 / factor;
	return zoomAt(cam, view, cam.zoom * mult);
}

/** Computes a camera centered on `bounds` with zoom fitted so the whole graph is visible. */
export function fitCamToBounds(
	bounds: GraphBounds,
	view: PassiveView,
	minZoom: number = PASSIVE_CAM_DEFAULTS.minZoom,
	maxZoom: number = PASSIVE_CAM_DEFAULTS.maxZoom,
	padding: number = PASSIVE_CAM_DEFAULTS.padding,
): PassiveCamState {
	const pad = Math.max(0, padding);
	const spanW = Math.max(1, bounds.maxX - bounds.minX + pad * 2);
	const spanH = Math.max(1, bounds.maxY - bounds.minY + pad * 2);
	const fitZoom = clampNumber(
		Math.min(view.w / spanW, view.h / spanH),
		minZoom,
		maxZoom,
	);
	return {
		panX: (bounds.minX + bounds.maxX) / 2,
		panY: (bounds.minY + bounds.maxY) / 2,
		zoom: fitZoom,
		minZoom,
		maxZoom,
	};
}

/** Computes the zoom-aware, touch-friendly screen hit radius for a node. */
export function nodeScreenHitRadius(
	worldRadius: number,
	zoom: number,
	minScreenRadius: number = PASSIVE_CAM_DEFAULTS.minTouchRadius,
	hitPad: number = PASSIVE_CAM_DEFAULTS.hitPad,
): number {
	return Math.max(minScreenRadius, worldRadius * zoom + hitPad);
}

/**
 * Hit-tests nodes in screen space using zoom-aware touch-friendly radii.
 * Returns `undefined` if (sx, sy) is outside `view` or misses every node.
 * When multiple hit circles overlap, prefers a direct hit inside a node's
 * visual radius, then the closest node center in screen pixels.
 */
export function pickNodeAt<K extends string, T extends CamNodeLike<K>>(
	nodes: readonly T[],
	cam: PassiveCamState,
	view: PassiveView,
	sx: number,
	sy: number,
	radiusByKind: Readonly<Partial<Record<K, number>>> = DEFAULT_NODE_RADIUS as Readonly<Partial<Record<K, number>>>,
	options: PickNodeOptions = {},
): T | undefined {
	if (!pointInView(view, sx, sy)) return undefined;
	const minScreenRadius = options.minScreenRadius ?? PASSIVE_CAM_DEFAULTS.minTouchRadius;
	const hitPad = options.hitPad ?? PASSIVE_CAM_DEFAULTS.hitPad;

	let best: T | undefined;
	let bestVisualHit = false;
	let bestDistSq = Infinity;

	for (const node of nodes) {
		const pos = worldToScreen(cam, view, node.x, node.y);
		const dx = sx - pos.x;
		const dy = sy - pos.y;
		const distSq = dx * dx + dy * dy;

		const worldR = radiusByKind[node.kind] ?? DEFAULT_NODE_RADIUS[node.kind] ?? DEFAULT_NODE_RADIUS.minor;
		const hitR = nodeScreenHitRadius(worldR, cam.zoom, minScreenRadius, hitPad);
		if (distSq > hitR * hitR) continue;

		const visR = worldR * cam.zoom;
		const visualHit = distSq <= visR * visR;

		if (
			!best ||
			(visualHit && !bestVisualHit) ||
			(visualHit === bestVisualHit && distSq < bestDistSq)
		) {
			best = node;
			bestVisualHit = visualHit;
			bestDistSq = distSq;
		}
	}

	return best;
}

/** Returns true if a node matches the active tag filter (or if no filter is active). */
export function nodeMatchesTag(
	node: { tags?: readonly string[] },
	activeTag: string | null | undefined,
): boolean {
	const norm = activeTag?.trim().toLowerCase() ?? "";
	if (!norm) return true;
	if (!node.tags || node.tags.length === 0) return false;
	return node.tags.some((t) => t.trim().toLowerCase() === norm);
}

/** Filters nodes by an optional tag pill and returns matching IDs + summary. */
export function computeTagFilter<T extends Pick<CamNodeLike, "id" | "tags">>(
	nodes: readonly T[],
	activeTag: string | null | undefined,
): TagFilterResult {
	const norm = activeTag?.trim().toLowerCase() ?? "";
	const matched = new Set<string>();
	if (!norm) {
		for (const n of nodes) matched.add(n.id);
		return {
			active: false,
			tag: "",
			matchedIds: matched,
			matchCount: matched.size,
		};
	}
	for (const n of nodes) {
		if (nodeMatchesTag(n, norm)) matched.add(n.id);
	}
	return {
		active: true,
		tag: norm,
		matchedIds: matched,
		matchCount: matched.size,
	};
}

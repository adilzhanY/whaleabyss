"use client";

import { useEffect, useRef, useState } from "react";

type Pt = { x: number; y: number };

/* Catmull-Rom spline emitted as cubic Béziers: C1-smooth and guaranteed to pass
 * exactly through every input point — which is what lets the curve thread the
 * step circles through their centers instead of merely near them. */
function splinePath(p: Pt[]): string {
	if (p.length < 2) return "";
	const f = (n: number) => Math.round(n * 10) / 10;
	let d = `M${f(p[0].x)} ${f(p[0].y)}`;
	for (let i = 0; i < p.length - 1; i++) {
		const p0 = p[i - 1] ?? p[i];
		const p1 = p[i];
		const p2 = p[i + 1];
		const p3 = p[i + 2] ?? p2;
		d +=
			`C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ` +
			`${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)} ` +
			`${f(p2.x)} ${f(p2.y)}`;
	}
	return d;
}

/**
 * The winding «dive thread» of the how-it-works panel: one dashed SVG path from
 * under the subtitle, through the center of every `.dive-node` circle, down to
 * Valle in `.dive-fin`. Card heights depend on text wrapping and the axis moves
 * to a left rail under 640px, so the circle centers are measured from the live
 * DOM (ResizeObserver) rather than hardcoded — the curve is exact at any width.
 * Until the first client-side measurement (and without JS) the old straight
 * `.dive-line` renders as a fallback.
 */
export default function DivePath() {
	const svgRef = useRef<SVGSVGElement>(null);
	const [geo, setGeo] = useState<{ w: number; h: number; d: string } | null>(
		null,
	);

	useEffect(() => {
		const panel = svgRef.current?.closest<HTMLElement>(".dive-panel");
		if (!panel) return;

		const measure = () => {
			const panelRect = panel.getBoundingClientRect();
			const nodes = panel.querySelectorAll<HTMLElement>(".dive-node");
			const fin = panel.querySelector<HTMLElement>(".dive-fin img");
			const sub = panel.querySelector<HTMLElement>(".dive-sub");
			if (!nodes.length || !fin) return;

			const center = (r: DOMRect): Pt => ({
				x: r.left + r.width / 2 - panelRect.left,
				y: r.top + r.height / 2 - panelRect.top,
			});
			const anchors: Pt[] = Array.from(nodes, (n) =>
				center(n.getBoundingClientRect()),
			);

			// Start just under the subtitle, on the circles' axis; end at the top
			// of Valle's head so the thread visibly "reaches" her.
			const subRect = sub?.getBoundingClientRect();
			anchors.unshift({
				x: anchors[0].x,
				y: subRect
					? subRect.bottom - panelRect.top + 10
					: Math.max(anchors[0].y - 110, 0),
			});
			const finRect = fin.getBoundingClientRect();
			anchors.push({
				x: finRect.left + finRect.width / 2 - panelRect.left,
				y: finRect.top - panelRect.top + 8,
			});

			// A wiggle point midway between each pair of anchors, alternating
			// sides. Amplitude scales with the panel but is capped by the axis
			// offset so the curve never exits the panel on the left-rail layout.
			const amp = Math.min(72, panelRect.width * 0.08, anchors[1].x - 12);
			const pts: Pt[] = [];
			anchors.forEach((p, i) => {
				pts.push(p);
				const next = anchors[i + 1];
				if (next)
					pts.push({
						x: (p.x + next.x) / 2 + (i % 2 ? -amp : amp),
						y: (p.y + next.y) / 2,
					});
			});

			const d = splinePath(pts);
			const w = Math.round(panelRect.width);
			const h = Math.round(panelRect.height);
			setGeo((g) =>
				g && g.d === d && g.w === w && g.h === h ? g : { w, h, d },
			);
		};

		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(panel);
		panel
			.querySelectorAll(".dive-step, .dive-fin img")
			.forEach((el) => ro.observe(el));
		return () => ro.disconnect();
	}, []);

	return (
		<>
			{!geo && <div className="dive-line" aria-hidden />}
			<svg
				ref={svgRef}
				className="dive-path"
				viewBox={geo ? `0 0 ${geo.w} ${geo.h}` : undefined}
				preserveAspectRatio="none"
				aria-hidden
			>
				{geo && <path d={geo.d} />}
			</svg>
		</>
	);
}

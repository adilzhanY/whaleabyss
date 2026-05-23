"use client";

/* ---------------------------------------------------------------------------
 * LiquidGlassFilter
 *
 * SVG-based adaptation of a WebGL liquid-glass shader. Implements the shader's
 * core moves as an SVG backdrop-filter so it works in real time without having
 * to capture page content into a texture.
 *
 * Shader source we're modeling (paraphrased):
 *   m2          = uv - center
 *   roundedBox  = |m2.x * aspect|^P + |m2.y|^P            // superellipse
 *   rb1, rb2    = clamped bands of roundedBox             // body + rim mask
 *   lens_uv     = (uv - 0.5) * (1 - roundedBox * K) + 0.5 // pinch toward center
 *   averaged    = mean(texture(lens_uv) over 9×9 grid)    // soft lens blur
 *   final       = mix(texture(uv), averaged + rim_light, mask)
 *
 * SVG translation:
 *   - We pre-compute the displacement field that maps (px,py) → (px',py')
 *     according to the lens formula and bake it into a PNG. <feDisplacementMap>
 *     consumes that map.
 *   - The 9×9 sample averaging becomes a <feGaussianBlur> (stdDeviation ≈ 2.5
 *     gives the same visual smoothing without 81 texture taps).
 *   - The rim lighting (rb1·gradient + rb2·0.3) is applied as a CSS overlay
 *     via the existing .glass-panel ::before / ::after layers.
 *
 * Falloff knob: `lensPower` controls how concentrated the distortion is at the
 * rim. The shader uses pow(..., 6); we expose it so you can pull it down for
 * a softer dome or push it up for a sharper rim.
 * ------------------------------------------------------------------------- */

import { RefObject, useEffect, useRef, useState } from "react";

interface LiquidGlassFilterProps {
  /** ID for the SVG filter — caller references this via `url(#id)`. */
  filterId: string;
  /** Ref to the element whose size we should match. */
  targetRef: RefObject<HTMLElement | null>;
  /** Max pixel offset at the navbar's far end. ~30-50 reads as a real lens. */
  maxOffsetPx?: number;
  /** Superellipse exponent on the mask. Higher (6+) = boxy mask, low (2) = round. */
  lensPower?: number;
  /** Post-displacement blur (px) — models the shader's 9×9 sample averaging. */
  blurAmount?: number;
  /** Saturation boost (1.0 = none). */
  saturation?: number;
}

/**
 * For a rounded rectangle of width w, height h, corner radius r, return:
 *   - distance from (px,py) to the nearest point on the rect's edge
 *     (positive inside the shape)
 *   - the outward-pointing unit normal at that nearest edge point.
 */
function distanceAndNormal(
  px: number,
  py: number,
  w: number,
  h: number,
  r: number,
): { distance: number; nx: number; ny: number } {
  const inLeft = px < r;
  const inRight = px > w - r;
  const inTop = py < r;
  const inBottom = py > h - r;

  if ((inLeft || inRight) && (inTop || inBottom)) {
    const cx = inLeft ? r : w - r;
    const cy = inTop ? r : h - r;
    const dx = px - cx;
    const dy = py - cy;
    const len = Math.sqrt(dx * dx + dy * dy);
    const distance = r - len;
    if (len < 1e-6) return { distance, nx: 0, ny: 0 };
    return { distance, nx: dx / len, ny: dy / len };
  }

  const dTop = py;
  const dBottom = h - py;
  const dLeft = px;
  const dRight = w - px;
  const min = Math.min(dTop, dBottom, dLeft, dRight);

  if (min === dTop) return { distance: dTop, nx: 0, ny: -1 };
  if (min === dBottom) return { distance: dBottom, nx: 0, ny: 1 };
  if (min === dLeft) return { distance: dLeft, nx: -1, ny: 0 };
  return { distance: dRight, nx: 1, ny: 0 };
}

export default function LiquidGlassFilter({
  filterId,
  targetRef,
  maxOffsetPx = 40,
  lensPower = 6,
  blurAmount = 2.5,
  saturation = 1.7,
}: LiquidGlassFilterProps) {
  const [mapUrl, setMapUrl] = useState<string>("");
  const [scale, setScale] = useState<number>(0);
  const [size, setSize] = useState<{ w: number; h: number; r: number }>({
    w: 0,
    h: 0,
    r: 0,
  });

  // Observe target size + radius.
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      const radiusStr = cs.borderTopLeftRadius || "0";
      const r = parseFloat(radiusStr) || 0;
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w <= 0 || h <= 0) return;
      setSize((prev) =>
        prev.w === w && prev.h === h && prev.r === r ? prev : { w, h, r },
      );
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [targetRef]);

  // Regenerate the displacement map whenever size changes (debounced via rAF).
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (size.w === 0 || size.h === 0) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      const { w, h, r } = size;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = ctx.createImageData(w, h);
      const data = img.data;

      const cx = w / 2;
      const cy = h / 2;
      const halfW = w / 2;
      const halfH = h / 2;

      // Two-pass:
      //  1) Compute raw pixel displacements using the shader's radial-magnify
      //     lens formula in navbar-normalized coords.
      //  2) Find the global max magnitude → normalize to [-1,1] → encode to
      //     R/G channels (8-bit, midpoint 128). The filter's `scale` attribute
      //     then translates the encoded values back into real pixel offsets:
      //     decoded_offset_px = scale * ((channel/255) - 0.5)
      //     so we set scale = 2 * maxMag, giving full ±maxMag pixel range.
      const oxBuf = new Float32Array(w * h);
      const oyBuf = new Float32Array(w * h);
      let maxMag = 1e-6;

      // Width (px) of the inner "rim fade" band. The shader's mask smoothsteps
      // at the rim; we replicate that by gently tapering displacement to 0 in
      // the last few pixels next to the rounded-rect outline, so the lens has
      // a soft edge instead of a hard discontinuity.
      const rimFade = 3;

      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const { distance } = distanceAndNormal(px, py, w, h, r);
          const idx = py * w + px;

          if (distance <= 0) {
            oxBuf[idx] = 0;
            oyBuf[idx] = 0;
            continue;
          }

          // Shader's mainImage:
          //   m2 = uv - mouseUV                          (delta from mask center)
          //   rb = |m2.x*aspect|^P + |m2.y|^P            (superellipse distance)
          //   lens = (uv - 0.5) * (1 - rb * 5000) + 0.5  (radial scale toward center)
          //   disp = lens - uv = (uv - 0.5) * (-rb * 5000)
          //
          // Translated to navbar-normalized coords (so the math is dimension-
          // independent — works for any width/height):
          //   ndx, ndy ∈ [-1, 1] across the navbar
          //   rb = |ndx|^P + |ndy|^P
          //   disp_norm = -nd * rb         (the "magnification" pull)
          //   disp_px   = disp_norm * half_extent
          const ndx = (px - cx) / halfW;
          const ndy = (py - cy) / halfH;
          const rb =
            Math.pow(Math.abs(ndx), lensPower) +
            Math.pow(Math.abs(ndy), lensPower);

          // Soft taper near the rounded-rect outline (replaces the shader's
          // smoothstep mask). Without this, displacement values right at the
          // rim are discontinuous against the (zero) values just outside.
          const fade = Math.min(1, distance / rimFade);

          // Radial pull toward navbar center, weighted by superellipse-rb.
          // Sign is negative → pixels sample from a point closer to center →
          // central content appears magnified at the rim. Same behavior as
          // the shader's lens formula.
          const ox = -ndx * rb * fade * halfW;
          const oy = -ndy * rb * fade * halfH;

          oxBuf[idx] = ox;
          oyBuf[idx] = oy;

          const m = Math.hypot(ox, oy);
          if (m > maxMag) maxMag = m;
        }
      }

      // Cap the natural max at the user's requested maxOffsetPx — if the
      // computed displacement would be bigger, we scale everything down to fit.
      // If it'd be smaller, we leave it (no point amplifying beyond the math).
      const effectiveMax = Math.min(maxMag, maxOffsetPx);
      const compress = effectiveMax / maxMag;
      const inv = 1 / maxMag;

      for (let i = 0, j = 0; i < oxBuf.length; i++, j += 4) {
        // Encode (-1, 1) → (0, 255) with midpoint at 128.
        data[j] = Math.round(128 + oxBuf[i] * inv * 127);
        data[j + 1] = Math.round(128 + oyBuf[i] * inv * 127);
        data[j + 2] = 128;
        data[j + 3] = 255;
      }

      ctx.putImageData(img, 0, 0);
      setMapUrl(canvas.toDataURL("image/png"));
      // feDisplacementMap: actual_offset = scale * (channel - 0.5) where
      // channel ∈ [0,1]. We encoded the full ±maxMag range into ±0.5 of channel,
      // so scale = 2 * (maxMag * compress) gives back the desired pixel range.
      setScale(2 * maxMag * compress);
      rafRef.current = null;
    });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [size, lensPower, maxOffsetPx]);

  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <defs>
        <filter
          id={filterId}
          x="0"
          y="0"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          {mapUrl && size.w > 0 && (
            <feImage
              href={mapUrl}
              x="0"
              y="0"
              width={size.w}
              height={size.h}
              preserveAspectRatio="none"
              result="dispMap"
            />
          )}
          {mapUrl && scale > 0 ? (
            <feDisplacementMap
              in="SourceGraphic"
              in2="dispMap"
              scale={scale}
              xChannelSelector="R"
              yChannelSelector="G"
              result="warped"
            />
          ) : (
            <feOffset in="SourceGraphic" dx="0" dy="0" result="warped" />
          )}
          {/* 9×9 sample averaging from the shader ≈ a small Gaussian blur. */}
          <feGaussianBlur in="warped" stdDeviation={blurAmount} result="blurred" />
          <feColorMatrix
            in="blurred"
            type="matrix"
            values={`${saturation} 0 0 0 0  0 ${saturation} 0 0 0  0 0 ${saturation} 0 0  0 0 0 1 0`}
          />
        </filter>
      </defs>
    </svg>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

interface ServiceArtworkProps {
  src: string;
  alt: string;
  /** `false` on the detail hero, which is above the fold. */
  lazy?: boolean;
}

/**
 * A landscape screenshot FILLS its box; anything else is shown whole on a
 * blurred copy of itself.
 *
 * Two different problems land here. On the catalogue card, some artwork is a
 * square item icon on flat white rather than a screenshot, and the box's edges
 * cut straight through it («Прочее», «Задание легенд») — those services carry
 * `image_fit = 'contain'`. On the service page the box is a fixed 16:10 while
 * the artwork is anything from 3840×2160 to a 380×712 portrait, so cropping
 * chopped the tall ones in half; that hero uses this unconditionally.
 *
 * The whole-image branch keeps `width/height: auto`, so a picture is never blown
 * up past its natural size — a 128×128 icon renders as 128×128 and stays crisp
 * instead of turning into a soft 850px smear, and the blurred backdrop makes the
 * leftover space look intentional rather than like letterboxing.
 *
 * That rule was too broad, though: several catalogue screenshots are only
 * 512×256, so on the ~980px detail hero they sat as a small rectangle in the
 * middle of a large blurred frame — the picture read as a thumbnail someone
 * forgot to replace. A wide picture has nothing to lose from a crop (the sides
 * of a 2:1 shot are background), so it now fills the box; the measurement is
 * done on the loaded image, because only the browser knows the intrinsic size.
 */

/** Wide enough that cropping to the box takes background, not subject. */
const FILL_MIN_ASPECT = 1.3;
/** Below this the picture is an icon, and upscaling it would only smear it. */
const FILL_MIN_WIDTH = 320;

export default function ServiceArtwork({ src, alt, lazy = true }: ServiceArtworkProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [fill, setFill] = useState(false);

  const measure = (img: HTMLImageElement | null) => {
    if (!img?.naturalWidth) return;
    setFill(
      img.naturalWidth / img.naturalHeight >= FILL_MIN_ASPECT &&
        img.naturalWidth >= FILL_MIN_WIDTH
    );
  };

  // `onLoad` never fires for an image the browser already had cached by the time
  // React hydrated, which is the common case on a second visit.
  useEffect(() => {
    if (imgRef.current?.complete) measure(imgRef.current);
  }, [src]);

  return (
    <div className="service-art">
      <div
        aria-hidden
        className="service-art__backdrop"
        style={{ backgroundImage: `url('${src}')` }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        className={fill ? "service-art__img service-art__img--fill" : "service-art__img"}
        src={src}
        alt={alt}
        loading={lazy ? "lazy" : "eager"}
        onLoad={(e) => measure(e.currentTarget)}
      />
    </div>
  );
}

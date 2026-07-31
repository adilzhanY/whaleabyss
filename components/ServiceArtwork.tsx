interface ServiceArtworkProps {
  src: string;
  alt: string;
  /** `false` on the detail hero, which is above the fold. */
  lazy?: boolean;
}

/**
 * A picture shown WHOLE inside a box it does not match, on a blurred copy of
 * itself.
 *
 * Two different problems land here. On the catalogue card, some artwork is a
 * square item icon on flat white rather than a screenshot, and the box's edges
 * cut straight through it («Прочее», «Задание легенд») — those services carry
 * `image_fit = 'contain'`. On the service page the box is a fixed 16:10 while
 * the artwork is anything from 3840×2160 to a 380×712 portrait, so cropping
 * chopped the tall ones in half; that hero uses this unconditionally.
 *
 * The image is an `<img>` with `width/height: auto`, so it is never blown up
 * past its natural size — a 128×128 icon renders as 128×128 and stays crisp
 * instead of turning into a soft 850px smear. The blurred backdrop is what makes
 * the leftover space look intentional rather than like letterboxing; for an icon
 * on white it is white, so the seam is invisible.
 */
export default function ServiceArtwork({ src, alt, lazy = true }: ServiceArtworkProps) {
  return (
    <div className="service-art">
      <div
        aria-hidden
        className="service-art__backdrop"
        style={{ backgroundImage: `url('${src}')` }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="service-art__img"
        src={src}
        alt={alt}
        loading={lazy ? "lazy" : "eager"}
      />
    </div>
  );
}

// Static-asset module declarations (*.png, *.jpg, *.svg, …) for next/image
// static imports (e.g. `import valleSad from "@/public/images/valle_chibi_sad.png"`).
//
// Next generates the same reference inside next-env.d.ts, but that file is
// gitignored — so on a COLD checkout (the CI verify job, a fresh clone) these
// declarations don't exist and `tsc --noEmit` fails with TS2307 ("…or its
// corresponding type declarations") on every static image import. That blocked
// the deploy of the rebranding merge (2026-08-02, run 30721770314; the image
// files themselves were present — only the declarations were missing). This
// tracked file makes the declarations checkout-independent. tsconfig's
// `**/*.ts` include picks it up.
/// <reference types="next/image-types/global" />

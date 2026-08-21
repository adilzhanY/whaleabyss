#!/usr/bin/env node
/**
 * Shoot the README screenshots from the live site. From the repo root:
 *
 *     node scripts/readme/snap.mjs            # all shots
 *     node scripts/readme/snap.mjs home cart  # just these
 *
 * Writes docs/shots/<name>.png. Rebuild the artwork afterwards with
 * scripts/readme/build-shots.py. Needs a Chromium-family browser on PATH
 * (brave, chromium or google-chrome-stable) and Node 22+ (native WebSocket).
 *
 * Every page is staged before the shutter:
 *  - cookie consent is pre-written as "declined" so the banner never renders
 *    and Metrika never loads (screenshot sessions must not pollute Webvisor);
 *  - the cart shot seeds zustand's persisted "cart-storage" with REAL services
 *    (slug, title, price, S3 artwork all come from the production catalogue),
 *    so the page renders exactly what a customer with that cart would see.
 *
 * The browser runs headless with a throwaway profile and is driven over the
 * DevTools protocol directly - no automation framework, one dependency: none.
 */
import { execSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(REPO, "docs", "shots");
const BASE = process.env.SNAP_BASE_URL || "https://whaleabyss.ru";

const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 3, mobile: true };

// The consent literal must match components/CookieConsent.tsx (declined:VERSION).
const CONSENT = `try{localStorage.setItem("wa-cookie-consent","declined:1")}catch{}`;

// Real production services for the staged cart. If one of these is renamed or
// repriced, refresh the row from the DB - the cart page renders these fields
// verbatim, and the README must not show prices the site doesn't charge.
const CART_ITEMS = [
  {
    id: "bezdna-11-12-etazhi-38",
    title: "БЕЗДНА 11-12 ЭТАЖИ",
    subtitle: "Бездна 11-12 этажи",
    price: 400,
    quantity: 1,
    image: "https://storage.yandexcloud.net/whaleabyss-bucket/services/bezdna-11-12-etazhi_b7d5b37671911916.jpg",
  },
  {
    id: "natlan-100-19",
    title: "НАТЛАН 100%",
    subtitle: "Натлан 100%",
    price: 6300,
    quantity: 1,
    image: "https://storage.yandexcloud.net/whaleabyss-bucket/services/natlan-100_36e85ac55e6daf1c.jpg",
    addonChoice: "completed",
  },
];
const CART_SEED = `try{localStorage.setItem("cart-storage",${JSON.stringify(
  JSON.stringify({ state: { items: CART_ITEMS }, version: 0 })
)})}catch{}`;

// name -> { path, viewport, seeds, settle } . settle: ms after load for
// images, fonts and enter-animations to finish before the shutter.
const SHOTS = {
  home: { path: "/", viewport: DESKTOP, settle: 3500 },
  services: { path: "/services", viewport: DESKTOP, settle: 3500 },
  service: { path: "/service/natlan-100-19", viewport: DESKTOP, settle: 3500 },
  cart: { path: "/cart", viewport: DESKTOP, seeds: [CART_SEED], settle: 3500 },
  reviews: { path: "/reviews", viewport: DESKTOP, settle: 3500 },
  "service-mobile": { path: "/service/natlan-100-19", viewport: PHONE, settle: 3500 },
};

function findBrowser() {
  for (const bin of ["brave", "chromium", "google-chrome-stable", "chrome"]) {
    try {
      execSync(`command -v ${bin}`, { stdio: "ignore" });
      return bin;
    } catch {}
  }
  throw new Error("no Chromium-family browser found on PATH");
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners) fn(msg);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
  once(method, sessionId) {
    return new Promise((resolve) => {
      const fn = (msg) => {
        if (msg.method === method && msg.sessionId === sessionId) {
          this.listeners.splice(this.listeners.indexOf(fn), 1);
          resolve(msg.params);
        }
      };
      this.listeners.push(fn);
    });
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SHOTS);
  for (const n of names) if (!SHOTS[n]) throw new Error(`unknown shot "${n}" (have: ${Object.keys(SHOTS).join(", ")})`);
  mkdirSync(OUT, { recursive: true });

  const profile = mkdtempSync(join(tmpdir(), "wa-snap-"));
  const port = 9345;
  const browser = spawn(
    findBrowser(),
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--hide-scrollbars",
      "--disable-gpu",
      "--force-color-profile=srgb",
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  try {
    // Wait for the DevTools endpoint to come up.
    let wsUrl;
    for (let i = 0; i < 50 && !wsUrl; i++) {
      await sleep(200);
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/version`);
        wsUrl = (await res.json()).webSocketDebuggerUrl;
      } catch {}
    }
    if (!wsUrl) throw new Error("browser DevTools endpoint never came up");

    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      ws.addEventListener("open", res);
      ws.addEventListener("error", rej);
    });
    const cdp = new Cdp(ws);

    for (const name of names) {
      const shot = SHOTS[name];
      const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
      const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });

      await cdp.send("Page.enable", {}, sessionId);
      await cdp.send("Emulation.setDeviceMetricsOverride", shot.viewport, sessionId);
      if (shot.viewport.mobile) {
        await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true }, sessionId);
      }
      for (const seed of [CONSENT, ...(shot.seeds || [])]) {
        await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: seed }, sessionId);
      }

      const loaded = cdp.once("Page.loadEventFired", sessionId);
      await cdp.send("Page.navigate", { url: BASE + shot.path }, sessionId);
      await loaded;
      await sleep(shot.settle);

      const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
      const file = join(OUT, `${name}.png`);
      writeFileSync(file, Buffer.from(data, "base64"));
      console.log(`${name}.png  ${shot.viewport.width * shot.viewport.deviceScaleFactor}x${shot.viewport.height * shot.viewport.deviceScaleFactor}`);

      await cdp.send("Target.closeTarget", { targetId });
    }
    ws.close();
  } finally {
    browser.kill();
    // The browser flushes its profile on exit; give it a beat, then retry.
    await sleep(700);
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

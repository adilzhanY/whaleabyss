"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "@gravity-ui/icons";
import { Switch } from "@heroui/react";

export const SITE_THEME_KEY = "whaleabyss:site:theme";

/** Fired on toggle so every mounted instance (desktop navbar + mobile drawer
 *  are both in the DOM, responsive-hidden) stays in sync. */
const SYNC_EVENT = "wa-site-theme";

/**
 * Public-site light/dark switcher — same mechanism as the admin ThemeSwitch,
 * but independent of it: its own localStorage key and a `site-dark` class on
 * <html>. The theme itself is pure CSS (see the public dark block in
 * globals.css, scoped to `html.site-dark … :has(#site-header)`), so toggling
 * costs one classList mutation — no React tree re-render. The saved choice is
 * applied pre-paint by the inline script in app/layout.tsx.
 */
export default function SiteThemeSwitch() {
  // Render a stable (unselected) switch on the server; sync after mount to
  // avoid a hydration mismatch with the pre-paint script's class.
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("site-dark"));
    setMounted(true);
    const onSync = (e: Event) => setDark((e as CustomEvent<boolean>).detail);
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);

  const toggle = (selected: boolean) => {
    setDark(selected);
    document.documentElement.classList.toggle("site-dark", selected);
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: selected }));
    try {
      localStorage.setItem(SITE_THEME_KEY, selected ? "dark" : "light");
    } catch {
      /* storage unavailable (private mode) — theme still applies for the session */
    }
  };

  return (
    <Switch
      isSelected={mounted ? dark : false}
      onChange={toggle}
      aria-label="Тёмная тема"
      size="lg"
    >
      {({ isSelected }) => (
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb>
              <Switch.Icon>
                {isSelected ? (
                  <Sun className="size-3 text-inherit opacity-100" />
                ) : (
                  <Moon className="size-3 text-inherit opacity-70" />
                )}
              </Switch.Icon>
            </Switch.Thumb>
          </Switch.Control>
        </Switch.Content>
      )}
    </Switch>
  );
}

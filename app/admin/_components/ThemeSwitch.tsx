"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "@gravity-ui/icons";
import { Switch } from "@heroui/react";

export const ADMIN_THEME_KEY = "whaleabyss:admin:theme";

/**
 * Admin-only light/dark switcher. The theme itself is pure CSS: an
 * `admin-dark` class on #admin-root (see the block in globals.css), so
 * toggling costs one classList mutation — no React tree re-render.
 * The saved choice is applied pre-paint by the inline script in
 * app/admin/layout.tsx, so this component only has to stay in sync.
 */
export default function ThemeSwitch() {
  // Render a stable (unselected) switch on the server; sync after mount to
  // avoid a hydration mismatch with the pre-paint script's class.
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.getElementById("admin-root")?.classList.contains("admin-dark") ?? false);
    setMounted(true);
  }, []);

  const toggle = (selected: boolean) => {
    setDark(selected);
    document.getElementById("admin-root")?.classList.toggle("admin-dark", selected);
    try {
      localStorage.setItem(ADMIN_THEME_KEY, selected ? "dark" : "light");
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

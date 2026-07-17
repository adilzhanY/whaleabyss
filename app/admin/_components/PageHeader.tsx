"use client";

import { useEffect } from "react";
import { create } from "zustand";

interface AdminHeaderState {
  title: string | null;
  subtitle: React.ReactNode | null;
  /** Page-specific action buttons rendered on the right side of the top bar. */
  actions: React.ReactNode | null;
}

// Read by AdminShell's top bar; written by <PageHeader /> below.
export const useAdminHeader = create<AdminHeaderState>(() => ({
  title: null,
  subtitle: null,
  actions: null,
}));

/**
 * Renders nothing — pushes the page's title/subtitle/actions into the admin
 * top bar. Static titles come from the pathname map in AdminShell; use this
 * for dynamic titles (order number, booster name), subtitles (counts) and
 * per-page action buttons.
 */
export default function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title?: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  useEffect(() => {
    useAdminHeader.setState({
      title: title ?? null,
      subtitle: subtitle ?? null,
      actions: actions ?? null,
    });
    return () => {
      // Clear only if another page hasn't already claimed the header.
      const s = useAdminHeader.getState();
      if (
        s.title === (title ?? null) &&
        s.subtitle === (subtitle ?? null) &&
        s.actions === (actions ?? null)
      ) {
        useAdminHeader.setState({ title: null, subtitle: null, actions: null });
      }
    };
  }, [title, subtitle, actions]);

  return null;
}

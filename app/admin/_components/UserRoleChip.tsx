"use client";

import { Chip } from "@heroui/react";

/** Russian labels for `users.role` — the one place they are spelled out. */
export const USER_ROLE_LABELS: Record<string, string> = {
  user: "Пользователь",
  admin: "Администратор",
  booster: "Бустер",
};

/**
 * The palette has no brand-blue chip, so the ordinary case stays neutral and
 * only the privileged roles get a colour: they are rare and worth spotting.
 */
const ROLE_CHIP: Record<
  string,
  {
    color: React.ComponentProps<typeof Chip>["color"];
    variant: React.ComponentProps<typeof Chip>["variant"];
  }
> = {
  user: { color: "default", variant: "secondary" },
  admin: { color: "danger", variant: "soft" },
  booster: { color: "success", variant: "soft" },
};

/**
 * Role pill shared by the users list and the user card. Lives here so the two
 * can't drift apart again — the list used to hand-roll its own `<span>` with a
 * different palette (blue/purple/green with borders) than the card.
 */
export default function UserRoleChip({
  role,
  className = "",
}: {
  role: string | null | undefined;
  className?: string;
}) {
  const key = role ?? "user";
  const chip = ROLE_CHIP[key] ?? ROLE_CHIP.user;
  return (
    <Chip
      size="sm"
      color={chip.color}
      variant={chip.variant}
      className={`text-[11px] font-bold ${className}`}
    >
      <Chip.Label>{USER_ROLE_LABELS[key] ?? key}</Chip.Label>
    </Chip>
  );
}

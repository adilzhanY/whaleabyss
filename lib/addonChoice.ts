/**
 * The client's declaration about the gating quests of an exploration service,
 * made in QuestAddonModal and carried cart → cart_items → order_items.
 *
 *  'completed' — «Задания уже выполнены»
 *  'self'      — «Пройду их сам»
 *  'quests'    — the client ticked quests in the modal, so they are ordered as
 *                separate lines alongside the parent.
 *
 * `'quests'` exists so that "I'm buying the quests" is a POSITIVE declaration.
 * It used to be encoded only as the presence of sibling quest lines, which meant
 * deleting those lines in the cart silently reverted the parent to an
 * indistinguishable "no declaration" state and the booster had no idea what the
 * client wanted. See `assertAddonChoicesDeclared` for the server-side gate.
 *
 * NULL/undefined is still a valid stored value (services with no linked quests,
 * and pre-existing rows written before 'quests' was introduced).
 */
export type AddonChoice = 'completed' | 'self' | 'quests';

/** Whitelist guard — never trust a client-supplied string. */
export function isAddonChoice(value: unknown): value is AddonChoice {
  return value === 'completed' || value === 'self' || value === 'quests';
}

/** Short label for the customer-facing cart (drawer + /cart). */
export const ADDON_CHOICE_CART_LABEL: Record<AddonChoice, string> = {
  completed: 'Задания уже выполнены',
  self: 'Задания пройду сам',
  quests: 'Задания куплены отдельно',
};

/** Label for the admin order detail page. */
export const ADDON_CHOICE_ADMIN_LABEL: Record<AddonChoice, string> = {
  completed: 'Клиент: задания региона уже выполнены',
  self: 'Клиент: пройдёт задания сам',
  quests: 'Клиент: покупает задания отдельными позициями',
};

/** Label for the Telegram admin notification (prefixed with ⚠️ by the caller). */
export const ADDON_CHOICE_TELEGRAM_LABEL: Record<AddonChoice, string> = {
  completed: 'Клиент: задания региона уже выполнены',
  self: 'Клиент: пройдёт задания сам',
  quests: 'Клиент: заказал задания отдельными позициями',
};

/** Tailwind text colour per choice, shared by the cart and admin badges. */
export const ADDON_CHOICE_TEXT_CLASS: Record<AddonChoice, string> = {
  completed: 'text-green-600',
  self: 'text-amber-600',
  quests: 'text-[#0B5191]',
};

/**
 * THE invariant: is this line a quest-gated service the client never declared?
 *
 * Single source of truth, shared by the `/api/checkout` gate (which rejects) and
 * the Freekassa-notify Telegram detector (which warns about orders created
 * before that gate existed). Keeping one implementation is the point — two
 * copies of this rule would drift and the warning would stop matching the gate.
 *
 * A gated line is fine when the client said «уже выполнены»/«пройду сам», or
 * when they said 'quests' AND those quests are actually in the order. 'quests'
 * with the quest lines deleted afterwards is NOT a declaration — that is exactly
 * the shape that produced orders f216229e (2026-07-12) and 96162b2e (2026-07-25).
 * A missing declaration with quest lines present is tolerated, so carts written
 * before 'quests' existed still check out.
 *
 * @param linkedAddonServiceIds  quest services linked to this line's service
 *                               (non-test only), or undefined when not gated
 * @param choice                 the line's stored/claimed declaration
 * @param orderedServiceIds      service ids present in the same cart/order
 */
export function isQuestGatedAndUndeclared(
  linkedAddonServiceIds: string[] | undefined,
  choice: string | null | undefined,
  orderedServiceIds: ReadonlySet<string>
): boolean {
  if (!linkedAddonServiceIds || linkedAddonServiceIds.length === 0) return false;
  if (choice === 'completed' || choice === 'self') return false;
  return !linkedAddonServiceIds.some((id) => orderedServiceIds.has(id));
}

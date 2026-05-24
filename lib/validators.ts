import { z } from "zod";

/**
 * Shared input constraints. Used both for live sanitization on text inputs
 * (via <Input sanitize={...} />) and for Zod-based validation at submit time.
 */

/** ASCII only: blocks Cyrillic and other non-Latin scripts, keeps Latin
 * letters, digits and punctuation/symbols so usernames/passwords type freely. */
const ASCII_ONLY = /^[\x00-\x7F]*$/;

/** Strip every non-ASCII character (live sanitizer for password/login fields). */
export const stripNonLatin = (value: string): string =>
  value.replace(/[^\x00-\x7F]/g, "");

/** Keep a single leading "@" and only ASCII after it (Telegram usernames). */
export const sanitizeTelegram = (value: string): string =>
  `@${stripNonLatin(value).replace(/@/g, "")}`;

/** Uppercase + alphanumeric/dash only (promo codes). */
export const sanitizePromocode = (value: string): string =>
  value.toUpperCase().replace(/[^A-Z0-9-]/g, "");

// ---- Zod schemas (submit-time validation) -------------------------------

export const passwordSchema = z
  .string()
  .min(6, "Пароль должен содержать минимум 6 символов")
  .regex(ASCII_ONLY, "Пароль может содержать только латиницу, цифры и символы");

export const emailSchema = z.email("Некорректный email");

export const usernameSchema = z
  .string()
  .min(2, "Имя должно быть не короче 2 символов")
  .regex(ASCII_ONLY, "Имя пользователя может содержать только латиницу и цифры");

/** Returns the first Zod error message, or null when the value is valid. */
export function firstError(
  schema: z.ZodType<unknown>,
  value: unknown
): string | null {
  const result = schema.safeParse(value);
  return result.success ? null : result.error.issues[0]?.message ?? "Ошибка";
}

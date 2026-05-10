/**
 * Event detection utility for monthly discount events
 * Theatre Event: 1st of month 6AM Moscow - 2nd of month 6AM Moscow (24 hours)
 * Abyss Event: 16th of month 6AM Moscow - 17th of month 6AM Moscow (24 hours)
 */

export type EventType = "theatre" | "abyss" | null;

export interface ActiveEvent {
  type: EventType;
  endsAt: Date;
  discountPercent: number;
}

// 🔧 TOGGLE THIS FOR TESTING
const FORCE_SHOW_EVENT: EventType = "theatre"; // Set to "theatre", "abyss", or null to disable
// 🔧 END TOGGLE

/**
 * Get current active event based on Moscow time
 */
export function getActiveEvent(): ActiveEvent | null {
  // 🔧 TESTING MODE: Force show event
  if (FORCE_SHOW_EVENT) {
    const now = new Date();
    const endsAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Ends in 2 hours for testing

    return {
      type: FORCE_SHOW_EVENT,
      endsAt,
      discountPercent: 15,
    };
  }
  // 🔧 END TESTING MODE

  // Get current time in Moscow timezone (UTC+3)
  const now = new Date();
  const moscowTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));

  const day = moscowTime.getDate();
  const hour = moscowTime.getHours();
  const month = moscowTime.getMonth();
  const year = moscowTime.getFullYear();

  // Theatre Event: 1st day 6AM - 2nd day 6AM
  if ((day === 1 && hour >= 6) || (day === 2 && hour < 6)) {
    const endsAt = new Date(year, month, 2, 6, 0, 0); // 2nd day at 6AM Moscow
    const endsAtUTC = new Date(endsAt.toLocaleString("en-US", { timeZone: "UTC" }));

    return {
      type: "theatre",
      endsAt: endsAtUTC,
      discountPercent: 15,
    };
  }

  // Abyss Event: 16th day 6AM - 17th day 6AM
  if ((day === 16 && hour >= 6) || (day === 17 && hour < 6)) {
    const endsAt = new Date(year, month, 17, 6, 0, 0); // 17th day at 6AM Moscow
    const endsAtUTC = new Date(endsAt.toLocaleString("en-US", { timeZone: "UTC" }));

    return {
      type: "abyss",
      endsAt: endsAtUTC,
      discountPercent: 15,
    };
  }

  return null;
}

/**
 * Check if a specific service category is on discount
 */
export function isCategoryOnDiscount(categorySlug: string): boolean {
  const event = getActiveEvent();
  if (!event) return false;

  if (event.type === "theatre" && categorySlug === "theatre") return true;
  if (event.type === "abyss" && categorySlug === "abyss") return true;

  return false;
}

/**
 * Calculate discounted price
 */
export function calculateDiscountedPrice(originalPrice: number, discountPercent: number): number {
  return originalPrice * (1 - discountPercent / 100);
}

/**
 * Реквизиты и константы для юридических документов (публичная оферта,
 * политика конфиденциальности, правила оплаты) и Footer'а.
 *
 * Источник истины. Меняешь здесь — документы и футер обновляются автоматически.
 *
 * Если PHONE === "", контактный телефон НЕ показывается на сайте
 * (закон этого не требует, достаточно email + мессенджера).
 */

export const LEGAL = {
  // ---------------- Текущая правовая форма ----------------
  /**
   * "self_employed"           — НПД (применялось до 29.04.2026)
   * "individual_entrepreneur" — действующая форма с 29.04.2026, УСН 6%
   *
   * От значения этой константы зависят формулировки в публичной оферте
   * и политике конфиденциальности (`getPartyLabel`, `getPartyShortLabel`).
   */
  CURRENT_LEGAL_FORM: "individual_entrepreneur" as
    | "self_employed"
    | "individual_entrepreneur",

  // ---------------- Персональные данные ----------------
  FULL_NAME_GENITIVE: "Гуровой Майи Павловны", // в родительном падеже
  FULL_NAME_NOMINATIVE: "Гурова Майя Павловна", // в именительном падеже
  FULL_NAME_SHORT: "Гурова М.П.",

  // 12-значный ИНН физлица (он же — ИНН ИП, остаётся неизменным).
  INN: "230412509070",

  // ОГРНИП — 15 цифр, начинается на 3.
  OGRNIP: "326237500198710",
  OGRNIP_DATE: "29.04.2026",

  // Адрес.
  // Для ИП — адрес места жительства из ЕГРИП (берётся из паспорта на момент
  // регистрации). Публикуется открыто в выписке по ИНН на egrul.nalog.ru,
  // поэтому указывается здесь полностью — этого требует ст. 9 закона
  // «О защите прав потребителей» (идентификация продавца).
  ADDRESS: "353460, Краснодарский край, г. Геленджик, с/т Родничок, д. 8",

  // ---------------- Бизнес ----------------
  COMPANY_NAME: "Whale Abyss",
  DOMAIN: "whaleabyss.ru",
  DOMAIN_URL: "https://whaleabyss.ru",

  EMAIL: "support@whaleabyss.ru",

  // Телефон. Если не нужен — оставить пустую строку, и он автоматически
  // исчезнет со всех страниц сайта.
  PHONE: "",
  PHONE_TEL: "",

  // Telegram для личной связи с поддержкой (используется на страницах
  // «Контакты» и «Правила оплаты»). Публичный Telegram-канал (@whaleabyss)
  // зашит отдельно в Footer/Header и в FAQ — это разные сущности.
  TELEGRAM_HANDLE: "@whaleabyss_official",
  TELEGRAM_URL: "https://t.me/whaleabyss_official",

  // ---------------- Агентский договор ----------------
  /** Процент агентского вознаграждения (от стоимости заказа). */
  AGENT_COMMISSION_PERCENT: 10,

  /** Срок исполнения заказа в часах (указывается в оферте как ориентир). */
  ORDER_EXECUTION_HOURS: 72,

  /** Время на оплату после создания заказа (часов). */
  PAYMENT_TIMEOUT_HOURS: 2,

  /** Срок возврата денежных средств (рабочих дней). */
  REFUND_DAYS: 10,

  /** Срок для претензий по отчёту агента (календарных дней). */
  REPORT_DISPUTE_DAYS: 3,

  // ---------------- Даты редакций ----------------
  OFFER_VERSION_DATE: "29 апреля 2026 года",
  PRIVACY_VERSION_DATE: "29 апреля 2026 года",
  PAYMENT_RULES_VERSION_DATE: "29 апреля 2026 года",
} as const;

/**
 * Полная форма идентификации стороны (для основного текста оферты).
 */
export function getPartyLabel(): string {
  if (LEGAL.CURRENT_LEGAL_FORM === "individual_entrepreneur") {
    return `Индивидуальный предприниматель ${LEGAL.FULL_NAME_NOMINATIVE}`;
  }
  return `Самозанятая ${LEGAL.FULL_NAME_NOMINATIVE}`;
}

/**
 * Короткая форма идентификации для Footer'а и заголовков.
 */
export function getPartyShortLabel(): string {
  if (LEGAL.CURRENT_LEGAL_FORM === "individual_entrepreneur") {
    return `ИП ${LEGAL.FULL_NAME_NOMINATIVE}`;
  }
  return `Самозанятая ${LEGAL.FULL_NAME_NOMINATIVE}`;
}

/**
 * Склонение слова «час» по числу (1 час, 2 часа, 5 часов, 21 час, …).
 */
export function pluralizeHours(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return "часов";
  if (mod10 === 1) return "час";
  if (mod10 >= 2 && mod10 <= 4) return "часа";
  return "часов";
}

/**
 * Склонение слова «день» по числу (1 день, 2 дня, 5 дней, …).
 */
export function pluralizeDays(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return "дней";
  if (mod10 === 1) return "день";
  if (mod10 >= 2 && mod10 <= 4) return "дня";
  return "дней";
}

/**
 * Полные реквизиты для оферты, политики и контактов.
 * Пропускает поля-плейсхолдеры (значение начинается на «<») и пустые строки.
 */
export function getFullRequisites(): string[] {
  const lines: string[] = [getPartyLabel()];
  if (LEGAL.ADDRESS && !LEGAL.ADDRESS.startsWith("<")) {
    lines.push(`Адрес: ${LEGAL.ADDRESS}`);
  }
  lines.push(`ИНН: ${LEGAL.INN}`);
  if (
    LEGAL.CURRENT_LEGAL_FORM === "individual_entrepreneur" &&
    LEGAL.OGRNIP &&
    !LEGAL.OGRNIP.startsWith("<")
  ) {
    lines.push(
      `ОГРНИП: ${LEGAL.OGRNIP}${
        LEGAL.OGRNIP_DATE && !LEGAL.OGRNIP_DATE.startsWith("<")
          ? ` от ${LEGAL.OGRNIP_DATE}`
          : ""
      }`,
    );
  }
  lines.push(`Email: ${LEGAL.EMAIL}`);
  if (LEGAL.PHONE) {
    lines.push(`Телефон: ${LEGAL.PHONE}`);
  }
  return lines;
}

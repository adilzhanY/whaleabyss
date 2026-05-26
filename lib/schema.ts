import { pgTable, uuid, varchar, timestamp, pgEnum, decimal, text, integer, boolean } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'booster']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').default('user'),
  avatarUrl: varchar('avatar_url', { length: 255 }),
  telegramUsername: varchar('telegram_username', { length: 255 }),
  gameUsername: varchar('game_username', { length: 255 }),
  receiptEmail: varchar('receipt_email', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const otps = pgTable('otps', {
  email: varchar('email', { length: 255 }).primaryKey(),
  code: varchar('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  email: varchar('email', { length: 255 }).primaryKey(),
  token: varchar('token', { length: 64 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: varchar('description'),
  order: integer('order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  subtitle: varchar('subtitle', { length: 255 }),
  description: varchar('description'),
  price: varchar('price', { length: 20 }).notNull(), // Decimal stored as string
  imageUrl: varchar('image_url', { length: 255 }),
  isTestService: boolean('is_test_service').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'in_progress', 'completed', 'cancelled', 'refunded']);

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  // Assigned booster (качер). Nullable — set via "Назначить" in /admin/orders.
  // Forward-ref to `boosters` (defined below) is safe: Drizzle calls the thunk lazily.
  boosterId: uuid('booster_id').references(() => boosters.id, { onDelete: 'set null' }),
  // Commission credited to the booster when this order was completed.
  // NULL = not yet credited; set exactly once (idempotency guard). Independent
  // of revenue accounting — the dashboard still counts full totalPrice.
  boosterEarning: decimal('booster_earning', { precision: 10, scale: 2 }),
  status: orderStatusEnum('status').default('pending'),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  paymentId: varchar('payment_id', { length: 255 }),
  // Acquiring channel chosen at checkout: 'sbp' | 'card' (nullable for legacy rows).
  paymentMethod: varchar('payment_method', { length: 20 }),
  // True for orders created via the admin testing flow (new SBP/card payment test).
  isTestPayment: boolean('is_test_payment').default(false),
  userNotes: text('user_notes'),
  promocode: varchar('promocode', { length: 10 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').references(() => services.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').default(1),
  priceAtPurchase: decimal('price_at_purchase', { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const promocodes = pgTable('promocodes', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 10 }).notNull().unique(),
  discountPercent: integer('discount_percent').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const promocodeUsage = pgTable('promocode_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  promocodeId: uuid('promocode_id').references(() => promocodes.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }),
  usedAt: timestamp('used_at', { withTimezone: true }).defaultNow(),
});

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  discountPercent: integer('discount_percent').notNull(),
  backgroundUrl: varchar('background_url', { length: 255 }),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const eventServices = pgTable('event_services', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  serviceId: uuid('service_id').references(() => services.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const reviewStatusEnum = pgEnum('review_status', ['pending', 'approved', 'rejected']);

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  rating: decimal('rating', { precision: 2, scale: 1 }).notNull(), // 0.5, 1.0, 1.5, ..., 5.0
  description: text('description').notNull(),
  status: reviewStatusEnum('status').default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const cartItems = pgTable('cart_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  serviceId: uuid('service_id').references(() => services.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const boosterStatusEnum = pgEnum('booster_status', ['active', 'inactive']);

// Manually-managed roster of boosters (качеры). No login/registration — admins
// add and edit these rows directly from /admin/boosters. Payout fields exist
// because each finished order splits revenue (booster commission vs. house);
// `balance` accumulates the booster's unpaid earnings, paid out off-platform.
export const boosters = pgTable('boosters', {
  id: uuid('id').defaultRandom().primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  birthDate: timestamp('birth_date', { withTimezone: true }),
  telegramUsername: varchar('telegram_username', { length: 255 }),
  // Самозанятый: ИНН нужен для легального чека/выплаты через «Мой налог».
  inn: varchar('inn', { length: 12 }),
  // Куда платить: номер карты или телефон для СБП (свободная строка).
  payoutDetails: varchar('payout_details', { length: 255 }),
  // Доля качера от заказа в процентах (остальное — проекту). По умолчанию 40%.
  commissionPercent: integer('commission_percent').notNull().default(40),
  // Накопленный, ещё не выплаченный заработок. Decimal хранится как строка.
  balance: decimal('balance', { precision: 10, scale: 2 }).notNull().default('0'),
  status: boosterStatusEnum('status').notNull().default('active'),
  note: text('note'),
  startDate: timestamp('start_date', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
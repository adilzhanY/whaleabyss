# Database Rules & Guidelines for AI

This document explains how to work with the database in the Whale Abyss project. Follow these rules when making any database-related changes.

## Database Setup

- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Connection**: Via `pg` (node-postgres) Pool
- **Schema Location**: `./lib/schema.ts`
- **Database Client**: `./lib/db.ts`

## Database Connection

The database connection is configured in `./lib/db.ts`:

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL?.split(' ')[0]?.replace(/"/g, ''),
});

export const db = drizzle(pool, { schema });
```

**Important**: The `DATABASE_URL` is stored in `.env` file and may have quotes that need to be stripped.

## Schema Definition (`./lib/schema.ts`)

### Import Required Types

Always import the necessary column types from `drizzle-orm/pg-core`:

```typescript
import { pgTable, uuid, varchar, timestamp, pgEnum, decimal, text, integer, boolean } from 'drizzle-orm/pg-core';
```

### Common Column Types

- **UUID**: `uuid('column_name').defaultRandom().primaryKey()`
- **String**: `varchar('column_name', { length: 255 })`
- **Text**: `text('column_name')` (unlimited length)
- **Number**: `integer('column_name')` or `decimal('column_name', { precision: 10, scale: 2 })`
- **Boolean**: `boolean('column_name').default(false)`
- **Timestamp**: `timestamp('column_name', { withTimezone: true }).defaultNow()`
- **Enum**: Define with `pgEnum('enum_name', ['value1', 'value2'])` before using

### Column Modifiers

- `.notNull()` - Column cannot be null
- `.unique()` - Column must have unique values
- `.default(value)` - Default value for column
- `.primaryKey()` - Mark as primary key
- `.references(() => otherTable.id, { onDelete: 'cascade' })` - Foreign key

### Naming Conventions

- **Table names**: lowercase with underscores (e.g., `order_items`)
- **Column names in schema**: camelCase (e.g., `createdAt`)
- **Column names in DB**: snake_case (e.g., `created_at`)
- Drizzle automatically converts between camelCase and snake_case

### Example Table Definition

```typescript
export const services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  subtitle: varchar('subtitle', { length: 255 }),
  description: varchar('description'),
  price: varchar('price', { length: 20 }).notNull(),
  imageUrl: varchar('image_url', { length: 255 }),
  isTestService: boolean('is_test_service').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

## Making Schema Changes

### Step 1: Update `./lib/schema.ts`

1. Add the new column to the appropriate table definition
2. Make sure to import any new column types needed
3. Use appropriate defaults and constraints

### Step 2: Create a Migration Script

Create a new `.mjs` file in the root directory (e.g., `add_new_column.mjs`):

```javascript
import "dotenv/config";
import pg from "pg";

const { Client } = pg;

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Ошибка: Не найдена переменная DATABASE_URL в файле .env");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL.replace(/"/g, ''),
  });

  try {
    console.log("Подключение к базе данных...");
    await client.connect();
    console.log("✅ Подключено успешно.");

    console.log("Выполняем миграцию...");
    await client.query(`
      ALTER TABLE table_name
      ADD COLUMN IF NOT EXISTS column_name TYPE DEFAULT value;
    `);

    console.log("✅ Миграция успешно выполнена!");
  } catch (error) {
    console.error("❌ Ошибка при выполнении миграции:");
    console.error(error);
  } finally {
    await client.end();
    console.log("Соединение с базой данных закрыто.");
  }
}

runMigration();
```

### Step 3: Run the Migration

```bash
node add_new_column.mjs
```

### Step 4: Clean Up

After successful migration, delete the migration script:

```bash
rm add_new_column.mjs
```

### Step 5: Rebuild the Project

TypeScript types are cached, so rebuild to pick up schema changes:

```bash
npm run build
```

## Querying the Database

### Import Required Functions

```typescript
import { db } from '@/lib/db';
import { services, categories } from '@/lib/schema';
import { eq, and, or, desc, asc } from 'drizzle-orm';
```

### Basic Queries

**Select all:**
```typescript
const allServices = await db.select().from(services);
```

**Select with where:**
```typescript
const testServices = await db
  .select()
  .from(services)
  .where(eq(services.isTestService, true));
```

**Select specific columns:**
```typescript
const serviceNames = await db
  .select({ id: services.id, title: services.title })
  .from(services);
```

**Select with join:**
```typescript
const servicesWithCategories = await db
  .select({
    id: services.id,
    title: services.title,
    category: categories.title,
  })
  .from(services)
  .leftJoin(categories, eq(services.categoryId, categories.id));
```

**Select with multiple conditions:**
```typescript
const results = await db
  .select()
  .from(services)
  .where(
    and(
      eq(services.isTestService, false),
      eq(services.categoryId, categoryId)
    )
  );
```

**Select with ordering:**
```typescript
const sorted = await db
  .select()
  .from(services)
  .orderBy(desc(services.createdAt));
```

**Select with limit:**
```typescript
const first10 = await db
  .select()
  .from(services)
  .limit(10);
```

### Insert

```typescript
const [created] = await db
  .insert(services)
  .values({
    slug: 'test-service',
    title: 'Test Service',
    subtitle: 'Test',
    description: 'Description',
    price: '10',
    imageUrl: null,
    categoryId: null,
    isTestService: true,
  })
  .returning();
```

### Update

```typescript
const [updated] = await db
  .update(services)
  .set({ 
    title: 'New Title',
    updatedAt: new Date(),
  })
  .where(eq(services.id, serviceId))
  .returning();
```

### Delete

```typescript
await db
  .delete(services)
  .where(eq(services.id, serviceId));
```

## Common Patterns

### Check if Record Exists

```typescript
const existing = await db
  .select({ id: services.id })
  .from(services)
  .where(eq(services.slug, slug))
  .limit(1);

if (existing.length > 0) {
  // Record exists
}
```

### Filtering Out Test Data from Public Views

When fetching data for public pages, always filter out test services:

```typescript
const publicServices = await db
  .select()
  .from(services)
  .where(eq(services.isTestService, false));
```

### Using Cache for Expensive Queries

For queries used in Server Components that are expensive, use React's `cache`:

```typescript
import { cache } from 'react';

export const getServiceCategories = cache(async () => {
  const allCategories = await db.select().from(categories);
  const allServices = await db
    .select()
    .from(services)
    .where(eq(services.isTestService, false));
  
  // Process and return data
  return processedData;
});
```

## Important Notes

1. **Always use `IF NOT EXISTS`** when adding columns in migrations to make them idempotent
2. **Always strip quotes** from `DATABASE_URL` when using it: `.replace(/"/g, '')`
3. **TypeScript types are cached** - rebuild the project after schema changes
4. **Use `.returning()`** on insert/update to get the created/updated record
5. **Foreign keys cascade** - be careful with `onDelete: 'cascade'`
6. **Price is stored as string** - convert to number when displaying: `Number(service.price)`
7. **Always use `eq()` for equality** - don't use `===` in where clauses
8. **Import operators from drizzle-orm** - `eq`, `and`, `or`, `desc`, `asc`, etc.

## Migration History

Keep track of migrations by updating `./migrations.sql` with comments about what was added and when.

## Troubleshooting

### TypeScript Errors After Schema Changes

If you see TypeScript errors about missing properties after adding columns:

1. Rebuild the project: `npm run build`
2. Restart your IDE/TypeScript server
3. Check that the column was actually added to the database

### Connection Issues

If you get connection errors:

1. Check that PostgreSQL is running
2. Verify `DATABASE_URL` in `.env` is correct
3. Make sure the database exists
4. Check that the user has proper permissions

### Migration Fails

If a migration fails:

1. Check the error message carefully
2. Verify the SQL syntax is correct
3. Make sure the column/table doesn't already exist
4. Check for foreign key constraint violations

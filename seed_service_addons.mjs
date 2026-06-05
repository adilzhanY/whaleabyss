// Seed-скрипт: связывает услуги «Исследование регионов» с квестами-аддонами
// из категории «Задания» (таблица service_addons). Источник: SERVICE_ADDONS.md.
//
// Запуск:  node seed_service_addons.mjs
// Идемпотентен: ON CONFLICT DO NOTHING. Родители ищутся по subtitle ILIKE
// в категории locations — несматченные паттерны выводятся в конце.

import "dotenv/config";
import pg from "pg";

const { Client } = pg;

// [ILIKE-паттерн родителя в категории locations, [slug-и аддонов по порядку]]
const FONTAINE_40_41 = [
  "sledy-priliva",
  "drevnie-cveta",
  "enn-iz-narcissenkroyc",
  "cepochka-ordo",
];
const NATLAN_ALL = [
  "teni-gor",
  "pod-hrustalnoy-skaloy",
  "mezhdu-obeschaniem-i-zabveniem",
  "gotovnost-k-nepriyatnostyam",
  "zabludshiy-putnik-v-obiteli-pepla",
  "sled-bez-sleda",
  "cepochka-atokpana",
  "leto-zhara-kurort",
  "sledy-cveta",
];

const MAPPINGS = [
  ["%драконий хребет%", ["v-gorah"]],
  ["%разлом%", ["ugroza-vo-tme"]],
  ["%чэньюй%", [
    "nefritovoe-blagoslovenie",
    "rycarstvo-v-okutannoy-doline",
    "babochka-chto-letit-tiho-skvoz-dolinu",
  ]],
  ["%инадзума%", [
    "ohotniki-za-grozami-seyraya",
    "skvoz-tuman",
    "ochischenie-svyaschennoy-sakury",
    "skazaniya-iz-tatary",
    "nasledie-orobasi",
    "stoyachaya-voda-inadzuma",
  ]],
  ["%энканомия%", [
    "enkanomiya-vse-kvesty",
    "lunnaya-bezdna",
    "stoyachaya-voda-enkanomiya",
    "ot-zakata-do-rassveta-v-byakuyakoku",
    "tayna-ereba",
  ]],
  // Араньяка уже существовала на сайте — привязываем её к тропикам Сумеру.
  ["%тропики%", ["aran-yaka-100-22"]],
  ["%пустыня сумеру%", [
    "pustynya-sumeru-vse-kvesty",
    "zolotaya-strana-gryoz",
    "panihida-bilkis",
    "legendy-kamennogo-zamka",
    "dvoynoe-dokazatelstvo",
    "ohota-na-sokolov",
    "utrachennyy-apokalipsis",
  ]],
  ["%оазис сумеру%", ["hvarna-dobra-i-zla"]],
  ["%фонтейн 4.0%", FONTAINE_40_41],
  ["%фонтейн 4.1%", FONTAINE_40_41],
  ["%фонтейн 4.2%", [
    "dikaya-feya-eriniy",
    "po-sledam-narcissa",
    "cepochka-ordo",
  ]],
  ["%фонтейн 4.6%", ["ody-garmonii"]],
  ["%фонтейн 100%", [
    "narcissenkroyc-vsya-saga",
    ...FONTAINE_40_41,
    "dikaya-feya-eriniy",
    "po-sledam-narcissa",
    "ody-garmonii",
  ]],
  ["%натлан 5.0%", [
    "teni-gor",
    "pod-hrustalnoy-skaloy",
    "mezhdu-obeschaniem-i-zabveniem",
    "gotovnost-k-nepriyatnostyam",
  ]],
  ["%натлан 5.2%", ["zabludshiy-putnik-v-obiteli-pepla", "sled-bez-sleda"]],
  ["%натлан 5.5%", ["cepochka-atokpana"]],
  ["%натлан 5.8%", ["leto-zhara-kurort", "sledy-cveta"]],
  ["%натлан 100%", NATLAN_ALL],
  ["%нод-край 6.0%", [
    "k-vostoku-ot-luny-na-zapad-ot-solnca",
    "polka-pod-lunoy",
    "cepochka-kamnya-vrat",
    "cveta-pustoty",
  ]],
  ["%нод-край 6.3%", ["severnaya-cepochka-nod-kraya"]],
  // Мондштадт 6.5 / Храм Пространства («Асмодей»)
  ["%асмодей%", ["veter-stih"]],
  ["%мондштадт 6.5%", ["veter-stih"]],
];

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Ошибка: Не найдена переменная DATABASE_URL в файле .env");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL.split(" ")[0].replace(/"/g, ""),
    connectionTimeoutMillis: 15000,
  });

  try {
    console.log("Подключение к базе данных...");
    await client.connect();
    console.log("✅ Подключено успешно.");

    // Все услуги категории «Исследование регионов».
    const parents = await client.query(`
      SELECT s.id, s.slug, s.subtitle, s.title
      FROM services s
      JOIN categories c ON s.category_id = c.id
      WHERE c.slug = 'locations' AND s.is_test_service = false
    `);

    // Все потенциальные аддоны по slug.
    const allAddonSlugs = [...new Set(MAPPINGS.flatMap(([, slugs]) => slugs))];
    const addonRows = await client.query(
      `SELECT id, slug FROM services WHERE slug = ANY($1)`,
      [allAddonSlugs]
    );
    const addonBySlug = new Map(addonRows.rows.map((r) => [r.slug, r.id]));

    const missingAddons = allAddonSlugs.filter((s) => !addonBySlug.has(s));
    if (missingAddons.length > 0) {
      console.warn("⚠️ Не найдены услуги-аддоны (slug):", missingAddons.join(", "));
    }

    let inserted = 0;
    let skipped = 0;
    const unmatchedPatterns = [];

    for (const [pattern, addonSlugs] of MAPPINGS) {
      const matched = parents.rows.filter(
        (p) =>
          (p.subtitle || "").toLowerCase().includes(pattern.replaceAll("%", "")) ||
          (p.title || "").toLowerCase().includes(pattern.replaceAll("%", ""))
      );
      if (matched.length === 0) {
        unmatchedPatterns.push(pattern);
        continue;
      }
      for (const parent of matched) {
        console.log(`\n${parent.subtitle || parent.title} (${parent.slug}):`);
        for (let i = 0; i < addonSlugs.length; i++) {
          const addonId = addonBySlug.get(addonSlugs[i]);
          if (!addonId) continue;
          const res = await client.query(
            `INSERT INTO service_addons (parent_service_id, addon_service_id, sort_order)
             VALUES ($1, $2, $3)
             ON CONFLICT ON CONSTRAINT service_addons_parent_addon_unique DO NOTHING
             RETURNING id`,
            [parent.id, addonId, i]
          );
          if (res.rows.length > 0) {
            inserted++;
            console.log(`  ✅ + ${addonSlugs[i]}`);
          } else {
            skipped++;
            console.log(`  ⏭️  ${addonSlugs[i]} — уже привязан`);
          }
        }
      }
    }

    if (unmatchedPatterns.length > 0) {
      console.warn(
        "\n⚠️ Паттерны без совпадений среди услуг locations:",
        unmatchedPatterns.join(", ")
      );
      console.warn("Услуги в категории:");
      for (const p of parents.rows) {
        console.warn(`  - ${p.subtitle || p.title} (${p.slug})`);
      }
    }

    console.log(`\n✅ Готово: связок добавлено ${inserted}, пропущено ${skipped}.`);
  } catch (error) {
    console.error("❌ Ошибка при выполнении сида:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log("Соединение с базой данных закрыто.");
  }
}

seed();

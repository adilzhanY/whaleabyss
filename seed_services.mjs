import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import pg from "pg";
import crypto from "crypto";

// Initialize S3
const s3Client = new S3Client({
  region: "ru-central1",
  endpoint: "https://storage.yandexcloud.net",
  credentials: {
    accessKeyId: process.env.YANDEX_KEY_ID,
    secretAccessKey: process.env.YANDEX_SECRET_KEY,
  },
});

const BUCKET_NAME = "whaleabyss-bucket";

// Initialize DB
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

const categoryTitles = {
  locations: "Исследование регионов",
  boost: "Сопровождение",
  missions: "Задания",
  abyss_theater: "Бездна и Театр",
  other: "Прочее",
};

function generateSlug(text) {
  const cyrillicToLatin = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  return text
    .toLowerCase()
    .split("")
    .map((char) => cyrillicToLatin[char] || char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function run() {
  if (
    !process.env.YANDEX_KEY_ID ||
    !process.env.DATABASE_URL
  ) {
    console.error(
      "Missing ENV. Please run with tunnel and correct env.",
    );
    return;
  }

  await client.connect();
  console.log("Connected to DB.");

  try {
    // Create categories & services exactly per requirements
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug VARCHAR(255) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
          slug VARCHAR(255) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          subtitle VARCHAR(255),
          description TEXT,
          price DECIMAL(10, 2) NOT NULL,
          image_url VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const dataRaw = await fs.readFile(
      "./services/services_list.json",
      "utf8",
    );
    const servicesData = JSON.parse(dataRaw);

    let globalIndex = 0;

    for (const [catKey, items] of Object.entries(
      servicesData,
    )) {
      const catTitle =
        categoryTitles[catKey] || catKey.toUpperCase();
      console.log(
        `\n--- Processing Category: ${catTitle} ---`,
      );

      let categoryId;
      // Inserts category or fetches if it already exists
      const catCurrent = await client.query(
        `SELECT id FROM categories WHERE slug = $1`,
        [catKey],
      );
      if (catCurrent.rows.length > 0) {
        categoryId = catCurrent.rows[0].id;
      } else {
        const catRes = await client.query(
          `INSERT INTO categories (slug, title) VALUES ($1, $2) RETURNING id`,
          [catKey, catTitle],
        );
        categoryId = catRes.rows[0].id;
      }

      for (const item of items) {
        const index = globalIndex++;
        const slug = `${generateSlug(item.name)}-${index}`;

        const existCheck = await client.query(
          `SELECT id FROM services WHERE slug = $1`,
          [slug],
        );
        if (existCheck.rows.length > 0) {
          console.log(
            `Skipping (already exists): ${item.name}`,
          );
          continue;
        }

        let s3Url = item.background;
        try {
          if (
            item.background.startsWith("/images/services/")
          ) {
            const localPath = path.join(
              process.cwd(),
              "public",
              item.background,
            );
            const fileBuffer = await fs.readFile(localPath);
            const ext = path.extname(localPath);
            const hash = crypto
              .randomBytes(8)
              .toString("hex");
            const s3Key = `services/${generateSlug(item.name)}_${hash}${ext}`;

            console.log(
              `Uploading ${item.background} -> S3`,
            );
            await s3Client.send(
              new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: s3Key,
                Body: fileBuffer,
                ContentType:
                  ext === ".png"
                    ? "image/png"
                    : "image/jpeg",
              }),
            );

            s3Url = `https://storage.yandexcloud.net/${BUCKET_NAME}/${s3Key}`;
          }
        } catch (e) {
          console.error(
            `Failed to upload ${item.background}`,
            e.message,
          );
        }

        await client.query(
          `
          INSERT INTO services (category_id, slug, title, subtitle, description, price, image_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
          [
            categoryId,
            slug,
            item.name.toUpperCase(),
            item.name,
            item.description,
            item.price,
            s3Url,
          ],
        );
        console.log(`Inserted Service: ${item.name}`);
      }
    }

    console.log(
      "\n✅ FINISHED SEEDING YANDEX S3 AND DATABASE",
    );
  } finally {
    await client.end();
  }
}

run();

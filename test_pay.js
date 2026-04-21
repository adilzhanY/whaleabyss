import("dotenv/config").then((e) => {
  import("pg").then((pg) => {
    const client = new pg.default.Client({ connectionString: process.env.DATABASE_URL });
    client.connect().then(() => {
      client.query("SELECT id FROM categories WHERE slug = $1", ["other"]).then((res) => {
        const catId = res.rows[0].id;
        client.query("INSERT INTO services (category_id, slug, title, subtitle, description, price, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price", [catId, "test-service", "ТЕСТОВАЯ УСЛУГА", "Тестовая услуга", "Тестовая оплата за 1 руб", 1.00, "/icons/whale_logo_circle.png"]).then(() => {
          console.log("Success");
          client.end();
          process.exit(0);
        });
      });
    }).catch(console.error);
  });
});

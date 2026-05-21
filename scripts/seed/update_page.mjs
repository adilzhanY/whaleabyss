import fs from "fs";

let page = fs.readFileSync("app/page.tsx", "utf-8");

// 1. Remove FAQ_ITEMS and FaqItem
const faqRegex =
  /\/\/ ── FAQ data ──[\s\S]*?(?=\/\/ ── Main page ──)/;
page = page.replace(faqRegex, "");

// 2. Remove <section id="faq" ... </section>
const faqSectionRegex =
  /{\/\* ── FAQ ──[\s\S]*?<\/section>/;
page = page.replace(faqSectionRegex, "");

// 3. Replace <footer ... </footer> with <Footer />
const footerRegex = /{\/\* ── FOOTER ──[\s\S]*?<\/footer>/;
page = page.replace(footerRegex, "<Footer />");

// 4. Add import Footer from "@/components/Footer";
page = page.replace(
  'import Header from "@/components/Header";',
  'import Header from "@/components/Header";\nimport Footer from "@/components/Footer";',
);

fs.writeFileSync("app/page.tsx", page);

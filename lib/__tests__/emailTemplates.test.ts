// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { orderPaidEmail, orderCompletedEmail } from "@/lib/emailTemplates";

// Mock the SMTP transport so importing lib/email (for the subject-slice test)
// never builds a real nodemailer transporter or sends anything.
const sendMail = vi.fn().mockResolvedValue({ messageId: "x" });
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

const date = new Date("2026-08-01T10:00:00Z");

describe("orderPaidEmail — escaping & price column", () => {
  it("escapes a malicious service title (never raw <script>)", () => {
    const html = orderPaidEmail({
      orderId8: "ABCDEF12",
      items: [{ title: "<script>alert(1)</script>", quantity: 1, price: 100 }],
      total: 100,
      date,
    });
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("renders a per-line total and the Итого row when every item has a price", () => {
    const html = orderPaidEmail({
      orderId8: "ABCDEF12",
      items: [{ title: "Boost", quantity: 2, price: 1000 }],
      total: 2000,
      date,
    });
    // 1000 × 2 = 2000 line total; both use ru-RU grouping (non-breaking space).
    expect(html).toContain("2 000 ₽");
    expect(html).toContain("Итого");
  });

  it("shows the ×N quantity suffix only when quantity > 1", () => {
    const one = orderPaidEmail({
      orderId8: "ABCDEF12",
      items: [{ title: "Boost", quantity: 1, price: 100 }],
      total: 100,
      date,
    });
    expect(one).not.toContain("×1");
    const many = orderPaidEmail({
      orderId8: "ABCDEF12",
      items: [{ title: "Boost", quantity: 3, price: 100 }],
      total: 300,
      date,
    });
    expect(many).toContain("×3");
  });
});

describe("orderCompletedEmail — all-or-nothing prices", () => {
  it("drops every price cell and the Итого row when any item lacks a price", () => {
    // completed email passes no total → itemsTable renders no price column at all.
    const html = orderCompletedEmail({
      orderId8: "ABCDEF12",
      items: [
        { title: "A", quantity: 1, price: 1000 },
        { title: "B", quantity: 1 }, // no price
      ],
    });
    expect(html).not.toContain("₽");
    expect(html).not.toContain("Итого");
  });
});

describe("sendOrderPaidEmail — subject slices orderId to 8 uppercase chars", () => {
  it("uses only the first 8 chars, uppercased, in the subject", async () => {
    const { sendOrderPaidEmail } = await import("@/lib/email");
    await sendOrderPaidEmail("customer@x.ru", {
      orderId: "abcdef12-3456-7890-aaaa-bbbbbbbbbbbb",
      items: [{ title: "Boost", quantity: 1, price: 100 }],
      totalAmount: 100,
      orderDate: date,
    });
    expect(sendMail).toHaveBeenCalledTimes(1);
    const arg = sendMail.mock.calls[0][0];
    expect(arg.subject).toContain("ABCDEF12");
    expect(arg.subject).not.toContain("abcdef12");
    expect(arg.to).toBe("customer@x.ru");
  });
});

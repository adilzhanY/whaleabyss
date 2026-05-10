import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export interface OrderEmailData {
  orderId: string;
  customerEmail: string;
  customerName?: string;
  items: Array<{
    title: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  orderDate: Date;
}

/**
 * Sends order confirmation email to customer after successful payment
 */
export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<void> {
  const itemsHtml = data.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
            <div style="font-weight: 500; color: #1e293b;">${item.title}</div>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b;">
            ${item.quantity}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500; color: #1e293b;">
            ${item.price.toLocaleString('ru-RU')} ₽
          </td>
        </tr>
      `
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Подтверждение заказа</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                ✅ Оплата получена!
              </h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                Спасибо за ваш заказ
              </p>
            </td>
          </tr>

          <!-- Order Info -->
          <tr>
            <td style="padding: 30px;">
              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom: 8px;">
                      <span style="color: #64748b; font-size: 14px;">Номер заказа</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span style="color: #1e293b; font-size: 18px; font-weight: 600; font-family: monospace;">
                        ${data.orderId.slice(0, 8)}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 16px; padding-bottom: 8px;">
                      <span style="color: #64748b; font-size: 14px;">Дата заказа</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span style="color: #1e293b; font-size: 16px;">
                        ${data.orderDate.toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Items Table -->
              <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
                Детали заказа
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569; font-size: 14px; border-bottom: 2px solid #e2e8f0;">
                      Услуга
                    </th>
                    <th style="padding: 12px; text-align: center; font-weight: 600; color: #475569; font-size: 14px; border-bottom: 2px solid #e2e8f0;">
                      Кол-во
                    </th>
                    <th style="padding: 12px; text-align: right; font-weight: 600; color: #475569; font-size: 14px; border-bottom: 2px solid #e2e8f0;">
                      Цена
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr style="background-color: #f8fafc;">
                    <td colspan="2" style="padding: 16px; font-weight: 600; color: #1e293b; font-size: 16px;">
                      Итого
                    </td>
                    <td style="padding: 16px; text-align: right; font-weight: 700; color: #1e3a8a; font-size: 20px;">
                      ${data.totalAmount.toLocaleString('ru-RU')} ₽
                    </td>
                  </tr>
                </tfoot>
              </table>

              <!-- Next Steps -->
              <div style="margin-top: 30px; padding: 20px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px; font-weight: 600;">
                  Что дальше?
                </h3>
                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                  Наши специалисты уже приступили к выполнению вашего заказа. Мы свяжемся с вами в Telegram для уточнения деталей и передачи результата.
                </p>
              </div>

              <!-- Receipt Info -->
              <div style="margin-top: 20px; padding: 16px; background-color: #f1f5f9; border-radius: 8px;">
                <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                  📧 <strong>Чек об оплате</strong> был автоматически отправлен на ваш email платёжной системой. Если вы не получили чек, проверьте папку "Спам" или свяжитесь с нами.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0; color: #1e293b; font-size: 16px; font-weight: 600;">
                Whale Abyss
              </p>
              <p style="margin: 0 0 15px 0; color: #64748b; font-size: 14px;">
                Профессиональные услуги для Genshin Impact
              </p>
              <div style="margin-top: 15px;">
                <a href="https://whaleabyss.ru" style="color: #3b82f6; text-decoration: none; font-size: 14px; margin: 0 10px;">
                  Сайт
                </a>
                <span style="color: #cbd5e1;">•</span>
                <a href="https://t.me/whaleabyss" style="color: #3b82f6; text-decoration: none; font-size: 14px; margin: 0 10px;">
                  Telegram
                </a>
              </div>
              <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 12px;">
                Это автоматическое письмо. Пожалуйста, не отвечайте на него.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const mailOptions = {
    from: `"Whale Abyss" <${process.env.EMAIL_FROM}>`,
    to: data.customerEmail,
    subject: `✅ Заказ ${data.orderId.slice(0, 8)} оплачен`,
    html,
  };

  await transporter.sendMail(mailOptions);
  console.log(`[Email] Order confirmation sent to ${data.customerEmail}`);
}

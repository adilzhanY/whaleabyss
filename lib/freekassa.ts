import crypto from 'crypto';

export function generateFreekassaPaymentUrl(orderId: string, amount: number, email?: string): string {
  const merchantId = process.env.FREEKASSA_MERCHANT_ID;
  const secret1 = process.env.FREEKASSA_SECRET1;
  const currency = 'RUB'; // Default currency

  if (!merchantId || !secret1) {
    throw new Error('Freekassa credentials are not properly configured in .env');
  }

  // Format amount to string to ensure exact matching
  const amountStr = amount.toString();

  // Format: "ID Вашего магазина:Сумма платежа:Секретное слово:Валюта платежа:Номер заказа"
  const signString = `${merchantId}:${amountStr}:${secret1}:${currency}:${orderId}`;
  const sign = crypto.createHash('md5').update(signString).digest('hex');

  const url = new URL('https://pay.fk.money/');
  url.searchParams.append('m', merchantId);
  url.searchParams.append('oa', amountStr);
  url.searchParams.append('o', orderId);
  url.searchParams.append('s', sign);
  url.searchParams.append('currency', currency);

  if (email) {
    url.searchParams.append('em', email);
  }
  url.searchParams.append('lang', 'ru');

  return url.toString();
}

export function verifyFreekassaSignature(
  merchantId: string,
  amount: string,
  orderId: string,
  signature: string
): boolean {
  const secret2 = process.env.FREEKASSA_SECRET2;

  if (!secret2) {
    throw new Error('FREEKASSA_SECRET2 is not configured in .env');
  }

  // Format: "ID Вашего магазина:Сумма платежа:Секретное слово 2:Номер заказа"
  const signString = `${merchantId}:${amount}:${secret2}:${orderId}`;
  const expectedSignature = crypto.createHash('md5').update(signString).digest('hex');

  return signature === expectedSignature;
}

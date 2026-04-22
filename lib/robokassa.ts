import crypto from 'crypto';

export function generateRobokassaPaymentUrl(orderId: string, amount: number, desc: string): string {
  const merchantId = process.env.ROBOKASSA_MERCHANT_ID;
  const isTest = process.env.ROBOKASSA_IS_TEST === 'true';
  const password1 = isTest ? process.env.ROBOKASSA_TEST_PASSWORD_1 : process.env.ROBOKASSA_PASSWORD_1;

  if (!merchantId || !password1) {
    throw new Error('Robokassa credentials are not properly configured in .env');
  }

  // Format amount to string
  const amountStr = amount.toString();

  // Signature format for checkout: MrchLogin:OutSum:InvId:Password1
  const signString = `${merchantId}:${amountStr}:${orderId}:${password1}`;
  const sign = crypto.createHash('md5').update(signString).digest('hex');

  const url = new URL('https://auth.robokassa.ru/Merchant/Index.aspx');
  url.searchParams.append('MerchantLogin', merchantId);
  url.searchParams.append('OutSum', amountStr);
  url.searchParams.append('InvId', orderId);
  url.searchParams.append('Description', desc);
  url.searchParams.append('SignatureValue', sign);

  if (isTest) {
    url.searchParams.append('IsTest', '1');
  }

  return url.toString();
} export function verifyRobokassaSignature(
  amount: string,
  orderId: string,
  signature: string
): boolean {
  const isTest = process.env.ROBOKASSA_IS_TEST === 'true';
  const password2 = isTest ? process.env.ROBOKASSA_TEST_PASSWORD_2 : process.env.ROBOKASSA_PASSWORD_2;

  if (!password2) {
    throw new Error('Robokassa Password 2 is not configured in .env');
  }

  // Signature format for callback/result URL: OutSum:InvId:Password2
  const signString = `${amount}:${orderId}:${password2}`;
  const expectedSignature = crypto.createHash('md5').update(signString).digest('hex').toUpperCase();

  // Robokassa signatures are usually uppercase
  return signature.toUpperCase() === expectedSignature;
}

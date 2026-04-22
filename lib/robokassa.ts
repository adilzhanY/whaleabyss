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

  // Robokassa InvId must be an integer. Since we use UUIDs, we pass 0 (auto-generate limit) 
  // and send our UUID in a custom "Shp_id" parameter.
  // Signature format for checkout: MrchLogin:OutSum:0:Password1:Shp_id=uuid
  const signString = `${merchantId}:${amountStr}:0:${password1}:Shp_id=${orderId}`;
  const sign = crypto.createHash('md5').update(signString).digest('hex');

  const url = new URL('https://auth.robokassa.ru/Merchant/Index.aspx');
  url.searchParams.append('MerchantLogin', merchantId);
  url.searchParams.append('OutSum', amountStr);
  url.searchParams.append('InvId', '0');
  url.searchParams.append('Description', desc);
  url.searchParams.append('SignatureValue', sign);
  url.searchParams.append('Shp_id', orderId);

  if (isTest) {
    url.searchParams.append('IsTest', '1');
  }

  return url.toString();
}

export function verifyRobokassaSignature(
  amount: string,
  invId: string,
  shpId: string,
  signature: string
): boolean {
  const isTest = process.env.ROBOKASSA_IS_TEST === 'true';
  const password2 = isTest ? process.env.ROBOKASSA_TEST_PASSWORD_2 : process.env.ROBOKASSA_PASSWORD_2;

  if (!password2) {
    throw new Error('Robokassa Password 2 is not configured in .env');
  }

  // Signature format for callback/result URL: OutSum:InvId:Password2:Shp_id=uuid
  const signString = `${amount}:${invId}:${password2}:Shp_id=${shpId}`;
  const expectedSignature = crypto.createHash('md5').update(signString).digest('hex').toUpperCase();

  // Robokassa signatures are usually uppercase
  return signature.toUpperCase() === expectedSignature;
}

# FreeKassa Payment Status Issue - Debugging Guide

## Problem
Orders are created with status "pending" but never update to "paid" after successful payment.

## Current Statistics
- 60 orders stuck in "pending"
- 11 orders successfully marked as "paid"
- This means the webhook works sometimes but not consistently

## Root Causes to Check

### 1. Webhook URL Configuration
**Check in FreeKassa Dashboard:**
- Go to your shop settings
- Find "Notification URL" or "Result URL" (URL результата)
- It MUST be: `https://whaleabyss.ru/api/payment/freekassa/notify`
- Method: POST
- Make sure it's the NOTIFY/RESULT URL, not the success/fail URLs

**Current URLs configured:**
- Success URL: `https://whaleabyss.ru/api/payment/freekassa/success` ✓
- Fail URL: `https://whaleabyss.ru/api/payment/freekassa/fail` ✓
- **Notify URL: MUST BE `https://whaleabyss.ru/api/payment/freekassa/notify`** ← CHECK THIS

### 2. IP Filtering
Check if `FREEKASSA_CHECK_IP` is enabled in `.env`:
```bash
grep FREEKASSA_CHECK_IP .env
```

If it's set to `true`, the webhook will only accept requests from FreeKassa IPs:
- 168.119.157.136
- 168.119.60.227
- 178.154.197.79
- 51.250.54.238

**Recommendation:** Set `FREEKASSA_CHECK_IP=false` during testing to rule out IP issues.

### 3. Signature Verification
The webhook verifies signatures using:
```
md5("{MERCHANT_ID}:{AMOUNT}:{SECRET_2}:{MERCHANT_ORDER_ID}")
```

**Check:**
- `FREEKASSA_SECRET_2` in `.env` matches "Секретное слово 2" in FreeKassa dashboard
- Current value ends with: `...0@eB`

### 4. Server Logs
The webhook logs extensively. Check production logs for:
```
[Freekassa] Notification received
[Freekassa] Signature verified successfully
[Freekassa] Order successfully PAID
```

Or errors like:
```
[Freekassa] Invalid signature
[Freekassa] Order not found
[Freekassa] Amount mismatch
```

### 5. FreeKassa Retry Mechanism
If the webhook doesn't return "YES", FreeKassa will retry for up to 24 hours.

**Check in FreeKassa dashboard:**
- Look for failed notification attempts
- Check if there are any error messages

## Testing the Webhook

### Test 1: Create a Real Order
1. Go to `/admin/testing`
2. Click "Купить" on the test service (10 руbles)
3. Complete the payment
4. Check if status updates to "paid"

### Test 2: Manual Webhook Test
Use this curl command to simulate a FreeKassa notification:

```bash
# First, create a test order and get its ID
# Then replace ORDER_ID below with the actual order ID

curl -X POST https://whaleabyss.ru/api/payment/freekassa/notify \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'MERCHANT_ID=71963' \
  -d 'AMOUNT=10.00' \
  -d 'MERCHANT_ORDER_ID=ORDER_ID' \
  -d 'SIGN=SIGNATURE' \
  -d 'intid=12345'
```

To generate the correct signature:
```javascript
const crypto = require('crypto');
const orderId = 'YOUR_ORDER_ID';
const amount = '10.00';
const secret2 = '-)?X^8$5l?^0@eB';
const signature = crypto.createHash('md5')
  .update(`71963:${amount}:${secret2}:${orderId}`)
  .digest('hex');
console.log(signature);
```

### Test 3: Check FreeKassa Dashboard
1. Log into FreeKassa merchant dashboard
2. Go to "История операций" (Transaction History)
3. Find recent payments
4. Check if notifications were sent successfully
5. Look for any error messages

## Common Issues and Solutions

### Issue 1: Webhook URL Not Set
**Solution:** Set the notification URL in FreeKassa dashboard to:
`https://whaleabyss.ru/api/payment/freekassa/notify`

### Issue 2: Wrong Secret Key
**Solution:** Copy "Секретное слово 2" from FreeKassa dashboard and update `FREEKASSA_SECRET_2` in `.env`

### Issue 3: IP Filtering Blocking Requests
**Solution:** Set `FREEKASSA_CHECK_IP=false` in `.env` or add FreeKassa IPs to your firewall whitelist

### Issue 4: Server Not Responding
**Solution:** Check if your server is accessible from external IPs:
```bash
curl -I https://whaleabyss.ru/api/payment/freekassa/notify
```
Should return 405 (Method Not Allowed) for GET, which means the endpoint exists.

### Issue 5: Amount Mismatch
**Solution:** FreeKassa sends amount with 2 decimals (e.g., "10.00"). Make sure your order total_price matches exactly.

## Quick Fix Checklist

- [ ] Verify notification URL is set in FreeKassa dashboard
- [ ] Check `FREEKASSA_SECRET_2` matches dashboard
- [ ] Disable IP filtering temporarily (`FREEKASSA_CHECK_IP=false`)
- [ ] Check server logs for webhook calls
- [ ] Test with a small payment (10 rubles)
- [ ] Verify the webhook endpoint is accessible
- [ ] Check FreeKassa dashboard for failed notifications

## Monitoring

Add this to your monitoring:
```bash
# Check how many orders are stuck in pending
node check_orders.mjs
```

## Next Steps

1. **Immediate:** Check FreeKassa dashboard notification URL
2. **Test:** Make a 10 ruble test payment and watch the logs
3. **Debug:** If it fails, check server logs for the exact error
4. **Fix:** Update configuration based on the error message

## Contact Support

If the issue persists:
- FreeKassa support: https://fk.money/support
- Provide: Shop ID (71963), order ID, timestamp of payment

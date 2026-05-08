# Freekassa Payment Webhook Debugging Guide

## Problem
Orders remain in 'pending' status after successful payment. The webhook notification from Freekassa is not updating the order status to 'paid'.

## Possible Causes

### 1. **Webhook URL Not Configured Correctly in Freekassa Dashboard**
   - The notification URL must be: `https://yourdomain.com/api/payment/freekassa/notify`
   - Check in Freekassa merchant dashboard under "Настройки" → "Уведомления"
   - Make sure it's the full HTTPS URL, not HTTP

### 2. **Signature Verification Failing**
   - Freekassa uses: `md5("{MERCHANT_ID}:{AMOUNT}:{SECRET_2}:{MERCHANT_ORDER_ID}")`
   - Check that `FREEKASSA_SECRET_2` in `.env` matches exactly what's in Freekassa dashboard
   - No extra spaces, quotes, or newlines in the secret

### 3. **IP Whitelist Blocking Notifications**
   - If `FREEKASSA_CHECK_IP=true` in `.env`, only these IPs are allowed:
     - 168.119.157.136
     - 168.119.60.227
     - 178.154.197.79
     - 51.250.54.238
   - If your server is behind Cloudflare/proxy, the IP check might fail

### 4. **Amount Mismatch**
   - The webhook checks if `AMOUNT` from Freekassa matches `totalPrice` in database
   - Decimal precision issues (10.00 vs 10.0) could cause rejection

### 5. **Webhook Not Returning "YES"**
   - Freekassa expects plain text "YES" (status 200) on success
   - Any other response causes retries for 24 hours

## How to Debug

### Step 1: Check Server Logs
Look for these log lines after a payment:
```
[Freekassa] Notification received at: [timestamp]
[Freekassa] Parsed notification data: {...}
[Freekassa] Verifying signature for order: [order-id]
[Freekassa] Signature verified successfully
[Freekassa] Order found: {...}
[Freekassa] Amount verified successfully
[Freekassa] Updating order status to paid...
[Freekassa] Order [id] successfully PAID
```

If you don't see these logs, the webhook is not being called.

### Step 2: Test Webhook Manually
Use this curl command to simulate a Freekassa notification:

```bash
# Replace these values:
# - YOUR_DOMAIN: your actual domain
# - ORDER_ID: the UUID of the pending order from database
# - AMOUNT: the exact amount (e.g., "10.00")
# - SHOP_ID: your FREEKASSA_SHOP_ID
# - SIGN: calculate md5("{SHOP_ID}:{AMOUNT}:{SECRET_2}:{ORDER_ID}")

curl -X POST https://YOUR_DOMAIN/api/payment/freekassa/notify \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MERCHANT_ID=YOUR_SHOP_ID" \
  -d "AMOUNT=10.00" \
  -d "MERCHANT_ORDER_ID=YOUR_ORDER_UUID" \
  -d "SIGN=CALCULATED_MD5_HASH" \
  -d "intid=12345"
```

### Step 3: Calculate Signature for Testing
```bash
# Example in bash:
SHOP_ID="your_shop_id"
AMOUNT="10.00"
SECRET_2="your_secret_2"
ORDER_ID="your_order_uuid"

echo -n "${SHOP_ID}:${AMOUNT}:${SECRET_2}:${ORDER_ID}" | md5sum
```

### Step 4: Check Freekassa Dashboard
- Go to Freekassa merchant dashboard
- Check "История операций" or "Уведомления"
- Look for failed webhook attempts
- Check if Freekassa shows any error messages

## Quick Fixes

### Fix 1: Disable IP Check (Temporary)
If IP checking is causing issues, disable it:
```bash
# In .env file, remove or comment out:
# FREEKASSA_CHECK_IP=true
```

### Fix 2: Check Deployment Logs
The notify endpoint already has extensive logging. Check your deployment logs:
- Vercel: `vercel logs`
- Docker: `docker logs [container]`
- PM2: `pm2 logs`

### Fix 3: Verify Environment Variables
```bash
# Check that all required vars are set:
echo $FREEKASSA_SHOP_ID
echo $FREEKASSA_SECRET_1
echo $FREEKASSA_SECRET_2
echo $FREEKASSA_API_KEY
```

## Common Mistakes

1. **Using HTTP instead of HTTPS** - Freekassa requires HTTPS for production
2. **Wrong SECRET_2** - Copy-paste error, extra spaces
3. **Webhook URL has typo** - Should be `/api/payment/freekassa/notify` exactly
4. **Server not accessible** - Firewall blocking Freekassa IPs
5. **Using test mode** - Make sure Freekassa account is in production mode
6. **Webhook URL not saved in Freekassa dashboard** - Must click "Save" after entering URL

## Next Steps

1. Check if webhook URL is configured in Freekassa dashboard
2. Look at server logs during payment
3. Test webhook manually with curl
4. Verify SECRET_2 matches between .env and Freekassa dashboard
5. Check that your domain is accessible from Freekassa IPs

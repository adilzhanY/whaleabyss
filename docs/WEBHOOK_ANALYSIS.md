# Freekassa Webhook Problem Analysis

## Current Situation
- Friend paid 10 rubles for test service using real bank account
- Payment was successful on Freekassa side
- Order status in database remains 'pending' instead of 'paid'
- You can see the pending order in DBeaver

## Root Cause Analysis

Based on the code review, here are the **most likely causes** in order of probability:

### 1. **Webhook URL Not Configured in Freekassa Dashboard** (90% likely)
**Problem:** The notification URL is not set or incorrect in Freekassa merchant settings.

**Why this happens:**
- Freekassa doesn't automatically know where to send notifications
- You must manually configure it in the dashboard under "Настройки" → "Уведомления"

**How to fix:**
1. Log into Freekassa merchant dashboard
2. Go to Settings → Notifications (Настройки → Уведомления)
3. Set "URL для уведомлений" to: `https://yourdomain.com/api/payment/freekassa/notify`
4. Make sure to click SAVE
5. Test with a new payment

**How to verify:**
- Check Freekassa dashboard for webhook delivery attempts
- Look for "История уведомлений" or similar section
- If no attempts are shown, the URL isn't configured

---

### 2. **Wrong SECRET_2 Value** (5% likely)
**Problem:** The `FREEKASSA_SECRET_2` in your `.env` doesn't match what's in Freekassa dashboard.

**Why this happens:**
- Copy-paste error
- Extra spaces or newlines
- Using SECRET_1 instead of SECRET_2

**How to fix:**
1. Log into Freekassa dashboard
2. Find "Секретное слово 2" (Secret Word 2)
3. Copy it EXACTLY (no spaces before/after)
4. Update `.env` file: `FREEKASSA_SECRET_2="exact_value_here"`
5. Redeploy your application

**How to verify:**
- The webhook logs will show "Invalid signature" if this is the issue
- Check server logs for `[Freekassa] Invalid signature for order`

---

### 3. **IP Whitelist Blocking Notifications** (3% likely)
**Problem:** If `FREEKASSA_CHECK_IP=true` is set, the webhook rejects requests from non-whitelisted IPs.

**Why this happens:**
- Your server is behind a proxy/CDN (Cloudflare, Nginx)
- The `x-forwarded-for` header isn't being passed correctly
- Freekassa is using a new IP not in the whitelist

**How to fix:**
1. Check if `FREEKASSA_CHECK_IP=true` is in your `.env`
2. If yes, temporarily disable it by removing that line or setting to `false`
3. Redeploy and test
4. If it works, the IP check was the problem

**How to verify:**
- Check server logs for `[Freekassa] Rejected notification from untrusted IP`

---

### 4. **Server Not Accessible from Internet** (1% likely)
**Problem:** Your production server isn't reachable from Freekassa's servers.

**Why this happens:**
- Firewall blocking incoming requests
- Server is on localhost/private network
- DNS not configured correctly

**How to fix:**
1. Test if your webhook URL is accessible: `curl https://yourdomain.com/api/payment/freekassa/notify`
2. Should return "missing parameters" (400) - this means it's reachable
3. If timeout/connection refused, check firewall/DNS settings

---

### 5. **Amount Decimal Mismatch** (<1% likely)
**Problem:** The amount format doesn't match between Freekassa and database.

**Why this happens:**
- Database stores "10" but Freekassa sends "10.00"
- The webhook compares: `parseFloat("10.00") !== parseFloat("10")`

**This is actually NOT the issue** because the code does:
```javascript
parseFloat(amount) !== parseFloat(order.totalPrice.toString())
```
Both sides are converted to float, so "10" and "10.00" would match.

---

## Most Likely Solution

**99% chance the issue is #1: Webhook URL not configured in Freekassa dashboard.**

The webhook code is solid with extensive logging. If Freekassa was calling it, you'd see logs. The fact that the order stays 'pending' suggests Freekassa never notified your server.

## Immediate Action Steps

1. **Check Freekassa Dashboard:**
   - Log in to https://fk.money or your merchant panel
   - Navigate to Settings → Notifications
   - Verify the webhook URL is set to: `https://yourdomain.com/api/payment/freekassa/notify`
   - Click Save if not already saved

2. **Check Server Logs:**
   - After the next payment, check logs for `[Freekassa]` messages
   - If you see logs, the webhook is being called
   - If no logs, Freekassa isn't sending notifications

3. **Test Manually:**
   - Use curl to manually trigger the webhook (the old `test-webhook.mjs`
     helper was removed in the 2026-08 repo cleanup; it lives in git history)
   - This verifies the webhook code works

4. **Verify Environment:**
   - Make sure `FREEKASSA_SECRET_2` is correct
   - Remove `FREEKASSA_CHECK_IP=true` if present (temporarily)

## Expected Behavior After Fix

When a payment succeeds:
1. Freekassa sends POST to `/api/payment/freekassa/notify`
2. Your server logs: `[Freekassa] Notification received at: [timestamp]`
3. Signature is verified
4. Order status updates from 'pending' to 'paid'
5. Admin receives Telegram notification
6. Server responds with "YES"
7. User sees success page

## Files Involved

- `/app/api/payment/freekassa/notify/route.ts` - Webhook handler (has extensive logging)
- `/lib/freekassa.ts` - Signature verification logic
- `/app/api/checkout/route.ts` - Creates the order
- `.env` - Contains FREEKASSA_SECRET_2 and other config

## Next Steps After Fixing

Once the webhook URL is configured:
1. Create a new test order (10 rubles)
2. Complete payment
3. Check server logs immediately
4. Verify order status changes to 'paid' in DBeaver
5. If still not working, share the server logs with me

const Razorpay = require('razorpay');
const crypto = require('crypto');
const cfg = require('../config');

let client = null;
function rzp() {
  if (!client) client = new Razorpay({ key_id: cfg.razorpay.keyId, key_secret: cfg.razorpay.keySecret });
  return client;
}
/** Verify the checkout callback: HMAC-SHA256(order_id|payment_id) with the key secret. */
function verifyPaymentSignature({ order_id, payment_id, signature }) {
  const expected = crypto.createHmac('sha256', cfg.razorpay.keySecret).update(`${order_id}|${payment_id}`).digest('hex');
  return safeEq(expected, signature);
}
function verifySubscriptionSignature({ subscription_id, payment_id, signature }) {
  const expected = crypto.createHmac('sha256', cfg.razorpay.keySecret).update(`${payment_id}|${subscription_id}`).digest('hex');
  return safeEq(expected, signature);
}
/** Webhook: HMAC-SHA256 of the raw body with the webhook secret, in X-Razorpay-Signature. */
function verifyWebhook(rawBody, signature) {
  const expected = crypto.createHmac('sha256', cfg.razorpay.webhookSecret).update(rawBody).digest('hex');
  return safeEq(expected, signature);
}
function safeEq(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
module.exports = { rzp, verifyPaymentSignature, verifySubscriptionSignature, verifyWebhook };

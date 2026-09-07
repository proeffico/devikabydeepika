const express = require('express');
const db = require('../db');
const { verifyWebhook } = require('../lib/razorpay');
const orders = require('../services/orders');
const subs = require('../services/subscriptions');
const logger = require('../logger');
const r = express.Router();

/**
 * Razorpay webhook. Mounted BEFORE session/CSRF with a raw body parser so the HMAC is computed
 * over the exact bytes Razorpay signed. Idempotent via webhook_events.event_id.
 */
r.post('/webhooks/razorpay', express.raw({ type: '*/*', limit: '256kb' }), async (req, res) => {
  const sig = req.get('x-razorpay-signature') || '';
  if (!verifyWebhook(req.body, sig)) { logger.warn({ ip: req.ip }, 'webhook bad signature'); return res.status(400).send('bad signature'); }
  let evt; try { evt = JSON.parse(req.body.toString('utf8')); } catch { return res.status(400).send('bad json'); }
  const eventId = req.get('x-razorpay-event-id') || `${evt.event}:${evt.created_at}:${evt.payload?.payment?.entity?.id || evt.payload?.subscription?.entity?.id || ''}`;
  try { await db('webhook_events').insert({ provider: 'razorpay', event_id: eventId, event: evt.event, payload: JSON.stringify(evt) }); }
  catch (e) { if (e.code === 'ER_DUP_ENTRY') return res.status(200).send('duplicate'); throw e; }

  try {
    const pay = evt.payload?.payment?.entity, sub = evt.payload?.subscription?.entity;
    switch (evt.event) {
      case 'payment.captured': {
        if (pay?.order_id) {
          const o = await db('orders').where('razorpay_order_id', pay.order_id).first();
          if (o) await orders.markPaid(o.id, { payment_id: pay.id, method: pay.method, raw: pay });
        }
        break;
      }
      case 'payment.failed': {
        if (pay?.order_id) await db('payments').where('provider_order_id', pay.order_id).update({ status: 'failed', raw: JSON.stringify(pay) });
        break;
      }
      case 'subscription.activated':
      case 'subscription.authenticated': { if (sub) await subs.activate(sub.id, pay?.id || null); break; }
      case 'subscription.charged': { if (sub && pay) await subs.charged(sub.id, pay.id, pay.amount); break; }
      case 'subscription.paused': { if (sub) await db('subscriptions').where('razorpay_subscription_id', sub.id).update({ status: 'paused' }); break; }
      case 'subscription.resumed': { if (sub) await db('subscriptions').where('razorpay_subscription_id', sub.id).update({ status: 'active' }); break; }
      case 'subscription.halted': { if (sub) await db('subscriptions').where('razorpay_subscription_id', sub.id).update({ status: 'past_due' }); break; }
      case 'subscription.cancelled':
      case 'subscription.completed': { if (sub) await db('subscriptions').where('razorpay_subscription_id', sub.id).update({ status: 'cancelled', cancelled_at: db.fn.now() }); break; }
      default: break;
    }
    await db('webhook_events').where('event_id', eventId).update({ processed: true });
    res.status(200).send('ok');
  } catch (e) { logger.error({ err: e, event: evt.event }, 'webhook processing failed'); res.status(500).send('error'); }
});
module.exports = r;

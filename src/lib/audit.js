const db = require('../db');
module.exports = async function audit(req, action, { actor_type = 'system', actor_id = null, entity = null, entity_id = null, meta = null } = {}) {
  try { await db('audit_log').insert({ actor_type, actor_id, action, entity, entity_id, meta: meta ? JSON.stringify(meta) : null, ip: req?.ip || null }); } catch (e) { /* never block on audit */ }
};

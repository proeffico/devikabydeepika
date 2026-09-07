const { z } = require('zod');
/** Wrap a zod schema as middleware; on failure raise a 400 with a readable message. */
function body(schema) {
  return (req, res, next) => {
    const r = schema.safeParse(req.body || {});
    if (!r.success) {
      const e = new Error(r.error.issues.map((i) => i.message).join(' ')); e.status = 400; e.code = 'VALIDATION'; e.details = r.error.issues; return next(e);
    }
    req.valid = r.data; next();
  };
}
const phone = z.string().trim().regex(/^(\+?91)?[\s-]?[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number.');
const pincode = z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit pin code.');
const name = z.string().trim().min(2, 'Please tell us your name.').max(120);
const shortText = (max = 255) => z.string().trim().max(max).optional().default('');
module.exports = { z, body, phone, pincode, name, shortText };

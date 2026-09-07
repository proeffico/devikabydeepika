/**
 * Devikka by Deepika — initial schema.
 *
 * Catalog is three-facet: Category × Deity × Size band. Deity is a filter that cuts
 * across every category (poshak, shringar, decor, idols), not a sub-category of one.
 * Two independent recurring products: visit plans (priced on mandir footprint) and
 * dress combo packs (priced on the household's idols and their size bands).
 */
const utf8 = (t) => { t.charset('utf8mb4'); t.collate('utf8mb4_unicode_ci'); };
const stamps = (t, knex) => {
  t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  t.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
};

exports.up = async function (knex) {
  // ---------------- taxonomy ----------------
  await knex.schema.createTable('categories', (t) => {
    utf8(t);
    t.increments('id');
    t.string('slug', 80).notNullable().unique();
    t.string('name_en', 120).notNullable();
    t.string('name_hi', 120).notNullable();
    t.string('kicker_en', 120); t.string('kicker_hi', 120);
    t.text('blurb_en'); t.text('blurb_hi');
    t.string('image', 255);
    t.enum('pricing_mode', ['size_band', 'per_piece']).notNullable().defaultTo('per_piece');
    t.integer('sort').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    stamps(t, knex);
  });

  await knex.schema.createTable('subcategories', (t) => {
    utf8(t);
    t.increments('id');
    t.integer('category_id').unsigned().notNullable().references('id').inTable('categories').onDelete('CASCADE');
    t.string('slug', 80).notNullable();
    t.string('name_en', 120).notNullable();
    t.string('name_hi', 120).notNullable();
    t.boolean('size_dependent').notNullable().defaultTo(false);
    t.integer('sort').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.unique(['category_id', 'slug']);
    stamps(t, knex);
  });

  await knex.schema.createTable('deities', (t) => {
    utf8(t);
    t.increments('id');
    t.string('slug', 80).notNullable().unique();
    t.string('name_en', 120).notNullable();
    t.string('name_hi', 120).notNullable();
    t.string('garment_en', 120).notNullable();   // the word this deity's dress is called
    t.string('garment_hi', 120).notNullable();
    t.enum('posture', ['seated', 'standing', 'set']).notNullable().defaultTo('seated');
    t.integer('pieces_per_set').notNullable().defaultTo(1); // Ram Darbar = 4, pairs = 2
    t.text('intro_en'); t.text('intro_hi');
    t.string('image', 255);
    t.integer('sort').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    stamps(t, knex);
  });

  await knex.schema.createTable('festivals', (t) => {
    utf8(t);
    t.increments('id');
    t.string('slug', 80).notNullable().unique();
    t.string('name_en', 120).notNullable();
    t.string('name_hi', 120).notNullable();
    t.string('season_en', 60); t.string('season_hi', 60);
    t.text('pack_en'); t.text('pack_hi');           // what the festival pack contains
    t.decimal('pack_price', 10, 2);                  // NULL = not set, show "reserve on WhatsApp"
    t.date('next_date');                             // set season by season from the panchang
    t.string('image', 255);
    t.integer('sort').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    stamps(t, knex);
  });

  await knex.schema.createTable('size_bands', (t) => {
    utf8(t);
    t.increments('id');
    t.string('code', 8).notNullable().unique();     // S1..S5
    t.string('label_en', 80).notNullable();
    t.string('label_hi', 80).notNullable();
    t.decimal('min_in', 5, 2).notNullable();
    t.decimal('max_in', 5, 2);                      // NULL = open-ended (S5)
    t.string('who_en', 120); t.string('who_hi', 120);
    t.boolean('quote_only').notNullable().defaultTo(false);
    t.integer('sort').notNullable().defaultTo(0);
  });

  // ---------------- products ----------------
  await knex.schema.createTable('products', (t) => {
    utf8(t);
    t.increments('id');
    t.string('slug', 140).notNullable().unique();
    t.integer('category_id').unsigned().notNullable().references('id').inTable('categories');
    t.integer('subcategory_id').unsigned().references('id').inTable('subcategories').onDelete('SET NULL');
    t.string('name_en', 160).notNullable();
    t.string('name_hi', 160).notNullable();
    t.text('description_en'); t.text('description_hi');
    t.string('fabric_en', 120); t.string('fabric_hi', 120);
    t.string('sku', 40).unique();
    t.decimal('base_price', 10, 2);                 // per-piece items; NULL when size-band priced
    t.boolean('price_is_estimate').notNullable().defaultTo(false); // true until the tailor confirms
    t.boolean('one_of_one').notNullable().defaultTo(false);
    t.integer('stock').notNullable().defaultTo(0);  // per-piece stock; variants carry their own
    t.string('meta_title_en', 160); t.string('meta_title_hi', 160);
    t.string('meta_desc_en', 320); t.string('meta_desc_hi', 320);
    t.boolean('is_featured').notNullable().defaultTo(false);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.integer('sort').notNullable().defaultTo(0);
    t.index(['category_id', 'is_active']);
    stamps(t, knex);
  });

  await knex.schema.createTable('product_variants', (t) => {
    utf8(t);
    t.increments('id');
    t.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.integer('size_band_id').unsigned().notNullable().references('id').inTable('size_bands');
    t.decimal('price', 10, 2).notNullable();
    t.integer('stock').notNullable().defaultTo(0);
    t.integer('lead_days').notNullable().defaultTo(7);
    t.unique(['product_id', 'size_band_id']);
  });

  await knex.schema.createTable('product_images', (t) => {
    utf8(t);
    t.increments('id');
    t.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.string('path', 255).notNullable();
    t.string('alt_en', 255); t.string('alt_hi', 255);
    t.integer('sort').notNullable().defaultTo(0);
  });

  await knex.schema.createTable('product_deities', (t) => {
    t.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.integer('deity_id').unsigned().notNullable().references('id').inTable('deities').onDelete('CASCADE');
    t.primary(['product_id', 'deity_id']);
  });

  await knex.schema.createTable('product_festivals', (t) => {
    t.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.integer('festival_id').unsigned().notNullable().references('id').inTable('festivals').onDelete('CASCADE');
    t.primary(['product_id', 'festival_id']);
  });

  // ---------------- customers ----------------
  await knex.schema.createTable('customers', (t) => {
    utf8(t);
    t.increments('id');
    t.string('phone', 15).notNullable().unique();  // E.164 without +, e.g. 919355110366
    t.string('name', 120);
    t.string('email', 160);
    t.enum('locale', ['en', 'hi']).notNullable().defaultTo('en');
    t.boolean('is_blocked').notNullable().defaultTo(false);
    t.timestamp('last_login_at');
    stamps(t, knex);
  });

  await knex.schema.createTable('otp_codes', (t) => {
    utf8(t);
    t.increments('id');
    t.string('phone', 15).notNullable().index();
    t.string('code_hash', 100).notNullable();       // bcrypt of the 6-digit code
    t.string('purpose', 20).notNullable().defaultTo('login');
    t.integer('attempts').notNullable().defaultTo(0);
    t.timestamp('expires_at').notNullable();
    t.timestamp('consumed_at');
    t.string('ip', 45);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('addresses', (t) => {
    utf8(t);
    t.increments('id');
    t.integer('customer_id').unsigned().notNullable().references('id').inTable('customers').onDelete('CASCADE');
    t.string('label', 40).defaultTo('Home');
    t.string('name', 120).notNullable();
    t.string('phone', 15).notNullable();
    t.string('line1', 200).notNullable();
    t.string('line2', 200);
    t.string('city', 80).notNullable();
    t.string('state', 80).notNullable();
    t.string('pincode', 6).notNullable().index();
    t.boolean('is_default').notNullable().defaultTo(false);
    stamps(t, knex);
  });

  // the household's mandir - the record that compounds
  await knex.schema.createTable('households', (t) => {
    utf8(t);
    t.increments('id');
    t.integer('customer_id').unsigned().notNullable().references('id').inTable('customers').onDelete('CASCADE');
    t.integer('address_id').unsigned().references('id').inTable('addresses').onDelete('SET NULL');
    t.enum('footprint', ['3x3', '5x5', '5x8', '6x10']);
    t.enum('dressing_pref', ['family', 'sevadar']).notNullable().defaultTo('family');
    t.text('access_notes');
    t.boolean('photo_consent').notNullable().defaultTo(false);
    t.timestamp('photo_consent_at');
    t.timestamp('measured_at');                     // set on the first visit
    stamps(t, knex);
  });

  await knex.schema.createTable('idols', (t) => {
    utf8(t);
    t.increments('id');
    t.integer('household_id').unsigned().notNullable().references('id').inTable('households').onDelete('CASCADE');
    t.integer('deity_id').unsigned().notNullable().references('id').inTable('deities');
    t.decimal('height_in', 5, 2);
    t.integer('size_band_id').unsigned().references('id').inTable('size_bands');
    t.string('size_number', 10);                    // market size number the customer already knows
    t.string('notes', 255);
    t.string('photo', 255);
    stamps(t, knex);
  });

  // ---------------- cart, orders, payments ----------------
  await knex.schema.createTable('carts', (t) => {
    utf8(t);
    t.increments('id');
    t.string('session_id', 128).notNullable().unique();
    t.integer('customer_id').unsigned().references('id').inTable('customers').onDelete('SET NULL');
    stamps(t, knex);
  });

  await knex.schema.createTable('cart_items', (t) => {
    utf8(t);
    t.increments('id');
    t.integer('cart_id').unsigned().notNullable().references('id').inTable('carts').onDelete('CASCADE');
    t.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.integer('variant_id').unsigned().references('id').inTable('product_variants').onDelete('CASCADE');
    t.integer('deity_id').unsigned().references('id').inTable('deities');
    t.integer('qty').notNullable().defaultTo(1);
    t.unique(['cart_id', 'product_id', 'variant_id', 'deity_id']);
  });

  await knex.schema.createTable('orders', (t) => {
    utf8(t);
    t.increments('id');
    t.string('order_no', 24).notNullable().unique();  // DVK-2026-000123
    t.integer('customer_id').unsigned().references('id').inTable('customers').onDelete('SET NULL');
    t.enum('status', ['pending_payment', 'paid', 'in_production', 'ready', 'dispatched', 'delivered', 'cancelled', 'refunded']).notNullable().defaultTo('pending_payment');
    t.enum('locale', ['en', 'hi']).notNullable().defaultTo('en');
    t.string('ship_name', 120).notNullable();
    t.string('ship_phone', 15).notNullable();
    t.string('ship_line1', 200).notNullable();
    t.string('ship_line2', 200);
    t.string('ship_city', 80).notNullable();
    t.string('ship_state', 80).notNullable();
    t.string('ship_pincode', 6).notNullable();
    t.decimal('subtotal', 10, 2).notNullable();
    t.decimal('discount', 10, 2).notNullable().defaultTo(0);
    t.decimal('shipping', 10, 2).notNullable().defaultTo(0);
    t.decimal('total', 10, 2).notNullable();
    t.string('razorpay_order_id', 64).index();
    t.text('notes');
    t.string('ip', 45);
    t.timestamp('paid_at');
    stamps(t, knex);
  });

  await knex.schema.createTable('order_items', (t) => {
    utf8(t);
    t.increments('id');
    t.integer('order_id').unsigned().notNullable().references('id').inTable('orders').onDelete('CASCADE');
    t.integer('product_id').unsigned().references('id').inTable('products').onDelete('SET NULL');
    t.integer('variant_id').unsigned().references('id').inTable('product_variants').onDelete('SET NULL');
    t.integer('deity_id').unsigned().references('id').inTable('deities').onDelete('SET NULL');
    t.string('name_snapshot', 200).notNullable();   // what it was called at the time
    t.string('band_snapshot', 40);
    t.decimal('unit_price', 10, 2).notNullable();
    t.integer('qty').notNullable().defaultTo(1);
    t.decimal('line_total', 10, 2).notNullable();
  });

  await knex.schema.createTable('payments', (t) => {
    utf8(t);
    t.increments('id');
    t.integer('order_id').unsigned().references('id').inTable('orders').onDelete('SET NULL');
    t.integer('subscription_id').unsigned();       // FK added after subscriptions table
    t.string('provider', 20).notNullable().defaultTo('razorpay');
    t.string('provider_payment_id', 64).unique();
    t.string('provider_order_id', 64).index();
    t.decimal('amount', 10, 2).notNullable();
    t.string('currency', 3).notNullable().defaultTo('INR');
    t.enum('status', ['created', 'authorized', 'captured', 'failed', 'refunded']).notNullable().defaultTo('created');
    t.string('method', 30);
    t.json('raw');
    stamps(t, knex);
  });

  // ---------------- the two recurring products ----------------
  await knex.schema.createTable('visit_plans', (t) => {
    utf8(t);
    t.increments('id');
    t.enum('footprint', ['3x3', '5x5', '5x8', '6x10']).notNullable().unique();
    t.string('label_en', 60).notNullable(); t.string('label_hi', 60).notNullable();
    t.decimal('monthly_price', 10, 2).notNullable();
    t.decimal('quarterly_price', 10, 2).notNullable();
    t.integer('visits_per_month').notNullable().defaultTo(2);
    t.string('razorpay_plan_monthly', 64);          // plan_xxx ids once created in the dashboard
    t.string('razorpay_plan_quarterly', 64);
    t.integer('sort').notNullable().defaultTo(0);
  });

  await knex.schema.createTable('combo_discounts', (t) => {
    t.integer('deity_count').primary();
    t.decimal('discount_pct', 5, 2).notNullable();  // 0.00 .. 100.00
    t.boolean('is_estimate').notNullable().defaultTo(true);
  });

  await knex.schema.createTable('subscriptions', (t) => {
    utf8(t);
    t.increments('id');
    t.integer('customer_id').unsigned().notNullable().references('id').inTable('customers').onDelete('CASCADE');
    t.integer('household_id').unsigned().references('id').inTable('households').onDelete('SET NULL');
    t.enum('kind', ['visit', 'dress_pack']).notNullable();
    t.enum('rhythm', ['monthly', 'quarterly']).notNullable();
    t.integer('visit_plan_id').unsigned().references('id').inTable('visit_plans');
    t.decimal('amount', 10, 2).notNullable();       // per cycle, after combo discount
    t.enum('status', ['pending', 'active', 'paused', 'cancelled', 'past_due']).notNullable().defaultTo('pending');
    t.string('razorpay_subscription_id', 64).unique();
    t.string('razorpay_plan_id', 64);
    t.date('next_cycle_date');
    t.timestamp('activated_at'); t.timestamp('cancelled_at');
    t.index(['customer_id', 'status']);
    stamps(t, knex);
  });

  await knex.schema.createTable('subscription_items', (t) => {
    utf8(t);
    t.increments('id');
    t.integer('subscription_id').unsigned().notNullable().references('id').inTable('subscriptions').onDelete('CASCADE');
    t.integer('idol_id').unsigned().references('id').inTable('idols').onDelete('SET NULL');
    t.integer('deity_id').unsigned().notNullable().references('id').inTable('deities');
    t.integer('size_band_id').unsigned().notNullable().references('id').inTable('size_bands');
    t.decimal('unit_price', 10, 2).notNullable();
  });

  await knex.schema.table('payments', (t) => {
    t.foreign('subscription_id').references('id').inTable('subscriptions').onDelete('SET NULL');
  });

  await knex.schema.createTable('cycles', (t) => {
    utf8(t);
    t.increments('id');
    t.integer('subscription_id').unsigned().notNullable().references('id').inTable('subscriptions').onDelete('CASCADE');
    t.integer('cycle_no').notNullable();
    t.date('due_date').notNullable();
    t.enum('state', ['pending_choice', 'chosen', 'in_production', 'ready', 'dispatched', 'delivered', 'closed', 'skipped']).notNullable().defaultTo('pending_choice');
    t.string('choice_token', 64).unique();           // link sent on WhatsApp
    t.timestamp('choice_sent_at'); t.timestamp('choice_made_at');
    t.integer('visit_booking_id').unsigned();
    t.unique(['subscription_id', 'cycle_no']);
    stamps(t, knex);
  });

  await knex.schema.createTable('cycle_choices', (t) => {
    utf8(t);
    t.increments('id');
    t.integer('cycle_id').unsigned().notNullable().references('id').inTable('cycles').onDelete('CASCADE');
    t.integer('subscription_item_id').unsigned().notNullable().references('id').inTable('subscription_items').onDelete('CASCADE');
    t.integer('product_id').unsigned().references('id').inTable('products').onDelete('SET NULL');
    t.boolean('auto_selected').notNullable().defaultTo(false);
  });

  // ---------------- sevadars and visits ----------------
  await knex.schema.createTable('sectors', (t) => {
    utf8(t);
    t.increments('id');
    t.string('name', 80).notNullable();              // "Noida Sector 107"
    t.string('city', 80).notNullable();
    t.string('pincode', 6).notNullable().index();
    t.boolean('is_live').notNullable().defaultTo(false);
    t.integer('visit_capacity_per_day').notNullable().defaultTo(8);
    t.integer('waitlist_count').notNullable().defaultTo(0);
    t.unique(['city', 'name']);
  });

  await knex.schema.createTable('waitlist', (t) => {
    utf8(t);
    t.increments('id');
    t.string('phone', 15).notNullable();
    t.string('pincode', 6).notNullable().index();
    t.string('note', 255);
    t.string('ip', 45);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['phone', 'pincode']);
  });

  await knex.schema.createTable('sevadars', (t) => {
    utf8(t);
    t.increments('id');
    t.string('name', 120).notNullable();
    t.string('phone', 15).notNullable().unique();
    t.string('area', 120).notNullable();
    t.integer('sector_id').unsigned().references('id').inTable('sectors').onDelete('SET NULL');
    t.boolean('has_experience').notNullable().defaultTo(false);
    t.text('note');
    t.enum('status', ['applied', 'interview', 'verified', 'active', 'inactive', 'rejected']).notNullable().defaultTo('applied');
    t.string('photo', 255);
    t.string('id_verified_ref', 120);
    t.decimal('pay_per_visit', 10, 2);
    t.string('ip', 45);
    stamps(t, knex);
  });

  await knex.schema.createTable('visit_bookings', (t) => {
    utf8(t);
    t.increments('id');
    t.integer('customer_id').unsigned().references('id').inTable('customers').onDelete('SET NULL');
    t.integer('household_id').unsigned().references('id').inTable('households').onDelete('SET NULL');
    t.integer('subscription_id').unsigned().references('id').inTable('subscriptions').onDelete('SET NULL');
    t.integer('sevadar_id').unsigned().references('id').inTable('sevadars').onDelete('SET NULL');
    t.integer('sector_id').unsigned().references('id').inTable('sectors').onDelete('SET NULL');
    t.enum('kind', ['first_visit', 'plan_visit', 'festival', 'styling']).notNullable().defaultTo('first_visit');
    t.string('name', 120).notNullable();
    t.string('phone', 15).notNullable();
    t.string('pincode', 6).notNullable();
    t.enum('footprint', ['3x3', '5x5', '5x8', '6x10']);
    t.date('visit_date').notNullable();
    t.enum('slot', ['08-10', '10-12', '12-14', '16-18', '18-20']).notNullable();
    t.enum('dressing_pref', ['family', 'sevadar']).notNullable().defaultTo('family');
    t.string('idols_note', 255);
    t.enum('status', ['requested', 'confirmed', 'done', 'cancelled', 'no_show']).notNullable().defaultTo('requested');
    t.string('photo_after', 255);
    t.string('ip', 45);
    t.index(['visit_date', 'slot', 'sector_id']);
    stamps(t, knex);
  });

  await knex.schema.table('cycles', (t) => {
    t.foreign('visit_booking_id').references('id').inTable('visit_bookings').onDelete('SET NULL');
  });

  // ---------------- content ----------------
  await knex.schema.createTable('testimonials', (t) => {
    utf8(t);
    t.increments('id');
    t.text('quote_en').notNullable(); t.text('quote_hi').notNullable();
    t.string('who_en', 80).notNullable(); t.string('who_hi', 80).notNullable();
    t.boolean('consent_on_file').notNullable().defaultTo(false);
    t.integer('sort').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
  });

  await knex.schema.createTable('faqs', (t) => {
    utf8(t);
    t.increments('id');
    t.string('q_en', 255).notNullable(); t.string('q_hi', 255).notNullable();
    t.text('a_en').notNullable(); t.text('a_hi').notNullable();
    t.integer('sort').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
  });

  await knex.schema.createTable('settings', (t) => {
    utf8(t);
    t.string('key', 60).primary();
    t.text('value');
  });

  // ---------------- admin, sessions, audit ----------------
  await knex.schema.createTable('admins', (t) => {
    utf8(t);
    t.increments('id');
    t.string('email', 160).notNullable().unique();
    t.string('name', 120);
    t.string('password_hash', 100).notNullable();
    t.enum('role', ['owner', 'ops', 'content']).notNullable().defaultTo('ops');
    t.integer('failed_logins').notNullable().defaultTo(0);
    t.timestamp('locked_until');
    t.timestamp('last_login_at');
    t.boolean('is_active').notNullable().defaultTo(true);
    stamps(t, knex);
  });

  await knex.schema.createTable('audit_log', (t) => {
    utf8(t);
    t.increments('id');
    t.string('actor_type', 20).notNullable();       // admin | customer | system | webhook
    t.integer('actor_id');
    t.string('action', 80).notNullable();
    t.string('entity', 60); t.integer('entity_id');
    t.json('meta');
    t.string('ip', 45);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['entity', 'entity_id']);
  });

  await knex.schema.createTable('webhook_events', (t) => {
    utf8(t);
    t.increments('id');
    t.string('provider', 20).notNullable();
    t.string('event_id', 100).notNullable().unique(); // idempotency
    t.string('event', 80).notNullable();
    t.json('payload');
    t.boolean('processed').notNullable().defaultTo(false);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // express-session store (connect-session-knex)
  await knex.schema.createTable('sessions', (t) => {
    t.string('sid').primary();
    t.json('sess').notNullable();
    t.dateTime('expired').notNullable().index();
  });
};

exports.down = async function (knex) {
  const tables = ['sessions', 'webhook_events', 'audit_log', 'admins', 'settings', 'faqs', 'testimonials',
    'visit_bookings', 'sevadars', 'waitlist', 'sectors', 'cycle_choices', 'cycles', 'subscription_items',
    'payments', 'subscriptions', 'combo_discounts', 'visit_plans', 'order_items', 'orders', 'cart_items', 'carts',
    'idols', 'households', 'addresses', 'otp_codes', 'customers', 'product_festivals', 'product_deities',
    'product_images', 'product_variants', 'products', 'size_bands', 'festivals', 'deities', 'subcategories', 'categories'];
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
  for (const tb of tables) await knex.schema.dropTableIfExists(tb);
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');
};

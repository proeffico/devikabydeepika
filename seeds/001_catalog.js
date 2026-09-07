/**
 * Seed: taxonomy, deities, festivals, size bands, visit plans, combo ladder,
 * starter products, testimonials, FAQs, settings, launch sector.
 *
 * Prices marked price_is_estimate / is_estimate are NOT final. They exist so the
 * store functions; replace them in /admin before advertising.
 */
exports.seed = async function (knex) {
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of ['cycle_choices', 'cycles', 'subscription_items', 'subscriptions', 'order_items', 'orders', 'cart_items', 'carts',
    'product_festivals', 'product_deities', 'product_images', 'product_variants', 'products', 'subcategories', 'categories',
    'deities', 'festivals', 'size_bands', 'visit_plans', 'combo_discounts', 'testimonials', 'faqs', 'settings', 'sectors']) {
    await knex(t).del();
  }
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  // ---------- size bands ----------
  const bands = [
    { code: 'S1', label_en: '6″ and under', label_hi: '6″ तक', min_in: 0, max_in: 6, who_en: 'Small Laddu Gopal, travel murtis', who_hi: 'छोटे लड्डू गोपाल, यात्रा की मूर्तियाँ', sort: 1 },
    { code: 'S2', label_en: 'Over 6″ up to 12″', label_hi: '6″ से 12″ तक', min_in: 6.01, max_in: 12, who_en: 'The most common home size', who_hi: 'घरों में सबसे आम नाप', sort: 2 },
    { code: 'S3', label_en: 'Over 12″ up to 18″', label_hi: '12″ से 18″ तक', min_in: 12.01, max_in: 18, who_en: 'Larger home shrines', who_hi: 'बड़े घरेलू मंदिर', sort: 3 },
    { code: 'S4', label_en: 'Over 18″ up to 30″', label_hi: '18″ से 30″ तक', min_in: 18.01, max_in: 30, who_en: 'Big installations', who_hi: 'बड़ी स्थापनाएँ', sort: 4 },
    { code: 'S5', label_en: 'Above 30″', label_hi: '30″ से ऊपर', min_in: 30.01, max_in: null, who_en: 'Measured and quoted individually', who_hi: 'अलग से नापकर क़ीमत', quote_only: true, sort: 5 },
  ];
  await knex('size_bands').insert(bands);
  const B = Object.fromEntries((await knex('size_bands')).map((r) => [r.code, r.id]));

  // ---------- categories ----------
  const cats = [
    { slug: 'everyday-poshak', name_en: 'Everyday Poshak', name_hi: 'रोज़ की पोशाक', kicker_en: 'Nitya · daily', kicker_hi: 'नित्य · रोज़', pricing_mode: 'size_band', image: 'poshak-everyday-pink.jpg', sort: 1,
      blurb_en: 'Soft cotton and cotton-silk for the daily change. Lined, colour-fast, made to be worn and washed often.', blurb_hi: 'रोज़ बदलने के लिए नरम सूती और कॉटन-सिल्क। लाइनिंग लगी हुई, रंग पक्का, बार-बार पहनने और धोने लायक़।' },
    { slug: 'festival-poshak', name_en: 'Festival Poshak', name_hi: 'त्योहार की पोशाक', kicker_en: 'Utsav · festival', kicker_hi: 'उत्सव · त्योहार', pricing_mode: 'size_band', image: 'poshak-festival-green.jpg', sort: 2,
      blurb_en: 'Banarasi silk, zari borders and seasonal colours — Teej and Janmashtami through Navratri and Diwali.', blurb_hi: 'बनारसी सिल्क, ज़री बॉर्डर और मौसम के रंग — तीज और जन्माष्टमी से लेकर नवरात्रि और दिवाली तक।' },
    { slug: 'shringar', name_en: 'Shringar', name_hi: 'शृंगार', kicker_en: 'Shringar · adornment', kicker_hi: 'शृंगार · सजावट', pricing_mode: 'per_piece', image: 'poshak-shringar-blue.jpg', sort: 3,
      blurb_en: 'Mukut, chandrika, netra, mala, tagdi, payal, kada, bajuband, jooti, chhatra, bansuri — everything the deity wears that is not cloth.', blurb_hi: 'मुकुट, चंद्रिका, नेत्र, माला, तगड़ी, पायल, कड़ा, बाजूबंद, जूती, छत्र, बाँसुरी — कपड़े के अलावा भगवान जी का पूरा शृंगार।' },
    { slug: 'mandir-decor', name_en: 'Mandir Decor', name_hi: 'मंदिर सजावट', kicker_en: 'Mandir · the shrine', kicker_hi: 'मंदिर · पूरा स्थान', pricing_mode: 'per_piece', image: 'singhasan-jhula.jpg', sort: 4,
      blurb_en: 'Backdrops, latkan, Shubh Labh, ghanti, chowki, singhasan covers, chandani, runners — the deity’s asan, and your own sitting asan.', blurb_hi: 'बैकड्रॉप, लटकन, शुभ-लाभ, घंटी, चौकी, सिंहासन कवर, चाँदनी, रनर — भगवान जी का आसन, और आपके बैठने का आसन भी।' },
    { slug: 'idols', name_en: 'Idols', name_hi: 'मूर्तियाँ', kicker_en: 'Murti · the deity', kicker_hi: 'मूर्ति · विग्रह', pricing_mode: 'per_piece', image: 'hero-shrine-dressed.jpg', sort: 5,
      blurb_en: 'The same seven deities we make garments for, supplied as murtis — to dress, or to gift.', blurb_hi: 'जिनकी पोशाकें हम बनाते हैं, उन्हीं सात की मूर्तियाँ — सजाने के लिए, या भेंट देने के लिए।' },
  ];
  await knex('categories').insert(cats);
  const C = Object.fromEntries((await knex('categories')).map((r) => [r.slug, r.id]));

  const sub = (cat, slug, en, hi, sd = false, sort = 0) => ({ category_id: C[cat], slug, name_en: en, name_hi: hi, size_dependent: sd, sort });
  await knex('subcategories').insert([
    sub('shringar', 'mukut', 'Mukut', 'मुकुट', true, 1), sub('shringar', 'chandrika', 'Chandrika', 'चंद्रिका', true, 2),
    sub('shringar', 'netra', 'Netra (eyes)', 'नेत्र', true, 3), sub('shringar', 'bindi', 'Bindi', 'बिंदी', true, 4),
    sub('shringar', 'nath', 'Nose pin', 'नथ', true, 5), sub('shringar', 'earrings', 'Earrings', 'कुंडल', true, 6),
    sub('shringar', 'mala', 'Mala', 'माला', true, 7), sub('shringar', 'necklace', 'Necklace', 'हार', true, 8),
    sub('shringar', 'tagdi', 'Tagdi', 'तगड़ी', true, 9), sub('shringar', 'payal', 'Payal', 'पायल', true, 10),
    sub('shringar', 'kada', 'Kada', 'कड़ा', true, 11), sub('shringar', 'bajuband', 'Bajuband', 'बाजूबंद', true, 12),
    sub('shringar', 'jooti', 'Jooti', 'जूती', true, 13), sub('shringar', 'chhatra', 'Chhatra (umbrella)', 'छत्र', false, 14),
    sub('shringar', 'bansuri', 'Bansuri', 'बाँसुरी', false, 15), sub('shringar', 'purse', 'Purse', 'पर्स', false, 16),
    sub('shringar', 'toys', 'Toys', 'खिलौने', false, 17),
    sub('mandir-decor', 'backdrop', 'Backdrop', 'बैकड्रॉप', false, 1), sub('mandir-decor', 'latkan', 'Latkan', 'लटकन', false, 2),
    sub('mandir-decor', 'shubh-labh', 'Shubh Labh', 'शुभ-लाभ', false, 3), sub('mandir-decor', 'asan', 'Asan (deity)', 'आसन', false, 4),
    sub('mandir-decor', 'sitting-asan', 'Sitting asan (yours)', 'बैठने का आसन', false, 5), sub('mandir-decor', 'ghanti', 'Ghanti', 'घंटी', false, 6),
    sub('mandir-decor', 'chowki', 'Chowki', 'चौकी', false, 7), sub('mandir-decor', 'singhasan-cover', 'Singhasan cover', 'सिंहासन कवर', false, 8),
    sub('mandir-decor', 'chandani', 'Chandani', 'चाँदनी', false, 9), sub('mandir-decor', 'runner', 'Runners', 'रनर', false, 10),
    sub('mandir-decor', 'stickers', 'Stickers', 'स्टिकर', false, 11),
    sub('everyday-poshak', 'cotton', 'Cotton', 'सूती', true, 1), sub('everyday-poshak', 'cotton-silk', 'Cotton-silk', 'कॉटन-सिल्क', true, 2),
    sub('festival-poshak', 'banarasi', 'Banarasi', 'बनारसी', true, 1), sub('festival-poshak', 'zari', 'Zari work', 'ज़री', true, 2), sub('festival-poshak', 'velvet', 'Velvet & winter', 'मख़मल', true, 3),
    sub('idols', 'brass', 'Brass', 'पीतल', false, 1), sub('idols', 'marble', 'Marble', 'संगमरमर', false, 2),
  ]);
  const S = {};
  for (const r of await knex('subcategories')) S[r.slug] = r.id;

  // ---------- deities ----------
  await knex('deities').insert([
    { slug: 'laddu-gopal', name_en: 'Laddu Gopal', name_hi: 'लड्डू गोपाल', garment_en: 'Poshak', garment_hi: 'पोशाक', posture: 'seated', pieces_per_set: 1, sort: 1, image: 'poshak-everyday-pink.jpg',
      intro_en: 'The most dressed deity in Indian homes. Seated, so the poshak is cut short and full at the hem, with the mukut and bansuri as the two pieces of shringar every home wants.', intro_hi: 'भारतीय घरों में सबसे ज़्यादा सजाए जाने वाले भगवान जी। बैठे हुए, इसलिए पोशाक छोटी और घेरदार कटती है; मुकुट और बाँसुरी वह दो शृंगार हैं जो हर घर चाहता है।' },
    { slug: 'radha-krishna', name_en: 'Radha Krishna', name_hi: 'राधा कृष्ण', garment_en: 'Poshak, as a pair', garment_hi: 'जोड़ी की पोशाक', posture: 'standing', pieces_per_set: 2, sort: 2, image: 'radha-krishna-dressed.jpg',
      intro_en: 'Always dressed as a pair — Radha’s lehenga and chunri, Krishna’s dhoti and patka, cut to match.', intro_hi: 'हमेशा जोड़ी में — राधा जी का लहँगा-चुनरी और कृष्ण जी की धोती-पटका, एक-दूसरे से मिलते हुए।' },
    { slug: 'ram-darbar', name_en: 'Ram Darbar', name_hi: 'राम दरबार', garment_en: 'A set of four', garment_hi: 'चार का सेट', posture: 'set', pieces_per_set: 4, sort: 3, image: 'dressed-deities-row.jpg',
      intro_en: 'Ram, Sita, Lakshman and Hanuman — four garments made as one set, in one fabric family.', intro_hi: 'राम, सीता, लक्ष्मण और हनुमान — एक ही कपड़े में बने चार वस्त्रों का सेट।' },
    { slug: 'mata-ji', name_en: 'Mata ji / Durga ji', name_hi: 'माता जी / दुर्गा जी', garment_en: 'Chunri & poshak', garment_hi: 'चुनरी और पोशाक', posture: 'standing', pieces_per_set: 1, sort: 4, image: 'marble-shrine-deities.jpg',
      intro_en: 'Chunri first, then the poshak beneath. Navratri is nine of these, in nine colours.', intro_hi: 'पहले चुनरी, फिर नीचे पोशाक। नवरात्रि में नौ रंगों में नौ।' },
    { slug: 'lakshmi-narayan', name_en: 'Lakshmi Narayan', name_hi: 'लक्ष्मी नारायण', garment_en: 'Poshak, as a pair', garment_hi: 'जोड़ी की पोशाक', posture: 'standing', pieces_per_set: 2, sort: 5, image: 'carved-marble-mandir.jpg',
      intro_en: 'A matched pair. Diwali is their season; the pack for it includes the idols themselves.', intro_hi: 'मिलती-जुलती जोड़ी। दिवाली इनका मौसम है; उसके पैक में मूर्तियाँ भी शामिल हैं।' },
    { slug: 'ganesh-ji', name_en: 'Ganesh ji', name_hi: 'गणेश जी', garment_en: 'Dhoti & angavastram', garment_hi: 'धोती और अंगवस्त्रम', posture: 'seated', pieces_per_set: 1, sort: 6, image: 'diya-lit-mandir.jpg',
      intro_en: 'Dhoti and angavastram, with pagdi, mukut and mala as shringar. The Chaturthi pack brings the idol with it.', intro_hi: 'धोती और अंगवस्त्रम, साथ में पगड़ी, मुकुट और माला। चतुर्थी पैक में मूर्ति भी आती है।' },
    { slug: 'sai-baba', name_en: 'Sai Baba', name_hi: 'साईं बाबा', garment_en: 'Kafni', garment_hi: 'कफ़नी', posture: 'seated', pieces_per_set: 1, sort: 7, image: 'om-panel-shrine.jpg',
      intro_en: 'The kafni — a long, plain robe — in cotton for every day and silk for Thursdays.', intro_hi: 'कफ़नी — लंबा, सादा चोग़ा — रोज़ के लिए सूती, गुरुवार के लिए सिल्क।' },
  ]);
  const D = Object.fromEntries((await knex('deities')).map((r) => [r.slug, r.id]));

  // ---------- festivals ----------
  await knex('festivals').insert([
    { slug: 'teej', name_en: 'Teej', name_hi: 'तीज', season_en: 'Sawan', season_hi: 'सावन', sort: 1, image: 'singhasan-jhula.jpg',
      pack_en: 'Green poshak for the season, and the jhula — a dressed swing, set and hung.', pack_hi: 'मौसम के हिसाब से हरी पोशाक, और झूला — सजाकर टाँगा हुआ।' },
    { slug: 'janmashtami', name_en: 'Janmashtami', name_hi: 'जन्माष्टमी', season_en: 'Monsoon', season_hi: 'वर्षा', sort: 2, image: 'poshak-festival-green.jpg',
      pack_en: 'Festive poshak for Laddu Gopal ji, the panchamrit snan set, shringar, backdrop and the jhula.', pack_hi: 'लड्डू गोपाल जी के लिए उत्सव पोशाक, पंचामृत स्नान सामग्री, शृंगार, बैकड्रॉप और झूला।' },
    { slug: 'ganesh-chaturthi', name_en: 'Ganesh Chaturthi', name_hi: 'गणेश चतुर्थी', season_en: 'Bhadrapad', season_hi: 'भाद्रपद', sort: 3, image: 'diya-lit-mandir.jpg',
      pack_en: 'Ganesh ji idol, backdrop, shringar — pagdi, mukut, mala, patka and dhoti — chowki and the festive decor.', pack_hi: 'गणेश जी की मूर्ति, बैकड्रॉप, शृंगार — पगड़ी, मुकुट, माला, पटका और धोती — चौकी और उत्सव सजावट।' },
    { slug: 'navratri', name_en: 'Navratri', name_hi: 'नवरात्रि', season_en: 'Autumn', season_hi: 'शरद', sort: 4, image: 'marble-shrine-deities.jpg',
      pack_en: 'Nine poshak in nine colours for Mata ji, made as one matched set, with asan, shringar, chowki, backdrop and decor. Changed each day.', pack_hi: 'माता जी के लिए नौ रंगों की नौ पोशाकें, एक ही मिलते-जुलते सेट में, आसन, शृंगार, चौकी, बैकड्रॉप और सजावट के साथ। हर दिन बदली जाती हैं।' },
    { slug: 'diwali', name_en: 'Diwali', name_hi: 'दिवाली', season_en: 'Autumn', season_hi: 'शरद', sort: 5, image: 'carved-marble-mandir.jpg',
      pack_en: 'Lakshmi ji and Ganesh ji idols, hatri, rangoli, panel sets, candles and candle stands, decorative candles, urli and floor stands.', pack_hi: 'लक्ष्मी जी और गणेश जी की मूर्तियाँ, हटरी, रंगोली, पैनल सेट, मोमबत्तियाँ और स्टैंड, सजावटी मोमबत्तियाँ, उरली और खड़े स्टैंड।' },
  ]);
  const F = Object.fromEntries((await knex('festivals')).map((r) => [r.slug, r.id]));

  // ---------- visit plans & combo ladder (decided prices) ----------
  await knex('visit_plans').insert([
    { footprint: '3x3', label_en: 'Up to 3×3 ft', label_hi: '3×3 फ़ुट तक', monthly_price: 699, quarterly_price: 1899, sort: 1 },
    { footprint: '5x5', label_en: 'Up to 5×5 ft', label_hi: '5×5 फ़ुट तक', monthly_price: 1199, quarterly_price: 3299, sort: 2 },
    { footprint: '5x8', label_en: 'Up to 5×8 ft', label_hi: '5×8 फ़ुट तक', monthly_price: 1499, quarterly_price: 4099, sort: 3 },
    { footprint: '6x10', label_en: 'Up to 6×10 ft', label_hi: '6×10 फ़ुट तक', monthly_price: 2299, quarterly_price: 6299, sort: 4 },
  ]);
  await knex('combo_discounts').insert([
    { deity_count: 1, discount_pct: 0, is_estimate: true }, { deity_count: 2, discount_pct: 5, is_estimate: true },
    { deity_count: 3, discount_pct: 10, is_estimate: true }, { deity_count: 4, discount_pct: 15, is_estimate: true },
  ]);

  // ---------- starter products ----------
  // ESTIMATE band prices — to be set with the master tailor. price_is_estimate=1 shows a note in admin.
  const strip = (o) => { const { _img, ...rest } = o; return rest; };
  const P = (o) => o;
  const est = { S1: 750, S2: 1250, S3: 1950, S4: 2900 };
  const fest = { S1: 1450, S2: 2400, S3: 3600, S4: 5200 };
  const poshak = async (p0, deities, prices, festivals = []) => {
    const { _img, ...p } = p0; p._img = _img; // keep for image row
    const [id] = await knex('products').insert({ ...strip(p), price_is_estimate: true });
    await knex('product_variants').insert(Object.entries(prices).map(([code, price]) => ({ product_id: id, size_band_id: B[code], price, stock: 12, lead_days: code === 'S4' ? 14 : 7 })));
    await knex('product_deities').insert(deities.map((d) => ({ product_id: id, deity_id: D[d] })));
    if (festivals.length) await knex('product_festivals').insert(festivals.map((f) => ({ product_id: id, festival_id: F[f] })));
    await knex('product_images').insert({ product_id: id, path: p._img, alt_en: p.name_en, alt_hi: p.name_hi, sort: 0 });
    return id;
  };
  const piece = async (p, deities = [], festivals = []) => {
    const [id] = await knex('products').insert(strip(p));
    if (deities.length) await knex('product_deities').insert(deities.map((d) => ({ product_id: id, deity_id: D[d] })));
    if (festivals.length) await knex('product_festivals').insert(festivals.map((f) => ({ product_id: id, festival_id: F[f] })));
    await knex('product_images').insert({ product_id: id, path: p._img, alt_en: p.name_en, alt_hi: p.name_hi, sort: 0 });
    return id;
  };

  const everyday = [
    { slug: 'gulabi-moti-cotton-silk-poshak', name_en: 'Gulabi Moti — cotton-silk poshak', name_hi: 'गुलाबी मोती — कॉटन-सिल्क पोशाक', category_id: C['everyday-poshak'], subcategory_id: S['cotton-silk'], fabric_en: 'Cotton-silk, pearl edging', fabric_hi: 'कॉटन-सिल्क, मोती की किनारी', _img: 'poshak-everyday-pink.jpg', is_featured: true, sort: 1,
      description_en: 'Blush cotton-silk with a soft cotton lining and a hand-set pearl edge. Made for the daily change — colour-fast, and cut so nothing presses against the deity.', description_hi: 'हल्के गुलाबी कॉटन-सिल्क में नरम सूती लाइनिंग और हाथ से लगी मोती की किनारी। रोज़ बदलने के लिए — रंग पक्का, और ऐसी कटाई कि कुछ भी भगवान जी पर दबे नहीं।' },
    { slug: 'kesari-mulmul-poshak', name_en: 'Kesari — mulmul cotton poshak', name_hi: 'केसरी — मलमल सूती पोशाक', category_id: C['everyday-poshak'], subcategory_id: S['cotton'], fabric_en: 'Mulmul cotton', fabric_hi: 'मलमल सूती', _img: 'poshak-everyday-pink.jpg', sort: 2,
      description_en: 'Saffron mulmul, double-layered so it is opaque without stiffness. The lightest garment we make; ideal for summer.', description_hi: 'केसरिया मलमल, दोहरी परत ताकि पारदर्शी न हो पर सख़्त भी न हो। हमारा सबसे हल्का वस्त्र; गर्मियों के लिए।' },
    { slug: 'neel-cotton-silk-poshak', name_en: 'Neel — cotton-silk poshak', name_hi: 'नील — कॉटन-सिल्क पोशाक', category_id: C['everyday-poshak'], subcategory_id: S['cotton-silk'], fabric_en: 'Cotton-silk', fabric_hi: 'कॉटन-सिल्क', _img: 'poshak-shringar-blue.jpg', sort: 3,
      description_en: 'Pale blue cotton-silk with a fine gota edge. Lined. The colour most families keep for Thursdays.', description_hi: 'हल्के नीले कॉटन-सिल्क में बारीक गोटे की किनारी। लाइनिंग सहित। जो रंग ज़्यादातर परिवार गुरुवार के लिए रखते हैं।' },
  ];
  for (const p of everyday) await poshak(P(p), ['laddu-gopal', 'ganesh-ji', 'sai-baba'], est);

  const festive = [
    { slug: 'hara-banarasi-zari-poshak', name_en: 'Hara Banarasi — zari poshak', name_hi: 'हरा बनारसी — ज़री पोशाक', category_id: C['festival-poshak'], subcategory_id: S['banarasi'], fabric_en: 'Banarasi silk, real zari', fabric_hi: 'बनारसी सिल्क, असली ज़री', _img: 'poshak-festival-green.jpg', is_featured: true, sort: 1,
      description_en: 'Emerald Banarasi with a woven zari border and a matching patka. Lined in soft cotton so the silk never touches the deity directly.', description_hi: 'पन्ना-हरे बनारसी में बुनी ज़री की किनारी और मिलता पटका। नरम सूती लाइनिंग ताकि सिल्क सीधे भगवान जी को न छुए।' , fest: ['janmashtami', 'teej'] },
    { slug: 'navratri-nau-rang-set', name_en: 'Navratri — nine-colour chunri & poshak set', name_hi: 'नवरात्रि — नौ रंगों का चुनरी-पोशाक सेट', category_id: C['festival-poshak'], subcategory_id: S['zari'], fabric_en: 'Silk-blend, nine matched colours', fabric_hi: 'सिल्क-ब्लेंड, नौ मिलते रंग', _img: 'marble-shrine-deities.jpg', is_featured: true, sort: 2,
      description_en: 'Nine chunri-and-poshak sets in the nine Navratri colours, cut as one family so the shrine changes each day without a single mismatch. Made to order; book before Pitru Paksha ends.', description_hi: 'नवरात्रि के नौ रंगों में नौ चुनरी-पोशाक सेट, एक ही परिवार की तरह कटे ताकि हर दिन मंदिर बदले और कहीं बेमेल न लगे। ऑर्डर पर; पितृ पक्ष ख़त्म होने से पहले बुक कीजिए।', fest: ['navratri'] },
    { slug: 'makhmal-sardi-poshak', name_en: 'Makhmal — velvet winter poshak', name_hi: 'मख़मल — सर्दियों की पोशाक', category_id: C['festival-poshak'], subcategory_id: S['velvet'], fabric_en: 'Velvet, quilted lining', fabric_hi: 'मख़मल, रुई भरी लाइनिंग', _img: 'radha-krishna-dressed.jpg', sort: 3,
      description_en: 'Maroon velvet with a light quilted lining for the cold months. Comes with a matching razai for the deity’s bed.', description_hi: 'ठंड के महीनों के लिए हल्की रुई भरी लाइनिंग वाला गहरा लाल मख़मल। साथ में भगवान जी के बिस्तर की मिलती रज़ाई।', fest: ['diwali'] },
  ];
  for (const p of festive) { const fs = p.fest; delete p.fest; await poshak(P(p), ['laddu-gopal', 'radha-krishna', 'mata-ji', 'lakshmi-narayan'], fest, fs); }

  // per-piece items: shringar, decor, idols (prices are ESTIMATES)
  const pieces = [
    { slug: 'jadau-mukut-laddu-gopal', name_en: 'Jadau mukut', name_hi: 'जड़ाऊ मुकुट', category_id: C['shringar'], subcategory_id: S['mukut'], base_price: 650, price_is_estimate: true, stock: 6, _img: 'poshak-shringar-blue.jpg', is_featured: true, d: ['laddu-gopal'], description_en: 'Stone-set mukut with a peacock feather. Sized by band — tell us your deity’s size at checkout.', description_hi: 'मोरपंख सहित पत्थर जड़ा मुकुट। नाप के अनुसार — चेकआउट पर अपने विग्रह का नाप बताइए।' },
    { slug: 'moti-mala-set', name_en: 'Moti mala, set of three', name_hi: 'मोती माला, तीन का सेट', category_id: C['shringar'], subcategory_id: S['mala'], base_price: 380, price_is_estimate: true, stock: 20, _img: 'poshak-shringar-blue.jpg', d: ['laddu-gopal', 'radha-krishna', 'lakshmi-narayan'], description_en: 'Three graduated pearl malas. The everyday shringar most homes reach for first.', description_hi: 'तीन अलग लंबाई की मोती मालाएँ। रोज़ का वह शृंगार जो ज़्यादातर घर सबसे पहले उठाते हैं।' },
    { slug: 'bansuri-brass', name_en: 'Bansuri, brass', name_hi: 'बाँसुरी, पीतल', category_id: C['shringar'], subcategory_id: S['bansuri'], base_price: 240, price_is_estimate: true, stock: 15, _img: 'poshak-everyday-pink.jpg', d: ['laddu-gopal', 'radha-krishna'], description_en: 'Small brass bansuri, sized to the hand of a 6–12″ Laddu Gopal.', description_hi: 'छोटी पीतल की बाँसुरी, 6–12″ लड्डू गोपाल के हाथ के नाप की।' },
    { slug: 'payal-kada-set', name_en: 'Payal & kada set', name_hi: 'पायल और कड़ा सेट', category_id: C['shringar'], subcategory_id: S['payal'], base_price: 320, price_is_estimate: true, stock: 10, _img: 'radha-krishna-dressed.jpg', d: ['radha-krishna', 'mata-ji', 'lakshmi-narayan'], description_en: 'Ghungroo payal with matching kada, for a standing deity.', description_hi: 'घुँघरू वाली पायल और मिलता कड़ा, खड़े विग्रह के लिए।' },
    { slug: 'zari-backdrop-mata-ji', name_en: 'Zari backdrop — for Mata ji', name_hi: 'ज़री बैकड्रॉप — माता जी के लिए', category_id: C['mandir-decor'], subcategory_id: S['backdrop'], base_price: 1800, price_is_estimate: true, stock: 4, _img: 'marble-shrine-deities.jpg', is_featured: true, d: ['mata-ji'], f: ['navratri'], description_en: 'A hung backdrop with zari work, sized to sit behind a standing Mata ji. The largest visible surface in the shrine — bought once, kept for years.', description_hi: 'ज़री के काम वाला टँगने वाला बैकड्रॉप, खड़ी माता जी के पीछे बैठने के नाप का। मंदिर की सबसे बड़ी दिखने वाली सतह — एक बार ली, सालों चली।' },
    { slug: 'singhasan-cover-runner-set', name_en: 'Singhasan cover & runner set', name_hi: 'सिंहासन कवर और रनर सेट', category_id: C['mandir-decor'], subcategory_id: S['singhasan-cover'], base_price: 1450, price_is_estimate: true, stock: 5, _img: 'fitted-step-runners.jpg', description_en: 'Fitted cover for the singhasan and runners cut to your mandir’s steps. Tell us the footprint; we cut to it.', description_hi: 'सिंहासन के लिए फ़िट कवर और आपके मंदिर की सीढ़ियों के नाप के रनर। आकार बताइए; हम उसी पर काटते हैं।' },
    { slug: 'jhula-dressed', name_en: 'Jhula, dressed', name_hi: 'झूला, सजा हुआ', category_id: C['mandir-decor'], subcategory_id: S['asan'], base_price: 2200, price_is_estimate: true, stock: 3, one_of_one: false, _img: 'singhasan-jhula.jpg', d: ['laddu-gopal', 'radha-krishna'], f: ['teej', 'janmashtami'], description_en: 'A carved swing with its bedding, drapes and canopy — set and hung for Teej and Janmashtami.', description_hi: 'बिस्तर, पर्दे और छतरी सहित नक़्क़ाशीदार झूला — तीज और जन्माष्टमी के लिए सजाकर टाँगा हुआ।' },
    { slug: 'sitting-asan-devotee', name_en: 'Sitting asan — for you', name_hi: 'बैठने का आसन — आपके लिए', category_id: C['mandir-decor'], subcategory_id: S['sitting-asan'], base_price: 690, price_is_estimate: true, stock: 8, _img: 'diya-lit-mandir.jpg', description_en: 'A quilted cotton asan for the person who sits before the shrine. Washable; sized for one.', description_hi: 'मंदिर के सामने बैठने वाले के लिए रुई भरा सूती आसन। धोने लायक़; एक व्यक्ति के नाप का।' },
    { slug: 'shubh-labh-brass', name_en: 'Shubh Labh, brass', name_hi: 'शुभ-लाभ, पीतल', category_id: C['mandir-decor'], subcategory_id: S['shubh-labh'], base_price: 420, price_is_estimate: true, stock: 12, _img: 'om-panel-shrine.jpg', f: ['diwali'], description_en: 'Cast brass Shubh and Labh for the doorway or the mandir front.', description_hi: 'द्वार या मंदिर के सामने के लिए ढले पीतल के शुभ और लाभ।' },
    { slug: 'laddu-gopal-brass-idol', name_en: 'Laddu Gopal — brass, size 2', name_hi: 'लड्डू गोपाल — पीतल, साइज़ 2', category_id: C['idols'], subcategory_id: S['brass'], base_price: 1600, price_is_estimate: true, stock: 4, _img: 'poshak-everyday-pink.jpg', d: ['laddu-gopal'], description_en: 'Brass Laddu Gopal in market size 2 (about 8″), which is our band S2. Comes with a first cotton poshak.', description_hi: 'बाज़ार के साइज़ 2 (लगभग 8″) में पीतल के लड्डू गोपाल, यानी हमारा नाप S2। पहली सूती पोशाक के साथ।' },
    { slug: 'ganesh-ji-marble-idol', name_en: 'Ganesh ji — marble', name_hi: 'गणेश जी — संगमरमर', category_id: C['idols'], subcategory_id: S['marble'], base_price: 2400, price_is_estimate: true, stock: 3, _img: 'diya-lit-mandir.jpg', d: ['ganesh-ji'], f: ['ganesh-chaturthi', 'diwali'], description_en: 'Hand-finished marble Ganesh ji, seated, about 10″. Dhoti and angavastram in band S2 fit.', description_hi: 'हाथ से तराशे संगमरमर के गणेश जी, बैठे हुए, लगभग 10″। नाप S2 की धोती और अंगवस्त्रम फ़िट आते हैं।' },
    { slug: 'lakshmi-ganesh-diwali-pair', name_en: 'Lakshmi–Ganesh Diwali pair', name_hi: 'लक्ष्मी–गणेश दिवाली जोड़ी', category_id: C['idols'], subcategory_id: S['brass'], base_price: 3200, price_is_estimate: true, stock: 5, _img: 'carved-marble-mandir.jpg', d: ['lakshmi-narayan', 'ganesh-ji'], f: ['diwali'], description_en: 'The Diwali pair in brass, with a hatri. Order by Dussehra to have them dressed and in place for Dhanteras.', description_hi: 'पीतल में दिवाली की जोड़ी, हटरी सहित। धनतेरस तक सज कर पहुँचे, इसके लिए दशहरे तक ऑर्डर कीजिए।' },
  ];
  for (const p of pieces) { const d = p.d || [], f = p.f || []; delete p.d; delete p.f; await piece(P(p), d, f); }
  // remove the helper key from rows (knex would have thrown on unknown column if we had inserted it — we stripped)

  // ---------- testimonials (names used with permission; flat numbers deliberately dropped) ----------
  await knex('testimonials').insert([
    { quote_en: 'Maansi has amazing things for Kanha ji, and her Janmashtami collection is wonderful. You get everything temple-related under one roof — lovely quality at a very reasonable price.', quote_hi: 'मानसी जी के पास कान्हा जी के लिए बहुत सुंदर चीज़ें हैं, और उनका जन्माष्टमी कलेक्शन कमाल का है। मंदिर का सारा सामान एक ही छत के नीचे मिल जाता है — बहुत अच्छी क्वालिटी, और दाम भी वाजिब।', who_en: 'Dr. Pooja A.', who_hi: 'डॉ. पूजा ए.', sort: 1 },
    { quote_en: 'All praise to Mansi ji for curating such an incredible range of deity dresses and pooja accessories. It is such a relief to get everything in one place, especially since a collection this unique is rare to find elsewhere.', quote_hi: 'मानसी जी की तारीफ़ जितनी की जाए कम है — भगवान जी की पोशाकें और पूजा का सामान, इतना बढ़िया संग्रह। सब कुछ एक जगह मिल जाना बहुत राहत की बात है, और ऐसा कलेक्शन कहीं और मिलता ही नहीं।', who_en: 'Mamta', who_hi: 'ममता', sort: 2 },
    { quote_en: 'Mansi ji has a beautiful collection of vastra for all our deities, and really makes our lives easy — everything under one roof.', quote_hi: 'मानसी जी के पास हमारे सभी भगवान जी के वस्त्रों का सुंदर संग्रह है, और सब कुछ एक ही छत के नीचे मिल जाने से ज़िंदगी सचमुच आसान हो जाती है।', who_en: 'Monika S.', who_hi: 'मोनिका एस.', sort: 3 },
    { quote_en: 'Mansi ji has a beautiful collection of all pooja needs. From divine dresses to accessories, one can find everything at one place without any hassle.', quote_hi: 'मानसी जी के पास पूजा की हर ज़रूरत का सुंदर संग्रह है। भगवान जी की पोशाकों से लेकर शृंगार तक, सब कुछ एक ही जगह, बिना किसी परेशानी के।', who_en: 'Charul', who_hi: 'चारुल', sort: 4 },
    { quote_en: 'Very beautiful collection. Got beautiful dresses and many lovely decorative items.', quote_hi: 'बहुत सुंदर कलेक्शन। सुंदर पोशाकें और बहुत सारी प्यारी सजावट की चीज़ें मिलीं।', who_en: 'Sunita', who_hi: 'सुनीता', sort: 5 },
    { quote_en: 'Dress your divine this Janmashtami. Beautiful collection.', quote_hi: 'इस जन्माष्टमी अपने भगवान जी को सजाइए। बहुत सुंदर कलेक्शन।', who_en: 'Raina A.', who_hi: 'रैना ए.', sort: 6 },
  ]);

  // ---------- FAQ ----------
  await knex('faqs').insert([
    { q_en: 'What is a dress combo pack?', q_hi: 'ड्रेस कॉम्बो पैक क्या है?', a_en: 'Most homes have more than one deity. A combo pack lets you pick every one in your mandir, give each one its size band, and receive custom dresses for all of them together, every month or every quarter, on one recurring plan.', a_hi: 'ज़्यादातर घरों में एक से ज़्यादा भगवान जी होते हैं। कॉम्बो पैक में आप अपने मंदिर के सभी विग्रह चुन लेते हैं, हर एक का नाप बता देते हैं, और सबकी पोशाकें एक साथ आती हैं, हर महीने या हर तिमाही, एक ही चलते हुए प्लान पर।', sort: 1 },
    { q_en: 'Is the dress pack part of the visit plan?', q_hi: 'क्या ड्रेस पैक विज़िट प्लान में शामिल है?', a_en: 'No — they are two separate plans and you can take either on its own. The visit plan is priced by the size of your mandir and covers the clearing, cleaning, dressing and takeback. The dress combo pack is priced by the deities you choose and each idol’s size band. Households that take both get a bundled rate.', a_hi: 'नहीं — ये दो अलग प्लान हैं और आप कोई भी अकेले ले सकते हैं। विज़िट प्लान की क़ीमत आपके मंदिर के आकार पर है; ड्रेस कॉम्बो पैक की क़ीमत आपके चुने विग्रहों और उनके नाप पर। दोनों लेने वाले परिवारों को जोड़कर कम दर मिलती है।', sort: 2 },
    { q_en: 'How do I get the size right?', q_hi: 'नाप सही कैसे लूँ?', a_en: 'Measure your deity from base to crown of the head — not including the mukut, and not including the singhasan or chowki underneath. S1 is 6″ and under, S2 over 6″ up to 12″, S3 over 12″ up to 18″, S4 over 18″ up to 30″, and above 30″ is S5, quoted individually. A seated deity and a standing one at the same height need different garments, so we ask which deity as well. On the first visit we measure everything and keep it on file.', a_hi: 'भगवान जी को चरण से सिर तक नापिए — मुकुट छोड़कर, और नीचे का सिंहासन या चौकी छोड़कर। S1 यानी 6″ तक, S2 यानी 6″ से 12″, S3 यानी 12″ से 18″, S4 यानी 18″ से 30″, और 30″ से ऊपर S5 जिसकी क़ीमत अलग से बताई जाती है। पहली विज़िट पर हम सब नापकर दर्ज कर लेते हैं।', sort: 3 },
    { q_en: 'How do I choose the fabric each time?', q_hi: 'हर बार कपड़ा कैसे चुनूँ?', a_en: 'Three weeks before each cycle we send you a link on WhatsApp. It shows what was sent last time and this cycle’s fabrics and designs. You tap what you want for each deity — about thirty seconds, no phone call. We never send the same design to the same home twice in a year.', a_hi: 'हर बार से तीन हफ़्ते पहले हम WhatsApp पर एक लिंक भेजते हैं। उसमें दिखता है कि पिछली बार क्या गया था और इस बार क्या है। हर भगवान जी के लिए आप चुन लीजिए — तीस सेकंड, कोई फ़ोन कॉल नहीं।', sort: 4 },
    { q_en: 'Why don’t you do flowers or brass polishing?', q_hi: 'आप फूल और पीतल की पॉलिश क्यों नहीं करते?', a_en: 'Because we would rather do less, excellently. Fresh flowers on a fortnightly visit look wrong within two days. Brass polishing is chemical work on pieces that are often plated, antique or inherited, and one damaged piece costs more than the subscription.', a_hi: 'क्योंकि हमें कम काम, पर हर बार बहुत अच्छा करना ठीक लगता है। पंद्रह दिन में एक विज़िट पर लाए फूल दो दिन में मुरझा जाते हैं। पॉलिश उन चीज़ों पर रसायन का काम है जो अक्सर मुलम्मे की या पुरखों की होती हैं।', sort: 5 },
    { q_en: 'Who actually touches the idol?', q_hi: 'विग्रह को हाथ कौन लगाता है?', a_en: 'You choose, and your choice is saved on your file. The default is that our sevadar prepares everything and hands the garment to a family member for the final dressing. Others ask us to do it fully. Both are entirely standard.', a_hi: 'यह आप तय करते हैं, और आपका फ़ैसला आपकी फ़ाइल में दर्ज रहता है। सामान्य नियम यह है कि सेवादार सब तैयार करके अंतिम वस्त्र परिवार के किसी सदस्य को दे देते हैं। कुछ कहते हैं कि पूरा हम ही करें। दोनों सामान्य हैं।', sort: 6 },
    { q_en: 'What happens to the old poshak you take away?', q_hi: 'पुरानी पोशाक का क्या होता है?', a_en: 'Returned garments are cleaned and reworked into asan and chandani for shrines, cut into wicks for temple lamps, used as covers for scripture, or ceremonially burnt with the ash returned to you. Deity cloth is never resold, shredded into rags, or made into anything worn on the body.', a_hi: 'लौटे वस्त्र साफ़ करके आसन और चाँदनी बनाई जाती है, दीपक की बत्तियाँ काटी जाती हैं, ग्रंथों के आवरण बनाए जाते हैं, या विधिपूर्वक अग्नि में अर्पित करके भस्म आपको लौटा दी जाती है। भगवान जी का वस्त्र न बेचा जाता है, न कतरन बनता है।', sort: 7 },
    { q_en: 'Which areas do you serve right now?', q_hi: 'अभी आप कहाँ सेवा देते हैं?', a_en: 'Visits are running in Noida Sector 107 only — one sector, deliberately, so every household gets the same standard. Dress combo packs and everything in the shop are delivered anywhere in India. Leave your pin code and it decides where we open next.', a_hi: 'विज़िट केवल नोएडा सेक्टर 107 में — जानबूझकर एक ही सेक्टर, ताकि हर घर को एक जैसा स्तर मिले। ड्रेस पैक और दुकान का सारा सामान पूरे भारत में भेजा जाता है। अपना पिन कोड छोड़िए, अगला इलाक़ा उसी से तय होता है।', sort: 8 },
    { q_en: 'Can I pause or cancel?', q_hi: 'क्या रोक या बंद कर सकते हैं?', a_en: 'Pause any month from your account, and cancel any time before your next billing date. Festival packs can be rescheduled up to seven days before the reserved visit.', a_hi: 'अपने खाते से किसी भी महीने रोक सकते हैं, और अगली बिलिंग तारीख़ से पहले कभी भी बंद कर सकते हैं। त्योहार पैक विज़िट से सात दिन पहले तक बदले जा सकते हैं।', sort: 9 },
  ]);

  await knex('settings').insert([
    { key: 'whatsapp_number', value: '919355110366' },
    { key: 'launch_sector', value: 'Noida Sector 107' },
    { key: 'free_shipping_over', value: '1499' },
    { key: 'shipping_flat', value: '79' },
    { key: 'promise_en', value: 'Make your Bhagwan ji feel comfortable. Every day.' },
    { key: 'promise_hi', value: 'अपने भगवान जी को आराम में रखिए। हर दिन।' },
  ]);

  await knex('sectors').insert([{ name: 'Noida Sector 107', city: 'Noida', pincode: '201304', is_live: true, visit_capacity_per_day: 8 }]);
};

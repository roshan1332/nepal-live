/*
 * Tools page (/tools). Converters and calculators that use official data:
 * BS ↔ AD (Hamro Patro calendar via /api/calendar), NPR converter (Nepal
 * Rastra Bank via /api/forex), gold & silver (FEGOD daily rate via
 * /api/gold-hamropatro), loan EMI (arithmetic), NEA electricity bill (the
 * published consumer tariff, below), public holidays (/api/calendar/upcoming),
 * IPO calendar (/api/ipo — ShareSansar, unofficial, labelled as such) and the
 * emergency numbers on the government page.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc;

  NL.i18n.add({
    en: {
      kicker: 'Nepal Tools', h1: 'Useful <em>tools</em>', sub: 'Everyday converters and calculators for Nepal — using official rates, tariffs and calendars, with the source on each.',
      navDate: 'Date converter', navFx: 'Currency', navGold: 'Gold', navEmi: 'Loan EMI', navElec: 'Electricity bill', navHol: 'Holidays', navIpo: 'IPO calendar', navEm: 'Emergency',
      dateH: 'Nepali date converter', year: 'Year (BS)', month: 'Month', day: 'Day', adDate: 'Date (AD)', convert: 'Convert', srcCal: 'Calendar: Hamro Patro · 2070–2100 BS',
      bsRange: 'Enter a BS year from 2070 to 2100 and a day from 1 to 32.', adRange: 'Choose a date between 14 April 2013 and 31 December 2043.',
      noSuchDay: '{m} has {n} days.', holiday: 'Public holiday', errCal: 'The calendar isn’t available right now.',
      fxH: 'NPR currency converter', amount: 'Amount', currency: 'Currency', srcFx: 'Nepal Rastra Bank official rate', fxRateFor: 'NRB mid rate for {d}', errFx: 'Exchange rates aren’t available right now.',
      goldH: 'Gold & silver calculator', metal: 'Metal', fineGold: 'Fine gold (hallmark)', silver: 'Silver', weight: 'Weight', unit: 'Unit', tola: 'tola', gram: 'gram', g10: '10 grams', lal: 'lal',
      goldNote: 'Official daily rate per tola (1 tola = 11.6638 g = 100 lal). Jewellers add making charges — ask for them separately.',
      srcGold: 'Hamro Patro / FEGOD daily rate', atRate: 'at Rs {p} per tola · rate for {d}', errGold: 'Gold and silver rates aren’t available right now.',
      emiH: 'Loan EMI calculator', loan: 'Loan amount (Rs)', rate: 'Interest (% a year)', tenure: 'Tenure', years: 'years', months: 'months',
      emiNote: 'Standard reducing-balance EMI. Banks may add service fees or change rates — check your loan offer.',
      perMonth: 'per month for {n} months', totalInt: 'Total interest', totalPay: 'Total payment', principal: 'Principal', interest: 'Interest', emiBad: 'Enter a loan amount, an interest rate and a tenure.',
      elH: 'Electricity bill calculator', meter: 'Meter', units: 'Units (kWh)', threeA: 'Three-phase, up to 10 kVA', threeB: 'Three-phase, above 10 kVA',
      season: 'Billing month', seasonA: 'Asar – Kartik', seasonB: 'Mangsir – Jestha',
      elNote: 'Domestic tariff for low-voltage consumers. Excludes late-payment fines or early-payment rebates on your bill.',
      srcElec: 'NEA consumer tariff · ERC decision 2078/07/08, billed from Poush 2078', minCharge: 'Minimum charge', energy: 'Energy charge', total: 'Total',
      unitsRange: '{a}–{b} units', unitsFrom: 'above {a} units', upTo20: 'Up to 20 units on a 5 A meter: minimum charge only', allUnits: 'all {n} units', elBad: 'Enter the units on your bill (a whole number).',
      holH: 'Upcoming public holidays', srcHol: 'Hamro Patro calendar · official list: moha.gov.np', fullCal: 'Full calendar →', noHol: 'No public holidays in the next 90 days.',
      someGroups: 'some groups only', errHol: 'Holiday dates aren’t available right now.',
      ipoH: 'IPO calendar', srcIpo: 'ShareSansar issue tables (unofficial) · apply on MeroShare', open: 'Open now', soon: 'Coming soon',
      k_ipo: 'IPO', k_fpo: 'FPO', k_right: 'Right share', k_mutual: 'Mutual fund', k_local: 'IPO · local residents', k_migrant: 'IPO · Nepalis working abroad',
      units_n: '{n} units', perUnit: 'Rs {p} per unit', closes: 'closes {d}', opens: 'opens {d}', datesTba: 'dates not announced yet', mgr: 'Issue manager: {m}', ratio: 'ratio {r}',
      noIpo: 'No IPO, FPO, right-share or mutual fund issue is open or announced right now.', errIpo: 'The IPO calendar isn’t available right now.',
      ipoNote: 'From ShareSansar’s public issue tables — confirm dates on MeroShare or with your issue manager before applying.',
      emH: 'Emergency numbers', emPolice: 'Police', emFire: 'Fire brigade', emAmb: 'Ambulance', emTraffic: 'Traffic police', emTourist: 'Tourist police',
      govDir: 'Passports, licences, PAN, citizenship and more', govLink: 'Government services →'
    },
    ne: {
      kicker: 'नेपाल उपकरण', h1: 'उपयोगी <em>उपकरण</em>', sub: 'नेपालका लागि दैनिक रूपान्तरक र क्याल्कुलेटर — आधिकारिक दर, महसुल र पात्रो अनुसार, हरेकमा स्रोतसहित।',
      navDate: 'मिति रूपान्तरण', navFx: 'मुद्रा', navGold: 'सुन', navEmi: 'ऋणको किस्ता', navElec: 'बिजुली बिल', navHol: 'बिदा', navIpo: 'आईपीओ', navEm: 'आपतकालीन',
      dateH: 'नेपाली मिति रूपान्तरण', year: 'वर्ष (वि.सं.)', month: 'महिना', day: 'गते', adDate: 'मिति (ई.सं.)', convert: 'रूपान्तरण', srcCal: 'पात्रो: हाम्रोपात्रो · वि.सं. २०७०–२१००',
      bsRange: 'वि.सं. २०७० देखि २१०० सम्मको वर्ष र १ देखि ३२ सम्मको गते लेख्नुहोस्।', adRange: 'सन् २०१३ अप्रिल १४ देखि २०४३ डिसेम्बर ३१ बीचको मिति छान्नुहोस्।',
      noSuchDay: '{m} मा {n} दिन छन्।', holiday: 'सार्वजनिक बिदा', errCal: 'पात्रो अहिले उपलब्ध छैन।',
      fxH: 'रुपैयाँ मुद्रा रूपान्तरण', amount: 'रकम', currency: 'मुद्रा', srcFx: 'नेपाल राष्ट्र बैंकको आधिकारिक दर', fxRateFor: '{d} को राष्ट्र बैंक मध्यदर', errFx: 'विनिमय दर अहिले उपलब्ध छैन।',
      goldH: 'सुन–चाँदी क्याल्कुलेटर', metal: 'धातु', fineGold: 'छापावाल सुन', silver: 'चाँदी', weight: 'तौल', unit: 'एकाइ', tola: 'तोला', gram: 'ग्राम', g10: '१० ग्राम', lal: 'लाल',
      goldNote: 'प्रति तोला आधिकारिक दैनिक दर (१ तोला = ११.६६३८ ग्राम = १०० लाल)। गहनामा बनाउने ज्याला छुट्टै लाग्छ।',
      srcGold: 'हाम्रोपात्रो / नेपाल सुनचाँदी व्यवसायी महासंघको दैनिक दर', atRate: 'प्रति तोला रु {p} · {d} को दर', errGold: 'सुन–चाँदीको दर अहिले उपलब्ध छैन।',
      emiH: 'ऋणको मासिक किस्ता (EMI)', loan: 'ऋण रकम (रु)', rate: 'ब्याज (% वार्षिक)', tenure: 'अवधि', years: 'वर्ष', months: 'महिना',
      emiNote: 'घट्दो मौज्दातमा आधारित सामान्य EMI। बैंकले सेवा शुल्क थप्न वा दर बदल्न सक्छ — आफ्नो ऋण प्रस्ताव हेर्नुहोस्।',
      perMonth: '{n} महिनासम्म प्रतिमहिना', totalInt: 'जम्मा ब्याज', totalPay: 'जम्मा भुक्तानी', principal: 'साँवा', interest: 'ब्याज', emiBad: 'ऋण रकम, ब्याजदर र अवधि लेख्नुहोस्।',
      elH: 'बिजुली बिल क्याल्कुलेटर', meter: 'मिटर', units: 'युनिट (kWh)', threeA: 'थ्री-फेज, १० केभीए सम्म', threeB: 'थ्री-फेज, १० केभीएभन्दा माथि',
      season: 'बिलको महिना', seasonA: 'असार – कात्तिक', seasonB: 'मंसिर – जेठ',
      elNote: 'न्यून भोल्टेजका घरायसी ग्राहकको महसुल। ढिलो भुक्तानीको जरिवाना वा छिटो भुक्तानीको छुट समावेश छैन।',
      srcElec: 'नेविप्राको ग्राहक महसुल · विद्युत नियमन आयोगको २०७८/०७/०८ को निर्णय, २०७८ पुसदेखि बिलमा', minCharge: 'न्यूनतम शुल्क', energy: 'ऊर्जा शुल्क', total: 'जम्मा',
      unitsRange: '{a}–{b} युनिट', unitsFrom: '{a} युनिटभन्दा माथि', upTo20: '५ एम्पियर मिटरमा २० युनिटसम्म: न्यूनतम शुल्क मात्र', allUnits: 'सबै {n} युनिट', elBad: 'बिलमा भएको युनिट (पूर्णाङ्क) लेख्नुहोस्।',
      holH: 'आगामी सार्वजनिक बिदा', srcHol: 'हाम्रोपात्रो · आधिकारिक सूची: moha.gov.np', fullCal: 'पूरा पात्रो →', noHol: 'आगामी ९० दिनमा सार्वजनिक बिदा छैन।',
      someGroups: 'केही समूहलाई मात्र', errHol: 'बिदाका मिति अहिले उपलब्ध छैनन्।',
      ipoH: 'आईपीओ पात्रो', srcIpo: 'शेयरसंसारको निष्कासन तालिका (अनौपचारिक) · आवेदन मेरोशेयरमा', open: 'अहिले खुला', soon: 'छिट्टै खुल्ने',
      k_ipo: 'आईपीओ', k_fpo: 'एफपीओ', k_right: 'हकप्रद शेयर', k_mutual: 'म्युचुअल फन्ड', k_local: 'आईपीओ · स्थानीय बासिन्दा', k_migrant: 'आईपीओ · वैदेशिक रोजगारीमा रहेका नेपाली',
      units_n: '{n} कित्ता', perUnit: 'प्रति कित्ता रु {p}', closes: '{d} मा बन्द', opens: '{d} मा खुल्ने', datesTba: 'मिति घोषणा भएको छैन', mgr: 'निष्कासन प्रबन्धक: {m}', ratio: 'अनुपात {r}',
      noIpo: 'अहिले कुनै आईपीओ, एफपीओ, हकप्रद वा म्युचुअल फन्ड खुला वा घोषित छैन।', errIpo: 'आईपीओ पात्रो अहिले उपलब्ध छैन।',
      ipoNote: 'शेयरसंसारको सार्वजनिक तालिकाबाट — आवेदन दिनुअघि मेरोशेयर वा निष्कासन प्रबन्धकसँग मिति पुष्टि गर्नुहोस्।',
      emH: 'आपतकालीन नम्बर', emPolice: 'प्रहरी', emFire: 'दमकल', emAmb: 'एम्बुलेन्स', emTraffic: 'ट्राफिक प्रहरी', emTourist: 'पर्यटक प्रहरी',
      govDir: 'राहदानी, लाइसेन्स, प्यान, नागरिकता र अन्य', govLink: 'सरकारी सेवा →'
    }
  });

  var ne = function () { return NL.lang() === 'ne'; };
  var neD = function (v) { return String(v).replace(/[0-9]/g, function (d) { return '०१२३४५६७८९'[d]; }); };
  var num = function (v) { var x = parseFloat(String(v == null ? '' : v).replace(/,/g, '').replace(/[^0-9.]/g, '')); return isFinite(x) ? x : NaN; };
  var fmt = function (v, d) { return Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var BS_MON = {
    en: ['Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'],
    ne: ['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कात्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत']
  };
  var adText = function (iso) {
    return new Intl.DateTimeFormat(ne() ? 'ne-NP' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z'));
  };
  var bsText = function (bs) {
    return ne() ? neD(bs[2]) + ' ' + BS_MON.ne[bs[1] - 1] + ' ' + neD(bs[0]) : bs[2] + ' ' + BS_MON.en[bs[1] - 1] + ' ' + bs[0] + ' BS';
  };

  /* ------------------------------------------------------- date converter */
  var DC = { mode: 'bs', today: null, last: null };
  function paintMonths() {
    var v = $('dc-bm').value;
    $('dc-bm').innerHTML = BS_MON[NL.lang()].map(function (m, i) { return '<option value="' + (i + 1) + '">' + esc(m) + '</option>'; }).join('');
    if (v) $('dc-bm').value = v;
  }
  function setMode(m) {
    DC.mode = m;
    $('dc-bs').hidden = m !== 'bs';
    $('dc-ad').hidden = m !== 'ad';
    document.querySelectorAll('[data-dc]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-dc') === m)); });
  }
  function dayResult(main, other, d) {
    var evs = (d.events || []).map(function (e) { return ne() ? (e.np || e.en) : (e.en || e.np); }).filter(Boolean);
    return '<div class="tool-res"><b>' + esc(main) + '</b><span class="tool-eq">= ' + esc(other) + '</span>'
      + (d.holiday || evs.length || d.tithi ? '<span class="tool-sub">' + (d.holiday ? '<span class="chip hol">' + esc(t('holiday')) + '</span>' : '')
        + esc(evs.join(' · ')) + (d.tithi ? '<span class="muted">' + (evs.length ? ' · ' : '') + esc(d.tithi) + '</span>' : '') + '</span>' : '')
      + '</div>';
  }
  var errLine = function (msg) { return '<p class="tool-err" role="alert">' + esc(msg) + '</p>'; };
  async function convert() {
    var out = $('dc-out');
    try {
      if (DC.mode === 'bs') {
        var y = parseInt($('dc-by').value, 10), m = parseInt($('dc-bm').value, 10), d = parseInt($('dc-bd').value, 10);
        if (!(y >= 2070 && y <= 2100) || !(m >= 1 && m <= 12) || !(d >= 1 && d <= 32)) { out.innerHTML = errLine(t('bsRange')); return; }
        out.innerHTML = NL.skeleton('value');
        var cal = await NL.api('/api/calendar?mode=bs&y=' + y + '&m=' + m);
        var day = (cal.days || []).filter(function (x) { return x.inMonth && x.bs[0] === y && x.bs[1] === m && x.bs[2] === d; })[0];
        if (!day) { out.innerHTML = errLine(t('noSuchDay', { m: BS_MON[NL.lang()][m - 1] + ' ' + (ne() ? neD(y) : y), n: ne() ? neD(cal.daysInMonth || '') : (cal.daysInMonth || '') })); return; }
        DC.last = { mode: 'bs', day: day };
        out.innerHTML = dayResult(adText(day.ad), bsText(day.bs), day);
      } else {
        var iso = $('dc-add').value;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || iso < '2013-04-14' || iso > '2043-12-31') { out.innerHTML = errLine(t('adRange')); return; }
        out.innerHTML = NL.skeleton('value');
        var p = iso.split('-').map(Number);
        var cal2 = await NL.api('/api/calendar?mode=ad&y=' + p[0] + '&m=' + p[1]);
        var d2 = (cal2.days || []).filter(function (x) { return x.ad === iso; })[0];
        if (!d2) { out.innerHTML = errLine(t('adRange')); return; }
        DC.last = { mode: 'ad', day: d2 };
        out.innerHTML = dayResult(bsText(d2.bs), adText(d2.ad), d2);
      }
      NL.feed('calendar', true);
    } catch (e) {
      out.innerHTML = NL.errorState(t('errCal'), { compact: true, mod: 'dc' });
      NL.feed('calendar', false);
    }
  }
  function repaintDate() {
    if (!DC.last) return;
    var d = DC.last.day;
    $('dc-out').innerHTML = DC.last.mode === 'bs' ? dayResult(adText(d.ad), bsText(d.bs), d) : dayResult(bsText(d.bs), adText(d.ad), d);
  }

  /* ---------------------------------------------------- currency converter */
  var FX_ORDER = ['USD', 'INR', 'EUR', 'GBP', 'AUD', 'JPY', 'CNY', 'AED', 'SAR', 'QAR', 'MYR', 'KWD', 'KRW', 'BHD', 'OMR', 'CAD', 'SGD', 'CHF', 'HKD', 'THB', 'SEK', 'DKK'];
  var FX_NAMES = {
    en: { USD: 'US dollar', INR: 'Indian rupee', EUR: 'Euro', GBP: 'British pound', AUD: 'Australian dollar', JPY: 'Japanese yen', CNY: 'Chinese yuan', AED: 'UAE dirham', SAR: 'Saudi riyal',
      QAR: 'Qatari riyal', MYR: 'Malaysian ringgit', KWD: 'Kuwaiti dinar', KRW: 'South Korean won', BHD: 'Bahraini dinar', OMR: 'Omani rial', CAD: 'Canadian dollar', SGD: 'Singapore dollar',
      CHF: 'Swiss franc', HKD: 'Hong Kong dollar', THB: 'Thai baht', SEK: 'Swedish krona', DKK: 'Danish krone' },
    ne: { USD: 'अमेरिकी डलर', INR: 'भारतीय रुपैयाँ', EUR: 'युरो', GBP: 'बेलायती पाउन्ड', AUD: 'अस्ट्रेलियाली डलर', JPY: 'जापानी येन', CNY: 'चिनियाँ युआन', AED: 'युएई दिराम', SAR: 'साउदी रियाल',
      QAR: 'कतारी रियाल', MYR: 'मलेसियाली रिंगिट', KWD: 'कुवेती दिनार', KRW: 'दक्षिण कोरियाली वन', BHD: 'बहराइनी दिनार', OMR: 'ओमानी रियाल', CAD: 'क्यानेडियन डलर', SGD: 'सिंगापुर डलर',
      CHF: 'स्विस फ्र्याङ्क', HKD: 'हङकङ डलर', THB: 'थाई बाट', SEK: 'स्विडिस क्रोना', DKK: 'डेनिस क्रोन' }
  };
  var FX = { rates: null, date: '', dir: 'to' };
  function paintFxSelect() {
    if (!FX.rates) return;
    var cur = $('fx-cur').value || 'USD';
    var codes = FX_ORDER.filter(function (c) { return FX.rates[c]; }).concat(Object.keys(FX.rates).filter(function (c) { return FX_ORDER.indexOf(c) < 0; }));
    $('fx-cur').innerHTML = codes.map(function (c) { return '<option value="' + c + '"' + (c === cur ? ' selected' : '') + '>' + c + ' — ' + esc(FX_NAMES[NL.lang()][c] || c) + '</option>'; }).join('');
  }
  function fxOut() {
    var out = $('fx-out');
    if (!FX.rates) return;
    var c = $('fx-cur').value, r = FX.rates[c], a = num($('fx-amt').value);
    if (!r || !isFinite(a)) { out.innerHTML = '<div class="tool-res"><b>—</b></div>'; return; }
    var dp = r.mid < 10 ? 4 : 2;
    out.innerHTML = FX.dir === 'to'
      ? '<div class="tool-res"><b>Rs ' + fmt(a * r.mid, 2) + '</b><span class="tool-eq">' + fmt(a, a % 1 ? 2 : 0) + ' ' + c + ' → NPR</span>'
        + '<span class="tool-sub">1 ' + c + ' = Rs ' + fmt(r.mid, dp) + ' · ' + esc(t('fxRateFor', { d: FX.date })) + '</span></div>'
      : '<div class="tool-res"><b>' + fmt(a / r.mid, a / r.mid < 10 ? 4 : 2) + ' ' + c + '</b><span class="tool-eq">Rs ' + fmt(a, a % 1 ? 2 : 0) + ' → ' + c + '</span>'
        + '<span class="tool-sub">1 ' + c + ' = Rs ' + fmt(r.mid, dp) + ' · ' + esc(t('fxRateFor', { d: FX.date })) + '</span></div>';
  }
  async function loadFx() {
    try {
      var d = await NL.api('/api/forex');
      var last = d.days && d.days[d.days.length - 1];
      if (!last || !last.rates) throw new Error('no rates');
      FX.rates = last.rates; FX.date = last.date;
      paintFxSelect(); fxOut();
      NL.stamp('stamp-fx', true); NL.feed('fx', true);
    } catch (e) {
      if (!FX.rates) $('fx-out').innerHTML = NL.errorState(t('errFx'), { compact: true, mod: 'fx' });
      NL.stamp('stamp-fx', false); NL.feed('fx', false);
    }
  }

  /* ----------------------------------------------------------------- gold */
  var TOLA_G = 11.6638;
  var AU = { gold: null, silver: null };
  var tolaOf = function (item) {
    var p = item && (item.prices || []).filter(function (x) { return /tola/i.test(x.unit); })[0];
    return p ? { price: p.price, date: p.date } : null;
  };
  function goldOut() {
    var out = $('au-out');
    var m = AU[$('au-metal').value];
    if (!m) { if (AU.gold || AU.silver) out.innerHTML = '<div class="tool-res"><b>—</b></div>'; return; }
    var w = num($('au-w').value), u = $('au-u').value;
    if (!isFinite(w)) { out.innerHTML = '<div class="tool-res"><b>—</b></div>'; return; }
    var tola = u === 'tola' ? w : u === 'g' ? w / TOLA_G : u === '10g' ? w * 10 / TOLA_G : w / 100;
    out.innerHTML = '<div class="tool-res"><b>Rs ' + fmt(tola * m.price, 0) + '</b>'
      + '<span class="tool-sub">' + esc(t('atRate', { p: fmt(m.price, 0), d: m.date || '' })) + '</span></div>';
  }
  async function loadGold() {
    try {
      var d = await NL.api('/api/gold-hamropatro');
      var items = d.items || [];
      AU.gold = tolaOf(items.filter(function (i) { return String(i.symbol || i.name).toUpperCase().indexOf('HALMARK') >= 0; })[0]);
      AU.silver = tolaOf(items.filter(function (i) { return String(i.symbol || '').toUpperCase().indexOf('SILVER') >= 0; })[0]);
      if (!AU.gold && !AU.silver) throw new Error('no rates');
      goldOut();
      NL.stamp('stamp-gold', true); NL.feed('gold', true);
    } catch (e) {
      if (!AU.gold && !AU.silver) $('au-out').innerHTML = NL.errorState(t('errGold'), { compact: true, mod: 'gold' });
      NL.stamp('stamp-gold', false); NL.feed('gold', false);
    }
  }

  /* ------------------------------------------------------------------ EMI */
  function emiOut() {
    var P = num($('emi-p').value), r = num($('emi-r').value), n = num($('emi-n').value);
    var months = Math.round($('emi-u').value === 'y' ? n * 12 : n);
    var out = $('emi-out');
    if (!(P > 0) || !(r >= 0) || !(months >= 1) || months > 600) { out.innerHTML = errLine(t('emiBad')); return; }
    var i = r / 12 / 100;
    var emi = i === 0 ? P / months : P * i * Math.pow(1 + i, months) / (Math.pow(1 + i, months) - 1);
    var total = emi * months, interest = total - P, share = total ? P / total * 100 : 100;
    out.innerHTML = '<div class="tool-res"><b>Rs ' + fmt(emi, 2) + '</b><span class="tool-eq">' + esc(t('perMonth', { n: months })) + '</span></div>'
      + '<div class="emi-bar" aria-hidden="true"><span style="width:' + share.toFixed(1) + '%"></span></div>'
      + '<dl class="tool-dl"><div><dt><i class="sw p"></i>' + esc(t('principal')) + '</dt><dd>Rs ' + fmt(P, 0) + '</dd></div>'
      + '<div><dt><i class="sw i"></i>' + esc(t('totalInt')) + '</dt><dd>Rs ' + fmt(interest, 0) + '</dd></div>'
      + '<div><dt>' + esc(t('totalPay')) + '</dt><dd><b>Rs ' + fmt(total, 0) + '</b></dd></div></dl>';
  }

  /* -------------------------------------------------------- electricity */
  /* NEA consumer tariff, single-phase low voltage (ERC decision 2078/07/08).
     The minimum charge is the one row matching the month's total units; the
     energy charge is per slab (each rate only on the units inside its slab).
     On a 5 A meter up to 20 units costs the Rs 30 minimum only; above that the
     first 20 units are Rs 3 each. NEA's own worked examples: 5 A, 255 units =
     Rs 2,390; 15 A, 25 units = Rs 187.50. */
  var SLABS = [[0, 20], [21, 30], [31, 50], [51, 100], [101, 250], [251, Infinity]];
  var MIN = { 5: [30, 50, 50, 75, 100, 150], 15: [50, 75, 75, 100, 125, 175], 30: [75, 100, 100, 125, 150, 200], 60: [125, 125, 125, 150, 200, 250] };
  var RATE = { 5: [3, 6.5, 8, 9.5, 9.5, 11], 15: [4, 6.5, 8, 9.5, 9.5, 11], 30: [5, 6.5, 8, 9.5, 9.5, 11], 60: [6, 6.5, 8, 9.5, 9.5, 11] };
  /* three-phase low voltage: one rate for all units, by season */
  var THREE = { '3a': 1100, '3b': 1800 }, THREE_RATE = { 1: 10.5, 2: 11.5 };
  function bill(meter, units, season) {
    if (THREE[meter]) {
      var r3 = THREE_RATE[season];
      return { min: THREE[meter], lines: units ? [{ all: true, n: units, r: r3, amt: units * r3 }] : [], energy: units * r3, total: THREE[meter] + units * r3 };
    }
    var cap = Number(meter);
    if (cap === 5 && units <= 20) return { min: 30, lines: [], energy: 0, total: 30, small: true };
    var row = 0;
    while (units > SLABS[row][1]) row++;
    var lines = [], energy = 0, done = 0;
    SLABS.forEach(function (s, i) {
      var hi = Math.min(units, s[1]), n = hi - done;
      if (n <= 0) return;
      lines.push({ a: done + 1, b: s[1] === Infinity ? null : hi, n: n, r: RATE[cap][i], amt: n * RATE[cap][i] });
      energy += n * RATE[cap][i];
      done = hi;
    });
    return { min: MIN[cap][row], lines: lines, energy: energy, total: MIN[cap][row] + energy };
  }
  function elecOut() {
    var meter = $('el-m').value, units = num($('el-u').value), out = $('el-out');
    $('el-season-row').hidden = !THREE[meter];
    if (!(units >= 0) || units % 1 || units > 100000) { out.innerHTML = errLine(t('elBad')); return; }
    var b = bill(meter, units, Number($('el-s').value));
    var rows = b.lines.map(function (l) {
      var what = l.all ? t('allUnits', { n: fmt(l.n, 0) }) : l.b == null ? t('unitsFrom', { a: l.a - 1 }) : t('unitsRange', { a: l.a, b: l.b });
      return '<tr><td>' + esc(what) + '</td><td class="num">' + fmt(l.n, 0) + ' × ' + fmt(l.r, 2) + '</td><td class="num">' + fmt(l.amt, 2) + '</td></tr>';
    }).join('');
    out.innerHTML = '<div class="tool-res"><b>Rs ' + fmt(b.total, 2) + '</b><span class="tool-eq">' + fmt(units, 0) + ' kWh</span></div>'
      + '<div class="table-wrap"><table class="dtable compact el-table"><tbody>'
      + '<tr><td>' + esc(b.small ? t('upTo20') : t('minCharge')) + '</td><td></td><td class="num">' + fmt(b.min, 2) + '</td></tr>' + rows
      + '<tr class="tot"><td>' + esc(t('total')) + '</td><td></td><td class="num">Rs ' + fmt(b.total, 2) + '</td></tr></tbody></table></div>';
  }

  /* ------------------------------------------------------------- holidays */
  var HOL = null;
  function renderHol() {
    if (!HOL) return;
    var list = (HOL.items || []).filter(function (d) { return d.holiday; }).slice(0, 8);
    $('hol-list').innerHTML = list.length ? '<ul class="hol-list tool-hol">' + list.map(function (d) {
      var ms = Date.parse(d.ad + 'T12:00:00+05:45');
      var ev = d.events.filter(function (e) { return e.holiday; })[0] || d.events[0] || {};
      var name = ne() ? ev.np || ev.en : ev.en || ev.np;
      return '<li><span class="hl-date">' + esc(NL.dfmt.day(ms)) + '<small>' + esc(NL.dfmt.weekday(ms)) + '</small></span>'
        + '<span class="hol-b"><span' + NL.langAttr(name || '') + '>' + esc(name || '') + '</span>'
        + (ev.restricted ? ' <small class="muted">· ' + esc(t('someGroups')) + '</small>' : '')
        + '<small class="muted hol-bs">' + esc(bsText(d.bs)) + '</small></span></li>';
    }).join('') + '</ul>' : NL.emptyState(t('noHol'), { icon: 'calendar', compact: true });
  }
  async function loadHol() {
    try {
      HOL = await NL.api('/api/calendar/upcoming?days=90');
      renderHol();
      NL.stamp('stamp-hol', true);
    } catch (e) {
      if (!HOL) $('hol-list').innerHTML = NL.errorState(t('errHol'), { compact: true, mod: 'hol' });
      NL.stamp('stamp-hol', false);
    }
  }

  /* ------------------------------------------------------------------ IPO */
  var IPO = null;
  var dshort = function (iso) { return iso ? NL.dfmt.day(Date.parse(iso + 'T12:00:00+05:45')) : ''; };
  function renderIpo() {
    if (!IPO) return;
    var list = IPO.items || [];
    $('ipo-list').innerHTML = list.length ? '<ul class="ipo-list">' + list.map(function (i) {
      var when = i.state === 'open' ? (i.close ? t('closes', { d: dshort(i.close) }) : t('datesTba'))
        : i.open ? t('opens', { d: dshort(i.open) }) + (i.close ? ' – ' + dshort(i.close) : '') : t('datesTba');
      var bits = [];
      if (i.units) bits.push(t('units_n', { n: fmt(i.units, 0) }));
      if (i.price) bits.push(t('perUnit', { p: fmt(i.price, 0) }));
      if (i.ratio) bits.push(t('ratio', { r: i.ratio }));
      return '<li class="ipo-item"><div class="ipo-top"><span class="ipo-st ' + i.state + '">' + esc(t(i.state)) + '</span><span class="ipo-k">' + esc(t('k_' + i.kind)) + '</span></div>'
        + '<b class="ipo-co">' + esc(i.company) + (i.symbol ? ' <span class="muted">(' + esc(i.symbol) + ')</span>' : '') + '</b>'
        + '<span class="ipo-when">' + esc(when) + '</span>'
        + (bits.length ? '<span class="ipo-m">' + esc(bits.join(' · ')) + '</span>' : '')
        + (i.manager ? '<span class="ipo-m">' + esc(t('mgr', { m: i.manager })) + '</span>' : '') + '</li>';
    }).join('') + '</ul><p class="tool-note">' + esc(t('ipoNote')) + '</p>'
      : NL.emptyState(t('noIpo'), { icon: 'chart', compact: true, sub: t('ipoNote') });
  }
  async function loadIpo() {
    try {
      IPO = await NL.api('/api/ipo');
      renderIpo();
      NL.stamp('stamp-ipo', true); NL.feed('ipo', true);
    } catch (e) {
      if (!IPO) $('ipo-list').innerHTML = NL.errorState(t('errIpo'), { compact: true, mod: 'ipo' });
      NL.stamp('stamp-ipo', false); NL.feed('ipo', false);
    }
  }

  /* ---------------------------------------------------------------- wiring */
  $('dc-form').addEventListener('submit', function (e) { e.preventDefault(); convert(); });
  document.querySelectorAll('[data-dc]').forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-dc')); convert(); }); });
  ['fx-amt', 'fx-cur'].forEach(function (id) { $(id).addEventListener('input', fxOut); $(id).addEventListener('change', fxOut); });
  $('fx-swap').addEventListener('click', function () { FX.dir = FX.dir === 'to' ? 'from' : 'to'; $('fx-swap').classList.toggle('flip', FX.dir === 'from'); fxOut(); });
  ['au-metal', 'au-w', 'au-u'].forEach(function (id) { $(id).addEventListener('input', goldOut); $(id).addEventListener('change', goldOut); });
  ['emi-p', 'emi-r', 'emi-n', 'emi-u'].forEach(function (id) { $(id).addEventListener('input', emiOut); $(id).addEventListener('change', emiOut); });
  ['el-m', 'el-u', 'el-s'].forEach(function (id) { $(id).addEventListener('input', elecOut); $(id).addEventListener('change', elecOut); });
  Object.assign(NL.retryHandlers, { dc: convert, fx: loadFx, gold: loadGold, hol: loadHol, ipo: loadIpo });
  NL.onLang(function () { paintMonths(); repaintDate(); paintFxSelect(); fxOut(); goldOut(); emiOut(); elecOut(); renderHol(); renderIpo(); });

  paintMonths();
  setMode('bs');
  emiOut(); elecOut();
  $('fx-out').innerHTML = NL.skeleton('value');
  $('au-out').innerHTML = NL.skeleton('value');
  $('hol-list').innerHTML = NL.skeleton('rows');
  $('ipo-list').innerHTML = NL.skeleton('rows');
  /* start the converter on today's date, so it shows a real answer straight away */
  NL.api('/api/calendar/today').then(function (d) {
    var bs = d.day.bs;
    $('dc-by').value = bs[0]; $('dc-bm').value = bs[1]; $('dc-bd').value = bs[2];
    $('dc-add').value = d.today;
    convert();
  }).catch(function () { $('dc-out').innerHTML = NL.errorState(t('errCal'), { compact: true, mod: 'dc' }); });
  loadFx(); loadGold(); loadHol(); loadIpo();
  NL.ticker.autoload();
  NL.renderFooter([
    { name: 'Hamro Patro — calendar', url: 'https://www.hamropatro.com/calendar' },
    { name: 'Nepal Rastra Bank — exchange rates', url: 'https://www.nrb.org.np/forex/' },
    { name: 'Hamro Patro / FEGOD — gold & silver', url: 'https://www.hamropatro.com/gold' },
    { name: 'Nepal Electricity Authority — tariff', url: 'https://nea.org.np/pages/consumer-tariff-rates' },
    { name: 'ShareSansar — issue tables', url: 'https://www.sharesansar.com/existing-issues' }
  ]);
})();

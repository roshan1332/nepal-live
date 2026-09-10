/*
 * Nepal Money (/money): NEPSE (index, 1-year history, movers), gold & silver
 * (Hamro Patro / FEGOD, 60-day history), NRB exchange rates (1-year history,
 * converter), Nepal Oil Corporation fuel prices. No value is hard-coded.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc, fmt = NL.fmt;

  NL.i18n.add({
    en: {
      kicker: 'Nepal Money', h1: 'Money & <em>markets</em>', sub: 'NEPSE, gold and silver, official exchange rates and fuel prices — from the institutions that publish them.',
      navMetals: 'Gold & silver', navFx: 'Exchange rates', navFuel: 'Fuel prices',
      nepseK: 'Nepal Stock Exchange', nepseH: 'NEPSE index', metalsK: 'Hamro Patro / FEGOD', metalsH: 'Gold & silver',
      fxK: 'Nepal Rastra Bank', fxH: 'Exchange rates', fuelKk: 'Nepal Oil Corporation', fuelH: 'Fuel prices', convH: 'Currency converter',
      srcNepse: 'Official NEPSE feed · not investment advice', srcFuel: 'Nepal Oil Corporation retail selling price · can differ by depot',
      moneyNote: 'Figures come from NEPSE, Hamro Patro (FEGOD rates), Nepal Rastra Bank and Nepal Oil Corporation and may be delayed. Nothing here is financial advice — confirm rates with your bank, broker or dealer before acting.',
      open: 'Market open', closed: 'Market closed', asOf: 'as of {t}', today: 'today',
      noIntraday: 'NEPSE’s public feed has no intraday history', noYearMetals: 'Hamro Patro publishes 60 days of history', noIntradayFx: 'NRB publishes one official rate per day',
      overRange: '{chg} over {r}', sessions: '{n} sessions from {a} to {b}',
      prevClose: 'Previous close', high: 'Day high', low: 'Day low', turnover: 'Turnover', transactions: 'Transactions', scrips: 'Scrips traded',
      shares: 'Shares traded', w52: '52-week range', subIdx: 'Sub-indices', gainers: 'Top gainers', losers: 'Top losers', turnoverTop: 'Top turnover',
      sym: 'Symbol', ltp: 'LTP', chg: 'Change', crore: 'Cr', arba: 'Arba',
      gold: 'Gold · Hallmark', silver: 'Silver', perTola: 'per tola', per10g: 'per 10 g', perKg: 'per kg', vsPrev: 'vs previous day', rateFor: 'Rate for {d}',
      spot: 'International spot: {g}/oz gold · {s}/oz silver (gold-api.com)',
      amount: 'Amount', swap: 'Swap direction', currency: 'Currency', buy: 'Buying', sell: 'Selling', mid: 'Mid', per1: 'per 1 unit',
      fxSrc: 'Official NRB rates published {d} · change vs previous published day', chartOf: '{c}/NPR (NRB mid rate)',
      petrol: 'Petrol', diesel: 'Diesel', kerosene: 'Kerosene', lpg: 'LPG', perL: 'per litre', perCyl: 'per cylinder',
      effective: 'Effective {ad} ({bs} BS)', unchanged: 'unchanged', vsRev: 'vs previous revision', dateAd: 'Date (AD)', dateBs: 'Date (BS)',
      petrolHist: 'Petrol price across the last {n} revisions', errNepse: 'NEPSE data isn’t available right now.',
      errMetals: 'Gold & silver prices aren’t available right now.', errFx: 'Exchange rates aren’t available right now.', errFuel: 'Fuel prices aren’t available right now.'
    },
    ne: {
      kicker: 'नेपाल अर्थ', h1: 'पैसा र <em>बजार</em>', sub: 'नेप्से, सुन–चाँदी, आधिकारिक विनिमय दर र इन्धन मूल्य — प्रकाशन गर्ने निकायकै तथ्यांकबाट।',
      navMetals: 'सुन–चाँदी', navFx: 'विनिमय दर', navFuel: 'इन्धन मूल्य',
      nepseK: 'नेपाल स्टक एक्सचेन्ज', nepseH: 'नेप्से सूचकांक', metalsK: 'हाम्रोपात्रो / फेगोड', metalsH: 'सुन–चाँदी',
      fxK: 'नेपाल राष्ट्र बैंक', fxH: 'विनिमय दर', fuelKk: 'नेपाल आयल निगम', fuelH: 'इन्धन मूल्य', convH: 'मुद्रा रूपान्तरण',
      srcNepse: 'आधिकारिक नेप्से फिड · लगानी सल्लाह होइन', srcFuel: 'नेपाल आयल निगमको खुद्रा बिक्री मूल्य · डिपोअनुसार फरक हुन सक्छ',
      moneyNote: 'अंकहरू नेप्से, हाम्रोपात्रो (फेगोड दर), नेपाल राष्ट्र बैंक र नेपाल आयल निगमबाट आउँछन् र ढिलो हुन सक्छन्। यहाँको कुनै पनि कुरा वित्तीय सल्लाह होइन — निर्णय गर्नुअघि बैंक वा व्यापारीसँग पुष्टि गर्नुहोस्।',
      open: 'बजार खुला', closed: 'बजार बन्द', asOf: '{t} सम्मको', today: 'आज',
      noIntraday: 'नेप्सेको सार्वजनिक फिडमा दिनभरिको इतिहास छैन', noYearMetals: 'हाम्रोपात्रोले ६० दिनको इतिहास मात्र प्रकाशन गर्छ', noIntradayFx: 'राष्ट्र बैंकले दिनमा एउटा मात्र आधिकारिक दर प्रकाशन गर्छ',
      overRange: '{r} मा {chg}', sessions: '{a} देखि {b} सम्म {n} कारोबार दिन',
      prevClose: 'अघिल्लो बन्द', high: 'दैनिक उच्च', low: 'दैनिक न्यून', turnover: 'कारोबार रकम', transactions: 'कारोबार संख्या', scrips: 'स्क्रिप',
      shares: 'कारोबार भएका सेयर', w52: '५२ हप्ताको दायरा', subIdx: 'उप-सूचकांक', gainers: 'सबैभन्दा बढ्ने', losers: 'सबैभन्दा घट्ने', turnoverTop: 'सबैभन्दा बढी कारोबार',
      sym: 'संकेत', ltp: 'अन्तिम मूल्य', chg: 'परिवर्तन', crore: 'करोड', arba: 'अर्ब',
      gold: 'सुन · हलमार्क', silver: 'चाँदी', perTola: 'प्रति तोला', per10g: 'प्रति १० ग्राम', perKg: 'प्रति के.जी.', vsPrev: 'अघिल्लो दिनभन्दा', rateFor: '{d} को दर',
      spot: 'अन्तर्राष्ट्रिय दर: सुन {g}/आउन्स · चाँदी {s}/आउन्स (gold-api.com)',
      amount: 'रकम', swap: 'दिशा बदल्नुहोस्', currency: 'मुद्रा', buy: 'खरिद', sell: 'बिक्री', mid: 'मध्य', per1: 'प्रति १ एकाइ',
      fxSrc: 'राष्ट्र बैंकको आधिकारिक दर, {d} मा प्रकाशित · अघिल्लो प्रकाशित दिनसँग तुलना', chartOf: '{c}/NPR (राष्ट्र बैंकको मध्य दर)',
      petrol: 'पेट्रोल', diesel: 'डिजेल', kerosene: 'मट्टितेल', lpg: 'एलपी ग्यास', perL: 'प्रति लिटर', perCyl: 'प्रति सिलिन्डर',
      effective: '{ad} ({bs} बि.सं.) देखि लागू', unchanged: 'परिवर्तन छैन', vsRev: 'अघिल्लो संशोधनभन्दा', dateAd: 'मिति (ई.सं.)', dateBs: 'मिति (बि.सं.)',
      petrolHist: 'पछिल्ला {n} संशोधनमा पेट्रोलको मूल्य', errNepse: 'नेप्सेको तथ्यांक अहिले उपलब्ध छैन।',
      errMetals: 'सुन–चाँदीको मूल्य अहिले उपलब्ध छैन।', errFx: 'विनिमय दर अहिले उपलब्ध छैन।', errFuel: 'इन्धन मूल्य अहिले उपलब्ध छैन।'
    }
  });

  var FX_NAMES = {
    en: { USD: 'US dollar', INR: 'Indian rupee', EUR: 'Euro', GBP: 'British pound', CHF: 'Swiss franc', AUD: 'Australian dollar', CAD: 'Canadian dollar', SGD: 'Singapore dollar', JPY: 'Japanese yen', CNY: 'Chinese yuan', SAR: 'Saudi riyal', QAR: 'Qatari riyal', THB: 'Thai baht', AED: 'UAE dirham', MYR: 'Malaysian ringgit', KRW: 'South Korean won', SEK: 'Swedish krona', DKK: 'Danish krone', HKD: 'Hong Kong dollar', KWD: 'Kuwaiti dinar', BHD: 'Bahraini dinar', OMR: 'Omani rial' },
    ne: { USD: 'अमेरिकी डलर', INR: 'भारतीय रुपैयाँ', EUR: 'युरो', GBP: 'बेलायती पाउन्ड', CHF: 'स्विस फ्रैंक', AUD: 'अस्ट्रेलियाली डलर', CAD: 'क्यानेडियन डलर', SGD: 'सिंगापुर डलर', JPY: 'जापानी येन', CNY: 'चिनियाँ युआन', SAR: 'साउदी रियाल', QAR: 'कतारी रियाल', THB: 'थाई भाट', AED: 'युएई दिराम', MYR: 'मलेसियाली रिङ्गेट', KRW: 'दक्षिण कोरियाली वन', SEK: 'स्विडिस क्रोना', DKK: 'डेनिस क्रोन', HKD: 'हङकङ डलर', KWD: 'कुवेती दिनार', BHD: 'बहराइनी दिनार', OMR: 'ओमानी रियाल' }
  };
  var FX_ORDER = ['USD', 'INR', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CNY', 'AED', 'SAR', 'QAR', 'KRW', 'MYR', 'SGD', 'CHF', 'HKD', 'THB', 'KWD', 'BHD', 'OMR', 'SEK', 'DKK'];
  var fxName = function (c) { return (FX_NAMES[NL.lang()] || FX_NAMES.en)[c] || c; };
  var S = { nR: '1Y', gR: '30D', fR: '30D', fxCode: 'USD', conv: { amt: '100', code: 'USD', dir: 'to' } };
  var arr = NL.arrow, sgn = NL.signed, dirOf = NL.dirOf;
  var turnoverTxt = function (rs) { return rs >= 1e9 ? 'Rs ' + fmt(rs / 1e9, 2) + ' ' + t('arba') : 'Rs ' + fmt(rs / 1e7, 2) + ' ' + t('crore'); };
  var chgLine = function (c, rangeLabel, dp) {
    return c ? '<span class="chg ' + c.dir + '">' + esc(t('overRange', { chg: arr(c.abs) + ' ' + sgn(c.abs, dp) + ' (' + sgn(c.pct, 2) + '%)', r: rangeLabel })) + '</span>' : '';
  };
  var errBox = function (id, key, mod) { var el = $(id); if (el) el.innerHTML = NL.errorState(t(key), { mod: mod, compact: true }); };

  /* ------------------------------------------------------------- NEPSE */
  function nepseSeries() {
    var h = S.hist && Array.isArray(S.hist.content) ? S.hist.content : [];
    var pts = h.filter(function (x) { return x && x.closingIndex > 0; })
      .sort(function (a, b) { return a.businessDate.localeCompare(b.businessDate); })
      .map(function (x) { return { t: Date.parse(x.businessDate + 'T15:00:00+05:45'), v: x.closingIndex }; });
    var idx = nepseIdx();
    if (idx && (!pts.length || idx.currentValue !== pts[pts.length - 1].v)) pts.push({ t: Date.now(), v: idx.currentValue });
    return pts;
  }
  function nepseIdx() { return S.nepse && ((S.nepse.indices || []).find(function (i) { return i.index === 'NEPSE Index'; }) || S.nepse.indices[0]); }
  function renderNepse() {
    var idx = nepseIdx();
    if (!idx) return;
    var st = $('nepse-status');
    if (S.status) {
      var open = String(S.status.isOpen).toUpperCase() === 'OPEN';
      st.hidden = false;
      st.className = 'chip ' + (open ? 'open' : 'closed');
      st.textContent = (open ? t('open') : t('closed'));
      st.title = t('asOf', { t: String(S.status.asOf || '').replace('T', ' ').slice(0, 16) + ' NPT' });
    }
    var all = nepseSeries();
    var n = { '7D': 7, '30D': 30, '90D': 90, '1Y': Infinity }[S.nR];
    var pts = n === Infinity ? all : all.slice(-n - 1);
    var d = dirOf(idx.change);
    $('nepse-main').innerHTML =
      '<div class="big-row"><span class="big-v">' + fmt(idx.currentValue) + '</span>'
      + '<span class="chg ' + d + '">' + arr(idx.change) + ' ' + sgn(idx.change, 2) + ' (' + sgn(idx.perChange, 2) + '%)</span>'
      + '<span class="chip ' + d + '">' + esc(t('today')) + '</span></div>'
      + '<div class="range-row">' + NL.rangeTabs('n', [{ k: '24H', ok: false, why: t('noIntraday') }, { k: '7D' }, { k: '30D' }, { k: '90D' }, { k: '1Y' }], S.nR)
      + chgLine(NL.changeOver(pts), S.nR, 2) + '</div>'
      + NL.chart(pts, { h: 220, dfmt: S.nR === '1Y' ? NL.dfmt.month : NL.dfmt.dayY })
      + (all.length ? '<p class="chart-cap">' + esc(t('sessions', { n: pts.length, a: NL.dfmt.dayY(pts[0].t), b: NL.dfmt.dayY(pts[pts.length - 1].t) })) + '</p>' : '');

    var sum = {};
    (S.nepse.summary || []).forEach(function (s) { sum[s.detail] = s.value; });
    var lo = idx.fiftyTwoWeekLow, hi = idx.fiftyTwoWeekHigh, pos = Math.max(0, Math.min(100, (idx.currentValue - lo) / ((hi - lo) || 1) * 100));
    var stat = function (k, v) { return '<div class="nstat"><div class="k">' + esc(t(k)) + '</div><div class="v">' + v + '</div></div>'; };
    var subs = (S.nepse.indices || []).filter(function (i) { return i.index !== 'NEPSE Index'; });
    $('nepse-stats').innerHTML = '<div class="nepse-stats">'
      + stat('prevClose', fmt(idx.previousClose != null ? idx.previousClose : idx.close)) + stat('high', fmt(idx.high)) + stat('low', fmt(idx.low))
      + stat('turnover', turnoverTxt(sum['Total Turnover Rs:'] || 0)) + stat('transactions', Number(sum['Total Transactions'] || 0).toLocaleString('en-IN'))
      + stat('scrips', esc(sum['Total Scrips Traded'] || '—')) + '</div>'
      + '<div><div class="spark-cap"><span class="label">' + esc(t('w52')) + '</span></div>'
      + '<div class="range-bar"><div class="fill" style="width:' + pos + '%"></div><div class="marker" style="left:' + pos + '%"></div></div>'
      + '<div class="spark-cap"><span>' + fmt(lo) + '</span><span>' + fmt(hi) + '</span></div></div>'
      + (subs.length ? '<div><h3 class="label mb">' + esc(t('subIdx')) + '</h3><table class="dtable compact"><tbody>' + subs.map(function (s) {
        return '<tr><td>' + esc(s.index) + '</td><td class="num">' + fmt(s.currentValue) + '</td><td class="num ' + dirOf(s.change) + '-t">' + sgn(s.perChange, 2) + '%</td></tr>';
      }).join('') + '</tbody></table></div>' : '');

    if (S.top) {
      var tbl = function (key, rows, turnover) {
        return '<div class="card"><div class="card-head"><h3>' + esc(t(key)) + '</h3></div><div class="table-wrap"><table class="dtable"><thead><tr><th>' + esc(t('sym')) + '</th><th class="num">' + esc(t('ltp')) + '</th><th class="num">' + esc(turnover ? t('turnover') : t('chg')) + '</th></tr></thead><tbody>'
          + (rows || []).map(function (r) {
            return '<tr><td><b>' + esc(r.symbol) + '</b><span class="sub">' + esc(r.securityName || '') + '</span></td>'
              + '<td class="num">' + fmt(turnover ? r.closingPrice : r.ltp, 1) + '</td>'
              + (turnover ? '<td class="num">' + fmt(r.turnover / 1e7, 2) + ' ' + esc(t('crore')) + '</td>' : '<td class="num ' + dirOf(r.percentageChange) + '-t">' + sgn(r.percentageChange, 2) + '%</td>') + '</tr>';
          }).join('') + '</tbody></table></div></div>';
      };
      $('nepse-movers').innerHTML = tbl('gainers', S.top.gainers) + tbl('losers', S.top.losers) + tbl('turnoverTop', S.top.turnover, true);
    }
  }
  async function loadNepse() {
    var r = await Promise.allSettled([NL.api('/api/nepse'), NL.api('/api/nepse/status'), NL.api('/api/nepse/top'), NL.api('/api/nepse/history?size=250')]);
    if (r[0].status !== 'fulfilled') {
      if (!S.nepse) { errBox('nepse-main', 'errNepse', 'nepse'); $('nepse-stats').innerHTML = ''; }
      NL.stamp('stamp-nepse', false); NL.feed('nepse', false); return;
    }
    S.nepse = r[0].value;
    if (r[1].status === 'fulfilled') S.status = r[1].value;
    if (r[2].status === 'fulfilled') S.top = r[2].value;
    if (r[3].status === 'fulfilled') S.hist = r[3].value;
    NL.guard('nepse', renderNepse)();
    NL.stamp('stamp-nepse', true); NL.feed('nepse', true);
  }

  /* ------------------------------------------------------ gold & silver */
  function metal(item) {
    var byUnit = function (re) { return (item.prices || []).find(function (p) { return re.test(p.unit); }); };
    return { tola: byUnit(/tola/i), ten: byUnit(/10/) };
  }
  function renderMetals() {
    if (!S.gold) return;
    var items = S.gold.items || [];
    var gold = items.find(function (i) { return String(i.symbol || i.name).toUpperCase().indexOf('HALMARK') >= 0; });
    var silver = items.find(function (i) { return String(i.symbol || '').toUpperCase().indexOf('SILVER') >= 0; });
    var n = { '7D': 7, '30D': 30, '60D': Infinity }[S.gR];
    var card = function (item, key) {
      if (!item) return '';
      var m = metal(item), p = m.tola;
      if (!p) return '';
      var chg = p.prevPrice != null ? p.price - p.prevPrice : null;
      var series = (p.series || []).map(function (x) { return { t: Date.parse(x.date + 'T11:00:00+05:45'), v: x.price }; });
      var pts = n === Infinity ? series : series.slice(-n);
      return '<div class="card metal-card ' + key + '-m"><div class="card-body">'
        + '<div class="m-head"><span class="name"><i class="sw"></i>' + esc(t(key)) + '</span>'
        + (chg != null ? '<span class="chip ' + dirOf(chg) + '">' + arr(chg) + ' Rs ' + fmt(Math.abs(chg), 0) + ' (' + sgn(chg / p.prevPrice * 100, 2) + '%)</span>' : '') + '</div>'
        + '<div class="big-row"><span class="big-v">Rs ' + fmt(p.price, 0) + '</span><span class="unit">' + esc(t('perTola')) + '</span></div>'
        + '<div class="price-rows">' + (m.ten ? '<div><span>' + esc(t('per10g')) + '</span><b>Rs ' + fmt(m.ten.price, 0) + '</b></div>' : '')
        + '<div><span>' + esc(t('perKg')) + '</span><b>Rs ' + fmt(p.price / 11.6638 * 1000, 0) + '</b></div>'
        + (chg != null ? '<div><span>' + esc(t('vsPrev')) + '</span><b class="' + dirOf(chg) + '-t">' + sgn(chg, 0) + '</b></div>' : '') + '</div>'
        + '<div class="range-row">' + NL.rangeTabs('g', [{ k: '7D' }, { k: '30D' }, { k: '60D' }, { k: '1Y', ok: false, why: t('noYearMetals') }], S.gR)
        + chgLine(NL.changeOver(pts), S.gR, 0) + '</div>'
        + NL.chart(pts, { h: 150, fmt: function (v) { return 'Rs ' + fmt(v, 0); }, dfmt: NL.dfmt.dayY })
        + '</div><div class="card-foot"><span>' + esc(t('rateFor', { d: p.date })) + ' · Hamro Patro / FEGOD</span><a href="https://www.hamropatro.com/gold" target="_blank" rel="noopener noreferrer">hamropatro.com ↗</a></div></div>';
    };
    $('metals-body').innerHTML = card(gold, 'gold') + card(silver, 'silver');
    $('spot-line').textContent = S.spot ? t('spot', { g: '$' + fmt(S.spot.gold.usdPerOz), s: '$' + fmt(S.spot.silver.usdPerOz) }) : '';
  }
  async function loadMetals() {
    var r = await Promise.allSettled([NL.api('/api/gold-hamropatro'), NL.api('/api/gold')]);
    if (r[1].status === 'fulfilled') S.spot = r[1].value;
    if (r[0].status !== 'fulfilled') {
      if (!S.gold) errBox('metals-body', 'errMetals', 'metals');
      NL.stamp('stamp-metals', false); NL.feed('metals', false); return;
    }
    S.gold = r[0].value;
    NL.guard('metals', renderMetals)();
    NL.stamp('stamp-metals', true); NL.feed('metals', true);
  }

  /* -------------------------------------------------------------- forex */
  function latestFx() {
    var d = S.fx && S.fx.days; if (!d || !d.length) return null;
    return { last: d[d.length - 1], prev: d[d.length - 2] || null };
  }
  function renderFx() {
    var L = latestFx();
    if (!L) return;
    var codes = FX_ORDER.filter(function (c) { return L.last.rates[c]; }).concat(Object.keys(L.last.rates).filter(function (c) { return FX_ORDER.indexOf(c) < 0; }));
    if (!$('fx-amt')) {
      $('fx-conv').innerHTML = '<div class="fx-conv"><div class="fx-conv-row">'
        + '<input class="fx-amt" id="fx-amt" type="text" inputmode="decimal" autocomplete="off" aria-label="' + esc(t('amount')) + '" value="' + esc(S.conv.amt) + '">'
        + '<select class="fx-sel" id="fx-cur" aria-label="' + esc(t('currency')) + '"></select>'
        + '<button class="fx-swap" id="fx-swap" type="button" aria-label="' + esc(t('swap')) + '" title="' + esc(t('swap')) + '">' + NL.icon.fx + '</button></div>'
        + '<div class="fx-result" id="fx-out" aria-live="polite"></div></div>';
      $('fx-amt').addEventListener('input', function (e) { S.conv.amt = e.target.value; convOut(); });
      $('fx-cur').addEventListener('change', function (e) { S.conv.code = e.target.value; convOut(); });
      $('fx-swap').addEventListener('click', function () { S.conv.dir = S.conv.dir === 'to' ? 'from' : 'to'; $('fx-swap').classList.toggle('flip', S.conv.dir === 'from'); convOut(); });
    }
    $('fx-cur').innerHTML = codes.map(function (c) { return '<option value="' + c + '"' + (c === S.conv.code ? ' selected' : '') + '>' + c + ' — ' + esc(fxName(c)) + '</option>'; }).join('');
    convOut();

    var rows = codes.map(function (c) {
      var r = L.last.rates[c], p = L.prev && L.prev.rates[c];
      var dp = r.mid < 1 ? 4 : r.mid < 10 ? 3 : 2;
      var chg = p ? Number((r.mid - p.mid).toFixed(dp)) : null;
      return '<tr class="' + (c === S.fxCode ? 'sel' : '') + '"><td><button type="button" class="fx-pick" data-fx="' + c + '"><span class="cur-code">' + c + '</span><span>' + esc(fxName(c)) + (r.mid < 1 ? '<span class="sub">' + esc(t('per1')) + '</span>' : '') + '</span></button></td>'
        + '<td class="num">' + fmt(r.buy, dp) + '</td><td class="num">' + fmt(r.sell, dp) + '</td>'
        + '<td class="num ' + (chg ? dirOf(chg) + '-t' : 'muted') + '">' + (chg == null ? '—' : chg === 0 ? '0' : arr(chg) + ' ' + fmt(Math.abs(chg), dp)) + '</td></tr>';
    }).join('');
    $('fx-table').innerHTML = '<table class="dtable fx-table"><thead><tr><th>' + esc(t('currency')) + '</th><th class="num">' + esc(t('buy')) + '</th><th class="num">' + esc(t('sell')) + '</th><th class="num">' + esc(t('chg')) + '</th></tr></thead><tbody>' + rows + '</tbody></table>';
    $('fx-src').textContent = t('fxSrc', { d: L.last.date });
    renderFxChart();
  }
  function convOut() {
    var L = latestFx(); var out = $('fx-out');
    if (!L || !out) return;
    var r = L.last.rates[S.conv.code];
    var a = parseFloat(String(S.conv.amt).replace(/[^0-9.]/g, ''));
    if (!r || !isFinite(a)) { out.innerHTML = '<small>—</small>'; return; }
    var inF = fmt(a, a % 1 ? 2 : 0);
    if (S.conv.dir === 'to') out.innerHTML = 'Rs ' + fmt(a * r.mid, 2) + '<small>' + inF + ' ' + S.conv.code + ' → NPR · ' + esc(t('mid')) + '</small>';
    else { var v = a / r.mid; out.innerHTML = fmt(v, v < 10 ? 4 : 2) + ' ' + S.conv.code + '<small>Rs ' + inF + ' → ' + S.conv.code + ' · ' + esc(t('mid')) + '</small>'; }
  }
  function renderFxChart() {
    var c = S.fxCode;
    var src = S.fxh && S.fxh.days ? S.fxh.days : (S.fx ? S.fx.days.map(function (d) { return { date: d.date, mid: Object.fromEntries(Object.keys(d.rates).map(function (k) { return [k, d.rates[k].mid]; })) }; }) : []);
    var all = src.filter(function (d) { return d.mid[c] != null; }).map(function (d) { return { t: Date.parse(d.date + 'T12:00:00+05:45'), v: d.mid[c] }; });
    var n = { '7D': 7, '30D': 30, '90D': 90, '1Y': 366 }[S.fR];
    var pts = all.slice(-n);
    var dp = pts.length && pts[pts.length - 1].v < 10 ? 4 : 2;
    $('fx-chart').innerHTML = '<div class="m-head"><h3 class="label">' + esc(t('chartOf', { c: c })) + '</h3></div>'
      + '<div class="range-row">' + NL.rangeTabs('f', [{ k: '24H', ok: false, why: t('noIntradayFx') }, { k: '7D' }, { k: '30D' }, { k: '90D' }, { k: '1Y', ok: !!S.fxh }], S.fR)
      + chgLine(NL.changeOver(pts), S.fR, dp) + '</div>'
      + NL.chart(pts, { h: 170, fmt: function (v) { return 'Rs ' + fmt(v, dp); }, dfmt: S.fR === '1Y' ? NL.dfmt.month : NL.dfmt.dayY });
  }
  async function loadFx() {
    try {
      S.fx = await NL.api('/api/forex');
      NL.guard('fx', renderFx)();
      NL.stamp('stamp-fx', true); NL.feed('fx', true);
    } catch (e) {
      if (!S.fx) errBox('fx-table', 'errFx', 'fx');
      NL.stamp('stamp-fx', false); NL.feed('fx', false);
    }
    NL.api('/api/forex-history?days=365').then(function (h) { S.fxh = h; NL.guard('fxchart', renderFxChart)(); }).catch(function () { /* the 20-day series still charts */ });
  }

  /* --------------------------------------------------------------- fuel */
  function renderFuel() {
    var f = S.fuel;
    if (!f || !f.current) return;
    var c = f.current, p = f.previous;
    var item = function (k, unit, dp) {
      var chg = p && p[k] != null ? +(c[k] - p[k]).toFixed(2) : null;
      return '<div class="fuel-item"><span class="label">' + esc(t(k)) + '</span><span class="fv">Rs ' + fmt(c[k], dp) + '</span><span class="fu">' + esc(t(unit)) + '</span>'
        + '<span class="chg ' + (chg ? dirOf(chg) : 'flat') + '">' + (chg == null ? '' : chg === 0 ? esc(t('unchanged')) : arr(chg) + ' ' + sgn(chg, dp) + ' ' + esc(t('vsRev'))) + '</span></div>';
    };
    $('fuel-now').innerHTML = item('petrol', 'perL', 2) + item('diesel', 'perL', 2) + item('kerosene', 'perL', 2) + item('lpg', 'perCyl', 0)
      + '<p class="fuel-eff">' + esc(t('effective', { ad: c.date, bs: c.dateBs || '—' })) + '</p>';
    var hist = f.history.slice().reverse();
    $('fuel-chart').innerHTML = '<h3 class="label mb">' + esc(t('petrolHist', { n: hist.length })) + '</h3>'
      + NL.chart(hist.map(function (r) { return { t: Date.parse(r.date + 'T12:00:00+05:45'), v: r.petrol }; }), { h: 170, fmt: function (v) { return 'Rs ' + fmt(v, 2); } });
    $('fuel-table').innerHTML = '<table class="dtable"><thead><tr><th>' + esc(t('dateAd')) + '</th><th>' + esc(t('dateBs')) + '</th><th class="num">' + esc(t('petrol')) + '</th><th class="num">' + esc(t('diesel')) + '</th><th class="num">' + esc(t('kerosene')) + '</th><th class="num">LPG</th></tr></thead><tbody>'
      + f.history.map(function (r) { return '<tr><td>' + esc(r.date) + '</td><td>' + esc(r.dateBs || '—') + '</td><td class="num">' + fmt(r.petrol, 2) + '</td><td class="num">' + fmt(r.diesel, 2) + '</td><td class="num">' + fmt(r.kerosene, 2) + '</td><td class="num">' + fmt(r.lpg, 0) + '</td></tr>'; }).join('')
      + '</tbody></table>';
  }
  async function loadFuel() {
    try {
      S.fuel = await NL.api('/api/fuel');
      NL.guard('fuel', renderFuel)();
      NL.stamp('stamp-fuel', true); NL.feed('fuel', true);
    } catch (e) {
      if (!S.fuel) errBox('fuel-now', 'errFuel', 'fuel');
      NL.stamp('stamp-fuel', false); NL.feed('fuel', false);
    }
  }

  function renderAll() { NL.guard('nepse', renderNepse)(); NL.guard('metals', renderMetals)(); NL.guard('fx', renderFx)(); NL.guard('fuel', renderFuel)(); }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-range-key]');
    if (b && !b.disabled) {
      var k = b.getAttribute('data-range-key'), r = b.getAttribute('data-range');
      if (k === 'n') { S.nR = r; renderNepse(); } else if (k === 'g') { S.gR = r; renderMetals(); } else if (k === 'f') { S.fR = r; renderFxChart(); }
      return;
    }
    var fx = e.target.closest('[data-fx]');
    if (fx) {
      S.fxCode = fx.getAttribute('data-fx');
      document.querySelectorAll('.fx-table tr').forEach(function (tr) { tr.classList.toggle('sel', !!tr.querySelector('[data-fx="' + S.fxCode + '"]')); });
      renderFxChart();
    }
  });
  Object.assign(NL.retryHandlers, { nepse: loadNepse, metals: loadMetals, fx: loadFx, fuel: loadFuel });
  NL.onLang(function () { if ($('fx-amt')) $('fx-conv').innerHTML = ''; renderAll(); });

  NL.search.add({ group: function () { return t('fxH'); }, limit: 6,
    items: function () {
      var L = latestFx(); if (!L) return [];
      return Object.keys(L.last.rates).map(function (c) { return { title: c + ' / NPR', sub: fxName(c), val: 'Rs ' + fmt(L.last.rates[c].mid, L.last.rates[c].mid < 10 ? 3 : 2), href: '#fx', icon: 'fx', kw: FX_NAMES.en[c] || '' }; });
    } });

  ['nepse-main', 'nepse-stats', 'metals-body', 'fx-table', 'fuel-now'].forEach(function (id) { $(id).innerHTML = NL.skeleton('block'); });
  NL.ticker.autoload();
  NL.renderFooter([
    { name: 'Nepal Stock Exchange (NEPSE)', url: 'https://www.nepalstock.com/' },
    { name: 'Hamro Patro / FEGOD — gold & silver', url: 'https://www.hamropatro.com/gold' },
    { name: 'gold-api.com — international spot', url: 'https://gold-api.com/' },
    { name: 'Nepal Rastra Bank — forex', url: 'https://www.nrb.org.np/forex/' },
    { name: 'Nepal Oil Corporation — fuel', url: 'https://noc.org.np/retailprice' },
  ]);
  loadNepse(); loadMetals(); loadFx(); loadFuel();
  setInterval(function () { if (!document.hidden) loadNepse(); }, 60e3);
  setInterval(function () { if (!document.hidden) { loadMetals(); loadFx(); } }, 600e3);
})();

'use strict';
/*
 * Server-rendered landing pages for the numbers people in Nepal search for
 * every day: /gold-price, /nepse, /exchange-rate, /fuel-price, /nepali-date and
 * /weather/<city>. The live value is in the <title> and description, and the
 * data sits in plain HTML tables in the first response — no JavaScript needed
 * to read it, so every search engine and link preview sees it. Values come
 * from the same cached producers as the API; when a source is down the page
 * says so instead of guessing.
 */
module.exports = function init({ P, S, site }) {
  const esc = site.esc;
  const TZ = 'Asia/Kathmandu';
  const inr = (n, dp = 0) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const pct = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(2) + '%';
  const signed = (n, dp = 0, unit = 'Rs ') => (n > 0 ? '+' : n < 0 ? '−' : '±') + unit + inr(Math.abs(n), dp);
  const dir = (n) => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat');
  const arrow = (n) => (n > 0 ? '▲' : n < 0 ? '▼' : '•');
  const chg = (n, dp = 0, unit = 'Rs ') => `<span class="ssr-chg ${dir(n)}">${arrow(n)} ${esc(n ? (n > 0 ? '+' : '−') + unit + inr(Math.abs(n), dp) : 'no change')}</span>`;
  /* NEPSE/NRB timestamps without a zone are Nepal Time */
  const toDate = (s) => new Date(/T.*([Zz]|[+-]\d\d:?\d\d)$/.test(s) ? s : /T/.test(s) ? s + '+05:45' : s + 'T12:00:00+05:45');
  const ad = (s, o = { day: 'numeric', month: 'short', year: 'numeric' }) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...o }).format(toDate(s));
  const hm = (s) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(toDate(s)) + ' NPT';
  const NE_DIG = '०१२३४५६७८९';
  const neNum = (s) => String(s).replace(/\d/g, (d) => NE_DIG[d]);
  const BS_EN = ['Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
  const bsText = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${+m[3]} ${BS_EN[+m[2] - 1]} ${m[1]}` : ''; };
  const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');
  const settle = async (p) => { try { return await p; } catch (e) { return null; } };

  const UNAVAILABLE = '<div class="notice"><p>Data currently unavailable — the source didn’t answer. Please try again in a few minutes.</p></div>';
  const kpi = (label, value, extra = '') => `<div class="ssr-kpi"><span class="ssr-kl">${esc(label)}</span><b>${value}</b>${extra}</div>`;
  /* columns after the first are right-aligned numbers unless `num` says otherwise (e.g. [0, 0] for text) */
  const isNum = (num, i) => (num ? !!num[i] : i > 0);
  const tr = (cells, num) => `<tr>${cells.map((c, i) => `<td${isNum(num, i) ? ' class="num"' : ''}>${c}</td>`).join('')}</tr>`;
  const table = (head, rows, num) => `<div class="dtable-wrap"><table class="dtable ssr-table"><thead><tr>${head.map((h, i) => `<th${isNum(num, i) ? ' class="num"' : ''}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  const sec = (title, body) => `<section class="ssr-sec"><h2 class="ssr-h2">${esc(title)}</h2>${body}</section>`;
  const meta = (bits) => `<p class="ssr-meta">${bits.filter(Boolean).join(' · ')}</p>`;
  const ext = (url, text) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>`;
  const RELATED = [['/gold-price', 'Gold price today'], ['/nepse', 'NEPSE today'], ['/exchange-rate', 'Dollar rate today'], ['/fuel-price', 'Petrol price today'],
    ['/nepali-date', 'Nepali date today'], ['/weather/kathmandu', 'Kathmandu weather'], ['/weather/pokhara', 'Pokhara weather']];
  const related = (self) => sec('More live numbers', `<div class="ssr-links">${RELATED.filter(([p]) => p !== self).map(([p, t]) => `<a class="pill" href="${p}">${esc(t)}</a>`).join('')}</div>`);

  const page = (path, o) => ({
    key: o.key, static: true, script: 'page-static.js', title: o.title, description: clip(o.description, 158),
    kicker: o.kicker, h1: o.h1, sub: o.sub, crumbs: o.crumbs,
    body: `<div class="ssr">${o.body}${related(path)}<div id="ssr-sources" hidden data-sources="${esc(JSON.stringify(o.sources || []))}"></div></div>`,
  });

  async function todayBs() {
    const t = await settle(S.calendarToday());
    if (!t || !t.day) return null;
    const d = t.day;
    return { ad: t.today, en: `${d.bs[2]} ${d.monthNameEn} ${d.bs[0]}`, day: d };
  }
  const dayLabel = (iso, bs) => ad(iso) + (bs && bs.ad === iso ? ` (${bs.en})` : '');

  /* ----------------------------------------------------------------- gold */
  async function goldPage() {
    const [g, bs] = await Promise.all([settle(P.goldHP()), todayBs()]);
    const find = (sym, unit) => { const it = g && (g.items || []).find((i) => i.symbol === sym); return it ? (it.prices || []).find((p) => p.unit === unit) : null; };
    const gt = find('HALMARK', '1 tola'), g10 = find('HALMARK', '10 gms'), st = find('SILVER', '1 tola'), s10 = find('SILVER', '10 gms');
    const crumbs = [['Money', '/money'], ['Gold price', '/gold-price']];
    const sources = [{ name: 'Hamro Patro — gold & silver rates', url: 'https://www.hamropatro.com/gold' }];
    const base = { key: 'money', kicker: 'Gold price', crumbs, sources, h1: 'Gold price in Nepal <em>today</em>' };
    if (!gt) {
      return page('/gold-price', { ...base, title: 'Gold Price in Nepal Today | Nepal Live', description: 'Today’s gold and silver price in Nepal per tola and per 10 grams, with daily history.', sub: 'Hallmark gold and silver, per tola and per 10 grams.', body: UNAVAILABLE });
    }
    const d = (p) => (p ? +(p.price - p.prevPrice).toFixed(1) : 0);
    const dp = (n) => (n % 1 ? 1 : 0);
    const day = dayLabel(gt.date, bs);
    const kpis = '<div class="ssr-kpis">'
      + kpi('Hallmark gold · per tola', 'Rs ' + inr(gt.price), chg(d(gt)))
      + (g10 ? kpi('Hallmark gold · per 10 grams', 'Rs ' + inr(g10.price, dp(g10.price)), chg(d(g10), dp(d(g10)))) : '')
      + (st ? kpi('Silver · per tola', 'Rs ' + inr(st.price), chg(d(st))) : '')
      + (s10 ? kpi('Silver · per 10 grams', 'Rs ' + inr(s10.price, dp(s10.price)), chg(d(s10), dp(d(s10)))) : '')
      + '</div>';
    const gs = (gt.series || []).slice(-30);
    const silver = new Map(((st && st.series) || []).map((x) => [x.date, x.price]));
    const hi = gs.reduce((m, x) => (x.price > m.price ? x : m), gs[0] || gt);
    const lo = gs.reduce((m, x) => (x.price < m.price ? x : m), gs[0] || gt);
    const newest = gs.slice().reverse();
    const rows = newest.map((x, i) => {
      const prev = newest[i + 1];
      return tr([esc(ad(x.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })), 'Rs ' + inr(x.price), prev ? chg(x.price - prev.price) : '—', silver.has(x.date) ? 'Rs ' + inr(silver.get(x.date)) : '—']);
    });
    const body = kpis
      + meta([`Rate for <b>${esc(day)}</b>`, 'Source: ' + ext('https://www.hamropatro.com/gold', 'Hamro Patro'), g.fetchedAt ? 'checked ' + esc(hm(g.fetchedAt)) : ''])
      + (gs.length ? sec('Last 30 days', `<p class="ssr-p">Over the last ${gs.length} published rates, hallmark gold ranged from <b>Rs ${inr(lo.price)}</b> (${esc(ad(lo.date))}) to <b>Rs ${inr(hi.price)}</b> (${esc(ad(hi.date))}) per tola.</p>`
        + table(['Date', 'Gold per tola', 'Change', 'Silver per tola'], rows)) : '')
      + sec('Good to know', '<ul class="ssr-ul"><li><b>1 tola = 11.6638 grams.</b> Nepal’s gold market quotes prices per tola and per 10 grams.</li>'
        + '<li>Rates are published on working days; there is usually no new rate on Saturdays, so the last published rate stays in effect.</li>'
        + '<li>Jewellers add making charges and tax to these base rates. <a href="/money#metals">See the charts →</a></li></ul>');
    return page('/gold-price', {
      ...base, body,
      title: `Gold Price in Nepal Today: Rs ${inr(gt.price)}/tola | Nepal Live`,
      description: `Hallmark gold Rs ${inr(gt.price)} per tola (${signed(d(gt))}) and silver Rs ${st ? inr(st.price) : '—'} per tola on ${day}. Daily rates with 30-day history.`,
      sub: `Hallmark gold and silver rates for ${day}, per tola and per 10 grams.`,
    });
  }

  /* ---------------------------------------------------------------- NEPSE */
  async function nepsePage() {
    const [n, top, st] = await Promise.all([settle(P.nepse()), settle(P.nepseTop()), settle(P.nepseStatus())]);
    const crumbs = [['Money', '/money'], ['NEPSE', '/nepse']];
    const sources = [{ name: 'Nepal Stock Exchange (NEPSE)', url: 'https://www.nepalstock.com/' }];
    const base = { key: 'money', kicker: 'NEPSE', crumbs, sources, h1: 'NEPSE <em>today</em>' };
    const idx = n && (n.indices || []).find((i) => /^nepse index$/i.test(i.index));
    if (!idx) {
      return page('/nepse', { ...base, title: 'NEPSE Today — Nepal Stock Market | Nepal Live', description: 'NEPSE index today with turnover, top gainers and losers and sub-indices.', sub: 'The Nepal Stock Exchange index, turnover and top movers.', body: UNAVAILABLE });
    }
    const sum = {};
    (n.summary || []).forEach((s) => { sum[s.detail] = s.value; });
    const turnover = sum['Total Turnover Rs:'], scrips = sum['Total Scrips Traded'];
    const arba = (x) => (x / 1e9).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' Arba';
    const num = (x) => +(+x || 0).toFixed(2);
    const v = num(idx.currentValue), c = num(idx.change), p = num(idx.perChange);
    const open = st && /open/i.test(st.isOpen);
    const status = st ? `<span class="ssr-tag">${open ? 'Market open' : 'Market closed'}</span>`
      + (st.asOf ? ' as of ' + esc(ad(st.asOf, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })) + ' NPT' : '') : '';
    const kpis = '<div class="ssr-kpis">'
      + kpi('NEPSE Index', inr(v, 2), `<span class="ssr-chg ${dir(c)}">${arrow(c)} ${esc(signed(c, 2, ''))} (${esc(pct(p))})</span>`)
      + (turnover != null ? kpi('Turnover', 'Rs ' + esc(arba(turnover)), `<span class="ssr-kl">Rs ${inr(turnover)}</span>`) : '')
      + (sum['Total Traded Shares'] != null ? kpi('Shares traded', inr(sum['Total Traded Shares']), sum['Total Transactions'] != null ? `<span class="ssr-kl">${inr(sum['Total Transactions'])} transactions</span>` : '') : '')
      + (idx.fiftyTwoWeekHigh ? kpi('52-week range', `${inr(idx.fiftyTwoWeekLow, 2)} – ${inr(idx.fiftyTwoWeekHigh, 2)}`) : '')
      + '</div>';
    const idxRows = (n.indices || []).map((i) => tr([esc(i.index), inr(num(i.currentValue), 2), chg(num(i.change), 2, ''), `<span class="ssr-chg ${dir(num(i.perChange))}">${esc(pct(num(i.perChange)))}</span>`]));
    const name = (s) => esc(String(s || '').replace(/\s+/g, ' ').trim());
    const mover = (list) => table(['Company', 'Last price (Rs)', 'Change'], (list || []).map((x) => tr([
      `<b>${esc(x.symbol)}</b> <span class="ssr-sub">${name(x.securityName)}</span>`, inr(num(x.ltp), 2), `<span class="ssr-chg ${dir(num(x.percentageChange))}">${esc(pct(num(x.percentageChange)))}</span>`])));
    const body = kpis
      + meta([status, scrips != null ? inr(scrips) + ' scrips traded' : '', 'Source: ' + ext('https://www.nepalstock.com/', 'Nepal Stock Exchange'), n.fetchedAt ? 'checked ' + esc(hm(n.fetchedAt)) : ''])
      + sec('Indices', table(['Index', 'Value', 'Change', '% change'], idxRows))
      + (top ? sec('Top gainers', mover(top.gainers)) + sec('Top losers', mover(top.losers))
        + sec('Highest turnover', table(['Company', 'Turnover (Rs)', 'Close (Rs)'], (top.turnover || []).map((x) => tr([
          `<b>${esc(x.symbol)}</b> <span class="ssr-sub">${name(x.securityName)}</span>`, inr(num(x.turnover)), inr(num(x.closingPrice), 2)])))) : '')
      + sec('Good to know', '<ul class="ssr-ul"><li>NEPSE trades Sunday to Thursday, 11:00–15:00 Nepal Time.</li><li>Turnover is shown in Arba: 1 Arba = Rs 1 billion (100 crore).</li>'
        + '<li>For the index chart and more detail, see <a href="/money#nepse">Nepal Money →</a></li></ul>');
    return page('/nepse', {
      ...base, body,
      title: `NEPSE Today: ${inr(v, 2)} (${pct(p)}) | Nepal Live`,
      description: `NEPSE index ${inr(v, 2)}, ${signed(c, 2, '')} points (${pct(p)})${turnover != null ? `, turnover Rs ${arba(turnover)}` : ''}. Top gainers, losers and all sub-indices.`,
      sub: 'The Nepal Stock Exchange index, turnover, sub-indices and today’s top movers.',
    });
  }

  /* ------------------------------------------------------- exchange rates */
  const CUR = { USD: 'US dollar', EUR: 'Euro', GBP: 'UK pound sterling', INR: 'Indian rupee', CHF: 'Swiss franc', AUD: 'Australian dollar', CAD: 'Canadian dollar',
    SGD: 'Singapore dollar', JPY: 'Japanese yen', CNY: 'Chinese yuan', SAR: 'Saudi riyal', QAR: 'Qatari riyal', THB: 'Thai baht', AED: 'UAE dirham',
    MYR: 'Malaysian ringgit', KRW: 'South Korean won', SEK: 'Swedish krona', DKK: 'Danish krone', HKD: 'Hong Kong dollar', KWD: 'Kuwaiti dinar',
    BHD: 'Bahraini dinar', OMR: 'Omani rial' };
  async function fxPage() {
    const [fx, bs] = await Promise.all([settle(P.forex()), todayBs()]);
    const days = ((fx && fx.days) || []).filter((d) => d.rates && d.rates.USD).sort((a, b) => a.date.localeCompare(b.date));
    const last = days[days.length - 1], prev = days[days.length - 2];
    const crumbs = [['Money', '/money'], ['Exchange rates', '/exchange-rate']];
    const sources = [{ name: 'Nepal Rastra Bank — foreign exchange rates', url: 'https://www.nrb.org.np/forex/' }];
    const base = { key: 'money', kicker: 'Exchange rates', crumbs, sources, h1: 'Dollar rate in Nepal <em>today</em>' };
    if (!last) {
      return page('/exchange-rate', { ...base, title: 'Dollar Rate in Nepal Today — NRB Exchange Rates | Nepal Live', description: 'Nepal Rastra Bank exchange rates for the US dollar, Indian rupee and 20 more currencies.', sub: 'Nepal Rastra Bank’s official exchange rates.', body: UNAVAILABLE });
    }
    /* rates are stored per 1 unit; show them per NRB's published unit (e.g. 100 INR, 10 JPY) */
    const at = (r, k) => r[k] * r.unit;
    const day = dayLabel(last.date, bs);
    const u = last.rates.USD, pu = prev && prev.rates.USD;
    const move = (code) => { const r = last.rates[code], pr = prev && prev.rates[code]; return pr ? chg(+(at(r, 'buy') - at(pr, 'buy')).toFixed(2), 2) : '—'; };
    const card = (code) => {
      const r = last.rates[code];
      if (!r) return '';
      return kpi(`${CUR[code]} (${code})${r.unit > 1 ? ' · per ' + r.unit : ''}`, 'Rs ' + inr(at(r, 'buy'), 2), `<span class="ssr-kl">buying · selling Rs ${inr(at(r, 'sell'), 2)}</span>` + move(code));
    };
    const rows = Object.keys(CUR).filter((k) => last.rates[k]).map((k) => {
      const r = last.rates[k];
      return tr([`<b>${k}</b> <span class="ssr-sub">${esc(CUR[k])}</span>`, String(r.unit), inr(at(r, 'buy'), 2), inr(at(r, 'sell'), 2), move(k)]);
    });
    const usdRows = days.slice(-7).reverse().map((d) => tr([esc(ad(d.date, { weekday: 'short', day: 'numeric', month: 'short' })), inr(d.rates.USD.buy, 2), inr(d.rates.USD.sell, 2)]));
    const body = '<div class="ssr-kpis">' + card('USD') + card('EUR') + card('GBP') + card('INR') + '</div>'
      + meta([`Rates for <b>${esc(day)}</b>`, 'Source: ' + ext('https://www.nrb.org.np/forex/', 'Nepal Rastra Bank')])
      + sec('All currencies', table(['Currency', 'Unit', 'Buying (Rs)', 'Selling (Rs)', 'Change'], rows))
      + sec('US dollar, last 7 days', table(['Date', 'Buying (Rs)', 'Selling (Rs)'], usdRows))
      + sec('Good to know', '<ul class="ssr-ul"><li>These are Nepal Rastra Bank’s reference rates. Banks and money changers set their own rates, which can differ.</li>'
        + '<li>Some currencies are quoted per 10 or 100 units, as NRB publishes them (see the Unit column).</li><li>Convert any amount with the <a href="/money#fx">currency converter →</a></li></ul>');
    return page('/exchange-rate', {
      ...base, body,
      title: `Dollar Rate in Nepal Today: Rs ${inr(u.buy, 2)} | Nepal Live`,
      description: `Nepal Rastra Bank rate for ${day}: US dollar buying Rs ${inr(u.buy, 2)}, selling Rs ${inr(u.sell, 2)}${pu ? ` (${signed(+(u.buy - pu.buy).toFixed(2), 2)})` : ''}. Indian rupee, riyal, dirham and 18 more.`,
      sub: `Nepal Rastra Bank’s official buying and selling rates for ${Object.keys(last.rates).length} currencies.`,
    });
  }

  /* ----------------------------------------------------------------- fuel */
  async function fuelPage() {
    const f = await settle(S.fuel());
    const c = f && f.current, pv = f && f.previous;
    const crumbs = [['Money', '/money'], ['Fuel prices', '/fuel-price']];
    const sources = [{ name: 'Nepal Oil Corporation — retail prices', url: 'https://noc.org.np/retailprice' }];
    const base = { key: 'money', kicker: 'Fuel prices', crumbs, sources, h1: 'Petrol price in Nepal <em>today</em>' };
    if (!c) {
      return page('/fuel-price', { ...base, title: 'Petrol Price in Nepal Today | Nepal Live', description: 'Nepal Oil Corporation retail prices for petrol, diesel, kerosene and LPG.', sub: 'Nepal Oil Corporation retail prices.', body: UNAVAILABLE });
    }
    const ITEMS = [['Petrol', 'petrol', 'per litre'], ['Diesel', 'diesel', 'per litre'], ['Kerosene', 'kerosene', 'per litre'], ['LPG (cooking gas)', 'lpg', 'per cylinder']];
    const when = `${bsText(c.dateBs)} (${ad(c.date)})`;
    const kpis = '<div class="ssr-kpis">' + ITEMS.filter(([, k]) => c[k] != null)
      .map(([label, k, unit]) => kpi(`${label} · ${unit}`, 'Rs ' + inr(c[k]), pv && pv[k] != null ? chg(c[k] - pv[k]) : '')).join('') + '</div>';
    const rows = (f.history || []).map((h) => tr([esc(`${bsText(h.dateBs)} · ${ad(h.date)}`), inr(h.petrol), inr(h.diesel), inr(h.kerosene), inr(h.lpg)]));
    const body = kpis
      + meta([`Effective <b>${esc(when)}</b>${c.time ? ', ' + esc(c.time) : ''}`, 'Source: ' + ext('https://noc.org.np/retailprice', 'Nepal Oil Corporation')])
      + (f.note ? `<p class="ssr-p">${esc(f.note)}</p>` : '')
      + (rows.length ? sec('Recent price changes', table(['Effective from', 'Petrol', 'Diesel', 'Kerosene', 'LPG'], rows)) : '');
    return page('/fuel-price', {
      ...base, body,
      title: `Petrol Price in Nepal Today: Rs ${inr(c.petrol)}/litre | Nepal Live`,
      description: `Nepal Oil Corporation prices effective ${when}: petrol Rs ${inr(c.petrol)}/L, diesel Rs ${inr(c.diesel)}/L, kerosene Rs ${inr(c.kerosene)}/L, LPG Rs ${inr(c.lpg)} per cylinder.`,
      sub: 'Nepal Oil Corporation retail prices for petrol, diesel, kerosene and LPG.',
    });
  }

  /* ---------------------------------------------------------- Nepali date */
  const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const WD_NE = ['आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'];
  async function datePage() {
    const [t, up] = await Promise.all([settle(S.calendarToday()), settle(S.calendarUpcoming(45))]);
    const crumbs = [['Calendar', '/calendar'], ['Nepali date today', '/nepali-date']];
    const sources = [{ name: 'Hamro Patro — calendar', url: 'https://www.hamropatro.com/calendar' }];
    const base = { key: 'calendar', kicker: 'Nepali date', crumbs, sources, h1: 'Nepali date <em>today</em>' };
    if (!t || !t.day) {
      return page('/nepali-date', { ...base, title: 'Nepali Date Today | Nepal Live', description: 'Today’s Nepali (Bikram Sambat) date with tithi and upcoming holidays.', sub: 'Today in the Bikram Sambat calendar.', body: UNAVAILABLE });
    }
    const d = t.day;
    const bsEn = `${d.bs[2]} ${d.monthNameEn} ${d.bs[0]}`;
    const gate = `${d.monthNameNp} ${d.bsNp || neNum(d.bs[2])} गते`;
    const bsNe = `${neNum(d.bs[0])} ${gate}, ${WD_NE[d.dow]}`;
    const adLong = ad(t.today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const evs = (d.events || []).map((e) => esc(e.en || e.np) + (e.np && e.en ? ` <span lang="ne" class="ssr-sub">${esc(e.np)}</span>` : '')).join('<br>');
    const box = `<div class="ssr-date"><span class="ssr-kl">Today in Nepal</span><b class="ssr-bs">${esc(bsEn)}</b><b class="ssr-bsne" lang="ne">${esc(bsNe)}</b>`
      + `<span>${esc(adLong)} AD</span>${d.tithi ? `<span>Tithi: <span lang="ne">${esc(d.tithi)}</span></span>` : ''}`
      + `${d.holiday ? '<span><span class="ssr-tag">Public holiday</span></span>' : ''}${evs ? `<p class="ssr-p">${evs}</p>` : ''}</div>`;
    const items = ((up && up.items) || []).filter((x) => x.ad > t.today).slice(0, 15);
    const rows = items.map((x) => tr([
      esc(`${ad(x.ad, { weekday: 'short', day: 'numeric', month: 'short' })} · ${x.bs[2]} ${x.monthNameEn}`),
      x.events.slice(0, 3).map((e) => esc(e.en || e.np)).join(', ')
        + (x.holiday ? ` <span class="ssr-tag">${x.events.some((e) => e.restricted) ? 'Holiday for some groups' : 'Public holiday'}</span>` : ''),
    ], [0, 0]));
    const body = box
      + meta(['Source: ' + ext('https://www.hamropatro.com/calendar', 'Hamro Patro'), 'Full month: <a href="/calendar">Nepali calendar →</a>'])
      + (rows.length ? sec('Coming up', table(['Date', 'Festivals, days & holidays'], rows, [0, 0])) : '')
      + sec('About the Nepali calendar', '<ul class="ssr-ul"><li>Nepal officially uses the Bikram Sambat (BS) calendar, about 56 years and 8½ months ahead of the Gregorian (AD) calendar.</li>'
        + '<li>The Nepali new year, 1 Baisakh, falls in mid-April. Months have 29 to 32 days, and their lengths change from year to year.</li>'
        + '<li>Public holidays are set by the Government of Nepal and can change; the Ministry of Home Affairs publishes the official list.</li></ul>');
    return page('/nepali-date', {
      ...base, body,
      title: `Nepali Date Today: ${bsEn} (${d.monthNameNp} ${d.bsNp || neNum(d.bs[2])}) | Nepal Live`,
      description: `Today is ${bsEn} BS — ${WD[d.dow]}, ${ad(t.today)}. Aaja ko gate: ${gate}. Tithi, festivals and upcoming public holidays in Nepal.`,
      sub: `${adLong} — in the Bikram Sambat calendar.`,
    });
  }

  /* --------------------------------------------------------- city weather */
  const WMO = { 0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Icy fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    56: 'Freezing drizzle', 57: 'Freezing drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain', 71: 'Light snow',
    73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains', 80: 'Light showers', 81: 'Showers', 82: 'Heavy showers', 85: 'Snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail' };
  const AQI = [[50, 'Good'], [100, 'Moderate'], [150, 'Unhealthy for sensitive groups'], [200, 'Unhealthy'], [300, 'Very unhealthy'], [Infinity, 'Hazardous']];
  const WX_IDS = S.CITIES.slice(0, 14).map((c) => c.id);
  async function weatherPage(id) {
    const [w, a] = await Promise.all([settle(S.weatherCities()), settle(S.airCities())]);
    const info = S.CITIES.find((c) => c.id === id);
    const c = ((w && w.cities) || []).find((x) => x.id === id);
    const air = ((a && a.cities) || []).find((x) => x.id === id);
    const crumbs = [['Weather', '/weather'], [info.en, '/weather/' + id]];
    const sources = [{ name: 'Open-Meteo — weather & air quality', url: 'https://open-meteo.com/' }];
    const base = { key: 'weather', kicker: 'Nepal weather', crumbs, sources, h1: `${esc(info.en)} weather <em>today</em>` };
    const sub = `${info.ne} · ${info.district} district, ${info.province} Province — current conditions and today’s forecast.`;
    if (!c || !c.current) {
      return page('/weather/' + id, { ...base, sub, title: `${info.en} Weather Today | Nepal Live`, description: `Current weather and today’s forecast for ${info.en}, Nepal.`, body: UNAVAILABLE });
    }
    const now = c.current, td = c.today || {}, desc = WMO[now.weather_code] || 'Weather';
    const T = Math.round(now.temperature_2m), aqi = air && air.current && air.current.us_aqi;
    const band = aqi != null ? AQI.find(([max]) => aqi <= max)[1] : null;
    const others = ((w && w.cities) || []).filter((x) => x.id !== id && x.current)
      .map((x) => `<a href="/weather/${x.id}">${esc(x.en)} <span>${Math.round(x.current.temperature_2m)}°C</span></a>`).join('');
    const body = '<div class="ssr-kpis">'
      + kpi('Now', `${T}°C`, `<span class="ssr-kl">${esc(desc)}</span>`)
      + kpi('Feels like', `${Math.round(now.apparent_temperature)}°C`)
      + kpi('Humidity', `${Math.round(now.relative_humidity_2m)}%`)
      + kpi('Wind', `${Math.round(now.wind_speed_10m)} km/h`)
      + (td.min != null ? kpi('Today', `${Math.round(td.min)}° – ${Math.round(td.max)}°C`) : '')
      + (td.rain != null ? kpi('Chance of rain today', `${td.rain}%`) : '')
      + (aqi != null ? kpi('Air quality (US AQI)', String(Math.round(aqi)), `<span class="ssr-kl">${esc(band)}</span>`) : '')
      + '</div>'
      + meta([w.fetchedAt ? `Updated <b>${esc(hm(w.fetchedAt))}</b>` : '', 'Model estimates from ' + ext((w.source && w.source.url) || 'https://open-meteo.com/', (w.source && w.source.name) || 'Open-Meteo') + ' for the city centre',
        `<a href="/weather?city=${id}">Hourly &amp; 7-day forecast →</a>`, `<a href="/explore?city=${id}">On the map →</a>`])
      + (others ? sec('Weather in other cities', `<div class="ssr-cities">${others}</div>`) : '');
    /* long conditions ("Thunderstorm with hail") would push the title past what Google shows */
    const full = `${info.en} Weather Today: ${T}°C, ${desc} | Nepal Live`;
    return page('/weather/' + id, {
      ...base, sub, body,
      title: full.length <= 60 ? full : `${info.en} Weather Today: ${T}°C | Nepal Live`,
      description: `Weather in ${info.en} now: ${T}°C (feels like ${Math.round(now.apparent_temperature)}°C), ${desc.toLowerCase()}, humidity ${Math.round(now.relative_humidity_2m)}%.`
        + (td.min != null ? ` Today ${Math.round(td.min)}–${Math.round(td.max)}°C${td.rain != null ? `, ${td.rain}% chance of rain` : ''}.` : ''),
    });
  }

  const FIXED = { '/gold-price': goldPage, '/nepse': nepsePage, '/exchange-rate': fxPage, '/fuel-price': fuelPage, '/nepali-date': datePage };
  return {
    has: (p) => !!FIXED[p] || (/^\/weather\/[a-z]+$/.test(p) && WX_IDS.includes(p.slice(9))),
    async render(p, origin) {
      const def = FIXED[p] ? await FIXED[p]() : await weatherPage(p.slice(9));
      return site.renderDef(def, p, origin);
    },
    paths: () => Object.keys(FIXED).concat(WX_IDS.map((id) => '/weather/' + id)),
  };
};

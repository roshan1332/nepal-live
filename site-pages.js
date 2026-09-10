/*
 * Nepal Live — server-rendered page shells for the section pages (/news,
 * /alerts, /roads, …). Each page gets its own title, description, canonical
 * URL, Open Graph tags and semantic headings in the HTML itself, so it is
 * shareable and indexable before any script runs. The shared chrome (header,
 * ticker, footer) is filled in by app.js; page data by page-<name>.js.
 *
 * Visible copy is English in the HTML; elements marked data-t / data-th are
 * re-translated on the client when the reader picks नेपाली.
 */
'use strict';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-17.582 -4.664 71.571 87.246'%3E%3Cpath d='M-15,37.574h60L-15,0v80h60L-15,20z' fill='%23DC143C' stroke='%23003893' stroke-width='5.165' stroke-linejoin='round' paint-order='stroke'/%3E%3Cg fill='%23fff'%3E%3Cpath d='M-11.95,23.483A12.84,12.84 0 0 0 11.95,23.483A11.95,11.95 0 0 1-11.95,23.483'/%3E%3Ccircle cy='29.045' r='5.561'/%3E%3Cpath d='M2.128,23.907L1.507,21.47L0,23.484ZM3.932,25.113L4.291,22.623L2.128,23.907ZM5.138,26.917L6.422,24.754L3.932,25.113ZM5.561,29.045L7.575,27.538L5.138,26.917ZM5.138,31.173L7.575,30.552L5.561,29.045ZM3.932,32.977L6.422,33.336L5.138,31.173ZM-2.128,23.907L-1.507,21.47L0,23.484ZM-3.932,25.113L-4.291,22.623L-2.128,23.907ZM-5.138,26.917L-6.422,24.754L-3.932,25.113ZM-5.561,29.045L-7.575,27.538L-5.138,26.917ZM-5.138,31.173L-7.575,30.552L-5.561,29.045ZM-3.932,32.977L-6.422,33.336L-5.138,31.173Z'/%3E%3Ccircle cy='58.787' r='8.143'/%3E%3Cpath d='M2.108,66.653L0,71.627L-2.108,66.653ZM-2.108,66.653L-6.42,69.907L-5.758,64.545ZM-5.758,64.545L-11.12,65.207L-7.866,60.895ZM-7.866,60.895L-12.84,58.787L-7.866,56.679ZM-7.866,56.679L-11.12,52.367L-5.758,53.029ZM-5.758,53.029L-6.42,47.667L-2.108,50.921ZM-2.108,50.921L0,45.947L2.108,50.921ZM2.108,50.921L6.42,47.667L5.758,53.029ZM5.758,53.029L11.12,52.367L7.866,56.679ZM7.866,56.679L12.84,58.787L7.866,60.895ZM7.866,60.895L11.12,65.207L5.758,64.545ZM5.758,64.545L6.42,69.907L2.108,66.653Z'/%3E%3C/g%3E%3C/svg%3E";

const ICO = {
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>',
};
const refreshBtn = (id, label = 'Refresh') =>
  `<button class="btn" id="${id}" type="button">${ICO.refresh}<span data-t="refresh">${label}</span></button>`;
const secHead = (kickerKey, kicker, titleKey, title, extra = '') =>
  `<div class="sec-head"><div><span class="kicker" data-t="${kickerKey}">${esc(kicker)}</span><h2 class="sec-title" data-t="${titleKey}">${esc(title)}</h2></div>${extra}</div>`;

/* ------------------------------------------------------------------- pages */
const PAGES = {
  '/news': {
    key: 'news', script: 'page-news.js', changefreq: 'hourly', priority: '0.9',
    title: 'Nepal News Today — Latest Headlines from Nepali Newsrooms · Nepal Live',
    description: 'The latest Nepal news in English and Nepali from OnlineKhabar, Setopati, Khabarhub, Nagarik News, The Himalayan Times and Ratopati — filter by topic, language and publisher. Every story links to the original publisher.',
    kicker: 'News', h1: 'Nepal <em>news</em>', sub: 'Headlines from Nepali newsrooms, updated through the day. Every story opens on the original publisher’s site.',
    side: `<span class="stamp" id="stamp-news"></span>${refreshBtn('news-refresh')}`,
    body: `
  <div class="news-tools">
    <div class="pills" id="pills" role="tablist" aria-label="News categories"></div>
    <div class="sec-actions news-filters">
      <label class="field-search">${ICO.search}<input id="news-q" type="search" autocomplete="off" placeholder="Filter headlines…" data-tp="filterPh" aria-label="Filter headlines"></label>
      <div class="seg" role="group" aria-label="Headline language">
        <button type="button" data-filter="all" data-t="all">All</button><button type="button" data-filter="en">English</button><button type="button" data-filter="ne">नेपाली</button>
      </div>
      <select id="news-src" aria-label="Publisher"><option value="" data-t="allSources">All publishers</option></select>
    </div>
  </div>
  <div class="news-layout">
    <div><h2 class="visually-hidden" data-t="latestTitle">Latest headlines</h2><div id="news-list"></div><div class="more-row" id="news-more"></div></div>
    <aside class="news-side">
      <div class="side-block"><h2 class="label" data-t="mostCovered">Most covered right now</h2><div id="news-covered"></div></div>
      <div class="side-block"><h2 class="label" data-t="publishers">Publishers</h2><div id="news-pubs"></div></div>
    </aside>
  </div>
  <p class="agg-note">${ICO.info}<span data-t="aggNote">Nepal Live aggregates headlines from Nepali publishers. Every story opens on the original publisher’s site — we don’t rehost or edit their journalism.</span></p>`,
  },

  '/alerts': {
    key: 'alerts', script: 'page-alerts.js', changefreq: 'always', priority: '0.9',
    title: 'Nepal Alerts — Floods, Landslides, Road Closures, Earthquakes · Nepal Live',
    description: 'Live and recent public alerts for Nepal: river flood warnings from DHM gauges, road closures from the Department of Roads, heavy rainfall, air pollution, earthquakes and GDACS disaster alerts — each with its source and time.',
    kicker: 'Nepal Alerts', h1: 'Important <em>alerts</em>', sub: 'Official warnings and live measurements from government and international sources. Nothing here is estimated or invented.',
    side: `<span class="stamp" id="stamp-alerts"></span>${refreshBtn('alerts-refresh')}`,
    body: `
  <div class="alert-summary" id="alert-summary" aria-live="polite"></div>
  <div class="alert-tools">
    <div class="pills" id="alert-cats" role="tablist" aria-label="Alert type"></div>
    <div class="seg" role="group" aria-label="Show">
      <button type="button" data-show="active" aria-pressed="true" data-t="activeOnly">Active</button><button type="button" data-show="all" data-t="all">All recent</button>
    </div>
  </div>
  <div id="alert-list" class="alert-list"></div>
  <section class="sec" aria-labelledby="inc-title">
    ${secHead('reportedK', 'Reported', 'incTitle', 'Incidents reported in the last 72 hours').replace('<h2 class="sec-title"', '<h2 class="sec-title" id="inc-title"')}
    <div id="incident-list"></div>
  </section>
  <section class="sec" aria-labelledby="lvl-title">
    ${secHead('methodK', 'Method', 'lvlTitle', 'How alert levels are assigned').replace('<h2 class="sec-title"', '<h2 class="sec-title" id="lvl-title"')}
    <div class="levels-legend" id="levels-legend"></div>
    <div id="alert-sources" class="source-list"></div>
  </section>`,
  },

  '/roads': {
    key: 'roads', script: 'page-roads.js', changefreq: 'hourly', priority: '0.8',
    title: 'Nepal Roads — Highway Closures & Road Conditions · Nepal Live',
    description: 'Road closures reported by Nepal’s Department of Roads, status by major highway corridor — Prithvi, Narayanghat–Mugling, BP, Araniko, Karnali, East–West — and road news from Nepali publishers.',
    kicker: 'Nepal Roads', h1: 'Roads & <em>highways</em>', sub: 'Closures reported by the Department of Roads and road news from Nepali publishers — with the time of every report.',
    side: `<span class="stamp" id="stamp-roads"></span>${refreshBtn('roads-refresh')}`,
    body: `
  <div class="notice" id="roads-note">${ICO.info}<p data-t="roadsNote">Nepal Live shows closures the Department of Roads reports through the government’s BIPAD Portal, plus road news from publishers. There is no public live-traffic feed for Nepal’s highways, so we don’t show traffic speed (slow / heavy) — we won’t guess it.</p></div>
  <section class="sec first" aria-labelledby="cor-title">
    ${secHead('routesK', 'Major routes', 'corTitle', 'Status by corridor').replace('<h2 class="sec-title"', '<h2 class="sec-title" id="cor-title"')}
    <div class="corridor-grid" id="corridors"></div>
  </section>
  <section class="sec" aria-labelledby="clo-title">
    ${secHead('dorK', 'Department of Roads', 'cloTitle', 'Active closures').replace('<h2 class="sec-title"', '<h2 class="sec-title" id="clo-title"')}
    <div id="closures" class="alert-list"></div>
  </section>
  <section class="sec" aria-labelledby="end-title">
    ${secHead('recentK', 'Recent', 'endTitle', 'Closures that ended in the last 72 hours').replace('<h2 class="sec-title"', '<h2 class="sec-title" id="end-title"')}
    <div id="ended" class="alert-list"></div>
  </section>
  <section class="sec" aria-labelledby="rn-title">
    ${secHead('reportedK', 'Reported', 'rnTitle', 'Road news from publishers').replace('<h2 class="sec-title"', '<h2 class="sec-title" id="rn-title"')}
    <div id="road-news"></div>
  </section>`,
  },

  '/trending': {
    key: 'trending', script: 'page-trending.js', changefreq: 'hourly', priority: '0.7',
    title: 'Trending in Nepal — Most Covered Topics Right Now · Nepal Live',
    description: 'The topics Nepali newsrooms are covering most right now, counted from real headlines across publishers — news, politics, business, sports, technology and entertainment.',
    kicker: 'Trending now', h1: 'Trending in <em>Nepal</em>', sub: 'Topics that appear in the most headlines across Nepali publishers — counted, not guessed.',
    side: `<span class="stamp" id="stamp-trending"></span>${refreshBtn('trending-refresh')}`,
    body: `
  <p class="basis" id="trend-basis"></p>
  <div class="trend-cats" id="trend-cats" aria-label="Headlines by category"></div>
  <div class="pills" id="trend-filter" role="tablist" aria-label="Category"></div>
  <div class="trend-grid" id="trend-list"></div>
  <p class="agg-note">${ICO.info}<span data-t="trendMethod">Method: a topic is listed when it appears in at least 3 headlines from at least 2 different publishers in the period. Counts are headlines, not views or searches.</span></p>`,
  },
};

const stampOnly = (id) => `<div class="sec-actions"><span class="stamp" id="${id}"></span></div>`;
const head2 = (id, kk, k, tk, tt, extra) => secHead(kk, k, tk, tt, extra || '').replace('<h2 class="sec-title"', `<h2 class="sec-title" id="${id}"`);
const footSrc = (key, text, href, label) => `<div class="card-foot"><span data-t="${key}">${esc(text)}</span><a href="${href}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a></div>`;

Object.assign(PAGES, {
  '/money': {
    key: 'money', script: 'page-money.js', changefreq: 'hourly', priority: '0.9',
    title: 'Nepal Money — NEPSE, Gold & Silver Price, Exchange Rates, Fuel Prices · Nepal Live',
    description: 'NEPSE index with charts and top movers, today’s gold and silver price per tola, Nepal Rastra Bank exchange rates for USD, INR, EUR, GBP, AUD and more, and Nepal Oil Corporation fuel prices — each with its source and update time.',
    kicker: 'Nepal Money', h1: 'Money & <em>markets</em>', sub: 'NEPSE, gold and silver, official exchange rates and fuel prices — from the institutions that publish them.',
    body: `
  <nav class="subnav" aria-label="On this page"><a href="#nepse">NEPSE</a><a href="#metals" data-t="navMetals">Gold &amp; silver</a><a href="#fx" data-t="navFx">Exchange rates</a><a href="#fuel" data-t="navFuel">Fuel prices</a></nav>
  <section class="sec first" id="nepse" aria-labelledby="nepse-h">
    ${head2('nepse-h', 'nepseK', 'Nepal Stock Exchange', 'nepseH', 'NEPSE index', `<div class="sec-actions"><span class="chip closed" id="nepse-status" hidden></span><span class="stamp" id="stamp-nepse"></span></div>`)}
    <div class="money-2">
      <div class="card"><div class="card-body" id="nepse-main"></div>${footSrc('srcNepse', 'Official NEPSE feed · not investment advice', 'https://www.nepalstock.com/', 'nepalstock.com')}</div>
      <div class="card"><div class="card-body" id="nepse-stats"></div></div>
    </div>
    <div class="money-3" id="nepse-movers"></div>
  </section>
  <section class="sec" id="metals" aria-labelledby="metals-h">
    ${head2('metals-h', 'metalsK', 'Hamro Patro / FEGOD', 'metalsH', 'Gold & silver', stampOnly('stamp-metals'))}
    <div class="money-2" id="metals-body"></div>
    <p class="spot-line" id="spot-line"></p>
  </section>
  <section class="sec" id="fx" aria-labelledby="fx-h">
    ${head2('fx-h', 'fxK', 'Nepal Rastra Bank', 'fxH', 'Exchange rates', stampOnly('stamp-fx'))}
    <div class="money-2">
      <div class="card"><div class="card-head"><h3 data-t="convH">Currency converter</h3></div><div class="card-body" id="fx-conv"></div></div>
      <div class="card"><div class="card-body" id="fx-chart"></div></div>
    </div>
    <div class="card mt"><div class="table-wrap" id="fx-table"></div><div class="card-foot"><span id="fx-src"></span><a href="https://www.nrb.org.np/forex/" target="_blank" rel="noopener noreferrer">nrb.org.np ↗</a></div></div>
  </section>
  <section class="sec" id="fuel" aria-labelledby="fuel-h">
    ${head2('fuel-h', 'fuelKk', 'Nepal Oil Corporation', 'fuelH', 'Fuel prices', stampOnly('stamp-fuel'))}
    <div class="fuel-grid" id="fuel-now"></div>
    <div class="money-2 mt">
      <div class="card"><div class="card-body" id="fuel-chart"></div></div>
      <div class="card"><div class="table-wrap" id="fuel-table"></div>${footSrc('srcFuel', 'Nepal Oil Corporation retail selling price · can differ by depot', 'https://noc.org.np/retailprice', 'noc.org.np')}</div>
    </div>
  </section>
  <p class="agg-note">${ICO.info}<span data-t="moneyNote">Figures come from NEPSE, Hamro Patro (FEGOD rates), Nepal Rastra Bank and Nepal Oil Corporation and may be delayed. Nothing here is financial advice — confirm rates with your bank, broker or dealer before acting.</span></p>`,
  },

  '/weather': {
    key: 'weather', script: 'page-weather.js', changefreq: 'hourly', priority: '0.9',
    title: 'Nepal Weather — Kathmandu, Pokhara & City Forecasts, Air Quality · Nepal Live',
    description: 'Current weather, hourly and 7-day forecasts, sunrise and sunset for Kathmandu, Pokhara, Lalitpur, Biratnagar, Bharatpur, Butwal, Nepalgunj, Dharan, Dhangadhi and any town in Nepal — plus measured air quality (AQI, PM2.5, PM10).',
    kicker: 'Nepal Weather', h1: 'Weather & <em>air quality</em>', sub: 'Forecasts for any town in Nepal, and air quality measured at monitoring stations.',
    body: `
  <div class="city-bar">
    <div class="city-chips" id="city-chips" role="group" aria-label="Cities"></div>
    <div class="geo-search">
      <label class="field-search">${ICO.search}<input id="geo-q" type="search" autocomplete="off" placeholder="Search a city in Nepal" data-tp="geoPh" role="combobox" aria-expanded="false" aria-controls="geo-list" aria-autocomplete="list"></label>
      <ul class="geo-list" id="geo-list" role="listbox" hidden></ul>
    </div>
  </div>
  <div class="wx-wrap">
    <div class="card"><div class="card-body" id="wx-now"></div><div class="card-foot"><span data-t="srcWx">Forecast: Open-Meteo</span><span class="stamp" id="stamp-wx"></span></div></div>
    <div class="card"><div class="card-head"><h2 data-t="hourlyH">Next 24 hours</h2></div><div class="card-body" id="wx-hourly"></div></div>
  </div>
  <section class="sec" id="week" aria-labelledby="week-h">
    ${head2('week-h', 'weekK', 'Forecast', 'weekH', '7-day forecast')}
    <div class="card"><div id="wx-week"></div></div>
  </section>
  <section class="sec" id="air" aria-labelledby="air-h">
    ${head2('air-h', 'airK', 'Air quality', 'airH', 'Air quality', stampOnly('stamp-air'))}
    <div class="money-2">
      <div class="card"><div class="card-body" id="air-now"></div><div class="card-foot"><span data-t="srcAirModel">Model estimate: Open-Meteo (CAMS)</span><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">open-meteo.com ↗</a></div></div>
      <div class="card"><div class="card-head"><h3 data-t="stationsH">Measured at monitoring stations</h3></div><div class="card-body" id="air-stations"></div>${footSrc('srcStations', 'Department of Environment stations via BIPAD Portal', 'https://bipadportal.gov.np/', 'bipadportal.gov.np')}</div>
    </div>
  </section>
  <section class="sec" id="cities" aria-labelledby="cities-h">
    ${head2('cities-h', 'citiesK', 'Across Nepal', 'citiesH', 'Weather in major cities', stampOnly('stamp-cities'))}
    <div class="city-grid" id="city-grid"></div>
  </section>`,
  },

  '/earthquakes': {
    key: 'earthquakes', script: 'page-earthquakes.js', changefreq: 'always', priority: '0.8',
    title: 'Nepal Earthquake Monitor — Recent Earthquakes in and near Nepal · Nepal Live',
    description: 'Recent earthquakes in Nepal and within 800 km: magnitude, location, depth, time in Nepal Time and distance from Kathmandu, from the USGS catalogue — with significant events highlighted.',
    kicker: 'Earthquake Monitor', h1: 'Earthquakes <em>near Nepal</em>', sub: 'Every event in the USGS catalogue within 800 km of central Nepal — magnitude, depth, time and distance, exactly as reported.',
    side: `<span class="stamp" id="stamp-eq"></span>${refreshBtn('eq-refresh')}`,
    body: `
  <div class="eq-tools">
    <div class="seg" role="group" aria-label="Period" id="eq-days"><button type="button" data-days="1">24 h</button><button type="button" data-days="7">7 d</button><button type="button" data-days="30">30 d</button></div>
    <div class="seg" role="group" aria-label="Minimum magnitude" id="eq-mag"><button type="button" data-mag="2.5">M2.5+</button><button type="button" data-mag="4">M4+</button><button type="button" data-mag="5">M5+</button></div>
  </div>
  <div class="eq-summary" id="eq-summary"></div>
  <div class="card"><div class="card-head"><h2 data-t="plotH">Magnitude over time</h2></div><div class="card-body" id="eq-plot"></div></div>
  <section class="sec" id="timeline" aria-labelledby="tl-h">
    ${head2('tl-h', 'tlK', 'Timeline', 'tlH', 'Every recorded event')}
    <div id="eq-list"></div>
  </section>
  <div class="notice mt">${ICO.info}<p data-t="eqNote">Source: USGS Earthquake Hazards Program (magnitude 2.5 and above within 800 km of central Nepal). Small local events may be listed only by Nepal’s National Seismological Centre (seismonepal.gov.np). Magnitudes and locations can be revised by the source after an event.</p></div>`,
  },
});

Object.assign(PAGES, {
  '/sports': {
    key: 'sports', script: 'page-sports.js', changefreq: 'always', priority: '0.9',
    title: 'Sports Live Scores — Football, Cricket & More · Nepal Live',
    description: 'Live scores, upcoming fixtures and results for football, cricket, basketball, ice hockey, baseball, rugby and volleyball — kick-off times in Nepal Time (NPT).',
    kicker: 'Sports', h1: 'Live <em>scores</em>', sub: 'Football, cricket and more — live, upcoming and finished, with kick-off times in Nepal Time.',
    side: `<span class="stamp" id="stamp-sports"></span>${refreshBtn('sports-refresh')}`,
    body: `
  <div class="sport-switch" role="tablist" aria-label="Sport" id="sport-switch"></div>
  <div class="pills" id="other-filter" role="group" aria-label="Sport" hidden></div>
  <div class="tabs" role="tablist" id="sp-tabs" aria-label="Match status"></div>
  <div id="np-strip"></div>
  <div id="matches-body" role="tabpanel"></div>
  <p class="agg-note">${ICO.info}<span data-t="spNote">Fixtures and scores from TheSportsDB’s public feed. Coverage varies by league, and live scores can lag the real match. Cricket feeds often publish a result line instead of ball-by-ball scores and overs.</span></p>`,
  },
  '/nepal-sports': {
    key: 'nepal-sports', script: 'page-nepal-sports.js', changefreq: 'hourly', priority: '0.8',
    title: 'Nepal Sports — Nepal Cricket, Nepal Football, National Teams · Nepal Live',
    description: 'Nepal national cricket and football team fixtures and results, plus Nepal sports news from Nepali publishers and international outlets.',
    kicker: 'Nepal Sports', h1: 'Nepal <em>sports</em>', sub: 'Nepal’s national teams, Nepali athletes and domestic sport — fixtures and news, separate from the global scoreboard.',
    side: `<span class="stamp" id="stamp-nps"></span>${refreshBtn('nps-refresh')}`,
    body: `
  <section class="sec first" aria-labelledby="npf-h">
    ${head2('npf-h', 'fixK', 'National teams', 'fixH', 'Nepal fixtures & results')}
    <div id="np-fixtures"></div>
  </section>
  <section class="sec" aria-labelledby="npn-h">
    ${head2('npn-h', 'newsK', 'Headlines', 'newsH', 'Nepal sports news')}
    <div class="news-cols three">
      <div class="news-col"><div class="rail-head"><h3 data-t="cricketH">Nepal cricket</h3></div><div id="np-cricket"></div></div>
      <div class="news-col"><div class="rail-head"><h3 data-t="footballH">Nepal football</h3></div><div id="np-football"></div></div>
      <div class="news-col"><div class="rail-head"><h3 data-t="localH">From Nepali publishers</h3></div><div id="np-local"></div></div>
    </div>
    <p class="agg-note">${ICO.info}<span data-t="npNote">Fixtures: TheSportsDB. News: Google News and Nepali publishers’ own feeds — every story opens on the original publisher’s site.</span></p>
  </section>`,
  },
});

/* Official sources for the government directory. Names are the offices' own;
   every link goes to the official .gov.np (or institution) site. */
const GOV = [
  { en: 'Identity & documents', ne: 'पहिचान र कागजात', items: [
    { en: 'Department of Passports', ne: 'राहदानी विभाग', url: 'https://nepalpassport.gov.np/', dEn: 'Passport applications, renewals and status.', dNe: 'राहदानी आवेदन, नवीकरण र स्थिति।', apply: ['https://emrtds.nepalpassport.gov.np/', 'Online passport application', 'अनलाइन राहदानी आवेदन'], kw: 'passport rahadani' },
    { en: 'Ministry of Home Affairs — citizenship', ne: 'गृह मन्त्रालय — नागरिकता', url: 'https://moha.gov.np/', dEn: 'Citizenship certificates are issued by District Administration Offices under this ministry.', dNe: 'नागरिकता प्रमाणपत्र यस मन्त्रालय मातहतका जिल्ला प्रशासन कार्यालयले जारी गर्छन्।', kw: 'citizenship nagarikta cdo district administration' },
    { en: 'Department of National ID and Civil Registration', ne: 'राष्ट्रिय परिचयपत्र तथा पञ्जीकरण विभाग', url: 'https://donidcr.gov.np/', dEn: 'National identity card and vital registration — birth, marriage, death, migration.', dNe: 'राष्ट्रिय परिचयपत्र र व्यक्तिगत घटना दर्ता — जन्म, विवाह, मृत्यु, बसाइँसराइ।', kw: 'national id card birth registration' },
  ] },
  { en: 'Transport', ne: 'यातायात', items: [
    { en: 'Department of Transport Management', ne: 'यातायात व्यवस्था विभाग', url: 'https://dotm.gov.np/', dEn: 'Driving licences and vehicle registration.', dNe: 'सवारी चालक अनुमतिपत्र र सवारी दर्ता।', apply: ['https://applydl.dotm.gov.np/', 'Driving licence application', 'सवारी चालक अनुमतिपत्र आवेदन'], kw: 'driving license licence vehicle' },
    { en: 'Civil Aviation Authority of Nepal', ne: 'नेपाल नागरिक उड्डयन प्राधिकरण', url: 'https://www.caanepal.gov.np/', dEn: 'Airports and aviation notices.', dNe: 'विमानस्थल र उड्डयन सूचना।', kw: 'airport flights aviation' },
  ] },
  { en: 'Tax & business', ne: 'कर र व्यवसाय', items: [
    { en: 'Inland Revenue Department', ne: 'आन्तरिक राजस्व विभाग', url: 'https://ird.gov.np/', dEn: 'PAN registration, income tax and VAT.', dNe: 'स्थायी लेखा नम्बर (प्यान), आयकर र मूल्य अभिवृद्धि कर।', apply: ['https://taxpayerportal.ird.gov.np/', 'Taxpayer portal', 'करदाता पोर्टल'], kw: 'pan tax vat income' },
    { en: 'Office of the Company Registrar', ne: 'कम्पनी रजिस्ट्रारको कार्यालय', url: 'https://ocr.gov.np/', dEn: 'Company registration and records.', dNe: 'कम्पनी दर्ता र अभिलेख।', kw: 'company registration business' },
    { en: 'Ministry of Industry, Commerce and Supplies', ne: 'उद्योग, वाणिज्य तथा आपूर्ति मन्त्रालय', url: 'https://moics.gov.np/', dEn: 'Industry, trade and supplies policy.', dNe: 'उद्योग, व्यापार र आपूर्ति नीति।', kw: 'industry commerce trade' },
    { en: 'Securities Board of Nepal (SEBON)', ne: 'नेपाल धितोपत्र बोर्ड', url: 'https://sebon.gov.np/', dEn: 'Regulator of the securities market.', dNe: 'धितोपत्र बजारको नियामक।', kw: 'sebon securities share ipo' },
  ] },
  { en: 'Travel, immigration & work abroad', ne: 'यात्रा, अध्यागमन र वैदेशिक रोजगार', items: [
    { en: 'Department of Immigration', ne: 'अध्यागमन विभाग', url: 'https://immigration.gov.np/', dEn: 'Visas and entry/exit procedures.', dNe: 'भिसा र प्रवेश/प्रस्थान प्रक्रिया।', kw: 'visa immigration' },
    { en: 'Ministry of Foreign Affairs', ne: 'परराष्ट्र मन्त्रालय', url: 'https://mofa.gov.np/', dEn: 'Consular services, document attestation and Nepali missions abroad.', dNe: 'कन्सुलर सेवा, कागजात प्रमाणीकरण र विदेशस्थित नियोग।', kw: 'foreign affairs consular embassy attestation' },
    { en: 'Department of Foreign Employment', ne: 'वैदेशिक रोजगार विभाग', url: 'https://dofe.gov.np/', dEn: 'Labour permits and foreign-employment services.', dNe: 'श्रम स्वीकृति र वैदेशिक रोजगार सेवा।', kw: 'labour permit foreign employment work abroad' },
    { en: 'Nepal Tourism Board', ne: 'नेपाल पर्यटन बोर्ड', url: 'https://ntb.gov.np/', dEn: 'Tourism information and trekking permits guidance.', dNe: 'पर्यटन जानकारी।', kw: 'tourism trekking permit' },
  ] },
  { en: 'Government, laws & elections', ne: 'सरकार, कानुन र निर्वाचन', items: [
    { en: 'Nepal Government Updates Portal', ne: 'नेपाल सरकारको सूचना पोर्टल', url: 'https://nepal.gov.np/', dEn: 'Government announcements across ministries.', dNe: 'मन्त्रालयहरूका सरकारी सूचना।', kw: 'government notices announcements portal' },
    { en: 'Office of the Prime Minister and Council of Ministers', ne: 'प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालय', url: 'https://www.opmcm.gov.np/', dEn: 'Cabinet decisions and official notices.', dNe: 'मन्त्रिपरिषद्का निर्णय र आधिकारिक सूचना।', kw: 'cabinet prime minister decisions' },
    { en: 'Ministry of Home Affairs — public notices & holidays', ne: 'गृह मन्त्रालय — सूचना र सार्वजनिक बिदा', url: 'https://moha.gov.np/', dEn: 'Public notices, including the official list of public holidays.', dNe: 'सार्वजनिक बिदाको आधिकारिक सूचीसहितका सूचना।', kw: 'public holidays notices home ministry' },
    { en: 'Ministry of Federal Affairs and General Administration', ne: 'सङ्घीय मामिला तथा सामान्य प्रशासन मन्त्रालय', url: 'https://mofaga.gov.np/', dEn: 'Local government and civil-service administration.', dNe: 'स्थानीय सरकार र निजामती प्रशासन।', kw: 'local government municipality' },
    { en: 'Election Commission, Nepal', ne: 'निर्वाचन आयोग', url: 'https://election.gov.np/', dEn: 'Voter registration and election results.', dNe: 'मतदाता नामावली र निर्वाचन परिणाम।', kw: 'election voter registration results' },
    { en: 'Federal Parliament of Nepal', ne: 'सङ्घीय संसद्', url: 'https://parliament.gov.np/', dEn: 'House proceedings and bills.', dNe: 'संसद्का कार्यवाही र विधेयक।', kw: 'parliament bills' },
    { en: 'Nepal Law Commission', ne: 'नेपाल कानून आयोग', url: 'https://lawcommission.gov.np/', dEn: 'Official texts of Nepal’s laws.', dNe: 'नेपालका कानुनका आधिकारिक पाठ।', kw: 'law act constitution legal' },
    { en: 'Commission for the Investigation of Abuse of Authority', ne: 'अख्तियार दुरुपयोग अनुसन्धान आयोग', url: 'https://ciaa.gov.np/', dEn: 'Report corruption by public officials.', dNe: 'सार्वजनिक पदाधिकारीको भ्रष्टाचारबारे उजुरी।', kw: 'corruption complaint ciaa' },
  ] },
  { en: 'Jobs & education', ne: 'रोजगारी र शिक्षा', items: [
    { en: 'Public Service Commission (Lok Sewa)', ne: 'लोक सेवा आयोग', url: 'https://psc.gov.np/', dEn: 'Government job vacancies, exam schedules and results.', dNe: 'सरकारी जागिरका विज्ञापन, परीक्षा तालिका र नतिजा।', kw: 'lok sewa government jobs vacancy psc' },
    { en: 'Ministry of Education and Sports', ne: 'शिक्षा तथा खेलकुद मन्त्रालय', url: 'https://moest.gov.np/', dEn: 'Education policy and notices.', dNe: 'शिक्षा नीति र सूचना।', kw: 'education ministry school' },
    { en: 'National Examinations Board', ne: 'राष्ट्रिय परीक्षा बोर्ड', url: 'https://neb.gov.np/', dEn: 'SEE and Grade 12 examinations and results.', dNe: 'एसईई र कक्षा १२ का परीक्षा र नतिजा।', kw: 'see exam results grade 12 neb' },
  ] },
  { en: 'Health, safety & disasters', ne: 'स्वास्थ्य, सुरक्षा र विपद्', items: [
    { en: 'Ministry of Health and Food Safety', ne: 'स्वास्थ्य मन्त्रालय', url: 'https://mohp.gov.np/', dEn: 'Public-health notices and services.', dNe: 'जनस्वास्थ्य सूचना र सेवा।', kw: 'health hospital' },
    { en: 'Nepal Police', ne: 'नेपाल प्रहरी', url: 'https://nepalpolice.gov.np/', dEn: 'Police services and public notices.', dNe: 'प्रहरी सेवा र सार्वजनिक सूचना।', kw: 'police crime report' },
    { en: 'BIPAD Portal — disaster information', ne: 'बिपद पोर्टल', url: 'https://bipadportal.gov.np/', dEn: 'Government disaster alerts and incident records.', dNe: 'सरकारी विपद् सतर्कता र घटनाको अभिलेख।', kw: 'disaster flood landslide alert bipad' },
    { en: 'Department of Hydrology and Meteorology', ne: 'जल तथा मौसम विज्ञान विभाग', url: 'https://www.dhm.gov.np/', dEn: 'Official weather forecasts, warnings and river levels.', dNe: 'आधिकारिक मौसम पूर्वानुमान, चेतावनी र नदीको सतह।', kw: 'weather forecast dhm river flood' },
    { en: 'National Earthquake Monitoring and Research Center', ne: 'राष्ट्रिय भूकम्प मापन तथा अनुसन्धान केन्द्र', url: 'https://seismonepal.gov.np/', dEn: 'Earthquakes recorded in and around Nepal.', dNe: 'नेपाल र वरपर रेकर्ड भएका भूकम्प।', kw: 'earthquake seismic' },
  ] },
  { en: 'Money & utilities', ne: 'अर्थ र सेवा', items: [
    { en: 'Nepal Rastra Bank', ne: 'नेपाल राष्ट्र बैंक', url: 'https://www.nrb.org.np/', dEn: 'Central bank: official exchange rates and monetary policy.', dNe: 'केन्द्रीय बैंक: आधिकारिक विनिमय दर र मौद्रिक नीति।', kw: 'nrb central bank forex exchange rate' },
    { en: 'Ministry of Finance', ne: 'अर्थ मन्त्रालय', url: 'https://mof.gov.np/', dEn: 'Budget and fiscal policy.', dNe: 'बजेट र वित्त नीति।', kw: 'budget finance ministry' },
    { en: 'National Statistics Office', ne: 'राष्ट्रिय तथ्याङ्क कार्यालय', url: 'https://nsonepal.gov.np/', dEn: 'Census and official statistics.', dNe: 'जनगणना र आधिकारिक तथ्याङ्क।', kw: 'census statistics' },
    { en: 'Nepal Electricity Authority', ne: 'नेपाल विद्युत प्राधिकरण', url: 'https://www.nea.org.np/', dEn: 'Electricity service, outages and bills.', dNe: 'विद्युत सेवा, लोडसेडिङ र बिल।', kw: 'electricity bill nea power' },
    { en: 'Nepal Oil Corporation', ne: 'नेपाल आयल निगम', url: 'https://noc.org.np/', dEn: 'Official fuel prices.', dNe: 'इन्धनको आधिकारिक मूल्य।', kw: 'fuel petrol diesel lpg' },
  ] },
];
const bi = (en, ne) => `<span data-en="${esc(en)}" data-ne="${esc(ne)}">${esc(en)}</span>`;
const govHTML = GOV.map((g) => `
    <section class="gov-group" data-gov-group>
      <h2 class="gov-h">${bi(g.en, g.ne)}</h2>
      <div class="gov-grid">${g.items.map((it) => `
        <article class="gov-card" data-kw="${esc(`${it.en} ${it.ne} ${it.dEn} ${it.kw}`.toLowerCase())}">
          <h3>${bi(it.en, it.ne)}</h3>
          <p>${bi(it.dEn, it.dNe)}</p>
          <div class="gov-links">
            <a class="gov-src" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${bi('Official source', 'आधिकारिक स्रोत')} <span aria-hidden="true">→</span></a>
            ${it.apply ? `<a class="gov-apply" href="${esc(it.apply[0])}" target="_blank" rel="noopener noreferrer">${bi(it.apply[1], it.apply[2])} ↗</a>` : ''}
          </div>
          <span class="gov-dom">${esc(new URL(it.url).hostname.replace(/^www\./, ''))}</span>
        </article>`).join('')}
      </div>
    </section>`).join('');

Object.assign(PAGES, {
  '/jobs': {
    key: 'jobs', script: 'page-jobs.js', changefreq: 'hourly', priority: '0.8',
    title: 'Jobs in Nepal — IT, Banking, Hospitality, Education & More · Nepal Live',
    description: 'Current job vacancies in Nepal by category, city and type — IT, banking and finance, hospitality, education, engineering, healthcare, marketing, internships and part-time — with deadlines and a direct link to apply on the original listing.',
    kicker: 'Nepal Jobs', h1: 'Jobs in <em>Nepal</em>', sub: 'Current vacancies from merojob.com. Apply on the original listing — Nepal Live is not the employer.',
    side: `<span class="stamp" id="stamp-jobs"></span>${refreshBtn('jobs-refresh')}`,
    body: `
  <div class="jobs-tools">
    <label class="field-search">${ICO.search}<input id="job-q" type="search" autocomplete="off" placeholder="Search jobs, companies, skills…" data-tp="jobPh" aria-label="Search jobs"></label>
    <select id="job-loc" aria-label="City"></select>
    <select id="job-type" aria-label="Employment type"></select>
    <select id="job-sort" aria-label="Sort"><option value="" data-t="sortNew">Newest first</option><option value="deadline" data-t="sortDeadline">Deadline soonest</option></select>
  </div>
  <div class="pills" id="job-cats" role="tablist" aria-label="Job categories"></div>
  <p class="basis" id="job-count"></p>
  <div id="job-list" class="job-list"></div>
  <div class="more-row" id="job-more"></div>
  <div class="notice mt">${ICO.info}<p data-th="jobsNote">Listings come from <a href="https://merojob.com/" target="_blank" rel="noopener noreferrer">merojob.com</a>, updated every 30 minutes. Nepal Live is not the employer and does not handle applications — “Apply Now” opens the original listing. Government vacancies are published by the <a href="https://psc.gov.np/" target="_blank" rel="noopener noreferrer">Public Service Commission (Lok Sewa)</a>.</p></div>`,
  },
  '/events': {
    key: 'events', script: 'page-events.js', changefreq: 'daily', priority: '0.7',
    title: 'Nepal Events — Festivals, Holidays & Sports Fixtures · Nepal Live',
    description: 'Upcoming festivals, public holidays, national and international days in Nepal, and Nepal national-team fixtures — with dates in both BS and AD.',
    kicker: 'Nepal Events', h1: 'What’s <em>on</em>', sub: 'Festivals, public holidays, national days and Nepal’s national-team fixtures — from sources we can verify.',
    side: `<span class="stamp" id="stamp-events"></span>${refreshBtn('events-refresh')}`,
    body: `
  <div class="ev-tools">
    <div class="seg" role="group" aria-label="When" id="ev-when"><button type="button" data-when="today" data-t="wToday">Today</button><button type="button" data-when="week" data-t="wWeek">This week</button><button type="button" data-when="month" data-t="wMonth">This month</button><button type="button" data-when="all" data-t="wAll">Next 60 days</button></div>
    <div class="pills" id="ev-city" role="group" aria-label="City"></div>
  </div>
  <div class="pills" id="ev-cat" role="tablist" aria-label="Event type"></div>
  <div id="ev-list"></div>
  <div class="notice mt">${ICO.info}<p data-t="evNote">We list what we can verify: festivals, public holidays and national/international days from the Hamro Patro calendar, and Nepal national-team fixtures from TheSportsDB. There is no reliable public feed yet for concerts, exhibitions, tech events, conferences, job fairs or community events, so we don’t list them rather than guess.</p></div>`,
  },
  '/calendar': {
    key: 'calendar', script: 'page-calendar.js', changefreq: 'daily', priority: '0.8',
    title: 'Nepali Calendar 2083 — BS & AD Dates, Public Holidays, Festivals · Nepal Live',
    description: 'Nepali (Bikram Sambat) calendar with English (AD) dates, public holidays, festivals and national days — today’s Nepali date, month view in BS or AD.',
    kicker: 'Nepal Calendar', h1: 'Nepali <em>calendar</em>', sub: 'Bikram Sambat and Gregorian dates side by side, with public holidays and festivals.',
    body: `
  <div class="cal-today" id="cal-today"></div>
  <div class="cal-bar">
    <button class="icon-btn" id="cal-prev" type="button" aria-label="Previous month">‹</button>
    <h2 class="cal-title" id="cal-title" aria-live="polite"></h2>
    <button class="icon-btn" id="cal-next" type="button" aria-label="Next month">›</button>
    <div class="cal-bar-r">
      <button class="btn" id="cal-now" type="button" data-t="todayBtn">Today</button>
      <div class="seg" role="group" aria-label="Calendar" id="cal-mode"><button type="button" data-mode="bs">BS</button><button type="button" data-mode="ad">AD</button></div>
    </div>
  </div>
  <div class="cal-wrap"><div class="cal-grid" id="cal-grid" role="grid"></div></div>
  <div id="cal-day" class="cal-day" hidden></div>
  <section class="sec" aria-labelledby="calm-h">
    ${head2('calm-h', 'calmK', 'This month', 'calmH', 'Holidays & events')}
    <div id="cal-events"></div>
  </section>
  <p class="agg-note">${ICO.info}<span data-t="calNote">Calendar data: Hamro Patro. Public holidays are decided by the Government of Nepal and can change — the Ministry of Home Affairs (moha.gov.np) publishes the official list.</span></p>`,
  },
  '/government': {
    key: 'government', script: 'page-government.js', changefreq: 'weekly', priority: '0.7',
    title: 'Nepal Government Services — Passport, Driving Licence, PAN, Citizenship, National ID · Nepal Live',
    description: 'A directory of official Government of Nepal sources: passport, citizenship, national ID, driving licence, PAN and tax, immigration, foreign employment, Lok Sewa, public holidays, laws and emergency numbers — each linking to the official site.',
    kicker: 'Nepal Government', h1: 'Government & <em>public services</em>', sub: 'Where to go for passports, licences, tax, ID and more — every link opens the official government source.',
    body: `
  <div class="notice">${ICO.info}<p data-t="govNote">Nepal Live is an information and navigation layer, not a government office. Rules, fees and forms change — always confirm on the official source before applying.</p></div>
  <div class="gov-tools"><label class="field-search">${ICO.search}<input id="gov-q" type="search" autocomplete="off" placeholder="Find a service — passport, PAN, licence…" data-tp="govPh" aria-label="Find a service"></label></div>
  <div class="gov-side">
    <section class="gov-emerg" aria-labelledby="em-h"><h2 class="label" id="em-h" data-t="emH">Emergency numbers</h2>
      <ul class="em-list"><li><b>100</b><span data-t="emPolice">Police</span></li><li><b>101</b><span data-t="emFire">Fire brigade</span></li><li><b>102</b><span data-t="emAmb">Ambulance</span></li><li><b>103</b><span data-t="emTraffic">Traffic police</span></li><li><b>1144</b><span data-t="emTourist">Tourist police</span></li></ul>
    </section>
    <section class="gov-hol" aria-labelledby="hol-h"><h2 class="label" id="hol-h" data-t="holH">Upcoming public holidays</h2><div id="gov-holidays"></div><a class="link-more" href="/calendar"><span data-t="calLink">Full calendar</span> <span>→</span></a></section>
    <section class="gov-hol" aria-labelledby="gw-h"><h2 class="label" id="gw-h" data-t="warnH">Public warnings</h2><p class="small muted" data-t="warnP">Official disaster, flood and road-closure alerts are on our Alerts page.</p><a class="link-more" href="/alerts"><span data-t="alertsLink">Nepal Alerts</span> <span>→</span></a></section>
  </div>
  <div id="gov-dir">${govHTML}</div>
  <p class="gov-empty" id="gov-empty" hidden data-t="govNone">No service matches that search.</p>`,
  },
});

Object.assign(PAGES, {
  '/search': {
    key: 'search', script: 'page-search.js', changefreq: 'weekly', priority: '0.5',
    title: 'Search Nepal Live — News, Places, Markets, Jobs & Services',
    description: 'Search Nepali news, cities and districts, NEPSE and exchange rates, football and cricket fixtures, jobs, events and government services in one place.',
    kicker: 'Search', h1: 'Search <em>Nepal Live</em>', sub: 'News, places, markets, sports, jobs, events and government services — in one place.',
    body: `
  <form class="srch-form" id="srch-form" role="search" action="/search">
    <label class="field-search big">${ICO.search}<input id="srch-q" name="q" type="search" autocomplete="off" maxlength="100" placeholder="Try “Pokhara”, “NEPSE”, “passport”, “Dashain”…" data-tp="ph" aria-label="Search Nepal Live"></label>
    <button class="btn btn-primary" type="submit" data-t="go">Search</button>
  </form>
  <div class="pills" id="srch-tabs" role="tablist" aria-label="Result type"></div>
  <div id="srch-out" aria-live="polite"></div>`,
  },
  '/explore': {
    key: 'explore', script: 'page-explore.js', pre: ['nepal-map.js'], changefreq: 'hourly', priority: '0.8',
    title: 'Explore Nepal — Provinces, Cities, Weather, Air, Earthquakes & Alerts · Nepal Live',
    description: 'An interactive map of Nepal’s seven provinces: current weather and air quality in major cities, recent earthquakes, official alerts, road closures and headlines for each province.',
    kicker: 'Explore Nepal', h1: 'Explore <em>Nepal</em>', sub: 'Pick a province or a city to see its weather, air, earthquakes, alerts, roads and headlines.',
    side: `<span class="stamp" id="stamp-explore"></span>${refreshBtn('explore-refresh')}`,
    body: `
  <div class="ex-layout">
    <div class="ex-mapcol">
      <div class="seg ex-layers" role="group" aria-label="Map layer" id="ex-layers">
        <button type="button" data-layer="weather" data-t="lWeather">Weather</button>
        <button type="button" data-layer="air" data-t="lAir">Air quality</button>
        <button type="button" data-layer="quakes" data-t="lQuakes">Earthquakes</button>
        <button type="button" data-layer="alerts" data-t="lAlerts">Alerts</button>
        <button type="button" data-layer="roads" data-t="lRoads">Roads</button>
      </div>
      <div class="ex-map" id="ex-map"></div>
      <div class="ex-legend" id="ex-legend"></div>
      <div class="ex-provs" id="ex-provs" role="group" aria-label="Provinces"></div>
    </div>
    <aside class="ex-panel" id="ex-panel" aria-live="polite"></aside>
  </div>
  <p class="agg-note">${ICO.info}<span data-t="exNote">Weather and air quality are Open-Meteo model values for each city; earthquakes from USGS; alerts and road closures from BIPAD Portal (Department of Roads) and GDACS; headlines are matched by the place names they mention. Province boundaries: Survey Department of Nepal via OCHA.</span></p>`,
  },
  '/account': {
    key: 'account', script: 'page-account.js', noindex: true,
    title: 'Your account · Nepal Live',
    description: 'Sign in to Nepal Live to save stories, jobs and events, and choose the official alerts you want to see.',
    kicker: 'Your account', h1: 'Your <em>Nepal Live</em>', sub: 'Save stories, jobs and events, and choose which official alerts you want to see.',
    body: `
  <div id="acct-root" class="acct" aria-live="polite"></div>`,
  },
});

const NOT_FOUND = {
  key: '404', script: null, title: 'Page not found · Nepal Live', description: 'This page does not exist on Nepal Live.',
  kicker: '404', h1: 'Page not <em>found</em>', sub: 'The page you asked for isn’t here. It may have moved.',
  body: `<div class="state"><div class="state-msg" data-t="nfMsg">Try the homepage, or search Nepal Live.</div>
    <div class="state-actions"><a class="btn btn-primary" href="/">Nepal Live home</a><button class="btn" type="button" data-search>Search</button></div></div>`,
};

function render(pathname, origin, opts = {}) {
  const def = opts.notFound ? NOT_FOUND : PAGES[pathname];
  if (!def) return null;
  const url = origin + (opts.notFound ? '/' : pathname);
  const h1Text = def.h1.replace(/<[^>]+>/g, '');
  const ld = {
    '@context': 'https://schema.org', '@type': 'WebPage', name: def.title, url, inLanguage: ['en-NP', 'ne-NP'],
    description: def.description, isPartOf: { '@type': 'WebSite', name: 'Nepal Live', url: origin + '/' },
  };
  return `<!doctype html>
<html lang="en" data-lang="en" data-page="${def.key}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(def.title)}</title>
<meta name="description" content="${esc(def.description)}">
${opts.notFound || def.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${esc(url)}">`}
<meta name="theme-color" content="#f7f6f3">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Nepal Live">
<meta property="og:locale" content="en_NP">
<meta property="og:locale:alternate" content="ne_NP">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(def.title)}">
<meta property="og:description" content="${esc(def.description)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(def.title)}">
<meta name="twitter:description" content="${esc(def.description)}">
<link rel="icon" href="${FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..800&family=Noto+Sans+Devanagari:wght@400..800&display=swap">
<link rel="stylesheet" href="/app.css">
<script>
  (function () {
    try {
      var d = document.documentElement;
      var t = localStorage.getItem('nlive-theme');
      if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      d.setAttribute('data-theme', t);
      if (t === 'dark') { var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = '#0e1014'; }
      if (localStorage.getItem('nlive-lang') === 'ne') { d.setAttribute('data-lang', 'ne'); d.setAttribute('lang', 'ne'); }
    } catch (e) {}
  })();
</script>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to main content</a>
<header class="nl-head" id="nl-head"></header>
<div class="nl-ticker" id="nl-ticker"></div>
<main id="main" class="wrap">
  <section class="page-hero">
    <div>
      <span class="kicker" data-t="kicker">${esc(def.kicker)}</span>
      <h1 data-th="h1" aria-label="${esc(h1Text)}">${def.h1}</h1>
      <p class="hero-sub" data-t="sub">${esc(def.sub)}</p>
    </div>
    ${def.side ? `<div class="ph-side">${def.side}</div>` : ''}
  </section>
${def.body}
</main>
<footer class="nl-foot" id="nl-foot"></footer>
<script src="/app.js"></script>
<script src="/kit.js"></script>
${(def.pre || []).map((s) => `<script src="/${s}"></script>`).join('\n')}
${def.script ? `<script src="/${def.script}"></script>` : ''}
</body>
</html>`;
}

module.exports = { PAGES, GOV, render, paths: () => Object.keys(PAGES).filter((p) => !PAGES[p].noindex) };

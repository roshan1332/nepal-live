/*
 * Explore Nepal (/explore?p=NP03&city=pokhara&layer=weather). An SVG map of
 * the seven provinces (nepal-map.js) with switchable layers, and a panel for
 * Nepal, a province or a city. Everything shown comes from the same feeds as
 * the rest of the site; places are matched by coordinates, then by district.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc, M = NL.map;

  NL.i18n.add({
    en: {
      kicker: 'Explore Nepal', h1: 'Explore <em>Nepal</em>', sub: 'Pick a province or a city to see its weather, air, earthquakes, alerts, roads and headlines.',
      lWeather: 'Weather', lAir: 'Air quality', lQuakes: 'Earthquakes', lAlerts: 'Alerts', lRoads: 'Roads',
      mapTitle: 'Map of Nepal’s seven provinces', nepal: 'Nepal', sevenProv: 'Seven provinces', pickHint: 'Choose a province on the map or below, or tap a city.',
      province: 'Province', thAlerts: 'Active alerts', thRoads: 'Road closures', thQuakes: 'Earthquakes', thQuakes30: 'Earthquakes · 30 days, M4+',
      countsBasis: 'Counts use active official alerts that carry a location or district, and M4+ earthquakes located inside each province in the last 30 days.',
      allNepal: 'All of Nepal', nDistricts: '{n} districts', cities: 'Cities', districtsList: 'Districts',
      noAlerts: 'No active official alerts here right now.', noRoads: 'No road closures reported here right now.', noQuakes: 'No M4+ earthquakes located here in the last 30 days.',
      headlines: 'Headlines mentioning places here', noNews: 'No current headlines mention these places.', newsBasis: 'Matched by the city and district names in each headline.',
      nationwide: 'Coming up nationwide', fullForecast: 'Full forecast', setMyCity: 'Set as my city', myCity: 'My city', myCitySet: 'Saved as your city',
      feels: 'Feels like', humidity: 'Humidity', wind: 'Wind', rainChance: 'Rain chance today', today: 'Today', aqi: 'Air quality (model)',
      noWx: 'Current conditions for this city are on the Weather page.', near: '{d} km away', within: 'within 100 km',
      legWeather: 'Current temperature in major cities · Open-Meteo model', legAir: 'US AQI in major cities · Open-Meteo air-quality model',
      legQuakes: 'M4+ earthquakes, last 30 days · circle size shows magnitude · USGS', legAlerts: 'Active official alerts that have a location',
      legRoads: 'Road closures reported by the Department of Roads (BIPAD Portal)', legNew: 'last 24 h', updated: 'updated {ago}',
      unavailable: 'Data currently unavailable.', err: 'The map data couldn’t be loaded.', more: 'More', inProv: '{n} in this province',
      exNote: 'Weather and air quality are Open-Meteo model values for each city; earthquakes from USGS; alerts and road closures from BIPAD Portal (Department of Roads) and GDACS; headlines are matched by the place names they mention. Province boundaries: Survey Department of Nepal via OCHA.'
    },
    ne: {
      kicker: 'नेपाल अन्वेषण', h1: '<em>नेपाल</em> अन्वेषण', sub: 'प्रदेश वा सहर छानेर मौसम, हावा, भूकम्प, सतर्कता, सडक र समाचार हेर्नुहोस्।',
      lWeather: 'मौसम', lAir: 'हावाको गुणस्तर', lQuakes: 'भूकम्प', lAlerts: 'सतर्कता', lRoads: 'सडक',
      mapTitle: 'नेपालका सात प्रदेशको नक्सा', nepal: 'नेपाल', sevenProv: 'सात प्रदेश', pickHint: 'नक्सा वा तलबाट प्रदेश छान्नुहोस्, वा सहरमा थिच्नुहोस्।',
      province: 'प्रदेश', thAlerts: 'सक्रिय सतर्कता', thRoads: 'सडक अवरोध', thQuakes: 'भूकम्प', thQuakes30: 'भूकम्प · ३० दिन, M4+',
      countsBasis: 'स्थान वा जिल्ला भएका सक्रिय आधिकारिक सतर्कता, र पछिल्लो ३० दिनमा प्रदेशभित्र परेका M4+ भूकम्प गनिएका छन्।',
      allNepal: 'सम्पूर्ण नेपाल', nDistricts: '{n} जिल्ला', cities: 'सहर', districtsList: 'जिल्ला',
      noAlerts: 'यहाँ अहिले कुनै सक्रिय आधिकारिक सतर्कता छैन।', noRoads: 'यहाँ अहिले सडक अवरोध रिपोर्ट भएको छैन।', noQuakes: 'पछिल्लो ३० दिनमा यहाँ M4+ भूकम्प गएको छैन।',
      headlines: 'यहाँका ठाउँ उल्लेख भएका समाचार', noNews: 'अहिलेका समाचारमा यी ठाउँ उल्लेख छैनन्।', newsBasis: 'शीर्षकमा सहर र जिल्लाको नामका आधारमा मिलाइएको।',
      nationwide: 'देशभर आउँदै', fullForecast: 'पूरा पूर्वानुमान', setMyCity: 'मेरो सहर बनाउनुहोस्', myCity: 'मेरो सहर', myCitySet: 'तपाईंको सहरका रूपमा सेभ भयो',
      feels: 'महसुस', humidity: 'आर्द्रता', wind: 'हावा', rainChance: 'आज वर्षाको सम्भावना', today: 'आज', aqi: 'हावाको गुणस्तर (मोडेल)',
      noWx: 'यो सहरको हालको मौसम मौसम पृष्ठमा छ।', near: '{d} किमी टाढा', within: '१०० किमीभित्र',
      legWeather: 'प्रमुख सहरको हालको तापक्रम · Open-Meteo मोडेल', legAir: 'प्रमुख सहरको US AQI · Open-Meteo वायु मोडेल',
      legQuakes: 'पछिल्लो ३० दिनका M4+ भूकम्प · घेराको आकारले म्याग्निच्युड देखाउँछ · USGS', legAlerts: 'स्थान भएका सक्रिय आधिकारिक सतर्कता',
      legRoads: 'सडक विभागले रिपोर्ट गरेका सडक अवरोध (बिपद पोर्टल)', legNew: 'पछिल्लो २४ घण्टा', updated: '{ago} अपडेट',
      unavailable: 'तथ्यांक अहिले उपलब्ध छैन।', err: 'नक्साको तथ्यांक लोड हुन सकेन।', more: 'थप', inProv: 'यो प्रदेशमा {n}',
      exNote: 'मौसम र हावाको गुणस्तर हरेक सहरका लागि Open-Meteo मोडेलका मान हुन्; भूकम्प USGS बाट; सतर्कता र सडक अवरोध बिपद पोर्टल (सडक विभाग) र GDACS बाट; समाचार तिनमा उल्लेख भएका ठाउँका नामले मिलाइएको। प्रदेश सीमा: नापी विभाग (OCHA मार्फत)।'
    }
  });

  var LV = { emergency: 4, warning: 3, advisory: 2, info: 1 };
  var LAYERS = ['weather', 'air', 'quakes', 'alerts', 'roads'];
  var qs = new URLSearchParams(location.search);
  var S = {
    layer: LAYERS.indexOf(qs.get('layer')) >= 0 ? qs.get('layer') : 'weather',
    prov: /^NP0[1-7]$/.test(qs.get('p') || '') ? qs.get('p') : null, city: qs.get('city') || null,
    raw: {}, ok: {}, cities: [], quakes: [], st: null, my: null
  };
  try { S.my = JSON.parse(localStorage.getItem('nlive-city') || 'null'); } catch (e) { /* storage blocked */ }
  /* personal default: open on your city when the URL doesn't say otherwise */
  if (!S.prov && !S.city && S.my && S.my.id) S.city = S.my.id;

  var provOf = {}, provByName = {};
  M.provinces.forEach(function (p) { provOf[p.id] = p; provByName[p.en] = p.id; });
  var ne = function () { return NL.lang() === 'ne'; };
  var pname = function (id) { return ne() ? provOf[id].ne : provOf[id].en; };
  var cname = function (c) { return ne() && c.ne ? c.ne : c.en; };
  var nd = function (s) { return String(s || '').toLowerCase().replace(/[^a-z]/g, ''); };
  var num = function (n) { return ne() ? String(n).replace(/\d/g, function (d) { return '०१२३४५६७८९'[d]; }) : String(n); };
  function km(a, b, c, d) {
    var R = 6371, r = Math.PI / 180, x = Math.sin((c - a) * r / 2), y = Math.sin((d - b) * r / 2);
    return 2 * R * Math.asin(Math.sqrt(x * x + Math.cos(a * r) * Math.cos(c * r) * y * y));
  }

  /* ------------------------------------------------------------------- map */
  var PAD = 14;
  function centroid(r) {
    var a = 0, cx = 0, cy = 0;
    for (var i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      var f = r[j] * r[i + 1] - r[i] * r[j + 1];
      a += f; cx += (r[j] + r[i]) * f; cy += (r[j + 1] + r[i + 1]) * f;
    }
    return [cx / (3 * a), cy / (3 * a)];
  }
  var LABEL = {};
  /* move labels off the city dots they would otherwise sit on (Kathmandu Valley, Pokhara) */
  var NUDGE = { NP03: [10, 46], NP04: [0, -38] };
  M.provinces.forEach(function (p) {
    var big = p.rings.reduce(function (b, r) { return r.length > b.length ? r : b; }, []);
    var c = centroid(big), n = NUDGE[p.id] || [0, 0];
    LABEL[p.id] = [c[0] + n[0], c[1] + n[1]];
  });
  /* Lalitpur and Bhaktapur are within ~10 km of Kathmandu: one valley value on the map, all three in the panel */
  var MAP_SKIP = { lalitpur: 1, bhaktapur: 1 };
  function buildMap() {
    $('ex-map').innerHTML = '<svg class="ex-svg" id="ex-svg" viewBox="' + (-PAD) + ' ' + (-PAD) + ' ' + (M.W + 2 * PAD) + ' ' + (M.H + 2 * PAD) + '" role="img" aria-labelledby="ex-map-t">'
      + '<title id="ex-map-t"></title>'
      + '<g>' + M.provinces.map(function (p) { return '<path class="ex-prov" data-p="' + p.id + '" d="' + M.path(p) + '"/>'; }).join('') + '</g>'
      + '<g aria-hidden="true">' + M.provinces.map(function (p) {
        return '<text class="ex-plabel" data-pl="' + p.id + '" x="' + LABEL[p.id][0].toFixed(1) + '" y="' + LABEL[p.id][1].toFixed(1) + '"></text>';
      }).join('') + '</g>'
      + '<g id="ex-over"></g></svg><div class="ex-tip" id="ex-tip" hidden></div>';
  }
  function inView(p) { return p[0] > -PAD && p[0] < M.W + PAD && p[1] > -PAD && p[1] < M.H + PAD; }
  function paintMap() {
    var svg = $('ex-svg');
    if (!svg) return;
    svg.querySelector('title').textContent = t('mapTitle');
    svg.querySelectorAll('.ex-plabel').forEach(function (el) { el.textContent = pname(el.getAttribute('data-pl')); });
    var st = S.st, sel = S.prov || (S.city && cityProv(S.city));
    svg.classList.toggle('has-sel', !!sel);
    svg.querySelectorAll('.ex-prov').forEach(function (el) {
      var id = el.getAttribute('data-p'), heat = '';
      if (st && S.layer === 'alerts') { var mx = st[id].alerts.reduce(function (m, a) { return Math.max(m, LV[a.level] || 0); }, 0); if (mx >= 2) heat = ' heat-' + mx; }
      if (st && S.layer === 'roads' && st[id].roads.length) heat = ' heat-r';
      el.setAttribute('class', 'ex-prov' + (id === sel ? ' on' : '') + heat);
    });
    var h = '', now = Date.now();
    if (S.layer === 'weather' || S.layer === 'air') {
      var src = S.layer === 'weather' ? S.raw.wx : S.raw.air;
      ((src && src.cities) || []).forEach(function (c) {
        if (MAP_SKIP[c.id]) return;
        var p = M.proj(c.lon, c.lat), cur = c.current || {}, label, fill = '';
        if (S.layer === 'weather') label = isFinite(cur.temperature_2m) ? Math.round(cur.temperature_2m) + '°' : '–';
        else { label = cur.us_aqi != null ? String(Math.round(cur.us_aqi)) : '–'; fill = ' style="fill:' + NL.aqiInfo(cur.us_aqi).color + '"'; }
        h += '<g class="ex-city' + (S.city === c.id ? ' on' : '') + (fill ? ' aqi' : '') + '" data-city="' + c.id + '" transform="translate(' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ')">'
          + '<circle r="' + (fill ? 7 : 5) + '"' + fill + '/><text class="ex-val" y="-11">' + esc(num(label)) + '</text><title>' + esc(cname(c)) + '</title></g>';
      });
    } else {
      S.cities.slice(0, 14).forEach(function (c) {
        if (MAP_SKIP[c.id]) return;
        var p = M.proj(c.lon, c.lat);
        h += '<g class="ex-city ref' + (S.city === c.id ? ' on' : '') + '" data-city="' + c.id + '" transform="translate(' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ')"><circle r="3.5"/><title>' + esc(cname(c)) + '</title></g>';
      });
      if (S.layer === 'quakes') {
        S.quakes.slice().sort(function (a, b) { return b.mag - a.mag; }).forEach(function (q) {
          var p = M.proj(q.lon, q.lat);
          if (!inView(p)) return;
          h += '<circle class="ex-q' + (now - q.time < 864e5 ? ' new' : '') + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (3 + Math.max(0, q.mag - 3.5) * 5).toFixed(1) + '"><title>M' + q.mag.toFixed(1) + ' · ' + esc(q.place) + '</title></circle>';
        });
      } else {
        var items = ((S.raw.alerts && S.raw.alerts.items) || []).filter(function (a) {
          return a.active !== false && (S.layer === 'roads' ? a.category === 'road' : a.category !== 'road') && isFinite(a.lat) && isFinite(a.lon) && a.lat;
        });
        items.sort(function (a, b) { return (LV[a.level] || 0) - (LV[b.level] || 0); }).forEach(function (a) {
          var p = M.proj(a.lon, a.lat);
          if (!inView(p)) return;
          h += S.layer === 'roads'
            ? '<rect class="ex-r" x="' + (p[0] - 5).toFixed(1) + '" y="' + (p[1] - 5).toFixed(1) + '" width="10" height="10" transform="rotate(45 ' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')"><title>' + esc(a.title) + '</title></rect>'
            : '<circle class="ex-a lv-' + esc(a.level) + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="6.5"><title>' + esc(a.title) + '</title></circle>';
        });
      }
    }
    $('ex-over').innerHTML = h;
    legend();
  }
  function legend() {
    var L = S.layer, src = { weather: 'wx', air: 'air', quakes: 'quakes', alerts: 'alerts', roads: 'alerts' }[L];
    var raw = S.raw[src], upd = raw && raw.fetchedAt ? ' · ' + t('updated', { ago: NL.ago(Date.parse(raw.fetchedAt)) }) : '';
    var body = { weather: t('legWeather'), air: t('legAir'), quakes: t('legQuakes'), alerts: t('legAlerts'), roads: t('legRoads') }[L];
    var extra = '';
    if (L === 'air') extra = '<span class="ex-scale">' + NL.aqiScale(null) + '</span>';
    if (L === 'alerts') extra = NL.levels.map(function (l) { return NL.levelBadge(l); }).join('');
    if (L === 'quakes') extra = '<span class="ex-key"><i class="k-q new"></i>' + esc(t('legNew')) + '</span>';
    $('ex-legend').innerHTML = (S.ok[src] === false ? '<span class="err-t">' + esc(t('unavailable')) + '</span>' : '<span>' + esc(body + upd) + '</span>') + extra;
    document.querySelectorAll('[data-layer]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-layer') === L)); });
    $('ex-provs').innerHTML = M.provinces.map(function (p) {
      return '<button class="pill" type="button" data-p="' + p.id + '" aria-pressed="' + (S.prov === p.id) + '"' + (ne() ? ' lang="ne"' : '') + '>' + esc(pname(p.id)) + '</button>';
    }).join('');
  }

  /* ----------------------------------------------------------------- data */
  function provOfItem(a) {
    if (isFinite(a.lat) && isFinite(a.lon) && a.lat) { var p = M.provinceAt(a.lon, a.lat); if (p) return p; }
    return M.provinceOfDistrict(a.district);
  }
  function cityById(id) { return S.cities.filter(function (c) { return c.id === id; })[0] || null; }
  function cityProv(id) { var c = cityById(id); return c ? provByName[c.province] : null; }
  function stats() {
    var st = {};
    M.provinces.forEach(function (p) { st[p.id] = { alerts: [], roads: [], quakes: [], cities: [] }; });
    ((S.raw.alerts && S.raw.alerts.items) || []).forEach(function (a) {
      if (a.active === false) return;
      var p = provOfItem(a);
      if (p) (a.category === 'road' ? st[p].roads : st[p].alerts).push(a);
    });
    S.quakes.forEach(function (q) { var p = M.provinceAt(q.lon, q.lat); if (p) st[p].quakes.push(q); });
    S.cities.forEach(function (c) { var id = provByName[c.province]; if (id) st[id].cities.push(c); });
    return st;
  }
  var reEsc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  /* headlines that name one of these places — Latin names on word boundaries
     ("Dang" must not match "danger"), Devanagari names followed only by a
     postposition ("गौर" must not match "गौरव") */
  function matchNews(names) {
    var items = (S.raw.news && S.raw.news.items) || [];
    var lat = names.filter(function (n) { return /^[A-Za-z]/.test(n); }), dev = names.filter(function (n) { return /[ऀ-ॿ]/.test(n); });
    var reL = lat.length ? new RegExp('\\b(' + lat.map(reEsc).join('|') + ')\\b', 'i') : null;
    var reD = dev.length ? new RegExp('(^|[\\s,।:\'"‘“(])(' + dev.map(reEsc).join('|') + ')(मा|को|का|की|ले|बाट|सम्म|भित्र)?(?=$|[\\s,।:\'"’”)])') : null;
    return items.filter(function (i) { return (reL && reL.test(i.title)) || (reD && reD.test(i.title)); })
      .sort(function (a, b) { return (Date.parse(b.pubDate) || 0) - (Date.parse(a.pubDate) || 0); }).slice(0, 6);
  }
  function newsBlock(names) {
    var list = matchNews(names);
    if (S.ok.news === false) return block(t('headlines'), '<p class="small muted">' + esc(t('unavailable')) + '</p>');
    return block(t('headlines'), list.length ? '<ul class="ex-news">' + list.map(function (i) {
      return '<li><a href="' + esc(i.link) + '" target="_blank" rel="noopener noreferrer"' + NL.langAttr(i.title) + '>' + esc(i.title) + ' <span class="sr-ext" aria-hidden="true">↗</span></a>'
        + '<span>' + esc(i.source) + ' · ' + esc(NL.ago(Date.parse(i.pubDate))) + '</span></li>';
    }).join('') + '</ul><p class="small muted">' + esc(t('newsBasis')) + '</p>' : '<p class="small muted">' + esc(t('noNews')) + '</p>');
  }
  function block(title, body, count) {
    return '<section class="ex-block"><h3><span>' + esc(title) + '</span>' + (count != null ? '<span>' + num(count) + '</span>' : '') + '</h3>' + body + '</section>';
  }
  function alertsBlock(list, title, emptyMsg) {
    if (S.ok.alerts === false) return block(title, '<p class="small muted">' + esc(t('unavailable')) + '</p>');
    list = list.slice().sort(function (a, b) { return (LV[b.level] || 0) - (LV[a.level] || 0) || Date.parse(b.time) - Date.parse(a.time); });
    return block(title, list.length ? list.slice(0, 4).map(function (a) { return NL.alertCard(a, { compact: true }); }).join('')
      + (list.length > 4 ? '<a class="link-more" href="' + (title === t('thRoads') ? '/roads' : '/alerts') + '">' + esc(t('more')) + ' (' + num(list.length - 4) + ') →</a>' : '')
      : '<p class="small muted">' + esc(emptyMsg) + '</p>', list.length);
  }
  function quakeBlock(list, title) {
    if (S.ok.quakes === false) return block(title, '<p class="small muted">' + esc(t('unavailable')) + '</p>');
    return block(title, list.length ? '<ul class="ex-ql">' + list.slice(0, 5).map(function (q) {
      return '<li><span class="mag' + (q.mag >= 5 ? ' big' : '') + '">M' + q.mag.toFixed(1) + '</span><span>' + esc(q.place) + ' · ' + esc(NL.ago(q.time))
        + (q.dist != null ? ' · ' + esc(t('near', { d: num(Math.round(q.dist)) })) : '') + '</span></li>';
    }).join('') + '</ul><a class="link-more" href="/earthquakes">' + esc(t('lQuakes')) + ' →</a>' : '<p class="small muted">' + esc(t('noQuakes')) + '</p>', list.length);
  }
  function wxOf(id) { var c = ((S.raw.wx && S.raw.wx.cities) || []).filter(function (x) { return x.id === id; })[0]; return c || null; }
  function airOf(id) { var c = ((S.raw.air && S.raw.air.cities) || []).filter(function (x) { return x.id === id; })[0]; return c && c.current ? c.current : null; }
  var isMine = function (id) { return !!(S.my && S.my.id === id); };
  function starBtn(c) {
    return '<button class="ex-star" type="button" data-mycity="' + c.id + '" aria-pressed="' + isMine(c.id) + '" title="' + esc(isMine(c.id) ? t('myCity') : t('setMyCity')) + '" aria-label="' + esc((isMine(c.id) ? t('myCity') : t('setMyCity')) + ': ' + cname(c)) + '">★</button>';
  }
  function cityRows(list) {
    return '<ul class="ex-cities">' + list.map(function (c) {
      var w = wxOf(c.id), a = airOf(c.id), cur = w && w.current;
      return '<li class="ex-crow"><button class="ex-link" type="button" data-city="' + c.id + '"' + (ne() ? ' lang="ne"' : '') + '>' + esc(cname(c)) + '</button>'
        + '<span class="muted small">' + esc(c.district) + '</span>'
        + (cur ? '<span class="ex-cw">' + NL.wx(cur.weather_code).icon + ' ' + num(Math.round(cur.temperature_2m)) + '°</span>' : '')
        + (a && a.us_aqi != null ? '<span class="ex-aqi"><i style="background:' + NL.aqiInfo(a.us_aqi).color + '"></i>' + num(Math.round(a.us_aqi)) + '</span>' : '')
        + starBtn(c) + '</li>';
    }).join('') + '</ul>';
  }
  function upcoming() {
    var ev = S.raw.events;
    if (!ev || !ev.items) return '';
    var list = ev.items.filter(function (i) { return i.date >= ev.today && i.category !== 'sports'; }).slice(0, 3);
    return list.length ? block(t('nationwide'), '<ul class="ex-news">' + list.map(function (i) {
      return '<li><a href="/events"' + NL.langAttr(ne() && i.titleNe ? i.titleNe : i.title) + '>' + esc(ne() && i.titleNe ? i.titleNe : i.title) + '</a><span>' + esc(NL.dfmt.day(Date.parse(i.date + 'T12:00:00+05:45'))) + '</span></li>';
    }).join('') + '</ul>') : '';
  }

  /* ---------------------------------------------------------------- panel */
  function panel() {
    var box = $('ex-panel');
    if (!S.cities.length) { box.innerHTML = NL.errorState(t('err'), { mod: 'explore' }); return; }
    var st = S.st;
    if (S.city && cityById(S.city)) return cityPanel(box, cityById(S.city), st);
    if (S.prov) return provPanel(box, S.prov, st);
    box.innerHTML = '<div class="ex-ph"><span class="kicker">' + esc(t('nepal')) + '</span><h2>' + esc(t('sevenProv')) + '</h2><p class="muted">' + esc(t('pickHint')) + '</p></div>'
      + '<div class="dtable-wrap"><table class="dtable ex-table"><thead><tr><th>' + esc(t('province')) + '</th><th>' + esc(t('thAlerts')) + '</th><th>' + esc(t('thRoads')) + '</th><th>' + esc(t('thQuakes')) + '</th></tr></thead><tbody>'
      + M.provinces.map(function (p) {
        var s = st[p.id], cell = function (k, n) { return S.ok[k] === false ? '—' : num(n); };
        return '<tr><td><button class="ex-link" type="button" data-p="' + p.id + '"' + (ne() ? ' lang="ne"' : '') + '>' + esc(pname(p.id)) + '</button></td>'
          + '<td>' + cell('alerts', s.alerts.length) + '</td><td>' + cell('alerts', s.roads.length) + '</td><td>' + cell('quakes', s.quakes.length) + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="small muted">' + esc(t('countsBasis')) + '</p>' + upcoming();
  }
  function provPanel(box, id, st) {
    var p = provOf[id], s = st[id];
    var names = s.cities.map(function (c) { return c.en; }).concat(s.cities.map(function (c) { return c.ne; }), p.districts, [p.en, p.ne]);
    box.innerHTML = '<div class="ex-ph"><button class="ex-back" type="button" data-back>← ' + esc(t('allNepal')) + '</button>'
      + '<span class="kicker">' + esc(t('province')) + '</span><h2' + (ne() ? ' lang="ne"' : '') + '>' + esc(pname(id)) + '</h2>'
      + '<p class="muted">' + esc(t('nDistricts', { n: num(p.districts.length) })) + '</p></div>'
      + block(t('cities'), cityRows(s.cities))
      + alertsBlock(s.alerts, t('thAlerts'), t('noAlerts'))
      + alertsBlock(s.roads, t('thRoads'), t('noRoads'))
      + quakeBlock(s.quakes.slice().sort(function (a, b) { return b.time - a.time; }), t('thQuakes30'))
      + newsBlock(names)
      + '<details class="ex-dists"><summary>' + esc(t('districtsList')) + ' (' + num(p.districts.length) + ')</summary><p>' + esc(p.districts.join(', ')) + '</p></details>'
      + upcoming();
  }
  function cityPanel(box, c, st) {
    var pid = provByName[c.province], w = wxOf(c.id), cur = w && w.current, a = airOf(c.id);
    var dist = nd(c.district);
    var alerts = [], roads = [];
    if (pid) st[pid].alerts.forEach(function (x) { if (nd(x.district) === dist) alerts.push(x); });
    if (pid) st[pid].roads.forEach(function (x) { if (nd(x.district) === dist) roads.push(x); });
    var near = S.quakes.map(function (q) { return Object.assign({ dist: km(c.lat, c.lon, q.lat, q.lon) }, q); })
      .filter(function (q) { return q.dist <= 100; }).sort(function (x, y) { return y.time - x.time; });
    var now = cur ? '<div class="ex-now">'
      + '<div><b>' + NL.wx(cur.weather_code).icon + ' ' + num(Math.round(cur.temperature_2m)) + '°</b><span>' + esc(NL.wx(cur.weather_code).desc) + '</span></div>'
      + '<div><b>' + num(Math.round(cur.apparent_temperature)) + '°</b><span>' + esc(t('feels')) + '</span></div>'
      + '<div><b>' + num(Math.round(cur.relative_humidity_2m)) + '%</b><span>' + esc(t('humidity')) + '</span></div>'
      + '<div><b>' + num(Math.round(cur.wind_speed_10m)) + ' km/h</b><span>' + esc(t('wind')) + '</span></div>'
      + (w.today ? '<div><b>' + num(Math.round(w.today.min)) + '° / ' + num(Math.round(w.today.max)) + '°</b><span>' + esc(t('today')) + '</span></div>'
        + '<div><b>' + (w.today.rain != null ? num(w.today.rain) + '%' : '—') + '</b><span>' + esc(t('rainChance')) + '</span></div>' : '')
      + '</div>' : '<p class="small muted">' + esc(t('noWx')) + '</p>';
    var air = a && a.us_aqi != null ? '<div class="ex-airrow"><span class="ex-aqi"><i style="background:' + NL.aqiInfo(a.us_aqi).color + '"></i><b>' + num(Math.round(a.us_aqi)) + '</b> · ' + esc(NL.aqiInfo(a.us_aqi).label) + '</span>'
      + (a.pm2_5 != null ? '<span class="muted small">PM2.5 ' + num(Math.round(a.pm2_5)) + ' µg/m³</span>' : '') + '</div>' + NL.aqiScale(a.us_aqi) : '';
    box.innerHTML = '<div class="ex-ph"><button class="ex-back" type="button" data-p="' + pid + '">← ' + esc(pname(pid)) + '</button>'
      + '<span class="kicker">' + esc(c.district) + ' · ' + esc(pname(pid)) + '</span><h2' + (ne() ? ' lang="ne"' : '') + '>' + esc(cname(c)) + '</h2></div>'
      + block(t('lWeather'), now + (w ? '<p class="small muted">' + esc(t('updated', { ago: NL.ago(Date.parse(S.raw.wx.fetchedAt)) })) + ' · Open-Meteo</p>' : ''))
      + (air ? block(t('aqi'), air) : '')
      + '<div class="ex-actions"><a class="btn btn-primary" href="/weather?city=' + encodeURIComponent(c.id) + '">' + esc(t('fullForecast')) + ' →</a>'
      + '<button class="btn" type="button" data-mycity="' + c.id + '" aria-pressed="' + isMine(c.id) + '">★ ' + esc(isMine(c.id) ? t('myCity') : t('setMyCity')) + '</button>'
      + NL.saveBtn({ type: 'place', id: c.id, title: c.en, url: '/explore?city=' + c.id, sub: c.district + ', ' + c.province }) + '</div>'
      + alertsBlock(alerts, t('thAlerts') + ' · ' + c.district, t('noAlerts'))
      + alertsBlock(roads, t('thRoads'), t('noRoads'))
      + quakeBlock(near, t('lQuakes') + ' · ' + t('within'))
      + newsBlock([c.en, c.ne, c.district]);
  }

  /* --------------------------------------------------------------- render */
  function render() {
    S.st = stats();
    paintMap();
    panel();
    var p = new URLSearchParams();
    if (S.layer !== 'weather') p.set('layer', S.layer);
    if (S.city) p.set('city', S.city); else if (S.prov) p.set('p', S.prov);
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
  }
  var SRC = {
    cities: '/api/cities', wx: '/api/weather-cities', air: '/api/air-cities', alerts: '/api/alerts',
    quakes: '/api/quakes?days=30&minmag=4&limit=100', news: '/api/news-nepal', events: '/api/events'
  };
  async function load() {
    var btn = $('explore-refresh');
    btn.classList.add('spinning');
    var keys = Object.keys(SRC);
    var res = await Promise.allSettled(keys.map(function (k) { return NL.api(SRC[k]); }));
    res.forEach(function (r, i) {
      var k = keys[i];
      if (r.status === 'fulfilled') { S.raw[k] = r.value; S.ok[k] = true; } else if (!S.raw[k]) S.ok[k] = false;
    });
    S.cities = (S.raw.cities && S.raw.cities.cities) || [];
    S.quakes = ((S.raw.quakes && S.raw.quakes.features) || []).map(function (f) {
      var p = f.properties || {}, g = (f.geometry || {}).coordinates || [];
      return { id: f.id, mag: +p.mag, place: p.place || '', time: +p.time, url: p.url, lon: g[0], lat: g[1], depth: g[2] };
    }).filter(function (q) { return isFinite(q.mag) && isFinite(q.lat) && isFinite(q.lon); });
    render();
    var any = keys.some(function (k) { return S.ok[k]; });
    NL.stamp('stamp-explore', any);
    NL.feed('explore', any);
    btn.classList.remove('spinning');
  }

  /* --------------------------------------------------------------- events */
  function setMyCity(id) {
    var c = cityById(id);
    if (!c) return;
    S.my = { id: c.id, en: c.en, ne: c.ne, lat: c.lat, lon: c.lon };
    try { localStorage.setItem('nlive-city', JSON.stringify(S.my)); } catch (e) { /* storage blocked */ }
    if (NL.me.user()) NL.me.fetch('PATCH', '/api/me', { prefs: { city: c.id } }).catch(function () {});
    NL.toast(t('myCitySet') + ' — ' + cname(c));
    panel();
  }
  document.addEventListener('click', function (e) {
    var el;
    if ((el = e.target.closest('[data-layer]'))) { S.layer = el.getAttribute('data-layer'); render(); return; }
    if ((el = e.target.closest('[data-mycity]'))) { setMyCity(el.getAttribute('data-mycity')); return; }
    if ((el = e.target.closest('[data-city]'))) { S.city = el.getAttribute('data-city'); S.prov = cityProv(S.city); render(); scrollPanel(); return; }
    if ((el = e.target.closest('[data-p]'))) {
      var id = el.getAttribute('data-p');
      S.city = null; S.prov = S.prov === id && el.classList.contains('ex-prov') ? null : id;
      render(); scrollPanel(); return;
    }
    if (e.target.closest('[data-back]')) { S.prov = S.city = null; render(); }
  });
  /* on phones the panel sits under the map: bring it into view after a choice */
  function scrollPanel() { if (window.innerWidth <= 980) $('ex-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  /* hover read-out for provinces */
  $('ex-map').addEventListener('mousemove', function (e) {
    var tip = $('ex-tip'), path = e.target.closest && e.target.closest('.ex-prov');
    if (!path || !S.st) { tip.hidden = true; return; }
    var id = path.getAttribute('data-p'), s = S.st[id], box = $('ex-map').getBoundingClientRect();
    var val = { weather: s.cities.length + ' ' + t('cities').toLowerCase(), air: s.cities.length + ' ' + t('cities').toLowerCase(),
      quakes: t('inProv', { n: num(s.quakes.length) }), alerts: num(s.alerts.length) + ' · ' + t('thAlerts'), roads: num(s.roads.length) + ' · ' + t('thRoads') }[S.layer];
    tip.textContent = pname(id) + ' — ' + val;
    tip.style.left = (e.clientX - box.left) + 'px';
    tip.style.top = (e.clientY - box.top) + 'px';
    tip.hidden = false;
  });
  $('ex-map').addEventListener('mouseleave', function () { $('ex-tip').hidden = true; });
  $('explore-refresh').addEventListener('click', load);
  NL.retryHandlers.explore = load;
  NL.onLang(function () { if (S.cities.length) render(); });
  buildMap();
  $('ex-panel').innerHTML = NL.skeleton('rows');
  NL.ticker.autoload();
  NL.renderFooter([
    { name: 'Open-Meteo — weather & air quality', url: 'https://open-meteo.com/' },
    { name: 'USGS — earthquakes', url: 'https://earthquake.usgs.gov/' },
    { name: 'BIPAD Portal — alerts & road closures', url: 'https://bipadportal.gov.np/' },
    { name: 'Province boundaries — Survey Department of Nepal via OCHA', url: 'https://data.humdata.org/' }
  ]);
  load();
  setInterval(function () { if (!document.hidden) load(); }, 300e3);
})();

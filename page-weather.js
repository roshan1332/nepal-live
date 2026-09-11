/*
 * Nepal Weather (/weather): any town (chips for major cities + geocoder
 * search), current conditions with sunrise/sunset, 24-hour and 7-day forecast,
 * air quality (Open-Meteo model for the chosen place + DoE station
 * measurements), and a multi-city overview. The chosen city is remembered on
 * this device and kept in the URL (?city=pokhara or ?lat=&lon=&name=).
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc, fmt = NL.fmt;

  NL.i18n.add({
    en: {
      kicker: 'Nepal Weather', h1: 'Weather & <em>air quality</em>', sub: 'Forecasts for any town in Nepal, and air quality measured at monitoring stations.',
      geoPh: 'Search a city in Nepal', srcWx: 'Forecast: Open-Meteo', hourlyH: 'Next 24 hours', weekK: 'Forecast', weekH: '7-day forecast',
      airK: 'Air quality', airH: 'Air quality', srcAirModel: 'Model estimate: Open-Meteo (CAMS)', stationsH: 'Measured at monitoring stations',
      srcStations: 'Department of Environment stations via BIPAD Portal', citiesK: 'Across Nepal', citiesH: 'Weather in major cities',
      feels: 'Feels like {v}°', hilo: 'H {h}° · L {l}°', humidity: 'Humidity', wind: 'Wind', rain: 'Rain chance', precip: 'Precipitation',
      sunrise: 'Sunrise', sunset: 'Sunset', today: 'Today', noResults: 'No matching place in Nepal.', searching: 'Searching…',
      aqiModel: 'Model estimate for {c}', pm25: 'PM2.5', pm10: 'PM10', trend: 'US AQI, past 12 h and next 12 h',
      nearest: 'Nearest station: {s}, {d} km away', noStations: 'No monitoring station has reported in the last 3 hours.',
      stationNote: 'Measured values published by the Department of Environment. A sensor fault can show as an extreme value — we show what the station reports.',
      errWx: 'Weather for this place isn’t available right now.', errAir: 'Air quality for this place isn’t available right now.', errCities: 'City weather isn’t available right now.'
    },
    ne: {
      kicker: 'नेपालको मौसम', h1: 'मौसम र <em>हावाको गुणस्तर</em>', sub: 'नेपालका जुनसुकै सहरको पूर्वानुमान, र मापन केन्द्रमा नापिएको हावाको गुणस्तर।',
      geoPh: 'नेपालको सहर खोज्नुहोस्', srcWx: 'पूर्वानुमान: Open-Meteo', hourlyH: 'आगामी २४ घण्टा', weekK: 'पूर्वानुमान', weekH: '७ दिनको पूर्वानुमान',
      airK: 'हावाको गुणस्तर', airH: 'हावाको गुणस्तर', srcAirModel: 'मोडेल अनुमान: Open-Meteo (CAMS)', stationsH: 'मापन केन्द्रमा नापिएको',
      srcStations: 'वातावरण विभागका मापन केन्द्र (बिपद पोर्टलमार्फत)', citiesK: 'नेपालभर', citiesH: 'मुख्य सहरको मौसम',
      feels: '{v}° जस्तो महसुस', hilo: 'उच्च {h}° · न्यून {l}°', humidity: 'आर्द्रता', wind: 'हावा', rain: 'वर्षाको सम्भावना', precip: 'वर्षा',
      sunrise: 'सूर्योदय', sunset: 'सूर्यास्त', today: 'आज', noResults: 'नेपालमा मिल्दो ठाउँ भेटिएन।', searching: 'खोज्दै…',
      aqiModel: '{c} को मोडेल अनुमान', pm25: 'PM2.5', pm10: 'PM10', trend: 'US AQI, पछिल्लो १२ र आगामी १२ घण्टा',
      nearest: 'नजिकको मापन केन्द्र: {s}, {d} कि.मी. टाढा', noStations: 'पछिल्लो ३ घण्टामा कुनै मापन केन्द्रले तथ्यांक पठाएको छैन।',
      stationNote: 'वातावरण विभागले प्रकाशन गरेका मापन। सेन्सर बिग्रिँदा असामान्य अंक देखिन सक्छ — हामी केन्द्रले पठाएकै अंक देखाउँछौं।',
      errWx: 'यो ठाउँको मौसम अहिले उपलब्ध छैन।', errAir: 'यो ठाउँको हावाको गुणस्तर अहिले उपलब्ध छैन।', errCities: 'सहरको मौसम अहिले उपलब्ध छैन।'
    }
  });

  var S = { cities: [], city: null, wx: null, air: null, stations: null, wxc: null, airc: null };
  var cityLabel = function (c) { return NL.lang() === 'ne' && c.ne ? c.ne : (c.en || c.name); };
  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem('nlive-city') || 'null'); } catch (e) { return null; } },
    set: function (c) { try { localStorage.setItem('nlive-city', JSON.stringify({ id: c.id || null, en: c.en || c.name, ne: c.ne || null, lat: c.lat, lon: c.lon })); } catch (e) {} }
  };

  function pickInitial() {
    var q = new URLSearchParams(location.search);
    var byId = function (id) { return S.cities.find(function (c) { return c.id === id; }); };
    if (q.get('city') && byId(q.get('city'))) return byId(q.get('city'));
    var lat = parseFloat(q.get('lat')), lon = parseFloat(q.get('lon'));
    if (isFinite(lat) && isFinite(lon) && lat > 26 && lat < 31 && lon > 80 && lon < 89) return { en: (q.get('name') || 'Selected place').slice(0, 60), lat: lat, lon: lon };
    var saved = store.get();
    if (saved && isFinite(saved.lat)) return (saved.id && byId(saved.id)) || saved;
    return byId('kathmandu') || S.cities[0];
  }
  function syncURL() {
    var c = S.city, p = new URLSearchParams();
    if (c.id) p.set('city', c.id); else { p.set('lat', c.lat); p.set('lon', c.lon); p.set('name', c.en || c.name); }
    history.replaceState(null, '', location.pathname + '?' + p + location.hash);
  }

  /* -------------------------------------------------------- chips */
  function renderChips() {
    $('city-chips').innerHTML = S.cities.slice(0, 14).map(function (c) {
      return '<button class="pill" type="button" data-city="' + c.id + '" aria-pressed="' + (S.city && S.city.id === c.id) + '">' + esc(cityLabel(c)) + '</button>';
    }).join('') + (S.city && !S.city.id ? '<button class="pill" type="button" aria-pressed="true">' + esc(S.city.en) + '</button>' : '');
  }

  /* -------------------------------------------------------- weather */
  var hhmm = function (s) { return String(s || '').slice(11, 16); };
  function renderWx() {
    var d = S.wx; if (!d) return;
    var c = d.current, w = NL.wx(c.weather_code);
    /* name the forecast that actually answered (MET Norway stands in when Open-Meteo refuses) */
    var srcEl = document.querySelector('[data-t="srcWx"]');
    if (srcEl) srcEl.textContent = d.source && d.source.name ? (NL.lang() === 'ne' ? 'पूर्वानुमान: ' : 'Forecast: ') + d.source.name : t('srcWx');
    var stat = function (k, v) { return '<div class="wx-stat"><div class="k">' + esc(t(k)) + '</div><div class="v">' + v + '</div></div>'; };
    $('wx-now').innerHTML = '<div class="wxp-head"><h2 class="wxp-city">' + esc(cityLabel(S.city)) + '</h2>'
      + (S.city.province ? '<span class="muted">' + esc(S.city.district + ', ' + S.city.province) + '</span>' : '') + '</div>'
      + '<div class="wx-now"><span class="wx-ico" aria-hidden="true">' + w.icon + '</span><div class="wx-temp">' + Math.round(c.temperature_2m) + '°</div>'
      + '<div><div class="wx-desc">' + esc(w.desc) + '</div><div class="wx-meta">' + esc(t('feels', { v: Math.round(c.apparent_temperature) })) + ' · '
      + esc(t('hilo', { h: Math.round(d.daily.temperature_2m_max[0]), l: Math.round(d.daily.temperature_2m_min[0]) })) + '</div></div></div>'
      + '<div class="wx-stats six">' + stat('humidity', c.relative_humidity_2m + '%') + stat('wind', Math.round(c.wind_speed_10m) + ' km/h')
      + stat('rain', d.daily.precipitation_probability_max[0] != null ? d.daily.precipitation_probability_max[0] + '%' : '–') + stat('precip', c.precipitation != null ? c.precipitation + ' mm' : '–')
      + stat('sunrise', d.daily.sunrise ? hhmm(d.daily.sunrise[0]) : '–') + stat('sunset', d.daily.sunset ? hhmm(d.daily.sunset[0]) : '–') + '</div>';

    var h = d.hourly, start = Math.max(0, h.time.findIndex(function (x) { return x >= c.time; }));
    var idx = []; for (var i = start; i < Math.min(h.time.length, start + 24); i++) idx.push(i);
    var pts = idx.map(function (i) { return { t: Date.parse(h.time[i] + ':00+05:45'), v: h.temperature_2m[i] }; });
    $('wx-hourly').innerHTML = NL.chart(pts, { h: 130, dir: 'info', fmt: function (v) { return Math.round(v) + '°C'; }, dfmt: NL.dfmt.hour })
      + '<div class="hour-strip">' + idx.map(function (i) {
        var hw = NL.wx(h.weather_code[i]);
        return '<div class="hs"><span class="hs-h">' + hhmm(h.time[i]) + '</span><span class="hs-i" title="' + esc(hw.desc) + '">' + hw.icon + '</span>'
          + '<b>' + Math.round(h.temperature_2m[i]) + '°</b><span class="hs-r">' + (h.precipitation_probability[i] != null ? h.precipitation_probability[i] + '%' : '') + '</span></div>';
      }).join('') + '</div>';

    var dd = d.daily, lo = Math.min.apply(null, dd.temperature_2m_min), hi = Math.max.apply(null, dd.temperature_2m_max), span = (hi - lo) || 1;
    $('wx-week').innerHTML = '<ul class="week">' + dd.time.map(function (tm, i) {
      var dw = NL.wx(dd.weather_code[i]);
      var a = (dd.temperature_2m_min[i] - lo) / span * 100, b = (dd.temperature_2m_max[i] - lo) / span * 100;
      return '<li><span class="wk-d">' + esc(i === 0 ? t('today') : NL.dfmt.weekday(Date.parse(tm + 'T12:00:00+05:45'))) + '</span>'
        + '<span class="wk-i" aria-hidden="true">' + dw.icon + '</span><span class="wk-desc">' + esc(dw.desc) + '</span>'
        + '<span class="wk-r">' + (dd.precipitation_probability_max[i] != null ? dd.precipitation_probability_max[i] + '%' : '') + '</span>'
        + '<span class="wk-lo">' + Math.round(dd.temperature_2m_min[i]) + '°</span>'
        + '<span class="wk-bar"><i style="left:' + a.toFixed(1) + '%;right:' + (100 - b).toFixed(1) + '%"></i></span>'
        + '<span class="wk-hi">' + Math.round(dd.temperature_2m_max[i]) + '°</span></li>';
    }).join('') + '</ul>';
  }
  async function loadWx() {
    try {
      S.wx = await NL.api('/api/weather?lat=' + S.city.lat + '&lon=' + S.city.lon);
      NL.guard('wx', renderWx)();
      NL.stamp('stamp-wx', true); NL.feed('weather', true);
    } catch (e) {
      $('wx-now').innerHTML = NL.errorState(t('errWx'), { mod: 'wx', compact: true });
      $('wx-hourly').innerHTML = ''; $('wx-week').innerHTML = '';
      NL.stamp('stamp-wx', false); NL.feed('weather', false);
    }
  }

  /* ------------------------------------------------------------ air */
  function renderAir() {
    if (S.air) {
      var c = S.air.current, info = NL.aqiInfo(c.us_aqi);
      var h = S.air.hourly, pts = [];
      if (h && h.time) {
        var n = h.time.indexOf(String(c.time).slice(0, 13) + ':00');
        if (n < 0) n = h.time.findIndex(function (x) { return x >= c.time; });
        for (var i = Math.max(0, n - 12); n >= 0 && i <= Math.min(h.time.length - 1, n + 12); i++) if (h.us_aqi[i] != null) pts.push({ t: Date.parse(h.time[i] + ':00+05:45'), v: h.us_aqi[i] });
      }
      $('air-now').innerHTML = '<h3 class="label">' + esc(t('aqiModel', { c: cityLabel(S.city) })) + '</h3>'
        + '<div class="air-big"><span class="air-n" style="color:' + info.color + '">' + (c.us_aqi == null ? '–' : Math.round(c.us_aqi)) + '</span><span class="air-u">US AQI</span>'
        + '<span class="air-cat" style="color:' + info.color + '">' + esc(info.label) + '</span></div>'
        + NL.aqiScale(c.us_aqi)
        + '<div class="price-rows"><div><span>' + t('pm25') + '</span><b>' + (c.pm2_5 != null ? fmt(c.pm2_5, 1) : '–') + ' µg/m³</b></div><div><span>' + t('pm10') + '</span><b>' + (c.pm10 != null ? fmt(c.pm10, 1) : '–') + ' µg/m³</b></div></div>'
        + '<p class="aqi-advice" style="border-color:' + info.color + '">' + esc(info.tip) + '</p>'
        + (pts.length > 4 ? '<h4 class="label mb">' + esc(t('trend')) + '</h4>' + NL.chart(pts, { h: 110, color: info.color, fmt: function (v) { return 'AQI ' + Math.round(v); }, dfmt: NL.dfmt.hour }) : '');
    }
    if (S.stations) {
      var st = S.stations.stations;
      var near = st.map(function (s) { return { s: s, d: s.lat != null ? NL.km(S.city.lat, S.city.lon, s.lat, s.lon) : Infinity }; }).sort(function (a, b) { return a.d - b.d; })[0];
      $('air-stations').innerHTML = st.length ? (near && near.d < 40 ? '<p class="near-st">' + esc(t('nearest', { s: near.s.name, d: Math.round(near.d) })) + '</p>' : '')
        + '<ul class="st-list">' + st.map(function (s) {
          var i2 = NL.aqiInfo(s.aqi);
          var fresh = Date.now() - Date.parse(s.time) < 90 * 60e3 ? 'live' : 'measured';
          return '<li class="' + (near && near.s === s && near.d < 40 ? 'is-near' : '') + '"><span class="st-aqi" style="background:' + i2.color + '">' + s.aqi + '</span>'
            + '<span class="st-n"><b>' + esc(s.name) + '</b><span class="st-c">' + esc(i2.label) + (s.pm25 != null ? ' · PM2.5 ' + fmt(s.pm25, 1) : '') + '</span></span>'
            + '<span class="st-t">' + NL.fresh(fresh, s.time) + '</span></li>';
        }).join('') + '</ul><p class="src-note">' + esc(t('stationNote')) + '</p>'
        : NL.emptyState(t('noStations'), { icon: 'wind', compact: true });
    }
  }
  async function loadAir() {
    var r = await Promise.allSettled([NL.api('/api/air?lat=' + S.city.lat + '&lon=' + S.city.lon), NL.api('/api/aqi-stations')]);
    if (r[0].status === 'fulfilled') S.air = r[0].value; else { S.air = null; $('air-now').innerHTML = NL.errorState(t('errAir'), { mod: 'air', compact: true }); }
    if (r[1].status === 'fulfilled') S.stations = r[1].value;
    NL.guard('air', renderAir)();
    NL.stamp('stamp-air', r[0].status === 'fulfilled' || r[1].status === 'fulfilled');
  }

  /* --------------------------------------------------------- cities */
  function renderCities() {
    if (!S.wxc) return;
    var air = {};
    ((S.airc && S.airc.cities) || []).forEach(function (c) { air[c.id] = c.current && c.current.us_aqi; });
    $('city-grid').innerHTML = S.wxc.cities.map(function (c) {
      var w = NL.wx(c.current.weather_code), a = air[c.id], ai = a != null ? NL.aqiInfo(a) : null;
      return '<button class="city-card' + (S.city && S.city.id === c.id ? ' on' : '') + '" type="button" data-city="' + c.id + '">'
        + '<span class="cc-top"><b>' + esc(cityLabel(c)) + '</b><span class="cc-i" aria-hidden="true">' + w.icon + '</span></span>'
        + '<span class="cc-t">' + Math.round(c.current.temperature_2m) + '°</span>'
        + '<span class="cc-d">' + esc(w.desc) + '</span>'
        + '<span class="cc-m">' + (c.today ? esc(t('hilo', { h: Math.round(c.today.max), l: Math.round(c.today.min) })) : '')
        + (ai ? ' · <i class="cc-aqi" style="background:' + ai.color + '"></i>AQI ' + Math.round(a) : '') + '</span></button>';
    }).join('');
  }
  async function loadCities() {
    var r = await Promise.allSettled([NL.api('/api/weather-cities'), NL.api('/api/air-cities')]);
    if (r[0].status === 'fulfilled') S.wxc = r[0].value;
    if (r[1].status === 'fulfilled') S.airc = r[1].value;
    if (!S.wxc) { $('city-grid').innerHTML = NL.errorState(t('errCities'), { mod: 'cities', compact: true }); NL.stamp('stamp-cities', false); return; }
    NL.guard('cities', renderCities)();
    NL.stamp('stamp-cities', true);
    NL.ticker.set('weather', NL.tk.weather(S.wxc.cities[0].current.temperature_2m));
  }

  function select(c) {
    S.city = c;
    store.set(c);
    syncURL();
    renderChips();
    renderCities();
    $('wx-now').innerHTML = NL.skeleton('block');
    loadWx(); loadAir();
  }

  /* ---------------------------------------------------------- search */
  var geoT, geoSel = -1, geoRes = [];
  var input = $('geo-q'), list = $('geo-list');
  function geoShow(html) { list.innerHTML = html; list.hidden = !html; input.setAttribute('aria-expanded', html ? 'true' : 'false'); }
  function geoRender() {
    geoShow(geoRes.length ? geoRes.map(function (r, i) {
      return '<li role="option" id="geo-' + i + '" aria-selected="' + (i === geoSel) + '" data-geo="' + i + '"><b>' + esc(r.name) + '</b><span>' + esc([r.admin2, r.admin1].filter(Boolean).join(', ')) + '</span></li>';
    }).join('') : '<li class="geo-empty">' + esc(t('noResults')) + '</li>');
    if (geoSel >= 0) input.setAttribute('aria-activedescendant', 'geo-' + geoSel);
  }
  input.addEventListener('input', function () {
    clearTimeout(geoT);
    var q = input.value.trim();
    if (q.length < 2) { geoShow(''); return; }
    geoShow('<li class="geo-empty">' + esc(t('searching')) + '</li>');
    geoT = setTimeout(function () {
      NL.api('/api/geocode?q=' + encodeURIComponent(q)).then(function (d) { geoRes = d.results || []; geoSel = geoRes.length ? 0 : -1; geoRender(); })
        .catch(function () { geoRes = []; geoRender(); });
    }, 250);
  });
  input.addEventListener('keydown', function (e) {
    if (list.hidden || !geoRes.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); geoSel = Math.min(geoRes.length - 1, geoSel + 1); geoRender(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); geoSel = Math.max(0, geoSel - 1); geoRender(); }
    else if (e.key === 'Enter' && geoSel >= 0) { e.preventDefault(); pickGeo(geoSel); }
    else if (e.key === 'Escape') geoShow('');
  });
  function pickGeo(i) {
    var r = geoRes[i]; if (!r) return;
    var known = S.cities.find(function (c) { return Math.abs(c.lat - r.lat) < 0.03 && Math.abs(c.lon - r.lon) < 0.03; });
    input.value = ''; geoShow('');
    select(known || { en: r.name, lat: r.lat, lon: r.lon, district: r.admin2, province: r.admin1 });
  }
  list.addEventListener('click', function (e) { var li = e.target.closest('[data-geo]'); if (li) pickGeo(+li.getAttribute('data-geo')); });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.geo-search')) geoShow('');
    var b = e.target.closest('[data-city]');
    if (b) { var c = S.cities.find(function (x) { return x.id === b.getAttribute('data-city'); }); if (c) { select(c); if (b.classList.contains('city-card')) window.scrollTo({ top: 0, behavior: 'smooth' }); } }
  });

  NL.retryHandlers.wx = loadWx; NL.retryHandlers.air = loadAir; NL.retryHandlers.cities = loadCities;
  NL.onLang(function () { renderChips(); NL.guard('wx', renderWx)(); NL.guard('air', renderAir)(); NL.guard('cities', renderCities)(); });
  NL.search.add({ group: function () { return t('citiesH'); }, limit: 6,
    items: function () { return S.cities.map(function (c) { return { title: cityLabel(c), sub: c.district + ', ' + c.province, href: '/weather?city=' + c.id, icon: 'sun2', kw: c.en + ' ' + c.ne + ' weather' }; }); } });

  ['wx-now', 'wx-hourly', 'air-now', 'air-stations'].forEach(function (id) { $(id).innerHTML = NL.skeleton('block'); });
  $('city-grid').innerHTML = NL.skeleton('cards');
  NL.ticker.autoload();
  NL.renderFooter([
    { name: 'Open-Meteo — forecasts & air-quality model', url: 'https://open-meteo.com/' },
    { name: 'Department of Environment via BIPAD Portal — measured AQI', url: 'https://bipadportal.gov.np/' },
    { name: 'DHM — Department of Hydrology and Meteorology', url: 'https://www.dhm.gov.np/' },
  ]);
  NL.api('/api/cities').then(function (d) {
    S.cities = d.cities || [];
    S.city = pickInitial();
    renderChips();
    loadWx(); loadAir(); loadCities();
  }).catch(function () { $('wx-now').innerHTML = NL.errorState(t('errWx'), { compact: true }); });
  setInterval(function () { if (!document.hidden && S.city) { loadWx(); loadAir(); } }, 900e3);
})();

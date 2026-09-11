'use strict';
/*
 * MET Norway (api.met.no, the forecasts behind Yr) as a second weather source.
 *
 * Open-Meteo's free quota is counted per IP address, and Render's outbound IP
 * is shared by many sites, so it can run out for reasons outside our control.
 * When it does, forecasts come from MET Norway instead, reshaped into the same
 * fields the pages already use, and labelled "MET Norway" wherever shown.
 *
 * What MET Norway does not publish for Nepal is left empty, never guessed:
 * rain probability is null (pages show "–"). Two values are computed from the
 * forecast itself: "feels like" (the Australian Bureau of Meteorology apparent
 * temperature, from temperature, humidity and wind) and sunrise/sunset (the
 * standard solar equations).
 *
 * Terms (https://api.met.no/doc/TermsOfService): identify the app in the
 * User-Agent, cache responses, stay far below 20 requests a second.
 */
module.exports = function init({ fetchURL }) {
  const HEADERS = { 'User-Agent': 'NepalLive/2.0 (+https://nepal-live.onrender.com)', Accept: 'application/json' };
  const SOURCE = { name: 'MET Norway', url: 'https://www.met.no/en', fallback: true };
  const TTL = 30 * 60e3;
  const memo = new Map();

  /* MET symbol codes → the WMO weather codes the pages already translate */
  const WMO = [
    [/thunder/, 95], [/^heavyrainshowers/, 82], [/^lightrainshowers/, 80], [/^rainshowers/, 81],
    [/^heavyrain/, 65], [/^lightrain/, 61], [/^rain/, 63],
    [/^heavysleet/, 65], [/^lightsleet/, 61], [/^sleet/, 63],
    [/^heavysnowshowers/, 86], [/snowshowers/, 85], [/^heavysnow/, 75], [/^lightsnow/, 71], [/^snow/, 73],
    [/^fog/, 45], [/^cloudy/, 3], [/^partlycloudy/, 2], [/^fair/, 1], [/^clearsky/, 0],
  ];
  const code = (sym) => {
    const s = String(sym || '').replace(/_(day|night|polartwilight)$/, '');
    const hit = WMO.find(([re]) => re.test(s));
    return hit ? hit[1] : null;
  };
  /* for a day's summary pick the most significant weather; fog ranks just above overcast */
  const weight = (c) => (c == null ? -1 : c === 45 ? 3.5 : c);
  const r1 = (v) => Math.round(v * 10) / 10;
  const feels = (t, rh, ws) => {
    const e = (rh / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t));
    return r1(t + 0.33 * e - 0.7 * ws - 4);
  };

  /* Nepal Time as "YYYY-MM-DDTHH:MM", the format Open-Meteo returns with timezone=Asia/Kathmandu */
  const NPT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const local = (ms) => {
    const p = Object.fromEntries(NPT.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  };

  /* sunrise equation (NOAA/Wikipedia form), accurate to about a minute */
  function sun(dateStr, lat, lon) {
    const rad = Math.PI / 180;
    /* from 00:00 UTC: at noon the Julian date is a whole number and ceil() below would land on the next day */
    const jdate = Date.parse(dateStr + 'T00:00:00Z') / 864e5 + 2440587.5;
    const n = Math.ceil(jdate - 2451545.0 + 0.0008);
    const js = n - lon / 360;
    const M = (357.5291 + 0.98560028 * js) % 360;
    const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
    const L = (M + C + 180 + 102.9372) % 360;
    const jt = 2451545.0 + js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
    const dec = Math.asin(Math.sin(L * rad) * Math.sin(23.4397 * rad));
    const cosw = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
    if (cosw < -1 || cosw > 1) return { rise: null, set: null };
    const w = Math.acos(cosw) / rad;
    const toMs = (j) => (j - 2440587.5) * 864e5;
    return { rise: local(toMs(jt - w / 360)), set: local(toMs(jt + w / 360)) };
  }

  async function forecast(lat, lon) {
    const key = lat.toFixed(3) + ',' + lon.toFixed(3);
    const hit = memo.get(key);
    if (hit && Date.now() - hit.at < TTL) return hit.data;
    const r = await fetchURL(`https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`, 0, HEADERS);
    if (r.status >= 400) throw new Error('MET Norway HTTP ' + r.status);
    const ts = ((JSON.parse(r.body).properties || {}).timeseries) || [];
    if (!ts.length) throw new Error('MET Norway: empty forecast');

    const now = Date.now();
    let i0 = ts.findIndex((s) => Date.parse(s.time) > now - 3600e3);
    if (i0 < 0) i0 = 0;
    const cur = ts[i0], det = cur.data.instant.details;
    const next = cur.data.next_1_hours || {};
    const sym = next.summary && next.summary.symbol_code;
    const today = local(now).slice(0, 10);
    const s0 = sun(today, lat, lon);
    const ct = local(Date.parse(cur.time));
    const isDay = /_night$/.test(sym || '') ? 0 : /_day$/.test(sym || '') ? 1 : (s0.rise && s0.set && ct >= s0.rise && ct < s0.set ? 1 : 0);
    const current = {
      time: ct, interval: 3600,
      temperature_2m: r1(det.air_temperature),
      relative_humidity_2m: Math.round(det.relative_humidity),
      apparent_temperature: feels(det.air_temperature, det.relative_humidity, det.wind_speed),
      is_day: isDay,
      precipitation: next.details && next.details.precipitation_amount != null ? next.details.precipitation_amount : 0,
      weather_code: code(sym),
      wind_speed_10m: r1(det.wind_speed * 3.6),
    };

    const hourly = { time: [], temperature_2m: [], weather_code: [], precipitation_probability: [] };
    ts.slice(i0).forEach((s) => {
      if (!s.data.next_1_hours || hourly.time.length >= 48) return;
      hourly.time.push(local(Date.parse(s.time)));
      hourly.temperature_2m.push(r1(s.data.instant.details.air_temperature));
      hourly.weather_code.push(code(s.data.next_1_hours.summary.symbol_code));
      hourly.precipitation_probability.push(null);
    });

    /* daily: range from every forecast point of that Nepal day (and the 6-hour
       extremes that start within it); for today that means the rest of the day */
    const days = new Map();
    ts.forEach((s) => {
      const at = local(Date.parse(s.time)), d = at.slice(0, 10), hh = +at.slice(11, 13);
      if (!days.has(d)) days.set(d, { max: -Infinity, min: Infinity, day: [], all: [] });
      const g = days.get(d), v = s.data.instant.details.air_temperature;
      if (v != null) { g.max = Math.max(g.max, v); g.min = Math.min(g.min, v); }
      const six = s.data.next_6_hours;
      if (six && six.details && hh <= 18) {
        if (six.details.air_temperature_max != null) g.max = Math.max(g.max, six.details.air_temperature_max);
        if (six.details.air_temperature_min != null) g.min = Math.min(g.min, six.details.air_temperature_min);
      }
      const blk = s.data.next_1_hours || six;
      const c = blk && blk.summary ? code(blk.summary.symbol_code) : null;
      if (c != null) { g.all.push(c); if (hh >= 6 && hh < 18) g.day.push(c); }
    });
    const daily = { time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_probability_max: [], sunrise: [], sunset: [] };
    [...days.keys()].filter((d) => d >= today).slice(0, 7).forEach((d) => {
      const g = days.get(d);
      if (!Number.isFinite(g.max) || !Number.isFinite(g.min)) return;
      const pool = g.day.length ? g.day : g.all;
      const worst = pool.slice().sort((a, b) => weight(b) - weight(a))[0];
      const st = sun(d, lat, lon);
      daily.time.push(d);
      daily.weather_code.push(worst != null ? worst : null);
      daily.temperature_2m_max.push(r1(g.max));
      daily.temperature_2m_min.push(r1(g.min));
      daily.precipitation_probability_max.push(null);
      daily.sunrise.push(st.rise);
      daily.sunset.push(st.set);
    });

    const data = { latitude: lat, longitude: lon, timezone: 'Asia/Kathmandu', current, hourly, daily, source: SOURCE, fetchedAt: new Date().toISOString() };
    memo.set(key, { at: Date.now(), data });
    if (memo.size > 300) memo.delete(memo.keys().next().value);
    return data;
  }

  /* the multi-city view: a few cities at a time, each cached for 30 minutes */
  async function cities(list, why) {
    const out = [];
    for (let i = 0; i < list.length; i += 4) {
      const batch = await Promise.all(list.slice(i, i + 4).map(async (c) => {
        try {
          const f = await forecast(c.lat, c.lon);
          return { ...c, current: f.current, today: { max: f.daily.temperature_2m_max[0], min: f.daily.temperature_2m_min[0], rain: null } };
        } catch (e) { return { ...c, current: null, today: null }; }
      }));
      out.push(...batch);
    }
    if (!out.some((c) => c.current)) throw new Error('MET Norway unavailable' + (why ? ` (Open-Meteo: ${why})` : ''));
    return { cities: out, source: SOURCE, fetchedAt: new Date().toISOString() };
  }

  return { forecast, cities, sun, code, SOURCE };
};

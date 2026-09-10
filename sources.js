/*
 * Nepal Live — data producers for the newer sections: alerts, roads, fuel,
 * air-quality stations, trending topics and today's highlights.
 *
 * server.js calls init(ctx) once and wires the returned producers to routes.
 * Rule for everything in this file: return only what an upstream source said,
 * with its own timestamp and a link back. Nothing is estimated, padded or
 * invented; a missing source is reported as missing.
 */
'use strict';

const KTM = [27.7172, 85.324];
const rad = (d) => d * Math.PI / 180;
function km(lat1, lon1, lat2, lon2) {
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}
const iso = (t) => { const d = new Date(t); return isNaN(d) ? null : d.toISOString(); };
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

const LEVEL_RANK = { emergency: 4, warning: 3, advisory: 2, info: 1 };

/* Cities with coordinates verified against Open-Meteo's geocoder (population-
   ranked match inside Nepal); the first 14 cover every province and feed the
   multi-city weather and air-quality views. */
const CITIES = [
  ['kathmandu', 'Kathmandu', 'काठमाडौं', 27.7017, 85.3206, 'Bagmati', 'Kathmandu'],
  ['pokhara', 'Pokhara', 'पोखरा', 28.2669, 83.9685, 'Gandaki', 'Kaski'],
  ['lalitpur', 'Lalitpur', 'ललितपुर', 27.6766, 85.3142, 'Bagmati', 'Lalitpur'],
  ['bhaktapur', 'Bhaktapur', 'भक्तपुर', 27.673, 85.43, 'Bagmati', 'Bhaktapur'],
  ['biratnagar', 'Biratnagar', 'विराटनगर', 26.455, 87.2701, 'Koshi', 'Morang'],
  ['bharatpur', 'Bharatpur', 'भरतपुर', 27.6803, 84.4365, 'Bagmati', 'Chitwan'],
  ['butwal', 'Butwal', 'बुटवल', 27.7005, 83.4484, 'Lumbini', 'Rupandehi'],
  ['nepalgunj', 'Nepalgunj', 'नेपालगन्ज', 28.05, 81.6167, 'Lumbini', 'Banke'],
  ['dharan', 'Dharan', 'धरान', 26.8144, 87.2797, 'Koshi', 'Sunsari'],
  ['dhangadhi', 'Dhangadhi', 'धनगढी', 28.7016, 80.5899, 'Sudurpashchim', 'Kailali'],
  ['janakpur', 'Janakpur', 'जनकपुर', 26.7288, 85.9263, 'Madhesh', 'Dhanusha'],
  ['birgunj', 'Birgunj', 'वीरगन्ज', 27.0174, 84.8805, 'Madhesh', 'Parsa'],
  ['hetauda', 'Hetauda', 'हेटौंडा', 27.4284, 85.0322, 'Bagmati', 'Makwanpur'],
  ['birendranagar', 'Birendranagar', 'वीरेन्द्रनगर', 28.5967, 81.6166, 'Karnali', 'Surkhet'],
  ['itahari', 'Itahari', 'इटहरी', 26.6637, 87.274, 'Koshi', 'Sunsari'],
  ['damak', 'Damak', 'दमक', 26.669, 87.703, 'Koshi', 'Jhapa'],
  ['tansen', 'Tansen', 'तानसेन', 27.8666, 83.5459, 'Lumbini', 'Palpa'],
  ['gorkha', 'Gorkha', 'गोरखा', 28.0024, 84.6201, 'Gandaki', 'Gorkha'],
  ['jumla', 'Jumla', 'जुम्ला', 29.2747, 82.1838, 'Karnali', 'Jumla'],
  ['mahendranagar', 'Mahendranagar', 'महेन्द्रनगर', 28.964, 80.1771, 'Sudurpashchim', 'Kanchanpur'],
  ['siddharthanagar', 'Siddharthanagar', 'सिद्धार्थनगर', 27.5, 83.45, 'Lumbini', 'Rupandehi'],
  ['lumbini', 'Lumbini', 'लुम्बिनी', 27.4862, 83.2771, 'Lumbini', 'Rupandehi'],
  ['namche', 'Namche Bazaar', 'नाम्चे बजार', 27.8053, 86.7106, 'Koshi', 'Solukhumbu'],
  ['jomsom', 'Jomsom', 'जोमसोम', 28.7844, 83.7351, 'Gandaki', 'Mustang'],
  ['dhulikhel', 'Dhulikhel', 'धुलिखेल', 27.6221, 85.5428, 'Bagmati', 'Kavrepalanchok'],
  ['tulsipur', 'Tulsipur', 'तुलसीपुर', 28.1333, 82.298, 'Lumbini', 'Dang'],
  ['ghorahi', 'Ghorahi', 'घोराही', 28.0432, 82.4862, 'Lumbini', 'Dang'],
  ['gaur', 'Gaur', 'गौर', 26.7637, 85.2766, 'Madhesh', 'Rautahat'],
  ['rajbiraj', 'Rajbiraj', 'राजविराज', 26.5397, 86.748, 'Madhesh', 'Saptari'],
  ['lahan', 'Lahan', 'लहान', 26.7202, 86.4826, 'Madhesh', 'Siraha'],
  ['baglung', 'Baglung', 'बागलुङ', 28.2673, 83.5996, 'Gandaki', 'Baglung'],
  ['simikot', 'Simikot', 'सिमिकोट', 29.9714, 81.8197, 'Karnali', 'Humla'],
].map(([id, en, ne, lat, lon, province, district]) => ({ id, en, ne, lat, lon, province, district }));
const AGENCY = {
  dor: 'Department of Roads', dhm: 'Department of Hydrology and Meteorology',
  doe: 'Department of Environment', nsc: 'National Seismological Centre',
};
const BIPAD = { name: 'BIPAD Portal · Government of Nepal', url: 'https://bipadportal.gov.np/' };

/* Major routes and the districts each passes through. A DoR closure is matched
   by district only, so the UI says "closure reported in a district on this
   route" — never that the highway itself is closed. */
const CORRIDORS = [
  { id: 'valley', en: 'Kathmandu Valley', ne: 'काठमाडौं उपत्यका', districts: ['Kathmandu', 'Lalitpur', 'Bhaktapur'] },
  { id: 'prithvi', en: 'Prithvi Highway (Kathmandu–Pokhara)', ne: 'पृथ्वी राजमार्ग (काठमाडौं–पोखरा)', districts: ['Dhading', 'Chitwan', 'Tanahun', 'Kaski'] },
  { id: 'mugling', en: 'Narayanghat–Mugling Road', ne: 'नारायणगढ–मुग्लिन सडक', districts: ['Chitwan'] },
  { id: 'bp', en: 'BP Highway (Dhulikhel–Sindhuli–Bardibas)', ne: 'बीपी राजमार्ग (धुलिखेल–सिन्धुली–बर्दिबास)', districts: ['Kavrepalanchok', 'Sindhuli', 'Mahottari'] },
  { id: 'rajpath', en: 'Tribhuvan Rajpath & Kanti Lokpath (Kathmandu–Hetauda)', ne: 'त्रिभुवन राजपथ र कान्ति लोकपथ (काठमाडौं–हेटौंडा)', districts: ['Dhading', 'Makwanpur', 'Lalitpur'] },
  { id: 'araniko', en: 'Araniko Highway (Kathmandu–Kodari)', ne: 'अरनिको राजमार्ग (काठमाडौं–कोदारी)', districts: ['Bhaktapur', 'Kavrepalanchok', 'Sindhupalchok'] },
  { id: 'pasang', en: 'Pasang Lhamu Highway (Trishuli–Rasuwagadhi)', ne: 'पासाङल्हामु राजमार्ग (त्रिशूली–रसुवागढी)', districts: ['Nuwakot', 'Rasuwa'] },
  { id: 'siddhartha', en: 'Siddhartha Highway (Butwal–Pokhara)', ne: 'सिद्धार्थ राजमार्ग (बुटवल–पोखरा)', districts: ['Rupandehi', 'Palpa', 'Syangja', 'Kaski'] },
  { id: 'karnali', en: 'Karnali Highway (Surkhet–Jumla)', ne: 'कर्णाली राजमार्ग (सुर्खेत–जुम्ला)', districts: ['Surkhet', 'Dailekh', 'Kalikot', 'Jumla'] },
  { id: 'eastwest', en: 'East–West (Mahendra) Highway', ne: 'पूर्व–पश्चिम (महेन्द्र) राजमार्ग',
    districts: ['Jhapa', 'Morang', 'Sunsari', 'Saptari', 'Siraha', 'Dhanusha', 'Mahottari', 'Sarlahi', 'Rautahat', 'Bara',
      'Makwanpur', 'Chitwan', 'Nawalparasi', 'Rupandehi', 'Kapilvastu', 'Dang', 'Banke', 'Bardiya', 'Kailali', 'Kanchanpur'] },
];
const normDistrict = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '')
  .replace(/^kavre.*/, 'kavrepalanchok').replace(/^sindhupal.*/, 'sindhupalchok').replace(/^dhanus.*/, 'dhanusha')
  .replace(/^nawalparasi.*|^parasi.*|^nawalpur.*/, 'nawalparasi').replace(/^kapilbastu/, 'kapilvastu').replace(/^bardia/, 'bardiya');

/* Words that carry no topic of their own, for the trending counter. */
const EN_STOP = new Set(('a an the and or but of to in on at for from by with as is are was were be been being has have had '
  + 'will would can could should may might must do does did this that these those it its into over under after before about '
  + 'against between during without within than then there their they them he she his her we our you your who whom which '
  + 'what when where why how all any both each few more most other some such no nor not only own same so too very just also '
  + 'new says said say amid year years day days week month ahead get gets got make makes made take takes set sets one two '
  + 'three four five six seven eight nine ten first second last per via vs up down out off near across top big key major '
  + 'minister ministry government govt police people district province nepal nepali nepalese kathmandu today yesterday '
  + 'tomorrow news report reports update live watch video photos photo rs crore lakh million billion percent latest '
  + 'amid over urges urged calls call plans plan held hold starts start ends end sees seen says'
).split(/\s+/));
const NE_STOP = new Set(('र को का की के मा ले लाई बाट देखि सम्म लागि पनि नै यो त्यो यस उक्त छ छन् हो थियो थिए गर्न गर्ने '
  + 'गरेको गरेका गरे गर्दै गरी भन्दै भने भएको भएका भए हुने हुन हुँदा रहेको रहेका आज अब एक दुई तीन नयाँ बीच साथ प्रति '
  + 'भित्र बाहिर माथि तल अघि पछि लगायत सहित समेत तथा वा तर किन कसरी कुन जस्तो हुन्छ गर्छ भन्छन् भन्ने दिन गर्नुपर्ने '
  + 'नेपाल नेपाली सरकार काठमाडौं जिल्ला प्रदेश प्रहरी मन्त्री मन्त्रालय वर्ष महिना हप्ता जना रुपैयाँ करोड लाख अर्ब प्रतिशत '
  + 'गर्नेछ गरिने गरिएको गरिँदै भनेका भनेको बताए बताइन् बताउनुभयो पुगेको पुग्यो आएको आएका गएको जाने आउने थप अझै धेरै सबै '
  + 'दिइन् दिए दिने दिएको दिएका गरिन् गरेर भएर लिए लिने लिएको भनिन् भन्नुभयो गर्नुभयो हुनुभयो गर्दा हुँदै रहे रहेछ राखे राख्ने '
  + 'पाए पाउने चाहन्छ गरिएका गरिँदा परेको परेका पर्ने आए गए बन्यो बने बनाउने ल्याउने गराउने दिँदै लागेको लाग्यो सुरु'
).split(/\s+/));
/* Only unambiguous case endings: stripping का / की / मा would mangle words that
   merely end that way (अमेरिका, राजीनामा). */
const NE_SUFFIX = ['हरूको', 'हरूले', 'हरूलाई', 'हरूमा', 'हरू', 'लाई', 'बाट', 'देखि', 'सम्म', 'सँग', 'ले', 'को'];

module.exports = function init(ctx) {
  const { fetchURL, cached, P } = ctx;

  const json = async (url) => {
    const r = await fetchURL(url);
    if (r.status >= 400) throw new Error(`HTTP ${r.status}`);
    return JSON.parse(r.body);
  };
  const bipad = (p) => json('https://bipadportal.gov.np/api/v1/' + p);

  /* ---------------------------------------------------------------- upstream */
  const bipadAlerts = () => cached('bipad-alerts', 180e3, async () => (await bipad('alert/?limit=200&ordering=-started_on')).results || []);
  const riverStations = () => cached('bipad-rivers', 300e3, async () => (await bipad('river-stations/?limit=400')).results || []);
  const bipadIncidents = () => cached('bipad-incidents', 600e3,
    async () => (await bipad('incident/?limit=80&ordering=-incident_on&expand=hazard')).results || []);
  const gdacs = () => cached('gdacs-np', 900e3,
    async () => (await json('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?country=Nepal')).features || []);

  /* "Road closed in Bhotekoshi-2, Sindhupalchok" → "Bhotekoshi-2, Sindhupalchok" */
  const locOf = (title) => { const m = /\b(?:at|in)\s+(.+)$/.exec(String(title || '')); return m ? m[1].trim() : ''; };

  function fromBipadAlert(a, now) {
    const type = a.referenceType || '';
    const raw = String(a.description || '');
    const location = locOf(a.title);
    const district = location ? location.split(',').pop().trim() : '';
    const basin = (/Basin:\s*([^\n\r]+)/i.exec(raw) || [])[1];
    let category = 'other', level = 'info', description = clean(raw);
    if (type === 'river') {
      category = 'flood';
      level = /danger/i.test(a.title + raw) ? 'emergency' : 'warning';
      const w = /Warning level:\s*([\d.]+)/i.exec(raw), l = /Water level:\s*([\d.]+)/i.exec(raw);
      description = [basin && clean(basin) && `${clean(basin)} basin`, l && `water level ${(+l[1]).toFixed(2)} m`,
        w && `warning level ${(+w[1]).toFixed(2)} m`].filter(Boolean).join(' · ');
    } else if (type === 'rain') {
      category = 'rain'; level = 'advisory';
      description = basin && clean(basin) ? `${clean(basin)} basin` : '';
    } else if (type === 'road') {
      category = 'road'; level = 'advisory';
    } else if (type === 'pollution') {
      category = 'air';
      let aqi = null;
      try { aqi = JSON.parse(a.referenceData).fields.aqi; } catch (e) { /* keep text */ }
      level = aqi > 300 ? 'emergency' : aqi > 200 ? 'warning' : 'advisory';
      if (aqi) description = `US AQI ${Math.round(aqi)} at the monitoring station`;
    } else if (type === 'earthquake') {
      category = 'earthquake';
    }
    const start = Date.parse(a.startedOn || a.createdOn);
    const ends = a.expireOn ? Date.parse(a.expireOn) : null;
    const agency = AGENCY[String(a.source || '').toLowerCase()] || String(a.source || '').toUpperCase() || 'BIPAD';
    /* Some records never get an expiry, so "no end date" can't mean "still
       happening" forever. Each kind gets the window its hazard plausibly lasts;
       a road closure can last weeks, but is flagged as possibly outdated. */
    const age = now - start;
    let active = !ends || ends > now;
    if (type === 'river' || type === 'rain') active = active && age < 12 * 3600e3;
    else if (type === 'pollution') active = active && age < 6 * 3600e3;
    else if (type === 'road') active = active && age < 30 * 864e5;
    else active = active && age < 48 * 3600e3;
    return {
      id: 'bipad-' + a.id, level, category, title: clean(a.title), titleNe: clean(a.titleNe) || null,
      location, district, lat: a.point ? a.point.coordinates[1] : null, lon: a.point ? a.point.coordinates[0] : null,
      time: iso(start), ends: ends ? iso(ends) : null, active, stale: type === 'road' && active && age > 7 * 864e5, description,
      kind: 'recent', agency, source: { name: `${agency} via BIPAD Portal`, url: BIPAD.url },
    };
  }

  /* ------------------------------------------------------------------ alerts */
  /* Level rules (also shown on the Alerts page):
     rivers — above danger level = emergency, above warning level = warning (DHM gauges)
     BIPAD — flood warning = warning, heavy rainfall / road closure = advisory,
             pollution = advisory (AQI > 200 warning, > 300 emergency)
     USGS — M6.5+ within 300 km of Kathmandu = emergency, M6+ = warning, M5+ = advisory, else information
     GDACS — Red = emergency, Orange = warning, Green = information */
  const quakeLevel = (m, d) => (m >= 6.5 && d <= 300 ? 'emergency' : m >= 6 ? 'warning' : m >= 5 ? 'advisory' : 'info');

  function alerts() {
    return cached('alerts', 180e3, async () => {
      const now = Date.now();
      const [al, rivers, qk, gd, inc] = await Promise.allSettled([
        bipadAlerts(), riverStations(), P.quakes({ days: 7, minmag: 4, limit: 40 }), gdacs(), bipadIncidents(),
      ]);
      const items = [];
      const sources = [];

      if (al.status === 'fulfilled') {
        const seen = new Set();
        al.value.forEach((a) => {
          const it = fromBipadAlert(a, now);
          if (seen.has(it.title)) return;              // newest record per location wins
          seen.add(it.title);
          if (it.active || now - Date.parse(it.time) < 48 * 3600e3) items.push(it);
        });
      }
      sources.push({ key: 'bipad', name: BIPAD.name, url: BIPAD.url, ok: al.status === 'fulfilled' });

      if (rivers.status === 'fulfilled') {
        rivers.value.forEach((s) => {
          const st = String(s.status || '').toUpperCase();
          if (!/ABOVE (WARNING|DANGER)/.test(st) || !s.waterLevelOn) return;
          if (now - Date.parse(s.waterLevelOn) > 3 * 3600e3) return;       // stale gauge: not live, skip
          const danger = st.includes('DANGER');
          const f = (v) => (v == null ? null : (+v).toFixed(2));
          items.push({
            id: 'river-' + s.id, level: danger ? 'emergency' : 'warning', category: 'flood',
            title: `${clean(s.title)}: ${danger ? 'above danger level' : 'above warning level'}`, titleNe: null,
            location: clean(s.title), district: '', lat: s.point ? s.point.coordinates[1] : null, lon: s.point ? s.point.coordinates[0] : null,
            time: iso(s.waterLevelOn), ends: null, active: true, kind: 'live',
            description: [`water level ${f(s.waterLevel)} m`, s.warningLevel != null && `warning ${f(s.warningLevel)} m`,
              s.dangerLevel != null && `danger ${f(s.dangerLevel)} m`, s.steady && String(s.steady).toLowerCase()].filter(Boolean).join(' · '),
            agency: 'Department of Hydrology and Meteorology',
            source: { name: 'DHM river gauge via BIPAD Portal', url: 'https://www.hydrology.gov.np/' },
          });
        });
      }
      sources.push({ key: 'rivers', name: 'DHM river gauges', url: 'https://www.hydrology.gov.np/', ok: rivers.status === 'fulfilled' });

      if (qk.status === 'fulfilled') {
        (qk.value.features || []).forEach((f) => {
          const p = f.properties || {}, c = (f.geometry || {}).coordinates || [];
          const d = c.length ? Math.round(km(KTM[0], KTM[1], c[1], c[0])) : null;
          items.push({
            id: 'usgs-' + f.id, level: quakeLevel(p.mag, d == null ? 9999 : d), category: 'earthquake',
            title: `M${(+p.mag).toFixed(1)} earthquake — ${clean(p.place)}`, titleNe: null, location: clean(p.place), district: '',
            lat: c[1], lon: c[0], time: iso(p.time), ends: null, active: now - p.time < 24 * 3600e3, kind: 'recent',
            description: [c[2] != null && `depth ${Math.round(c[2])} km`, d != null && `${d} km from Kathmandu`].filter(Boolean).join(' · '),
            mag: p.mag, agency: 'USGS', source: { name: 'USGS Earthquake Hazards Program', url: p.url || 'https://earthquake.usgs.gov/' },
          });
        });
      }
      sources.push({ key: 'usgs', name: 'USGS earthquakes', url: 'https://earthquake.usgs.gov/', ok: qk.status === 'fulfilled' });

      if (gd.status === 'fulfilled') {
        gd.value.forEach((f) => {
          const p = f.properties || {};
          const to = Date.parse(p.todate), from = Date.parse(p.fromdate);
          if (!(now - to < 30 * 864e5)) return;
          const lvl = { red: 'emergency', orange: 'warning' }[String(p.alertlevel).toLowerCase()] || 'info';
          const cat = { FL: 'flood', EQ: 'earthquake', TC: 'storm', DR: 'drought', WF: 'fire' }[p.eventtype] || 'other';
          items.push({
            id: 'gdacs-' + p.eventid, level: lvl, category: cat, title: `${clean(p.name || p.description)} (GDACS ${p.alertlevel} alert)`,
            titleNe: null, location: p.country || 'Nepal', district: '', lat: (f.geometry || {}).coordinates ? f.geometry.coordinates[1] : null,
            lon: (f.geometry || {}).coordinates ? f.geometry.coordinates[0] : null, time: iso(from), ends: iso(to),
            active: now - to < 48 * 3600e3, kind: 'reported',
            description: `Event period ${iso(from).slice(0, 10)} – ${iso(to).slice(0, 10)}`,
            agency: 'GDACS', source: { name: 'GDACS (UN / European Commission)', url: (p.url && p.url.report) || 'https://www.gdacs.org/' },
          });
        });
      }
      sources.push({ key: 'gdacs', name: 'GDACS', url: 'https://www.gdacs.org/', ok: gd.status === 'fulfilled' });

      if (sources.every((s) => !s.ok)) throw new Error('all alert sources failed');

      items.sort((a, b) => (b.active - a.active) || (LEVEL_RANK[b.level] - LEVEL_RANK[a.level]) || (Date.parse(b.time) - Date.parse(a.time)));
      const counts = { emergency: 0, warning: 0, advisory: 0, info: 0 };
      items.forEach((i) => { if (i.active) counts[i.level]++; });

      /* significant verified incidents, shown separately as "reported" */
      const SIG = new Set(['Landslide', 'Flood', 'Heavy Rainfall', 'Earthquake', 'Avalanche', 'Glacial lake outburst',
        'Inundation', 'Bridge Collapse', 'Wind Storm', 'Thunderbolt', 'Forest Fire', 'Fire', 'Snow Storm', 'Hailstorm']);
      const incidents = inc.status === 'fulfilled' ? inc.value
        .filter((x) => x.verified !== false && x.hazard && SIG.has(x.hazard.titleEn) && now - Date.parse(x.reportedOn || x.incidentOn) < 72 * 3600e3)
        .slice(0, 20)
        .map((x) => ({
          id: 'inc-' + x.id, hazard: x.hazard.titleEn, hazardNe: x.hazard.titleNe, title: clean(x.title), titleNe: clean(x.titleNe) || null,
          location: locOf(x.title), time: iso(x.reportedOn || x.incidentOn), kind: 'reported',
          lat: x.point ? x.point.coordinates[1] : null, lon: x.point ? x.point.coordinates[0] : null,
          source: { name: 'BIPAD Portal incident report', url: BIPAD.url },
        })) : [];

      return { items: items.slice(0, 80), counts, active: items.filter((i) => i.active).length, incidents, sources, fetchedAt: new Date().toISOString() };
    });
  }

  /* ------------------------------------------------------------------- roads */
  const ROAD_EN = /\b(highways?|roads?|landslides?|traffic|obstruct\w*|blocked|blockade|bus accident|jeep accident|vehicles?)\b/i;
  const ROAD_NE = /(राजमार्ग|सडक|पहिरो|यातायात|अवरुद्ध|सवारी|दुर्घटना)/;

  function roads() {
    return cached('roads', 300e3, async () => {
      const now = Date.now();
      const [al, news] = await Promise.allSettled([bipadAlerts(), P.newsNepal()]);
      if (al.status !== 'fulfilled' && news.status !== 'fulfilled') throw new Error('road sources failed');
      const seen = new Set(), closures = [], ended = [];
      (al.status === 'fulfilled' ? al.value : []).filter((a) => a.referenceType === 'road').forEach((a) => {
        const it = fromBipadAlert(a, now);
        if (seen.has(it.title)) return;
        seen.add(it.title);
        it.reason = (/due to\s+(.+?)\.?$/i.exec(it.description) || [])[1] || '';
        if (it.active) closures.push(it);
        else if (it.ends && now - Date.parse(it.ends) < 72 * 3600e3) ended.push(it);
      });
      const corridors = CORRIDORS.map((c) => {
        const ds = new Set(c.districts.map(normDistrict));
        const hits = closures.filter((x) => ds.has(normDistrict(x.district)));
        return { id: c.id, en: c.en, ne: c.ne, districts: c.districts, status: hits.length ? 'reported' : 'none', closures: hits.map((h) => h.id) };
      });
      const reported = news.status === 'fulfilled' ? (news.value.items || [])
        .filter((i) => now - (Date.parse(i.pubDate) || 0) < 48 * 3600e3 && (ROAD_EN.test(i.title) || ROAD_NE.test(i.title)))
        .slice(0, 12)
        .map((i) => ({ title: i.title, source: i.source, link: i.link, time: iso(i.pubDate), lang: i.lang, image: i.image, kind: 'reported' })) : [];
      return {
        closures, ended, corridors, reported, fetchedAt: new Date().toISOString(),
        sources: [
          { name: 'Department of Roads via BIPAD Portal', url: BIPAD.url, ok: al.status === 'fulfilled' },
          { name: 'Nepali news publishers', url: '/news', ok: news.status === 'fulfilled' },
        ],
      };
    });
  }

  /* -------------------------------------------------------------------- fuel */
  /* NOC "Retail Selling Price" table: effective date (BS and AD), time, then
     petrol, diesel, kerosene (Rs/litre), LPG (Rs/cylinder), ATF … */
  function fuel() {
    return cached('fuel', 6 * 3600e3, async () => {
      const r = await fetchURL('https://noc.org.np/retailprice');
      if (r.status >= 400) throw new Error('NOC HTTP ' + r.status);
      const table = (r.body.match(/<table[\s\S]*?<\/table>/i) || [])[0];
      if (!table) throw new Error('NOC price table not found');
      const rows = [];
      (table.match(/<tr[\s\S]*?<\/tr>/gi) || []).forEach((tr) => {
        const cells = (tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || []).map((c) => clean(c.replace(/<[^>]+>/g, ' ')));
        if (cells.length < 6) return;
        const ad = /(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})\s*\)?\s*$/.exec(cells[0].replace(/^.*\(/, ''));
        const bs = /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/.exec(cells[0]);
        const n = (s) => { const v = parseFloat(String(s).replace(/,/g, '')); return Number.isFinite(v) ? v : null; };
        if (!ad) return;
        rows.push({
          date: `${ad[1]}-${ad[2].padStart(2, '0')}-${ad[3].padStart(2, '0')}`,
          dateBs: bs ? `${bs[1]}-${bs[2].padStart(2, '0')}-${bs[3].padStart(2, '0')}` : null,
          time: cells[1], petrol: n(cells[2]), diesel: n(cells[3]), kerosene: n(cells[4]), lpg: n(cells[5]),
        });
      });
      if (!rows.length) throw new Error('no NOC price rows');
      rows.sort((a, b) => b.date.localeCompare(a.date));
      return {
        current: rows[0], previous: rows[1] || null, history: rows.slice(0, 24),
        source: { name: 'Nepal Oil Corporation — Retail Selling Price', url: 'https://noc.org.np/retailprice' },
        note: 'Prices as published by NOC; they can differ by depot and location.',
        fetchedAt: new Date().toISOString(),
      };
    });
  }

  /* --------------------------------------------------- air quality stations */
  function aqiStations() {
    return cached('aqi-stations', 600e3, async () => {
      const r = await bipad('pollution/?ordering=-date_time&limit=150');
      const now = Date.now(), latest = {};
      (r.results || []).forEach((p) => { const k = clean(p.title); if (k && !latest[k]) latest[k] = p; });
      const obs = (p, code) => { const o = (p.observation || []).find((x) => x.parameterCode === code); return o && o.data && o.data.value != null ? +(+o.data.value).toFixed(1) : null; };
      const stations = Object.values(latest)
        .filter((p) => p.aqi != null && now - Date.parse(p.dateTime) < 3 * 3600e3)
        .map((p) => ({
          name: clean(p.title), aqi: Math.round(p.aqi), color: p.aqiColor, pm25: obs(p, 'PM2.5_I'), pm10: obs(p, 'PM10_I'),
          time: iso(p.dateTime), lat: p.point ? p.point.coordinates[1] : null, lon: p.point ? p.point.coordinates[0] : null,
        }))
        .sort((a, b) => b.aqi - a.aqi);
      return { stations, source: { name: 'Department of Environment monitoring stations via BIPAD Portal', url: BIPAD.url }, fetchedAt: new Date().toISOString() };
    });
  }

  /* ---------------------------------------------------------------- trending */
  function termsOf(title) {
    const out = new Set();
    const t = String(title || '');
    if (/[ऀ-ॿ]/.test(t)) {
      const toks = t.split(/[\s।,.:;!?"'‘’“”()[\]{}—–\-|/]+/).map((w) => {
        for (const s of NE_SUFFIX) if (w.endsWith(s) && w.length - s.length >= 2) return w.slice(0, -s.length);
        return w;
      }).filter((w) => w.length >= 2 && !NE_STOP.has(w) && !/^[०-९0-9]+$/.test(w));
      toks.forEach((w) => out.add(w));
      for (let i = 0; i + 1 < toks.length; i++) out.add(toks[i] + ' ' + toks[i + 1]);
    } else {
      const toks = t.split(/[^A-Za-z0-9'’-]+/).map((w) => w.replace(/['’]s$/i, '').replace(/^[-']+|[-']+$/g, ''))
        .filter((w) => w.length >= 3 && !EN_STOP.has(w.toLowerCase()) && !/^\d+$/.test(w));
      toks.forEach((w) => out.add(w.toLowerCase()));
      for (let i = 0; i + 1 < toks.length; i++) out.add((toks[i] + ' ' + toks[i + 1]).toLowerCase());
    }
    return out;
  }
  function trending() {
    return cached('trending', 300e3, async () => {
      const news = await P.newsNepal();
      const now = Date.now();
      let hours = 24;
      let pool = news.items.filter((i) => now - (Date.parse(i.pubDate) || 0) < hours * 3600e3);
      if (pool.length < 15) { hours = 48; pool = news.items.filter((i) => now - (Date.parse(i.pubDate) || 0) < hours * 3600e3); }
      const map = new Map(), display = new Map();
      pool.forEach((it, idx) => {
        termsOf(it.title).forEach((term) => {
          if (!map.has(term)) map.set(term, { items: new Set(), sources: new Set() });
          const m = map.get(term);
          m.items.add(idx); m.sources.add(it.source);
        });
        /* remember how a term is actually written (case) for display */
        String(it.title).split(/\s+/).forEach((w) => { const k = w.toLowerCase().replace(/[^a-z0-9'’-]/g, ''); if (k && !display.has(k)) display.set(k, w.replace(/[^A-Za-z0-9'’-]/g, '')); });
      });
      let cands = [...map.entries()].filter(([, m]) => m.items.size >= 3 && m.sources.size >= 2)
        .map(([term, m]) => ({ term, n: m.items.size, s: m.sources.size, bigram: term.includes(' '), items: [...m.items] }));
      /* a single word swallowed by a two-word phrase with (almost) the same headlines is redundant */
      cands = cands.filter((c) => c.bigram || !cands.some((b) => b.bigram && b.term.split(' ').includes(c.term) && b.n >= c.n * 0.8));
      /* …and a phrase that is just a narrow slice of a much broader single word adds nothing */
      cands = cands.filter((b) => !b.bigram || !cands.some((c) => !c.bigram && b.term.split(' ').includes(c.term) && c.n >= b.n * 1.5));
      cands.sort((a, b) => (b.n + b.s * 0.5 + (b.bigram ? 1 : 0)) - (a.n + a.s * 0.5 + (a.bigram ? 1 : 0)));
      /* one topic per story: "reach ACC", "ACC Premier", "Cup final" from the same
         three headlines are a single trend, so keep only the best-scored term of
         any group whose headline sets largely overlap */
      const jac = (x, y) => { const a = new Set(x); const inter = y.filter((i) => a.has(i)).length; return inter / (x.length + y.length - inter); };
      const kept = [];
      cands.forEach((c) => { if (!kept.some((k) => jac(k.items, c.items) >= 0.6)) kept.push(c); });
      cands = kept;
      const pretty = (term) => (/[ऀ-ॿ]/.test(term) ? term : term.split(' ').map((w) => display.get(w) || w).join(' '));
      const topics = cands.slice(0, 14).map((c) => {
        const heads = c.items.map((i) => pool[i]).sort((a, b) => (Date.parse(b.pubDate) || 0) - (Date.parse(a.pubDate) || 0));
        const cat = {};
        heads.forEach((h) => { cat[h.topic || 'nepal'] = (cat[h.topic || 'nepal'] || 0) + 1; });
        return {
          term: pretty(c.term), lang: /[ऀ-ॿ]/.test(c.term) ? 'ne' : 'en', headlines: c.n, sources: c.s,
          category: Object.entries(cat).sort((a, b) => b[1] - a[1])[0][0],
          stories: heads.slice(0, 4).map((h) => ({ title: h.title, link: h.link, source: h.source, time: iso(h.pubDate), image: h.image || '' })),
        };
      });
      const byCategory = {};
      pool.forEach((i) => { byCategory[i.topic || 'nepal'] = (byCategory[i.topic || 'nepal'] || 0) + 1; });
      return {
        topics, byCategory, basis: { headlines: pool.length, sources: new Set(pool.map((i) => i.source)).size, hours },
        method: 'Terms that appear in at least 3 headlines from at least 2 different publishers in the period.',
        fetchedAt: new Date().toISOString(),
      };
    });
  }

  /* -------------------------------------------------------------- highlights */
  /* Facts only — each one is a value a source published, never a forecast. The
     page turns them into sentences in the reader's language. */
  function highlights() {
    return cached('highlights', 120e3, async () => {
      const [nepse, status, gold, fx, al, rd, aq, fu, tr] = await Promise.allSettled([
        P.nepse(), P.nepseStatus(), P.goldHP(), P.forex(), alerts(), roads(), aqiStations(), fuel(), trending(),
      ]);
      const out = [];
      const ok = (r) => r.status === 'fulfilled' && r.value;
      if (ok(nepse)) {
        const idx = (nepse.value.indices || []).find((i) => i.index === 'NEPSE Index');
        if (idx) out.push({ type: 'nepse', value: idx.currentValue, change: idx.change, pct: idx.perChange,
          open: ok(status) ? String(status.value.isOpen).toUpperCase() === 'OPEN' : null, href: '/money', source: 'NEPSE', time: nepse.value.fetchedAt });
      }
      if (ok(gold)) {
        const g = (gold.value.items || []).find((i) => String(i.symbol || i.name).toUpperCase().includes('HALMARK'));
        const t = g && (g.prices || []).find((p) => /tola/i.test(p.unit));
        if (t) out.push({ type: 'gold', price: t.price, change: t.prevPrice != null ? t.price - t.prevPrice : null, date: t.date, href: '/money', source: 'Hamro Patro / FEGOD' });
      }
      if (ok(fx) && fx.value.days && fx.value.days.length) {
        const d = fx.value.days, last = d[d.length - 1], prev = d[d.length - 2];
        const u = last.rates.USD;
        if (u) out.push({ type: 'usd', value: u.mid, change: prev && prev.rates.USD ? u.mid - prev.rates.USD.mid : null, date: last.date, href: '/money', source: 'Nepal Rastra Bank' });
      }
      if (ok(al)) {
        const top = al.value.items.find((i) => i.active);
        out.push({ type: 'alerts', active: al.value.active, counts: al.value.counts, top: top ? { title: top.title, titleNe: top.titleNe, level: top.level } : null, href: '/alerts', source: 'BIPAD · DHM · USGS · GDACS' });
        const q = al.value.items.find((i) => i.category === 'earthquake' && i.id.startsWith('usgs') && Date.now() - Date.parse(i.time) < 48 * 3600e3);
        if (q) out.push({ type: 'quake', mag: q.mag, place: q.location, time: q.time, href: '/alerts', source: 'USGS' });
      }
      if (ok(rd)) out.push({ type: 'roads', closures: rd.value.closures.length, top: rd.value.closures[0] ? rd.value.closures[0].location : null, href: '/roads', source: 'Department of Roads via BIPAD' });
      if (ok(aq) && aq.value.stations.length && aq.value.stations[0].aqi > 100) {
        const s = aq.value.stations[0];
        out.push({ type: 'aqi', station: s.name, aqi: s.aqi, time: s.time, href: '/weather', source: 'Department of Environment' });
      }
      if (ok(fu) && fu.value.previous) {
        const c = fu.value.current, p = fu.value.previous;
        out.push({ type: 'fuel', petrol: c.petrol, diesel: c.diesel, change: c.petrol - p.petrol, date: c.date, href: '/money', source: 'Nepal Oil Corporation' });
      }
      if (ok(tr) && tr.value.topics.length) {
        const t = tr.value.topics[0];
        out.push({ type: 'story', term: t.term, headlines: t.headlines, sources: t.sources, story: t.stories[0], href: '/trending', source: 'Nepali newsrooms' });
      }
      if (!out.length) throw new Error('no highlight sources');
      return { items: out, fetchedAt: new Date().toISOString() };
    });
  }

  /* ------------------------------------------------ multi-city weather & air */
  /* Open-Meteo accepts comma-separated coordinates, so every city costs one
     upstream request between them, not one each. */
  const MAIN = CITIES.slice(0, 14);
  const list = (k) => MAIN.map((c) => c[k]).join(',');
  function weatherCities() {
    return cached('weather-cities', 900e3, async () => {
      const url = 'https://api.open-meteo.com/v1/forecast'
        + `?latitude=${list('lat')}&longitude=${list('lon')}`
        + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m'
        + '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max'
        + '&timezone=Asia%2FKathmandu&forecast_days=1';
      const j = JSON.parse((await fetchURL(url)).body);
      if (!Array.isArray(j)) throw new Error((j && j.reason) || 'Open-Meteo multi-city error');
      return {
        cities: MAIN.map((c, i) => ({ ...c, current: j[i].current, today: j[i].daily && {
          max: j[i].daily.temperature_2m_max[0], min: j[i].daily.temperature_2m_min[0], rain: j[i].daily.precipitation_probability_max[0] } })),
        source: { name: 'Open-Meteo forecast model', url: 'https://open-meteo.com/' }, fetchedAt: new Date().toISOString(),
      };
    });
  }
  function airCities() {
    return cached('air-cities', 900e3, async () => {
      const url = 'https://air-quality-api.open-meteo.com/v1/air-quality'
        + `?latitude=${list('lat')}&longitude=${list('lon')}&current=us_aqi,pm2_5,pm10&timezone=Asia%2FKathmandu`;
      const j = JSON.parse((await fetchURL(url)).body);
      if (!Array.isArray(j)) throw new Error((j && j.reason) || 'Open-Meteo multi-city air error');
      return {
        cities: MAIN.map((c, i) => ({ ...c, current: j[i].current })),
        source: { name: 'Open-Meteo air-quality model (CAMS)', url: 'https://open-meteo.com/' }, fetchedAt: new Date().toISOString(),
      };
    });
  }

  /* ------------------------------------------------------------------ jobs */
  /* merojob.com's public listings API. Nepal Live only lists and links back:
     "Apply Now" always opens the job on merojob. Descriptions arrive as HTML
     and are reduced to plain text here, so nothing from the feed is ever
     injected into the page as markup. */
  const decode = (s) => String(s || '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&#(\d+);/g, (_, d) => { const c = +d; return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ''; });
  const htmlText = (h) => decode(String(h || '').replace(/<\s*br\s*\/?>/gi, '\n').replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|h\d|ul|ol|tr)>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  const JOB_CATS = [
    ['it', /IT & Telecommunication|Programmer|Software|Cloud Computing|Database|ERP|Data analysis|Network/i, /developer|software|\bIT\b|devops|programmer|web |network|system admin/i],
    ['banking', /Banking|Insurance|Financial|Credit|Investment|Cash Management|Accounting|Finance|Accounts|Audit|Book keeping|Tax/i, /bank|finance|account/i],
    ['hospitality', /Hospitality|Restaurant|Food and Beverage|Travel|Tour/i, /hotel|chef|waiter|restaurant|housekeeping/i],
    ['education', /Teaching|Education|Lecturer|Montessori|Teacher|ECA|School|Early childhood/i, /teacher|lecturer|instructor|tutor/i],
    ['engineering', /Engineering|Architect|Civil|Electrical|Hydropower|Geotechnical|Survey|CAD|Construction/i, /engineer|architect|technician|surveyor/i],
    ['healthcare', /Healthcare|Medical|Nurse|Pharma|Pathologist|Health Care|Lab operator/i, /nurse|doctor|pharmac|medical|health/i],
    ['marketing', /Marketing|Advertising|Branding|Sales|Brand|Business Development|Customer/i, /marketing|sales|brand|business development/i],
  ];
  const JOB_LOCS = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan', 'Biratnagar', 'Butwal', 'Birgunj', 'Nepalgunj', 'Dhangadhi', 'Itahari', 'Dharan', 'Hetauda', 'Janakpur'];
  const locOfJob = (addr) => {
    const a = String(addr || '');
    if (/remote|work from home/i.test(a)) return 'Remote';
    if (/Bharatpur|Chitwan|Narayan?garh/i.test(a)) return 'Chitwan';
    return JOB_LOCS.find((l) => new RegExp('\\b' + l + '\\b', 'i').test(a)) || 'Other';
  };
  function jobsAll() {
    return cached('jobs', 1800e3, async () => {
      const raw = [];
      for (let page = 1; page <= 5; page++) {
        const r = await json(`https://api.merojob.com/api/v1/jobs/?page=${page}&page_size=100`);
        raw.push(...(r.results || []));
        if (!r.next) break;
      }
      if (!raw.length) throw new Error('no jobs from merojob');
      const now = Date.now();
      const items = raw.filter((j) => !j.deadline || Date.parse(j.deadline) > now).map((j) => {
        const cats = j.categories || [];
        const addr = (j.job_locations || []).map((l) => l.address || l.name).filter(Boolean).join(' · ');
        const type = (j.available_for || [])[0] || '';
        const text = `${j.title} ${addr}`;
        const tags = JOB_CATS.filter(([, c, t]) => cats.some((x) => c.test(x)) || t.test(j.title)).map(([k]) => k);
        if (/Traineeship|Intern/i.test(type) || /intern/i.test(j.title)) tags.push('internship');
        if (/Part Time|Freelance/i.test(type)) tags.push('part-time');
        if (/remote|work from home/i.test(text)) tags.push('remote');
        const sal = j.offered_salary;
        const logo = (j.logo && j.logo.url) || (j.client && j.client.client_image) || '';
        return {
          id: j.id, title: clean(j.title), company: j.hide_org_name ? null : clean(j.client && (j.client.org_name || j.client.client_name)),
          logo: logo ? (/^https?:/.test(logo) ? logo : 'https://api.merojob.com' + logo) : '',
          location: addr, city: locOfJob(addr), type, level: j.job_level || '', categories: cats.slice(0, 3), tags,
          salary: !j.hide_salary && sal && (sal.minimum || sal.maximum) ? { min: sal.minimum, max: sal.maximum, currency: sal.currency || 'NRs', unit: sal.unit || '' } : null,
          deadline: iso(j.deadline), posted: iso(j.posted_at || j.posted_date), experience: j.experience_required || '', vacancies: j.vacancies || null,
          summary: clean(j.job_summary).slice(0, 320), url: 'https://merojob.com' + (j.absolute_url || `/${j.slug}/`),
        };
      });
      const detail = {};
      raw.forEach((j) => {
        detail[j.id] = {
          description: htmlText(j.description).slice(0, 4000), requirements: htmlText(j.specification).slice(0, 3000),
          skills: (j.skills || []).slice(0, 20), education: [j.education_level, htmlText(j.education_description)].filter(Boolean).join(' — ').slice(0, 400),
        };
      });
      return { items, detail, fetchedAt: new Date().toISOString() };
    });
  }
  const JOB_TAGS = ['it', 'banking', 'hospitality', 'education', 'engineering', 'healthcare', 'marketing', 'government', 'internship', 'part-time', 'remote'];
  async function jobs(q) {
    const all = await jobsAll();
    const needle = String(q.q || '').trim().toLowerCase();
    const base = all.items.filter((j) => (!needle || `${j.title} ${j.company || ''} ${j.location} ${j.categories.join(' ')}`.toLowerCase().includes(needle))
      && (!q.loc || j.city === q.loc) && (!q.type || j.type === q.type));
    const facets = { tags: {}, cities: {}, types: {} };
    base.forEach((j) => { j.tags.forEach((t) => { facets.tags[t] = (facets.tags[t] || 0) + 1; }); });
    all.items.forEach((j) => { facets.cities[j.city] = (facets.cities[j.city] || 0) + 1; if (j.type) facets.types[j.type] = (facets.types[j.type] || 0) + 1; });
    let list = q.cat ? base.filter((j) => j.tags.includes(q.cat)) : base;
    list = list.slice().sort(q.sort === 'deadline'
      ? (a, b) => (Date.parse(a.deadline) || 9e15) - (Date.parse(b.deadline) || 9e15)
      : (a, b) => (Date.parse(b.posted) || 0) - (Date.parse(a.posted) || 0));
    const per = 20, page = Math.max(1, parseInt(q.page, 10) || 1);
    return {
      items: list.slice((page - 1) * per, page * per), total: list.length, page, pages: Math.max(1, Math.ceil(list.length / per)),
      facets, tags: JOB_TAGS, all: all.items.length, fetchedAt: all.fetchedAt,
      source: { name: 'merojob.com', url: 'https://merojob.com/' },
    };
  }
  async function job(id) {
    const all = await jobsAll();
    const j = all.items.find((x) => String(x.id) === String(id));
    if (!j) { const err = new Error('job not found or no longer open'); err.status = 404; throw err; }
    return { ...j, ...all.detail[j.id] };
  }

  /* -------------------------------------------------------------- calendar */
  /* Hamro Patro's calendar pages (Next.js payload): each BS month page carries
     the previous, requested and next months with AD dates, public holidays,
     festivals and national days. "Today" is always worked out here in Nepal
     Time — never taken from the cached page. */
  const pad = (n) => String(n).padStart(2, '0');
  const nptISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' }).format(new Date());
  const nextBlob = (html) => [...html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)]
    .map((m) => { try { return JSON.parse('"' + m[1] + '"'); } catch (e) { return ''; } }).join('');
  function monthsIn(blob) {
    const out = [];
    let idx = 0;
    while ((idx = blob.indexOf('{"yearBs":', idx)) >= 0) {
      let depth = 0, end = -1;
      for (let k = idx; k < blob.length; k++) {
        const ch = blob[k];
        if (ch === '"') { k++; while (k < blob.length && blob[k] !== '"') { if (blob[k] === '\\') k++; k++; } continue; }
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (!depth) { end = k + 1; break; } }
      }
      if (end < 0) break;
      try { const m = JSON.parse(blob.slice(idx, end)); if (m.days && m.monthBs) out.push(m); } catch (e) { /* skip */ }
      idx = end;
    }
    return out;
  }
  const normDay = (d) => {
    const pe = d.patroEvent || {};
    return {
      ad: `${d.year_ad}-${pad(d.month_ad)}-${pad(d.day_ad)}`, bs: [d.year_bs, d.month_bs, d.day_bs], bsNp: d.dayBsNp, adNp: d.dayAdNp,
      dow: d.dayOfWeek, inMonth: !!d.inMonth, weekend: !!d.isWeekendHoliday,
      holiday: !!((d.isHoliday && !d.isWeekendHoliday) || pe.isHoliday), tithi: d.tithiShort || '',
      /* "restricted": a holiday for some groups only — the qualifier is often
         only in the Nepali title, e.g. "(महिला कर्मचारीहरूलाई मात्र)" */
      events: (pe.items || []).map((x) => ({
        en: clean(x.titleEn), np: clean(x.titleNp), holiday: !!x.isHoliday,
        restricted: !!x.isHoliday && /मात्र|\bonly\b/i.test(`${x.titleNp} ${x.titleEn}`),
      })).filter((x) => x.en || x.np),
      image: pe.image || '', link: pe.articleUrlEn || pe.articleUrlNp || '',
    };
  };
  const normMonth = (m) => ({
    yearBs: m.yearBs, monthBs: m.monthBs, nameEn: m.monthNameEn, nameNp: m.monthNameNp, yearBsNp: m.yearBsNp, daysInMonth: m.daysInMonth,
    days: (m.days || []).map(normDay),
  });
  function hpMonths(y, m) {
    return cached(`hp-cal:${y}:${m}`, 12 * 3600e3, async () => {
      const r = await fetchURL(`https://www.hamropatro.com/calendar/${y}/${m}`);
      if (r.status >= 400) throw new Error('Hamro Patro HTTP ' + r.status);
      const months = monthsIn(nextBlob(r.body)).map(normMonth);
      if (!months.some((x) => x.yearBs === y && x.monthBs === m)) throw new Error('month not found in Hamro Patro page');
      return months;
    });
  }
  const bsShift = (y, m, d) => { m += d; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return [y, m]; };
  /* BS month that contains the 1st of an AD month (Baisakh starts mid-April) */
  const bsForAd = (y, m) => (m - 4 > 0 ? [y + 57, m - 4] : [y + 56, m + 8]);
  const CAL_SRC = { name: 'Hamro Patro calendar', url: 'https://www.hamropatro.com/calendar' };

  async function calendarBs(y, m) {
    const months = await hpMonths(y, m);
    const month = months.find((x) => x.yearBs === y && x.monthBs === m);
    const today = nptISO();
    return { mode: 'bs', ...month, today, prev: bsShift(y, m, -1), next: bsShift(y, m, 1), source: CAL_SRC };
  }
  async function calendarAd(y, m) {
    const key = `${y}-${pad(m)}`;
    const [by, bm] = bsForAd(y, m);
    const seen = new Map();
    const add = (months) => months.forEach((mo) => mo.days.forEach((d) => { if (d.inMonth && d.ad.startsWith(key)) seen.set(d.ad, { ...d, monthNameEn: mo.nameEn, monthNameNp: mo.nameNp }); }));
    add(await hpMonths(by, bm));
    const need = new Date(Date.UTC(y, m, 0)).getUTCDate();
    if (seen.size < need) { const [ny, nm] = bsShift(by, bm, 2); add(await hpMonths(ny, nm)); }
    const days = [...seen.values()].sort((a, b) => a.ad.localeCompare(b.ad));
    return { mode: 'ad', year: y, month: m, days, today: nptISO(), source: CAL_SRC };
  }
  async function calendarToday() {
    const today = nptISO();
    const [y, m] = today.split('-').map(Number);
    const cal = await calendarAd(y, m);
    const d = cal.days.find((x) => x.ad === today);
    if (!d) throw new Error('today not found in calendar');
    return { today, day: d, source: CAL_SRC };
  }
  async function calendarUpcoming(days = 60) {
    const today = nptISO();
    const end = new Date(Date.parse(today) + days * 864e5).toISOString().slice(0, 10);
    const [y, m] = today.split('-').map(Number);
    const [by, bm] = bsForAd(y, m);
    const [ny, nm] = bsShift(by, bm, 2);
    const months = (await Promise.all([hpMonths(by, bm), hpMonths(ny, nm).catch(() => [])])).flat();
    const seen = new Map();
    months.forEach((mo) => mo.days.forEach((d) => {
      if (d.inMonth && d.ad >= today && d.ad <= end && (d.events.length || d.holiday)) seen.set(d.ad, { ...d, monthNameEn: mo.nameEn, monthNameNp: mo.nameNp });
    }));
    return { today, items: [...seen.values()].sort((a, b) => a.ad.localeCompare(b.ad)), source: CAL_SRC, fetchedAt: new Date().toISOString() };
  }

  /* ---------------------------------------------------------------- events */
  /* Only events a reliable source lists: festivals, public holidays and
     national/international days (Hamro Patro calendar) and Nepal national-team
     fixtures (TheSportsDB). No verified public feed exists yet for concerts,
     exhibitions, tech events, conferences, job fairs or community events. */
  const EVENT_CITIES = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan'];
  /* Not wrapped in cached(): both inputs are cached upstream (calendar months
     12 h, TheSportsDB per its queue), and fixtures still being fetched after a
     restart must show up as soon as they land rather than 30 minutes later. */
  function events() {
    return (async () => {
      const [cal, np] = await Promise.allSettled([calendarUpcoming(60), P.nepalSports()]);
      if (cal.status !== 'fulfilled' && np.status !== 'fulfilled') throw new Error('event sources failed');
      const items = [];
      if (cal.status === 'fulfilled') cal.value.items.forEach((d) => {
        d.events.forEach((e, i) => items.push({
          id: `cal-${d.ad}-${i}`, title: e.en || e.np, titleNe: e.np || null, restricted: !!e.restricted,
          category: e.holiday || (d.holiday && i === 0) ? 'holiday' : /\b(day|week)\b|di[wv]as|dibas/i.test(e.en) || /दिवस/.test(e.np) ? 'day' : 'festival',
          date: d.ad, dateBs: d.bs, bsNp: d.bsNp, monthNameEn: d.monthNameEn, monthNameNp: d.monthNameNp, allDay: true,
          location: null, city: null, image: i === 0 ? d.image : '', link: d.link || CAL_SRC.url, source: CAL_SRC,
        }));
      });
      if (np.status === 'fulfilled') {
        const today = nptISO();
        np.value.fixtures.filter((e) => (e.dateEvent || '') >= today).forEach((e) => {
          const venue = [e.strVenue, e.strCity].filter(Boolean).join(', ');
          items.push({
            id: 'sdb-' + e.idEvent, title: e.strEvent || `${e.strHomeTeam} vs ${e.strAwayTeam}`, titleNe: null, category: 'sports',
            date: e.dateEvent, time: e.strTimestamp ? iso(String(e.strTimestamp).replace(' ', 'T') + 'Z') : null, allDay: !e.strTimestamp,
            location: venue || null, city: EVENT_CITIES.find((c) => new RegExp('\\b' + c + '\\b', 'i').test(venue)) || (venue ? 'Other' : null),
            league: e.strLeague || '', image: e.strThumb || '', link: 'https://www.thesportsdb.com/event/' + e.idEvent,
            source: { name: 'TheSportsDB', url: 'https://www.thesportsdb.com/' },
          });
        });
      }
      items.sort((a, b) => a.date.localeCompare(b.date));
      return {
        items, fetchedAt: new Date().toISOString(), today: nptISO(), pending: np.status === 'fulfilled' ? np.value.pending || 0 : 0,
        unavailable: ['concerts', 'exhibitions', 'tech', 'conferences', 'jobfairs', 'community'],
        sources: [{ ...CAL_SRC, ok: cal.status === 'fulfilled' }, { name: 'TheSportsDB', url: 'https://www.thesportsdb.com/', ok: np.status === 'fulfilled' }],
      };
    })();
  }

  return { alerts, roads, fuel, aqiStations, trending, highlights, weatherCities, airCities, jobs, job, jobsAll,
    calendarBs, calendarAd, calendarToday, calendarUpcoming, events, CITIES, CORRIDORS, km, KTM };
};

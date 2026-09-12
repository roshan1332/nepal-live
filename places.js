'use strict';
/*
 * Nepal's 7 provinces for the server: districts (from nepal-map.js, the same
 * geometry the Explore map draws), district names in Nepali, the capital, the
 * city whose forecast stands in for the province, and the official provincial
 * government site (Office of the Chief Minister and Council of Ministers —
 * each URL checked to load).
 *
 * provinceOf(text) tags a headline with the province whose places it names.
 * Names that would mislead are left out: "Parbat" in Nepali (पर्वत is also
 * "mountain"), bare "Nawalparasi"/"Rukum" (each spans two provinces).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadMap() {
  const w = {};
  const ctx = { window: w, self: w, document: {} };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'nepal-map.js'), 'utf8'), ctx);
  return w.NL.map.provinces.map((p) => ({ id: p.id, en: p.en, ne: p.ne, districts: p.districts.slice() }));
}

const DISTRICT_NE = {
  Taplejung: 'ताप्लेजुङ', Panchthar: 'पाँचथर', Ilam: 'इलाम', Jhapa: 'झापा', Morang: 'मोरङ', Sunsari: 'सुनसरी',
  Dhankuta: 'धनकुटा', Terhathum: 'तेह्रथुम', Sankhuwasabha: 'सङ्खुवासभा', Bhojpur: 'भोजपुर', Solukhumbu: 'सोलुखुम्बु',
  Okhaldhunga: 'ओखलढुङ्गा', Khotang: 'खोटाङ', Udayapur: 'उदयपुर',
  Saptari: 'सप्तरी', Siraha: 'सिरहा', Dhanusha: 'धनुषा', Mahottari: 'महोत्तरी', Sarlahi: 'सर्लाही', Rautahat: 'रौतहट',
  Bara: 'बारा', Parsa: 'पर्सा',
  Dolakha: 'दोलखा', Sindhupalchok: 'सिन्धुपाल्चोक', Rasuwa: 'रसुवा', Dhading: 'धादिङ', Nuwakot: 'नुवाकोट',
  Kathmandu: 'काठमाडौं', Bhaktapur: 'भक्तपुर', Lalitpur: 'ललितपुर', Kavrepalanchok: 'काभ्रेपलाञ्चोक', Ramechhap: 'रामेछाप',
  Sindhuli: 'सिन्धुली', Makwanpur: 'मकवानपुर', Chitwan: 'चितवन',
  Gorkha: 'गोरखा', Manang: 'मनाङ', Mustang: 'मुस्ताङ', Myagdi: 'म्याग्दी', Kaski: 'कास्की', Lamjung: 'लमजुङ',
  Tanahun: 'तनहुँ', 'Nawalparasi East': 'नवलपुर', Syangja: 'स्याङ्जा', Parbat: 'पर्वत', Baglung: 'बागलुङ',
  'Rukum East': 'रुकुम पूर्व', Rolpa: 'रोल्पा', Pyuthan: 'प्युठान', Gulmi: 'गुल्मी', Arghakhanchi: 'अर्घाखाँची', Palpa: 'पाल्पा',
  'Nawalparasi West': 'परासी', Rupandehi: 'रुपन्देही', Kapilvastu: 'कपिलवस्तु', Dang: 'दाङ', Banke: 'बाँके', Bardiya: 'बर्दिया',
  Dolpa: 'डोल्पा', Mugu: 'मुगु', Humla: 'हुम्ला', Jumla: 'जुम्ला', Kalikot: 'कालिकोट', Dailekh: 'दैलेख', Jajarkot: 'जाजरकोट',
  'Rukum West': 'रुकुम पश्चिम', Salyan: 'सल्यान', Surkhet: 'सुर्खेत',
  Bajura: 'बाजुरा', Bajhang: 'बझाङ', Darchula: 'दार्चुला', Baitadi: 'बैतडी', Dadeldhura: 'डडेल्धुरा', Doti: 'डोटी',
  Achham: 'अछाम', Kailali: 'कैलाली', Kanchanpur: 'कञ्चनपुर',
};
/* spelling variants Nepali newsrooms use */
const NE_VARIANTS = { Kathmandu: ['काठमाडौँ'], Sankhuwasabha: ['संखुवासभा'], Okhaldhunga: ['ओखलढुंगा'], Syangja: ['स्याङजा'],
  Kavrepalanchok: ['काभ्रे'], Kanchanpur: ['कन्चनपुर'] };
/* English tokens that match: the district name, plus unambiguous alternates */
const EN_VARIANTS = { 'Nawalparasi East': ['Nawalpur'], 'Nawalparasi West': ['Parasi'], Kavrepalanchok: ['Kavre', 'Kabhre'],
  Sindhupalchok: ['Sindhupalchowk'], Makwanpur: ['Makawanpur'], Dhanusha: ['Dhanusa'], Chitwan: ['Chitawan'] };
const SKIP_NE = new Set(['Parbat']);

const INFO = {
  NP01: { capital: ['Biratnagar', 'विराटनगर'], city: 'biratnagar', url: 'https://ocmcm.koshi.gov.np/' },
  NP02: { capital: ['Janakpurdham', 'जनकपुरधाम'], city: 'janakpur', url: 'https://ocmcm.madhesh.gov.np/' },
  NP03: { capital: ['Hetauda', 'हेटौंडा'], city: 'hetauda', url: 'https://ocmcm.bagamati.gov.np/' },
  NP04: { capital: ['Pokhara', 'पोखरा'], city: 'pokhara', url: 'https://ocmcm.gandaki.gov.np/' },
  NP05: { capital: ['Rapti Valley (Deukhuri), Dang', 'राप्ती उपत्यका (देउखुरी), दाङ'], city: 'ghorahi', url: 'https://ocmcm.lumbini.gov.np/' },
  NP06: { capital: ['Birendranagar', 'वीरेन्द्रनगर'], city: 'birendranagar', url: 'https://ocmcm.karnali.gov.np/' },
  NP07: { capital: ['Dhangadhi', 'धनगढी'], city: 'dhangadhi', url: 'https://ocmcm.sudurpashchim.gov.np/' },
};

module.exports = function init({ CITIES }) {
  const byCity = new Map(CITIES.map((c) => [c.id, c]));
  const PROVINCES = loadMap().map((p) => {
    const info = INFO[p.id] || {};
    const c = byCity.get(info.city);
    return {
      id: p.id, en: p.en, ne: p.ne,
      capital: info.capital ? { en: info.capital[0], ne: info.capital[1] } : null,
      city: c ? { id: c.id, en: c.en, ne: c.ne, lat: c.lat, lon: c.lon } : null,
      url: info.url || '',
      districts: p.districts.map((d) => ({ en: d, ne: DISTRICT_NE[d] || '' })),
    };
  });
  const byEn = new Map(PROVINCES.map((p) => [p.en.toLowerCase(), p]));
  const byId = new Map(PROVINCES.map((p) => [p.id, p]));

  /* every place token → province id */
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const enTerms = [], neTerms = [];
  PROVINCES.forEach((p) => {
    enTerms.push([p.en, p.id]); neTerms.push([p.ne, p.id]);
    p.districts.forEach((d) => {
      if (!/ (East|West)$/.test(d.en)) enTerms.push([d.en, p.id]);
      (EN_VARIANTS[d.en] || []).forEach((v) => enTerms.push([v, p.id]));
      if (d.ne && !SKIP_NE.has(d.en)) neTerms.push([d.ne, p.id]);
      (NE_VARIANTS[d.en] || []).forEach((v) => neTerms.push([v, p.id]));
    });
  });
  CITIES.forEach((c) => {
    const p = byEn.get(String(c.province).toLowerCase());
    if (!p) return;
    enTerms.push([c.en, p.id]); if (c.ne) neTerms.push([c.ne, p.id]);
  });
  const enRes = enTerms.map(([t, id]) => [new RegExp('\\b' + esc(t) + '\\b', 'i'), id]);

  /* the province whose places the text names most (first mention breaks ties) */
  function provinceOf(text) {
    const s = String(text || '');
    if (!s) return '';
    const score = new Map();
    const hit = (id, at) => { const v = score.get(id) || { n: 0, at: Infinity }; v.n++; v.at = Math.min(v.at, at); score.set(id, v); };
    enRes.forEach(([re, id]) => { const m = re.exec(s); if (m) hit(id, m.index); });
    neTerms.forEach(([t, id]) => { const i = s.indexOf(t); if (i >= 0) hit(id, i); });
    let best = '', bv = null;
    score.forEach((v, id) => { if (!bv || v.n > bv.n || (v.n === bv.n && v.at < bv.at)) { best = id; bv = v; } });
    return best;
  }
  /* district name (English, as agencies publish it) → province id */
  const districtIdx = new Map();
  PROVINCES.forEach((p) => p.districts.forEach((d) => districtIdx.set(d.en.toLowerCase().replace(/[^a-z]/g, ''), p.id)));
  const provinceOfDistrict = (d) => districtIdx.get(String(d || '').toLowerCase().replace(/[^a-z]/g, '')) || '';
  const provinceOfName = (name) => { const p = byEn.get(String(name || '').toLowerCase()); return p ? p.id : ''; };

  return { PROVINCES, byId, provinceOf, provinceOfDistrict, provinceOfName };
};

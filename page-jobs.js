/*
 * Nepal Jobs (/jobs). Data: /api/jobs and /api/job (merojob.com listings,
 * reduced to plain text server-side). "Apply Now" opens the original listing.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc;

  NL.i18n.add({
    en: {
      kicker: 'Nepal Jobs', h1: 'Jobs in <em>Nepal</em>', sub: 'Current vacancies from merojob.com. Apply on the original listing — Nepal Live is not the employer.',
      jobPh: 'Search jobs, companies, skills…', sortNew: 'Newest first', sortDeadline: 'Deadline soonest', allCities: 'All cities', allTypes: 'All types',
      c_all: 'All', c_it: 'IT', c_banking: 'Banking & finance', c_hospitality: 'Hospitality', c_education: 'Education', c_engineering: 'Engineering',
      c_healthcare: 'Healthcare', c_marketing: 'Marketing & sales', c_government: 'Government', c_internship: 'Internship', 'c_part-time': 'Part-time', c_remote: 'Remote',
      count: '{n} of {all} open vacancies', details: 'Details', hide: 'Hide details', apply: 'Apply Now', via: 'via merojob',
      salaryND: 'Salary not disclosed', perMonth: 'per month', deadline: 'Apply by {d}', daysLeft: '{n} days left', lastDay: 'Last day', posted: 'Posted {ago}',
      vacancies: '{n} vacancies', experience: 'Experience', description: 'Job description', requirements: 'Requirements', skills: 'Skills', education: 'Education',
      showMore: 'Show more jobs', none: 'No open jobs match these filters.', clear: 'Clear filters', err: 'Job listings aren’t available right now.',
      govEmpty: 'merojob lists private-sector and NGO jobs. Government vacancies are published by the Public Service Commission (Lok Sewa).', govLink: 'psc.gov.np',
      jobsNote: 'Listings come from <a href="https://merojob.com/" target="_blank" rel="noopener noreferrer">merojob.com</a>, updated every 30 minutes. Nepal Live is not the employer and does not handle applications — “Apply Now” opens the original listing. Government vacancies are published by the <a href="https://psc.gov.np/" target="_blank" rel="noopener noreferrer">Public Service Commission (Lok Sewa)</a>.'
    },
    ne: {
      kicker: 'नेपालका जागिर', h1: 'नेपालमा <em>जागिर</em>', sub: 'merojob.com का हालका रिक्त पद। मूल सूचीमै आवेदन दिनुहोस् — नेपाल लाइभ रोजगारदाता होइन।',
      jobPh: 'जागिर, कम्पनी, सीप खोज्नुहोस्…', sortNew: 'नयाँ पहिले', sortDeadline: 'म्याद नजिक पहिले', allCities: 'सबै सहर', allTypes: 'सबै प्रकार',
      c_all: 'सबै', c_it: 'आईटी', c_banking: 'बैंकिङ र वित्त', c_hospitality: 'होटल/आतिथ्य', c_education: 'शिक्षा', c_engineering: 'इन्जिनियरिङ',
      c_healthcare: 'स्वास्थ्य', c_marketing: 'मार्केटिङ र बिक्री', c_government: 'सरकारी', c_internship: 'इन्टर्नसिप', 'c_part-time': 'पार्ट-टाइम', c_remote: 'रिमोट',
      count: '{all} खुला पदमध्ये {n}', details: 'विवरण', hide: 'विवरण लुकाउनुहोस्', apply: 'आवेदन दिनुहोस्', via: 'merojob मार्फत',
      salaryND: 'तलब खुलाइएको छैन', perMonth: 'प्रति महिना', deadline: '{d} सम्म आवेदन', daysLeft: '{n} दिन बाँकी', lastDay: 'अन्तिम दिन', posted: '{ago} प्रकाशित',
      vacancies: '{n} पद', experience: 'अनुभव', description: 'कामको विवरण', requirements: 'योग्यता', skills: 'सीप', education: 'शिक्षा',
      showMore: 'थप जागिर', none: 'यी फिल्टरमा कुनै खुला जागिर छैन।', clear: 'फिल्टर हटाउनुहोस्', err: 'जागिरको सूची अहिले उपलब्ध छैन।',
      govEmpty: 'merojob मा निजी क्षेत्र र गैरसरकारी संस्थाका जागिर हुन्छन्। सरकारी पदका विज्ञापन लोक सेवा आयोगले प्रकाशन गर्छ।', govLink: 'psc.gov.np',
      jobsNote: 'सूची <a href="https://merojob.com/" target="_blank" rel="noopener noreferrer">merojob.com</a> बाट, हरेक ३० मिनेटमा अपडेट। नेपाल लाइभ रोजगारदाता होइन र आवेदन लिँदैन — “आवेदन” ले मूल सूची खोल्छ। सरकारी पदका विज्ञापन <a href="https://psc.gov.np/" target="_blank" rel="noopener noreferrer">लोक सेवा आयोग</a> ले प्रकाशन गर्छ।'
    }
  });

  NL.i18n.apply();

  var qs = new URLSearchParams(location.search);
  var S = { q: qs.get('q') || '', cat: qs.get('cat') || '', loc: qs.get('loc') || '', type: qs.get('type') || '', sort: qs.get('sort') || '', page: 1, items: [], data: null, open: {} };
  $('job-q').value = S.q;
  $('job-sort').value = S.sort;

  function syncURL() {
    var p = new URLSearchParams();
    ['q', 'cat', 'loc', 'type', 'sort'].forEach(function (k) { if (S[k]) p.set(k, S[k]); });
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
  }
  var dayMs = 864e5;
  function card(j) {
    var dl = Date.parse(j.deadline), left = isFinite(dl) ? Math.ceil((dl - Date.now()) / dayMs) : null;
    var sal = j.salary ? (j.salary.currency + ' ' + NL.fmt(j.salary.min || 0, 0) + (j.salary.max && j.salary.max !== j.salary.min ? '–' + NL.fmt(j.salary.max, 0) : '')
      + (/month/i.test(j.salary.unit) ? ' ' + t('perMonth') : j.salary.unit ? ' / ' + j.salary.unit : '')) : t('salaryND');
    return '<article class="job-card" data-job="' + j.id + '">'
      + '<div class="jc-top">' + (j.logo ? '<span class="jc-logo"><img src="' + esc(j.logo) + '" alt="" loading="lazy" decoding="async" onerror="this.parentNode.remove()"></span>' : '')
      + '<div class="jc-h"><h3 class="jc-title">' + esc(j.title) + '</h3><span class="jc-co">' + esc(j.company || '—') + '</span></div></div>'
      + '<ul class="jc-facts">'
      + (j.location ? '<li>' + esc(j.location) + '</li>' : '') + (j.type ? '<li>' + esc(j.type) + '</li>' : '') + (j.level ? '<li>' + esc(j.level) + '</li>' : '')
      + '<li class="' + (j.salary ? 'sal' : 'muted') + '">' + esc(sal) + '</li></ul>'
      + (j.summary ? '<p class="jc-sum">' + esc(j.summary) + '</p>' : '')
      + '<div class="jc-tags">' + j.categories.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div>'
      + '<div class="jc-foot"><span class="jc-dl' + (left != null && left <= 3 ? ' soon' : '') + '">' + (isFinite(dl) ? esc(t('deadline', { d: NL.dfmt.day(dl) })) + ' · ' + esc(left <= 0 ? t('lastDay') : t('daysLeft', { n: left })) : '') + '</span>'
      + '<span class="muted">' + esc(t('posted', { ago: NL.ago(Date.parse(j.posted)) })) + ' · ' + esc(t('via')) + '</span>'
      + '<span class="jc-actions">' + NL.saveBtn({ type: 'job', id: String(j.id), title: j.title, url: j.url, sub: [j.company, j.location].filter(Boolean).join(' · '), img: j.logo })
      + '<button class="btn" type="button" data-details="' + j.id + '" aria-expanded="' + !!S.open[j.id] + '">' + esc(S.open[j.id] ? t('hide') : t('details')) + '</button>'
      + '<a class="btn btn-primary" href="' + esc(j.url) + '" target="_blank" rel="noopener noreferrer">' + esc(t('apply')) + ' <span aria-hidden="true">↗</span></a></span></div>'
      + '<div class="jc-detail" id="jd-' + j.id + '"' + (S.open[j.id] ? '' : ' hidden') + '>' + (S.open[j.id] && S.open[j.id].description !== undefined ? detailHTML(S.open[j.id]) : '') + '</div>'
      + '</article>';
  }
  function detailHTML(d) {
    var block = function (k, v) { return v ? '<h4>' + esc(t(k)) + '</h4><p class="pre">' + esc(v) + '</p>' : ''; };
    return (d.vacancies ? '<p class="muted small">' + esc(t('vacancies', { n: d.vacancies })) + (d.experience ? ' · ' + esc(t('experience')) + ': ' + esc(d.experience) : '') + '</p>' : '')
      + block('description', d.description) + block('requirements', d.requirements)
      + (d.skills && d.skills.length ? '<h4>' + esc(t('skills')) + '</h4><div class="jc-tags">' + d.skills.map(function (s) { return '<span>' + esc(s) + '</span>'; }).join('') + '</div>' : '')
      + block('education', d.education)
      + '<p><a class="btn btn-primary" href="' + esc(d.url) + '" target="_blank" rel="noopener noreferrer">' + esc(t('apply')) + ' — merojob ↗</a></p>';
  }

  function renderFilters() {
    var d = S.data; if (!d) return;
    $('job-cats').innerHTML = ['all'].concat(d.tags).map(function (k) {
      /* merojob has no government jobs; that pill leads to the Lok Sewa pointer, so no "0" */
      var key = k === 'all' ? '' : k, n = k === 'all' || k === 'government' ? null : (d.facets.tags[k] || 0);
      return '<button class="pill" type="button" role="tab" data-cat="' + key + '" aria-selected="' + (S.cat === key) + '">' + esc(t('c_' + k)) + (n != null ? '<span class="n">' + n + '</span>' : '') + '</button>';
    }).join('');
    var cities = Object.keys(d.facets.cities).sort(function (a, b) { return d.facets.cities[b] - d.facets.cities[a]; });
    $('job-loc').innerHTML = '<option value="">' + esc(t('allCities')) + '</option>' + cities.map(function (c) {
      return '<option value="' + esc(c) + '"' + (c === S.loc ? ' selected' : '') + '>' + esc(c) + ' (' + d.facets.cities[c] + ')</option>';
    }).join('');
    $('job-type').innerHTML = '<option value="">' + esc(t('allTypes')) + '</option>' + Object.keys(d.facets.types).map(function (c) {
      return '<option value="' + esc(c) + '"' + (c === S.type ? ' selected' : '') + '>' + esc(c) + ' (' + d.facets.types[c] + ')</option>';
    }).join('');
    $('job-count').textContent = t('count', { n: d.total, all: d.all });
  }
  function render() {
    renderFilters();
    var d = S.data; if (!d) return;
    if (!S.items.length) {
      $('job-list').innerHTML = S.cat === 'government'
        ? '<div class="state"><span class="state-i">' + NL.icon.building + '</span><div class="state-msg">' + esc(t('govEmpty')) + '</div><a class="retry" href="https://psc.gov.np/" target="_blank" rel="noopener noreferrer">' + esc(t('govLink')) + ' ↗</a></div>'
        : NL.emptyState(t('none'), { icon: 'inbox', action: { label: t('clear'), attr: 'data-clear' } });
      $('job-more').innerHTML = '';
      return;
    }
    $('job-list').innerHTML = S.items.map(card).join('');
    $('job-more').innerHTML = d.page < d.pages ? '<button class="btn" type="button" data-more>' + esc(t('showMore')) + ' <span class="muted">' + (d.total - S.items.length) + '</span></button>' : '';
  }
  async function load(append) {
    var btn = $('jobs-refresh');
    btn.classList.add('spinning');
    if (!append) { S.page = 1; if (!S.items.length) $('job-list').innerHTML = NL.skeleton('cards'); }
    var p = new URLSearchParams({ q: S.q, cat: S.cat, loc: S.loc, type: S.type, sort: S.sort, page: S.page });
    try {
      var d = await NL.api('/api/jobs?' + p);
      S.data = d;
      S.items = append ? S.items.concat(d.items) : d.items;
      render();
      syncURL();
      NL.stamp('stamp-jobs', true); NL.feed('jobs', true);
    } catch (e) {
      if (!S.data) $('job-list').innerHTML = NL.errorState(t('err'), { mod: 'jobs' });
      NL.stamp('stamp-jobs', false); NL.feed('jobs', false);
    } finally { btn.classList.remove('spinning'); }
  }
  async function toggle(id) {
    var box = $('jd-' + id), btn = document.querySelector('[data-details="' + id + '"]');
    if (S.open[id]) { delete S.open[id]; box.hidden = true; btn.textContent = t('details'); btn.setAttribute('aria-expanded', 'false'); return; }
    S.open[id] = {};
    box.hidden = false; btn.textContent = t('hide'); btn.setAttribute('aria-expanded', 'true');
    box.innerHTML = NL.skeleton('rows');
    try { S.open[id] = await NL.api('/api/job?id=' + encodeURIComponent(id)); box.innerHTML = detailHTML(S.open[id]); }
    catch (e) { box.innerHTML = NL.errorState(t('err'), { compact: true }); }
  }

  document.addEventListener('click', function (e) {
    var el;
    if ((el = e.target.closest('[data-cat]'))) { S.cat = el.getAttribute('data-cat'); load(); return; }
    if ((el = e.target.closest('[data-details]'))) { toggle(el.getAttribute('data-details')); return; }
    if (e.target.closest('[data-more]')) { S.page++; load(true); return; }
    if (e.target.closest('[data-clear]')) { S.q = S.cat = S.loc = S.type = ''; $('job-q').value = ''; load(); }
  });
  $('job-loc').addEventListener('change', function (e) { S.loc = e.target.value; load(); });
  $('job-type').addEventListener('change', function (e) { S.type = e.target.value; load(); });
  $('job-sort').addEventListener('change', function (e) { S.sort = e.target.value; load(); });
  var qt;
  $('job-q').addEventListener('input', function (e) { clearTimeout(qt); qt = setTimeout(function () { S.q = e.target.value.trim(); load(); }, 300); });
  $('jobs-refresh').addEventListener('click', function () { load(); });
  NL.retryHandlers.jobs = function () { return load(); };
  NL.onLang(render);
  NL.search.add({ group: function () { return NL.s('jobs'); }, limit: 6,
    items: function () { return S.items.map(function (j) { return { title: j.title, sub: (j.company || '') + ' · ' + j.location, href: j.url, external: true, icon: 'building', kw: j.categories.join(' ') + ' ' + j.tags.join(' ') }; }); } });

  NL.ticker.autoload();
  NL.renderFooter([{ name: 'merojob.com — job listings', url: 'https://merojob.com/' }, { name: 'Public Service Commission (Lok Sewa)', url: 'https://psc.gov.np/' }]);
  load();
})();

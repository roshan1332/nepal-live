/*
 * Sports hub (/sports?sport=football|cricket|other). Football and cricket from
 * /api/sport-range, other sports from /api/sports-other — all TheSportsDB.
 * Scoreboards come from NL.sport (app.js), shared with the homepage.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc;

  NL.i18n.add({
    en: {
      kicker: 'Sports', h1: 'Live <em>scores</em>', sub: 'Football, cricket and more — live, upcoming and finished, with kick-off times in Nepal Time.',
      football: 'Football', cricket: 'Cricket', other: 'Other sports', live: 'Live', soon: 'Upcoming', done: 'Finished', all: 'All',
      Basketball: 'Basketball', Ice_Hockey: 'Ice hockey', Baseball: 'Baseball', Rugby: 'Rugby', Volleyball: 'Volleyball',
      noLive: 'No live matches right now', nextUp: 'Next up', seeUpcoming: 'See upcoming matches',
      noSoon: 'No upcoming matches in the feed.', noDone: 'No recent results in the feed.', noneAny: 'No matches in the feed right now. Check back soon.',
      err: 'Match data isn’t available right now.', nepalRow: 'Nepal', fullPage: 'Full {s} page', morePending: 'loading more days…',
      spNote: 'Fixtures and scores from TheSportsDB’s public feed. Coverage varies by league, and live scores can lag the real match. Cricket feeds often publish a result line instead of ball-by-ball scores and overs.'
    },
    ne: {
      kicker: 'खेलकुद', h1: 'प्रत्यक्ष <em>स्कोर</em>', sub: 'फुटबल, क्रिकेट र अन्य — प्रत्यक्ष, आगामी र सकिएका खेल, नेपाली समयमा।',
      football: 'फुटबल', cricket: 'क्रिकेट', other: 'अन्य खेल', live: 'प्रत्यक्ष', soon: 'आगामी', done: 'सकिएका', all: 'सबै',
      Basketball: 'बास्केटबल', Ice_Hockey: 'आइस हक्की', Baseball: 'बेसबल', Rugby: 'रग्बी', Volleyball: 'भलिबल',
      noLive: 'अहिले कुनै खेल प्रत्यक्ष छैन', nextUp: 'अर्को खेल', seeUpcoming: 'आगामी खेल हेर्नुहोस्',
      noSoon: 'फिडमा आगामी खेल छैनन्।', noDone: 'फिडमा हालैका नतिजा छैनन्।', noneAny: 'फिडमा अहिले कुनै खेल छैन। केही बेरमा फेरि हेर्नुहोस्।',
      err: 'खेलको तथ्यांक अहिले उपलब्ध छैन।', nepalRow: 'नेपाल', fullPage: '{s} पृष्ठ', morePending: 'थप दिन लोड हुँदै…',
      spNote: 'खेल तालिका र स्कोर TheSportsDB को सार्वजनिक फिडबाट। लिगअनुसार कभरेज फरक हुन्छ र प्रत्यक्ष स्कोर वास्तविक खेलभन्दा ढिलो हुन सक्छ। क्रिकेट फिडमा प्रायः ओभर र बल-बल स्कोरको सट्टा नतिजा मात्र आउँछ।'
    }
  });

  var q = new URLSearchParams(location.search);
  var S = {
    sport: ['football', 'cricket', 'other'].indexOf(q.get('sport')) >= 0 ? q.get('sport') : 'football',
    tab: null, other: 'all', data: {}, last: {}, pending: {}, retry: {}
  };
  var URLS = { football: '/api/sport-range?s=Soccer&past=2&future=10', cricket: '/api/sport-range?s=Cricket&past=2&future=10', other: '/api/sports-other' };

  function events() {
    var d = S.data[S.sport];
    var all = [];
    ((d && d.days) || []).forEach(function (day) { (day.events || []).forEach(function (ev) { all.push(ev); }); });
    if (S.sport === 'other' && S.other !== 'all') all = all.filter(function (e) { return e._sport === S.other; });
    return all;
  }
  function buckets() {
    var all = events(), c = NL.sport.classify, ms = NL.sport.ms;
    return {
      live: all.filter(function (e) { return c(e) === 'live'; }).sort(function (a, b) { return ms(a) - ms(b); }),
      soon: all.filter(function (e) { var k = c(e); return k === 'ns' || k === 'off'; }).sort(function (a, b) { return ms(a) - ms(b); }),
      done: all.filter(function (e) { var k = c(e); return k === 'done' || k === 'past'; }).sort(function (a, b) { return ms(b) - ms(a); })
    };
  }
  var label = function (ev) {
    return S.sport === 'other' ? Object.assign({}, ev, { strLeague: t(ev._sport) + (ev.strLeague ? ' · ' + ev.strLeague : '') }) : ev;
  };
  function byDay(list) {
    var map = {}, order = [];
    list.forEach(function (ev) { var d = NL.sport.nptDate(ev); if (!map[d]) { map[d] = []; order.push(d); } map[d].push(ev); });
    var i = 0;
    return order.map(function (d) {
      return '<h3 class="day-h">' + esc(NL.sport.dayLabel(d)) + '</h3><div class="sb-grid">'
        + map[d].map(function (ev) { return NL.sport.card(label(ev), i++, { noDay: true }); }).join('') + '</div>';
    }).join('');
  }

  function render() {
    $('sport-switch').innerHTML = ['football', 'cricket', 'other'].map(function (k) {
      return '<button type="button" role="tab" data-sport="' + k + '" aria-selected="' + (S.sport === k) + '">' + (k === 'football' ? NL.icon.ball : k === 'cricket' ? NL.icon.bat : NL.icon.trophy) + '<span>' + esc(t(k)) + '</span></button>';
    }).join('');
    var d = S.data[S.sport];
    var of = $('other-filter');
    of.hidden = S.sport !== 'other' || !d;
    if (S.sport === 'other' && d) {
      var counts = {};
      d.days.forEach(function (day) { day.events.forEach(function (e) { counts[e._sport] = (counts[e._sport] || 0) + 1; }); });
      of.innerHTML = ['all'].concat(d.sports.filter(function (s) { return counts[s]; })).map(function (s) {
        return '<button class="pill" type="button" data-other="' + s + '" aria-pressed="' + (S.other === s) + '">' + esc(t(s)) + (s !== 'all' ? '<span class="n">' + counts[s] + '</span>' : '') + '</button>';
      }).join('');
    }
    if (!d) return;
    var b = buckets();
    if (!S.tab) S.tab = b.live.length ? 'live' : b.soon.length ? 'soon' : 'done';
    $('sp-tabs').innerHTML = ['live', 'soon', 'done'].map(function (k) {
      var n = b[k].length, on = k === S.tab;
      return '<button class="tab' + (k === 'live' && n ? ' is-live' : '') + '" role="tab" type="button" id="tab-' + k + '" data-tab="' + k + '" aria-selected="' + on + '" aria-controls="matches-body" tabindex="' + (on ? 0 : -1) + '">'
        + (k === 'live' && n ? '<i class="live-i" aria-hidden="true"></i>' : '') + esc(t(k)) + '<span class="n">' + n + '</span></button>';
    }).join('');

    /* Nepal first: any fixture with a Nepal side is pinned above the lists */
    var np = events().filter(function (e) { return /\bNepal\b/i.test(e.strHomeTeam + ' ' + e.strAwayTeam); });
    $('np-strip').innerHTML = np.length ? '<div class="np-strip"><span class="label">' + esc(t('nepalRow')) + '</span><div class="sb-grid">'
      + np.map(function (ev, i) { return NL.sport.card(label(ev), i); }).join('') + '</div></div>' : '';

    var list = b[S.tab], body = $('matches-body'), pend = S.pending[S.sport];
    if (!b.live.length && !b.soon.length && !b.done.length) { body.innerHTML = pend ? NL.skeleton('scores') : NL.emptyState(t('noneAny'), { icon: 'calendar' }); return; }
    if (!list.length && pend) { body.innerHTML = NL.skeleton('scores'); return; }
    if (!list.length) {
      if (S.tab === 'live') {
        var next = b.soon.find(function (e) { return NL.sport.classify(e) === 'ns'; });
        var ko = next && NL.sport.kickoff(next);
        body.innerHTML = NL.emptyState(t('noLive'), { icon: 'calendar',
          sub: next ? t('nextUp') + ': ' + next.strHomeTeam + ' – ' + next.strAwayTeam + ' · ' + NL.sport.dayLabel(NL.sport.nptDate(next)) + (ko ? ' ' + NL.nptHM(ko) + ' NPT' : '') : '',
          action: b.soon.length ? { label: t('seeUpcoming'), attr: 'data-tab="soon"' } : null });
      } else body.innerHTML = NL.emptyState(S.tab === 'soon' ? t('noSoon') : t('noDone'), { icon: 'calendar' });
      return;
    }
    body.innerHTML = S.tab === 'live' ? '<div class="sb-grid">' + list.map(function (ev, i) { return NL.sport.card(label(ev), i); }).join('') + '</div>' : byDay(list);
  }

  async function load(sport) {
    sport = sport || S.sport;
    var btn = $('sports-refresh');
    btn.classList.add('spinning');
    if (!S.data[sport] && sport === S.sport) $('matches-body').innerHTML = NL.skeleton('scores');
    try {
      S.data[sport] = await NL.api(URLS[sport]);
      S.last[sport] = Date.now();
      /* the server fills in days it hasn't fetched yet (rate-limited feed); check back */
      S.pending[sport] = S.data[sport].pending || 0;
      if (S.pending[sport]) { S.retry[sport] = (S.retry[sport] || 0) + 1; if (S.retry[sport] <= 8) setTimeout(function () { load(sport); }, 12000); }
      else S.retry[sport] = 0;
      if (sport === S.sport) { render(); NL.stamp('stamp-sports', true, S.pending[sport] ? t('morePending') : ''); }
      NL.feed('sports-' + sport, true);
    } catch (e) {
      if (!S.data[sport] && sport === S.sport) { $('sp-tabs').innerHTML = ''; $('matches-body').innerHTML = NL.errorState(t('err'), { mod: 'sports' }); }
      if (sport === S.sport) NL.stamp('stamp-sports', false);
      NL.feed('sports-' + sport, false);
    } finally { btn.classList.remove('spinning'); }
  }

  document.addEventListener('click', function (e) {
    var el;
    if ((el = e.target.closest('[data-sport]'))) {
      S.sport = el.getAttribute('data-sport'); S.tab = null;
      history.replaceState(null, '', location.pathname + '?sport=' + S.sport);
      render();
      if (!S.data[S.sport] || Date.now() - S.last[S.sport] > 120e3) load(); else NL.stamp('stamp-sports', true);
      return;
    }
    if ((el = e.target.closest('[data-other]'))) { S.other = el.getAttribute('data-other'); S.tab = null; render(); return; }
    if ((el = e.target.closest('[data-tab]'))) { S.tab = el.getAttribute('data-tab'); render(); var tb = $('tab-' + S.tab); if (tb && el.classList.contains('tab')) tb.focus(); }
  });
  $('sp-tabs').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var o = ['live', 'soon', 'done'];
    S.tab = o[(o.indexOf(S.tab) + (e.key === 'ArrowRight' ? 1 : 2)) % 3];
    render(); $('tab-' + S.tab).focus();
  });
  $('sports-refresh').addEventListener('click', function () { load(); });
  NL.retryHandlers.sports = function () { return load(); };
  NL.onLang(render);
  NL.search.add({ group: function () { return NL.s('sportsNav'); }, limit: 6,
    items: function () {
      return events().map(function (ev) {
        return { title: ev.strHomeTeam + ' vs ' + ev.strAwayTeam, sub: (ev.strLeague || '') + ' · ' + NL.sport.dayLabel(NL.sport.nptDate(ev)), href: '/sports?sport=' + S.sport, icon: S.sport === 'cricket' ? 'bat' : 'ball', kw: ev.strCountry || '' };
      });
    } });

  render();
  NL.ticker.autoload();
  NL.renderFooter([{ name: 'TheSportsDB — fixtures, scores & badges', url: 'https://www.thesportsdb.com/' }]);
  load();
  setInterval(function () { if (!document.hidden) load(); }, 120e3);
})();

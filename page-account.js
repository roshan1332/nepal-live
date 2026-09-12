/*
 * Account page (/account). Logged out: log in / create account. Logged in:
 * personal alerts (official feeds only, filtered by the user's settings),
 * saved items, preferences, password change and account deletion.
 * Data: /api/me, /api/auth/*, /api/me/* (same-origin JSON, HttpOnly session cookie).
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc;
  var LEVELS = ['emergency', 'warning', 'advisory', 'info'];
  var CATS = ['flood', 'rain', 'landslide', 'road', 'earthquake', 'air', 'storm', 'fire', 'drought', 'other'];
  var TYPES = ['news', 'job', 'event', 'gov', 'place', 'match', 'page'];
  /* Nepal's 77 districts, spelled as the government's disaster portal (BIPAD) lists them */
  var DISTRICTS = ['Achham', 'Arghakhanchi', 'Baglung', 'Baitadi', 'Bajhang', 'Bajura', 'Banke', 'Bara', 'Bardiya', 'Bhaktapur', 'Bhojpur',
    'Chitwan', 'Dadeldhura', 'Dailekh', 'Dang', 'Darchula', 'Dhading', 'Dhankuta', 'Dhanusha', 'Dolakha', 'Dolpa', 'Doti', 'Gorkha', 'Gulmi',
    'Humla', 'Ilam', 'Jajarkot', 'Jhapa', 'Jumla', 'Kailali', 'Kalikot', 'Kanchanpur', 'Kapilvastu', 'Kaski', 'Kathmandu', 'Kavrepalanchok',
    'Khotang', 'Lalitpur', 'Lamjung', 'Mahottari', 'Makwanpur', 'Manang', 'Morang', 'Mugu', 'Mustang', 'Myagdi', 'Nawalparasi East',
    'Nawalparasi West', 'Nuwakot', 'Okhaldhunga', 'Palpa', 'Panchthar', 'Parbat', 'Parsa', 'Pyuthan', 'Ramechhap', 'Rasuwa', 'Rautahat',
    'Rolpa', 'Rukum East', 'Rukum West', 'Rupandehi', 'Salyan', 'Sankhuwasabha', 'Saptari', 'Sarlahi', 'Sindhuli', 'Sindhupalchok', 'Siraha',
    'Solukhumbu', 'Sunsari', 'Surkhet', 'Syangja', 'Tanahun', 'Taplejung', 'Terhathum', 'Udayapur'];

  NL.i18n.add({
    en: {
      kicker: 'Your account', h1: 'Your <em>Nepal Live</em>', sub: 'Save stories, jobs and events, and choose which official alerts you want to see.',
      login: 'Log in', signup: 'Create account', name: 'Name (optional)', email: 'Email', password: 'Password', pwHint: 'At least 8 characters.',
      why1: 'Save news, jobs, events and places to come back to.', why2: 'See alerts for the districts you choose — only from official sources.',
      why3: 'Keep your language, theme and home city with your account.',
      liTitle: 'Welcome back', liLead: 'Log in to see your saved items and your personal alerts.',
      suTitle: 'Create your free account', suLead: 'It takes a few seconds — just an email and a password.',
      newHere: 'New to Nepal Live?', signupShort: 'Create an account', haveAcct: 'Already have an account?',
      forgot: 'Forgot your password? Reset by email isn’t available yet — write to us through Contact at the bottom of the page.',
      privacy: 'We keep only your email, your name if you give one, and your password in scrambled (hashed) form — never as plain text. No ads, and we never email you.',
      show: 'Show password', hide: 'Hide password', caps: 'Caps Lock is on', loggingIn: 'Logging in…', creating: 'Creating account…',
      apTitle: 'Your Nepal, your way', apLabel: 'What an account gives you',
      b1t: 'Save for later', b1: 'Bookmark news, jobs, events and places — they wait for you on any device.',
      b2t: 'Alerts for your districts', b2: 'Pick the districts and alert types you care about — only from official sources.',
      b3t: 'Your settings everywhere', b3: 'Your language, theme and home city follow your account.',
      apFoot: 'Free to use · No ads · We never email you',
      ephemeral: 'Heads-up: this server currently keeps accounts on temporary storage, so they may be reset when the site is updated.',
      hello: 'Welcome', since: 'Member since {d}', logout: 'Log out', sections: 'Account sections',
      myAlerts: 'My alerts', saved: 'Saved', prefs: 'Preferences', security: 'Security',
      alertsOn: 'Show me official alerts that match these settings', minLevel: 'Minimum level',
      min_emergency: '🔴 Emergency only', min_warning: '🟠 Warning and above', min_advisory: '🟡 Advisory and above', min_info: '🟢 Everything, including information',
      cats: 'Types', catsHint: '— none ticked means all types', districts: 'Districts', districtsHint: '— none means all of Nepal; earthquakes are always included',
      addDistrict: 'Add a district…', remove: 'Remove', maxDistricts: 'You can follow up to 20 districts.',
      alertsBasis: 'Alerts come only from official feeds — BIPAD Portal, Department of Roads, USGS, GDACS and government air-quality stations. They appear here and as a count on the account button. Nepal Live does not send emails or push notifications.',
      saveChanges: 'Save changes', savedOk: 'Saved.', unreadN: '{n} new since you last checked', allRead: 'You’re up to date.', markRead: 'Mark all as read',
      noNotes: 'No official alerts match your settings right now.', noNotesSub: 'We check the official feeds every few minutes.',
      alertsOff: 'Alerts are switched off.', notesErr: 'Alerts aren’t available right now.',
      noSaved: 'Nothing saved yet.', noSavedSub: 'Use the bookmark button on news, jobs, events, government services and search results.', savedOn: 'saved {d}',
      savedErr: 'Saved items can’t be loaded right now.',
      ty_news: 'News', ty_job: 'Jobs', ty_event: 'Events', ty_gov: 'Government services', ty_place: 'Places', ty_match: 'Matches', ty_page: 'Pages',
      language: 'Language', theme: 'Theme', th_system: 'Match my device', th_light: 'Light', th_dark: 'Dark',
      homeCity: 'Home city', noCity: 'Not set', cityHint: 'Opens first on the Weather page.',
      changePw: 'Change password', currentPw: 'Current password', newPw: 'New password', pwChanged: 'Password changed. Other devices have been signed out.',
      deleteAcct: 'Delete account', deleteHint: 'Permanently deletes your account, saved items and preferences. This cannot be undone.',
      confirmPw: 'Confirm with your password', deleteBtn: 'Delete my account', deleteConfirm: 'Delete your Nepal Live account permanently?',
      deleted: 'Your account has been deleted.', loggedOut: 'You’ve been logged out.',
      err: 'Your account can’t be loaded right now.', e_error: 'Something went wrong. Please try again.', e_missing: 'Enter your email and password.',
      e_bad_email: 'Enter a valid email address.', e_short_password: 'Password must be at least 8 characters.', e_long_password: 'Password is too long.',
      e_weak_password: 'Password must not be your email address.', e_exists: 'An account with this email already exists — log in instead.',
      e_bad_login: 'Email or password is incorrect.', e_bad_current: 'That password is incorrect.', e_rate: 'Too many attempts. Please wait a few minutes and try again.',
      e_csrf: 'Request blocked for your security. Reload the page and try again.', e_full: 'Sign-ups are paused right now.', e_auth: 'Your session has ended. Please log in again.'
    },
    ne: {
      kicker: 'तपाईंको खाता', h1: 'तपाईंको <em>नेपाल लाइभ</em>', sub: 'समाचार, जागिर र कार्यक्रम सेभ गर्नुहोस्, र कुन आधिकारिक सतर्कता हेर्ने छान्नुहोस्।',
      login: 'लग इन', signup: 'खाता बनाउनुहोस्', name: 'नाम (ऐच्छिक)', email: 'इमेल', password: 'पासवर्ड', pwHint: 'कम्तीमा ८ अक्षर।',
      why1: 'समाचार, जागिर, कार्यक्रम र ठाउँ पछि हेर्न सेभ गर्नुहोस्।', why2: 'आफूले छानेका जिल्लाका सतर्कता हेर्नुहोस् — आधिकारिक स्रोतबाट मात्र।',
      why3: 'भाषा, थिम र आफ्नो सहर खातामै राख्नुहोस्।',
      liTitle: 'फेरि स्वागत छ', liLead: 'सेभ गरिएका कुरा र आफ्ना सतर्कता हेर्न लग इन गर्नुहोस्।',
      suTitle: 'निःशुल्क खाता बनाउनुहोस्', suLead: 'केही सेकेन्ड मात्र लाग्छ — इमेल र पासवर्ड भए पुग्छ।',
      newHere: 'नेपाल लाइभमा नयाँ हो?', signupShort: 'खाता बनाउनुहोस्', haveAcct: 'पहिले नै खाता छ?',
      forgot: 'पासवर्ड बिर्सनुभयो? इमेलबाट रिसेट अहिले उपलब्ध छैन — पृष्ठको तलको सम्पर्कबाट लेख्नुहोस्।',
      privacy: 'हामी तपाईंको इमेल, दिनुभएमा नाम, र पासवर्ड गोप्य (ह्यास) रूपमा मात्र राख्छौं — कहिल्यै सादा अक्षरमा होइन। विज्ञापन छैन, हामी इमेल पठाउँदैनौं।',
      show: 'पासवर्ड देखाउनुहोस्', hide: 'पासवर्ड लुकाउनुहोस्', caps: 'क्याप्स लक खुला छ', loggingIn: 'लग इन हुँदै…', creating: 'खाता बन्दै…',
      apTitle: 'तपाईंको नेपाल, तपाईंको तरिका', apLabel: 'खाताले के दिन्छ',
      b1t: 'पछि हेर्न सेभ', b1: 'समाचार, जागिर, कार्यक्रम र ठाउँ बुकमार्क गर्नुहोस् — जुनसुकै उपकरणमा भेटिन्छ।',
      b2t: 'आफ्ना जिल्लाका सतर्कता', b2: 'चाहेका जिल्ला र सतर्कताका प्रकार छान्नुहोस् — आधिकारिक स्रोतबाट मात्र।',
      b3t: 'सेटिङ जहाँ पनि', b3: 'भाषा, थिम र आफ्नो सहर खातासँगै रहन्छ।',
      apFoot: 'निःशुल्क · विज्ञापन छैन · हामी इमेल पठाउँदैनौं',
      ephemeral: 'ध्यान दिनुहोस्: यो सर्भरले अहिले खाता अस्थायी भण्डारणमा राख्छ, त्यसैले साइट अपडेट हुँदा खाता मेटिन सक्छन्।',
      hello: 'स्वागत छ', since: '{d} देखि सदस्य', logout: 'लग आउट', sections: 'खाताका भाग',
      myAlerts: 'मेरा सतर्कता', saved: 'सेभ गरिएका', prefs: 'प्राथमिकता', security: 'सुरक्षा',
      alertsOn: 'यी सेटिङसँग मिल्ने आधिकारिक सतर्कता देखाउनुहोस्', minLevel: 'न्यूनतम तह',
      min_emergency: '🔴 आपतकालीन मात्र', min_warning: '🟠 चेतावनी र माथि', min_advisory: '🟡 सतर्कता र माथि', min_info: '🟢 सबै, जानकारीसमेत',
      cats: 'प्रकार', catsHint: '— कुनै नछाने सबै प्रकार', districts: 'जिल्ला', districtsHint: '— कुनै नछाने सम्पूर्ण नेपाल; भूकम्प सधैं समावेश हुन्छ',
      addDistrict: 'जिल्ला थप्नुहोस्…', remove: 'हटाउनुहोस्', maxDistricts: 'बढीमा २० जिल्ला पछ्याउन सकिन्छ।',
      alertsBasis: 'सतर्कता आधिकारिक स्रोतबाट मात्र आउँछन् — बिपद पोर्टल, सडक विभाग, USGS, GDACS र सरकारी वायु गुणस्तर केन्द्र। यी यहाँ र खाता बटनमा संख्याका रूपमा देखिन्छन्। नेपाल लाइभले इमेल वा पुस सूचना पठाउँदैन।',
      saveChanges: 'परिवर्तन सेभ गर्नुहोस्', savedOk: 'सेभ भयो।', unreadN: 'पछिल्लो पटक हेरेपछि {n} नयाँ', allRead: 'सबै हेरिसक्नुभयो।', markRead: 'सबै पढिएको बनाउनुहोस्',
      noNotes: 'अहिले तपाईंको सेटिङसँग मिल्ने आधिकारिक सतर्कता छैन।', noNotesSub: 'हामी आधिकारिक स्रोत केही मिनेटमै जाँच्छौं।',
      alertsOff: 'सतर्कता बन्द छ।', notesErr: 'सतर्कता अहिले उपलब्ध छैनन्।',
      noSaved: 'अहिलेसम्म केही सेभ गरिएको छैन।', noSavedSub: 'समाचार, जागिर, कार्यक्रम, सरकारी सेवा र खोज नतिजामा बुकमार्क बटन प्रयोग गर्नुहोस्।', savedOn: '{d} मा सेभ',
      savedErr: 'सेभ गरिएका सामग्री अहिले लोड हुन सकेनन्।',
      ty_news: 'समाचार', ty_job: 'जागिर', ty_event: 'कार्यक्रम', ty_gov: 'सरकारी सेवा', ty_place: 'ठाउँ', ty_match: 'खेल', ty_page: 'पृष्ठ',
      language: 'भाषा', theme: 'थिम', th_system: 'यन्त्रअनुसार', th_light: 'उज्यालो', th_dark: 'अँध्यारो',
      homeCity: 'आफ्नो सहर', noCity: 'छानिएको छैन', cityHint: 'मौसम पृष्ठमा पहिले खुल्छ।',
      changePw: 'पासवर्ड परिवर्तन', currentPw: 'हालको पासवर्ड', newPw: 'नयाँ पासवर्ड', pwChanged: 'पासवर्ड परिवर्तन भयो। अन्य यन्त्रबाट लग आउट गरियो।',
      deleteAcct: 'खाता मेटाउनुहोस्', deleteHint: 'तपाईंको खाता, सेभ गरिएका सामग्री र प्राथमिकता स्थायी रूपमा मेटिन्छन्। यो फिर्ता गर्न सकिँदैन।',
      confirmPw: 'पासवर्डले पुष्टि गर्नुहोस्', deleteBtn: 'मेरो खाता मेटाउनुहोस्', deleteConfirm: 'नेपाल लाइभ खाता स्थायी रूपमा मेटाउने?',
      deleted: 'तपाईंको खाता मेटाइयो।', loggedOut: 'तपाईं लग आउट हुनुभयो।',
      err: 'तपाईंको खाता अहिले लोड हुन सकेन।', e_error: 'केही गडबड भयो। फेरि प्रयास गर्नुहोस्।', e_missing: 'इमेल र पासवर्ड लेख्नुहोस्।',
      e_bad_email: 'मान्य इमेल ठेगाना लेख्नुहोस्।', e_short_password: 'पासवर्ड कम्तीमा ८ अक्षरको हुनुपर्छ।', e_long_password: 'पासवर्ड धेरै लामो भयो।',
      e_weak_password: 'पासवर्ड इमेल ठेगाना हुनु हुँदैन।', e_exists: 'यो इमेलको खाता पहिल्यै छ — लग इन गर्नुहोस्।',
      e_bad_login: 'इमेल वा पासवर्ड मिलेन।', e_bad_current: 'पासवर्ड मिलेन।', e_rate: 'धेरै प्रयास भयो। केही मिनेट पर्खेर फेरि प्रयास गर्नुहोस्।',
      e_csrf: 'सुरक्षाका लागि अनुरोध रोकियो। पृष्ठ रिलोड गरेर फेरि प्रयास गर्नुहोस्।', e_full: 'अहिले नयाँ खाता खोल्न रोकिएको छ।', e_auth: 'सत्र सकियो। फेरि लग इन गर्नुहोस्।'
    }
  });

  var root = $('acct-root');
  var qs = new URLSearchParams(location.search);
  var S = { user: null, storage: null, tab: qs.get('tab') === 'signup' ? 'signup' : 'login', saved: null, notes: null, cities: null, flash: '' };
  var nextUrl = (function () { var n = qs.get('next') || ''; return /^\/(?!\/)\S*$/.test(n) ? n : ''; })();
  var api = NL.me.fetch;

  var tr = function (k, fallback) { var v = t(k); return v && v !== k ? v : fallback; };
  var errText = function (e, override) { return (override && override[e.code] && t(override[e.code])) || tr('e_' + (e.code || ''), e.message || t('e_error')); };
  var val = function (f, name) { var el = f.elements.namedItem(name); return el ? el.value : ''; };
  function msg(f, cls, text) {
    var p = f.querySelector('.' + cls);
    if (p) { p.textContent = text || ''; p.hidden = !text; }
    if (cls === 'acct-ok' && text) msg(f, 'acct-err', '');
  }
  function busy(f, on) { [].forEach.call(f.elements, function (x) { x.disabled = on; }); }

  function field(name, type, label, ac, req, max, hint) {
    return '<label class="acct-field"><span>' + esc(label) + '</span><input name="' + name + '" type="' + type + '" autocomplete="' + ac + '"'
      + (req ? ' required' : '') + ' maxlength="' + max + '"' + (type === 'password' ? ' minlength="8"' : '')
      + (type === 'email' ? ' inputmode="email" autocapitalize="none" spellcheck="false"' : '') + '>'
      + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</label>';
  }
  var storageNote = function () { return S.storage && !S.storage.durable ? '<div class="notice acct-note">' + NL.icon.info + '<p>' + esc(t('ephemeral')) + '</p></div>' : ''; };
  var flashHTML = function () { var f = S.flash; S.flash = ''; return f ? '<p class="acct-flash" role="status">' + esc(f) + '</p>' : ''; };

  /* --------------------------------------------------------------- logged out */
  var svg = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var IC = {
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6 8.5-6"/>'),
    lock: svg('<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),
    user: svg('<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.2-3.8 4-5.6 7.5-5.6s6.3 1.8 7.5 5.6"/>'),
    eye: svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
    eyeOff: svg('<path d="M3 3l18 18M10.6 5.6A10 10 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.2 4M6.6 6.6C4 8.3 2.5 12 2.5 12s3.5 6.5 9.5 6.5a9.6 9.6 0 0 0 4.4-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
    sliders: svg('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>')
  };
  function afield(name, type, label, ac, req, max, icon, extra) {
    return '<label class="acct-field auth-field"><span>' + esc(label) + '</span><span class="af-in">' + icon
      + '<input name="' + name + '" type="' + type + '" autocomplete="' + ac + '"' + (req ? ' required' : '') + ' maxlength="' + max + '"'
      + (type === 'password' ? ' minlength="8"' : '') + (type === 'email' ? ' inputmode="email" autocapitalize="none" spellcheck="false"' : '') + '>'
      + (type === 'password' ? '<button type="button" class="pw-toggle" data-pw-toggle aria-pressed="false" aria-label="' + esc(t('show')) + '" title="' + esc(t('show')) + '">' + IC.eye + '</button>' : '')
      + '</span>' + (extra || '') + '</label>';
  }
  function authView() {
    var su = S.tab === 'signup';
    var pwExtra = (su ? '<small class="pw-rule" id="pw-rule">' + esc(t('pwHint')) + '</small>' : '') + '<small class="caps" id="caps" hidden>' + esc(t('caps')) + '</small>';
    root.innerHTML = '<div class="auth">'
      + '<div class="auth-main">' + flashHTML()
      + '<form class="auth-card" id="auth-form" novalidate>'
      + '<div class="auth-tabs" role="group"><button type="button" data-tab="login" aria-pressed="' + !su + '">' + esc(t('login')) + '</button>'
      + '<button type="button" data-tab="signup" aria-pressed="' + su + '">' + esc(t('signup')) + '</button></div>'
      + '<div class="auth-head"><h2 class="auth-title">' + esc(t(su ? 'suTitle' : 'liTitle')) + '</h2><p class="auth-lead">' + esc(t(su ? 'suLead' : 'liLead')) + '</p></div>'
      + (su ? afield('name', 'text', t('name'), 'name', false, 60, IC.user) : '')
      + afield('email', 'email', t('email'), 'email', true, 254, IC.mail)
      + afield('password', 'password', t('password'), su ? 'new-password' : 'current-password', true, 200, IC.lock, pwExtra)
      + '<p class="acct-err" role="alert" hidden></p>'
      + '<button class="btn btn-primary auth-submit" type="submit"><span>' + esc(su ? t('signup') : t('login')) + '</span></button>'
      + '<p class="auth-switch">' + esc(t(su ? 'haveAcct' : 'newHere')) + ' <button type="button" data-tab="' + (su ? 'login' : 'signup') + '">' + esc(t(su ? 'login' : 'signupShort')) + '</button></p>'
      + (su ? '' : '<p class="auth-forgot">' + esc(t('forgot')) + '</p>')
      + '</form>'
      + '<p class="auth-priv">' + IC.lock + '<span>' + esc(t('privacy')) + '</span></p>'
      + storageNote() + '</div>'
      + '<aside class="auth-panel" aria-label="' + esc(t('apLabel')) + '"><span class="ap-k">NEPAL LIVE</span>'
      + '<h2 class="ap-t">' + esc(t('apTitle')) + '</h2><ul class="ap-list">'
      + '<li>' + NL.icon.bookmark + '<div><b>' + esc(t('b1t')) + '</b><span>' + esc(t('b1')) + '</span></div></li>'
      + '<li>' + NL.icon.bell + '<div><b>' + esc(t('b2t')) + '</b><span>' + esc(t('b2')) + '</span></div></li>'
      + '<li>' + IC.sliders + '<div><b>' + esc(t('b3t')) + '</b><span>' + esc(t('b3')) + '</span></div></li>'
      + '</ul><p class="ap-foot">' + esc(t('apFoot')) + '</p></aside></div>';
  }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function submitAuth(f) {
    var su = S.tab === 'signup';
    var d = { email: val(f, 'email').trim(), password: val(f, 'password') };
    if (!d.email || !d.password) return msg(f, 'acct-err', t('e_missing'));
    if (!EMAIL_RE.test(d.email)) return msg(f, 'acct-err', t('e_bad_email'));
    if (su && d.password.length < 8) return msg(f, 'acct-err', t('e_short_password'));
    if (su) { d.name = val(f, 'name').trim(); d.prefs = { lang: NL.lang() }; }
    var btn = f.querySelector('.auth-submit'), label = btn.querySelector('span'), idle = label.textContent;
    busy(f, true);
    btn.classList.add('is-busy');
    label.textContent = t(su ? 'creating' : 'loggingIn');
    msg(f, 'acct-err', '');
    api('POST', su ? '/api/auth/signup' : '/api/auth/login', d).then(function (r) {
      S.user = r.user;
      NL.me.load();
      if (!su) applyPrefs(r.user.prefs);
      if (nextUrl) { location.href = nextUrl; return; }
      history.replaceState(null, '', '/account');
      profileView();
      window.scrollTo({ top: 0 });
    }).catch(function (err) {
      busy(f, false);
      btn.classList.remove('is-busy');
      label.textContent = idle;
      msg(f, 'acct-err', errText(err));
    });
  }
  /* show / hide password, Caps Lock warning, the 8-character check */
  root.addEventListener('click', function (e) {
    var tg = e.target.closest('[data-pw-toggle]');
    if (!tg) return;
    var inp = tg.parentNode.querySelector('input');
    var show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    tg.setAttribute('aria-pressed', String(show));
    tg.setAttribute('aria-label', t(show ? 'hide' : 'show'));
    tg.title = t(show ? 'hide' : 'show');
    tg.innerHTML = show ? IC.eyeOff : IC.eye;
    inp.focus();
  });
  root.addEventListener('input', function (e) {
    if (e.target.name !== 'password' || !e.target.form || e.target.form.id !== 'auth-form') return;
    var r = $('pw-rule');
    if (r) r.classList.toggle('ok', e.target.value.length >= 8);
  });
  ['keydown', 'keyup'].forEach(function (ev) {
    root.addEventListener(ev, function (e) {
      if (e.target.name !== 'password' || !e.getModifierState) return;
      var c = $('caps');
      if (c) c.hidden = !e.getModifierState('CapsLock');
    });
  });

  /* ---------------------------------------------------------------- logged in */
  function section(id, title, body) {
    return '<section class="sec acct-sec" id="' + id + '" aria-labelledby="h-' + id + '"><div class="sec-head"><div><h2 class="sec-title" id="h-' + id + '">'
      + esc(title) + '</h2></div></div>' + body + '</section>';
  }
  function profileView() {
    var u = S.user, p = u.prefs;
    root.innerHTML = storageNote() + flashHTML()
      + '<section class="acct-card acct-head"><div class="acct-avatar" aria-hidden="true">' + esc((u.name || u.email).trim().charAt(0).toUpperCase()) + '</div>'
      + '<div class="acct-id"><h2>' + esc(u.name || t('hello')) + '</h2><p class="muted">' + esc(u.email) + ' · ' + esc(t('since', { d: NL.dfmt.dayY(Date.parse(u.created)) })) + '</p></div>'
      + '<button class="btn" type="button" data-logout>' + esc(t('logout')) + '</button></section>'
      + '<nav class="acct-nav" aria-label="' + esc(t('sections')) + '"><a href="#alerts">' + esc(t('myAlerts')) + '</a><a href="#saved">' + esc(t('saved')) + '</a>'
      + '<a href="#prefs">' + esc(t('prefs')) + '</a><a href="#security">' + esc(t('security')) + '</a></nav>'
      + section('alerts', t('myAlerts'), '<div id="notes"></div>' + alertsForm(p.alerts))
      + section('saved', t('saved'), '<div id="saved-list"></div>')
      + section('prefs', t('prefs'), prefsForm(p))
      + section('security', t('security'), '<div class="acct-2">' + pwForm() + delForm() + '</div>');
    renderNotes(); renderSaved(); fillCities();
    if (!S.notes) loadNotes();
    if (!S.saved) loadSaved();
    if (!S.cities) loadCities();
  }

  /* personal alerts */
  function alertsForm(a) {
    return '<form class="acct-card acct-form wide" id="alerts-form">'
      + '<label class="acct-check"><input type="checkbox" name="enabled"' + (a.enabled ? ' checked' : '') + '><span>' + esc(t('alertsOn')) + '</span></label>'
      + '<label class="acct-field"><span>' + esc(t('minLevel')) + '</span><select name="minLevel">'
      + LEVELS.map(function (l) { return '<option value="' + l + '"' + (a.minLevel === l ? ' selected' : '') + '>' + esc(t('min_' + l)) + '</option>'; }).join('') + '</select></label>'
      + '<fieldset class="acct-fs"><legend>' + esc(t('cats')) + ' <small>' + esc(t('catsHint')) + '</small></legend><div class="acct-checks">'
      + CATS.map(function (c) {
        return '<label class="acct-chip"><input type="checkbox" name="cat" value="' + c + '"' + (a.categories.indexOf(c) >= 0 ? ' checked' : '') + '><span>' + esc(t('cat_' + c)) + '</span></label>';
      }).join('') + '</div></fieldset>'
      + '<fieldset class="acct-fs"><legend>' + esc(t('districts')) + ' <small>' + esc(t('districtsHint')) + '</small></legend>'
      + '<div class="acct-dists" id="dist-chips">' + a.districts.map(distChip).join('') + '</div>'
      + '<select id="dist-add" aria-label="' + esc(t('addDistrict')) + '"><option value="">' + esc(t('addDistrict')) + '</option>'
      + DISTRICTS.map(function (d) { return '<option>' + esc(d) + '</option>'; }).join('') + '</select></fieldset>'
      + '<p class="small muted">' + esc(t('alertsBasis')) + '</p>'
      + '<p class="acct-err" role="alert" hidden></p><p class="acct-ok" role="status" hidden></p>'
      + '<button class="btn btn-primary" type="submit">' + esc(t('saveChanges')) + '</button></form>';
  }
  function distChip(d) {
    return '<span class="acct-dchip" data-d="' + esc(d) + '">' + esc(d) + '<button type="button" data-rm-dist="' + esc(d) + '" aria-label="' + esc(t('remove') + ' ' + d) + '">×</button></span>';
  }
  function saveAlerts(f) {
    var a = {
      enabled: f.elements.namedItem('enabled').checked, minLevel: val(f, 'minLevel'),
      categories: [].filter.call(f.querySelectorAll('input[name="cat"]'), function (x) { return x.checked; }).map(function (x) { return x.value; }),
      districts: [].map.call(f.querySelectorAll('.acct-dchip'), function (x) { return x.getAttribute('data-d'); }),
    };
    busy(f, true);
    api('PATCH', '/api/me', { prefs: { alerts: a } }).then(function (r) {
      S.user = r.user; busy(f, false); msg(f, 'acct-ok', t('savedOk')); loadNotes();
    }).catch(function (err) { busy(f, false); msg(f, 'acct-err', errText(err)); });
  }
  function loadNotes() {
    var box = $('notes');
    if (box && !S.notes) box.innerHTML = NL.skeleton('rows');
    return api('GET', '/api/me/notifications').then(function (d) { S.notes = d; renderNotes(); NL.me.badge(d.unread); })
      .catch(function () { if ($('notes')) $('notes').innerHTML = NL.errorState(t('notesErr'), { compact: true }); });
  }
  function renderNotes() {
    var d = S.notes, box = $('notes');
    if (!d || !box) return;
    if (!d.enabled) { box.innerHTML = NL.emptyState(t('alertsOff'), { icon: 'bell', compact: true }); return; }
    box.innerHTML = '<div class="acct-notes-head"><span>' + esc(d.unread ? t('unreadN', { n: d.unread }) : t('allRead')) + '</span>'
      + (d.unread ? '<button class="btn" type="button" data-seen>' + esc(t('markRead')) + '</button>' : '') + '</div>'
      + (d.items.length ? '<div class="mod-grid acct-notes">' + d.items.map(function (a) {
        return '<div class="note' + (a.unread ? ' unread' : '') + '">' + NL.alertCard(a, { compact: true }) + '</div>';
      }).join('') + '</div>' : NL.emptyState(t('noNotes'), { icon: 'shield', sub: t('noNotesSub'), compact: true }));
  }

  /* saved items */
  function loadSaved() {
    return api('GET', '/api/me/saved').then(function (d) { S.saved = d.items; renderSaved(); })
      .catch(function () { if ($('saved-list')) $('saved-list').innerHTML = NL.errorState(t('savedErr'), { compact: true }); });
  }
  function renderSaved() {
    var box = $('saved-list');
    if (!box) return;
    if (!S.saved) { box.innerHTML = NL.skeleton('rows'); return; }
    if (!S.saved.length) { box.innerHTML = NL.emptyState(t('noSaved'), { icon: 'bookmark', sub: t('noSavedSub'), compact: true }); return; }
    var by = {};
    S.saved.forEach(function (i) { (by[i.type] = by[i.type] || []).push(i); });
    box.innerHTML = TYPES.filter(function (k) { return by[k]; }).map(function (k) {
      return '<h3 class="acct-h3">' + esc(t('ty_' + k)) + ' <span class="muted">' + by[k].length + '</span></h3><ul class="saved-ul">' + by[k].map(function (i) {
        var ext = /^https?:/.test(i.url);
        return '<li>' + (i.img ? '<img src="' + esc(i.img) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">' : '')
          + '<div class="sv-b"><a href="' + esc(i.url) + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + NL.langAttr(i.title) + '>' + esc(i.title) + (ext ? ' <span aria-hidden="true">↗</span>' : '') + '</a>'
          + '<span class="muted small">' + esc([i.sub, t('savedOn', { d: NL.dfmt.day(Date.parse(i.savedAt)) })].filter(Boolean).join(' · ')) + '</span></div>'
          + '<button class="btn" type="button" data-unsave="' + esc(i.key) + '">' + esc(t('remove')) + '</button></li>';
      }).join('') + '</ul>';
    }).join('');
  }

  /* preferences */
  function sel(name, label, opts, cur) {
    return '<label class="acct-field"><span>' + esc(label) + '</span><select name="' + name + '">'
      + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
  }
  function prefsForm(p) {
    return '<form class="acct-card acct-form wide" id="prefs-form">'
      + '<label class="acct-field"><span>' + esc(t('name')) + '</span><input name="name" type="text" maxlength="60" autocomplete="name" value="' + esc(S.user.name || '') + '"></label>'
      + '<div class="acct-row">'
      + sel('lang', t('language'), [['en', 'English'], ['ne', 'नेपाली']], p.lang)
      + sel('theme', t('theme'), [['system', t('th_system')], ['light', t('th_light')], ['dark', t('th_dark')]], p.theme)
      + '<label class="acct-field"><span>' + esc(t('homeCity')) + '</span><select name="city" id="city-sel"><option value="">' + esc(t('noCity')) + '</option></select><small>' + esc(t('cityHint')) + '</small></label>'
      + '</div><p class="acct-err" role="alert" hidden></p><p class="acct-ok" role="status" hidden></p>'
      + '<button class="btn btn-primary" type="submit">' + esc(t('saveChanges')) + '</button></form>';
  }
  function loadCities() { return NL.api('/api/cities').then(function (d) { S.cities = d.cities; fillCities(); }).catch(function () {}); }
  function fillCities() {
    var s = $('city-sel');
    if (!s || !S.cities) return;
    var ne = NL.lang() === 'ne', cur = S.user.prefs.city;
    s.innerHTML = '<option value="">' + esc(t('noCity')) + '</option>' + S.cities.map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (c.id === cur ? ' selected' : '') + '>' + esc(ne ? c.ne : c.en) + '</option>';
    }).join('');
  }
  function applyTheme(v) {
    var want = v === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : v;
    if (document.documentElement.getAttribute('data-theme') !== want) NL.theme.toggle();
    try { if (v === 'system') localStorage.removeItem('nlive-theme'); } catch (e) { /* storage blocked */ }
  }
  function applyPrefs(p) {
    if (!p) return;
    if (p.theme) applyTheme(p.theme);
    /* the Weather page remembers its city as {id, en, ne, lat, lon} */
    var c = p.city && S.cities && S.cities.filter(function (x) { return x.id === p.city; })[0];
    if (c) { try { localStorage.setItem('nlive-city', JSON.stringify({ id: c.id, en: c.en, ne: c.ne, lat: c.lat, lon: c.lon })); } catch (e) { /* storage blocked */ } }
    if (p.lang && p.lang !== NL.lang()) NL.setLang(p.lang);
  }
  function savePrefs(f) {
    var body = { name: val(f, 'name').trim(), prefs: { lang: val(f, 'lang'), theme: val(f, 'theme'), city: val(f, 'city') } };
    busy(f, true);
    api('PATCH', '/api/me', body).then(function (r) {
      S.user = r.user;
      busy(f, false);
      msg(f, 'acct-ok', t('savedOk'));
      applyPrefs(r.user.prefs);
    }).catch(function (err) { busy(f, false); msg(f, 'acct-err', errText(err)); });
  }

  /* security */
  function pwForm() {
    return '<form class="acct-card acct-form" id="pw-form"><h3 class="acct-h3">' + esc(t('changePw')) + '</h3>'
      + field('current', 'password', t('currentPw'), 'current-password', true, 200)
      + field('nextpw', 'password', t('newPw'), 'new-password', true, 200, t('pwHint'))
      + '<p class="acct-err" role="alert" hidden></p><p class="acct-ok" role="status" hidden></p>'
      + '<button class="btn" type="submit">' + esc(t('changePw')) + '</button></form>';
  }
  function delForm() {
    return '<form class="acct-card acct-form acct-danger" id="del-form"><h3 class="acct-h3">' + esc(t('deleteAcct')) + '</h3>'
      + '<p class="small muted">' + esc(t('deleteHint')) + '</p>'
      + field('password', 'password', t('confirmPw'), 'current-password', true, 200)
      + '<p class="acct-err" role="alert" hidden></p>'
      + '<button class="btn btn-danger" type="submit">' + esc(t('deleteBtn')) + '</button></form>';
  }
  function changePw(f) {
    busy(f, true);
    api('POST', '/api/me/password', { current: val(f, 'current'), next: val(f, 'nextpw') }).then(function () {
      busy(f, false); f.reset(); msg(f, 'acct-ok', t('pwChanged'));
    }).catch(function (err) { busy(f, false); msg(f, 'acct-err', errText(err, { bad_login: 'e_bad_current' })); });
  }
  function deleteAcct(f) {
    if (!window.confirm(t('deleteConfirm'))) return;
    busy(f, true);
    api('DELETE', '/api/me', { password: val(f, 'password') }).then(function () {
      S.user = null; S.saved = S.notes = null; S.flash = t('deleted');
      NL.me.load();
      authView();
      window.scrollTo({ top: 0 });
    }).catch(function (err) { busy(f, false); msg(f, 'acct-err', errText(err, { bad_login: 'e_bad_current' })); });
  }

  /* ------------------------------------------------------------------ events */
  root.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    ({ 'auth-form': submitAuth, 'alerts-form': saveAlerts, 'prefs-form': savePrefs, 'pw-form': changePw, 'del-form': deleteAcct }[f.id] || function () {})(f);
  });
  root.addEventListener('change', function (e) {
    if (e.target.id !== 'dist-add' || !e.target.value) return;
    var box = $('dist-chips'), d = e.target.value, f = e.target.form;
    e.target.value = '';
    if (box.querySelector('[data-d="' + d + '"]')) return;
    if (box.children.length >= 20) { msg(f, 'acct-err', t('maxDistricts')); return; }
    box.insertAdjacentHTML('beforeend', distChip(d));
  });
  root.addEventListener('click', function (e) {
    var el = e.target;
    var tab = el.closest('[data-tab]');
    if (tab) { S.tab = tab.getAttribute('data-tab'); history.replaceState(null, '', '/account?tab=' + S.tab + (nextUrl ? '&next=' + encodeURIComponent(nextUrl) : '')); authView(); return; }
    if (el.closest('[data-logout]')) {
      api('POST', '/api/auth/logout').finally(function () {
        S.user = null; S.saved = S.notes = null; S.flash = t('loggedOut'); S.tab = 'login';
        NL.me.load(); authView(); window.scrollTo({ top: 0 });
      });
      return;
    }
    if (el.closest('[data-seen]')) {
      api('POST', '/api/me/notifications/seen').then(function () {
        S.notes.items.forEach(function (i) { i.unread = false; }); S.notes.unread = 0; renderNotes(); NL.me.badge(0);
      }).catch(function () {});
      return;
    }
    var un = el.closest('[data-unsave]');
    if (un) {
      un.disabled = true;
      api('DELETE', '/api/me/saved?key=' + encodeURIComponent(un.getAttribute('data-unsave'))).then(function (r) {
        var keep = {};
        r.saved.forEach(function (k) { keep[k] = true; });
        S.saved = S.saved.filter(function (i) { return keep[i.key]; });
        NL.me.setSaved(r.saved);
        renderSaved();
      }).catch(function () { un.disabled = false; });
      return;
    }
    var rm = el.closest('[data-rm-dist]');
    if (rm) rm.parentNode.remove();
  });

  function boot() {
    root.innerHTML = NL.skeleton('rows');
    return api('GET', '/api/me').then(function (d) {
      S.user = d.user; S.storage = d.storage;
      if (S.user) profileView(); else authView();
      NL.feed('account', true);
    }).catch(function () { root.innerHTML = NL.errorState(t('err'), { mod: 'account' }); NL.feed('account', false); });
  }
  NL.retryHandlers.account = boot;
  NL.onLang(function () { if (S.user) profileView(); else if (S.storage) authView(); });
  NL.ticker.autoload();
  NL.renderFooter([]);
  loadCities();
  boot();
})();

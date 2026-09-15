/* ── Nutrition goals · prototype runtime ──────────────────────────────────────
   Harness + motion primitives. Motion follows skills/motion/SKILL.md:
   the four-test governing filter, the placement tiers, one arrival language,
   digit-by-digit rolling, and a modal that retraces its entrance on exit.
   Every exposed entry point is assigned to window — an inline onclick runs in
   global scope and a closure-local function fails silently (motion §5).

   v2 (2026-09-09) adds the prototype SHELL — PRD-proto-v2 group A:
     A1  no CTA may leave the prototype        · sweep(), one runtime pass
     A2  a dead CTA gets a not-allowed cursor  · cursor only, nothing else
     A3  clicking dead space flashes the live CTAs · one-shot, neutral
     A4  the controls move to bottom-centre, and gain a signed-in/out toggle
   ⛔ Every one of them is inert under ?cap= : the flash and the toggle are not
     built at all, and A1/A2 add no painted pixel (a cursor never renders into
     a frame). The capture contract is unchanged.                              */
(function () {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CAP = new URLSearchParams(location.search).get('cap');

  /* ── Tier 2 · ONE arrival motion, reused, at ITEM granularity ─────────── */
  function reveal(nodes, step) {
    nodes = [].slice.call(nodes); step = step == null ? 95 : step;
    nodes.forEach(function (n) { n.classList.add('ot-nx-enter'); });
    requestAnimationFrame(function () {
      nodes.forEach(function (n, i) {
        setTimeout(function () { n.classList.add('is-in'); }, RM ? 0 : i * step);
      });
    });
  }

  /* ── Tier 3 · digit-by-digit roll. Only changed digits move; stagger runs
        right-to-left like an odometer; non-digits stay put; a length change
        falls back to an instant swap rather than guessing.                  */
  function roll(el, next) {
    const prev = el.getAttribute('data-val') || '';
    next = String(next);
    el.setAttribute('data-val', next);
    if (RM || prev === '' || prev.length !== next.length) { el.textContent = next; return; }
    const up = (parseFloat(next.replace(/[^\d.-]/g, '')) || 0) >= (parseFloat(prev.replace(/[^\d.-]/g, '')) || 0);
    el.textContent = '';
    el.classList.add('ot-nx-roll');
    const chars = next.split('');
    const changed = chars.map(function (c, i) { return c !== prev[i]; });
    const lastIdx = chars.length - 1;
    chars.forEach(function (c, i) {
      const s = document.createElement('span');
      s.textContent = c;
      el.appendChild(s);
      if (changed[i] && /\d/.test(c)) {
        setTimeout(function () {
          s.classList.add(up ? 'is-rolling' : 'is-rolling-down');
        }, (lastIdx - i) * 26);                    // right-to-left cascade
      }
    });
  }

  function meter(el, pct, over) {
    el.classList.toggle('is-over', !!over);
    const fill = el.querySelector('i') || el.appendChild(document.createElement('i'));
    requestAnimationFrame(function () { fill.style.width = Math.min(pct, 100) + '%'; });
  }

  /* ── modal: rises in, retraces out (designer call, motion §3) ─────────── */
  function openPanel(panel) {
    let scrim = document.querySelector('.ot-nx-scrim');
    if (!scrim) { scrim = document.createElement('div'); scrim.className = 'ot-nx-scrim'; document.body.appendChild(scrim); }
    scrim.onclick = function () { closePanel(panel); };
    panel.hidden = false; scrim.hidden = false;
    requestAnimationFrame(function () { scrim.classList.add('is-in'); panel.classList.add('is-in'); });
  }
  function closePanel(panel) {
    const scrim = document.querySelector('.ot-nx-scrim');
    panel.classList.remove('is-in'); if (scrim) scrim.classList.remove('is-in');
    setTimeout(function () { panel.hidden = true; if (scrim) scrim.hidden = true; }, RM ? 0 : 260);
  }

  /* ══ SHARED STATE ═════════════════════════════════════════════════════════
     "One combined filter, two entry points, ONE FILTER STATE" (HANDOFF,
     settled decision #6) has to survive a page change, because the two entry
     points are on two different screens.

     ⛔ localStorage alone is not enough: these screens are opened from file://
     as well as from a server, and a file:// origin can refuse storage outright
     with no error. So the state travels TWO ways and either one is sufficient:
       · localStorage, when the browser allows it;
       · an ?nx= parameter that NX.href() stamps onto every link the prototype
         owns — which is the same set of links A1 leaves alive.
     A capture URL carries no ?nx=, so a captured frame always renders the
     stored state or the default — never a half-applied one.                   */
  const SKEY = 'ot-nx-state';
  let mem = null;

  /* ⛔ CAPTURE MODE IS SEALED OFF FROM STORAGE, and this is a capture-contract
     rule, not an optimisation. A ?cap= URL must render the same frame every
     time it is run — that is what lets the Figma pipeline and the lo-fi bake
     enumerate frames from prototypes.md and trust what comes back. Reading
     localStorage would make a captured frame depend on whatever the last
     person browsing this prototype happened to leave behind: the first run of
     this found restaurant.html?cap=over rendering NO meters, because an
     earlier click on another screen had stored an empty goal list. In capture
     mode the store starts empty, every screen falls back to its own declared
     default, and nothing a capture does is written back. */
  function stateGet() {
    if (mem) return mem;
    mem = {};
    if (!CAP) {
      try {
        const s = localStorage.getItem(SKEY);
        if (s) mem = JSON.parse(s) || {};
      } catch (e) { /* storage refused — the URL is the fallback */ }
    }
    const q = new URLSearchParams(location.search).get('nx');
    if (q) { try { mem = Object.assign(mem, JSON.parse(decodeURIComponent(q))); } catch (e) {} }
    return mem;
  }
  function stateSet(patch) {
    const s = stateGet();
    Object.keys(patch).forEach(function (k) { s[k] = patch[k]; });
    if (!CAP) { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {} }
    return s;
  }
  function stateClear(key) {
    const s = stateGet();
    delete s[key];
    if (!CAP) { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {} }
    return s;
  }
  /* stamp the shared state onto one of the prototype's own links */
  function href(to) {
    const s = stateGet();
    if (!Object.keys(s).length) return to;
    const [path, hash] = to.split('#');
    const j = path.indexOf('?') === -1 ? '?' : '&';
    return path + j + 'nx=' + encodeURIComponent(JSON.stringify(s)) + (hash ? '#' + hash : '');
  }
  function go(to) { location.href = href(to); }

  /* ══ A1 + A2 · NO CTA MAY LEAVE THE PROTOTYPE ═════════════════════════════
     ⛔ ONE RUNTIME PASS, never a hand edit of the ten screens. home.html alone
        carries 521 absolute opentable.com links; hand-editing them would rot
        the moment a screen is re-derived from its capture, and would destroy
        the byte-for-byte reconstruction proof in prototypes.md.
     A dead CTA is left completely alone except for the cursor (A2 / open
     decision O3): no colour, no outline, no tooltip, no disabled attribute.
     The page already carries two hover languages (prototypes.md, known
     limitation #2) and a third VISUAL one would make that worse.              */
  const SCREENS = [
    'home.html', 'home-signed-out.html',
    'search.html', 'search-signed-out.html',
    'restaurant.html', 'restaurant-signed-out.html',
    'nutrition-goals.html', 'reservations.html', 'profile.html',
    'booking-details.html', 'confirmation.html', 'booking-view.html'
  ];

  /* ══ THE DESTINATION MAP ══════════════════════════════════════════════════
     v2 treated every host link as something to kill. That was half the job:
     plenty of them point at a page this design HAS, and a restaurant card that
     does nothing is a worse demo than one that opens the restaurant screen.

     So a link is now one of three things:
       · ours     — already points at a prototype screen. Left alone.
       · mapped   — points at a real OpenTable route we have a counterpart for.
                    REWRITTEN to that counterpart, and fully clickable.
       · dead     — no counterpart exists. Cursor only (A2), nothing else.

     ⛔ Mapped, never invented. Every row below is a route the captures actually
     link to, checked against the library: `/r/<slug>` is the restaurant card
     link on home and search, `/user/dining-dashboard` is the account nav's
     Reservations, `/user/profile/edit` its Profile, `/booking/view` the
     reservation rows. What is NOT mapped is as deliberate: `/user/favorites`,
     `/user/profile/preferences`, `/user/profile/payments`, `/rewards`,
     `/concierge` and the ~300 SEO landing pages (cuisine, landmark, features,
     food-near-me, metro) have no counterpart in this prototype, so they stay
     dead rather than being pointed somewhere plausible.
     ⛔ And the 137 root-path links are NOT home: every one of them is a foreign
     locale (opentable.jp, .de, .co.uk …) in the language switcher. Only
     www.opentable.com's own root is home.                                    */
  const OT = /(^|\.)opentable\.com$/;
  const ROUTES = [
    { re: /^\/r\//,                    pick: function (o) { return o ? 'restaurant-signed-out.html' : 'restaurant.html'; } },
    { re: /^\/booking\/view/,          pick: function () { return 'booking-view.html'; } },
    { re: /^\/booking\/details/,       pick: function () { return 'booking-details.html'; } },
    { re: /^\/booking\/confirmation/,  pick: function () { return 'confirmation.html'; } },
    { re: /^\/user\/dining-dashboard/, pick: function () { return 'reservations.html'; } },
    { re: /^\/user\/profile\/edit/,    pick: function () { return 'profile.html'; } },
    { re: /^\/?$/,                     pick: function (o) { return o ? 'home-signed-out.html' : 'home.html'; } }
  ];

  function signedOutHere() {
    return /signed-out/.test(currentFile()) ||
           !!document.querySelector('[data-test="header-sign-in-button"]');
  }

  /* → 'ours' | a filename to rewrite to | null (dead) */
  function classify(a) {
    const raw = a.getAttribute('href');
    if (raw == null) return 'ours';
    if (/^(#|javascript:|mailto:|tel:)/i.test(raw.trim())) return 'ours';
    let u;
    try { u = new URL(a.href, location.href); } catch (e) { return null; }
    if (u.origin === location.origin &&
        SCREENS.indexOf(u.pathname.split('/').pop()) !== -1) return 'ours';
    if (!OT.test(u.hostname)) return null;          // adjust.com, help., foreign locales
    if (u.hostname !== 'www.opentable.com') return null;
    const out = signedOutHere();
    for (let i = 0; i < ROUTES.length; i++) {
      if (ROUTES[i].re.test(u.pathname)) return ROUTES[i].pick(out);
    }
    return null;
  }
  function killer(e) { e.preventDefault(); e.stopPropagation(); }

  function sweep() {
    [].forEach.call(document.querySelectorAll('a[href]'), function (a) {
      if (a.hasAttribute('data-nx-dead') || a.hasAttribute('data-nx-live')) return;
      const verdict = classify(a);
      if (verdict === null) {
        a.setAttribute('data-nx-dead', '');
        a.removeAttribute('target');
        a.addEventListener('click', killer);
        return;
      }
      a.setAttribute('data-nx-live', '');
      a.removeAttribute('target');                  // never open the demo in a new tab
      const to = (verdict === 'ours') ? a.getAttribute('href') : verdict;
      if (verdict !== 'ours') a.setAttribute('data-nx-mapped', verdict);
      a.addEventListener('click', function (e) {
        if (e.defaultPrevented) return;
        e.preventDefault(); e.stopPropagation();
        go(to);
      });
    });
    /* a captured <form> would post to opentable.com and blank the prototype */
    [].forEach.call(document.querySelectorAll('form:not([data-nx-dead])'), function (f) {
      f.setAttribute('data-nx-dead', '');
      f.addEventListener('submit', killer);
    });
    wireCtas();
  }

  /* ══ CTAs THAT ARE NOT LINKS ══════════════════════════════════════════════
     The captures build these as <button>, so A1 cannot reach them: the search
     submit, the time-slot chips, and the account avatar. Each is wired to the
     screen the real product would take you to.                               */
  function wireCtas() {
    const out = signedOutHere();

    // the search cluster's own submit — "Let's go" on home, "Find a table" on
    // the search and restaurant headers
    [].forEach.call(document.querySelectorAll(
      'button[aria-label="Let\u2019s go"], button[aria-label="Let\'s go"], ' +
      'button[data-test="submit-btn"], button[aria-label="Find a table"]'), function (b) {
      if (b.hasAttribute('data-nx-cta')) return;
      b.setAttribute('data-nx-cta', 'search');
      b.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        go(out ? 'search-signed-out.html' : 'search.html');
      });
    });

    // a time-slot chip is a booking: it goes to the checkout step
    [].forEach.call(document.querySelectorAll('.b7rzAE32Ds4-'), function (c) {
      if (c.hasAttribute('data-nx-cta')) return;
      c.setAttribute('data-nx-cta', 'book');
      c.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        go('booking-details.html');
      });
    });

    const av = document.querySelector('[data-test="header-user-menu"]');
    if (av && !av.hasAttribute('data-nx-cta')) {
      av.setAttribute('data-nx-cta', 'account');
      av.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        toggleUserMenu(av);
      });
    }
  }

  /* ⛔ The PS dropdown is BUILT, because the capture does not contain one — a
     SingleFile save catches the menu closed and its contents never render. So
     this is not a captured component and must not be read as one. Its items
     are the account left nav the product DOES ship (Profile · Reservations ·
     Saved Restaurants · Settings · Payment Methods), plus this design's sixth
     item, in that order. Only the ones this prototype has a screen for are
     clickable; the rest are shown and inert, because hiding them would
     misrepresent the account area as smaller than it is. */
  const ACCOUNT = [
    { label: 'Profile',           href: 'profile.html' },
    { label: 'Reservations',      href: 'reservations.html' },
    { label: 'Nutrition Goals',   href: 'nutrition-goals.html', isNew: true },
    { label: 'Saved Restaurants', href: null },
    { label: 'Settings',          href: null },
    { label: 'Payment Methods',   href: null }
  ];
  let userMenu = null;
  function toggleUserMenu(anchorEl) {
    if (userMenu && userMenu.isConnected) {
      userMenu.remove(); userMenu = null;
      anchorEl.setAttribute('aria-expanded', 'false');
      return;
    }
    userMenu = document.createElement('div');
    userMenu.className = 'ot-nx-usermenu';
    userMenu.setAttribute('role', 'menu');
    ACCOUNT.forEach(function (it) {
      const n = document.createElement(it.href ? 'button' : 'span');
      n.className = 'ot-nx-um-item' + (it.href ? '' : ' is-off');
      n.textContent = it.label;
      if (it.isNew) {
        const tag = document.createElement('span');
        tag.className = 'ot-nx-um-new';
        tag.textContent = 'New';
        n.appendChild(tag);
      }
      if (it.href) { n.type = 'button'; n.onclick = function () { go(it.href); }; }
      else n.title = 'Not part of this prototype';
      userMenu.appendChild(n);
    });
    const r = anchorEl.getBoundingClientRect();
    userMenu.style.top = (r.bottom + 8) + 'px';
    userMenu.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
    document.body.appendChild(userMenu);
    anchorEl.setAttribute('aria-expanded', 'true');
    setTimeout(function () {
      document.addEventListener('click', function once(ev) {
        if (userMenu && !userMenu.contains(ev.target) && ev.target !== anchorEl) {
          userMenu.remove(); userMenu = null;
          anchorEl.setAttribute('aria-expanded', 'false');
          document.removeEventListener('click', once, true);
        }
      }, true);
    }, 0);
  }

  /* ══ A3 · SHOW WHAT CAN BE CLICKED ════════════════════════════════════════
     Two ways in: click dead space, or press the shell's own button (ask 4).
     ⛔ Still NEUTRAL — the harm list forbids red/green valence, and an
     affordance that broke the rule this design argues for would be worse than
     no affordance. Pronounced, not coloured: a thick ring plus a dimmed page
     so the clickable things are what is left lit.                            */
  /* ⚠ NARROWED on designer feedback: a bare `button` selector was lighting up
     Mobile, For Businesses, FAQs, the language switcher and every other piece
     of OpenTable's own chrome — none of which does anything in this prototype.
     The question the control answers is "what can I click IN THIS DEMO", so
     the list is now exactly the things that actually respond: links that
     resolve to a prototype screen, the three wired non-link CTAs, and this
     design's own controls. ⛔ A dead link is never in it, by definition. */
  const LIVE_CTA = [
    'a[data-nx-live]',                    // ours, plus every host link with a counterpart
    '[data-nx-cta]',                      // search submit · time-slot chip · PS avatar
    '.ot-nx-select', '.ot-nx-sug',        // dish select, and the suggestions
    '.ot-nx-measure-chip',                // filter and goal-editor chips
    '.ot-nx-cta', '.ot-nx-inline-cta',    // our own buttons
    '#ot-nx-goals', '#ot-nx-applied-chip',
    '[data-test="label-all-filters-button"]',
    '.ot-nx-pick', '[data-nx-remove]', '[data-nx-recover]', '[data-nx-del]',
    '.ot-nx-um-item:not(.is-off)',        // the account menu, while it is open
    /* the filter modal's own controls, but only while it is open */
    '.ReactModalPortal:not([hidden]) button',
    '.ReactModalPortal:not([hidden]) select',
    '.ReactModalPortal:not([hidden]) label',
    /* the goal editor, same rule */
    '.ot-nx-goalpanel:not([hidden]) button',
    '.ot-nx-goalpanel:not([hidden]) select'
  ].join(', ');
  function flashLive() {
    const seen = [];
    [].forEach.call(document.querySelectorAll(LIVE_CTA), function (n) {
      if (n.closest('#proto-bar') || n.closest('.ot-nx-tour')) return;
      if (n.hasAttribute('data-nx-dead') || n.disabled) return;
      const r = n.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (r.bottom < 0 || r.top > window.innerHeight) return;   // only what is on screen
      seen.push(n);
    });
    document.body.classList.add('ot-nx-dimmed');
    seen.forEach(function (n) { n.classList.remove('ot-nx-flash'); });
    requestAnimationFrame(function () {
      seen.forEach(function (n) { n.classList.add('ot-nx-flash'); });
    });
    clearTimeout(flashLive._t);
    flashLive._t = setTimeout(function () {
      document.body.classList.remove('ot-nx-dimmed');
      seen.forEach(function (n) { n.classList.remove('ot-nx-flash'); });
    }, 1800);
  }
  const INTERACTIVE = 'a,button,input,select,textarea,label,summary,[role="button"],[role="dialog"],[tabindex]';
  function wireDeadSpace() {
    document.addEventListener('click', function (e) {
      if (e.target.closest('#proto-bar')) return;
      if (e.target.closest('.ot-nx-tour')) return;
      if (e.target.closest(INTERACTIVE)) return;
      flashLive();
    }, true);
  }


  function currentFile() {
    const f = location.pathname.split('/').pop();
    return f || 'home.html';
  }
  /* ══ THE PROTOTYPE CONTROLS ═══════════════════════════════════════════════
     Rebuilt 2026-09-09 to the designer's reference: one horizontal row of dark
     pills, everything visible at once, no collapsed panel to open first.
       · Signed in    — a toggle, ALWAYS visible; disabled with a stated reason
                        where the surface has no counterpart capture
       · Surface      — a dropdown of the nine surfaces, not twelve files. The
                        toggle picks the variant, so Home is one entry and not
                        two, which is how a person thinks about it
       · State        — the same dropdown treatment for the screen's states,
                        marked NEW where the state was never validated
       · two actions  — "Show what's clickable" and "What's new here", inline
       · ⓘ            — the provenance note, one tap away rather than always on
     ⛔ None of it is built under ?cap= — harness() returns before this point.  */

  /* nine surfaces, not twelve files: the auth toggle chooses the variant */
  const SURFACES = [
    { key: 'home',    label: 'Home',                     in: 'home.html',            out: 'home-signed-out.html' },
    { key: 'search',  label: 'Search results',           in: 'search.html',          out: 'search-signed-out.html' },
    { key: 'rest',    label: 'Restaurant',               in: 'restaurant.html',      out: 'restaurant-signed-out.html' },
    { key: 'book',    label: 'Complete your reservation', in: null,                  out: 'booking-details.html' },
    { key: 'conf',    label: 'Booking confirmation',     in: 'confirmation.html',    out: null },
    { key: 'after',   label: 'After the meal',           in: 'booking-view.html',    out: null },
    { key: 'goals',   label: 'Nutrition goals',          in: 'nutrition-goals.html', out: null },
    { key: 'res',     label: 'Reservations',             in: 'reservations.html',    out: null },
    { key: 'profile', label: 'Profile',                  in: 'profile.html',         out: null }
  ];
  function surfaceOf(file) {
    for (let i = 0; i < SURFACES.length; i++) {
      if (SURFACES[i].in === file || SURFACES[i].out === file) return SURFACES[i];
    }
    return null;
  }
  const NO_PAIR_REASON = {
    'booking-details.html':
      'Signed-out only — this is OpenTable’s guest checkout, which asks for no name, phone or ' +
      'email. The signed-in capture of the same step is barred: it carries real personal data.'
  };
  function whyNoPair(file, wantSignedIn) {
    if (NO_PAIR_REASON[file]) return NO_PAIR_REASON[file];
    return wantSignedIn
      ? 'Signed-out only — there is no signed-in capture of this screen.'
      : 'Signed-in only — this screen needs an account, so there is no signed-out capture to switch to.';
  }

  let bar = null, spec_ = null;

  function harness(spec) {
    /* A1/A2 run in EVERY mode, capture included: they paint nothing, and a
       capture that still held 521 live opentable.com links would be a trap. */
    sweep();

    if (CAP) {                                   // capture mode: no controls at all
      document.body.classList.add('ot-nx-capturing');
      const hit = (spec.states || []).filter(function (s) { return s.id === CAP; })[0];
      if (hit && hit.run) { try { hit.run(); } catch (e) {} }
      // ⛔ A capture must never catch a stagger mid-flight. Land every arrival
      //    immediately and freeze transitions, so a frame is the settled state.
      setTimeout(function () {
        document.querySelectorAll('.ot-nx-enter').forEach(function (n) { n.classList.add('is-in'); });
        const kill = document.createElement('style');
        kill.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
        document.head.appendChild(kill);
        document.body.setAttribute('data-nx-settled', '1');
      }, 60);
      return;
    }

    spec_ = spec;
    const file = currentFile();
    const surf = surfaceOf(file);
    const out  = /signed-out/.test(file) || file === 'booking-details.html';

    bar = document.createElement('div');
    bar.id = 'proto-bar';
    /* Three pills, not six: the three that SET something are one group, the two
       that SHOW something are another, and the note stands alone. Hairline
       dividers inside each group, so the grouping reads without six separate
       drop shadows competing along the bottom of the screen. */
    bar.innerHTML =
      '<span class="pb-caption">Prototype controls — not part of the design</span>' +
      '<div class="pb-row">' +
        '<div class="pb-pill pb-group">' +
          '<span class="pb-seg">' +
            '<span class="pb-label">Signed in</span>' +
            '<button type="button" class="pb-switch" id="pbAuth" role="switch"></button>' +
          '</span>' +
          '<span class="pb-div"></span>' +
          '<span class="pb-seg">' +
            '<span class="pb-label">Surface</span>' +
            '<select class="pb-select" id="pbSurface" aria-label="Surface"></select>' +
          '</span>' +
          '<span class="pb-div" id="pbDivState"></span>' +
          '<span class="pb-seg" id="pbStateWrap">' +
            '<span class="pb-label">State</span>' +
            '<select class="pb-select" id="pbState" aria-label="Screen state"></select>' +
          '</span>' +
        '</div>' +
        '<div class="pb-pill pb-group">' +
          '<button type="button" class="pb-seg pb-act" data-nx-act="clickable">' +
            '<b>◎</b> Show what’s clickable</button>' +
          '<span class="pb-div" id="pbDivActs"></span>' +
          '<button type="button" class="pb-seg pb-act" data-nx-act="tour">' +
            '<b>✦</b> What’s new here</button>' +
        '</div>' +
        '<button type="button" class="pb-pill pb-act pb-info" data-nx-act="note" ' +
          'aria-label="About this screen">ⓘ</button>' +
        '<button type="button" class="pb-pill pb-act pb-hide" id="pbHide" ' +
          'aria-label="Hide prototype controls" ' +
          'title="Hide prototype controls (H)">⌄</button>' +
      '</div>' +
      '<div class="pb-note" id="pbNote" hidden></div>';
    document.body.appendChild(bar);

    /* ── Hide / show ────────────────────────────────────────────────────────
       The bar is scaffolding, and a walkthrough sometimes needs the frame
       clear — the caption says "not part of the design", but the honest way to
       prove that is to be able to take it away.
       ⛔ Persisted, because every screen here is its own document: an
       un-persisted toggle would snap back on every navigation, which is the
       one thing that would make it useless in the middle of a demo. */
    const HKEY = 'ot-nx-bar-hidden';
    const show = document.createElement('button');
    show.type = 'button';
    show.id = 'proto-show';
    show.textContent = 'Prototype controls';
    show.setAttribute('aria-label', 'Show prototype controls');
    document.body.appendChild(show);

    const setBarHidden = function (on, persist) {
      bar.classList.toggle('is-hidden', on);
      show.classList.toggle('is-on', on);
      if (persist !== false) { try { localStorage.setItem(HKEY, on ? '1' : '0'); } catch (e) {} }
    };
    bar.querySelector('#pbHide').onclick = function () { setBarHidden(true); show.focus(); };
    show.onclick = function () {
      setBarHidden(false);
      const h = bar.querySelector('#pbHide');
      if (h) h.focus();
    };

    let barHidden = '0';
    try { barHidden = localStorage.getItem(HKEY) || '0'; } catch (e) {}
    setBarHidden(barHidden === '1', false);

    /* H toggles it, so the frame can be cleared without reaching for the mouse
       mid-sentence. Guarded against every field you could be typing into. */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'h' && e.key !== 'H') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (t.isContentEditable ||
                /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''))) return;
      setBarHidden(!bar.classList.contains('is-hidden'));
    });

    /* ── Signed in · always visible, disabled where impossible ────────────── */
    const sw = bar.querySelector('#pbAuth');
    const counterpart = surf ? (out ? surf.in : surf.out) : null;
    sw.setAttribute('aria-pressed', out ? 'false' : 'true');
    sw.setAttribute('aria-checked', out ? 'false' : 'true');
    if (!counterpart) {
      sw.disabled = true;
      sw.title = whyNoPair(file, out);
    } else {
      sw.title = out ? 'Switch to the signed-in capture' : 'Switch to the signed-out capture';
      sw.onclick = function () { go(counterpart); };
    }

    /* ── Surface · nine entries; the toggle picks the variant ─────────────── */
    const sel = bar.querySelector('#pbSurface');
    SURFACES.forEach(function (s) {
      const target = out ? (s.out || s.in) : (s.in || s.out);
      const o = document.createElement('option');
      o.value = target;
      o.textContent = s.label + ((out ? !s.out : !s.in) ? ' ·' : '');
      if (surf && s.key === surf.key) o.selected = true;
      sel.appendChild(o);
    });
    sel.title = 'A “·” means this surface only exists on the other side of the toggle';
    sel.onchange = function () { if (sel.value && sel.value !== file) go(sel.value); };

    /* ── State ────────────────────────────────────────────────────────────── */
    const st = bar.querySelector('#pbState');
    const states = spec.states || [];
    if (!states.length) {
      bar.querySelector('#pbStateWrap').hidden = true;
      bar.querySelector('#pbDivState').hidden = true;   // no dangling hairline
    }
    states.forEach(function (s) {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = s.label + (s.tag === 'new surface' ? '  — NEW' : '');
      st.appendChild(o);
    });
    st.onchange = function () {
      const s = states.filter(function (x) { return x.id === st.value; })[0];
      if (s && s.run) s.run();
    };

    /* ── the two actions, and the note ────────────────────────────────────── */
    bar.querySelector('[data-nx-act="clickable"]').onclick = function (e) {
      e.stopPropagation(); flashLive();
    };
    bar.querySelector('[data-nx-act="tour"]').onclick = function () {
      if (window.NX.tour) window.NX.tour.start();
    };
    const note = bar.querySelector('#pbNote');
    note.textContent = spec.note || '';
    bar.querySelector('[data-nx-act="note"]').onclick = function () {
      note.hidden = !note.hidden;
    };
    if (!spec.note) bar.querySelector('[data-nx-act="note"]').hidden = true;

    wireDeadSpace();
    setTimeout(sweep, 0);
    setTimeout(function () {
      sweep();
      if (window.NX.tour) { syncActions(); window.NX.tour.autoStart(); }
    }, 120);
  }

  function syncActions() {
    if (!bar) return;
    const b = bar.querySelector('[data-nx-act="tour"]');
    const has = window.NX.tour && window.NX.tour.has();
    b.hidden = !has;
    const d = bar.querySelector('#pbDivActs');
    if (d) d.hidden = !has;                             // no dangling hairline
    if (has) {
      const n = window.NX.tour.count();
      b.title = n + ' thing' + (n === 1 ? '' : 's') + ' this design changed on this screen';
    }
  }

  window.NX = {
    reveal: reveal, roll: roll, meter: meter,
    openPanel: openPanel, closePanel: closePanel, harness: harness,
    sweep: sweep, href: href, go: go, flash: flashLive, syncActions: syncActions,
    get: stateGet, set: stateSet, clear: stateClear,
    capturing: !!CAP
  };
  window.nxOpen = openPanel; window.nxClose = closePanel;   // reachable from inline onclick
})();

/* ── Nutrition tracker · SEARCH (combined filter) ─────────────────────────────
   ONE script, two hosts: search.html (signed-in capture) and
   search-signed-out.html (signed-out capture). Everything below is shared.
   The ONLY branch is the compare-to-your-usual section, which needs an
   account — in the signed-out host that section is absent from the markup and
   a single line sits in its place, so this file simply finds nothing to wire.

   ⛔ The filter itself no longer lives here. It moved to _filter.js so that the
   home page can open the SAME component (settled answer #4). This file owns
   only what is specific to a results page: the list, the fit lines, the
   applied chip, and D5.

   Motion follows skills/motion/SKILL.md via _proto.js:
   · fit lines arrive through NX.reveal() — the one shared arrival language,
     at ITEM granularity (one entry per card, never the list as a block)
   · hover on a card is ot-nx-hoverable — outline only, the quietest motion
     on the page, because it is the highest-frequency one
   · D1 changed the filter panel from "always open" to "opens on demand", so
     it now animates in — one language, the same one (motion §3)               */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ── which host is this? ───────────────────────────────────────────────── */
  var SIGNED_OUT = !$('[data-test="header-user-menu"]') || !!$('[data-test="header-sign-in-button"]');
  document.documentElement.setAttribute('data-nx-auth', SIGNED_OUT ? 'signed-out' : 'signed-in');

  /* ══ D5 · WHAT THIS PROTOTYPE ACTUALLY KNOWS ABOUT ITS THREE RESTAURANTS ══
     ⛔ Nothing here is invented. Every fact below is read straight off the fit
     line the prototype already shows on that card — those lines were written
     at Step 8 and reviewed. The captured library holds THREE restaurants, all
     in the same hotel (prototypes.md, known limitation #1); the designer
     accepted repeating them to make a plausible list, and repetition is all
     this does. No fourth restaurant, no cuisine, no price, no number that is
     not already on the card.

       kind A  "4 vegetarian mains, 2 of them under 600 calories. Est."
               → menu published · vegetarian known · calorie data present
       kind B  "Vegetarian options on the menu. No calorie data for this
               restaurant."
               → menu published · vegetarian known · NO numeric data
       kind C  "No menu published — we couldn't check this one"
               → nothing can be checked at all                                 */
  var FACTS = [
    { menu: true,  diets: ['Vegetarian'], data: { Calories: true } },
    { menu: true,  diets: ['Vegetarian'], data: {} },
    { menu: false, diets: [],             data: {} }
  ];
  var REPEATS = 3;                        // 3 captured cards × 3 = a plausible list

  var FIT = [
    '4 vegetarian mains, 2 of them under 600 calories. <span class="ot-nx-est">Est.</span>',
    'Vegetarian options on the menu. No calorie data for this restaurant.',
    'No menu published — we couldn\'t check this one'
  ];
  /* "Most results have no published menu" — two of the three carry it. */
  var FIT_NO_MENU = [FIT[1], FIT[2], FIT[2]];
  var FACTS_NO_MENU = [FACTS[1], FACTS[2], FACTS[2]];

  /* ux-copy §3.2 · Results · no menu group */
  var GROUP_HEAD = 'The {n} we couldn’t check';
  var GROUP_HELP = 'These restaurants haven’t published a menu, so we can’t tell whether they ' +
                   'work for you. They’re still bookable.';

  var list    = $('[data-test="restaurant-cards"]');
  var chip    = $('#ot-nx-applied-chip');
  var results = $('[data-test="restaurant-cards"]');
  var empty   = $('#ot-nx-noresults');
  /* ⛔ The headline count rolls ONLY its digits. NX.roll rebuilds its target as
     inline-flex spans, one per character, which collapses the spaces in a
     phrase — "9 restaurants available" came out as "9restaurantsavailable" the
     first time this was wired. So the number gets its own span and the words
     are left as text the roll never touches. */
  var count   = $('[data-test="multi-search-total-count"]');
  var countN  = null;
  if (count) {
    var full = count.textContent;
    var n = (full.match(/^\d+/) || ['0'])[0];
    count.textContent = '';
    countN = document.createElement('span');
    countN.textContent = n;
    countN.setAttribute('data-val', n);
    count.appendChild(countN);
    count.appendChild(document.createTextNode(full.slice(n.length)));
  }
  function setCount(n) {
    if (!countN) return;
    if (countN.getAttribute('data-val') !== String(n)) NX.roll(countN, String(n));
  }

  /* ══ the list · three captured cards, repeated ═══════════════════════════ */
  var items = [];          // { li, fit, facts, kind }

  function buildList() {
    var seed = [].slice.call(list.children);
    seed.forEach(function (li, k) {
      li.setAttribute('data-nx-kind', k);
      items.push({ li: li, fit: $('[data-nx-fit]', li), kind: k });
    });
    for (var r = 1; r < REPEATS; r++) {
      seed.forEach(function (li, k) {
        var c = li.cloneNode(true);
        c.setAttribute('data-nx-kind', k);
        /* ⛔ a clone carries the capture's ids; duplicated ids break every
           label/aria reference on the page, so they are stripped rather than
           renamed into something that looks like a second restaurant. */
        $$('[id]', c).forEach(function (n) { n.removeAttribute('id'); });
        list.appendChild(c);
        items.push({ li: c, fit: $('[data-nx-fit]', c), kind: k });
      });
    }
    items.forEach(function (it) { $$('[data-test="restaurant-card"]', it.li)
      .forEach(function (c) { c.classList.add('ot-nx-hoverable'); }); });
  }

  /* the "we couldn't check" group heading, ux-copy §3.2 */
  var groupLi = null;
  function groupHeading() {
    if (groupLi) return groupLi;
    groupLi = document.createElement('li');
    groupLi.className = 'ot-nx-group';
    groupLi.innerHTML = '<h3 class="ot-nx-group-h"></h3><p class="ot-nx-group-p">' + GROUP_HELP + '</p>';
    return groupLi;
  }

  /* ══ Tier 2 · orientation — one arrival language, per card ═══════════════ */
  function fitNodes() { return items.map(function (i) { return i.fit; }).filter(Boolean); }

  function showFits(texts) {
    items.forEach(function (it) {
      if (!it.fit) return;
      it.fit.innerHTML = texts[it.kind];
      it.fit.hidden = false;
      it.fit.classList.remove('ot-nx-enter', 'is-in');
    });
    NX.reveal(fitNodes());
  }
  function hideFits() {
    fitNodes().forEach(function (f) { f.hidden = true; f.classList.remove('ot-nx-enter', 'is-in'); });
  }

  /* ══ D5 · the filter actually changes the results ════════════════════════
     ⛔ The modal's own copy specifies the rule, so the code obeys it rather
     than inventing one: "Dietary preferences narrow the results. Numbers only
     change the order — we can't know every dish, so we never hide a
     restaurant on one."

     DIETARY → removal, but only where the answer is KNOWN. A restaurant whose
     menu we hold and which does not carry that option is removed. A restaurant
     with no published menu is NEVER removed — it drops into the "we couldn't
     check" group, which is exactly what ux-copy §3.2 describes.

     NUMERIC → ordering only, and the ordering signal is CHECKABILITY, not an
     invented per-restaurant figure. Restaurants whose menus carry data for the
     measure you set rank first, then the rest, then the ones with no menu.
     ⚠ Thin, and honestly so: the library gives exactly one measurable fact —
     kind A's "2 of them under 600 calories". So a Calories ceiling of 600 or
     more sorts; a lower one, or any other measure, has nothing to sort on and
     the order holds. Inventing a calorie count per restaurant would make the
     demo livelier and the prototype dishonest.                                */

  function known(facts, diet) { return facts.diets.indexOf(diet) !== -1; }

  function classify(facts, f) {
    if (!facts.menu) return { drop: false, tier: 2, grouped: true };   // never hidden
    var missing = f.diet.some(function (d) { return !known(facts, d); });
    if (missing) return { drop: true, tier: 3, grouped: false };
    var numeric = f.numbers.filter(function (n) { return n.v !== '' && n.v != null; });
    if (!numeric.length) return { drop: false, tier: 1, grouped: false };
    var hits = numeric.some(function (n) {
      if (!facts.data[n.m]) return false;
      /* the one fact the library actually carries */
      if (n.m === 'Calories' && n.c === 'under') return Number(n.v) >= 600;
      return false;
    });
    return { drop: false, tier: hits ? 0 : 1, grouped: false };
  }

  function applyFilter(f, factsFor) {
    factsFor = factsFor || FACTS;
    var kept = [], grouped = [];
    items.forEach(function (it) {
      var c = classify(factsFor[it.kind], f);
      it.li.hidden = c.drop;
      if (c.drop) return;
      (c.grouped ? grouped : kept).push({ it: it, tier: c.tier });
    });
    kept.sort(function (a, b) { return a.tier - b.tier; });     // stable in V8

    if (groupLi && groupLi.parentNode) groupLi.remove();
    kept.forEach(function (x) { list.appendChild(x.it.li); });
    if (grouped.length) {
      var g = groupHeading();
      $('.ot-nx-group-h', g).textContent = GROUP_HEAD.replace('{n}', grouped.length);
      list.appendChild(g);
      grouped.forEach(function (x) { list.appendChild(x.it.li); });
    }

    var shown = kept.length + grouped.length;
    setCount(shown);          // the host's own count, kept truthful about the screen
    return shown;
  }

  /* ══ the applied-criteria chip ═══════════════════════════════════════════ */
  function paintChip(f) {
    if (!chip) return;
    var s = NX.filter.summary(f);
    if (!s) { chip.hidden = true; return; }
    chip.hidden = false;
    /* the ✕ is its own node in the capture; only the text span changes */
    var text = $('.xL9gUKjZcSY-', chip);
    if (text) text.textContent = s + ' ';
    var box = $('input', chip);
    if (box) box.setAttribute('aria-label', 'Applied: ' + s + '. Remove');
  }
  /* ✕ on the chip clears the filter — the same commit path as Reset */
  if (chip) chip.addEventListener('click', function (e) {
    e.preventDefault();
    state('default');
  });

  /* ══ states ══════════════════════════════════════════════════════════════ */
  var APPLIED = { diet: ['Vegetarian'], compare: null,
                  numbers: [{ m: 'Calories', c: 'under', v: '600' },
                            { m: 'Protein',  c: 'at least', v: '45' },
                            { m: 'Carbs',    c: 'under', v: '' }] };

  function showResults(on) {
    if (results) results.hidden = !on;
    if (empty) empty.hidden = on;
    if (!on) setCount(0);
  }

  function state(id) {
    if (id === 'default') {
      var f = NX.filter.blank();
      NX.filter.set(f); NX.filter.write(f);
      paintChip(f);
      hideFits();
      applyFilter(f);
      showResults(true);
    } else if (id === 'applied' || id === 'no-menu') {
      var a = JSON.parse(JSON.stringify(APPLIED));
      NX.filter.set(a); NX.filter.write(a);
      paintChip(a);
      showResults(true);
      applyFilter(a, id === 'no-menu' ? FACTS_NO_MENU : FACTS);
      showFits(id === 'no-menu' ? FIT_NO_MENU : FIT);
    } else if (id === 'no-results') {
      state('applied');
      showResults(false);
    }
  }

  var recover = $('[data-nx-recover]');
  if (recover) recover.addEventListener('click', function () { state('applied'); });

  /* ══ D1 · the modal starts CLOSED, and the page's own control opens it ════
     The capture was taken with the panel open, so the checkbox that drives it
     arrives checked. Both are corrected here rather than in the markup.       */
  function wireOpener() {
    var box = document.getElementById('all-filters-button');
    if (box) {
      box.checked = false;
      box.addEventListener('change', function () {
        if (box.checked) { NX.filter.open(); box.checked = false; }
      });
    }
    var label = $('[data-test="label-all-filters-button"]');
    if (label) label.addEventListener('click', function (e) {
      e.preventDefault(); NX.filter.open();
    });
  }

  /* ── boot ──────────────────────────────────────────────────────────────── */
  buildList();
  NX.filter.build();
  NX.filter.close(true);                   // D1 — gone before first paint
  wireOpener();

  /* a change made in the modal — here or carried in from the home page —
     lands on the list immediately, so "one filter state" is observable. */
  NX.filter.onChange(function (f) {
    paintChip(f);
    var shown = applyFilter(f);
    showResults(shown > 0);
    if (NX.filter.isSet(f)) showFits(FIT); else hideFits();
  });

  /* the screen opens in whatever the shared state already holds — that is what
     makes the two entry points one filter. With nothing stored it opens
     applied, as it always did. */
  var carried = NX.filter.get();
  if (NX.filter.isSet(carried)) {
    NX.filter.write(carried);
    paintChip(carried);
    applyFilter(carried);
    showResults(true);
    showFits(FIT);
  } else {
    state('applied');
  }

  /* ── the walkthrough for this screen ─────────────────────────────────────── */
  if (window.NX.tour) NX.tour.define([
    { el: '[data-test="label-all-filters-button"]',
      title: 'One combined filter, not two',
      body: 'Dietary restrictions and numbers live in the same panel — you choose which apply. '
          + 'It opens closed now, and only the two nutrition sections are expanded.' },
    { el: '#ot-nx-applied-chip',
      title: 'Everything you asked for, in one chip',
      body: 'The chip states every criterion, not the first two — and the same state is what the '
          + 'home page’s third field shows.' },
    { el: function () { return document.querySelector('[data-nx-fit]:not([hidden])'); },
      title: 'Why this restaurant is here',
      body: 'A line per card saying what actually matched, and saying "Est." where the number is '
          + 'a published chain figure rather than this kitchen.' },
    { el: '.ot-nx-group',
      title: 'The ones we couldn’t check',
      body: 'A restaurant with no published menu is never removed by a dietary filter — we have '
          + 'no answer either way, so it is grouped and still bookable. Numbers never remove '
          + 'anything at all; they only change the order.' }
  ]);

  NX.harness({
    screen: 'SEARCH · COMBINED FILTER',
    states: [
      { id: 'default',    label: 'Nothing applied',                     tag: 'validated',   run: function () { state('default'); } },
      { id: 'applied',    label: 'Vegetarian + under 600 applied',      tag: 'validated',   run: function () { state('applied'); } },
      { id: 'no-menu',    label: 'Most results have no published menu', tag: 'validated',   run: function () { state('no-menu'); } },
      { id: 'no-results', label: 'Nothing matches',                     tag: 'new surface', run: function () { state('no-results'); } },
      { id: 'filter-open', label: 'Filter open — two sections expanded', tag: 'new surface', run: function () { state('applied'); NX.filter.open(); } }
    ],
    links: [
      { label: '→ Restaurant',      href: 'restaurant.html' },
      { label: '→ Home',            href: 'home.html' },
      { label: '→ Nutrition goals', href: 'nutrition-goals.html' }
    ],
    note: SIGNED_OUT
      ? 'Host lifted verbatim from the captured SIGNED-OUT search page. The only difference from the signed-in screen is the compare-to-your-usual section, which needs an account. The three captured restaurants are repeated three times — repetition, never a fourth restaurant.'
      : 'Host lifted verbatim from the captured signed-in search page. The filter now opens on demand (D1) and is the same component the home page opens. The three captured restaurants are repeated three times — repetition, never a fourth restaurant.'
  });
})();

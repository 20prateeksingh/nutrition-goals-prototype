/* ── BOOKING DETAILS · "Complete your reservation" ────────────────────────────
   PRD-proto-v2 E1 — the step that was missing between the restaurant page and
   the confirmation. Without it the flow jumped from choosing dishes straight to
   a booking that already existed, and the spine of the design — "the meal
   travels with the booking" — had a gap exactly where the booking is made.

   ⛔ SNAPSHOT GATE. Built from `booking-details-7943cc`, the capture the PRD
   names as verified clean. The other capture of this route,
   `booking-details-54fd7f`, carries a real email address and is never opened,
   copied, grepped into, or referenced by anything here.

   ⚠ AND THE PRD IS WRONG ABOUT WHICH SIDE THIS SCREEN IS ON. Its A4 table puts
   `booking-details` under "signed-in only — toggle disabled". The capture we
   are allowed to use is the SIGNED-OUT half of checkout: registry.json calls
   it "the signed-out half of OpenTable's booking checkout … with the entire
   diner-details block missing", and the page asks for no name, phone or email
   at all — identity is collected after the CTA, in a verify-to-book modal. The
   signed-in counterpart exists and is the barred one. So the toggle is
   disabled here for the opposite reason to the one the PRD gives, and that is
   what its reason line says. Recorded in BUILD-REPORT-v2.md §E1.

   ⛔ Nothing is inserted into the captured markup. The whole region is built at
   runtime, so stripping this script reproduces the capture exactly — the same
   guarantee prototypes.md's reconstruction proof rests on, obtained for free.

   Motion follows skills/motion/SKILL.md via _proto.js: one arrival language at
   item granularity, digits roll, over is a neutral hatch and never a colour.  */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ── copy · ux-copy.md §3.3 verbatim, except the one line marked NEW-v2 ─── */
  var COPY = {
    title:      'What you’re thinking of having',
    helper:     'Change any of this up to your reservation.',
    emptyTitle: 'Nothing selected yet',
    /* NEW-v2 · proposed in ux-copy.md §3.3. The composer's own empty body
       ("Select a dish or two and we'll show how the meal is shaping up")
       cannot be reused here — there is no menu on this page to select from. */
    emptyBody:  'Nothing is travelling with this booking. You can still select dishes from the menu right up to your reservation.',
    allMet:     'Everything you set is met. Adding more is fine — the suggestions just change.',
    foot:       'Est. means we’re going on published chain data, not this kitchen. Treat it as a steer, not a fact.'
  };

  var CSS = [
    '.ot-nx-bd{margin:24px 0;padding:16px;border-radius:4px;',
    '  border:.0625rem solid var(--nx-line);background:var(--nx-surface);color:var(--nx-ink)}',
    '.ot-nx-bd-ttl{margin:0;font-size:16px;line-height:22px;font-weight:600}',
    '.ot-nx-bd-sub{margin:4px 0 0;font-size:12px;line-height:16px;color:var(--nx-mut)}',
    '.ot-nx-bd-list{list-style:none;margin:12px 0 0;padding:0;',
    '  display:flex;flex-direction:column;gap:8px}',
    '.ot-nx-bd-item{display:flex;justify-content:space-between;align-items:baseline;gap:12px;',
    '  font-size:13px;line-height:18px}',
    '.ot-nx-bd-item-est{flex:0 0 auto;font-size:12px;color:var(--nx-mut)}',
    '.ot-nx-bd-meters{display:flex;flex-direction:column;gap:12px;margin-top:14px}',
    '.ot-nx-bd-empty-ttl{margin:12px 0 0;font-size:13px;line-height:18px;font-weight:600}',
    '.ot-nx-bd-empty-body{margin:4px 0 0;font-size:12px;line-height:17px;color:var(--nx-mut);max-width:52ch}',
    '.ot-nx-bd-foot{margin:14px 0 0;padding-top:10px;border-top:1px solid var(--nx-line);',
    '  font-size:11px;line-height:15px;color:var(--nx-mut)}',
    '.ot-nx-bd .ot-nx-rowtop{display:flex;justify-content:space-between;align-items:baseline;',
    '  gap:8px;font-size:13px;line-height:18px;margin-bottom:6px}',
    '.ot-nx-bd .ot-nx-val{color:var(--nx-mut);font-size:12px}'
  ].join('\n');

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ── the meal that travelled here ────────────────────────────────────────
     ⛔ Read from the shared store, never re-declared. restaurant.screen.js and
     restaurant-signed-out.screen.js publish what was selected; if nothing was,
     this screen says so and stops. It never invents a dish to look complete. */
  function meal() {
    var m = (NX.get() || {}).meal;
    return Array.isArray(m) ? m : [];
  }

  var KEY = { Calories: 'cal', Protein: 'pro', Carbs: 'carb' };
  function goalSpecs() {
    return NX.goals.get()
      .filter(function (g) { return g.v !== '' && g.v != null; })
      .map(function (g) {
        return { key: KEY[g.m] || null, label: g.m, goal: Number(g.v),
                 unit: g.m === 'Calories' ? '' : (NX.goals.units[g.m] || ''),
                 kind: g.c === 'at least' ? 'floor' : 'cap' };
      });
  }
  function isOver(g, v) { return g.kind === 'cap' && v > g.goal; }   /* ⛔ never a floor */

  function totals(list) {
    var t = { cal: 0, pro: 0, carb: 0 };
    list.forEach(function (d) {
      t.cal += (+d.cal || 0); t.pro += (+d.pro || 0); t.carb += (+d.carb || 0);
    });
    return t;
  }

  var box, listEl, metersEl, emptyTtl, emptyBody;

  function build() {
    var style = document.createElement('style');
    style.setAttribute('data-ot-nx', 'booking-details');
    style.textContent = CSS;
    document.head.appendChild(style);

    /* anchor: after the captured "Reservation details" block, before the
       opt-ins and the CTA — the meal is part of the reservation, not part of
       the marketing consents. Both anchors are captured data-test hooks, so
       this survives a re-derivation of the screen. */
    var anchor = $('[data-test="specialRequest"]') || $('[data-test="specialOccasion"]');
    var cta = $('[data-test="complete-reservation-button"]');
    if (!anchor && !cta) return false;

    box = el('section', 'ot-nx-bd');
    box.id = 'ot-nx-bd';
    box.setAttribute('aria-label', COPY.title);
    box.appendChild(el('h2', 'ot-nx-bd-ttl', COPY.title));
    box.appendChild(el('p', 'ot-nx-bd-sub', COPY.helper));
    listEl = el('ul', 'ot-nx-bd-list');
    box.appendChild(listEl);
    emptyTtl  = el('p', 'ot-nx-bd-empty-ttl', COPY.emptyTitle);
    emptyBody = el('p', 'ot-nx-bd-empty-body', COPY.emptyBody);
    box.appendChild(emptyTtl);
    box.appendChild(emptyBody);
    metersEl = el('div', 'ot-nx-bd-meters');
    box.appendChild(metersEl);
    box.appendChild(el('p', 'ot-nx-bd-foot', COPY.foot));

    /* Put it after the whole "Reservation details" row, full width.
       ⛔ Not next to the special-request field: occasion and special request
       share a two-column flex row inside the form, and the first attempt
       landed the block in that row's right-hand column at 480px, reading as a
       third form field. Walk up to whichever ancestor is a direct child of the
       <form> and insert after THAT — the row, not the field. */
    function rowOf(node) {
      var n = node;
      while (n && n.parentElement && n.parentElement.tagName !== 'FORM') n = n.parentElement;
      return (n && n.parentElement && n.parentElement.tagName === 'FORM') ? n : null;
    }
    var row = anchor ? rowOf(anchor) : null;
    if (row) row.insertAdjacentElement('afterend', box);
    else {
      var host = cta ? rowOf(cta) : null;
      if (host) host.insertAdjacentElement('beforebegin', box);
      else if (cta && cta.parentNode) cta.parentNode.insertAdjacentElement('beforebegin', box);
    }

    /* E1 · the flow closes. The captured button posts to OpenTable, which A1
       cannot help with because it is a <button>, not an anchor. */
    if (cta) cta.addEventListener('click', function (e) {
      e.preventDefault();
      NX.go('confirmation.html');
    });
    return true;
  }

  function render(animate) {
    var list = meal();
    var any = list.length > 0;

    listEl.innerHTML = '';
    list.forEach(function (d) {
      var li = el('li', 'ot-nx-bd-item');
      li.appendChild(el('span', 'ot-nx-bd-item-name', d.name));
      /* ⛔ a dish with no estimate says so — never a zero, never a guess */
      li.appendChild(el('span', 'ot-nx-bd-item-est',
        d.cal == null ? 'no nutrition data' : 'Est. ' + d.cal + ' cal'));
      listEl.appendChild(li);
    });
    listEl.hidden    = !any;
    emptyTtl.hidden  = any;
    emptyBody.hidden = any;

    var GOALS = goalSpecs();
    var t = totals(list);
    metersEl.innerHTML = '';
    /* ⛔ Meters only when BOTH a meal and a goal exist. No goal → no meter,
       exactly as on the restaurant screens (O2). No meal → nothing to measure. */
    if (any && GOALS.length) {
      GOALS.forEach(function (g) {
        var row = el('div', 'ot-nx-goalrow');
        var top = el('div', 'ot-nx-rowtop');
        top.appendChild(el('span', 'ot-nx-lab', g.label));
        var val = el('span', 'ot-nx-val');
        top.appendChild(val);
        row.appendChild(top);
        if (g.key) {
          var v = t[g.key];
          val.textContent = 'about ' + v + g.unit + ' of ' + g.goal + g.unit;
          val.setAttribute('data-val', val.textContent);
          var m = el('div', 'ot-nx-meter');
          m.appendChild(document.createElement('i'));
          row.appendChild(m);
          metersEl.appendChild(row);
          NX.meter(m, (v / g.goal) * 100, isOver(g, v));
        } else {
          val.textContent = 'we couldn’t tell';
          metersEl.appendChild(row);
        }
      });
    }

    if (animate) {
      var items = [].slice.call(listEl.children).concat([].slice.call(metersEl.children));
      items.forEach(function (n) { n.classList.remove('ot-nx-enter', 'is-in'); });
      NX.reveal(items, 55);
    }
  }

  /* ── states ──────────────────────────────────────────────────────────────
     ⛔ The dishes here are the ones the restaurant screen published. The
     harness states below WRITE that store rather than drawing a private list,
     so what this screen shows is always what actually travelled. */
  var CARRIED = [
    { name: 'Vegetarian Burger & Fries', cal: 240, pro: 26, carb: 18 },
    { name: 'Poached Sea Bass',          cal: 310, pro: 31, carb: 26 },
    { name: 'Fruit Salad with Yogurt',   cal: 120, pro: 6,  carb: 21 }
  ];

  if (!build()) return;

  /* ── the walkthrough for this screen ─────────────────────────────────────── */
  if (window.NX.tour) NX.tour.define([
    { el: '#ot-nx-bd',
      title: 'The meal travels with the booking',
      body: 'What you selected on the restaurant page is here at checkout, and carries on to the '
          + 'confirmation. Select nothing and it says so — there is no nag.' }
  ]);

  NX.harness({
    screen: 'COMPLETE YOUR RESERVATION',
    states: [
      { id: 'meal-carried', label: 'Three dishes travelled with the booking', tag: 'new surface',
        run: function () {
          NX.goals.set([{ m: 'Calories', c: 'under', v: '600' },
                        { m: 'Protein',  c: 'at least', v: '45' },
                        { m: 'Carbs',    c: 'under', v: '70' }], false);
          NX.set({ meal: CARRIED });
          render(true);
        } },
      { id: 'nothing-carried', label: 'Nothing was selected — no nag', tag: 'new surface',
        run: function () { NX.set({ meal: [] }); render(false); } },
      { id: 'no-goals', label: 'Dishes carried, no goals set — no meters', tag: 'new surface',
        run: function () { NX.goals.set([], false); NX.set({ meal: CARRIED }); render(true); } }
    ],
    links: [
      { label: '→ Restaurant',   href: 'restaurant.html' },
      { label: '→ Confirmation', href: 'confirmation.html' },
      { label: '→ Search',       href: 'search.html' }
    ],
    note: 'Host lifted verbatim from the /booking/details capture booking-details-7943cc — ' +
          'the SIGNED-OUT half of checkout, which asks for no name, phone or email. ' +
          'Nothing is inserted into the captured markup: this whole block is built at runtime. ' +
          'The signed-in capture of this route is barred (it carries a real email address), ' +
          'which is why the signed-in / signed-out toggle is disabled on this screen.'
  });

  render(true);
})();

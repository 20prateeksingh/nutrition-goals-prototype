/* ── PROFILE · the dietary preferences row gains the goals ────────────────────
   The twelfth screen, added 2026-09-09 on the designer's ask ("clicking PS …
   takes to profile page"). It closes an attachment point the design specified
   and never built: `ux-copy.md` §3.1 writes four lines for **Profile · row 3**,
   and until now nothing rendered them.

   ⛔ PERSONAL DATA — READ THIS BEFORE TOUCHING profile.html.
   `/user/profile/edit` is the one capture in the library that carries real
   personal data, and it carries TWO pieces, not the one the v2 PRD named: the
   account email AND a real mobile number. `profile.html` is built from it with
   **both values emptied** — removed, never replaced with an invented one — on
   the designer's explicit decision. Verified after the build:
     grep -nE 'prateek\.xtreme||[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' profile.html
     → no matches
   ⚠ This is therefore the ONE screen whose captured markup was edited, so
   prototypes.md's byte-for-byte reconstruction proof does not extend to it.
   The edit is two `value=""`s, the CSP fix every screen gets, and the sixth
   nav item. Nothing else.

   ⚠ AND ONE COPY DISCREPANCY, LEFT ALONE. `ux-copy.md` §3.1 writes row 3's
   first line as "Vegetarian · No red meat". The capture says "No red meat*".
   The captured value is left exactly as captured — asserting the diner is
   vegetarian on OpenTable's own row would be editing host content to match our
   copy deck rather than the other way round. Only the SECOND line is ours.   */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ux-copy.md §3.1 · Profile · row 3, verbatim */
  var COPY = {
    sub1:  'Shared with restaurants when you make a booking',
    sub2:  'Kept private. Never shared with a restaurant.',
    empty: 'Add what works for you'
  };

  NX.goals.seedIfEmpty();          // signed-in only, like the hub and the composer

  /* the dietary row: find it by its own icon, never by position */
  function dietaryRow() {
    var icon = $('[data-test="icDietary"]');
    return icon ? icon.closest('button') : null;
  }

  var row = dietaryRow();
  var body = row ? $('.C9Y00n-FCjo-', row) : null;
  var line2 = null, sub1 = null, sub2 = null;

  function build() {
    if (!body) return false;
    var p1 = $('p', body);

    sub1 = document.createElement('p');
    sub1.className = 'ot-nx-rowsub';
    sub1.textContent = COPY.sub1;
    p1.insertAdjacentElement('afterend', sub1);

    line2 = document.createElement('p');
    line2.className = 'ot-nx-rowval';
    sub1.insertAdjacentElement('afterend', line2);

    sub2 = document.createElement('p');
    sub2.className = 'ot-nx-rowsub';
    sub2.textContent = COPY.sub2;
    line2.insertAdjacentElement('afterend', sub2);

    /* ⛔ The two lines carry DIFFERENT SHARING RULES, and ia.md flagged that as
       structural rather than a caption: line 1 goes to the restaurant with the
       booking, line 2 never leaves OpenTable. They are marked as two values
       with their own sub-labels for exactly that reason. */
    row.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      NX.goals.open({ signedOut: false });
    });
    row.classList.add('ot-nx-hoverable');
    return true;
  }

  /* ux-copy §3.1 writes the goals as "Under 600 calories · at least 45g protein
     a meal out" — the same sentence, generated from whatever is actually set so
     the row cannot state a goal the diner does not have. */
  function goalLine() {
    var g = NX.goals.get().filter(function (x) { return x.v !== '' && x.v != null; });
    if (!g.length) return '';
    var parts = g.map(function (x, i) {
      var u = x.m === 'Calories' ? ' calories' : (NX.goals.units[x.m] || '');
      var head = (i === 0)
        ? x.c.charAt(0).toUpperCase() + x.c.slice(1)      // "Under 600 calories"
        : x.c;
      return head + ' ' + x.v + (x.m === 'Calories' ? '' : u) +
             (x.m === 'Calories' ? ' calories' : ' ' + x.m.toLowerCase());
    });
    return parts.join(' · ') + ' a meal out';
  }

  function paint() {
    if (!line2) return;
    var t = goalLine();
    var has = !!t;
    line2.textContent = has ? t : COPY.empty;
    line2.classList.toggle('is-empty', !has);
    sub2.hidden = !has;                 // no target, nothing to promise about it
  }

  var ok = build();
  if (ok) { paint(); NX.goals.onChange(paint); }

  /* ── the walkthrough for this screen ─────────────────────────────────────── */
  if (window.NX.tour) NX.tour.define([
    { el: function () { return row; },
      title: 'Your goals live on the row that already exists',
      body: 'OpenTable already collects dietary preferences here and shares them with the '
          + 'restaurant. The goals sit on the same row as a second line — and that one is '
          + 'never shared. Click the row to change them.' },
    { el: '.drnH8EfqDTg- li:nth-child(3)',
      title: 'Nutrition Goals, the sixth item',
      body: 'The one place this design adds to the account navigation. It is the bet the '
          + 'prototype exists to test — the alternative keeps everything inside Reservations.' }
  ]);

  NX.harness({
    screen: 'PROFILE · DIETARY PREFERENCES',
    states: [
      { id: 'default',  label: 'Goals set — two lines, two sharing rules', tag: 'new surface',
        run: function () {
          NX.goals.set([{ m: 'Calories', c: 'under', v: '600' },
                        { m: 'Protein',  c: 'at least', v: '45' }], false);
        } },
      { id: 'no-goals', label: 'No goals set yet', tag: 'new surface',
        run: function () { NX.goals.set([], false); } }
    ],
    links: [
      { label: '→ Nutrition goals', href: 'nutrition-goals.html' },
      { label: '→ Reservations',    href: 'reservations.html' },
      { label: '→ Home',            href: 'home.html' }
    ],
    note: 'Host lifted from the /user/profile/edit capture. ⛔ It is the one capture holding real ' +
          'personal data — an email AND a phone number — and BOTH were emptied to build this ' +
          'screen, on the designer’s decision. That makes it the only screen whose captured ' +
          'markup was edited, so the byte-for-byte reconstruction proof does not cover it. ' +
          'New here: the second line on the Dietary preferences row, and the sixth nav item.'
  });
})();

/* ── booking.screen.js — ONE file, two screens ────────────────────────────────
   Loaded by confirmation.html (the meal travels with the booking) and by
   booking-view.html (after the meal — confirmation and correction). It branches
   on which block is present in the document, so neither screen carries logic
   for the other.

   Motion follows skills/motion/SKILL.md, via NX only:
     · NX.reveal  — the ONE arrival language, at item granularity
     · NX.roll    — digit-by-digit, only changed digits, right-to-left cascade
     · NX.meter   — real change, never a replay; over-goal is a hatch, not a flip
   ⛔ Asymmetric increase/decrease: a correction the diner made right here earns
     the QUIETEST acknowledgment there is. No celebration, no success flourish,
     no toast, nothing that reads as pass/fail or as praise. The record simply
     says something different than it did a moment ago.                          */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  var GOAL = { cal: 600, pro: 45, carb: 70 };
  var STEP = 55;                       // stagger, item granularity

  var LINKS = [
    { label: '→ Complete your reservation', href: 'booking-details.html' },
    { label: '→ Restaurant', href: 'restaurant.html' },
    { label: '→ Nutrition goals', href: 'nutrition-goals.html' },
    { label: '→ Reservations', href: 'reservations.html' }
  ];

  function reReveal(nodes) {
    nodes.forEach(function (n) { n.classList.remove('is-in', 'ot-nx-enter'); });
    NX.reveal(nodes, STEP);
  }

  /* ═══ SCREEN 1 · BOOKING CONFIRMATION ═════════════════════════════════════
     The selected meal travels with the booking. Selecting is optional and the
     screen never nags: with nothing selected it states that, and stops.        */
  function confirmation(root) {
    var list = $('#nxDishList');
    var meters = $('#nxMeters');
    var note = $('#nxNote');
    var empty = $('#nxEmpty');
    var items = $$('.ot-nx-item', list);

    /* the shipped tile keeps its own markup; only its sub-line ever changes */
    var sub = $('[data-test="reservation-browse-menu"] .fdin6H-0X4w-');
    var SUB_SOME = sub ? sub.textContent : '';          // "3 dishes selected — change any time"
    var SUB_NONE = 'Restaurant’s profile';  // the capture’s own sub-line

    function live() { return items.filter(function (li) { return !li.hidden; }); }

    function totals() {
      var t = { cal: 0, pro: 0, carb: 0 };
      live().forEach(function (li) {
        t.cal += +li.getAttribute('data-nx-cal');
        t.pro += +li.getAttribute('data-nx-pro');
        t.carb += +li.getAttribute('data-nx-carb');
      });
      return t;
    }

    function paint(animate) {
      var t = totals();
      ['cal', 'pro', 'carb'].forEach(function (k) {
        var num = $('[data-nx-num="' + k + '"]', root);
        if (animate) { NX.roll(num, t[k]); }
        else { num.textContent = t[k]; num.setAttribute('data-val', String(t[k])); }
        /* over goal is INFORMATION, not failure — NX.meter hatches, never flips */
        NX.meter($('[data-nx-meter="' + k + '"]', root), (t[k] / GOAL[k]) * 100, t[k] > GOAL[k]);
      });
    }

    function sync(animate) {
      var none = live().length === 0;
      list.hidden = none; meters.hidden = none; note.hidden = none; empty.hidden = !none;
      if (sub) sub.textContent = none ? SUB_NONE : SUB_SOME;   // no nag in either direction
      if (!none) paint(animate);
    }

    items.forEach(function (li) {
      $('[data-nx-remove]', li).addEventListener('click', function () {
        li.classList.add('is-gone');
        setTimeout(function () { li.hidden = true; li.classList.remove('is-gone'); sync(true); }, 180);
      });
    });

    if (window.NX.tour) NX.tour.define([
      { el: '#nxMealPlan',
        title: 'The meal arrived with the booking',
        body: 'What was selected on the restaurant page is on the confirmation, and it is still '
            + 'changeable right up to the reservation.' },
      { el: '[data-test="reservation-browse-menu"]',
        title: 'An existing tile, given a job',
        body: 'The Browse menu tile is OpenTable’s own. Only its sub-line changes — it now says '
            + 'how many dishes are selected, and says nothing at all when none are.' }
    ]);

    NX.harness({
      screen: 'BOOKING CONFIRMATION',
      states: [
        { id: 'three-selected', label: 'Three dishes selected', tag: 'validated', run: function () {
            items.forEach(function (li) { li.hidden = false; li.classList.remove('is-gone'); });
            sync(false); reReveal(items);
          } },
        { id: 'none-selected', label: 'Nothing selected — no nag', tag: 'validated', run: function () {
            items.forEach(function (li) { li.hidden = true; });
            sync(false);
          } }
      ],
      links: LINKS,
      note: 'Host page is the verbatim /booking/confirmation capture. New: the Browse menu ' +
            'tile sub-line, and the block between the tiles and “Who’s going?”. ' +
            '“Who’s going?” is untouched — it is the attach point for a companion’s own goals.'
    });

    sync(false);
    reReveal(items);
  }

  /* ═══ SCREEN 2 · AFTER THE MEAL ═══════════════════════════════════════════
     States what happened, then invites a correction. It never asks the diner to
     fill anything in, never nags, and never repeats.                           */
  function bookingView(root) {
    var title = $('#nxAfterTitle');
    var body = $('#nxAfterBody');
    var rec = $('#nxRecord');
    var rName = $('#nxRecName');
    var rEst = $('#nxRecEst');
    var rCal = $('#nxRecCal');
    var rMeta = $('#nxRecMeta');
    var fix = $('#nxFix');
    var picks = $$('.ot-nx-pick');
    var lis = $$('#nxPicks > li');

    var BASE = {
      title: title.textContent, body: body.textContent,
      name: rName.textContent, cal: rCal.textContent, meta: rMeta.textContent
    };
    var WHEN = 'Wed, Sep 30';

    /* the estimate is either a rolled number between two fixed words, or a
       plain phrase where no number is honest. */
    function asNumber(v) {
      rEst.classList.remove('is-plain');
      NX.roll(rCal, v);
    }
    function asPlain(t) {
      rEst.classList.add('is-plain');
      rCal.classList.remove('ot-nx-roll');
      rCal.textContent = t;
      rCal.removeAttribute('data-val');
    }
    function asRange(t) {                       // still an estimate, just a wider one
      rEst.classList.remove('is-plain');
      rCal.classList.remove('ot-nx-roll');
      rCal.textContent = t;
      rCal.removeAttribute('data-val');
    }

    function reset() {
      title.textContent = BASE.title;
      body.textContent = BASE.body;
      rec.hidden = false; fix.hidden = false; rName.hidden = false;
      rName.textContent = BASE.name;
      rEst.classList.remove('is-plain');
      rCal.classList.remove('ot-nx-roll');
      rCal.textContent = BASE.cal;
      rCal.setAttribute('data-val', BASE.cal);
      rMeta.textContent = BASE.meta;
      picks.forEach(function (p) { p.setAttribute('aria-pressed', 'false'); });
    }

    /* ⛔ the whole acknowledgment: the written record now says something else.
       Digits roll, nothing else moves. No toast, no tick, no colour. */
    function correct(btn) {
      picks.forEach(function (p) { p.setAttribute('aria-pressed', 'false'); });
      btn.setAttribute('aria-pressed', 'true');
      var kind = btn.getAttribute('data-nx-kind');
      rec.hidden = false;
      if (kind === 'noshow') {
        rName.hidden = true;
        asPlain("We didn’t write anything");
        rMeta.textContent = 'Removed from your food app · ' + WHEN;
      } else if (kind === 'offmenu') {
        rName.hidden = false;
        rName.textContent = btn.textContent;
        asPlain('No estimate');
        rMeta.textContent = 'Updated in both places · ' + WHEN;
      } else {
        rName.hidden = false;
        rName.textContent = btn.textContent;
        asNumber(btn.getAttribute('data-nx-cal'));
        rMeta.textContent = 'Updated in both places · ' + WHEN;
      }
    }

    picks.forEach(function (p) {
      p.addEventListener('click', function () { correct(p); });
    });

    if (window.NX.tour) NX.tour.define([
      { el: '#nxRecord',
        title: 'It states what happened. It does not ask.',
        body: 'OpenTable writes the meal into your own food app and tells you what it wrote. '
            + 'Nobody is asked to log anything, and this arrives once — no reminders.' },
      { el: '#nxFix',
        title: 'And you can correct it',
        body: 'Pick what you actually had and it is fixed in both places. If confidence was too '
            + 'low to write truthfully, nothing was written and the screen says why.' }
    ]);

    NX.harness({
      screen: 'AFTER THE MEAL — BOOKING VIEW',
      states: [
        { id: 'written', label: 'Written from the dish you selected', tag: 'validated', run: function () {
            reset(); reReveal(lis);
          } },
        { id: 'low-confidence', label: "Written as a range — we’re estimating", tag: 'validated', run: function () {
            reset(); asRange('480–560'); reReveal(lis);
          } },
        { id: 'nothing-written', label: 'Nothing written, and why', tag: 'validated', run: function () {
            reset();
            title.textContent = "We didn’t write anything";
            body.textContent = 'This restaurant publishes no menu and nothing was selected, ' +
                               'so anything we wrote would be a guess.';
            rec.hidden = true;
            fix.hidden = true;      // no menu to pick from — offering one would be the guess
          } },
        { id: 'corrected', label: 'You corrected it — updated in both places', tag: 'validated', run: function () {
            reset(); reReveal(lis);
            // a beat, so the record is read before it changes
            setTimeout(function () { correct(picks[0]); }, 420);   // 520 → 240, digits only
          } }
      ],
      links: LINKS,
      note: 'ASSUMED — no snapshot of a past booking; the gap was accepted at Step 5. ' +
            'The host is the verbatim /booking/view capture of an UPCOMING reservation, ' +
            'converted here: status line, and Modify / Cancel / Add to calendar removed.'
    });

    /* ⛔ HARNESS ONLY. It sits inside #proto-harness, which body.ot-nx-capturing
       hides, so it can never reach the design canvas or a Figma capture. */
    var h = document.getElementById('proto-harness');
    if (h) {
      var flag = document.createElement('div');
      flag.className = 'ot-nx-assumed';
      flag.textContent = 'ASSUMED — no snapshot of a past booking';
      var pb = h.querySelector('.ph-body');
      pb.insertBefore(flag, pb.firstChild);
    }

    reReveal(lis);
  }

  var a = document.getElementById('nxMealPlan');
  var b = document.getElementById('nxAfter');
  if (a) { confirmation(a); } else if (b) { bookingView(b); }
})();

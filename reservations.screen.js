/* ── RESERVATIONS · separate-page variant ─────────────────────────────────────
   This screen is the control half of the design bet. In this approach the
   tracker lives on its own page, so Reservations gains exactly one thing —
   a Past reservations section — and nothing else. No progress band, no goal,
   no measures, no recommendations. The emptiness is the argument.

   Motion follows skills/motion/SKILL.md:
   · ONE arrival language (NX.reveal) at ITEM granularity — each row its own
     entry in the stagger.
   · The section CONTAINERS never animate. #upcoming-reservations and the past
     section sit flush and read as one continuous surface; fading each container
     on its own timer would visibly split that surface into two rectangles
     arriving a beat apart, which reads as a layout defect.
   · Hover is outline only (ot-nx-hoverable, in _proto.css) — no lift, no
     shadow, no scale.                                                         */
(function () {
  'use strict';

  var upcoming  = document.getElementById('upcoming-reservations');
  var past      = document.getElementById('ot-nx-past-reservations');
  var upEmpty   = document.getElementById('ot-nx-upcoming-empty');
  var pastEmpty = document.getElementById('ot-nx-past-empty');

  /* the reservation rows are the section’s own <a> children — no extra hooks
     added to the captured markup */
  function rowsOf(section) {
    return [].filter.call(section.children, function (n) {
      return n.tagName === 'A' && n.classList.contains('AHKp40iSiiM-');
    });
  }
  var upRows   = rowsOf(upcoming);
  var pastRows = rowsOf(past);

  function take(list, n) {
    list.forEach(function (row, i) { row.hidden = i >= n; });
    return list.filter(function (row) { return !row.hidden; });
  }

  /* strip first so a state change genuinely re-arrives rather than no-opping */
  function arrive(nodes) {
    nodes.forEach(function (n) { n.classList.remove('ot-nx-enter', 'is-in'); });
    NX.reveal(nodes);
  }

  function render(nUp, nPast) {
    take(upRows, nUp);
    var pastShown = take(pastRows, nPast);
    upEmpty.hidden   = nUp   > 0;
    pastEmpty.hidden = nPast > 0;
    /* content of the past section arrives; its container does not */
    arrive(nPast > 0 ? pastShown : [pastEmpty]);
  }

  render(2, 3);

  /* ── the walkthrough for this screen ─────────────────────────────────────── */
  if (window.NX.tour) NX.tour.define([
    { el: '#ot-nx-past-reservations',
      title: 'Past reservations, and nothing else',
      body: 'In this approach Reservations gains exactly one section and stays a booking page. '
          + 'No progress, no goals, no measures — the emptiness is the argument.' }
  ]);

  NX.harness({
    screen: 'RESERVATIONS · BOOKINGS ONLY',
    states: [
      { id: 'default',     label: 'Two upcoming, three past', tag: 'validated',
        run: function () { render(2, 3); } },
      { id: 'no-past',     label: 'No past reservations yet', tag: 'validated',
        run: function () { render(2, 0); } },
      { id: 'no-upcoming', label: 'Nothing upcoming',         tag: 'new surface',
        run: function () { render(0, 3); } }
    ],
    links: [
      { label: '→ Nutrition goals', href: 'nutrition-goals.html' },
      { label: '→ Home',            href: 'home.html' },
      { label: '→ Booking view',    href: 'booking-view.html' }
    ],
    note: 'In this approach Reservations holds bookings and nothing else — no progress, no goals. That separation is the bet. ASSUMED — no snapshot of a Past view; the gap was accepted at Step 5.'
  });
})();

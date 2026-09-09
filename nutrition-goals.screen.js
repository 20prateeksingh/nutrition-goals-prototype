/* ── Nutrition goals · screen logic ───────────────────────────────────────────
   Everything specific to THIS screen. The shared runtime (NX.reveal / NX.meter /
   NX.roll / NX.harness) lives in _proto.js and is not duplicated here; the goal
   editor lives in _goals.js, because home opens the same one (B3).

   Motion, per skills/motion/SKILL.md:
   · ONE arrival language — a single NX.reveal() call, at ITEM granularity. The
     measure rows, the three stat tiles and the three recommendation cards are
     peers in one stagger. No container is ever revealed as a block, and nothing
     inside the stagger carries a second entrance of its own.
   · Meters and numbers move only when the underlying figure actually changes —
     they are data motion, never a replay.
   · Nothing carries pass/fail valence. "Fitted" and "didn’t fit" are counts.

   PRD-proto-v2 group C:
     C1 the goals are editable — there was no edit path at all once they were
        set. ⛔ Ceilings and floors govern it; see setMeters().
     C2 "Connect the food app" moves up, next to the goals.                    */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  var body    = $('#nx-body');
  var empty   = $('#nx-empty');
  var connect = $('#nx-connect');

  /* ══ C2 · the connect card moves up, next to the goals ════════════════════
     It sat at the very bottom of the hub, below the recommendations. The move
     is a DOM reorder at runtime, so the captured shell is untouched.
     ⚠ The PRD asked what the move costs across all four states, so: the card
     carries its own `data-state` and its own title/body/CTA swap, and none of
     that is positional — setConnected() below is the only thing that changes
     it, and it is unchanged. What DOES change is `first-visit`, where the hub
     body is hidden entirely: the connect card is inside #nx-body, so it used
     to disappear with everything else and still does. That is right — there is
     nothing to connect a diary to before any goal exists — and it is why the
     card is moved WITHIN #nx-body rather than above it.                       */
  function moveConnectUp() {
    if (!connect || !body) return;
    var firstSection = $('.ot-nx-sec', body);       // the goals / measures block
    if (!firstSection) return;
    firstSection.insertAdjacentElement('afterend', connect);
  }

  /* the three peer groups of the ONE stagger, in reading order */
  var tiles = $$('[data-nx-tile]');
  var cards = $$('[data-nx-card]');

  var meta = $$('[data-nx-hide-on-empty]');

  /* ══ C1 · the measures are rendered FROM the goals, not hard-coded ════════
     They were static markup, which is exactly why there was no edit path: the
     screen could not have shown a fifth measure or a changed one.

     ⛔ What this prototype actually holds a month figure for is Calories,
     Protein and Carbs — the three the build already asserted. A goal on any
     other measure is real, and we have nothing to report against it, so it
     says so in the design's own words rather than rendering a zero.
     (ux-copy §2 — "we couldn’t tell", never a zero, never a silent gap.)      */
  var MONTH = {
    Calories: { pct: 75, full: '3 of 4', zero: '0 of 4', sub: 'one had no menu — not counted' },
    Protein:  { pct: 50, full: '2 of 4', zero: '0 of 4', sub: 'two were estimates' },
    Carbs:    { pct: 75, full: '3 of 4', zero: '0 of 4', sub: '' }
  };
  var UNITS = { Calories: '', Protein: 'g', Carbs: 'g', Fat: 'g',
                Fibre: 'g', Sugar: 'g', Sodium: 'mg' };

  var measuresUl = $('.ot-nx-measures');

  function renderMeasures() {
    if (!measuresUl) return;
    measuresUl.innerHTML = '';
    NX.goals.get().forEach(function (g) {
      if (g.v === '' || g.v == null) return;
      var data = MONTH[g.m];
      var li = document.createElement('li');
      li.className = 'ot-nx-measure';
      li.setAttribute('data-nx-item', '');
      /* the goal is restated beside the measure, so flipping a ceiling to a
         floor is visible HERE and not only inside the editor */
      var lab = document.createElement('div');
      lab.className = 'ot-nx-label';
      lab.textContent = g.m;
      var goal = document.createElement('span');
      goal.className = 'ot-nx-goalof';
      goal.textContent = g.c + ' ' + g.v + UNITS[g.m];
      lab.appendChild(goal);
      li.appendChild(lab);

      if (data) {
        var m = document.createElement('div');
        m.className = 'ot-nx-meter';
        m.setAttribute('data-nx-meter', '');
        m.setAttribute('data-pct', data.pct);
        /* ⛔ CEILINGS AND FLOORS. A floor can never render an over state at
           all — not a hatch, not a neutral one, nothing. On THIS screen the
           figure is "how many of your meals out fitted", a count inside a
           bounded set, so nothing can be over either way and data-over is
           false for both kinds. The kind is still written onto the node,
           because the composer on restaurant.html reads the same goals and
           there it decides what "over" means. Losing the kind here is how
           the rule gets lost again. */
        m.setAttribute('data-kind', g.c === 'at least' ? 'floor' : 'ceiling');
        m.setAttribute('data-over', 'false');
        m.appendChild(document.createElement('i'));
        li.appendChild(m);

        var v = document.createElement('div');
        v.className = 'ot-nx-val';
        v.setAttribute('data-nx-roll', '');
        v.setAttribute('data-full', data.full);
        v.setAttribute('data-zero', data.zero);
        v.textContent = data.full;
        li.appendChild(v);

        if (data.sub) {
          var s = document.createElement('div');
          s.className = 'ot-nx-sub';
          s.textContent = data.sub;
          li.appendChild(s);
        }
      } else {
        var m2 = document.createElement('div');
        m2.className = 'ot-nx-meter ot-nx-meter--unset';
        m2.setAttribute('aria-hidden', 'true');
        m2.appendChild(document.createElement('i'));
        li.appendChild(m2);
        var v2 = document.createElement('div');
        v2.className = 'ot-nx-val is-unset';
        v2.textContent = 'we couldn’t tell';        // ux-copy §2 — never a zero
        li.appendChild(v2);
      }
      measuresUl.appendChild(li);
    });
  }

  function rows() { return $$('[data-nx-item]'); }

  function setMeters(on) {
    $$('[data-nx-meter]').forEach(function (m) {
      NX.meter(m, on ? parseFloat(m.getAttribute('data-pct')) : 0,
                  m.getAttribute('data-over') === 'true');
    });
  }

  function setNumbers(on) {
    $$('[data-nx-roll]').forEach(function (n) {
      NX.roll(n, n.getAttribute(on ? 'data-full' : 'data-zero'));
    });
  }

  /* ── the arrival ─────────────────────────────────────────────────────── */

  function arrive() {
    var staggered = rows().concat(tiles).concat(cards);
    staggered.forEach(function (n) { n.classList.remove('is-in', 'ot-nx-enter'); });
    NX.reveal(staggered);          // one call, one language, item granularity
  }

  /* ── the connect card ────────────────────────────────────────────────── */

  function setConnected(on) {
    connect.setAttribute('data-state', on ? 'connected' : 'not-connected');
    // Connected copy is the evidenced status line from ux-copy §3.6 — there is
    // no separate "connected" title in the copy deck, so the status takes the
    // title slot and the pitch body steps aside.
    $('#nx-connect-title').textContent = on
      ? 'Connected · last written this morning'
      : 'Connect the food app you already use';
    $('#nx-connect-body').hidden = on;
    $('#nx-connect-cta').hidden  = on;
  }

  /* ══ C1 · the edit path ══════════════════════════════════════════════════
     "Change your goals" is ux-copy §4's own cross-reference label, reused
     rather than a new string. It opens the SAME editor the home page opens.  */
  function addEditControl() {
    var sec = $('.ot-nx-sec', body);
    if (!sec || $('#nx-edit-goals')) return;
    var h = $('.ot-nx-h2', sec);
    if (!h) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'nx-edit-goals';
    b.className = 'ot-nx-inline-cta ot-nx-hoverable ot-nx-editgoals';
    b.textContent = 'Change your goals';
    b.onclick = function () { NX.goals.open({ signedOut: false }); };
    h.insertAdjacentElement('afterend', b);
  }

  /* ── the states the harness drives ───────────────────────────────────── */

  function showFull() {
    body.hidden  = false;
    empty.hidden = true;
    meta.forEach(function (n) { n.hidden = false; });
  }

  var states = {
    'default': function () {
      renderMeasures();
      showFull();
      setConnected(false);
      setNumbers(true);            // rolls up from the zeroed first-visit figures
      setMeters(true);
      arrive();
    },
    'first-visit': function () {
      // nothing has been eaten yet, so the period line and the coverage line
      // have no figure to caveat — they step aside with the body.
      body.hidden  = true;
      empty.hidden = false;
      meta.forEach(function (n) { n.hidden = true; });
      setNumbers(false);           // zero the figures so returning actually moves
      setMeters(false);
    },
    'not-connected': function () {
      renderMeasures();
      showFull();
      setConnected(false);
      setNumbers(true);
      setMeters(true);
      arrive();
    },
    'connected': function () {
      renderMeasures();
      showFull();
      setConnected(true);
      setNumbers(true);
      setMeters(true);
      arrive();
    },
    /* C1 · the state the screen could not reach before */
    'editing': function () {
      renderMeasures();
      showFull();
      setConnected(false);
      setNumbers(true);
      setMeters(true);
      NX.goals.open({ signedOut: false });
    }
  };

  /* signed-in only, and it has always shown 600 / 45 / 70 */
  NX.goals.seedIfEmpty();

  moveConnectUp();
  addEditControl();

  var cta = $('#nx-connect-cta');
  if (cta) cta.onclick = function () { states.connected(); };
  /* the first-visit CTA now SETS the goals rather than pretending they exist */
  var setGoals = $('#nx-empty-cta');
  if (setGoals) setGoals.onclick = function () { NX.goals.open({ signedOut: false }); };

  /* an edit re-renders the measures and re-runs the arrival, so a changed goal
     is visibly a changed figure rather than a silent swap */
  NX.goals.onChange(function (list) {
    if (!list.length) { states['first-visit'](); return; }
    states['default']();
  });

  /* ── the walkthrough for this screen ─────────────────────────────────────── */
  if (window.NX.tour) NX.tour.define([
    { el: '.drnH8EfqDTg- li:nth-child(3)',
      title: 'The sixth nav item',
      body: 'The one thing this design adds to the account navigation, and the bet the prototype '
          + 'exists to test. The alternative keeps all of this inside Reservations.' },
    { el: '.ot-nx-measures',
      title: 'Discipline, not totals',
      body: '"Three of the four times you ate out this month fitted" is a complete claim about a '
          + 'bounded set. "1,400 of 2,000 calories" would not be — OpenTable sees about one meal '
          + 'in seven, which is why the coverage line above is mandatory.' },
    { el: '#nx-edit-goals',
      title: 'Goals you can change',
      body: 'Each one is a ceiling you stay inside or a floor you reach. Flip one and every meter '
          + 'in the prototype follows — a floor can never render an over state.' },
    { el: '#nx-connect',
      title: 'Your own food app does the tracking',
      body: 'OpenTable writes the restaurant meal into the diary you already keep, so nobody is '
          + 'asked to log anything. Optional — everything here works with nothing connected.' }
  ]);

  NX.harness({
    screen: 'NUTRITION GOALS · THE HUB',
    states: [
      { id: 'default',       label: 'September — four reservations', tag: 'validated', run: states['default'] },
      { id: 'first-visit',   label: 'First visit — nothing to show yet', tag: 'validated', run: states['first-visit'] },
      { id: 'not-connected', label: 'No food app connected', tag: 'validated', run: states['not-connected'] },
      { id: 'connected',     label: 'Food app connected', tag: 'validated', run: states.connected },
      { id: 'editing',       label: 'Changing your goals', tag: 'new surface', run: states.editing }
    ],
    links: [
      { label: '→ Reservations', href: 'reservations.html' },
      { label: '→ Home',         href: 'home.html' },
      { label: '→ Restaurant',   href: 'restaurant.html' }
    ],
    note: 'Host shell lifted verbatim from the captured dining dashboard. The sixth nav item and the whole card body are new — this page does not exist in the real product. The measures are rendered from the saved goals, so a goal you add appears here; where there is no month figure for it, it says so rather than showing a zero.'
  });

  // capture mode drives its own state; a normal load arrives in the default one
  if (!new URLSearchParams(location.search).get('cap')) states['default']();
})();

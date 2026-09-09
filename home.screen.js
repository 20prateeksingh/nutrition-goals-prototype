/* ── HOME · rebuilt search cluster ────────────────────────────────────────────
   ONE file serves both home.html (signed in) and home-signed-out.html.
   Signed-out is detected from the captured header itself — "Sign in" and
   "Join rewards" present, data-test="header-user-menu" absent — so neither page
   needs a flag written into it.

   What this file owns:
     · the state machine behind the three harness states
     · the "Because of where you’ve been" shelf, cloned at runtime from the
       page’s own shelf so the card component, the 236px width and the
       time-slot chips are the real ones, not a re-creation (signed in only)
     · the arrival motion for that shelf’s cards — NX.reveal at ITEM
       granularity, one entry per card, never the container as a flat fade

   What it deliberately does NOT do: animate the search cluster. The cluster is
   chrome the diner meets every single visit; animating it fails frequency-fit.

   PRD-proto-v2 group B:
     B1 the recommendation cards render their own metadata again — the fix is
        in _proto.css and this file only switches it on. ⚠ It is NOT the fix the
        PRD described; see the comment at ot-nx-cardfix below.
     B2 control 3 opens the REAL filter — the same component search opens, on
        the same state (settled answer #4)
     B3 "Set your goals" stops being a link that navigates away and becomes a
        control that sets the goal in place, signed in OR OUT (settled #2)     */
(function () {
  'use strict';

  var SIGNED_OUT = !document.querySelector('[data-test="header-user-menu"]') &&
    /Sign in/.test(document.body.textContent) && /Join rewards/.test(document.body.textContent);

  var GOALS_EMPTY = 'Add what works for you';
  var FROM_GOALS  = 'From your goals';

  /* ── B1 · the card fix ───────────────────────────────────────────────────
     ⚠ THE PRD'S DIAGNOSIS IS NOT WHAT THE MEASUREMENTS SAY, and the difference
     matters. The PRD reads the broken card as our insertion displacing the
     host's metadata out of the box. It isn't: _base-home.html — the untouched
     capture, with neither _proto.css nor _proto.js loaded — puts the
     restaurant name at 303.4px inside a 298px overflow:hidden card, with the
     name, the review count and the cuisine line ALL invisible. Removing
     .ot-nx-why from our card leaves the name at 335.5px in a 334px box: still
     clipped, by 29.5px. Our line costs 3.6px of a defect that was already
     there.
     The real cause is two EMPTY <a> siblings the capture leaves between the
     image and the card body, ~60px each, which the body then has to live
     without. Collapsing them is what the fix does — the card does not grow.
     ⚠ It is applied to the whole page, not only our shelf, because the host's
     own "Available for dinner now" shelf has the identical defect and fixing
     one would leave two card languages side by side — the failure mode
     prototypes.md #2 already records for hover. Flagged for the designer.    */
  document.body.classList.add('ot-nx-cardfix');

  function collapseVoidAnchors(root) {
    [].forEach.call((root || document).querySelectorAll('.SXYe3u6-sdM- > a'), function (a) {
      if (!a.children.length && !a.textContent.trim()) a.classList.add('ot-nx-void');
    });
  }
  collapseVoidAnchors();

  /* ── the new shelf ───────────────────────────────────────────────────────
     Cloned from the page’s own shelf, so the card component, the 236px width
     and the time-slot chips are the real ones.
     The captured home page’s shelf holds exactly TWO restaurant cards, so this
     shelf has two. The brief’s third example reason, "You’ve booked Italian
     5 times", is parked rather than used: neither captured restaurant is
     Italian, and putting it on one would be a fabricated observation.        */
  var WHY = [
    '4 mains fit your goals',
    'Quieter on a Tuesday, the night you usually go out'
  ];

  function buildShelf() {
    var src = document.querySelector('section[data-test^="lolz-scroller"]');
    if (!src) return null;

    var shelf = src.cloneNode(true);
    shelf.className += ' ot-nx-shelf';
    shelf.setAttribute('data-test', 'lolz-scroller-BecauseOfWhereYouveBeen');
    shelf.setAttribute('data-testid', 'lolz-scroller-BecauseOfWhereYouveBeen');
    var h2 = shelf.querySelector('h2');
    if (h2) h2.textContent = 'Because of where you’ve been';

    var list = shelf.querySelector('ul.FG5feEjxad8-');
    var cards = [].slice.call(list.children);
    var keep = cards.slice(0, WHY.length);
    cards.forEach(function (li) { if (keep.indexOf(li) === -1) li.remove(); });

    keep.forEach(function (li, i) {
      var why = document.createElement('div');
      why.className = 'ot-nx-why';
      why.textContent = WHY[i];
      // The reason line goes NEXT TO the captured card body, not inside it.
      // That body is height-squeezed in the capture and already clips its own
      // last rows; adding a row inside it would push the time-slot chips out
      // of the card. As a sibling, the card’s internals stay untouched and the
      // card simply grows by one line — it lands in the card’s own empty band,
      // directly above the chips.
      var body = li.querySelector('.GL0MAXz3iZA-');
      if (body && body.parentNode) body.parentNode.insertBefore(why, body);
      else if (body) body.appendChild(why);

      // hover: outline only. The captured card lifts + shadows; the CSS in the
      // page head suppresses that inside .ot-nx-shelf so hover stays quietest.
      var card = li.querySelector('.SXYe3u6-sdM-');
      if (card) card.classList.add('ot-nx-hoverable');
    });

    src.parentNode.insertBefore(shelf, src);
    return shelf;
  }

  var shelf = SIGNED_OUT ? null : buildShelf();

  /* ══ B2 · control 3 IS the filter's second entry point ════════════════════
     Settled decision #6: "one combined filter, two entry points, one filter
     state." So this control does not summarise its own idea of the filter —
     it reads NX.filter, and opens NX.filter. Change something here and search
     shows it; change it on search and this shows it.
     ⛔ The summary is EVERYTHING set, not the first two criteria (B2).        */

  function paintControl() {
    var value  = document.getElementById('ot-nx-goals-value');
    var from   = document.getElementById('ot-nx-goals-from');
    var goals  = document.getElementById('ot-nx-goals');
    if (!value || !goals) return;
    var s = NX.filter.summary();
    if (s) {
      goals.classList.remove('is-empty');
      value.textContent = s;
      /* the sub-line is a claim about PROVENANCE, so it only shows when the
         filter really did come from the saved goals */
      if (from) from.hidden = !seededFromGoals;
    } else {
      goals.classList.add('is-empty');
      value.textContent = GOALS_EMPTY;
      if (from) from.hidden = true;
    }
    if (from && !from.hidden) from.textContent = FROM_GOALS;
  }

  var seededFromGoals = false;

  /* the filter the saved goals imply — dietary preferences are the diner's
     own profile row, the numbers are the goals themselves */
  function filterFromGoals() {
    var g = NX.goals.get().filter(function (x) { return x.v !== '' && x.v != null; });
    return { diet: g.length ? ['Vegetarian'] : [], compare: null,
             numbers: g.map(function (x) { return { m: x.m, c: x.c, v: x.v }; }) };
  }

  /* ══ B3 · setting a goal in place, never by navigating away ═══════════════
     ⛔ It was `<a href="nutrition-goals.html">Set your goals</a>` — a link off
     the page — in BOTH home.html and home-signed-out.html. Settled answer #2
     makes that wrong for a signed-out visitor especially: they can set, it is
     held, and it goes onto the account when the booking flow signs them in.   */
  function wirePrompt() {
    var prompt = document.getElementById('ot-nx-prompt');
    if (!prompt) return;
    var a = prompt.querySelector('a');
    if (!a) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ot-nx-inline-cta ot-nx-hoverable';
    b.id = 'ot-nx-setgoals';
    b.textContent = a.textContent;                 // "Set your goals" — unchanged copy
    a.parentNode.replaceChild(b, a);
    b.onclick = function () { NX.goals.open({ signedOut: SIGNED_OUT }); };
  }

  function wireControl() {
    var goals = document.getElementById('ot-nx-goals');
    if (!goals) return;
    goals.addEventListener('click', function () { NX.filter.open(); });
    goals.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); NX.filter.open(); }
    });
  }

  /* ── states ──────────────────────────────────────────────────────────────
     Control 3 is the only thing that differs between them, plus whether the
     history-built shelf can exist at all.                                    */
  function apply(id) {
    var prompt = document.getElementById('ot-nx-prompt');

    if (id === 'default') {
      NX.goals.set([{ m: 'Calories', c: 'under', v: '600' },
                    { m: 'Protein',  c: 'at least', v: '45' },
                    { m: 'Carbs',    c: 'under', v: '70' }], false);
      seededFromGoals = true;
      NX.filter.set(filterFromGoals());
      if (prompt) prompt.hidden = true;
      if (shelf) shelf.hidden = false;
    } else if (id === 'no-goals') {
      NX.goals.set([], false);
      seededFromGoals = false;
      NX.filter.set(NX.filter.blank());
      if (prompt) prompt.hidden = false;          // an offer, not a barrier
      if (shelf) shelf.hidden = false;
    } else {                                       // guest
      /* ⛔ Do NOT wipe the stored goals here. A visitor must not SEE the
         account's goals (below), but deleting them would mean signing back in
         loses them — the opposite failure. Not shown ≠ not there. */
      NX.clear('guestFilter');                     // a reset is a real reset
      seededFromGoals = false;
      NX.filter.set(NX.filter.blank());
      if (prompt) prompt.hidden = true;            // a visitor is never interrupted
      if (shelf) shelf.hidden = true;              // no history to build it from
    }
    paintControl();
  }

  /* On the signed-out page the two signed-in states cannot be shown honestly —
     pre-filling control 3 there is exactly what the design forbids — so they
     hand over to the signed-in page already in that state.
     ⛔ Setting a goal IN PLACE is a different thing and stays available here:
     that is settled answer #2, and it is why the prompt is wired on both. */
  function go(id) {
    return SIGNED_OUT
      ? function () { NX.go('home.html?state=' + id); }
      : function () { apply(id); };
  }

  wirePrompt();
  wireControl();

  /* ⛔ settled answer #2, the payoff: goals set while signed out are adopted
     the moment a signed-in screen loads, and the page says so once. */
  var adopted = NX.goals.adoptIfSignedIn(SIGNED_OUT);

  NX.filter.onChange(function () {
    /* a change made HERE while signed out belongs to the visitor, so it
       survives a reload — unlike the account's own stored goals, which must
       never reach this screen. See the boot block below. */
    if (SIGNED_OUT) NX.set({ guestFilter: true });
    paintControl();
  });
  NX.goals.onChange(function () {
    seededFromGoals = true;
    NX.filter.set(filterFromGoals());
    paintControl();
    var prompt = document.getElementById('ot-nx-prompt');
    if (prompt) prompt.hidden = NX.goals.isSet();
  });

  /* ⛔ A VISITOR IS NEVER PRE-APPLIED TO — settled at Step 5 and restated in
     HANDOFF as "Signed out — nothing pre-applied".
     Carried state is honoured on the SIGNED-IN home: that is what makes the
     filter one filter across two entry points. Signed out it is not. Goals
     stored by a signed-in screen belong to the account, and showing them to a
     visitor pre-applies a target they never set — which is the single thing
     this screen exists not to do.
     The one exception is state the VISITOR set here, which settled answer #2
     requires be held: goals set while signed out carry `pending`, and a filter
     changed while signed out sets `guestFilter`. Either makes it theirs. */
  var guestOwned = NX.goals.isPending() || !!NX.get().guestFilter;
  var initial = new URLSearchParams(location.search).get('state');
  if (['default', 'no-goals', 'guest'].indexOf(initial) === -1) {
    if (SIGNED_OUT && !guestOwned) {
      initial = 'guest';
    } else if (NX.filter.isSet()) {
      seededFromGoals = NX.goals.isSet(); paintControl(); initial = null;
    } else {
      initial = SIGNED_OUT ? 'guest' : 'default';
    }
  }
  if (initial) apply(initial);

  if (adopted) {
    var note = document.createElement('p');
    note.className = 'ot-nx-adopted';
    note.textContent = NX.goals.copy.adopted;
    var cluster = document.querySelector('.ot-nx-cluster');
    if (cluster && cluster.parentNode) cluster.parentNode.insertBefore(note, cluster.nextSibling);
  }

  /* ── arrival motion · ONE language, ITEM granularity ──────────────────
     One entry per CARD — never the shelf as a single flat fade, and never a
     nested entrance inside a card that is already in the stagger. The
     selector is the card list itself, so the time-slot chips inside a card
     are not swept in as separate items.                                     */
  if (shelf) NX.reveal(shelf.querySelectorAll('ul.FG5feEjxad8- > li'));

  /* ── the walkthrough for this screen ─────────────────────────────────────── */
  if (window.NX.tour) NX.tour.define([
    { el: '#ot-nx-goals',
      title: 'A third field: what works for you',
      body: 'Date and time were merged into one control to pay for this — nothing was added to '
          + 'the search bar. It opens the same filter the search page opens, on the same state.' },
    { el: '.ot-nx-shelf',
      title: 'Because of where you’ve been',
      body: 'The brief’s third capability — recommendations from your own booking history. Each '
          + 'card says why it is here. Signed out there is no history, so the shelf is absent '
          + 'rather than empty.' },
    { el: '#ot-nx-setgoals',
      title: 'Set your goals without leaving the page',
      body: 'This used to be a link that navigated away. Signed out it still works: what you set '
          + 'is held, and goes onto your account when the booking flow signs you in.' }
  ]);

  NX.harness({
    screen: 'HOME · REBUILT SEARCH CLUSTER',
    states: [
      { id: 'default',  label: 'Signed in — goals applied',        tag: 'validated', run: go('default') },
      { id: 'no-goals', label: 'Signed in — no goals set yet',     tag: 'validated', run: go('no-goals') },
      { id: 'guest',    label: 'Signed out — nothing pre-applied', tag: 'validated', run: function () { apply('guest'); } },
      { id: 'filter-open', label: 'The filter, opened from here',  tag: 'new surface',
        run: function () { NX.filter.open(); } },
      { id: 'set-goals',   label: 'Setting goals in place',        tag: 'new surface',
        run: function () { apply('no-goals'); NX.goals.open({ signedOut: SIGNED_OUT }); } }
    ],
    links: [
      { label: '→ Search', href: 'search.html' },
      { label: '→ Nutrition goals', href: 'nutrition-goals.html' },
      { label: '→ Signed-out home', href: 'home-signed-out.html' }
    ],
    note: 'Host lifted verbatim from the captured home page. Only the search cluster and the first shelf are new. Merging date and time is what makes room for the new control — nothing was added to the cluster. Control 3 opens the same filter search opens, on the same state.'
  });
})();

/* ── _goals.js · setting and changing your goals, in ONE place ────────────────
   PRD-proto-v2 B3 and C1 are the same control seen from two screens, so it is
   built once:
     B3  home · "Set your goals" stops being a link that navigates away and
         becomes a control that sets the goal in place — signed in OR OUT
         (settled answer #2)
     C1  nutrition-goals · the goals become editable, which they were not

   ⛔ CEILINGS AND FLOORS ARE THE WHOLE POINT OF THIS FILE.
   A criterion is either a ceiling you stay inside (calories, carbs) or a floor
   you reach (protein). "Fitted your goals" is therefore not one test, and a
   FLOOR CAN NEVER RENDER AN OVER STATE — not a hatch, not a neutral one,
   nothing. There is nothing to report. This rule was found by building, the
   last time round; letting an edit control flip a measure between the two
   without carrying that through to every meter would lose it again. So the
   composer on restaurant.html reads its GOALS from here rather than holding
   its own copy.

   ⛔ Settled answer #2 · a signed-out visitor sets goals and they SURVIVE.
   Designer's words: "Let them set. They are anyway needed to sign in to
   complete the booking, when they do, we save it." So: set inline → held →
   adopted onto the account at sign-in. Never lost, never blocked behind a
   sign-in wall. `pending` is what carries that.                                */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  var MEASURES = ['Calories', 'Protein', 'Carbs', 'Fat', 'Fibre', 'Sugar', 'Sodium'];
  var UNITS = { Calories: 'cal', Protein: 'g', Carbs: 'g', Fat: 'g',
                Fibre: 'g', Sugar: 'g', Sodium: 'mg' };
  /* the only measure this design has ever written as a FLOOR (ux-copy) */
  function defaultKind(m) { return m === 'Protein' ? 'at least' : 'under'; }

  /* The goals this prototype has always shown. ⛔ Not new numbers — 600 / 45 /
     70 are the figures already on the restaurant composer, the profile row and
     the hub, so the editor starts from what the prototype already asserts. */
  var SEED = [
    { m: 'Calories', c: 'under',    v: '600' },
    { m: 'Protein',  c: 'at least', v: '45' },
    { m: 'Carbs',    c: 'under',    v: '70' }
  ];

  /* ux-copy §3.1 · Goal setup · presets. Each reuses a figure already above —
     a preset that invented a fourth number would be asserting a
     recommendation this design has no evidence for. */
  var PRESETS = [
    { label: 'Lighter meals',              items: [{ m: 'Calories', c: 'under', v: '600' }] },
    { label: 'More protein',               items: [{ m: 'Protein', c: 'at least', v: '45' }] },
    { label: 'Lower carbs',                items: [{ m: 'Carbs', c: 'under', v: '70' }] },
    { label: 'Just my dietary preferences', items: [] }
  ];

  /* ── copy · every string below is ux-copy.md §3.1 verbatim, except the two
        marked NEW-v2, which are proposed there for settled answer #2 ──────── */
  var COPY = {
    title:   'What are your goals for a meal out?',
    helper:  'Set as many or as few as you like — anything you leave out isn’t counted.',
    scope:   'Per meal out, not per day. OpenTable only sees the meals you book here.',
    presets: 'Start from one of these',
    add:     'Add',
    save:    'Save changes',
    cancel:  'Nevermind',
    /* NEW-v2 · proposed in ux-copy.md §3.1 */
    held:    'We’ll keep these while you look. When you sign in to book, they go on your account.',
    adopted: 'We kept the goals you set before you signed in.'
  };

  var panel = null;
  var draft = [];
  var hooks = [];

  /* ══ state ═══════════════════════════════════════════════════════════════ */

  /* ⛔ NOTHING is seeded by default. The first version of this file returned
     SEED when the store was empty, which made every screen behave as though
     the diner already had three goals — including restaurant-signed-out, whose
     whole contract is that a visitor who has set nothing sees no meter. A
     default that quietly asserts a target is precisely what this design
     forbids. Signed-in screens call seedIfEmpty() for themselves, because THEY
     have always shown 600 / 45 / 70; the signed-out ones never do. */
  function read() {
    var g = (NX.get() || {}).goals;
    if (!g || !g.items) return { items: [], pending: false, seeded: false };
    return { items: g.items.map(function (x) { return { m: x.m, c: x.c, v: x.v }; }),
             pending: !!g.pending, seeded: false };
  }
  function seedIfEmpty() {
    if ((NX.get() || {}).goals) return read().items;
    save(SEED.map(function (x) { return { m: x.m, c: x.c, v: x.v }; }), false);
    return read().items;
  }
  function items() { return read().items; }
  function isPending() { return read().pending; }

  function save(list, pending) {
    NX.set({ goals: { items: list, pending: !!pending } });
    hooks.forEach(function (fn) { try { fn(list); } catch (e) {} });
  }

  /* ⛔ settled answer #2, the moment it pays off: a signed-in screen finding
     goals that were set while signed out adopts them and says so once. */
  function adoptIfSignedIn(signedOut) {
    if (signedOut) return false;
    var g = read();
    if (!g.pending) return false;
    save(g.items, false);
    return true;
  }

  function summary() {
    return items().filter(function (x) { return x.v !== '' && x.v != null; })
      .map(function (x) {
        var u = UNITS[x.m] === 'cal' ? '' : UNITS[x.m];
        return x.c + ' ' + x.v + u + ' ' + x.m.toLowerCase();
      }).join(' · ');
  }
  function isSet() { return summary().length > 0; }

  /* ══ the panel ═══════════════════════════════════════════════════════════
     Uses .ot-nx-panel — the design's own modal language, already defined in
     _proto.css (rises in, retraces out). Not a second one.                    */

  function build() {
    if (panel) return panel;
    panel = document.createElement('section');
    panel.className = 'ot-nx-panel ot-nx-goalpanel';
    panel.id = 'ot-nx-goalpanel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', COPY.title);
    panel.innerHTML =
      '<div class="gp-head">' +
        '<h2 class="gp-title">' + COPY.title + '</h2>' +
        '<p class="gp-help">' + COPY.helper + '</p>' +
        '<p class="gp-scope">' + COPY.scope + '</p>' +
      '</div>' +
      '<div class="gp-body">' +
        '<h3 class="gp-sub">' + COPY.presets + '</h3>' +
        '<div class="gp-presets"></div>' +
        '<ul class="gp-rows"></ul>' +
        '<div class="ot-nx-chiprow"><span class="ot-nx-chiplabel">' + COPY.add + '</span>' +
        '<span class="ot-nx-chipset gp-chips"></span></div>' +
        '<p class="gp-held" hidden>' + COPY.held + '</p>' +
      '</div>' +
      '<div class="gp-foot">' +
        '<button type="button" class="gp-cancel ot-nx-hoverable">' + COPY.cancel + '</button>' +
        '<button type="button" class="gp-save ot-nx-hoverable">' + COPY.save + '</button>' +
      '</div>';
    document.body.appendChild(panel);

    var pw = $('.gp-presets', panel);
    PRESETS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'gp-preset ot-nx-hoverable';
      b.textContent = p.label;
      b.onclick = function () {
        draft = p.items.map(function (x) { return { m: x.m, c: x.c, v: x.v }; });
        render();
      };
      pw.appendChild(b);
    });

    $('.gp-cancel', panel).onclick = function () { closePanel(); };
    $('.gp-save', panel).onclick = function () {
      save(draft.filter(function (x) { return x.v !== '' && x.v != null; }), panel.dataset.signedOut === '1');
      closePanel();
    };
    return panel;
  }

  function rowNode(spec, i) {
    var li = document.createElement('li');
    li.className = 'gp-row';
    var opts = MEASURES.map(function (m) {
      return '<option value="' + m + '"' + (m === spec.m ? ' selected' : '') + '>' + m + '</option>';
    }).join('');
    li.innerHTML =
      '<select class="ot-nx-select gp-m" aria-label="Measure">' + opts + '</select>' +
      /* ⛔ this is the ceiling/floor control, and it is the reason C1 is not a
         cosmetic change: flipping it changes what "over" means downstream. */
      '<select class="ot-nx-select gp-c" aria-label="Ceiling or floor">' +
        '<option value="under"' + (spec.c === 'under' ? ' selected' : '') + '>under</option>' +
        '<option value="at least"' + (spec.c === 'at least' ? ' selected' : '') + '>at least</option>' +
      '</select>' +
      '<span class="ot-nx-valwrap"><input class="ot-nx-num gp-v" type="number" inputmode="numeric" ' +
        'min="0" step="5" aria-label="Value" value="' + (spec.v == null ? '' : spec.v) + '">' +
        '<span class="ot-nx-unit gp-u">' + (UNITS[spec.m] || '') + '</span></span>' +
      '<button type="button" class="ot-nx-rowdel gp-x" aria-label="Remove this goal">✕</button>';

    $('.gp-m', li).onchange = function () {
      draft[i].m = this.value;
      /* a measure change resets to that measure's own kind, then the diner can
         still flip it — never silently keep a floor on a ceiling measure */
      draft[i].c = defaultKind(this.value);
      render();
    };
    $('.gp-c', li).onchange = function () { draft[i].c = this.value; };
    $('.gp-v', li).oninput  = function () { draft[i].v = this.value; };
    $('.gp-x', li).onclick  = function () { draft.splice(i, 1); render(); };
    return li;
  }

  function render() {
    var rows = $('.gp-rows', panel);
    rows.innerHTML = '';
    draft.forEach(function (spec, i) { rows.appendChild(rowNode(spec, i)); });
    var box = $('.gp-chips', panel);
    box.innerHTML = '';
    var used = draft.map(function (d) { return d.m; });
    var free = MEASURES.filter(function (m) { return used.indexOf(m) === -1; });
    $('.ot-nx-chiprow', panel).hidden = free.length === 0;
    free.forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ot-nx-measure-chip ot-nx-hoverable';
      b.textContent = m;
      b.onclick = function () { draft.push({ m: m, c: defaultKind(m), v: '' }); render(); };
      box.appendChild(b);
    });
  }

  function openPanel(opts) {
    opts = opts || {};
    build();
    /* ⛔ A visitor opens this EMPTY. The store may hold the account's goals —
       they are kept, because signing back in must not lose them — but showing
       them to someone who is signed out would pre-fill a target they never
       set. Goals the visitor set themselves carry `pending`, and those do come
       back (settled answer #2). */
    draft = (opts.signedOut && !isPending())
      ? []
      : items().map(function (x) { return { m: x.m, c: x.c, v: x.v }; });
    panel.dataset.signedOut = opts.signedOut ? '1' : '0';
    $('.gp-held', panel).hidden = !opts.signedOut;    // settled answer #2, said out loud
    render();
    NX.openPanel(panel);
    var first = $('.gp-preset', panel);
    if (first) first.focus();
  }
  function closePanel() { if (panel) NX.closePanel(panel); }

  window.NX.goals = {
    open: openPanel, close: closePanel,
    get: items, set: save, read: read, seedIfEmpty: seedIfEmpty,
    summary: summary, isSet: isSet, isPending: isPending,
    adoptIfSignedIn: adoptIfSignedIn,
    measures: MEASURES, units: UNITS, defaultKind: defaultKind,
    copy: COPY,
    onChange: function (fn) { hooks.push(fn); }
  };
})();

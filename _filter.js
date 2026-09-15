/* ── _filter.js · the combined filter, ONE component, TWO entry points ────────
   Settled decision #6 (HANDOFF): "one combined filter, two entry points, one
   filter state". PRD-proto-v2 settled answer #4 makes that literal — the home
   page chip opens the SAME modal as search, and a change in one shows in the
   other.

   How "the same" is achieved without lying about it:
     · search.html / search-signed-out.html wire the modal THEIR OWN CAPTURE
       contains. Nothing is replaced.
     · home.html / home-signed-out.html have no filter in their capture, so
       they inject _filter-markup.js — the same markup, lifted verbatim out of
       search.html — plus _filter.css, the rules that style it, lifted the same
       way. Neither file is hand-written; both are regenerated, not edited.
     · EVERY BEHAVIOUR LIVES HERE, in this one file, for all four screens. The
       two entry points cannot diverge in what they do.
     · The state is NX.get()/NX.set(), which survives a page change (localStorage
       where the browser allows it, ?nx= on the prototype's own links where it
       does not).

   PRD-proto-v2 group D:
     D1 search opens with the modal CLOSED
     D2 opening it expands ONLY the two nutrition sections — ⛔ nothing is
        removed; "What you can eat" stays, collapsed (settled answer #1)
     D3 "+ Add a criterion" becomes chips of the measures not yet added
     D4 Reset and Apply work
     D5 dietary criteria REMOVE restaurants; numeric criteria only REORDER them
   ⛔ D5 is not a style choice — the modal's own copy says it, so the build has
     to obey it: "Dietary preferences narrow the results. Numbers only change
     the order — we can't know every dish, so we never hide a restaurant on
     one."                                                                      */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  var MEASURES = ['Calories', 'Protein', 'Carbs', 'Fat', 'Fibre', 'Sugar', 'Sodium'];
  var UNITS = { Calories: 'cal', Protein: 'g', Carbs: 'g', Fat: 'g',
                Fibre: 'g', Sugar: 'g', Sodium: 'mg' };
  /* the word the summary line uses — ux-copy §3.2 writes "under 600 calories" */
  var WORD = { Calories: 'calories', Protein: 'protein', Carbs: 'carbs', Fat: 'fat',
               Fibre: 'fibre', Sugar: 'sugar', Sodium: 'sodium' };
  /* verbatim from ux-copy.md §3.2 · Filter · relative options */
  var CMP = {
    lighter: 'Lighter than I usually pick',
    protein: 'More protein than usual',
    same:    'About the same, just keep me honest'
  };

  /* D2 · the only two groups that start open. Every other section — the
     host's Price / Seating / Neighborhoods / Accessibility AND our own
     "What you can eat" — is present and collapsed. ⛔ Nothing is removed. */
  var OPEN_ON_ENTRY = ['ot-nx-compare-group', 'ot-nx-number-group'];

  var applyHooks = [];
  var rowTemplate = null;
  var chipHost = null;
  var built = false;

  /* ══ the modal ═══════════════════════════════════════════════════════════ */

  /* ⛔ _filter.css was linked from home.html and home-signed-out.html ONLY —
     never from search.html or search-signed-out.html, which are the screens
     the modal actually opens on. Every NX rule in it (.ot-nx-radio, .ot-nx-dot,
     .ot-nx-sub, .ot-nx-tabs) was therefore inert exactly where the filter is
     used, and nothing errored: the controls rendered as bare unstyled inputs.
     Fixed HERE rather than by adding a <link> to two more captures, because
     the file that needs the stylesheet is the one that should ask for it —
     any screen that loads _filter.js now gets the rules, and a future screen
     cannot forget. */
  function ensureStyles() {
    var have = [].slice.call(document.querySelectorAll('link[rel="stylesheet"]'))
      .some(function (l) { return /(^|\/)_filter\.css(\?|$)/.test(l.getAttribute('href') || ''); });
    if (have) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = '_filter.css';
    document.head.appendChild(l);
  }
  ensureStyles();

  function modal() { return $('[data-test="multi-search-filters-modal"]'); }

  function ensure() {
    var m = modal();
    if (m) return m;
    if (!window.NX_FILTER_HTML) return null;
    var host = document.createElement('div');
    host.className = 'ot-nx-filter-host';
    host.innerHTML = window.NX_FILTER_HTML;
    document.body.appendChild(host);
    return modal();
  }

  function portal() {
    var m = modal();
    return m ? m.closest('.ReactModalPortal') : null;
  }

  /* ══ sections ════════════════════════════════════════════════════════════ */

  function sections() {
    var m = modal();
    return m ? $$('button.fsPHzMpMi90-', m) : [];
  }
  function setSection(btn, open) {
    var g = document.getElementById(btn.getAttribute('aria-controls'));
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (g) g.hidden = !open;
  }
  function collapseToEntry() {
    sections().forEach(function (b) {
      setSection(b, OPEN_ON_ENTRY.indexOf(b.getAttribute('aria-controls')) !== -1);
    });
    /* ⛔ LAST, and deliberately so. OPEN_ON_ENTRY opens both nutrition groups;
       the mode gate then closes whichever one is not in force. Run the other
       way round and the open-on-entry default silently reinstates the very
       both-at-once state this change removes. */
    applyMode(get().mode);
  }

  /* ══ state ═══════════════════════════════════════════════════════════════
     { diet: ['Vegetarian'], mode: 'compare'|'number'|null,
       compare: 'lighter'|null,
       numbers: [{ m:'Calories', c:'under'|'at least', v:'600' }] }

     ⛔ `mode` exists because the two groups were CONTRADICTORY, not additive.
     The heading already said "Or set a number" and the UI let you do both —
     a relative target ("about 20% under your usual") and an absolute one
     ("under 600") applied at once, with no rule for which wins. The summary
     line dutifully printed both. One target at a time is the only honest
     model, so the choice is now explicit and structural: whichever mode is
     not selected contributes nothing to the applied filter.

     Values on the inactive side are LEFT IN THE DOM on purpose — switching
     modes should not silently destroy numbers someone typed — but readDom()
     drops them, so they never reach the filter, the summary or the count. */

  /* ⛔ DEFAULT_MODE is not decoration. Once the switch is a pair of tabs,
     "nothing selected" stops being a state the control can express — a tab
     strip with no active tab reads as broken, not as neutral. So a mode is
     always in force, including straight after Reset. It costs nothing: a mode
     with no values in it still filters on nothing, because summary() only
     counts numbers that actually have a value. */
  var DEFAULT_MODE = 'number';

  function blank() { return { diet: [], mode: DEFAULT_MODE, compare: null, numbers: [] }; }

  function get() {
    var f = (NX.get() || {}).filter;
    if (!f) return blank();
    var mode = f.mode || null;
    /* pre-mode saved state: infer it, so an existing session doesn't open blank */
    if (!mode) mode = f.compare ? 'compare' : ((f.numbers || []).length ? 'number' : DEFAULT_MODE);
    return { diet: (f.diet || []).slice(),
             mode: mode,
             compare: f.compare || null,
             numbers: (f.numbers || []).map(function (n) { return { m: n.m, c: n.c, v: n.v }; }) };
  }
  function set(f) { NX.set({ filter: f }); notify(f); return f; }
  function notify(f) { applyHooks.forEach(function (fn) { try { fn(f); } catch (e) {} }); }

  /* ══ D3 · the numeric rows and the chips ═════════════════════════════════
     ⚠ This is the FOURTH pass at this control. Validation finding F7 asked for
     ONE deliberate decision rather than four incidental ones, and the last
     build made it worse by adding a seven-measure dropdown at build time.
     What chips change: the option set stops being hidden behind a generic
     "+ Add a criterion" and becomes visible, countable and finite. What they
     do NOT change is that the seven measures are still an unevidenced list.
     Read BUILD-REPORT-v2.md §D3 before treating F7 as discharged.             */

  function numberGroup() { return document.getElementById('ot-nx-number-group'); }
  function rows() { return $$('[data-nx-row]', numberGroup()); }

  function unitOf(measure) { return UNITS[measure] || ''; }

  function makeRow(spec) {
    var li = rowTemplate.cloneNode(true);
    var m = $('.ot-nx-measure', li);
    var c = $('.ot-nx-compare', li);
    var v = $('.ot-nx-num', li);
    m.value = spec.m;
    c.value = spec.c || 'under';
    v.value = spec.v == null ? '' : spec.v;
    if (!v.value) v.setAttribute('placeholder', '—');
    $('[data-nx-unit]', li).textContent = unitOf(spec.m);
    wireRow(li);
    return li;
  }

  function wireRow(li) {
    var m = $('.ot-nx-measure', li);
    var c = $('.ot-nx-compare', li);
    var v = $('.ot-nx-num', li);
    var d = $('[data-nx-del]', li);
    if (m) m.onchange = function () {
      $('[data-nx-unit]', li).textContent = unitOf(m.value);
      commitFromDom();
    };
    if (c) c.onchange = commitFromDom;
    if (v) v.oninput = commitFromDom;
    /* ⛔ a row can always be removed, including the last one. The chips make
       re-adding it one click, so there is no reason to trap the diner in a
       criterion they no longer want — which the old "keep at least one" rule
       did. */
    if (d) d.onclick = function () { li.remove(); commitFromDom(); };
  }

  function renderRows(f) {
    var g = numberGroup();
    if (!g || !rowTemplate) return;
    rows().forEach(function (r) { r.remove(); });
    var first = chipHost || $('.ot-nx-note', g).closest('li');
    f.numbers.forEach(function (spec) { g.insertBefore(makeRow(spec), first); });
    renderChips(f);
  }

  function renderChips(f) {
    if (!chipHost) return;
    var used = f.numbers.map(function (n) { return n.m; });
    var free = MEASURES.filter(function (m) { return used.indexOf(m) === -1; });
    chipHost.hidden = free.length === 0;       // nothing left to add — say nothing
    var box = $('.ot-nx-chipset', chipHost);
    box.innerHTML = '';
    free.forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ot-nx-measure-chip ot-nx-hoverable';
      b.setAttribute('data-nx-chip', m);
      b.textContent = m;
      b.onclick = function () {
        var cur = readDom();
        /* Protein is the only measure the design has ever written as a FLOOR
           (ux-copy — ceilings and floors). Everything else defaults to a
           ceiling, and the row's own control can change it either way. */
        cur.numbers.push({ m: m, c: m === 'Protein' ? 'at least' : 'under', v: '' });
        set(cur); write(cur);
      };
      box.appendChild(b);
    });
  }

  /* ══ DOM ⇄ state ═════════════════════════════════════════════════════════ */

  function readDom() {
    var m = modal();
    if (!m) return get();
    var f = blank();
    $$('[data-nx-diet]', m).forEach(function (i) { if (i.checked) f.diet.push(i.value); });

    var md = $$('[data-nx-mode]', m).filter(function (r) { return r.checked; })[0];
    f.mode = md ? md.value : null;

    /* ⛔ The mode gate. Read BOTH sides off the DOM so nothing typed is lost,
       then keep only the side the diner actually chose. This is the single
       place the exclusivity is enforced — every consumer (summary, counts,
       the applied chip, the search screen) reads `f`, so none of them can
       disagree about which target is in force. */
    var c = $$('[data-nx-cmp]', m).filter(function (r) { return r.checked; })[0];
    if (f.mode === 'compare') f.compare = c ? c.value : null;

    if (f.mode === 'number') {
      rows().forEach(function (r) {
        f.numbers.push({ m: $('.ot-nx-measure', r).value,
                         c: $('.ot-nx-compare', r).value,
                         v: $('.ot-nx-num', r).value });
      });
    }
    return f;
  }

  function write(f) {
    var m = modal();
    if (!m) return;
    $$('[data-nx-diet]', m).forEach(function (i) { i.checked = f.diet.indexOf(i.value) !== -1; });
    $$('[data-nx-mode]', m).forEach(function (r) { r.checked = (r.value === f.mode); });
    $$('[data-nx-cmp]', m).forEach(function (r) { r.checked = (r.value === f.compare); });
    renderRows(f);
    applyMode(f.mode);
    counts(f);
  }

  /* Show only the chosen mode's controls. The other group is hidden rather
     than disabled: a dimmed group full of live-looking values is exactly the
     ambiguity this change exists to remove. */
  function applyMode(mode) {
    var pairs = [
      { mode: 'compare', btn: 'ot-nx-compare-button', grp: 'ot-nx-compare-group' },
      { mode: 'number',  btn: 'ot-nx-number-button',  grp: 'ot-nx-number-group'  }
    ];
    pairs.forEach(function (p) {
      var on = (mode === p.mode);
      [p.btn, p.grp].forEach(function (id) {
        var n = document.getElementById(id);
        if (n) n.hidden = !on;
      });
    });
  }

  function commitFromDom() {
    var f = readDom();
    set(f);
    /* ⛔ The mode has to be re-applied on every commit, not just on open.
       commitFromDom() is what the mode radios fire, and without this the
       state flipped correctly while the panel kept showing the old group —
       the filter would have said one thing and shown another, which is the
       exact failure this whole change is meant to remove. */
    applyMode(f.mode);
    counts(f);
    renderChips(f);
  }

  function counts(f) {
    var d = $('[data-test="ot-nx-diet-count"]');
    if (d) d.textContent = f.diet.length ? '(' + f.diet.length + ')' : '(all)';
    var n = $('[data-test="ot-nx-number-count"]');
    /* only the mode in force counts — a stale "(2)" from a previous session's
       numbers, sitting above a compare target, is the old contradiction
       leaking back out through the badge */
    var live = (f.mode === 'number') ? f.numbers : [];
    var set_ = live.filter(function (x) { return x.v !== '' && x.v != null; }).length;
    if (n) n.textContent = set_ ? '(' + set_ + ')' : '(all)';
  }

  /* ══ B2 · the summary ════════════════════════════════════════════════════
     ⛔ EVERYTHING set, not the first two. The middot form is ux-copy §3.2's
     applied chip ("Vegetarian · under 600 calories"), extended rather than
     re-invented.                                                              */
  function summary(f) {
    f = f || get();
    var bits = [];
    f.diet.forEach(function (d) { bits.push(d); });
    if (f.compare && CMP[f.compare]) bits.push(CMP[f.compare]);
    f.numbers.forEach(function (n) {
      if (n.v === '' || n.v == null) return;
      var unit = unitOf(n.m);
      bits.push(n.c + ' ' + n.v + (unit === 'cal' ? '' : unit) + ' ' + WORD[n.m]);
    });
    return bits.join(' · ');
  }
  function isSet(f) { return summary(f).length > 0; }

  /* ══ open / close ════════════════════════════════════════════════════════
     The modal keeps the capture's own chrome; the arrival is the page's one
     language (rises in, retraces out — motion §3), applied to the captured
     nodes rather than to a second panel of ours.                              */

  /* ══ THE BODY LOCK ════════════════════════════════════════════════════════
     ⛔ BOTH SEARCH CAPTURES WERE TAKEN WITH THE FILTER OPEN, so their <body>
     arrives carrying `class="ReactModal__Body--open"` AND an inline
     `style="position:fixed;overflow-y:scroll"` — React's own scroll lock,
     frozen into the snapshot. D1 closes the modal at boot, and the lock stayed:
     the results page could not be scrolled at all, on the one screen that has
     a long list. Removing the class is not enough — the inline position is
     what does it, and inline beats every stylesheet.
     So the lock is now OWNED here: cleared whenever the modal is closed,
     re-applied whenever it is opened. On the home page there is nothing to
     clear and applying it is simply correct — a modal should stop the page
     behind it scrolling.                                                      */
  function lockBody(on) {
    var b = document.body;
    b.classList.toggle('ot-nx-filter-open', !!on);
    b.classList.toggle('ReactModal__Body--open', !!on);
    b.style.position  = on ? 'fixed' : '';
    b.style.overflowY = on ? 'scroll' : '';
  }

  function open() {
    var m = ensure();
    if (!m) return;
    build();
    write(get());
    collapseToEntry();                 // D2 — every time it is opened, not just once
    var p = portal();
    p.hidden = false;
    lockBody(true);
    requestAnimationFrame(function () { p.classList.add('is-in'); });
    var first = $('button.fsPHzMpMi90-', m);
    if (first) first.focus();
  }

  /* `instant` skips the exit animation. D1 uses it at boot: the capture was
     taken with the panel open, so the modal has to be gone before first paint
     rather than fading out of a screen it was never meant to be on.
     ⛔ The timeout re-checks `is-in` before hiding. Without that, a close
     scheduled at boot lands 260ms later and slams shut a modal the diner
     opened in between — which is exactly what happened the first time this
     was tested. */
  function close(instant) {
    var p = portal();
    if (!p) return;
    p.classList.remove('is-in');
    lockBody(false);
    if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      p.hidden = true;
      return;
    }
    setTimeout(function () {
      if (!p.classList.contains('is-in')) p.hidden = true;
    }, 260);
  }

  function isOpen() {
    var p = portal();
    return !!p && !p.hidden;
  }

  /* ══ wiring ══════════════════════════════════════════════════════════════ */

  /* ══ the mode switch ═════════════════════════════════════════════════════
     Built here rather than written into _filter-markup.js, so that file stays
     "the capture plus the two groups" and this one structural addition is
     reviewable in a single place.
     Placed ABOVE both groups because it governs both — and the label reuses
     the deck's own phrase ("what you're going for") rather than inventing a
     second vocabulary for the same idea. */
  /* ⛔ ORDER IS THE DEFAULT. "A number you set" is first and starts selected:
     it is the mode that works for everyone, whereas comparing needs a history
     the diner may not have yet. Leading with the mode that can fail is how you
     open a filter on a dead end.
     The labels are shortened from the section headings below — a tab is a
     handle, not a sentence, and "Compared with how you usually eat out" cannot
     be one. The full phrase survives verbatim on the section header, so
     nothing is lost; the sub-lines are dropped because a two-line tab is a
     radio wearing a costume. */
  var MODES = [
    { v: 'number',  t: 'A number you set' },
    { v: 'compare', t: 'Compared with your usual' }
  ];

  function buildModeSwitch(m) {
    if (document.getElementById('ot-nx-mode-group')) return;
    var anchor = document.getElementById('ot-nx-compare-button');
    if (!anchor || !anchor.parentNode) return;

    /* a div, not a button: sections() selects `button.fsPHzMpMi90-`, and the
       control that decides what the other sections DO must not itself be
       collapsible. The class is reused only for the header's layout. */
    var head = document.createElement('div');
    head.className = 'fsPHzMpMi90- ot-nx-modehead';
    head.innerHTML = '<div class="bSwSaaUFI34-">' +
      '<h5 id="ot-nx-mode-name" class="Hl6ZEdQQYmo-">What you’re going for</h5></div>';

    /* ⚠ Styled as tabs, but still a RADIO GROUP underneath — not role="tab".
       This picks which control you fill in; it does not page between views of
       the same thing. Radios also get arrow-key navigation and the one-of-many
       announcement from the browser for free, where an ARIA tablist would mean
       hand-rolling the keyboard behaviour and getting it subtly wrong. */
    var tabs = document.createElement('div');
    tabs.id = 'ot-nx-mode-group';
    tabs.className = 'ot-nx-tabs';
    tabs.setAttribute('role', 'radiogroup');
    tabs.setAttribute('aria-labelledby', 'ot-nx-mode-name');
    tabs.innerHTML = MODES.map(function (o) {
      return '<label class="ot-nx-tab">' +
        '<input type="radio" name="ot-nx-mode" value="' + o.v + '" data-nx-mode="">' +
        '<span>' + o.t + '</span></label>';
    }).join('');

    anchor.parentNode.insertBefore(head, anchor);
    anchor.parentNode.insertBefore(tabs, anchor);

    /* "Or set a number" was the old model apologising for the conflict in
       copy. The radio states it structurally now, so the word can go. */
    var nh = document.getElementById('ot-nx-number-button-name');
    if (nh && /^Or\s/.test(nh.textContent || '')) nh.textContent = 'Set a number';

    /* Check one immediately. write() would get here eventually, but "eventually"
       leaves a tab strip with no active tab on screen in between, which is the
       one state this control must never show. */
    var cur = get().mode || DEFAULT_MODE;
    $$('[data-nx-mode]', m).forEach(function (r) {
      r.checked = (r.value === cur);
      r.onchange = commitFromDom;
    });
    applyMode(cur);
  }

  function build() {
    if (built) return;
    var m = modal();
    if (!m) return;
    built = true;

    buildModeSwitch(m);

    var g = numberGroup();
    if (g) {
      /* the first captured row becomes the template every row is made from */
      var r0 = $('[data-nx-row]', g);
      if (r0) {
        rowTemplate = r0.cloneNode(true);
        rowTemplate.removeAttribute('hidden');
      }
      /* D3 · the add BUTTON is replaced by the chip set, in the same slot */
      var addLi = $('[data-nx-add]', g);
      addLi = addLi ? addLi.closest('li') : null;
      if (addLi) {
        addLi.innerHTML =
          '<div class="ot-nx-chiprow"><span class="ot-nx-chiplabel">Add</span>' +
          '<span class="ot-nx-chipset"></span></div>';
        chipHost = addLi;
      }
    }

    sections().forEach(function (b) {
      b.onclick = function () {
        setSection(b, b.getAttribute('aria-expanded') === 'false');
      };
    });

    $$('[data-nx-diet]', m).forEach(function (i) { i.onchange = commitFromDom; });
    $$('[data-nx-cmp]', m).forEach(function (r) { r.onchange = commitFromDom; });

    /* D4 · Reset clears EVERY criterion in the modal — ours and the host's */
    var reset = $('#reset', m);
    if (reset) reset.onclick = function () {
      $$('input[type="checkbox"]', m).forEach(function (i) { i.checked = false; });
      $$('input[type="radio"]', m).forEach(function (r) { r.checked = false; });
      var f = blank();
      set(f); write(f);
    };

    /* D4 · Apply closes the modal and commits — the state is already live, so
       "commit" means: tell every screen that is listening, then leave. */
    var submit = $('#submit', m);
    if (submit) submit.onclick = function () {
      var f = readDom();
      set(f);
      close();
    };

    /* the scrim closes it, matching every other dismissable surface here */
    var overlay = $('.QC0z4PpKUqI-');
    if (overlay) overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) close();
    });

    /* the sign-in offer defers to the header's own entry point (house rule) */
    var signin = $('[data-nx-signin]', m);
    if (signin) signin.onclick = function (e) {
      e.preventDefault();
      var real = $('[data-test="header-sign-in-button"]');
      if (real) { real.focus(); real.click(); }
    };
  }

  window.NX.filter = {
    ensure: ensure, build: build, open: open, close: close, isOpen: isOpen,
    get: get, set: set, write: write, blank: blank,
    summary: summary, isSet: isSet, measures: MEASURES, units: UNITS,
    collapseToEntry: collapseToEntry,
    onChange: function (fn) { applyHooks.push(fn); }
  };
})();

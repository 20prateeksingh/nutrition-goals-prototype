/* ── RESTAURANT · menu + composer ─────────────────────────────────────────────
   Screen logic for restaurant.html. The host page is a verbatim capture of the
   real OpenTable restaurant profile — nothing in it is edited. Everything new is
   built here at runtime and namespaced ot-nx-*.

   Motion follows skills/motion/SKILL.md via the _proto.js primitives:
     · hover        → .ot-nx-hoverable (outline only — the quietest thing here)
     · arrival      → NX.reveal, ONE language, at ITEM granularity
     · totals       → NX.roll, digit-by-digit, only changed digits move
     · meters       → NX.meter; over is a neutral hatch, never a failure colour
   The composer is a FIXED FRAME THAT POPULATES IN PLACE: it renders at full
   height on load and everything not-yet-shown sits at opacity:0, keeping its
   layout box. Nothing in it uses display:none.                                */
(function () {
  'use strict';

  /* ── the goals this diner set ───────────────────────────────────────────
        kind 'cap'   → a budget you stay inside; over = past it
        kind 'floor' → a target you reach; short = under it, never "over"

     ⛔ C1 · READ, NOT HARD-CODED. These used to be three literals here, which
     meant the edit control added at C1 could change the hub and leave the
     composer asserting the old numbers — and, worse, leave a measure flipped
     from ceiling to floor still rendering an over state. The rule only holds
     if there is one source, so this reads NX.goals and re-renders on change.

     ⚠ A dish estimate in this prototype carries calories, protein and carbs
     and nothing else. A goal on Fat, Fibre, Sugar or Sodium is real and we
     have no dish data to total against it, so it renders "we couldn’t tell"
     rather than a zero (ux-copy §2) — never a meter implying we measured. */
  var KEY = { Calories: 'cal', Protein: 'pro', Carbs: 'carb' };
  function goalSpecs() {
    return NX.goals.get()
      .filter(function (g) { return g.v !== '' && g.v != null; })
      .map(function (g) {
        return {
          key:   KEY[g.m] || null,          // null = no dish data for this measure
          label: g.m,
          goal:  Number(g.v),
          unit:  g.m === 'Calories' ? '' : (NX.goals.units[g.m] || ''),
          kind:  g.c === 'at least' ? 'floor' : 'cap'
        };
      });
  }
  /* this screen is signed-in only and has always shown 600 / 45 / 70, so it
     seeds those if nothing is stored. ⛔ The signed-out twin never does. */
  NX.goals.seedIfEmpty();
  var GOALS = goalSpecs();

  /* ── estimates, by dish index in menu order. Dishes absent from this map
        carry no estimate and say so.                                        */
  var EST = {
    0:  { cal: 240, pro: 26, carb: 18 },   // Vegetarian Burger & Fries
    1:  { cal: 180, pro: 9,  carb: 22 },   // Burger & Fries
    3:  { cal: 310, pro: 31, carb: 26 },   // Poached Sea Bass
    4:  { cal: 90,  pro: 3,  carb: 12 },   // Pizza, Your Choice
    7:  { cal: 250, pro: 18, carb: 35 },   // Spaghetti
    8:  { cal: 330, pro: 8,  carb: 58 },   // Fried Rice
    10: { cal: 190, pro: 11, carb: 28 },   // Noodle Soup
    11: { cal: 150, pro: 5,  carb: 30 },   // Idly & Chutney
    13: { cal: 210, pro: 24, carb: 9 },    // Chicken Cutlet
    16: { cal: 120, pro: 6,  carb: 21 },   // Fruit Salad with Yogurt
    17: { cal: 350, pro: 4,  carb: 47 },   // Chocolate Brownie
    19: { cal: 290, pro: 3,  carb: 41 },   // Cupcake
    22: { cal: 140, pro: 3,  carb: 17 },   // Scoop of Ice Cream
    26: { cal: 320, pro: 7,  carb: 55 }    // Date Shake
  };

  var COPY = {
    title:      'What you’re thinking of having',
    helper:     'Change any of this up to your reservation.',
    emptyTitle: 'Nothing selected yet',
    emptyBody:  'Select a dish or two and we’ll show how the meal is shaping up. Skipping this is fine — we won’t chase you.',
    emptySugs:  'Where people usually start here',
    sugsTitle:  'What else fits alongside these',
    sugsHelp:   'Ranked by how they sit with what you’ve selected.',
    allMet:     'Everything you set is met. Adding more is fine — the suggestions just change.',
    over:       'Over on two of the three. That’s all this says — it’s a meal out.',
    foot:       'Est. means we’re going on published chain data, not this kitchen. Treat it as a steer, not a fact.',
    noData:     'no nutrition data',
    noMenuT:    'No menu published',
    noMenuB:    'This restaurant hasn’t shared a menu with OpenTable, so there’s nothing for us to check.',
    noMenuCta:  'Ask the restaurant'
  };

  var CSS = [
    /* dish row — the control and the estimate, appended to the captured <li> */
    '.ot-nx-dishrow{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:6px}',
    '.ot-nx-est{font-size:12px;line-height:16px;color:var(--nx-mut)}',
    '.ot-nx-est.is-none{color:var(--nx-mut);opacity:.8}',
    '.ot-nx-select{flex:0 0 auto;font:inherit;font-size:12px;line-height:16px;font-weight:500;',
    '  padding:4px 10px;border-radius:4px;border:1px solid var(--nx-line);',
    '  background:var(--nx-surface);color:var(--nx-ink);cursor:pointer}',
    '.ot-nx-select.is-selected{border-color:var(--nx-ink);font-weight:600}',
    /* the row itself hovers as quietly as the control; never both at once */
    '.iC5T-7C2eyc-.ot-nx-hoverable:has(.ot-nx-select:hover){outline-color:transparent}',

    /* composer rail panel — a fixed frame that populates in place */
    '.ot-nx-composer{margin-top:16px;padding:16px;border-radius:4px;',
    '  border:.0625rem solid var(--nx-line);background:var(--nx-surface);color:var(--nx-ink)}',
    '.ot-nx-composer.is-hidden{display:none}',
    '.ot-nx-ttl{margin:0;font-size:16px;line-height:22px;font-weight:600}',
    '.ot-nx-sub{margin:4px 0 0;font-size:12px;line-height:16px;color:var(--nx-mut)}',
    '.ot-nx-sub.is-off{opacity:0}',
    '.ot-nx-stack{display:grid;margin-top:14px}',
    '.ot-nx-stack>*{grid-area:1/1;transition:opacity .28s var(--nx-ease)}',
    '.ot-nx-stack>.is-off{opacity:0;pointer-events:none}',
    '.ot-nx-empty{align-self:center}',
    '.ot-nx-empty-ttl{margin:0;font-size:13px;line-height:18px;font-weight:600}',
    '.ot-nx-empty-body{margin:4px 0 0;font-size:12px;line-height:17px;color:var(--nx-mut)}',
    '.ot-nx-meters{display:flex;flex-direction:column;gap:12px;align-self:start}',
    '.ot-nx-rowtop{display:flex;justify-content:space-between;align-items:baseline;gap:8px;',
    '  font-size:13px;line-height:18px;margin-bottom:6px}',
    '.ot-nx-val{color:var(--nx-mut);font-size:12px}',
    '.ot-nx-note{min-height:34px;margin:12px 0 0;font-size:12px;line-height:17px;',
    '  color:var(--nx-mut);opacity:0;transition:opacity .28s var(--nx-ease)}',
    '.ot-nx-note.is-on{opacity:1}',
    '.ot-nx-sugttl{margin:6px 0 0;font-size:13px;line-height:18px;font-weight:600}',
    '.ot-nx-sugs{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}',
    '.ot-nx-sugs li{min-height:40px;display:flex}',
    '.ot-nx-sug{display:flex;flex:1;width:100%;gap:8px;align-items:baseline;justify-content:space-between;',
    '  text-align:left;font:inherit;font-size:13px;line-height:18px;color:var(--nx-ink);',
    '  padding:8px 10px;border:1px solid var(--nx-line);border-radius:4px;',
    '  background:var(--nx-surface);cursor:pointer}',
    '.ot-nx-sug.is-off{opacity:0;pointer-events:none}',
    '.ot-nx-sug-est{flex:0 0 auto;font-size:12px;color:var(--nx-mut)}',
    '.ot-nx-foot{margin:14px 0 0;padding-top:10px;border-top:1px solid var(--nx-line);',
    '  font-size:11px;line-height:15px;color:var(--nx-mut)}',

    /* no-menu state — a state swap of the captured menu block, not the frame */
    '.ot-nx-nomenu{margin-top:16px;padding:24px;border:.0625rem solid var(--nx-line);',
    '  border-radius:4px;background:var(--nx-surface)}',
    '.ot-nx-nomenu-ttl{margin:0;font-size:16px;line-height:22px;font-weight:600;color:var(--nx-ink)}',
    '.ot-nx-nomenu-body{margin:6px 0 0;font-size:14px;line-height:20px;color:var(--nx-mut);max-width:46ch}',
    '.ot-nx-cta{margin-top:16px;font:inherit;font-size:14px;line-height:20px;font-weight:500;',
    '  padding:8px 14px;border-radius:4px;border:1px solid var(--nx-ink);',
    '  background:var(--nx-surface);color:var(--nx-ink);cursor:pointer}'
  ].join('\n');

  /* ── helpers ───────────────────────────────────────────────────────────── */
  /* the copy deck writes these counts as words ("two of the three"), so the
     templated version keeps doing that up to seven — the number of measures
     the design offers — and falls back to digits past it. */
  var NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
  function WORDS(n) { return NUM[n] || String(n); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function estLine(e) {
    return e ? 'Est. ' + e.cal + ' calories · ' + e.pro + 'g protein · ' + e.carb + 'g carbs'
             : COPY.noData;
  }

  var dishes = [];            // {li, idx, name, est, btn}
  var selected = [];          // dish indices, in the order they were chosen
  var panel, stackEmpty, stackMeters, noteEl, sugTtl, sugHelp, sugSlots = [];
  var rows = {};              // key -> {val, meter}
  var lastSugs = [];
  var menuBits = {};

  /* ── STEP 2 · the menu becomes selectable ──────────────────────────────── */
  function buildMenu() {
    var lis = document.querySelectorAll('article[data-test="menu-section"] ul.czLfeavEZLI- > li.iC5T-7C2eyc-');
    [].forEach.call(lis, function (li, idx) {
      var titleEl = li.querySelector('[data-test="item-title"]');
      var est = EST[idx] || null;
      var d = { li: li, idx: idx, name: titleEl ? titleEl.textContent : '', est: est };

      li.classList.add('ot-nx-hoverable');

      var row = el('div', 'ot-nx-dishrow');
      var e = el('span', 'ot-nx-est' + (est ? '' : ' is-none'), estLine(est));
      var btn = el('button', 'ot-nx-select ot-nx-hoverable', 'Select');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', 'false');
      btn.onclick = function () { toggle(idx); };

      row.appendChild(e);
      row.appendChild(btn);
      li.appendChild(row);

      d.btn = btn;
      dishes.push(d);
    });

    /* the captured "View full menu" control is inert in a static capture —
       wire it so the rest of the menu is actually browsable in the prototype */
    menuBits.expandBtn = document.querySelector('[data-test="expansion-button"]');
    menuBits.expandBox = document.querySelector('[data-test="inner-expandable-container"]');
    if (menuBits.expandBtn && menuBits.expandBox) {
      menuBits.expandBtn.addEventListener('click', function () {
        expand(menuBits.expandBtn.getAttribute('aria-expanded') !== 'true');
      });
    }
  }
  function expand(on) {
    if (!menuBits.expandBtn || !menuBits.expandBox) return;
    menuBits.expandBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
    menuBits.expandBox.style.maxHeight = on ? 'none' : '400px';
    /* The captured button never relabels itself — a real defect in the host, present
       on both restaurant screens. Fixed in both together rather than one, so the two
       screens cannot drift apart. */
    var lbl = menuBits.expandBtn.querySelector('span:not([data-test])') || menuBits.expandBtn;
    if (lbl && /menu/i.test(lbl.textContent || '')) {
      lbl.textContent = on ? 'Collapse menu' : 'View full menu';
    }
  }

  /* one row per goal. Rebuilt whenever the goals change, so an edit made on
     the hub or the home page is reflected here rather than remembered wrongly.
     ⚠ Rebuilding rows changes the composer's height, and prototypes.md records
     it as "a fixed frame that populates, measured at 495px". That measurement
     holds for a given goal set; it was never a claim that the frame is 495px
     for every possible goal set, and it could not be — the diner can now have
     one goal or seven. Flagged in BUILD-REPORT-v2.md §C1. */
  function buildMeterRows() {
    if (!stackMeters) return;
    stackMeters.innerHTML = '';
    rows = {};
    GOALS.forEach(function (g) {
      var r = el('div', 'ot-nx-goalrow');
      var top = el('div', 'ot-nx-rowtop');
      var lab = el('span', 'ot-nx-lab', g.label);
      var val = el('span', 'ot-nx-val');
      top.appendChild(lab); top.appendChild(val);
      r.appendChild(top);
      if (g.key) {
        val.textContent = 'about 0' + g.unit + ' of ' + g.goal + g.unit;
        val.setAttribute('data-val', val.textContent);
        var m = el('div', 'ot-nx-meter');
        m.appendChild(document.createElement('i'));
        r.appendChild(m);
        rows[g.label] = { val: val, meter: m, spec: g };
      } else {
        /* ⛔ no dish estimate carries this measure. No meter at all — a bar at
           0% would read as "you have had none of it", which is a measurement
           we did not make. */
        val.textContent = 'we couldn’t tell';
        val.setAttribute('data-val', val.textContent);
        r.classList.add('is-unmeasured');
        rows[g.label] = { val: val, meter: null, spec: g };
      }
      stackMeters.appendChild(r);
    });
  }

  /* ── STEP 3 · the composer rail ────────────────────────────────────────── */
  function buildPanel() {
    var card = document.getElementById('bookable-cta');
    if (!card) return;

    panel = el('section', 'ot-nx-composer');
    panel.id = 'ot-nx-composer';
    panel.setAttribute('aria-label', COPY.title);
    panel.appendChild(el('h2', 'ot-nx-ttl', COPY.title));
    panel.appendChild(el('p', 'ot-nx-sub', COPY.helper));

    /* the one region that changes character: empty copy and the three meters
       occupy the SAME grid cell, so the frame never grows or shrinks.        */
    var stack = el('div', 'ot-nx-stack');
    stackEmpty = el('div', 'ot-nx-empty');
    stackEmpty.appendChild(el('p', 'ot-nx-empty-ttl', COPY.emptyTitle));
    stackEmpty.appendChild(el('p', 'ot-nx-empty-body', COPY.emptyBody));
    stackMeters = el('div', 'ot-nx-meters is-off');
    buildMeterRows();
    stack.appendChild(stackEmpty);
    stack.appendChild(stackMeters);
    panel.appendChild(stack);

    noteEl = el('p', 'ot-nx-note');
    noteEl.textContent = COPY.allMet;      /* sized for the longer of the two */
    panel.appendChild(noteEl);

    sugTtl = el('h3', 'ot-nx-sugttl', COPY.emptySugs);
    sugHelp = el('p', 'ot-nx-sub is-off', COPY.sugsHelp);
    panel.appendChild(sugTtl);
    panel.appendChild(sugHelp);

    var ul = el('ul', 'ot-nx-sugs');
    for (var i = 0; i < 3; i++) {
      var li = el('li');
      var b = el('button', 'ot-nx-sug ot-nx-hoverable is-off');
      b.type = 'button';
      b.appendChild(el('span', 'ot-nx-sug-name'));
      b.appendChild(el('span', 'ot-nx-sug-est'));
      li.appendChild(b);
      ul.appendChild(li);
      sugSlots.push(b);
    }
    panel.appendChild(ul);
    panel.appendChild(el('p', 'ot-nx-foot', COPY.foot));

    card.insertAdjacentElement('afterend', panel);   /* BELOW the reservation card */
  }

  /* ── the no-menu surface ───────────────────────────────────────────────── */
  function buildNoMenu() {
    var content = document.getElementById('restProfileMenuContent');
    if (!content) return;
    menuBits.content = content;
    menuBits.tabs = document.querySelector('nav[data-test="menu-tabs"]');
    menuBits.source = document.querySelector('#menu p.H0wuvAPr2fY-');
    menuBits.footer = document.querySelector('footer[data-test="menu-footer"]');

    var box = el('div', 'ot-nx-nomenu');
    box.style.display = 'none';
    box.appendChild(el('h3', 'ot-nx-nomenu-ttl', COPY.noMenuT));
    box.appendChild(el('p', 'ot-nx-nomenu-body', COPY.noMenuB));
    var cta = el('button', 'ot-nx-cta ot-nx-hoverable', COPY.noMenuCta);
    cta.type = 'button';
    box.appendChild(cta);
    content.insertAdjacentElement('beforebegin', box);
    menuBits.noMenu = box;
  }
  function setMenuPublished(on) {
    if (!menuBits.noMenu) return;
    menuBits.noMenu.style.display = on ? 'none' : '';
    if (menuBits.content) menuBits.content.style.display = on ? '' : 'none';
    if (menuBits.tabs) menuBits.tabs.style.display = on ? '' : 'none';
    if (menuBits.source) menuBits.source.style.display = on ? '' : 'none';
    if (menuBits.footer) menuBits.footer.style.display = on ? '' : 'none';
    if (panel) panel.classList.toggle('is-hidden', !on);
  }

  /* ── model ─────────────────────────────────────────────────────────────── */
  function totals() {
    var t = { cal: 0, pro: 0, carb: 0 };
    selected.forEach(function (i) {
      var e = EST[i];
      if (!e) return;
      t.cal += e.cal; t.pro += e.pro; t.carb += e.carb;
    });
    return t;
  }
  function isOver(g, v) { return g.kind === 'cap' && v > g.goal; }
  function isMet(g, v) { return g.kind === 'cap' ? v <= g.goal : v >= g.goal; }

  /* ⛔ These used to be GOALS[0], GOALS[1], GOALS[2] — positional, which was
     safe only while the array was three fixed literals. With editable goals a
     diner can have one, or seven, or none of these three, so each headroom is
     looked up by measure and a measure with no goal simply exerts no pull. */
  function goalFor(key) {
    for (var i = 0; i < GOALS.length; i++) if (GOALS[i].key === key) return GOALS[i];
    return null;
  }
  function rank() {
    var t = totals();
    var gCal = goalFor('cal'), gPro = goalFor('pro'), gCarb = goalFor('carb');
    var calHead  = gCal  ? gCal.goal  - t.cal  : Infinity;
    var proGap   = gPro && gPro.kind === 'floor' ? Math.max(0, gPro.goal - t.pro) : 0;
    var carbHead = gCarb ? gCarb.goal - t.carb : Infinity;
    return dishes
      .filter(function (d) { return d.est && selected.indexOf(d.idx) === -1; })
      .map(function (d) {
        var s = Math.min(d.est.pro, proGap) * 3
              - Math.max(0, d.est.cal - calHead) / 40
              - Math.max(0, d.est.carb - carbHead) / 8;
        return { d: d, s: s };
      })
      .sort(function (a, b) { return b.s - a.s || a.d.idx - b.d.idx; })
      .slice(0, 3)
      .map(function (x) { return x.d; });
  }

  /* ── render ────────────────────────────────────────────────────────────── */
  function render() {
    var t = totals();
    var any = selected.length > 0;
    var overCount = 0, metCount = 0;

    var measurable = 0, overLabel = '';
    GOALS.forEach(function (g) {
      var r = rows[g.label];
      if (!r || !g.key) return;                 // "we couldn’t tell" — nothing to count
      measurable++;
      var v = t[g.key];
      NX.roll(r.val, 'about ' + v + g.unit + ' of ' + g.goal + g.unit);
      /* ⛔ isOver() returns false for every FLOOR, so a floor's meter can never
         carry is-over and can never hatch. That is the rule, enforced in one
         place rather than trusted to each caller. */
      NX.meter(r.meter, any ? (v / g.goal) * 100 : 0, isOver(g, v));
      if (isOver(g, v)) { overCount++; overLabel = g.label.toLowerCase(); }
      if (isMet(g, v)) metCount++;
    });

    stackEmpty.classList.toggle('is-off', any);
    stackMeters.classList.toggle('is-off', !any);

    /* ⛔ The copy deck wrote this line as the literal "Over on two of the
       three", which was true only while the goals were three hard-coded
       literals. Now that C1 lets the diner have one goal or seven, a fixed
       "two of the three" is a sentence that can be false on screen — the one
       thing this design is built not to do. Same sentence, counted.
       Proposed in ux-copy.md §3.3 as a template rather than edited silently. */
    var note = '';
    if (any && overCount > 0) {
      /* "Over on one of the one" is what counting alone produces, and it is
         not a sentence. With a single measurable goal the measure is named
         instead — shorter, and it says more than the count did. */
      note = (measurable === 1)
        ? 'Over on ' + overLabel + '. That’s all this says — it’s a meal out.'
        : 'Over on ' + WORDS(overCount) + ' of the ' + WORDS(measurable) +
          '. That’s all this says — it’s a meal out.';
    } else if (any && measurable > 0 && metCount === measurable) {
      note = COPY.allMet;
    }
    if (note) noteEl.textContent = note;
    noteEl.classList.toggle('is-on', !!note);

    sugTtl.textContent = any ? COPY.sugsTitle : COPY.emptySugs;
    sugHelp.classList.toggle('is-off', !any);

    /* suggestions: ONE arrival language, at item granularity, and only for the
       slots whose dish actually changed — a re-render is not a replay.       */
    var next = any ? rank() : dishes.filter(function (d) { return d.est; }).slice(0, 3);
    var arriving = [];
    sugSlots.forEach(function (b, i) {
      var d = next[i];
      var wasIdx = lastSugs[i];
      if (!d) {
        b.classList.add('is-off');
        b.classList.remove('ot-nx-enter', 'is-in');
        b.onclick = null;
        return;
      }
      b.querySelector('.ot-nx-sug-name').textContent = d.name;
      b.querySelector('.ot-nx-sug-est').textContent = 'Est. ' + d.est.cal + ' cal';
      b.onclick = function () { toggle(d.idx); };
      b.classList.remove('is-off');
      if (wasIdx !== d.idx) {
        b.classList.remove('ot-nx-enter', 'is-in');
        arriving.push(b);
      }
    });
    if (arriving.length) NX.reveal(arriving);
    lastSugs = next.map(function (d) { return d.idx; });
  }


  /* ⛔ E1 · the meal travels with the booking. The selection is published to the
     shared store so the checkout step and the confirmation show what was
     actually chosen here, rather than a private list of their own. A dish with
     no estimate publishes null, never a zero. */
  function publishMeal() {
    NX.set({ meal: selected.map(function (i) {
      var d = dishes[i] || {};
      return { name: d.name, cal: d.est ? d.est.cal : null,
               pro: d.est ? d.est.pro : null, carb: d.est ? d.est.carb : null };
    }) });
  }

  function toggle(idx) {
    var at = selected.indexOf(idx);
    if (at === -1) selected.push(idx); else selected.splice(at, 1);
    syncButtons();
    render();
    publishMeal();
  }
  function setSelection(list) {
    selected = list.slice();
    syncButtons();
    render();
    publishMeal();
  }
  function syncButtons() {
    dishes.forEach(function (d) {
      var on = selected.indexOf(d.idx) !== -1;
      d.btn.textContent = on ? 'Selected' : 'Select';
      d.btn.classList.toggle('is-selected', on);
      d.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /* ── STEP 4 · the harness ──────────────────────────────────────────────── */
  function boot() {
    var style = document.createElement('style');
    style.setAttribute('data-ot-nx', 'restaurant');
    style.textContent = CSS;
    document.head.appendChild(style);

    buildMenu();
    buildPanel();
    buildNoMenu();
    render();

    /* C1 · a goal edited anywhere reaches the composer, ceiling/floor and all */
    NX.goals.onChange(function () {
      GOALS = goalSpecs();
      buildMeterRows();
      render();
    });

    /* ── the walkthrough for this screen ───────────────────────────────────── */
    if (window.NX.tour) NX.tour.define([
      { el: '.ot-nx-select',
        title: 'The menu became selectable',
        body: 'In the real product this list is entirely static. Selecting is optional and '
            + 'nothing chases you for it — but it is what lets OpenTable write a true entry '
            + 'into your food app afterwards.' },
      { el: '#ot-nx-composer',
        title: 'How the meal is shaping up',
        body: 'Totals against what you set, per meal out — never a running "calories left". '
            + 'Going over renders as a neutral hatch: information, not failure, and nothing is '
            + 'offered to fix it.' },
      { el: function () { return document.querySelector('.ot-nx-sug:not(.is-off)'); },
        title: 'What else fits alongside these',
        body: 'Ranked against the headroom you have left. A protein goal is a floor you reach, '
            + 'a calorie goal a ceiling you stay inside — the ranking knows the difference.' }
    ]);

    NX.harness({
      screen: 'RESTAURANT · MENU + COMPOSER',
      states: [
        { id: 'nothing-selected', label: 'Nothing selected', tag: 'validated',
          run: function () { setMenuPublished(true); expand(false); setSelection([]); } },
        { id: 'partly-met', label: 'Two selected — protein still short', tag: 'validated',
          run: function () { setMenuPublished(true); expand(true); setSelection([0, 1]); } },
        { id: 'all-met', label: 'Three selected — all met', tag: 'validated',
          run: function () { setMenuPublished(true); expand(true); setSelection([0, 4, 7]); } },
        { id: 'over', label: 'Four selected — over on two', tag: 'validated',
          run: function () { setMenuPublished(true); expand(true); setSelection([0, 1, 3, 4]); } },
        { id: 'no-menu', label: 'Restaurant publishes no menu', tag: 'validated',
          run: function () { setSelection([]); expand(false); setMenuPublished(false); } }
      ],
      links: [
        { label: '→ Complete your reservation', href: 'booking-details.html' },
        { label: '→ Nutrition goals', href: 'nutrition-goals.html' },
        { label: '→ Search', href: 'search.html' }
      ],
      note: 'Host lifted verbatim from the captured restaurant page. Only the dish controls and the right-rail panel are new.'
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

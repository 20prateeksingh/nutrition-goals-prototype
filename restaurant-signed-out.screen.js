/* ── RESTAURANT · SIGNED OUT · menu + composer ────────────────────────────────
   Screen logic for restaurant-signed-out.html. The host page is a verbatim
   capture of the real SIGNED-OUT OpenTable restaurant profile (Treehouse
   Restaurant, Mossman AU) — nothing in it is edited. Everything new is built
   here at runtime and namespaced ot-nx-*.

   ⛔ WHY THIS SCREEN EXISTS
   Validation raised it as an obligation: the real menu is entirely static, and
   this design makes every dish selectable — on a page signed-out visitors also
   see. Nobody had drawn what a signed-out visitor gets. This is that answer,
   and the answer is: a signed-out visitor is NEVER BLOCKED, NEVER INTERRUPTED,
   and NEVER PRE-APPLIED TO.

     · Dishes are selectable, exactly as signed in. No wall, no modal, no
       interstitial. Clicking Select works.
     · The composer panel appears and totals what has been selected.
     · ⛔ NO meters and NO goal comparison UNTIL A GOAL EXISTS — see the O2
       block below. With no goal set there is nothing to measure against and
       nothing may imply a target: the totals stand alone, there is no "over"
       state at all, and no pass/fail valence anywhere. Once a signed-out
       visitor sets a goal (settled answer #2), the target exists and the
       meters appear. ⚠ That second half is an INTERPRETATION the designer has
       not ruled on.
     · One quiet line offers sign-in. A plain link, deferring to the header's
       own entry point — the same house pattern as search.screen.js §signin.

   This file mirrors restaurant.screen.js: same panel, same classes, same
   mechanics, same copy. The four differences above are the only ones.

   Motion follows skills/motion/SKILL.md via the _proto.js primitives:
     · hover        → .ot-nx-hoverable (outline only — the quietest thing here)
     · arrival      → NX.reveal, ONE language, at ITEM granularity
     · totals       → NX.roll, digit-by-digit, only changed digits move
     · meters       → only once a goal exists (O2). No goal, no meter, ever.
   The composer is a FIXED FRAME THAT POPULATES IN PLACE: it renders at full
   height on load and everything not-yet-shown sits at opacity:0, keeping its
   layout box. Nothing in it uses display:none.                                */
(function () {
  'use strict';

  /* ══ O2 · THIS SCREEN'S RULE CHANGED, AND IT IS AN INTERPRETATION ═════════
     ⚠ Read the whole of this before editing anything below.

     What was built at Step 8: "a signed-out visitor can select dishes and see
     totals, but sees NO meters, because they have set no goals and a meter
     would imply a target that does not exist." prototypes.md cites this screen
     carrying 0 meters in every state as the decision holding.

     Why it moved: settled answer #2 lets a signed-out visitor SET goals
     inline, held until the booking flow signs them in. Read precisely, the
     Step-8 rule is about HAVING NO GOAL, not about being signed out — so once
     a signed-out visitor sets one, the target exists and showing a meter
     follows the rule rather than breaking it.

     ⛔ So the rule this file now enforces is:
          no goal set  → NO meters, signed in or out. Totals only.
          goal set     → meters, signed in or out.
     The old behaviour is still reachable: the nothing-selected and
     some-selected states carry no goals and therefore no meters, exactly as
     before. The new `goals-set` state is the addition.

     ⚠ THE DESIGNER HAS NOT RULED ON THIS (PRD-proto-v2 §2, open decision O2).
     It changes what this screen proves — from "0 meters when signed out" to
     "0 meters until a goal exists". If the old behaviour is wanted, delete the
     goals branch in render() and the goals-set harness state; nothing else
     depends on it.                                                            */
  /* ⛔ …AND THEY MUST BE THE VISITOR'S OWN. `pending` is what settled answer #2
     marks goals set while signed out with. Goals stored by a signed-in screen
     belong to the account and never reach this one — otherwise walking from
     the signed-in restaurant to this screen would show meters against a target
     the visitor has not set, which is the same pre-apply the home page
     forbids. */
  function goalsSet() { return NX.goals.isSet() && NX.goals.isPending(); }

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
  /* ⛔ identical to the signed-in screen's predicates, deliberately: a floor
     can never be over, signed in or out. */
  function isOver(g, v) { return g.kind === 'cap' && v > g.goal; }
  function isMet(g, v)  { return g.kind === 'cap' ? v <= g.goal : v >= g.goal; }
  var NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
  function WORDS(n) { return NUM[n] || String(n); }

  /* ── estimates, by dish index in menu order. Dishes absent from this map
        carry no estimate and say so. This capture's menu has dish NAMES BUT
        NO PRICES — that is real, and no price is invented anywhere below.     */
  var EST = {
    0: { cal: 230, pro: 6,  carb: 41 },   // Focaccia
    1: { cal: 90,  pro: 12, carb: 3 },    // Tiger Prawn
    2: { cal: 160, pro: 18, carb: 6 },    // Woodfired Octopus
    3: { cal: 210, pro: 9,  carb: 12 },   // Heirloom Tomatoes
    4: { cal: 260, pro: 21, carb: 14 },   // Smoked Beef Tartare
    5: { cal: 180, pro: 7,  carb: 19 },   // Roasted Cauliflower
    6: { cal: 280, pro: 41, carb: 11 },   // Pan Roasted Daintree Barramundi
    7: { cal: 520, pro: 38, carb: 24 },   // Braised Beef Cheek
    8: { cal: 310, pro: 5,  carb: 44 }    // Coconut Sago
    /* 9  Australian Cheese Plate  — no published estimate
       10 Selection of Sorbets     — "daily chef selection", genuinely varies */
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
    signinLink: 'Sign in',
    signinRest: ' to set what you’re going for, and we’ll show how this meal lands against it.',
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
    /* Selected is a FILLED pill, not a heavier outline. At 12px a border-colour
       change is close to invisible against a dense menu — the state has to read
       at a glance, and across a screen-share. Mirrors restaurant.screen.js. */
    '.ot-nx-select.is-selected{border-color:var(--nx-ink);background:var(--nx-ink);',
    '  color:var(--nx-surface);font-weight:600}',

    /* ── the selected meal, as chips ─────────────────────────────────────────
       Deliberately OUTSIDE .ot-nx-stack. The stack's three occupants share one
       grid cell so the empty↔totals↔meters swap never moves the frame; a chip
       row grows with every dish, so putting it in that cell would reintroduce
       exactly the jump the stack exists to prevent. The panel now grows as
       dishes are added. That is the trade, made knowingly. */
    '.ot-nx-mealchips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}',
    '.ot-nx-mealchips:empty{display:none}',
    '.ot-nx-mealchip{display:inline-flex;align-items:center;gap:6px;max-width:100%;',
    '  padding:3px 4px 3px 9px;border-radius:4px;border:1px solid var(--nx-line);',
    '  background:var(--nx-surface);font-size:12px;line-height:16px;color:var(--nx-ink)}',
    '.ot-nx-chipname{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.ot-nx-chipx{flex:0 0 auto;width:16px;height:16px;display:inline-flex;',
    '  align-items:center;justify-content:center;padding:0;border:0;border-radius:3px;',
    '  background:transparent;color:var(--nx-mut);font:inherit;font-size:14px;line-height:1;',
    '  cursor:pointer;transition:background .14s var(--nx-ease),color .14s var(--nx-ease)}',
    '.ot-nx-chipx:hover{background:var(--nx-line);color:var(--nx-ink)}',
    '.ot-nx-chipx:focus-visible{outline:2px solid var(--nx-accent);outline-offset:1px}',
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
    /* ⛔ where .ot-nx-meters sits on the signed-in screen. Totals only — one
          line, the same type step as the meter rows' label line, no bar, no
          headroom, no target, no valence.                                    */
    '.ot-nx-totals{align-self:center}',
    '.ot-nx-total{margin:0;font-size:13px;line-height:18px;color:var(--nx-ink)}',
    '.ot-nx-note{min-height:34px;margin:12px 0 0;font-size:12px;line-height:17px;',
    '  color:var(--nx-mut);opacity:0;transition:opacity .28s var(--nx-ease)}',
    '.ot-nx-note.is-on{opacity:1}',
    /* the sign-in link — house rule, matching search-signed-out.html */
    '.ot-nx-link,.ot-nx-note a{color:var(--otkit-color-foreground-action,#2d333f);',
    '  text-decoration:underline;cursor:pointer}',
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

  var dishes = [];            // {li, idx, name, section, est, btn}
  var selected = [];          // dish indices, in the order they were chosen
  var panel, chipRow, stackEmpty, stackTotals, stackMeters, sugTtl, sugHelp, sugSlots = [];
  var noteEl, signinLine, heldLine;
  var GOALS = [];
  var mrows = {};             // label -> { val, meter, spec }
  var tvals = {};             // key -> the rolling <span> for that nutrient
  var lastSugs = [];
  var menuBits = {};

  /* ── STEP 2 · the menu becomes selectable ──────────────────────────────────
        ⛔ Identical to signed in. This is the whole point of the screen: no
        sign-in wall on the control, no disabled state, no "sign in to use
        this" tooltip. The visitor is not asked for anything.                 */
  function buildMenu() {
    var lis = document.querySelectorAll('article[data-test="menu-section"] ul.czLfeavEZLI- > li.iC5T-7C2eyc-');
    [].forEach.call(lis, function (li, idx) {
      var titleEl = li.querySelector('[data-test="item-title"]');
      var sec = li.closest ? li.closest('article[data-test="menu-section"]') : null;
      var secH = sec ? sec.querySelector('h2,h3,h4') : null;
      var est = EST[idx] || null;
      var d = {
        li: li, idx: idx, name: titleEl ? titleEl.textContent : '',
        section: secH ? secH.textContent.trim() : 'section-' + idx, est: est
      };

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

    /* the captured expand/collapse control is inert in a static capture — wire
       it so the menu is actually browsable, exactly as on the signed-in screen.
       ⛔ This capture arrives ALREADY EXPANDED (aria-expanded="true", no inline
       max-height, button reads "Collapse menu"). That is the host's own state
       and it is left untouched — no harness state drives it.                 */
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

  /* ── STEP 3 · the composer rail ────────────────────────────────────────── */
  function buildPanel() {
    var card = document.getElementById('bookable-cta');
    if (!card) return;

    panel = el('section', 'ot-nx-composer');
    panel.id = 'ot-nx-composer';
    panel.setAttribute('aria-label', COPY.title);
    panel.appendChild(el('h2', 'ot-nx-ttl', COPY.title));
    panel.appendChild(el('p', 'ot-nx-sub', COPY.helper));

    /* what's in the meal, before what it adds up to. Above the stack, so the
       diner reads the dishes and then the consequence — and so removing one is
       a single click next to the thing being removed, not a hunt back up the
       menu for the Selected button that put it there. */
    chipRow = el('div', 'ot-nx-mealchips');
    panel.appendChild(chipRow);

    /* the one region that changes character: empty copy and the totals line
       occupy the SAME grid cell, so the frame never grows or shrinks.        */
    var stack = el('div', 'ot-nx-stack');
    stackEmpty = el('div', 'ot-nx-empty');
    stackEmpty.appendChild(el('p', 'ot-nx-empty-ttl', COPY.emptyTitle));
    stackEmpty.appendChild(el('p', 'ot-nx-empty-body', COPY.emptyBody));

    /* ⛔ TOTALS ONLY. Each number is its own roll target so a changed digit
          moves on its own — a single whole-line roll would fall back to an
          instant swap every time a number changed length (_proto.js §roll).  */
    stackTotals = el('div', 'ot-nx-totals is-off');
    var line = el('p', 'ot-nx-total');
    line.appendChild(document.createTextNode('about '));
    tvals.cal = el('span', 'ot-nx-tval', '0');
    line.appendChild(tvals.cal);
    line.appendChild(document.createTextNode(' calories · '));
    tvals.pro = el('span', 'ot-nx-tval', '0g');
    line.appendChild(tvals.pro);
    line.appendChild(document.createTextNode(' protein · '));
    tvals.carb = el('span', 'ot-nx-tval', '0g');
    line.appendChild(tvals.carb);
    line.appendChild(document.createTextNode(' carbs'));
    Object.keys(tvals).forEach(function (k) {
      tvals[k].setAttribute('data-val', tvals[k].textContent);
    });
    stackTotals.appendChild(line);

    /* O2 · the third occupant of the same grid cell. Empty copy, totals-only
       and meters all sit in one cell, so the frame does not jump between them.
       It is built empty and filled by buildMeterRows() whenever the goals
       change, which is what lets a goal set on this very page show up here. */
    stackMeters = el('div', 'ot-nx-meters is-off');

    stack.appendChild(stackEmpty);
    stack.appendChild(stackTotals);
    stack.appendChild(stackMeters);
    panel.appendChild(stack);

    /* The interpretation note, and the sign-in offer, in that order.
       ⛔ With NO goal the note slot carries only the sign-in line — it is not a
       verdict on the meal, so it is always on and never reacts to a selection.
       ⛔ With a goal set it carries what the signed-in screen carries (over /
       everything met), and the sign-in line below it changes job: it stops
       offering to set a target that now exists and instead says where the
       target is being kept (settled answer #2).                              */
    noteEl = el('p', 'ot-nx-note');
    noteEl.textContent = COPY.allMet;         /* sized for the longer of the two */
    panel.appendChild(noteEl);
    signinLine = buildSigninLine();
    panel.appendChild(signinLine);
    heldLine = el('p', 'ot-nx-note ot-nx-signedout-line is-on', NX.goals.copy.held);
    heldLine.hidden = true;
    panel.appendChild(heldLine);

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

  /* O2 · one meter row per goal, identical in shape to the signed-in screen.
     ⛔ A measure with no dish estimate gets NO meter — "we couldn't tell",
     never a bar at 0%. */
  function buildMeterRows() {
    if (!stackMeters) return;
    stackMeters.innerHTML = '';
    mrows = {};
    GOALS.forEach(function (g) {
      var r = el('div', 'ot-nx-goalrow');
      var top = el('div', 'ot-nx-rowtop');
      top.appendChild(el('span', 'ot-nx-lab', g.label));
      var val = el('span', 'ot-nx-val');
      top.appendChild(val);
      r.appendChild(top);
      if (g.key) {
        val.textContent = 'about 0' + g.unit + ' of ' + g.goal + g.unit;
        val.setAttribute('data-val', val.textContent);
        var m = el('div', 'ot-nx-meter');
        m.appendChild(document.createElement('i'));
        r.appendChild(m);
        mrows[g.label] = { val: val, meter: m, spec: g };
      } else {
        val.textContent = 'we couldn\u2019t tell';
        val.setAttribute('data-val', val.textContent);
        r.classList.add('is-unmeasured');
        mrows[g.label] = { val: val, meter: null, spec: g };
      }
      stackMeters.appendChild(r);
    });
  }

  function refreshGoals() {
    GOALS = goalSpecs();
    buildMeterRows();
    render();
  }

  /* the inline Sign in defers to the header's own entry point. No modal, no
     interruption, nothing pre-applied or disabled — every other control on this
     page stays fully usable. Same pattern as search.screen.js.               */
  function buildSigninLine() {
    var p = el('p', 'ot-nx-note ot-nx-signedout-line is-on');
    var a = el('a', 'ot-nx-link ot-nx-hoverable', COPY.signinLink);
    a.href = '#';
    a.setAttribute('data-nx-signin', '');
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      var real = document.querySelector('[data-test="header-sign-in-button"]');
      if (real) { real.focus(); real.click(); }
    });
    p.appendChild(a);
    p.appendChild(document.createTextNode(COPY.signinRest));
    return p;
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

  /* ⛔ NO isOver / isMet HERE. There is no cap and no floor to compare with,
        so the two predicates the signed-in screen turns on simply do not
        exist — not as a default, not as a hidden branch.                     */

  /* Signed in, rank() scores against the diner's remaining headroom. Signed out
     there is no headroom, so ranking against one would be inventing a target.
     What is left that is honest is COURSE COMPLEMENT: offer dishes from the
     courses the visitor has not picked from yet, one course at a time so the
     three slots spread rather than stacking up in a single section. Menu order
     breaks every tie. That is what "how they sit with what you've selected"
     means with no goals in play — and it implies nothing about a target.     */
  function rank() {
    var picked = {};
    selected.forEach(function (i) {
      var d = dishes[i];
      if (d) picked[d.section] = 1;
    });

    var order = [], bySection = {};
    dishes.forEach(function (d) {
      if (!d.est || selected.indexOf(d.idx) !== -1) return;
      if (!bySection[d.section]) { bySection[d.section] = []; order.push(d.section); }
      bySection[d.section].push(d);
    });
    /* untouched courses first; within each group, the menu's own order */
    order.sort(function (a, b) {
      var pa = picked[a] ? 1 : 0, pb = picked[b] ? 1 : 0;
      return pa - pb || bySection[a][0].idx - bySection[b][0].idx;
    });

    var out = [];
    for (var pass = 0; out.length < 3 && pass < dishes.length; pass++) {
      for (var i = 0; i < order.length && out.length < 3; i++) {
        var d = bySection[order[i]][pass];
        if (d) out.push(d);
      }
    }
    return out;
  }

  /* ── render ────────────────────────────────────────────────────────────── */
  /* ⛔ Rebuilt wholesale rather than diffed. The row is at most a handful of
     chips, and selection ORDER is meaningful — `selected` is append-ordered, so
     a chip has to be able to move. Diffing buys nothing here and loses that. */
  function renderChips() {
    if (!chipRow) return;
    chipRow.textContent = '';
    selected.forEach(function (i) {
      var d = null;
      for (var k = 0; k < dishes.length; k++) { if (dishes[k].idx === i) { d = dishes[k]; break; } }
      if (!d) return;
      var name = (d.name || '').trim() || 'This dish';
      var chip = el('span', 'ot-nx-mealchip');
      chip.appendChild(el('span', 'ot-nx-chipname', name));
      var x = el('button', 'ot-nx-chipx', '×');
      x.type = 'button';
      x.setAttribute('aria-label', 'Remove ' + name);
      /* the same toggle() the Select button calls — one way in and one way out,
         so the totals, the meters and the published meal cannot disagree */
      x.onclick = function () { toggle(d.idx); };
      chip.appendChild(x);
      chipRow.appendChild(chip);
    });
  }

  function render() {
    var t = totals();
    var any = selected.length > 0;
    var hasGoals = goalsSet();

    renderChips();

    NX.roll(tvals.cal, String(t.cal));
    NX.roll(tvals.pro, t.pro + 'g');
    NX.roll(tvals.carb, t.carb + 'g');

    /* ⛔ O2 · exactly one of the three occupies the cell. With NO goal this
       is unchanged from Step 8: empty copy, then a totals line, and never a
       meter. Meters appear only once a target actually exists. */
    stackEmpty.classList.toggle('is-off', any);
    stackTotals.classList.toggle('is-off', !any || hasGoals);
    stackMeters.classList.toggle('is-off', !any || !hasGoals);

    /* ⛔ With no goal there is still no note branch at all: "over on two of
       the three" and "everything you set is met" are verdicts against goals,
       and there are none. With a goal set they are the same verdicts the
       signed-in screen makes — and a FLOOR still never renders over. */
    var note = '';
    if (hasGoals) {
      var measurable = 0, overCount = 0, metCount = 0, overLabel = '';
      GOALS.forEach(function (g) {
        var r = mrows[g.label];
        if (!r || !g.key) return;
        measurable++;
        var v = t[g.key];
        NX.roll(r.val, 'about ' + v + g.unit + ' of ' + g.goal + g.unit);
        NX.meter(r.meter, any ? (v / g.goal) * 100 : 0, isOver(g, v));
        if (isOver(g, v)) { overCount++; overLabel = g.label.toLowerCase(); }
        if (isMet(g, v)) metCount++;
      });
      if (any && overCount > 0) {
        note = (measurable === 1)
          ? 'Over on ' + overLabel + '. That\u2019s all this says \u2014 it\u2019s a meal out.'
          : 'Over on ' + WORDS(overCount) + ' of the ' + WORDS(measurable) +
            '. That\u2019s all this says \u2014 it\u2019s a meal out.';
      } else if (any && measurable > 0 && metCount === measurable) {
        note = COPY.allMet;
      }
    }
    if (note) noteEl.textContent = note;
    noteEl.classList.toggle('is-on', !!note);

    /* the sign-in line stops offering to set a target once one exists, and the
       held line takes over — settled answer #2, said out loud on the screen. */
    signinLine.hidden = hasGoals;
    heldLine.hidden = !hasGoals;

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
  /* ── presentation trim ───────────────────────────────────────────────────
     Mirrors restaurant.screen.js. NOT a design proposal — it subtracts from
     the captured product, so it is confined to the harness and to this one
     card. Removing this function restores the page exactly, and the identical
     social proof on home and search result cards is left alone. */
  function trimForDemo() {
    var card = document.getElementById('bookable-cta');
    if (!card) return;
    var avail = card.querySelector('[data-test="multi-day-availability-button"]');
    if (avail) (avail.parentElement || avail).remove();
    [].forEach.call(card.querySelectorAll('span'), function (s) {
      if (/^Booked \d+ times? today$/.test((s.textContent || '').trim())) s.remove();
    });
  }

  function boot() {
    var style = document.createElement('style');
    style.setAttribute('data-ot-nx', 'restaurant-signed-out');
    style.textContent = CSS;
    document.head.appendChild(style);

    trimForDemo();
    buildMenu();
    buildPanel();
    buildNoMenu();
    refreshGoals();
    NX.goals.onChange(refreshGoals);

    /* ── the walkthrough for this screen ───────────────────────────────────── */
    if (window.NX.tour) NX.tour.define([
      { el: '.ot-nx-select',
        title: 'Signed out, and nothing is blocked',
        body: 'No wall, no modal, no interstitial. A visitor selects dishes exactly as a '
            + 'signed-in diner does.' },
      { el: '#ot-nx-composer',
        title: 'Totals, and no meter until a target exists',
        body: 'A meter would imply a goal, and a visitor who has set none does not have one. '
            + 'Set a goal and the meters appear — signed in or not.' }
    ]);

    NX.harness({
      screen: 'RESTAURANT · SIGNED OUT',
      states: [
        { id: 'nothing-selected', label: 'Nothing selected', tag: 'validated',
          run: function () { setMenuPublished(true); setSelection([]); } },
        { id: 'some-selected', label: 'Two selected — totals only', tag: 'validated',
          run: function () { setMenuPublished(true); setSelection([0, 6]); } },
        { id: 'no-menu', label: 'Restaurant publishes no menu', tag: 'validated',
          run: function () { setSelection([]); setMenuPublished(false); } },
        /* ⚠ O2 · the designer has not ruled on this one. See the block at the
           top of this file before treating it as settled. */
        { id: 'goals-set', label: 'Goals set while signed out — meters appear', tag: 'new surface',
          run: function () {
            NX.goals.set([{ m: 'Calories', c: 'under', v: '600' },
                          { m: 'Protein',  c: 'at least', v: '45' },
                          { m: 'Carbs',    c: 'under', v: '70' }], true);
            setMenuPublished(true); setSelection([0, 6, 7]);
          } }
      ],
      links: [
        { label: '→ Complete your reservation', href: 'booking-details.html' },
        { label: '→ Signed-in restaurant', href: 'restaurant.html' },
        { label: '→ Signed-out search', href: 'search-signed-out.html' },
        { label: '→ Signed-out home', href: 'home-signed-out.html' }
      ],
      note: 'Host lifted verbatim from a real SIGNED-OUT capture (a different restaurant — its menu has dish names but no prices, which is real). A signed-out visitor can select dishes and see totals; there are no meters because no goals exist to measure against.'
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

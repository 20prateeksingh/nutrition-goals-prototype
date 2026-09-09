/* ── _tour.js · "what's new here" — a dismissible walkthrough ─────────────────
   Asked for as *"a dismissible walkthrough. Tooltips that highlight one by one,
   on what was done. Very similar to how a product introduces a new feature."*

   ⛔ IT IS PROTOTYPE CHROME, NOT THE DESIGN. Same status as the harness: it
   explains the prototype to whoever is being shown it, it is never part of
   what is being proposed, and it is not built at all under ?cap= — so it can
   never reach a captured frame or the Figma canvas. Its strings are therefore
   not product copy and do not go through ux-copy.md (the harness's labels set
   that precedent); every string it *quotes* from a screen is the screen's own.

   The pattern, from how products actually do this (Appcues' and Userpilot's
   onboarding-pattern write-ups, Whatfix's product-tour guide):
     · a SEQUENTIAL walkthrough, not passive hotspots — one step at a time
     · a SPOTLIGHT: the page dims, the thing being talked about stays lit
     · a coach mark anchored to that thing, with "n of m", Back / Next / Done
     · SHORT. Three to five steps per screen; the research is consistent that
       a long tour is skipped and a short one is read
     · dismissible at every step, and it remembers — you do not get it twice
     · re-openable on demand, because someone else will want to see it

   Each screen declares its own steps. They are DERIVED FROM THE LIVE DOM at
   run time and a step whose element is missing is dropped rather than pointing
   at nothing — so a tour can never highlight an empty rectangle.             */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };

  var steps = [];
  var idx = 0;
  var root = null, spot = null, card = null;
  var onScroll = null;

  function file() { return location.pathname.split('/').pop() || 'home.html'; }
  function seenKey() { return 'tour:' + file(); }

  function seen() { return !!(NX.get().tours || {})[file()]; }
  function markSeen() {
    var t = NX.get().tours || {};
    t[file()] = true;
    NX.set({ tours: t });
  }

  /* ── the steps a screen declared, minus any whose element is not there ──── */
  function live() {
    return steps.filter(function (s) {
      var el = typeof s.el === 'function' ? s.el() : $(s.el);
      return el && el.getBoundingClientRect().width > 0;
    });
  }
  function elOf(s) { return typeof s.el === 'function' ? s.el() : $(s.el); }

  /* ── build ──────────────────────────────────────────────────────────────── */
  function build() {
    root = document.createElement('div');
    root.className = 'ot-nx-tour';
    root.innerHTML =
      '<div class="tr-spot"></div>' +
      '<div class="tr-card" role="dialog" aria-modal="false" aria-label="What is new on this screen">' +
        '<button type="button" class="tr-x" aria-label="Close the walkthrough">✕</button>' +
        '<p class="tr-kicker"></p>' +
        '<h3 class="tr-title"></h3>' +
        '<p class="tr-body"></p>' +
        '<div class="tr-foot">' +
          '<span class="tr-count"></span>' +
          '<span class="tr-btns">' +
            '<button type="button" class="tr-skip">Skip</button>' +
            '<button type="button" class="tr-back">Back</button>' +
            '<button type="button" class="tr-next">Next</button>' +
          '</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);
    spot = $('.tr-spot', root);
    card = $('.tr-card', root);
    $('.tr-x', root).onclick = stop;
    $('.tr-skip', root).onclick = stop;
    $('.tr-back', root).onclick = function () { goTo(idx - 1); };
    $('.tr-next', root).onclick = function () {
      if (idx >= live().length - 1) stop(); else goTo(idx + 1);
    };
    document.addEventListener('keydown', keys, true);
    onScroll = function () { position(); };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
  }

  function keys(e) {
    if (!root) return;
    if (e.key === 'Escape') { e.preventDefault(); stop(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); $('.tr-next', root).click(); }
    else if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(idx - 1); }
  }

  /* ── the spotlight: a transparent hole with a very large shadow around it.
        Simpler and more robust than a clip-path mask, and it lets the lit
        element keep its own painting untouched.                             */
  function position() {
    var list = live();
    var s = list[idx];
    if (!s) return;
    var el = elOf(s);
    if (!el) return;
    var r = el.getBoundingClientRect();
    var pad = s.pad == null ? 8 : s.pad;
    spot.style.top    = (r.top - pad) + 'px';
    spot.style.left   = (r.left - pad) + 'px';
    spot.style.width  = (r.width + pad * 2) + 'px';
    spot.style.height = (r.height + pad * 2) + 'px';

    /* place the card where there is room: below by default, above if the
       target is low, and clamped inside the viewport either way */
    var cw = card.offsetWidth || 320, ch = card.offsetHeight || 160;
    var below = r.bottom + pad + 12;
    var above = r.top - pad - 12 - ch;
    var top = (below + ch < window.innerHeight - 12) ? below
            : (above > 12 ? above : Math.max(12, window.innerHeight - ch - 12));
    var left = r.left + r.width / 2 - cw / 2;
    left = Math.min(Math.max(12, left), window.innerWidth - cw - 12);
    card.style.top = top + 'px';
    card.style.left = left + 'px';
    card.classList.toggle('is-above', top < r.top);
  }

  function goTo(i) {
    var list = live();
    if (!list.length) { stop(); return; }
    idx = Math.min(Math.max(0, i), list.length - 1);
    var s = list[idx];
    var el = elOf(s);
    if (el) {
      var r = el.getBoundingClientRect();
      if (r.top < 80 || r.bottom > window.innerHeight - 80) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
    $('.tr-kicker', root).textContent = s.kicker || 'New in this design';
    $('.tr-title', root).textContent = s.title;
    $('.tr-body', root).textContent = s.body;
    $('.tr-count', root).textContent = (idx + 1) + ' of ' + list.length;
    $('.tr-back', root).disabled = idx === 0;
    $('.tr-next', root).textContent = idx === list.length - 1 ? 'Done' : 'Next';
    /* let a smooth scroll land before measuring */
    position();
    setTimeout(position, 260);
    setTimeout(position, 520);
  }

  function start() {
    if (NX.capturing) return;               // ⛔ never in a captured frame
    if (!live().length) return;
    if (!root) build();
    root.hidden = false;
    document.body.classList.add('ot-nx-touring');
    goTo(0);
  }

  function stop() {
    if (!root) return;
    root.hidden = true;
    document.body.classList.remove('ot-nx-touring');
    markSeen();                              // dismissed means dismissed
  }

  /* ── the API a screen uses ──────────────────────────────────────────────── */
  window.NX.tour = {
    define: function (list) { steps = list || []; },
    start: start,
    stop: stop,
    /* offered once per screen, then never again unless asked for */
    autoStart: function () {
      if (NX.capturing || seen() || !steps.length) return;
      setTimeout(function () { if (live().length) start(); }, 900);
    },
    has: function () { return !NX.capturing && live().length > 0; },
    count: function () { return live().length; },
    seen: seen,
    reset: function () {
      var t = NX.get().tours || {};
      delete t[file()];
      NX.set({ tours: t });
    }
  };
})();

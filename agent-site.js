(function () {
  var DONE = 'agent-todos-done', PIN = 'agent-todos-pinned', OWNER = 'agent-owner';
  var UNREL = 'agent-reading-unrelated';
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function toggle(k, id) {
    var v = load(k), i = v.indexOf(id);
    if (i < 0) v.push(id); else v.splice(i, 1);
    save(k, v);
  }
  // owner mode: visit any page with #owner once to enable in this browser
  // (#guest disables). Guests never see the buttons and their stored marks
  // are ignored, so everyone else always sees the canonical list.
  function readHash() {
    if (location.hash === '#owner') localStorage.setItem(OWNER, '1');
    if (location.hash === '#guest') localStorage.removeItem(OWNER);
  }
  readHash();
  window.addEventListener('hashchange', function () { readHash(); apply(); });
  function isOwner() { return localStorage.getItem(OWNER) === '1'; }

  function apply() {
    var owner = isOwner();
    document.body.classList.toggle('owner', owner);
    var done = owner ? load(DONE) : [], pinned = owner ? load(PIN) : [];
    var unrel = owner ? load(UNREL) : [];
    // calendar chips of done todos disappear too
    document.querySelectorAll('.cal [data-tid]').forEach(function (el) {
      el.classList.toggle('done-chip', done.indexOf(el.dataset.tid) >= 0);
    });
    var lists = Array.prototype.slice.call(document.querySelectorAll('ul.todos'));
    if (!lists.length) return;
    var hidden = 0;
    lists.forEach(function (list) {  // one ul per embedded day group
      var items = Array.prototype.slice.call(list.querySelectorAll('li[data-tid]'));
      // pinned first within their day (keeping relative order), rest as rendered
      items.sort(function (a, b) {
        var pa = pinned.indexOf(a.dataset.tid) >= 0 ? 0 : 1;
        var pb = pinned.indexOf(b.dataset.tid) >= 0 ? 0 : 1;
        return pa - pb || (+a.dataset.idx) - (+b.dataset.idx);
      }).forEach(function (li) { list.appendChild(li); });

      var allDone = items.length > 0;
      items.forEach(function (li) {
        var id = li.dataset.tid;
        var isDone = done.indexOf(id) >= 0, isPin = pinned.indexOf(id) >= 0;
        var isUnrel = unrel.indexOf(id) >= 0;
        if (isDone || isUnrel) hidden++; else allDone = false;
        li.classList.toggle('done-item', isDone);
        li.classList.toggle('unrel-item', isUnrel);
        li.classList.toggle('pinned', isPin);
        var pb = li.querySelector('.b-pin'), db = li.querySelector('.b-done');
        var ub = li.querySelector('.b-unrel');
        if (pb) pb.textContent = isPin ? '\ud83d\udccc Unpin' : '\ud83d\udccc Pin';
        if (db) db.textContent = isDone ? '\u21a9 Restore' : '\u2713 Done';
        if (ub) ub.textContent = isUnrel ? '\u21a9 Undo unrelated' : '\ud83d\udeab Unrelated';
      });
      // a day whose todos are all done disappears with them
      var group = list.closest ? list.closest('details.t-day') : null;
      if (group) group.classList.toggle('all-done', allDone);
    });
    var bar = document.getElementById('todo-hidden-bar');
    if (bar) {
      bar.style.display = owner && hidden ? 'block' : 'none';
      bar.querySelector('span').textContent =
        hidden + ' done todo' + (hidden === 1 ? '' : 's') + ' hidden';
    }
  }

  document.addEventListener('click', function (ev) {
    if (!isOwner()) return;
    var btn = ev.target.closest ? ev.target.closest('button') : null;
    if (!btn) return;
    if (btn.id === 'todo-show-hidden') {
      var shown = document.body.classList.toggle('show-hidden');
      btn.textContent = shown ? 'hide' : 'show';
      return;
    }
    var li = btn.closest('li[data-tid]');
    if (!li) return;
    if (btn.classList.contains('b-pin')) toggle(PIN, li.dataset.tid);
    else if (btn.classList.contains('b-done')) toggle(DONE, li.dataset.tid);
    else if (btn.classList.contains('b-unrel')) {
      var id = li.dataset.tid;
      var marking = load(UNREL).indexOf(id) < 0;
      toggle(UNREL, id);
      if (marking) {
        // the static page can't reach the agent's store directly — hand the
        // mark to the existing owner->agent mail channel, prefilled
        var sec = li.closest('section');
        var addr = sec && sec.dataset.agentMail;
        if (addr) location.href = 'mailto:' + addr +
          '?subject=' + encodeURIComponent('agent: reading unrelated ' + id) +
          '&body=' + encodeURIComponent('Recorded from the website. Just hit send.');
      }
    }
    else return;
    apply();
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();

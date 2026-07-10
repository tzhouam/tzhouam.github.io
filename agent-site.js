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
    else if (btn.classList.contains('b-done')) {
      var marking = load(DONE).indexOf(li.dataset.tid) < 0;
      toggle(DONE, li.dataset.tid);
      if (marking) enqueueMark(li.dataset.tid, 'done');
    }
    else if (btn.classList.contains('b-unrel')) {
      var unrelMarking = load(UNREL).indexOf(li.dataset.tid) < 0;
      toggle(UNREL, li.dataset.tid);
      if (unrelMarking) enqueueMark(li.dataset.tid, 'unrelated');
    }
    else return;
    apply();
  });

  // ── marks sync: clicks act locally & instantly; the mark also queues and
  // pushes to the private marks repo, where the agent collects it each run.
  // The repo/token config lives INSIDE the encrypted page body (#marks-cfg),
  // so only the unlocked page can sync; without it the queue just waits. ──
  var MQ = 'agent-marks-queue';
  var marksBusy = false;
  function enqueueMark(id, action) {
    var q = load(MQ);
    q.push({ id: id, action: action, ts: new Date().toISOString() });
    save(MQ, q);
    flushMarks();
  }
  function flushMarks() {
    var cfg = document.getElementById('marks-cfg');
    var q = load(MQ);
    if (!cfg || !cfg.dataset.repo || !cfg.dataset.token || !q.length || marksBusy) return;
    marksBusy = true;
    var name = 'marks/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.json';
    fetch('https://api.github.com/repos/' + cfg.dataset.repo + '/contents/' + name, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + cfg.dataset.token,
                 Accept: 'application/vnd.github+json' },
      body: JSON.stringify({ message: 'website marks',
                             content: btoa(unescape(encodeURIComponent(JSON.stringify(q)))) }),
    }).then(function (res) { if (res.ok) save(MQ, []); marksBusy = false; })
      .catch(function () { marksBusy = false; /* offline — queue waits for the next visit */ });
  }
  // ── encrypted private pages (todos/reading/routines) ──
  // content ships as AES-GCM ciphertext; WebCrypto decrypts with the owner's
  // password (PBKDF2-SHA256, 100k iterations — must match the Python side).
  var PW = 'agent-site-pw';
  function b64bytes(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  function unlock(el, pw) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey'])
      .then(function (mat) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: b64bytes(el.dataset.salt), iterations: 100000, hash: 'SHA-256' },
          mat, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      })
      .then(function (key) {
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64bytes(el.dataset.iv) },
                                     key, b64bytes(el.dataset.ct));
      })
      .then(function (pt) {
        var host = document.createElement('div');
        host.innerHTML = new TextDecoder().decode(pt);
        el.replaceWith(host);
        apply();  // wire pin/done/unrelated buttons on the decrypted content
        flushMarks();  // marks-cfg is inside the ciphertext — retry any queued marks now
      });
  }
  function initLock() {
    var el = document.querySelector('section.lock');
    if (!el || !window.crypto || !crypto.subtle) return;
    var saved = localStorage.getItem(PW);
    if (saved) unlock(el, saved).catch(function () { localStorage.removeItem(PW); });
    el.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var pw = el.querySelector('input').value;
      unlock(el, pw).then(function () { localStorage.setItem(PW, pw); })
        .catch(function () { el.querySelector('.lock-err').textContent = 'wrong password'; });
    });
  }

  function boot() { apply(); initLock(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

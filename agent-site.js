(function () {
  var DONE = 'agent-todos-done', PIN = 'agent-todos-pinned';
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function toggle(k, id) {
    var v = load(k), i = v.indexOf(id);
    if (i < 0) v.push(id); else v.splice(i, 1);
    save(k, v);
  }

  function apply() {
    var done = load(DONE), pinned = load(PIN);
    // calendar chips of done todos disappear too
    document.querySelectorAll('.cal [data-tid]').forEach(function (el) {
      el.classList.toggle('done-chip', done.indexOf(el.dataset.tid) >= 0);
    });
    var list = document.querySelector('ul.todos');
    if (!list) return;
    var items = Array.prototype.slice.call(list.querySelectorAll('li[data-tid]'));
    // pinned first (keeping their relative order), the rest in rendered order
    items.sort(function (a, b) {
      var pa = pinned.indexOf(a.dataset.tid) >= 0 ? 0 : 1;
      var pb = pinned.indexOf(b.dataset.tid) >= 0 ? 0 : 1;
      return pa - pb || (+a.dataset.idx) - (+b.dataset.idx);
    }).forEach(function (li) { list.appendChild(li); });

    var hidden = 0;
    items.forEach(function (li) {
      var id = li.dataset.tid;
      var isDone = done.indexOf(id) >= 0, isPin = pinned.indexOf(id) >= 0;
      if (isDone) hidden++;
      li.classList.toggle('done-item', isDone);
      li.classList.toggle('pinned', isPin);
      var pb = li.querySelector('.b-pin'), db = li.querySelector('.b-done');
      if (pb) pb.textContent = isPin ? '\ud83d\udccc Unpin' : '\ud83d\udccc Pin';
      if (db) db.textContent = isDone ? '\u21a9 Restore' : '\u2713 Done';
    });
    var bar = document.getElementById('todo-hidden-bar');
    if (bar) {
      bar.style.display = hidden ? 'block' : 'none';
      bar.querySelector('span').textContent =
        hidden + ' done todo' + (hidden === 1 ? '' : 's') + ' hidden';
    }
  }

  document.addEventListener('click', function (ev) {
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
    else return;
    apply();
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();

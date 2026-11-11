/* Длинные нарды против компьютера.
   Обе стороны идут против часовой стрелки.
   Светлые (игрок): голова на пункте 24, путь 24 → 1, дом 1–6 (справа внизу).
   Тёмные (компьютер): голова на пункте 12, путь 12 → 1 → 24 → 13, дом 13–18 (слева вверху).
   Внутри расчётов позиция стороны — «своя» координата k: 24 — голова, 1–6 — дом, 0 — выброшена. */
(function () {
  var root = document.getElementById("nardy");
  if (!root) return;
  var W = 1, B = -1, HEAD = 24;

  // своя координата <-> пункт доски (для тёмных отображение симметрично)
  function bp(side, k) { return side === W ? k : (k > 12 ? k - 12 : k + 12); }

  function start() {
    var p = new Array(25).fill(0);
    p[24] = 15; p[12] = -15;
    return { p: p, off: { 1: 0, "-1": 0 } };
  }
  function clone(s) { return { p: s.p.slice(), off: { 1: s.off[1], "-1": s.off[-1] } }; }
  function at(s, side, k) { return s.p[bp(side, k)] * side; } // >0 свои, <0 чужие
  function allHome(s, side) { for (var k = 7; k <= 24; k++) if (at(s, side, k) > 0) return false; return true; }

  // Шестёрка подряд без шашки соперника впереди запрещена. Проверяем только блок, в который встала шашка.
  function badFence(s, side, toK) {
    var opp = -side, ahead = 99, run = 0, m, toOpp = bp(opp, bp(side, toK));
    for (m = 1; m <= 24; m++) if (at(s, opp, m) > 0) { ahead = m; break; }
    for (m = 1; m <= 24; m++) {
      run = at(s, opp, m) < 0 ? run + 1 : 0;
      if (run >= 6) {
        var lo = m - run + 1;
        if (ahead > lo && toOpp >= lo && toOpp <= m) return true;
      }
    }
    return false;
  }

  function apply(s, side, m) {
    var n = clone(s);
    n.p[bp(side, m.from)] -= side;
    if (m.to === 0) n.off[side]++; else n.p[bp(side, m.to)] += side;
    return n;
  }

  function single(s, side, d, headLeft) {
    var res = [], home = allHome(s, side);
    for (var k = 24; k >= 1; k--) {
      if (at(s, side, k) <= 0) continue;
      if (k === HEAD && headLeft <= 0) continue;
      var to = k - d, m = null;
      if (to >= 1) { if (at(s, side, to) >= 0) m = { from: k, to: to, d: d }; }
      else if (home) {
        if (to === 0) m = { from: k, to: 0, d: d };
        else {
          var farther = false;
          for (var j = k + 1; j <= 6; j++) if (at(s, side, j) > 0) farther = true;
          if (!farther) m = { from: k, to: 0, d: d };
        }
      }
      if (!m) continue;
      if (m.to && badFence(apply(s, side, m), side, m.to)) continue;
      res.push(m);
    }
    return res;
  }

  function key(s) { return s.p.join(",") + "|" + s.off[1] + "," + s.off[-1]; }

  // Все допустимые последовательности. uniq — режим компьютера: склеивает одинаковые позиции.
  function sequences(s, side, dice, first, uniq) {
    var headMax = first && dice.length === 4 && (dice[0] === 6 || dice[0] === 4 || dice[0] === 3) ? 2 : 1;
    var out = [], seen = {}, visited = {};
    function rec(st, left, seq, headUsed) {
      if (uniq) {
        var vk = key(st) + "#" + left.join("") + "#" + headUsed;
        if (visited[vk]) return; visited[vk] = 1;
      }
      var moved = false, tried = {};
      for (var a = 0; a < left.length; a++) {
        var d = left[a]; if (tried[d]) continue; tried[d] = 1;
        var ms = single(st, side, d, headMax - headUsed);
        for (var b = 0; b < ms.length; b++) {
          moved = true;
          rec(apply(st, side, ms[b]), left.slice(0, a).concat(left.slice(a + 1)), seq.concat([ms[b]]), headUsed + (ms[b].from === HEAD ? 1 : 0));
        }
      }
      if (!moved) {
        var k = key(st) + (uniq ? "" : "#" + seq.map(function (m) { return m.from + ">" + m.to; }).join(";"));
        if (!seen[k]) { seen[k] = 1; out.push({ seq: seq, st: st }); }
      }
    }
    rec(s, dice, [], 0);
    var max = 0; out.forEach(function (o) { if (o.seq.length > max) max = o.seq.length; });
    out = out.filter(function (o) { return o.seq.length === max; });
    if (max === 1 && dice.length === 2 && dice[0] !== dice[1]) {
      var big = Math.max(dice[0], dice[1]);
      var withBig = out.filter(function (o) { return o.seq[0].d === big; });
      if (withBig.length) out = withBig;
    }
    return out;
  }

  function pip(s, side) { var t = 0; for (var k = 1; k <= 24; k++) { var c = at(s, side, k); if (c > 0) t += c * k; } return t; }

  function evaluate(s, side) {
    var opp = -side, sc = pip(s, opp) - pip(s, side), k, c;
    var head = at(s, side, HEAD);
    if (head > 1) sc -= (head - 1) * 1.6;
    for (k = 1; k < 24; k++) {
      c = at(s, side, k);
      if (c > 0) { sc += 1.8; if (c > 3) sc -= (c - 3) * 1.2; }
    }
    // блоки на пути соперника, за которыми у него ещё есть шашки
    var behind = 0, run = 0, m;
    for (m = 24; m >= 1; m--) {
      var v = at(s, opp, m);
      if (v > 0) { behind += v; run = 0; continue; }
      if (v < 0) { run++; if (behind && run >= 2) sc += run * 1.4; }
      else run = 0;
    }
    return sc;
  }

  // ---------- интерфейс ----------
  var S, turn, dice, rolled, legal, done, sel, busy, turnStart, turnFirst, hist = [], first = {};
  var elBoard = root.querySelector(".nb__board"), elMsg = root.querySelector(".nb__msg"),
      elDice = root.querySelector(".nb__dice"), btnRoll = root.querySelector("[data-n=roll]"),
      btnNew = root.querySelector("[data-n=new]"), btnUndo = root.querySelector("[data-n=undo]"),
      elOff = root.querySelector(".nb__off");

  function msg(t) { elMsg.textContent = t; }
  var PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  function dieHTML(d, used) {
    var cells = ""; for (var k = 1; k <= 9; k++) cells += "<i" + (PIPS[d].indexOf(k) >= 0 ? ' class="on"' : "") + "></i>";
    return '<span class="die' + (used ? " die--used" : "") + '" aria-label="' + d + '">' + cells + "</span>";
  }
  function showDice() {
    if (!rolled) { elDice.innerHTML = ""; return; }
    var spent = turn === W ? done.map(function (m) { return m.d; }) : [];
    var dbl = rolled[0] === rolled[1];
    elDice.innerHTML = rolled.map(function (d) {
      var k = spent.indexOf(d), used = !dbl && k >= 0;
      if (used) spent.splice(k, 1);
      return dieHTML(d, used);
    }).join("") + (dbl && turn === W && legal ? '<span class="dbl">осталось ходов: ' + (legal[0].seq.length - done.length) + "</span>" : "");
  }


  // ---------- бросок костей: объёмные кубики кувыркаются и ложатся выпавшей гранью ----------
  var rolling = false;
  var ORI = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };
  var FACES = [[1, "rotateY(0deg)"], [6, "rotateY(180deg)"], [3, "rotateY(90deg)"], [4, "rotateY(-90deg)"], [2, "rotateX(90deg)"], [5, "rotateX(-90deg)"]];
  function cubeHTML() {
    return '<span class="d3w"><span class="d3__sh"></span><span class="d3"><span class="d3__cube">' + FACES.map(function (f) {
      var cells = ""; for (var k = 1; k <= 9; k++) cells += "<i" + (PIPS[f[0]].indexOf(k) >= 0 ? ' class="on"' : "") + "></i>";
      return '<span class="d3__f" style="transform:' + f[1] + ' translateZ(23px)">' + cells + "</span>";
    }).join("") + "</span></span></span>";
  }
  function rollAnim(r, cb) {
    var my = gid, ended = 0;
    rolling = true; btnRoll.disabled = true;
    elDice.innerHTML = cubeHTML() + cubeHTML();
    var ws = elDice.querySelectorAll(".d3w");
    function fin() {
      if (++ended < 2) return;
      if (my !== gid) { rolling = false; return; }
      elDice.innerHTML = r.map(function (d) { return dieHTML(d, false); }).join("");
      rolling = false; cb();
    }
    [].forEach.call(ws, function (w, k) {
      var mover = w.querySelector(".d3"), cube = w.querySelector(".d3__cube"), sh = w.querySelector(".d3__sh"), o = ORI[r[k]], done = false;
      var sx = Math.random() < .5 ? -1 : 1, tx = 2 + Math.floor(Math.random() * 2), ty = 1 + Math.floor(Math.random() * 2);
      var end = "rotateX(" + (o[0] + 360 * tx * sx) + "deg) rotateY(" + (o[1] + 360 * ty) + "deg) rotateZ(" + (k ? -360 : 360) + "deg)";
      var dur = 1100 + k * 130, delay = k * 80;
      function one() { if (done) return; done = true; fin(); }
      cube.style.transform = end;
      if (!cube.animate) { one(); return; }
      var opt = { duration: dur, delay: delay, fill: "backwards" };
      cube.animate([{ transform: "rotateX(" + 25 * sx + "deg) rotateY(-35deg) rotateZ(0deg)" }, { transform: end }], { duration: dur, delay: delay, fill: "backwards", easing: "cubic-bezier(.12,.6,.22,1)" });
      var X = [-170, -70, -14, 2, 8, 10, 0], Y = [-80, -46, 0, -18, 0, -5, 0], T = [0, .2, .42, .58, .74, .86, 1];
      mover.animate(T.map(function (t, i) { return { transform: "translate(" + X[i] + "px," + Y[i] + "px)", opacity: i ? 1 : 0, offset: t }; }), opt);
      sh.animate(T.map(function (t, i) { var up = Math.min(1, -Y[i] / 60); return { transform: "translateX(" + X[i] + "px) scale(" + (1 - up * .55) + ")", opacity: i ? .5 - up * .3 : 0, offset: t }; }), opt).onfinish = one;
      setTimeout(one, dur + delay + 300);
    });
  }

  function firstMoves() { return legal ? legal.map(function (o) { return o.seq[done.length]; }).filter(Boolean) : []; }
  function prefixOK(o) { for (var i = 0; i < done.length; i++) { var a = o.seq[i], b = done[i]; if (!a || a.from !== b.from || a.to !== b.to || a.d !== b.d) return false; } return true; }
  function canPick(i) { return turn === W && !busy && firstMoves().some(function (m) { return m.from === i; }); }
  function targets() { if (sel == null) return []; return firstMoves().filter(function (m) { return m.from === sel; }).map(function (m) { return m.to; }); }

  function stack(n, col) {
    var out = "", shown = Math.min(n, 5);
    for (var k = 0; k < shown; k++) out += '<span class="ck ck--' + col + '">' + (k === shown - 1 && n > 5 ? n : "") + "</span>";
    return out;
  }
  function pointHTML(i, top) {
    var v = S.p[i], tg = targets();
    var cls = "pt " + (top ? "pt--top" : "pt--bot") + (i % 2 ? " pt--odd" : " pt--even");
    if (tg.indexOf(i) >= 0) cls += " is-to";
    if (canPick(i)) cls += " is-pick";
    if (sel === i) cls += " is-sel";
    return '<button type="button" class="' + cls + '" data-p="' + i + '" aria-label="Пункт ' + i + (v ? ", шашек " + Math.abs(v) : "") + '">' +
      '<span class="pt__tri"></span><span class="pt__stack">' + (v ? stack(Math.abs(v), v > 0 ? "w" : "b") : "") + '</span><span class="pt__n">' + i + "</span></button>";
  }
  function render() {
    var top = "", bot = "", i;
    for (i = 13; i <= 18; i++) top += pointHTML(i, true);
    top += '<div class="bar bar--top"></div>';
    for (i = 19; i <= 24; i++) top += pointHTML(i, true);
    for (i = 12; i >= 7; i--) bot += pointHTML(i, false);
    bot += '<div class="bar bar--bot"></div>';
    for (i = 6; i >= 1; i--) bot += pointHTML(i, false);
    elBoard.innerHTML = '<div class="nb__half">' + top + '</div><div class="nb__half">' + bot + "</div>";
    var offOK = targets().indexOf(0) >= 0;
    elOff.innerHTML = '<span>Вы выбросили ' + S.off[W] + ' из 15</span><button type="button" class="nb__offbtn' + (offOK ? " is-to" : "") + '" data-p="0"' + (offOK ? "" : " disabled") + '>Выбросить шашку</button><span>Компьютер: ' + S.off[B] + " из 15</span>";
    btnUndo.disabled = !(hist.length && turn === W && !busy);
    btnRoll.disabled = !(turn === W && !legal && !busy);
    showDice();
  }

  function roll() { return [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]; }
  function expand(r) { return r[0] === r[1] ? [r[0], r[0], r[0], r[0]] : r.slice(); }

  var gid = 0;
  function newGame() {
    gid++;
    S = start(); hist = []; done = []; sel = null; legal = null; busy = false; rolled = null; first = { 1: true, "-1": true };
    var a, b; do { a = roll()[0]; b = roll()[0]; } while (a === b);
    if (a > b) { turn = W; render(); msg("Вам выпало " + a + ", компьютеру " + b + " — вы ходите первым. Бросайте кости."); }
    else { turn = B; rolled = [b, a]; render(); msg("Компьютеру выпало " + b + ", вам " + a + " — он ходит первым."); setTimeout(function () { var r = roll(); rollAnim(r, function () { aiTurn(r); }); }, 1000); }
  }

  function beginHuman(r) {
    rolled = r; dice = expand(r); done = []; sel = null; hist = []; turnStart = S;
    turnFirst = first[W]; first[W] = false;
    legal = sequences(S, W, dice, turnFirst, false);
    if (!legal.length || !legal[0].seq.length) { legal = null; render(); msg("Выпало " + r.join(" и ") + " — ходов нет, ход переходит компьютеру."); setTimeout(endHuman, 1100); return; }
    render();
    var note = legal[0].seq.length < dice.length ? " Сыграть можно только " + legal[0].seq.length + " из " + dice.length + "." : "";
    msg("Выпало " + r.join(" и ") + ". Нажмите на шашку, затем на пункт, куда её поставить." + note);
  }

  function endHuman() {
    sel = null; legal = null;
    if (S.off[W] === 15) { finish(W); return; }
    turn = B; render();
    setTimeout(function () { var r = roll(); msg("Компьютер бросает кости…"); rollAnim(r, function () { aiTurn(r); }); }, 450);
  }

  function aiTurn(r) {
    var my = gid;
    busy = true; rolled = r; render();
    var seqs = sequences(S, B, expand(r), first[B], true), best = null, bs = -1e9;
    first[B] = false;
    best = choose(seqs, B);
    if (!best || !best.seq.length) { busy = false; turn = W; render(); msg("Компьютеру выпало " + r.join(" и ") + " — ходов нет. Бросайте кости."); return; }
    var steps = best.seq.slice();
    (function step() {
      if (my !== gid) return;
      if (!steps.length) {
        busy = false;
        if (S.off[B] === 15) { finish(B); return; }
        turn = W; render(); msg("Компьютер сходил на " + r.join(" и ") + ". Бросайте кости.");
        return;
      }
      var m = steps.shift();
      moveAnimated(B, m, 480, function () { S = apply(S, B, m); }, function () { setTimeout(step, 130); });
    })();
  }

  function finish(side) {
    turn = 0; legal = null; render();
    var mars = side === W ? S.off[B] === 0 : S.off[W] === 0;
    msg((side === W ? "Вы выиграли" : "Выиграл компьютер") + (mars ? " с марсом: соперник не успел выбросить ни одной шашки." : ".") + " Сыграем ещё?");
    root.classList.add("is-over");
  }


  function idOf(side, k) { return k === 0 ? (side === W ? "offW" : "offB") : bp(side, k); }
  function victimBar() { return null; }

  // ---------- плавные ходы и перетаскивание ----------
  var anim = false, drag = null;
  function slot(id) {
    if (id === "barW") return root.querySelector(".bar--bot");
    if (id === "barB") return root.querySelector(".bar--top");
    if (id === "offW") return elOff.querySelector("span");
    if (id === "offB") { var s = elOff.querySelectorAll("span"); return s[s.length - 1]; }
    return root.querySelector('.pt[data-p="' + id + '"]');
  }
  function topCk(id) { var el = slot(id); if (!el || /^off/.test(id)) return null; var c = el.querySelectorAll(".ck"); return c.length ? c[c.length - 1] : null; }
  function rectOf(id, size) {
    var c = topCk(id); if (c) return c.getBoundingClientRect();
    var el = slot(id), r = el.getBoundingClientRect(), s = size || 30;
    return { left: r.left + r.width / 2 - s / 2, top: r.top + r.height / 2 - s / 2, width: s, height: s };
  }
  function ghost(col, r) {
    var g = document.createElement("span");
    g.className = "ck ck--" + col + " ck--ghost";
    g.style.cssText = "position:fixed;left:" + r.left + "px;top:" + r.top + "px;width:" + r.width + "px;height:" + r.height + "px;margin:0;z-index:60;pointer-events:none";
    document.body.appendChild(g); return g;
  }
  function fly(g, to, ms, fade, cb) {
    var from = g.getBoundingClientRect();
    var dx = to.left - from.left + (to.width - from.width) / 2, dy = to.top - from.top + (to.height - from.height) / 2;
    if (!g.animate || ms <= 0) { g.remove(); cb(); return; }
    var a = g.animate([{ transform: "translate(0,0)", opacity: 1 }, { transform: "translate(" + dx + "px," + dy + "px)", opacity: fade ? 0 : 1 }],
                      { duration: ms, easing: "cubic-bezier(.45,0,.2,1)", fill: "forwards" });
    var over = false; function end() { if (over) return; over = true; g.remove(); cb(); }
    a.onfinish = end; setTimeout(end, ms + 200);
  }
  // ход с анимацией: change() меняет позицию, после перерисовки шашка долетает до места
  function moveAnimated(side, m, ms, change, after, g0) {
    anim = true;
    var col = side === W ? "w" : "b", fromId = idOf(side, m.from), toId = idOf(side, m.to), vic = victimBar(side, m);
    var g = g0 || ghost(col, rectOf(fromId)), size = g.getBoundingClientRect().width;
    var vg = vic ? ghost(col === "w" ? "b" : "w", rectOf(toId)) : null;
    change(); render();
    var dst = topCk(toId), vdst = vic ? topCk(vic) : null, left = vg ? 2 : 1;
    if (dst) dst.style.visibility = "hidden";
    if (vdst) vdst.style.visibility = "hidden";
    function fin() { if (--left) return; if (dst) dst.style.visibility = ""; if (vdst) vdst.style.visibility = ""; anim = false; after(); }
    fly(g, rectOf(toId, size), ms, /^off/.test(toId), fin);
    if (vg) fly(vg, rectOf(vic, size), ms + 120, false, fin);
  }
  function mark() {
    var tg = targets();
    root.querySelectorAll("[data-p]").forEach(function (el) {
      var i = +el.getAttribute("data-p");
      el.classList.toggle("is-pick", canPick(i));
      el.classList.toggle("is-sel", sel === i);
      if (el.classList.contains("pt")) el.classList.toggle("is-to", tg.indexOf(i) >= 0);
    });
    var ob = elOff.querySelector(".nb__offbtn"); if (ob) { var ok = tg.indexOf(0) >= 0; ob.classList.toggle("is-to", ok); ob.disabled = !ok; }
  }
  function pick(from, to) { return firstMoves().filter(function (x) { return x.from === from && x.to === to; })[0]; }
  function humanMove(m, g0) {
    hist.push({ S: S, done: done.slice() });
    moveAnimated(W, m, g0 ? 180 : 320, function () { S = apply(S, W, m); done.push(m); sel = null; legal = legal.filter(prefixOK); }, function () {
      if (done.length >= legal[0].seq.length) { msg("Ход сделан."); endHuman(); }
    }, g0);
  }
  function dropAt(x, y) {
    var tg = targets(), el = document.elementFromPoint(x, y), t = el && el.closest("[data-p]");
    if (t && root.contains(t)) { var i = +t.getAttribute("data-p"); if (tg.indexOf(i) >= 0) return i; }
    if (tg.indexOf(0) >= 0) {
      var br = elBoard.getBoundingClientRect();
      if ((el && el.closest(".nb__off")) || x > br.right) return 0;
    }
    return null;
  }
  root.addEventListener("pointerdown", function (e) {
    if (e.button > 0 || anim || drag) return;
    var t = e.target.closest("[data-p]"); if (!t || turn !== W || busy || !legal) return;
    var i = +t.getAttribute("data-p");
    if (sel != null && sel !== i && targets().indexOf(i) >= 0) { e.preventDefault(); humanMove(pick(sel, i)); return; }
    if (!canPick(i)) { if (sel != null) { sel = null; mark(); } return; }
    e.preventDefault();
    drag = { i: i, x: e.clientX, y: e.clientY, was: sel === i, g: null, id: e.pointerId, hot: null };
    sel = i; mark();
    try { t.setPointerCapture(e.pointerId); } catch (_) {}
  });
  root.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.g) {
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 8) return;
      var c = topCk(idOf(W, drag.i)); if (!c) return;
      var r = c.getBoundingClientRect();
      drag.r = r; drag.src = c; drag.ox = drag.x - r.left; drag.oy = drag.y - r.top;
      drag.g = ghost("w", r); drag.g.classList.add("is-drag"); c.style.visibility = "hidden";
    }
    drag.g.style.left = (e.clientX - drag.ox) + "px"; drag.g.style.top = (e.clientY - drag.oy) + "px";
    var to = dropAt(e.clientX, e.clientY), hot = to == null ? null : (to === 0 ? elOff.querySelector(".nb__offbtn") : root.querySelector('.pt[data-p="' + to + '"]'));
    if (hot !== drag.hot) { if (drag.hot) drag.hot.classList.remove("is-hot"); if (hot) hot.classList.add("is-hot"); drag.hot = hot; }
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    if (d.hot) d.hot.classList.remove("is-hot");
    if (!d.g) { if (d.was) { sel = null; mark(); } return; }
    d.g.classList.remove("is-drag");
    var to = e.type === "pointerup" ? dropAt(e.clientX, e.clientY) : null;
    if (to != null) { humanMove(pick(d.i, to), d.g); return; }
    anim = true;
    fly(d.g, d.r, 200, false, function () { d.src.style.visibility = ""; anim = false; });
  }
  root.addEventListener("pointerup", endDrag);
  root.addEventListener("pointercancel", endDrag);
  // клавиатура: Enter/пробел дают click без указателя
  root.addEventListener("click", function (e) {
    if (e.detail !== 0 || anim) return;
    var t = e.target.closest("[data-p]"); if (!t || turn !== W || busy || !legal) return;
    var i = +t.getAttribute("data-p");
    if (sel != null && targets().indexOf(i) >= 0) { humanMove(pick(sel, i)); return; }
    if (canPick(i)) { sel = sel === i ? null : i; mark(); }
  });

  function replies(st, side, d) { return sequences(st, side, d, false, true); }

  // ---------- сила соперника ----------
  var LEVELS = [["Внучок", "путает ходы"], ["Сосед по даче", "играет на интерес"], ["Дед со двора", "считает каждый ход"], ["Дед Нардыч", "думает за вас на ход вперёд"]];
  var level = 1;
  try { var lv = localStorage.getItem("nardyLevel"); if (lv !== null && +lv >= 0 && +lv <= 3) level = +lv; } catch (_) {}
  var elLvl = root.querySelector(".nb__lvl");
  function drawLevel() {
    if (!elLvl) return;
    elLvl.innerHTML = '<span class="nb__lvlt">Соперник: <b>' + LEVELS[level][0] + "</b>, " + LEVELS[level][1] + '</span><div class="nb__lvlb" role="radiogroup" aria-label="Сила компьютера">' +
      LEVELS.map(function (l, k) {
        var bars = ""; for (var j = 0; j < 4; j++) bars += "<s" + (j <= k ? ' class="on"' : "") + "></s>";
        return '<button type="button" role="radio" aria-checked="' + (k === level) + '" data-lvl="' + k + '"><span>' + l[0] + '</span><i class="lvlbar" aria-hidden="true">' + bars + "</i></button>";
      }).join("") + "</div>";
  }
  if (elLvl) elLvl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-lvl]"); if (!b) return;
    level = +b.getAttribute("data-lvl");
    try { localStorage.setItem("nardyLevel", String(level)); } catch (_) {}
    drawLevel();
    var t = elLvl.querySelector('[data-lvl="' + level + '"]'); if (t) t.focus();
  });
  drawLevel();
  function choose(seqs, side) {
    if (!seqs.length) return null;
    var scored = seqs.map(function (o) { return { o: o, v: evaluate(o.st, side) }; });
    if (level === 0) { if (Math.random() < .55) return seqs[Math.floor(Math.random() * seqs.length)]; scored.forEach(function (x) { x.v += Math.random() * 14; }); }
    else if (level === 1) scored.forEach(function (x) { x.v += Math.random() * 5; });
    else if (level === 2) scored.forEach(function (x) { x.v += Math.random() * .3; });
    scored.sort(function (a, b) { return b.v - a.v; });
    if (level < 3 || scored.length === 1) return scored[0].o;
    // Дед Нардыч: для лучших ходов перебирает все 21 бросок соперника и его лучший ответ
    var best = null, bv = -1e9;
    scored.slice(0, 5).forEach(function (x) {
      var tot = 0, ws = 0;
      for (var a = 1; a <= 6; a++) for (var b = a; b <= 6; b++) {
        var w = a === b ? 1 : 2, rep = replies(x.o.st, -side, a === b ? [a, a, a, a] : [a, b]), top = null, tv = -1e9;
        for (var k = 0; k < rep.length; k++) { var v = evaluate(rep[k].st, -side); if (v > tv) { tv = v; top = rep[k]; } }
        tot += w * (top ? -tv : x.v); ws += w;
      }
      var val = tot / ws + x.v * .15;
      if (val > bv) { bv = val; best = x.o; }
    });
    return best;
  }

  // ---------- живость: сообщения, кости, счёт, раздача, итог партии ----------
  var _msg = msg;
  msg = function (t) {
    _msg(t); elMsg.classList.remove("is-new"); void elMsg.offsetWidth; elMsg.classList.add("is-new");
    if (/ходов нет/.test(t) && elDice.animate) elDice.animate([{ transform: "translateX(0)" }, { transform: "translateX(-7px)" }, { transform: "translateX(7px)" }, { transform: "translateX(-4px)" }, { transform: "translateX(0)" }], { duration: 400 });
  };
  function pop(el) { if (el && el.animate) el.animate([{ transform: "scale(1)" }, { transform: "scale(1.12)", background: "#5A3A20" }, { transform: "scale(1)" }], { duration: 450, easing: "ease-out" }); }
  var _render = render, offPrev = [0, 0], usedPrev = 0, dealUntil = 0;
  render = function () {
    if (dealUntil && Date.now() > dealUntil) { elBoard.classList.remove("is-deal"); dealUntil = 0; }
    _render();
    root.classList.toggle("is-you", turn === W);
    var sp = elOff.querySelectorAll("span");
    if (S.off[W] > offPrev[0]) pop(sp[0]);
    if (S.off[B] > offPrev[1]) pop(sp[sp.length - 1]);
    offPrev = [S.off[W], S.off[B]];
    var u = elDice.querySelectorAll(".die--used");
    for (var k = usedPrev; k < u.length; k++) if (u[k].animate) u[k].animate([{ opacity: 1, transform: "scale(1)" }, { opacity: .3, transform: "scale(.86)" }], { duration: 320, easing: "ease-out" });
    usedPrev = u.length;
  };
  var _finish = finish;
  finish = function (side) {
    _finish(side);
    var nm = LEVELS[level][0], mars = side === W ? S.off[B] === 0 : S.off[W] === 0, fr = root.querySelector(".nb__frame");
    var o = document.createElement("div");
    o.className = "nb__result" + (side === W ? " is-win" : "");
    o.innerHTML = "<b>" + (side === W ? "Победа" : "Поражение") + "</b><span>" +
      (side === W ? (mars ? "С марсом! " + nm + " не успел выбросить ни одной шашки." : "Вы первым вывели все 15 шашек. " + nm + " просит реванш.")
                  : (mars ? nm + " выиграл с марсом. Отыграемся?" : nm + " оказался быстрее. Сыграем ещё?")) +
      '</span><button type="button" class="nb__again">Новая партия</button>';
    fr.appendChild(o);
  };
  root.addEventListener("click", function (e) {
    if (e.target.closest(".nb__again")) { btnNew.click(); return; }
    var o = e.target.closest(".nb__result"); if (o) o.remove();
  });
  var _newGame = newGame;
  newGame = function () {
    var o = root.querySelector(".nb__result"); if (o) o.remove();
    elBoard.classList.add("is-deal"); dealUntil = Date.now() + 1100; usedPrev = 0; offPrev = [0, 0];
    _newGame();
  };
  if (window.__nardyAI) window.__nardyAI({ choose: choose, setLevel: function (l) { level = l; }, sequences: sequences, start: start, evaluate: evaluate, apply: apply, W: W, B: B });

  btnRoll.addEventListener("click", function () { if (turn === W && !legal && !busy && !anim && !rolling) { var r = roll(); rollAnim(r, function () { beginHuman(r); }); } });
  btnNew.addEventListener("click", function () { root.classList.remove("is-over"); newGame(); });
  btnUndo.addEventListener("click", function () {
    if (!hist.length || turn !== W || busy || anim) return;
    var h = hist.pop(), um = done[done.length - 1];
    moveAnimated(W, { from: um.to, to: um.from }, 260, function () { S = h.S; done = h.done; sel = null; legal = sequences(turnStart, W, dice, turnFirst, false).filter(prefixOK); }, function () {});
  });

  if (window.__nardyTest) window.__nardyTest({ start: start, sequences: sequences, apply: apply, bp: bp, badFence: badFence, evaluate: evaluate, W: W, B: B });
  newGame();
})();

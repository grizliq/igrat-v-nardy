/* Короткие нарды (бэкгаммон) против компьютера.
   Белые — игрок, идут 24→1, дом 1–6. Чёрные — компьютер, идут 1→24, дом 19–24. */
(function () {
  var root = document.getElementById("nardy");
  if (!root) return;
  var W = 1, B = -1;

  function start() {
    var p = new Array(26).fill(0);
    p[24] = 2; p[13] = 5; p[8] = 3; p[6] = 5;
    p[1] = -2; p[12] = -5; p[17] = -3; p[19] = -5;
    return { p: p, bar: { 1: 0, "-1": 0 }, off: { 1: 0, "-1": 0 } };
  }
  function clone(s) { return { p: s.p.slice(), bar: { 1: s.bar[1], "-1": s.bar[-1] }, off: { 1: s.off[1], "-1": s.off[-1] } }; }
  function own(s, i, side) { return side === W ? s.p[i] > 0 : s.p[i] < 0; }
  function cnt(s, i) { return Math.abs(s.p[i]); }
  function allHome(s, side) {
    if (s.bar[side]) return false;
    for (var i = 1; i <= 24; i++) {
      if (!own(s, i, side)) continue;
      if (side === W && i > 6) return false;
      if (side === B && i < 19) return false;
    }
    return true;
  }
  function open(s, to, side) { return side === W ? s.p[to] >= -1 : s.p[to] <= 1; }

  function single(s, side, d) {
    var res = [], i, to;
    if (s.bar[side]) {
      to = side === W ? 25 - d : d;
      if (open(s, to, side)) res.push({ from: side === W ? 25 : 0, to: to, d: d });
      return res;
    }
    var home = allHome(s, side);
    for (i = 1; i <= 24; i++) {
      if (!own(s, i, side)) continue;
      to = i - side * d;
      if (to >= 1 && to <= 24) { if (open(s, to, side)) res.push({ from: i, to: to, d: d }); continue; }
      if (!home) continue;
      if ((side === W && to === 0) || (side === B && to === 25)) { res.push({ from: i, to: side === W ? 0 : 25, d: d }); continue; }
      var farther = false, j;
      if (side === W) { for (j = i + 1; j <= 6; j++) if (own(s, j, W)) farther = true; }
      else { for (j = 19; j < i; j++) if (own(s, j, B)) farther = true; }
      if (!farther) res.push({ from: i, to: side === W ? 0 : 25, d: d });
    }
    return res;
  }
  function apply(s, side, m) {
    var n = clone(s);
    if ((side === W && m.from === 25) || (side === B && m.from === 0)) n.bar[side]--; else n.p[m.from] -= side;
    if ((side === W && m.to === 0) || (side === B && m.to === 25)) { n.off[side]++; return n; }
    if (n.p[m.to] === -side) { n.p[m.to] = 0; n.bar[-side]++; }
    n.p[m.to] += side;
    return n;
  }
  function key(s) { return s.p.join(",") + "|" + s.bar[1] + "," + s.bar[-1] + "|" + s.off[1] + "," + s.off[-1]; }

  function sequences(s, side, dice) {
    var out = [], seen = {};
    function rec(st, left, seq) {
      var moved = false, tried = {};
      for (var a = 0; a < left.length; a++) {
        var d = left[a]; if (tried[d]) continue; tried[d] = 1;
        var ms = single(st, side, d);
        for (var b = 0; b < ms.length; b++) {
          moved = true;
          var m = { from: ms[b].from, to: ms[b].to, d: d };
          rec(apply(st, side, m), left.slice(0, a).concat(left.slice(a + 1)), seq.concat([m]));
        }
      }
      if (!moved) {
        var k = key(st) + "#" + seq.map(function (m) { return m.from + ">" + m.to; }).join(";");
        if (!seen[k]) { seen[k] = 1; out.push({ seq: seq, st: st }); }
      }
    }
    rec(s, dice, []);
    var max = 0; out.forEach(function (o) { if (o.seq.length > max) max = o.seq.length; });
    out = out.filter(function (o) { return o.seq.length === max; });
    if (max === 1 && dice.length === 2 && dice[0] !== dice[1]) {
      var big = Math.max(dice[0], dice[1]);
      var withBig = out.filter(function (o) { return o.seq[0].d === big; });
      if (withBig.length) out = withBig;
    }
    return out;
  }

  function pip(s, side) {
    var t = s.bar[side] * 25;
    for (var i = 1; i <= 24; i++) if (own(s, i, side)) t += cnt(s, i) * (side === W ? i : 25 - i);
    return t;
  }
  function evaluate(s, side) {
    var opp = -side, sc = pip(s, opp) - pip(s, side);
    sc += s.bar[opp] * 12 - s.bar[side] * 12 + s.off[side] * 6;
    for (var i = 1; i <= 24; i++) {
      if (!own(s, i, side)) continue;
      var c = cnt(s, i);
      if (c >= 2) sc += 3;
      if (c === 1) {
        var risk = s.bar[opp] ? 2 : 0;
        for (var j = 1; j <= 24; j++) {
          if (!own(s, j, opp)) continue;
          var dist = opp === W ? j - i : i - j;
          if (dist > 0 && dist <= 12) risk += dist <= 6 ? 2 : 1;
        }
        sc -= risk * 1.3;
      }
    }
    return sc;
  }

  // ---------- интерфейс ----------
  var S, turn, dice, rolled, legal, done, sel, busy, turnStart, hist = [];
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
    }).join("") + (dbl && turn === W && legal ? '<span class="dbl">осталось ходов: ' + (4 - done.length) + "</span>" : "");
  }


  // ---------- бросок костей ----------
  var rolling = false;
  function setFace(d, n) { var is = d.querySelectorAll("i"); for (var k = 0; k < 9; k++) is[k].className = PIPS[n].indexOf(k + 1) >= 0 ? "on" : ""; }
  function rollAnim(r, cb) {
    var my = gid, t0 = Date.now(), dur = 760;
    rolling = true; btnRoll.disabled = true;
    elDice.innerHTML = dieHTML(1 + Math.floor(Math.random() * 6), false) + dieHTML(1 + Math.floor(Math.random() * 6), false);
    var ds = elDice.querySelectorAll(".die");
    ds.forEach(function (d, k) { d.classList.add("die--roll", k ? "die--r2" : "die--r1"); });
    (function tick() {
      if (my !== gid) { rolling = false; return; }
      if (Date.now() - t0 < dur - 160) { ds.forEach(function (d) { setFace(d, 1 + Math.floor(Math.random() * 6)); }); setTimeout(tick, 70); return; }
      ds.forEach(function (d, k) { setFace(d, r[k]); d.classList.add("die--land"); });
      setTimeout(function () { rolling = false; if (my === gid) cb(); }, 260);
    })();
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
    top += '<div class="bar bar--top">' + stack(S.bar[B], "b") + "</div>";
    for (i = 19; i <= 24; i++) top += pointHTML(i, true);
    for (i = 12; i >= 7; i--) bot += pointHTML(i, false);
    bot += '<button type="button" class="bar bar--bot' + (canPick(25) ? " is-pick" : "") + (sel === 25 ? " is-sel" : "") + '" data-p="25" aria-label="Бар">' + stack(S.bar[W], "w") + "</button>";
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
    S = start(); hist = []; done = []; sel = null; legal = null; busy = false; rolled = null;
    var a, b; do { a = roll()[0]; b = roll()[0]; } while (a === b);
    if (a > b) { turn = W; render(); rollAnim([a, b], function () { beginHuman([a, b]); msg("Вам выпало " + a + ", компьютеру " + b + " — вы ходите первым. Нажмите на свою шашку."); }); }
    else { turn = B; rolled = null; render(); msg("Компьютеру выпало " + b + ", вам " + a + " — он ходит первым."); setTimeout(function () { rollAnim([b, a], function () { aiTurn([b, a]); }); }, 500); }
  }

  function beginHuman(r) {
    rolled = r; dice = expand(r); done = []; sel = null; hist = []; turnStart = S;
    legal = sequences(S, W, dice);
    if (!legal.length || !legal[0].seq.length) { legal = null; render(); msg("Выпало " + r.join(" и ") + " — ходов нет, ход переходит компьютеру."); setTimeout(endHuman, 900); return; }
    render();
    if (!elMsg.textContent || elMsg.textContent.indexOf("первым") < 0) msg("Выпало " + r.join(" и ") + ". Нажмите на шашку, затем на пункт, куда её поставить.");
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
    var seqs = sequences(S, B, expand(r)), best = null, bs = -1e9;
    seqs.forEach(function (o) { var v = evaluate(o.st, B) + Math.random() * 0.4; if (v > bs) { bs = v; best = o; } });
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


  function idOf(side, n) { if (side === W) return n === 25 ? "barW" : n === 0 ? "offW" : n; return n === 0 ? "barB" : n === 25 ? "offB" : n; }
  function victimBar(side, m) { var to = m.to; return to >= 1 && to <= 24 && S.p[to] === -side ? (side === W ? "barB" : "barW") : null; }

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
  btnRoll.addEventListener("click", function () { if (turn === W && !legal && !busy && !anim && !rolling) { var r = roll(); rollAnim(r, function () { beginHuman(r); }); } });
  btnNew.addEventListener("click", function () { root.classList.remove("is-over"); newGame(); });
  btnUndo.addEventListener("click", function () {
    if (!hist.length || turn !== W || busy || anim) return;
    var h = hist.pop(); S = h.S; done = h.done; sel = null;
    legal = sequences(turnStart, W, dice).filter(prefixOK); render();
  });

  newGame();
})();

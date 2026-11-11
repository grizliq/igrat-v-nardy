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

  function newGame() {
    S = start(); hist = []; done = []; sel = null; legal = null; busy = false; rolled = null; first = { 1: true, "-1": true };
    var a, b; do { a = roll()[0]; b = roll()[0]; } while (a === b);
    if (a > b) { turn = W; render(); msg("Вам выпало " + a + ", компьютеру " + b + " — вы ходите первым. Бросайте кости."); }
    else { turn = B; rolled = [b, a]; render(); msg("Компьютеру выпало " + b + ", вам " + a + " — он ходит первым."); setTimeout(function () { aiTurn(roll()); }, 900); }
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
    setTimeout(function () { aiTurn(roll()); }, 500);
  }

  function aiTurn(r) {
    busy = true; rolled = r; render();
    var seqs = sequences(S, B, expand(r), first[B], true), best = null, bs = -1e9;
    first[B] = false;
    seqs.forEach(function (o) { var v = evaluate(o.st, B) + Math.random() * 0.5; if (v > bs) { bs = v; best = o; } });
    if (!best || !best.seq.length) { busy = false; turn = W; render(); msg("Компьютеру выпало " + r.join(" и ") + " — ходов нет. Бросайте кости."); return; }
    var steps = best.seq.slice();
    (function step() {
      if (!steps.length) {
        busy = false;
        if (S.off[B] === 15) { finish(B); return; }
        turn = W; render(); msg("Компьютер сходил на " + r.join(" и ") + ". Бросайте кости.");
        return;
      }
      S = apply(S, B, steps.shift()); render(); setTimeout(step, 380);
    })();
  }

  function finish(side) {
    turn = 0; legal = null; render();
    var mars = side === W ? S.off[B] === 0 : S.off[W] === 0;
    msg((side === W ? "Вы выиграли" : "Выиграл компьютер") + (mars ? " с марсом: соперник не успел выбросить ни одной шашки." : ".") + " Сыграем ещё?");
    root.classList.add("is-over");
  }

  root.addEventListener("click", function (e) {
    var t = e.target.closest("[data-p]"); if (!t || turn !== W || busy || !legal) return;
    var i = +t.getAttribute("data-p");
    if (sel != null && targets().indexOf(i) >= 0) {
      var m = firstMoves().filter(function (x) { return x.from === sel && x.to === i; })[0];
      hist.push({ S: S, done: done.slice() });
      S = apply(S, W, m); done.push(m); sel = null;
      legal = legal.filter(prefixOK);
      if (done.length >= legal[0].seq.length) { msg("Ход сделан."); endHuman(); return; }
      render(); return;
    }
    if (canPick(i)) { sel = sel === i ? null : i; render(); }
  });
  btnRoll.addEventListener("click", function () { if (turn === W && !legal && !busy) beginHuman(roll()); });
  btnNew.addEventListener("click", function () { root.classList.remove("is-over"); newGame(); });
  btnUndo.addEventListener("click", function () {
    if (!hist.length || turn !== W || busy) return;
    var h = hist.pop(); S = h.S; done = h.done; sel = null;
    legal = sequences(turnStart, W, dice, turnFirst, false).filter(prefixOK); render();
  });

  if (window.__nardyTest) window.__nardyTest({ start: start, sequences: sequences, apply: apply, bp: bp, badFence: badFence, evaluate: evaluate, W: W, B: B });
  newGame();
})();

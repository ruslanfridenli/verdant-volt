(() => {
  // main.ts
  var I18N = { "en": { "add": "Add holding", "asset": "Asset", "qty": "Quantity", "cost": "Avg cost", "addbtn": "+ Add", "simulate": "Simulation", "vol": "Volatility", "drift": "Drift %", "tick": "\u27F3 Tick market", "reset": "\u21BB Reset", "value": "Portfolio value", "pnl": "Total P&L", "alloc": "Allocation", "empty": "no holdings yet \u2014 add one", "del": "remove" }, "de": { "add": "Position hinzuf\xFCgen", "asset": "Asset", "qty": "Menge", "cost": "\xD8 Kosten", "addbtn": "+ Hinzuf\xFCgen", "simulate": "Simulation", "vol": "Volatilit\xE4t", "drift": "Drift %", "tick": "\u27F3 Markt-Tick", "reset": "\u21BB Reset", "value": "Portfolio-Wert", "pnl": "Gesamt P&L", "alloc": "Allokation", "empty": "noch keine Positionen \u2014 eine hinzuf\xFCgen", "del": "entfernen" } };
  var lang = localStorage.getItem("lang") || "en";
  var t = (k) => I18N[lang][k] || k;
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i]").forEach((el) => el.textContent = t(el.dataset.i));
    document.querySelectorAll(".lang button").forEach((b) => b.classList.toggle("on", b.dataset.lang === lang));
  }
  document.querySelectorAll(".lang button").forEach((b) => b.onclick = () => {
    lang = b.dataset.lang;
    localStorage.setItem("lang", lang);
    applyLang();
  });
  var $ = (id) => document.getElementById(id);
  var holdings = JSON.parse(localStorage.getItem("pp-holdings") || "[]");
  var prices = {};
  var hist = [];
  var cv = $("chart");
  var ctx = cv.getContext("2d");
  function resize() {
    const r = cv.parentElement.getBoundingClientRect();
    cv.width = r.width * devicePixelRatio;
    cv.height = r.height * devicePixelRatio;
  }
  addEventListener("resize", resize);
  resize();
  function rnd() {
    return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  }
  function tick() {
    const vol = +$("vol").value / 100, drift = +$("drift").value / 100 / 12;
    holdings.forEach((h) => {
      if (!prices[h.asset]) prices[h.asset] = h.cost;
      prices[h.asset] *= 1 + drift + vol * rnd() * 0.02;
    });
    const v = total();
    hist.push(v);
    if (hist.length > 200) hist.shift();
    save();
    render();
  }
  function total() {
    return holdings.reduce((s, h) => s + h.qty * (prices[h.asset] || h.cost), 0);
  }
  function cost() {
    return holdings.reduce((s, h) => s + h.qty * h.cost, 0);
  }
  function save() {
    localStorage.setItem("pp-holdings", JSON.stringify(holdings));
    localStorage.setItem("pp-prices", JSON.stringify(prices));
  }
  function load() {
    try {
      prices = JSON.parse(localStorage.getItem("pp-prices") || "{}");
    } catch (e) {
    }
  }
  function render() {
    const v = total(), c = cost(), pl = v - c, pct = c ? pl / c * 100 : 0;
    $("value").textContent = "$" + v.toLocaleString(void 0, { maximumFractionDigits: 2 });
    $("pnl").textContent = ($$ = (pl >= 0 ? "+" : "") + pl.toFixed(2)).toString();
    $("pnl").style.color = pl >= 0 ? "#34d399" : "#f87171";
    const d = $("delta");
    d.textContent = (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%";
    d.className = "delta " + (pct >= 0 ? "up" : "down");
    const rows = $("rows");
    rows.innerHTML = "";
    if (!holdings.length) {
      rows.innerHTML = '<div class="row" style="color:var(--dim)">' + t("empty") + "</div>";
    }
    holdings.forEach((h, i) => {
      const px = prices[h.asset] || h.cost, val = h.qty * px, plh = val - h.qty * h.cost, pcth = h.cost ? plh / (h.qty * h.cost) * 100 : 0;
      const d2 = document.createElement("div");
      d2.className = "row";
      d2.innerHTML = '<span class="sym">' + h.asset + '</span><span class="qty">' + h.qty + ' \xD7</span><span class="px">$' + px.toFixed(2) + '</span><span class="pl ' + (plh >= 0 ? "up" : "down") + '">' + (plh >= 0 ? "+" : "") + plh.toFixed(2) + " (" + (pcth >= 0 ? "+" : "") + pcth.toFixed(1) + '%)</span><button data-i="' + i + '">' + t("del") + "</button>";
      d2.querySelector("button").onclick = () => {
        holdings.splice(i, 1);
        save();
        render();
      };
      rows.appendChild(d2);
    });
    drawChart();
    drawDonut();
  }
  function drawChart() {
    const w = cv.width, h = cv.height;
    ctx.fillStyle = "#0e1420";
    ctx.fillRect(0, 0, w, h);
    if (hist.length < 2) return;
    const min = Math.min(...hist), max = Math.max(...hist), rg = max - min || 1;
    ctx.beginPath();
    hist.forEach((v, i) => {
      const x = i / (hist.length - 1) * w, y = h - (v - min) / rg * (h * 0.85) - h * 0.07;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.strokeStyle = "#4dd8ff";
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.stroke();
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(77,216,255,.25)");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fill();
  }
  function drawDonut() {
    const d = $("donut"), x = d.getContext("2d");
    x.clearRect(0, 0, 120, 120);
    const tot = total();
    if (!tot) {
      x.beginPath();
      x.arc(60, 60, 48, 0, 7);
      x.strokeStyle = "rgba(139,150,179,.3)";
      x.lineWidth = 16;
      x.stroke();
      return;
    }
    let a0 = -Math.PI / 2;
    holdings.forEach((h, i) => {
      const frac = h.qty * (prices[h.asset] || h.cost) / tot, a1 = a0 + frac * Math.PI * 2;
      x.beginPath();
      x.moveTo(60, 60);
      x.arc(60, 60, 48, a0, a1);
      x.closePath();
      x.fillStyle = "hsl(" + i * 67 % 360 + ",80%,60%)";
      x.fill();
      a0 = a1;
    });
    x.beginPath();
    x.arc(60, 60, 26, 0, 7);
    x.fillStyle = "#0e1420";
    x.fill();
    x.fillStyle = "#e8edf8";
    x.font = "bold 13px sans-serif";
    x.textAlign = "center";
    x.fillText("$" + (tot / 1e3).toFixed(1) + "k", 60, 64);
  }
  $("add").onclick = () => {
    const a = $("asset").value, q = parseFloat($("qty").value), c = parseFloat($("cost").value);
    if (q > 0 && c > 0) {
      holdings.push({ asset: a, qty: q, cost: c });
      prices[a] = c;
      save();
      render();
    }
  };
  $("tick").onclick = tick;
  $("reset").onclick = () => {
    holdings = [];
    prices = {};
    hist.length = 0;
    localStorage.removeItem("pp-holdings");
    localStorage.removeItem("pp-prices");
    render();
  };
  load();
  for (let i = 0; i < 80; i++) tick();
  setInterval(tick, 2500);
  applyLang();
})();

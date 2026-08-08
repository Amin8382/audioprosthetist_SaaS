// Audiometrie - Clinical Audiogram Drawing Tool
// Side-by-side OD/OG using table layout (Frappe-proof)
// CA (blue circles) + CO (red brackets)
// dB axis inverted: 0 top -> 130 bottom
// Hz: 250, 500, 1000, 2000, 4000, 8000

frappe.provide("odiometrie.audiometrie");

var FREQS = [250, 500, 1000, 2000, 4000, 8000];
var DBS = [];
for (var d = 0; d <= 130; d += 10) DBS.push(d);

var CA_COLOR = "#2563EB";
var CO_COLOR = "#DC2626";

frappe.ui.form.on("Audiogramme", {
  refresh(frm) {
    if (frm.doc.audiogramme_json) {
      render_audiogramme(frm);
    } else {
      frm.fields_dict.audiogramme_html.$wrapper.html(
        '<div style="text-align:center;padding:40px;color:#888;">' +
          '<p style="font-size:14px;">Cliquez ci-dessous pour dessiner l\'audiogramme</p>' +
          '<button class="btn btn-primary btn-lg" id="btn-start-audio">' +
          '  Commencer l\'audiogramme</button></div>'
      );
      frm.fields_dict.audiogramme_html.$wrapper
        .find("#btn-start-audio")
        .on("click", function () {
          frm.doc.audiogramme_json = JSON.stringify({
            right: { CA: {}, CO: {} },
            left: { CA: {}, CO: {} },
          });
          render_audiogramme(frm);
        });
    }
  },
});

function migrate(raw) {
  if (!raw) return { right: { CA: {}, CO: {} }, left: { CA: {}, CO: {} } };
  try {
    var o = JSON.parse(raw);
    if (o.right && o.right.CA !== undefined) return o;
    if (o.od || o.og) {
      var m = { right: { CA: {}, CO: {} }, left: { CA: {}, CO: {} } };
      (o.od || []).forEach(function (p) { m.right.CA[p.f] = p.d; });
      (o.og || []).forEach(function (p) { m.left.CA[p.f] = p.d; });
      return m;
    }
    return o;
  } catch (e) {
    return { right: { CA: {}, CO: {} }, left: { CA: {}, CO: {} } };
  }
}

function render_audiogramme(frm) {
  var data = migrate(frm.doc.audiogramme_json);
  var html =
    '<div class="ao-wrap">' +
      '<div class="ao-bar">' +
        '<div class="ao-modes">' +
          '<span class="ao-mode-lbl">Mode :</span>' +
          '<button class="ao-btn ao-ca active" id="btn-ca"><span class="ao-dot-ca"></span> CA (Air)</button>' +
          '<button class="ao-btn ao-co" id="btn-co"><span class="ao-dot-co"></span> CO (Os)</button>' +
        '</div>' +
        '<div class="ao-bar-r">' +
          '<div class="ao-tools">' +
            '<button class="ao-btn active" id="btn-add" title="Cliquer pour placer un point, glisser pour le d\u00e9placer">+ Point</button>' +
            '<button class="ao-btn" id="btn-eraser" title="Cliquer sur un point pour l\'effacer">Gomme</button>' +
          '</div>' +
          '<button class="btn btn-xs btn-danger" id="btn-clear-audio">Effacer tout</button>' +
          '<button class="btn btn-xs btn-success" id="btn-save-audio">Sauvegarder</button>' +
        '</div>' +
      '</div>' +
      '<table class="ao-table"><tr>' +
        '<td class="ao-cell">' +
          '<div class="ao-title ao-title-od">\u25B3 OD \u2014 Oreille Droite</div>' +
          '<canvas id="canvas-od" width="640" height="640"></canvas>' +
          '<div class="ao-readout" id="readout-od"></div>' +
          '<div class="ao-leg"><span class="ao-leg-ca"><span class="ao-dot-ca"></span> CA</span>' +
          '<span class="ao-leg-co"><span class="ao-dot-co"></span> CO</span></div>' +
        '</td>' +
        '<td class="ao-gap"></td>' +
        '<td class="ao-cell">' +
          '<div class="ao-title ao-title-og">\u25B3 OG \u2014 Oreille Gauche</div>' +
          '<canvas id="canvas-og" width="640" height="640"></canvas>' +
          '<div class="ao-readout" id="readout-og"></div>' +
          '<div class="ao-leg"><span class="ao-leg-ca"><span class="ao-dot-ca"></span> CA</span>' +
          '<span class="ao-leg-co"><span class="ao-dot-co"></span> CO</span></div>' +
        '</td>' +
      '</tr></table>' +
    '</div>';

  frm.fields_dict.audiogramme_html.$wrapper.html(html);

  setTimeout(function () {
    var state = { type: "CA", mode: "add", data: data };
    draw("canvas-od", data.right);
    draw("canvas-og", data.left);
    bindCanvas("canvas-od", "right", state);
    bindCanvas("canvas-og", "left", state);
    bindHover("canvas-od", "readout-od");
    bindHover("canvas-og", "readout-og");
    toolbar(frm, state);
    setbtn(state);
    fitWrap();
    bindFitResize();
    setTimeout(fitWrap, 400);
  }, 50);
}

function draw(id, ear) {
  var c = document.getElementById(id);
  if (!c) return;
  var ctx = c.getContext("2d");
  var W = c.width, H = c.height;
  var L = 50, R = 16, T = 40, B = 30;
  var pW = W - L - R, pH = H - T - B;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);

  // Normal zone
  ctx.fillStyle = "rgba(200,235,200,0.3)";
  ctx.fillRect(L, T, pW, (2 / (DBS.length - 1)) * pH);

  // Grid
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 0.5;
  for (var i = 0; i < FREQS.length; i++) {
    var x = L + (i / (FREQS.length - 1)) * pW;
    ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, T + pH); ctx.stroke();
  }
  for (var j = 0; j < DBS.length; j++) {
    var y = T + (j / (DBS.length - 1)) * pH;
    ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + pW, y); ctx.stroke();
  }

  // Border
  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 2;
  ctx.strokeRect(L, T, pW, pH);

  // Hz top labels
  ctx.fillStyle = "#374151";
  ctx.font = "bold 11px Arial,sans-serif";
  ctx.textAlign = "center";
  for (var i = 0; i < FREQS.length; i++) {
    ctx.fillText(FREQS[i], L + (i / (FREQS.length - 1)) * pW, T - 10);
  }
  ctx.font = "bold 12px Arial,sans-serif";
  ctx.fillText("Fr\u00e9quence (Hz)", L + pW / 2, T - 28);

  // dB left labels
  ctx.font = "10px Arial,sans-serif";
  ctx.textAlign = "right";
  for (var j = 0; j < DBS.length; j++) {
    ctx.fillText(DBS[j], L - 8, T + (j / (DBS.length - 1)) * pH + 4);
  }
  ctx.save();
  ctx.font = "bold 11px Arial,sans-serif";
  ctx.textAlign = "center";
  ctx.translate(14, T + pH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("dB HL", 0, 0);
  ctx.restore();

  // 20 dB line
  var y20 = T + (2 / (DBS.length - 1)) * pH;
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 3]);
  ctx.beginPath(); ctx.moveTo(L, y20); ctx.lineTo(L + pW, y20); ctx.stroke();
  ctx.setLineDash([]);

  function xy(f, db) {
    return toXY(L, T, pW, pH, f, db);
  }

  // CA
  var ca = ear.CA || {};
  var cf = Object.keys(ca).map(Number).sort(function (a, b) { return a - b; });
  if (cf.length) {
    ctx.strokeStyle = CA_COLOR; ctx.lineWidth = 2;
    ctx.beginPath();
    cf.forEach(function (f, i) { var p = xy(f, ca[f]); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    ctx.stroke();
    cf.forEach(function (f) {
      var p = xy(f, ca[f]);
      ctx.strokeStyle = CA_COLOR; ctx.lineWidth = 2; ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    });
  }

  // CO
  var co = ear.CO || {};
  var cof = Object.keys(co).map(Number).sort(function (a, b) { return a - b; });
  if (cof.length) {
    ctx.strokeStyle = CO_COLOR; ctx.lineWidth = 2; ctx.setLineDash([6, 3]);
    ctx.beginPath();
    cof.forEach(function (f, i) { var p = xy(f, co[f]); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    ctx.stroke(); ctx.setLineDash([]);
    ctx.lineWidth = 2.5;
    cof.forEach(function (f) {
      var p = xy(f, co[f]); var s = 5;
      ctx.strokeStyle = CO_COLOR;
      ctx.beginPath();
      ctx.moveTo(p.x + s, p.y - s);
      ctx.lineTo(p.x - s, p.y - s);
      ctx.lineTo(p.x - s, p.y + s);
      ctx.lineTo(p.x + s, p.y + s);
      ctx.stroke();
    });
  }

  if (!cf.length && !cof.length) {
    ctx.fillStyle = "#9ca3af";
    ctx.font = "14px Arial,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Aucune donn\u00e9e disponible", L + pW / 2, T + pH / 2);
  }

  c._L = L; c._T = T; c._pW = pW; c._pH = pH;
}

function toXY(L, T, pW, pH, f, db) {
  var frac = Math.log2(f / FREQS[0]) / Math.log2(FREQS[FREQS.length - 1] / FREQS[0]);
  return { x: L + frac * pW, y: T + (db / DBS[DBS.length - 1]) * pH };
}

function readFreqDb(L, T, pW, pH, mx, my) {
  var frac = (mx - L) / pW;
  var freq = FREQS[0] * Math.pow(2, frac * Math.log2(FREQS[FREQS.length - 1] / FREQS[0]));
  var db = ((my - T) / pH) * DBS[DBS.length - 1];
  return { freq: Math.round(freq), db: Math.round(db) };
}

function coords(e, c) {
  var r = c.getBoundingClientRect();
  var mx = (e.clientX - r.left) * (c.width / r.width);
  var my = (e.clientY - r.top) * (c.height / r.height);
  return { mx: mx, my: my, L: c._L, T: c._T, pW: c._pW, pH: c._pH };
}

function inside(p) {
  return p.mx >= p.L && p.mx <= p.L + p.pW && p.my >= p.T && p.my <= p.T + p.pH;
}

function findPoint(st, key, p) {
  var best = null;
  ["CA", "CO"].forEach(function (tp) {
    var pts = st.data[key][tp] || {};
    Object.keys(pts).forEach(function (f) {
      var q = toXY(p.L, p.T, p.pW, p.pH, Number(f), pts[f]);
      var dd = Math.sqrt((p.mx - q.x) * (p.mx - q.x) + (p.my - q.y) * (p.my - q.y));
      if (!best || dd < best.dd) best = { tp: tp, f: Number(f), dd: dd, x: q.x, y: q.y };
    });
  });
  return best && best.dd <= 12 ? best : null;
}

function placePoint(st, key, p) {
  var rp = readFreqDb(p.L, p.T, p.pW, p.pH, p.mx, p.my);
  st.data[key][st.type] = st.data[key][st.type] || {};
  st.data[key][st.type][rp.freq] = rp.db;
  return rp;
}

function removePoint(st, key, hit) {
  var pts = st.data[key][hit.tp] || {};
  delete pts[hit.f];
}

function bindCanvas(id, key, st) {
  var c = document.getElementById(id);
  if (!c) return;
  c._hl = null;
  var drag = null;

  c.addEventListener("mousedown", function (e) {
    var p = coords(e, c);
    if (st.mode === "erase") {
      var hit = findPoint(st, key, p);
      if (hit) {
        removePoint(st, key, hit);
        draw(id, st.data[key]);
        var rd = document.getElementById(id === "canvas-od" ? "readout-od" : "readout-og");
        if (rd) {
          rd.textContent = "Point supprim\u00e9";
          setTimeout(function () { if (rd) rd.textContent = ""; }, 1200);
        }
      }
      return;
    }
    var hit = findPoint(st, key, p);
    if (hit) { drag = hit; return; }
    if (!inside(p)) return;
    var rp = placePoint(st, key, p);
    draw(id, st.data[key]);
    drawTooltip(id, rp.freq, rp.db);
  });

  c.addEventListener("mousemove", function (e) {
    if (st.mode === "erase") highlight(st, key, c, id, e);
    if (!drag) return;
    var p = coords(e, c);
    if (!inside(p)) return;
    var old = drag.f;
    delete st.data[key][drag.tp][old];
    var rp = readFreqDb(p.L, p.T, p.pW, p.pH, p.mx, p.my);
    st.data[key][drag.tp][rp.freq] = rp.db;
    drag.f = rp.freq;
    draw(id, st.data[key]);
  });

  c.addEventListener("mouseup", function () { drag = null; });
  c.addEventListener("mouseleave", function () { drag = null; c._hl = null; });
}

function highlight(st, key, c, id, e) {
  var p = coords(e, c);
  var hit = findPoint(st, key, p);
  var t = hit ? hit.tp + ":" + hit.f : null;
  if (t === c._hl) return;
  c._hl = t;
  draw(id, st.data[key]);
  if (!hit) return;
  var ctx = c.getContext("2d");
  ctx.strokeStyle = "#dc2626";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 2]);
  ctx.beginPath();
  ctx.arc(hit.x, hit.y, 9, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.setLineDash([]);
}

function bindHover(id, rid) {
  var c = document.getElementById(id);
  if (!c) return;
  var rd = document.getElementById(rid);
  c.onmousemove = function (e) {
    var r = c.getBoundingClientRect();
    var mx = (e.clientX - r.left) * (c.width / r.width);
    var my = (e.clientY - r.top) * (c.height / r.height);
    var L = c._L, T = c._T, pW = c._pW, pH = c._pH;
    if (mx < L || mx > L + pW || my < T || my > T + pH) {
      if (rd) rd.textContent = "";
      return;
    }
    var p = readFreqDb(L, T, pW, pH, mx, my);
    if (rd) rd.textContent = p.freq + " Hz \u2014 " + p.db + " dB";
  };
  c.onmouseleave = function () { if (rd) rd.textContent = ""; };
}

function drawTooltip(id, f, db) {
  var c = document.getElementById(id);
  if (!c) return;
  var ctx = c.getContext("2d");
  var p = toXY(c._L, c._T, c._pW, c._pH, f, db);
  var text = f + " Hz \u2014 " + db + " dB";
  ctx.font = "bold 12px Arial,sans-serif";
  ctx.textBaseline = "middle";
  var tw = ctx.measureText(text).width;
  var bw = tw + 12, bh = 22;
  var bx = p.x + 10, by = p.y - bh - 8;
  if (bx + bw > c.width) bx = p.x - bw - 10;
  if (by < 2) by = p.y + 10;
  ctx.fillStyle = "rgba(17,24,39,0.85)";
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.fillText(text, bx + 6, by + bh / 2 + 1);
}

function fitWrap() {
  var wrap = document.querySelector(".ao-wrap");
  if (!wrap) return;
  var vw = window.innerWidth;
  wrap.style.width = Math.min(vw - 24, 1900) + "px";
  if (!wrap.__aoSpacer) {
    var top0 = wrap.getBoundingClientRect().top;
    var spacer = document.createElement("div");
    spacer.style.height = wrap.offsetHeight + "px";
    wrap.parentNode.insertBefore(spacer, wrap);
    wrap.__aoSpacer = spacer;
    wrap.__aoTop = top0;
    wrap.style.position = "fixed";
    wrap.style.left = "50%";
    wrap.style.transform = "translateX(-50%)";
    wrap.style.zIndex = "50";
    if (!window.__aoScrollBound) {
      window.__aoScrollBound = true;
      window.addEventListener("scroll", fitWrap);
    }
  }
  wrap.__aoSpacer.style.height = wrap.offsetHeight + "px";
  wrap.style.top = wrap.__aoSpacer.getBoundingClientRect().top + "px";
}

function bindFitResize() {
  if (window.__aoFitBound) return;
  window.__aoFitBound = true;
  window.addEventListener("resize", function () { fitWrap(); });
}

function toolbar(frm, st) {
  var bca = document.getElementById("btn-ca");
  var bco = document.getElementById("btn-co");
  if (bca) bca.onclick = function () { st.type = "CA"; setbtn(st); };
  if (bco) bco.onclick = function () { st.type = "CO"; setbtn(st); };

  var ba = document.getElementById("btn-add");
  var be = document.getElementById("btn-eraser");
  if (ba) ba.onclick = function () { st.mode = "add"; setbtn(st); };
  if (be) be.onclick = function () { st.mode = "erase"; setbtn(st); };

  var bs = document.getElementById("btn-save-audio");
  if (bs) bs.onclick = function () {
    frm.doc.audiogramme_json = JSON.stringify(st.data);
    frm.save();
    frappe.show_alert({ message: "Audiogramme sauvegard\u00e9", indicator: "green" });
  };

  var bc = document.getElementById("btn-clear-audio");
  if (bc) bc.onclick = function () {
    if (confirm("Effacer tout l'audiogramme ?")) {
      st.data.right = { CA: {}, CO: {} };
      st.data.left = { CA: {}, CO: {} };
      frm.doc.audiogramme_json = JSON.stringify(st.data);
      frm.save();
      draw("canvas-od", st.data.right);
      draw("canvas-og", st.data.left);
    }
  };
}

function setbtn(st) {
  var bca = document.getElementById("btn-ca");
  var bco = document.getElementById("btn-co");
  if (bca) bca.className = "ao-btn ao-ca" + (st.type === "CA" ? " active" : "");
  if (bco) bco.className = "ao-btn ao-co" + (st.type === "CO" ? " active" : "");
  var ba = document.getElementById("btn-add");
  var be = document.getElementById("btn-eraser");
  if (ba) ba.className = "ao-btn" + (st.mode === "add" ? " active" : "");
  if (be) be.className = "ao-btn" + (st.mode === "erase" ? " active" : "");
}

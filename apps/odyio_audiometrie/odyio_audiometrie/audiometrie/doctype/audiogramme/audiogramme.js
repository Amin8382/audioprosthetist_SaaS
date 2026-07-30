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
          '<button class="btn btn-xs btn-danger" id="btn-clear-audio">Effacer</button>' +
          '<button class="btn btn-xs btn-success" id="btn-save-audio">Sauvegarder</button>' +
        '</div>' +
      '</div>' +
      '<table class="ao-table"><tr>' +
        '<td class="ao-cell">' +
          '<div class="ao-title ao-title-od">\u25B3 OD \u2014 Oreille Droite</div>' +
          '<canvas id="canvas-od" width="340" height="480"></canvas>' +
          '<div class="ao-leg"><span class="ao-leg-ca"><span class="ao-dot-ca"></span> CA</span>' +
          '<span class="ao-leg-co"><span class="ao-dot-co"></span> CO</span></div>' +
        '</td>' +
        '<td class="ao-gap"></td>' +
        '<td class="ao-cell">' +
          '<div class="ao-title ao-title-og">\u25B3 OG \u2014 Oreille Gauche</div>' +
          '<canvas id="canvas-og" width="340" height="480"></canvas>' +
          '<div class="ao-leg"><span class="ao-leg-ca"><span class="ao-dot-ca"></span> CA</span>' +
          '<span class="ao-leg-co"><span class="ao-dot-co"></span> CO</span></div>' +
        '</td>' +
      '</tr></table>' +
    '</div>';

  frm.fields_dict.audiogramme_html.$wrapper.html(html);

  setTimeout(function () {
    var state = { type: "CA", data: data };
    draw("canvas-od", data.right);
    draw("canvas-og", data.left);
    click(frm, "canvas-od", "right", state);
    click(frm, "canvas-og", "left", state);
    toolbar(frm, state);
    setbtn(state);
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
    var fi = FREQS.indexOf(f);
    var di = DBS.indexOf(db);
    if (di < 0) { di = 0; var md = 999; for (var j = 0; j < DBS.length; j++) { var dd = Math.abs(db - DBS[j]); if (dd < md) { md = dd; di = j; } } }
    return { x: L + (fi / (FREQS.length - 1)) * pW, y: T + (di / (DBS.length - 1)) * pH };
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

function click(frm, id, key, st) {
  var c = document.getElementById(id);
  if (!c) return;
  c.onclick = function (e) {
    var r = c.getBoundingClientRect();
    var sx = c.width / r.width, sy = c.height / r.height;
    var mx = (e.clientX - r.left) * sx, my = (e.clientY - r.top) * sy;
    var bf = FREQS[0], bd = DBS[0], md = Infinity;
    for (var i = 0; i < FREQS.length; i++) {
      for (var j = 0; j < DBS.length; j++) {
        var px = c._L + (i / (FREQS.length - 1)) * c._pW;
        var py = c._T + (j / (DBS.length - 1)) * c._pH;
        var dd = Math.sqrt((mx - px) * (mx - px) + (my - py) * (my - py));
        if (dd < md) { md = dd; bf = FREQS[i]; bd = DBS[j]; }
      }
    }
    if (md > 30) return;
    st.data[key][st.type] = st.data[key][st.type] || {};
    st.data[key][st.type][bf] = bd;
    draw(id, st.data[key]);
  };
}

function toolbar(frm, st) {
  var bca = document.getElementById("btn-ca");
  var bco = document.getElementById("btn-co");
  if (bca) bca.onclick = function () { st.type = "CA"; setbtn(st); };
  if (bco) bco.onclick = function () { st.type = "CO"; setbtn(st); };

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
}

// Audiometrie - Audiogramme Drawing Tool
// Standard audiogram: X=frequency(Hz), Y=hearing level(dB HL)

frappe.provide("odiometrie.audiometrie");

frappe.ui.form.on("Audiogramme", {
  refresh(frm) {
    if (frm.doc.audiogramme_json) {
      render_audiogramme(frm);
    } else {
      frm.fields_dict.audiogramme_html.$wrapper.html(
        '<div style="text-align:center;padding:40px;color:#888;">' +
          '<p>Cliquez ci-dessous pour dessiner l\'audiogramme</p>' +
          '<button class="btn btn-primary btn-lg" id="btn-start-audio">' +
          '  Commencer l\'audiogramme' +
          "</button>" +
          "</div>"
      );
      frm.fields_dict.audiogramme_html.$wrapper
        .find("#btn-start-audio")
        .on("click", function () {
          init_audiogramme(frm);
        });
    }
  },
});

function init_audiogramme(frm) {
  var data = { od: [], og: [] };
  frm.doc.audiogramme_json = JSON.stringify(data);
  render_audiogramme(frm);
}

function render_audiogramme(frm) {
  var data = JSON.parse(frm.doc.audiogramme_json || '{"od":[],"og":[]}');

  var html = build_audiogramme_ui(data);

  frm.fields_dict.audiogramme_html.$wrapper.html(html);

  // Init canvas after DOM is ready
  setTimeout(function () {
    draw_audiogramme(frm, data);
  }, 100);
}

function build_audiogramme_ui(data) {
  var od_count = data.od ? data.od.length : 0;
  var og_count = data.og ? data.og.length : 0;

  return (
    '<div class="audiometrie-container">' +
    '<div class="audiometrie-toolbar">' +
    '  <div class="audiometrie-legend">' +
    '    <span class="legend-item legend-od">&#9679; OD (Droite) — ' +
    od_count +
    " points</span>" +
    '    <span class="legend-item legend-og">&#10005; OG (Gauche) — ' +
    og_count +
    " points</span>" +
    "  </div>" +
    '  <div class="audiometrie-actions">' +
    '    <button class="btn btn-xs btn-default" id="btn-mode-od" style="font-weight:bold;color:#e74c3c;">OD</button>' +
    '    <button class="btn btn-xs btn-default" id="btn-mode-og" style="font-weight:bold;color:#3498db;">OG</button>' +
    '    <button class="btn btn-xs btn-danger" id="btn-clear-audio">Effacer tout</button>' +
    '    <button class="btn btn-xs btn-success" id="btn-save-audio">Sauvegarder</button>' +
    "  </div>" +
    "</div>" +
    '<div class="audiometrie-canvas-wrapper">' +
    '  <canvas id="audiometrie-canvas" width="800" height="500"></canvas>' +
    "</div>" +
    "</div>"
  );
}

function draw_audiogramme(frm, data) {
  var canvas = document.getElementById("audiometrie-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  // Standard audiogram frequencies (Hz)
  var frequencies = [125, 250, 500, 1000, 2000, 4000, 8000];
  // dB HL range
  var db_levels = [];
  for (var d = -10; d <= 120; d += 10) {
    db_levels.push(d);
  }

  var W = canvas.width;
  var H = canvas.height;
  var PAD_LEFT = 60;
  var PAD_RIGHT = 30;
  var PAD_TOP = 30;
  var PAD_BOTTOM = 50;

  var plotW = W - PAD_LEFT - PAD_RIGHT;
  var plotH = H - PAD_TOP - PAD_BOTTOM;

  // State
  var current_mode = "od"; // 'od' or 'og'
  var points = { od: data.od || [], og: data.og || [] };

  // Clear canvas
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Draw grid
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 0.5;

  // Vertical grid lines (frequency)
  for (var i = 0; i < frequencies.length; i++) {
    var x = PAD_LEFT + (i / (frequencies.length - 1)) * plotW;
    ctx.beginPath();
    ctx.moveTo(x, PAD_TOP);
    ctx.lineTo(x, PAD_TOP + plotH);
    ctx.stroke();
  }

  // Horizontal grid lines (dB)
  for (var j = 0; j < db_levels.length; j++) {
    var y = PAD_TOP + (j / (db_levels.length - 1)) * plotH;
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, y);
    ctx.lineTo(PAD_LEFT + plotW, y);
    ctx.stroke();
  }

  // Draw axes
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD_LEFT, PAD_TOP);
  ctx.lineTo(PAD_LEFT, PAD_TOP + plotH);
  ctx.lineTo(PAD_LEFT + plotW, PAD_TOP + plotH);
  ctx.stroke();

  // X-axis labels (frequencies)
  ctx.fillStyle = "#333";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  for (var i = 0; i < frequencies.length; i++) {
    var x = PAD_LEFT + (i / (frequencies.length - 1)) * plotW;
    ctx.fillText(frequencies[i] + " Hz", x, PAD_TOP + plotH + 20);
  }

  // X-axis title
  ctx.font = "bold 13px Arial";
  ctx.fillText("Fréquence (Hz)", PAD_LEFT + plotW / 2, PAD_TOP + plotH + 40);

  // Y-axis labels (dB)
  ctx.font = "11px Arial";
  ctx.textAlign = "right";
  for (var j = 0; j < db_levels.length; j++) {
    var y = PAD_TOP + (j / (db_levels.length - 1)) * plotH;
    ctx.fillText(db_levels[j] + " dB", PAD_LEFT - 8, y + 4);
  }

  // Y-axis title
  ctx.save();
  ctx.translate(15, PAD_TOP + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Seuil auditif (dB HL)", 0, 0);
  ctx.restore();

  // Helper: convert (freq, db) to canvas coords
  function toCanvas(freq, db) {
    var fi = frequencies.indexOf(freq);
    if (fi === -1) fi = frequencies.indexOf(closest_freq(freq));
    var di = db_levels.indexOf(db);
    if (di === -1) di = db_levels.indexOf(closest_db(db));
    var x = PAD_LEFT + (fi / (frequencies.length - 1)) * plotW;
    var y = PAD_TOP + (di / (db_levels.length - 1)) * plotH;
    return { x: x, y: y };
  }

  function closest_freq(f) {
    var best = frequencies[0];
    var minDist = Math.abs(f - best);
    for (var i = 1; i < frequencies.length; i++) {
      var dist = Math.abs(f - frequencies[i]);
      if (dist < minDist) {
        minDist = dist;
        best = frequencies[i];
      }
    }
    return best;
  }

  function closest_db(d) {
    var best = db_levels[0];
    var minDist = Math.abs(d - best);
    for (var j = 1; j < db_levels.length; j++) {
      var dist = Math.abs(d - db_levels[j]);
      if (dist < minDist) {
        minDist = dist;
        best = db_levels[j];
      }
    }
    return best;
  }

  // Draw OD (red circles, solid line)
  if (points.od.length > 0) {
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < points.od.length; i++) {
      var p = toCanvas(points.od[i].f, points.od[i].d);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    ctx.fillStyle = "#e74c3c";
    for (var i = 0; i < points.od.length; i++) {
      var p = toCanvas(points.od[i].f, points.od[i].d);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  // Draw OG (blue crosses, dashed line)
  if (points.og.length > 0) {
    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    for (var i = 0; i < points.og.length; i++) {
      var p = toCanvas(points.og[i].f, points.og[i].d);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 2.5;
    for (var i = 0; i < points.og.length; i++) {
      var p = toCanvas(points.og[i].f, points.og[i].d);
      var s = 6;
      ctx.beginPath();
      ctx.moveTo(p.x - s, p.y - s);
      ctx.lineTo(p.x + s, p.y + s);
      ctx.moveTo(p.x + s, p.y - s);
      ctx.lineTo(p.x - s, p.y + s);
      ctx.stroke();
    }
  }

  // Click handler — place point
  canvas.onclick = function (e) {
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;

    // Find closest frequency and dB
    var best_f = frequencies[0];
    var best_d = db_levels[0];
    var minDist = Infinity;

    for (var i = 0; i < frequencies.length; i++) {
      for (var j = 0; j < db_levels.length; j++) {
        var p = toCanvas(frequencies[i], db_levels[j]);
        var dist = Math.sqrt(
          (mx - p.x) * (mx - p.x) + (my - p.y) * (my - p.y)
        );
        if (dist < minDist) {
          minDist = dist;
          best_f = frequencies[i];
          best_d = db_levels[j];
        }
      }
    }

    if (minDist > 30) return; // too far from any grid point

    // Remove existing point at same frequency for current ear
    var ear = current_mode;
    points[ear] = points[ear].filter(function (p) {
      return p.f !== best_f;
    });

    // Add new point
    points[ear].push({ f: best_f, d: best_d });

    // Sort by frequency
    points[ear].sort(function (a, b) {
      return a.f - b.f;
    });

    // Redraw
    draw_points_only(ctx, points, frequencies, db_levels, PAD_LEFT, PAD_TOP, plotW, plotH);
  };

  // Draw points only (for interactive updates)
  function draw_points_only(ctx2, pts, freqs, dbs, pl, pt, pw, ph) {
    // Redraw whole thing for simplicity
    draw_audiogramme(frm, {
      od: points.od,
      og: points.og,
    });
  }

  // Toolbar handlers
  var btnOD = document.getElementById("btn-mode-od");
  var btnOG = document.getElementById("btn-mode-og");
  var btnSave = document.getElementById("btn-save-audio");
  var btnClear = document.getElementById("btn-clear-audio");

  if (btnOD) {
    btnOD.onclick = function () {
      current_mode = "od";
      btnOD.className = "btn btn-xs btn-danger";
      btnOG.className = "btn btn-xs btn-default";
    };
  }
  if (btnOG) {
    btnOG.onclick = function () {
      current_mode = "og";
      btnOG.className = "btn btn-xs btn-primary";
      btnOD.className = "btn btn-xs btn-default";
    };
  }
  if (btnSave) {
    btnSave.onclick = function () {
      frm.doc.audiogramme_json = JSON.stringify({
        od: points.od,
        og: points.og,
      });
      frm.save();
      frappe.show_alert({
        message: "Audiogramme sauvegardé",
        indicator: "green",
      });
    };
  }
  if (btnClear) {
    btnClear.onclick = function () {
      if (confirm("Effacer tout l'audiogramme ?")) {
        points = { od: [], og: [] };
        frm.doc.audiogramme_json = JSON.stringify(points);
        frm.save();
        draw_audiogramme(frm, points);
      }
    };
  }

  // Set initial button states
  if (btnOD) btnOD.className = "btn btn-xs btn-danger";
  if (btnOG) btnOG.className = "btn btn-xs btn-default";
}

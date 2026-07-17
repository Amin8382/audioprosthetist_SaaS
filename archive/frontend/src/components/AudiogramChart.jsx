const FREQS = [125, 250, 500, 1000, 2000, 4000, 8000];
const LEVELS = Array.from({ length: 12 }, (_, i) => i * 10);

export default function AudiogramChart({ left, right, className = '' }) {
  const getVal = (data, hz) => {
    if (!data) return null;
    return data[hz] ?? data[String(hz)] ?? null;
  };

  const pointX = (hz) => {
    const idx = FREQS.indexOf(hz);
    if (idx === -1) return null;
    return 20 + (idx / (FREQS.length - 1)) * 200;
  };

  const pointY = (db) => {
    if (db == null) return null;
    return 20 + (db / 120) * 160;
  };

  return (
    <svg viewBox="0 0 240 200" className={`w-full max-w-xs ${className}`}>
      <rect x="0" y="0" width="240" height="200" fill="#fafafa" rx="4" />

      {LEVELS.map(db => (
        <line key={`g${db}`} x1="20" y1={pointY(db)} x2="220" y2={pointY(db)}
          stroke={db % 20 === 0 ? '#ddd' : '#eee'} strokeWidth="0.5" />
      ))}
      {FREQS.map(hz => (
        <line key={`v${hz}`} x1={pointX(hz)} y1="20" x2={pointX(hz)} y2="180"
          stroke="#ddd" strokeWidth="0.5" />
      ))}

      {FREQS.filter(hz => hz >= 250).map(hz => {
        const x = pointX(hz);
        return x ? <text key={`l${hz}`} x={x} y="195" textAnchor="middle" fontSize="6" fill="#999">{hz}</text> : null;
      })}

      {[{ data: left, color: '#3b82f6', label: 'G' }, { data: right, color: '#ef4444', label: 'D' }].map(({ data, color, label }) => {
        const pts = FREQS.map(hz => {
          const v = getVal(data, hz);
          if (v == null) return null;
          const x = pointX(hz);
          const y = pointY(v);
          return x != null && y != null ? { x, y } : null;
        }).filter(Boolean);

        return (
          <g key={label}>
            {pts.map((p, i) => (
              <circle key={`p${i}`} cx={p.x} cy={p.y} r="3" fill={color} stroke="white" strokeWidth="1" />
            ))}
            {pts.slice(1).map((p, i) => (
              <line key={`l${i}`} x1={pts[i].x} y1={pts[i].y} x2={p.x} y2={p.y}
                stroke={color} strokeWidth="1.5" strokeDasharray="3,2" fill="none" />
            ))}
          </g>
        );
      })}

      <text x="5" y="12" fontSize="5" fill="#999">0</text>
      <text x="5" y="52" fontSize="5" fill="#999">40</text>
      <text x="5" y="92" fontSize="5" fill="#999">80</text>
      <text x="5" y="132" fontSize="5" fill="#999">120</text>
      <text x="225" y="12" fontSize="5" fill="#999" textAnchor="end">dB</text>

      <circle cx="10" cy="185" r="3" fill="#3b82f6" stroke="white" strokeWidth="1" />
      <text x="16" y="188" fontSize="6" fill="#3b82f6">Gauche</text>
      <circle cx="60" cy="185" r="3" fill="#ef4444" stroke="white" strokeWidth="1" />
      <text x="66" y="188" fontSize="6" fill="#ef4444">Droite</text>
    </svg>
  );
}

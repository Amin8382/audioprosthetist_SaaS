export default function AIScoreGauge({ probability = 0, size = 'md' }) {
  const pct = Math.round((probability || 0) * 100);
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  const heights = { sm: 'h-2', md: 'h-3', lg: 'h-4' };

  return (
    <div>
      <div className={`w-full bg-gray-200 rounded-full ${heights[size] || heights.md}`}>
        <div className={`${color} ${heights[size] || heights.md} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
      </div>
      <span className="text-sm font-medium">{pct}%</span>
    </div>
  );
}

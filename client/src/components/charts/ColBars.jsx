// Inline SVG vertical bar chart with an x-axis baseline. `items`:
// [{ label, value, display, color }]. `highlight` optionally marks one
// label as the emphasized bar (drawn full-opacity while others recede).
export default function ColBars({ items, height = 200, highlight }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const barW = 40;
  const gap = 34;
  const padX = 28;
  const width = items.length * (barW + gap) + padX;
  const chartH = height - 46;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMinYMid meet">
      <line x1={0} y1={chartH} x2={width} y2={chartH} stroke="#c9bfa8" strokeWidth="1" />
      {items.map((it, i) => {
        const h = Math.max(4, (it.value / max) * (chartH - 24));
        const x = padX / 2 + i * (barW + gap);
        const y = chartH - h;
        const dim = highlight && it.label !== highlight;
        return (
          <g key={it.label}>
            <text x={x + barW / 2} y={y - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill="#241a17">
              {it.display ?? it.value}
            </text>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={4}
              fill={it.color}
              opacity={dim ? 0.38 : 1}
            />
            {it.label.includes(' ') ? (
              <text textAnchor="middle" fontSize="10.5" fill="#79695f">
                {it.label.split(' ').map((word, wi) => (
                  <tspan key={wi} x={x + barW / 2} y={chartH + 16 + wi * 13}>
                    {word}
                  </tspan>
                ))}
              </text>
            ) : (
              <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" fontSize="11" fill="#79695f">
                {it.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

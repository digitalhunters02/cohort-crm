import { Dot } from '../ui.jsx';

// Horizontal bar list: label + dot, track + fill, right-aligned value.
// `items`: [{ label, value, display, color }]
export default function HBars({ items, max }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex flex-col gap-3">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-3">
          <div className="w-32 flex items-center gap-2 flex-shrink-0">
            <Dot color={it.color} />
            <span className="text-xs font-medium text-ink truncate">{it.label}</span>
          </div>
          <div className="flex-grow h-2.5 rounded-full bg-wash overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(3, (it.value / top) * 100)}%`, backgroundColor: it.color }}
            />
          </div>
          <div className="w-20 text-right text-xs font-medium text-ink tabular-nums flex-shrink-0">
            {it.display ?? it.value}
          </div>
        </div>
      ))}
    </div>
  );
}

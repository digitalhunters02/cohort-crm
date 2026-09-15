// Hand-built inline icon set. Each entry is a list of primitive shape
// descriptors drawn on a 24x24 grid: ["path", d] | ["circle", cx, cy, r] |
// ["line", x1, y1, x2, y2] | ["rect", x, y, w, h, rx]
const ICONS = {
  home: [
    ['path', 'M4 12 12 5l8 7'],
    ['path', 'M6 10.5V19a1 1 0 0 0 1 1h4v-5.5h2V20h4a1 1 0 0 0 1-1v-8.5'],
  ],
  mail: [
    ['rect', 3, 5, 18, 14, 2],
    ['path', 'M3.5 6.5 12 13l8.5-6.5'],
  ],
  kanban: [
    ['rect', 4, 4, 4.2, 12, 1],
    ['rect', 9.9, 4, 4.2, 16, 1],
    ['rect', 15.8, 4, 4.2, 9, 1],
  ],
  calendar: [
    ['rect', 3.5, 5.5, 17, 15, 2],
    ['line', 3.5, 10, 20.5, 10],
    ['line', 8, 3.5, 8, 7],
    ['line', 16, 3.5, 16, 7],
    ['circle', 8.3, 14, 1],
    ['circle', 12, 14, 1],
    ['circle', 15.7, 14, 1],
  ],
  userCheck: [
    ['circle', 9.5, 8.5, 3.3],
    ['path', 'M4 20c.5-3.8 2.9-6 5.5-6s5 2.2 5.5 6'],
    ['path', 'M16 12.5l2 2 3.5-4'],
  ],
  graduationCap: [
    ['path', 'M2.5 9.5 12 5l9.5 4.5L12 14 2.5 9.5Z'],
    ['path', 'M7 11.7V16c0 1.4 2.3 2.7 5 2.7s5-1.3 5-2.7v-4.3'],
    ['path', 'M21 10v5.5'],
  ],
  users: [
    ['circle', 8.7, 8, 3],
    ['path', 'M3.3 20c.5-3.5 2.9-5.5 5.4-5.5s4.9 2 5.4 5.5'],
    ['circle', 16.7, 8.6, 2.3],
    ['path', 'M15.4 14.8c2 .2 3.9 2 4.4 5.2'],
  ],
  dollar: [
    ['circle', 12, 12, 9],
    ['path', 'M12 6.5v11'],
    ['path', 'M15.2 9.4c-.5-1-1.7-1.5-3-1.5-1.8 0-3.1 1-3.1 2.3 0 3.1 6.4 1.5 6.4 4.6 0 1.4-1.5 2.4-3.3 2.4-1.4 0-2.7-.6-3.3-1.7'],
  ],
  award: [
    ['circle', 12, 9, 5.5],
    ['path', 'M9 13.7 7.5 21l4.5-2.3 4.5 2.3-1.5-7.3'],
  ],
  zap: [['path', 'M13 2.5 5.5 14h5.3L10 21.5l8.5-12H13z']],
  barChart: [
    ['line', 4, 20, 20, 20],
    ['rect', 6, 13.5, 3, 6.5, 0.5],
    ['rect', 10.9, 8.5, 3, 11.5, 0.5],
    ['rect', 15.8, 4.5, 3, 15.5, 0.5],
  ],
  settings: [
    ['circle', 12, 12, 3.2],
    ['path', 'M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z'],
  ],
  search: [
    ['circle', 10.3, 10.3, 6.3],
    ['line', 15, 15, 20, 20],
  ],
  bell: [
    ['path', 'M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z'],
    ['path', 'M10 19a2 2 0 0 0 4 0'],
  ],
  chevronDown: [['path', 'M6 9.5 12 15.5 18 9.5']],
  chevronRight: [['path', 'M9 6l6 6-6 6']],
  plus: [
    ['line', 12, 5, 12, 19],
    ['line', 5, 12, 19, 12],
  ],
  x: [
    ['line', 6, 6, 18, 18],
    ['line', 18, 6, 6, 18],
  ],
  check: [['path', 'M5 12.8 9.5 17 19 7']],
  checkCircle: [
    ['circle', 12, 12, 9],
    ['path', 'M7.8 12.3 10.5 15 16.3 9'],
  ],
  phone: [['path', 'M5 4h3.3l1.4 4.3-2 1.6a11.3 11.3 0 0 0 6.4 6.4l1.6-2 4.3 1.4V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z']],
  mapPin: [
    ['path', 'M12 21s7-6.5 7-11.7a7 7 0 1 0-14 0C5 14.5 12 21 12 21Z'],
    ['circle', 12, 9.3, 2.5],
  ],
  clock: [
    ['circle', 12, 12, 9],
    ['path', 'M12 7.2v5l3.6 2.1'],
  ],
  filter: [['path', 'M4 5h16l-6.2 7.5V19l-3.6 1.8v-8.3Z']],
  moreHorizontal: [
    ['circle', 5, 12, 1.3],
    ['circle', 12, 12, 1.3],
    ['circle', 19, 12, 1.3],
  ],
  arrowUpRight: [
    ['line', 7, 17, 17, 7],
    ['path', 'M9 7h8v8'],
  ],
  star: [['path', 'M12 3.3l2.7 5.6 6.1.7-4.5 4.2 1.2 6.1L12 16.8l-5.5 3.1 1.2-6.1-4.5-4.2 6.1-.7Z']],
  briefcase: [
    ['rect', 3.5, 8, 17, 11, 1.5],
    ['path', 'M8.5 8V6a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 6v2'],
    ['line', 3.5, 13, 20.5, 13],
  ],
  idCard: [
    ['rect', 3, 5, 18, 14, 2],
    ['circle', 8.5, 11, 2],
    ['path', 'M6 16c.4-1.5 1.4-2.3 2.5-2.3s2.1.8 2.5 2.3'],
    ['line', 14, 9.3, 18, 9.3],
    ['line', 14, 12.3, 18, 12.3],
  ],
  fileCheck: [
    ['path', 'M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z'],
    ['path', 'M14 3v4h4'],
    ['path', 'M9 14.3l2 2 4-4.3'],
  ],
  clipboardList: [
    ['rect', 5, 4, 14, 17, 1.5],
    ['rect', 9, 2.3, 6, 3, 1],
    ['line', 8, 11, 16, 11],
    ['line', 8, 14.5, 16, 14.5],
    ['line', 8, 18, 13, 18],
  ],
  trendingUp: [
    ['path', 'M3 16.5 9 10.5l3.7 3.7L21 6'],
    ['path', 'M15.3 6H21v5.7'],
  ],
  building: [
    ['rect', 5, 3, 10, 18, 1],
    ['path', 'M15 21h4V9l-4-2'],
    ['line', 8, 7, 8, 7],
    ['line', 8, 10.5, 8, 10.5],
    ['line', 8, 14, 8, 14],
    ['line', 11.5, 7, 11.5, 7],
    ['line', 11.5, 10.5, 11.5, 10.5],
    ['line', 11.5, 14, 11.5, 14],
    ['line', 8, 17.5, 11.5, 17.5],
  ],
  download: [
    ['path', 'M12 3.5v11.5'],
    ['path', 'M7.5 11 12 15.5 16.5 11'],
    ['path', 'M4 17.5v2a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5v-2'],
  ],
  globe: [
    ['circle', 12, 12, 9],
    ['path', 'M3 12h18'],
    ['path', 'M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z'],
  ],
  image: [
    ['rect', 3.5, 4.5, 17, 15, 1.5],
    ['circle', 9, 10, 1.8],
    ['path', 'M5 17.5 10 12l3 3 2.5-2.5 3.5 3.5'],
  ],
  edit: [
    ['path', 'M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z'],
  ],
  trash: [
    ['line', 3, 6, 21, 6],
    ['path', 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'],
    ['path', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'],
    ['line', 10, 11, 10, 17],
    ['line', 14, 11, 14, 17],
  ],
};

export default function Icon({ name, size = 18, stroke = 1.8, className = '' }) {
  const shapes = ICONS[name] || ICONS.x;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {shapes.map(([kind, ...args], i) => {
        if (kind === 'path') return <path key={i} d={args[0]} />;
        if (kind === 'circle') return <circle key={i} cx={args[0]} cy={args[1]} r={args[2]} />;
        if (kind === 'line') return <line key={i} x1={args[0]} y1={args[1]} x2={args[2]} y2={args[3]} />;
        if (kind === 'rect') return <rect key={i} x={args[0]} y={args[1]} width={args[2]} height={args[3]} rx={args[4] || 0} />;
        return null;
      })}
    </svg>
  );
}

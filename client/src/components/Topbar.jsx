import Icon from './Icon.jsx';

export default function Topbar({ title, count, actions }) {
  return (
    <div className="h-16 flex-shrink-0 border-b border-line bg-surface flex items-center justify-between px-6 gap-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <h1 className="font-serif text-lg font-semibold text-ink truncate">{title}</h1>
        {count !== undefined && (
          <span className="text-xs font-medium text-muted bg-wash border border-line rounded-full px-2 py-0.5">
            {count}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="hidden md:flex items-center gap-2 text-sm text-faint bg-wash border border-line rounded-lg px-3 py-1.5 w-56">
          <Icon name="search" size={15} />
          <span className="truncate">Search {title?.toLowerCase()}…</span>
        </div>
        {actions}
      </div>
    </div>
  );
}

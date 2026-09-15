import Icon from './Icon.jsx';

export default function Topbar({ title, count, actions }) {
  return (
    <div className="flex-shrink-0 border-b border-line bg-surface flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 md:h-16 md:flex-nowrap md:px-6 md:py-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <h1 className="font-serif text-lg font-semibold text-ink truncate">{title}</h1>
        {count !== undefined && (
          <span className="text-xs font-medium text-muted bg-wash border border-line rounded-full px-2 py-0.5">
            {count}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 md:gap-3 flex-wrap md:flex-nowrap flex-shrink-0">
        <div className="hidden md:flex items-center gap-2 text-sm text-faint bg-wash border border-line rounded-lg px-3 py-1.5 w-56">
          <Icon name="search" size={15} />
          <span className="truncate">Search {title?.toLowerCase()}…</span>
        </div>
        {actions}
      </div>
    </div>
  );
}

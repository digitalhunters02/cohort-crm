import Icon from './Icon.jsx';
import { initialsOf } from '../format.js';

export function Button({ children, onClick, variant = 'solid', size = 'md', className = '', type = 'button', disabled = false }) {
  const sizes = { sm: 'text-xs px-2.5 py-1.5', md: 'text-sm px-3.5 py-2' };
  const variants = {
    solid: 'bg-ink text-white hover:bg-black',
    brand: 'bg-brand text-white hover:brightness-110',
    outline: 'border border-line bg-white text-ink hover:bg-wash',
    ghost: 'text-muted hover:bg-wash hover:text-ink',
    danger: 'bg-rose text-white hover:brightness-95',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

const TONES = {
  neutral: { bg: '#f0e8d8', fg: '#6d6255', border: '#e1d5bd' },
  brand: { bg: '#f4dbdd', fg: '#7a2331', border: '#e8bfc3' },
  gold: { bg: '#f6ecd3', fg: '#8a621a', border: '#ecd9a6' },
  amber: { bg: '#f7ecd6', fg: '#8a621a', border: '#efd9a9' },
  rose: { bg: '#f8dee2', fg: '#96303f', border: '#f0bdc4' },
  blue: { bg: '#dfe8ef', fg: '#2c516e', border: '#c2d3e0' },
  violet: { bg: '#e9e2f0', fg: '#54406c', border: '#d5c6e3' },
  teal: { bg: '#dcece5', fg: '#2c5c4c', border: '#bcdccf' },
  green: { bg: '#e1ecdd', fg: '#2f5c2b', border: '#c4dcbc' },
};

export function Badge({ tone = 'neutral', children }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border"
      style={{ backgroundColor: t.bg, color: t.fg, borderColor: t.border }}
    >
      {children}
    </span>
  );
}

export function Dot({ color = '#a9998c', size = 8 }) {
  return <span className="inline-block rounded-full flex-shrink-0" style={{ backgroundColor: color, width: size, height: size }} />;
}

export function Avatar({ name, color = '#79695f', size = 32 }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0"
      style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.38 }}
    >
      {initialsOf(name)}
    </span>
  );
}

export function Mono({ name, color = '#79695f', size = 32 }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-md text-white font-semibold flex-shrink-0"
      style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.36 }}
    >
      {initialsOf(name)}
    </span>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`bg-surface border border-line rounded-xl ${className}`}>{children}</div>;
}

export function CardHead({ title, sub, action }) {
  return (
    <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-lineSoft">
      <div>
        <h3 className="font-serif text-[15px] font-semibold text-ink">{title}</h3>
        {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Kpi({ label, value, sub, tone = 'neutral', icon }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted uppercase tracking-wide">{label}</span>
        {icon && (
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: t.bg, color: t.fg }}
          >
            <Icon name={icon} size={15} />
          </span>
        )}
      </div>
      <div className="font-serif text-2xl font-semibold text-ink">{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </Card>
  );
}

export function CellName({ primary, secondary, avatarName, avatarColor, mono = false }) {
  const AvatarComp = mono ? Mono : Avatar;
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {avatarName && <AvatarComp name={avatarName} color={avatarColor} size={30} />}
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink truncate">{primary}</div>
        {secondary && <div className="text-xs text-muted truncate">{secondary}</div>}
      </div>
    </div>
  );
}

export function Muted({ children }) {
  return <span className="text-muted">{children}</span>;
}

export function Table({ cols, rows, rowH = 'h-14' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse min-w-[640px]">
        <thead>
          <tr className="border-b border-line">
            {cols.map((c) => (
              <th
                key={c.key}
                className={`text-left font-medium text-muted text-xs uppercase tracking-wide px-5 py-2.5 ${c.align === 'right' ? 'text-right' : ''}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className={`border-b border-lineSoft ${rowH} hover:bg-wash/60`}>
              {cols.map((c) => (
                <td key={c.key} className={`px-5 align-middle ${c.align === 'right' ? 'text-right' : ''}`}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="text-center text-sm text-muted py-10">No records yet.</div>}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex items-center gap-1 border-b border-line px-5">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`text-sm font-medium px-3 py-2.5 border-b-2 -mb-px transition-colors ${
            active === t.key ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center h-full py-24">
      <div className="w-8 h-8 rounded-full border-2 border-line border-t-brand animate-spin" />
    </div>
  );
}

export function Modal({ title, sub, onClose, children, wide = false }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40"
      onClick={onClose}
    >
      <div
        className={`bg-surface border border-line rounded-xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-lineSoft sticky top-0 bg-surface">
          <div>
            <h3 className="font-serif text-[15px] font-semibold text-ink">{title}</h3>
            {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:bg-wash hover:text-ink flex-shrink-0"
          >
            <Icon name="x" size={15} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, className = '', children }) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      <span className="text-xs font-medium text-muted uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full text-sm border border-line rounded-lg px-3 py-2 bg-white text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand/30';

export function IconButton({ icon, onClick, title, tone = 'default' }) {
  const tones = {
    default: 'text-muted hover:text-ink hover:bg-wash',
    danger: 'text-muted hover:text-rose hover:bg-roseTint',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${tones[tone]}`}
    >
      <Icon name={icon} size={14} />
    </button>
  );
}

export function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <IconButton icon="edit" title="Edit" onClick={onEdit} />
      <IconButton icon="trash" title="Delete" tone="danger" onClick={onDelete} />
    </div>
  );
}

export function ConfirmDialog({ title, message, error, busy, onCancel, onConfirm, confirmLabel }) {
  return (
    <Modal title={title ?? 'Delete?'} onClose={onCancel}>
      <p className="text-sm text-muted mb-4">{message}</p>
      {error && (
        <div className="text-xs text-rose bg-roseTint border border-rose/30 rounded-lg px-3 py-2 mb-4">{error}</div>
      )}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>{busy ? 'Deleting…' : (confirmLabel ?? 'Delete')}</Button>
      </div>
    </Modal>
  );
}

export { TONES };

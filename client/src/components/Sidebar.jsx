import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';

const SECTIONS = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: 'home' }],
  },
  {
    label: 'Admissions',
    items: [
      { to: '/inquiries', label: 'Inquiries', icon: 'mail' },
      { to: '/pipeline', label: 'Pipeline', icon: 'kanban' },
      { to: '/tours', label: 'Tours & Events', icon: 'calendar' },
      { to: '/interviews', label: 'Interviews', icon: 'userCheck' },
    ],
  },
  {
    label: 'Students',
    items: [
      { to: '/students', label: 'Students', icon: 'graduationCap' },
      { to: '/families', label: 'Families', icon: 'users' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/tuition', label: 'Tuition & Billing', icon: 'dollar' },
      { to: '/financial-aid', label: 'Financial Aid', icon: 'award' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/automations', label: 'Automations', icon: 'zap' },
      { to: '/reports', label: 'Reports', icon: 'barChart' },
      { to: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

function LogoMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <path d="M13 2 23.5 8v10L13 24 2.5 18V8Z" stroke="#c98a4d" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M13 2v22M2.5 8l10.5 6 10.5-6" stroke="#c98a4d" strokeWidth="1.1" />
      <circle cx="13" cy="13" r="1.9" fill="#c98a4d" />
    </svg>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-60 flex-shrink-0 h-full bg-side text-sideText flex flex-col min-h-0">
      <div className="px-5 pt-6 pb-5 flex items-center gap-2.5 border-b border-sideLine flex-shrink-0">
        <LogoMark />
        <div>
          <div className="font-serif text-lg font-semibold leading-none">Cohort</div>
          <div className="text-[11px] text-sideMuted mt-1">Ashford Preparatory Academy</div>
        </div>
      </div>

      <nav className="flex-grow min-h-0 overflow-y-auto py-4 px-3">
        {SECTIONS.map((section) => (
          <div key={section.label} className="mb-5">
            <div className="px-2.5 mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-sideMuted">
              {section.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium transition-colors ${
                      isActive ? 'bg-sideSoft text-white' : 'text-sideText/85 hover:bg-sideSoft/60 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gold" />
                      )}
                      <Icon name={item.icon} size={16} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-sideLine flex items-center gap-2.5 flex-shrink-0">
        <div className="min-w-0 flex-grow">
          <div className="text-[13px] font-medium text-white truncate">Est. 1987 &middot; Asheville, NC</div>
          <div className="text-[11px] text-sideMuted truncate">Grades K&ndash;12</div>
        </div>
      </div>
    </aside>
  );
}

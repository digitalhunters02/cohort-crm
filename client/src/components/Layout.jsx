import { useState } from 'react';
import Sidebar, { LogoMark } from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import Icon from './Icon.jsx';

export default function Layout({ title, count, actions, children, flush = false }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-bg overflow-hidden">
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-side text-white flex items-center gap-3 px-4 shadow-md">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="w-8 h-8 -ml-1.5 flex items-center justify-center rounded-lg text-white hover:bg-white/10 flex-shrink-0"
        >
          <Icon name="menu" size={20} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <LogoMark />
          <span className="font-serif text-base font-semibold leading-none truncate">Cohort</span>
        </div>
      </div>

      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar open={drawerOpen} onNavigate={() => setDrawerOpen(false)} />

      <div className="flex flex-col flex-grow min-w-0 h-full pt-14 md:pt-0">
        <Topbar title={title} count={count} actions={actions} />
        {flush ? (
          <div className="flex-grow min-h-0 overflow-hidden">{children}</div>
        ) : (
          <div className="flex-grow min-h-0 overflow-y-auto">
            <div className="p-4 md:p-6 max-w-[1400px] mx-auto">{children}</div>
          </div>
        )}
      </div>
    </div>
  );
}

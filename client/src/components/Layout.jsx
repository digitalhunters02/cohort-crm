import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function Layout({ title, count, actions, children, flush = false }) {
  return (
    <div className="flex h-screen w-full bg-bg overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-grow min-w-0 h-full">
        <Topbar title={title} count={count} actions={actions} />
        {flush ? (
          <div className="flex-grow min-h-0 overflow-hidden">{children}</div>
        ) : (
          <div className="flex-grow min-h-0 overflow-y-auto">
            <div className="p-6 max-w-[1400px] mx-auto">{children}</div>
          </div>
        )}
      </div>
    </div>
  );
}

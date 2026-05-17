import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Globe,
  Database,
  Settings,
  ChevronLeft,
  Sofa,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/apps', label: 'Applications', icon: Boxes },
  { path: '/domains', label: 'Domains', icon: Globe },
  { path: '/databases', label: 'Databases', icon: Database },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, sidebarOpen, setSidebarOpen } = useAppStore();
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-60',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2">
            <Sofa className="h-6 w-6 text-sidebar-primary shrink-0" />
            {!sidebarCollapsed && (
              <span className="text-lg font-bold text-sidebar-primary-foreground">Sofa</span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-md p-1 text-sidebar-foreground hover:text-sidebar-primary-foreground lg:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-sidebar-primary')} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="hidden border-t border-sidebar-border p-2 lg:block">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex w-full items-center justify-center rounded-md p-2 text-sidebar-foreground hover:text-sidebar-primary-foreground transition-colors"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
          </button>
        </div>

        {/* Version */}
        {!sidebarCollapsed && (
          <div className="border-t border-sidebar-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Sofa v0.1.0</p>
          </div>
        )}
      </aside>
    </>
  );
}

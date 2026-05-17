import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { useAppStore } from '@/stores/app';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn(
        'flex flex-col transition-all duration-300',
        sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
      )}>
        <Header />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

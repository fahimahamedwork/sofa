import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Menu, Search, LogOut, User, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();
  const segments = location.pathname.split('/').filter(Boolean);

  const nameMap: Record<string, string> = {
    apps: 'Applications',
    new: 'New App',
    domains: 'Domains',
    databases: 'Databases',
    settings: 'Settings',
    deployments: 'Deployments',
    env: 'Environment',
    logs: 'Logs',
    terminal: 'Terminal',
  };

  if (segments.length === 0) {
    return <span className="text-sm text-muted-foreground">Dashboard</span>;
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
        Dashboard
      </Link>
      {segments.map((segment, idx) => {
        const isLast = idx === segments.length - 1;
        const path = '/' + segments.slice(0, idx + 1).join('/');
        const label = nameMap[segment] || segment;

        return (
          <div key={path} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <button
                onClick={() => navigate(path)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Header() {
  const { setSidebarOpen } = useAppStore();
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-sm px-4 lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="hidden md:flex items-center relative">
        <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="w-48 h-8 pl-8 text-xs"
        />
      </div>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary',
            'hover:bg-primary/30 transition-colors text-sm font-semibold cursor-pointer'
          )}>
            A
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { logout(); navigate('/login'); }}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

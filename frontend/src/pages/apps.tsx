import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppCard } from '@/components/app/app-card';
import { AppListItem } from '@/components/app/app-list-item';
import { Skeleton } from '@/components/ui/skeleton';
import { useApps, useStartApp, useStopApp, useRestartApp } from '@/hooks/useApp';

export function AppsPage() {
  const { data: apps, isLoading } = useApps();
  const startApp = useStartApp();
  const stopApp = useStopApp();
  const restartApp = useRestartApp();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const filteredApps = apps?.filter((app) =>
    app.name.toLowerCase().includes(search.toLowerCase()) ||
    app.framework?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your deployed applications</p>
        </div>
        <Link to="/apps/new">
          <Button>
            <Plus className="h-4 w-4 mr-1" /> New App
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search applications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center border border-border rounded-md">
          <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded-l-md transition-colors ${
              view === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded-r-md transition-colors ${
              view === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">
            {search ? 'No applications match your search' : 'No applications yet'}
          </p>
          {!search && (
            <Link to="/apps/new">
              <Button variant="outline" className="mt-4">Deploy your first app</Button>
            </Link>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onStart={(id) => startApp.mutate(id)}
              onStop={(id) => stopApp.mutate(id)}
              onRestart={(id) => restartApp.mutate(id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-muted px-4 py-2 flex items-center gap-4 text-xs font-medium text-muted-foreground border-b border-border">
            <span className="w-2.5" />
            <span className="w-40">Name</span>
            <span className="w-20">Framework</span>
            <span className="w-24">Status</span>
            <span className="flex-1">Source</span>
          </div>
          {filteredApps.map((app) => (
            <AppListItem
              key={app.id}
              app={app}
              onStart={(id) => startApp.mutate(id)}
              onStop={(id) => stopApp.mutate(id)}
              onRestart={(id) => restartApp.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

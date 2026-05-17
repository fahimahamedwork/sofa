import { useState } from 'react';
import { Plus, Database as DbIcon, Trash2, Eye, EyeOff, Copy } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databasesApi } from '@/lib/api';
import type { Database, DatabaseType } from '@/types';
import { toast } from 'sonner';
import { cn, maskString } from '@/lib/utils';

const dbTypeColors: Record<DatabaseType, string> = {
  postgresql: 'bg-sky-500/10 text-sky-400',
  mysql: 'bg-blue-500/10 text-blue-400',
  redis: 'bg-red-500/10 text-red-400',
  mongodb: 'bg-emerald-500/10 text-emerald-400',
};

export function DatabasesPage() {
  const queryClient = useQueryClient();
  const { data: databases, isLoading } = useQuery({
    queryKey: ['databases'],
    queryFn: async () => {
      const { data } = await databasesApi.listDatabases();
      return data;
    },
  });

  const removeDB = useMutation({
    mutationFn: async (id: string) => {
      await databasesApi.removeDB(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databases'] });
      toast.success('Database removed');
    },
    onError: () => {
      toast.error('Failed to remove database');
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dbName, setDbName] = useState('');
  const [dbType, setDbType] = useState<DatabaseType>('postgresql');

  const createDB = useMutation({
    mutationFn: async () => {
      const { data } = await databasesApi.provisionDB({ name: dbName, type: dbType });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databases'] });
      setDbName('');
      setDialogOpen(false);
      toast.success('Database provisioned');
    },
    onError: () => {
      toast.error('Failed to provision database');
    },
  });

  const [visibleConn, setVisibleConn] = useState<Set<string>>(new Set());

  const toggleConn = (id: string) => {
    setVisibleConn((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Databases</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage provisioned databases</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" /> New Database
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Provision Database</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Name</label>
                <Input placeholder="my-database" value={dbName} onChange={(e) => setDbName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['postgresql', 'mysql', 'redis', 'mongodb'] as DatabaseType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setDbType(type)}
                      className={cn(
                        'flex items-center gap-2 rounded-md border p-2.5 text-sm font-medium transition-colors cursor-pointer',
                        dbType === type
                          ? 'border-emerald-600 bg-emerald-600/5 text-emerald-400'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600'
                      )}
                    >
                      <DbIcon className="h-4 w-4" />
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => createDB.mutate()} disabled={!dbName.trim() || createDB.isPending}>
                {createDB.isPending ? 'Provisioning...' : 'Provision'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))
      ) : !databases || databases.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-zinc-500">No databases provisioned</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {databases.map((db: Database) => (
            <Card key={db.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={cn('text-[10px]', dbTypeColors[db.type])}>
                      {db.type}
                    </Badge>
                    <CardTitle className="text-base">{db.name}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeDB.mutate(db.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                </div>
                <CardDescription>
                  {db.appName ? `Linked to ${db.appName}` : 'Standalone'} &middot; {db.sizeMB} MB
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Host</span>
                  <span className="text-zinc-200 font-mono text-xs">{db.host}:{db.port}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Database</span>
                  <span className="text-zinc-200 font-mono text-xs">{db.databaseName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Connection URL</span>
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-200 font-mono text-xs max-w-[200px] truncate">
                      {visibleConn.has(db.id) ? db.connectionUrl : maskString(db.connectionUrl)}
                    </span>
                    <button onClick={() => toggleConn(db.id)} className="text-zinc-500 hover:text-zinc-300">
                      {visibleConn.has(db.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                    <button onClick={() => copyToClipboard(db.connectionUrl)} className="text-zinc-500 hover:text-zinc-300">
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

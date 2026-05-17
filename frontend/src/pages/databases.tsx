import { useState } from 'react';
import { Plus, Database as DbIcon, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databasesApi } from '@/lib/api';
import type { DatabaseType } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
      if (Array.isArray(data)) return data;
      return [];
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
  const [dbType, setDbType] = useState<DatabaseType>('postgresql');
  const [connectionString, setConnectionString] = useState('');

  const createDB = useMutation({
    mutationFn: async () => {
      const { data } = await databasesApi.provisionDB({ type: dbType, connectionString });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databases'] });
      setConnectionString('');
      setDialogOpen(false);
      toast.success('Database provisioned');
    },
    onError: () => {
      toast.error('Failed to provision database');
    },
  });

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
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Connection String</label>
                <Input
                  placeholder="postgres://user:pass@host:5432/dbname"
                  value={connectionString}
                  onChange={(e) => setConnectionString(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => createDB.mutate()} disabled={!connectionString.trim() || createDB.isPending}>
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
          {databases.map((db: any) => (
            <Card key={db.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={cn('text-[10px]', dbTypeColors[db.type as DatabaseType] || 'bg-zinc-700 text-zinc-300')}>
                      {db.type}
                    </Badge>
                    <CardTitle className="text-base">Database #{db.id}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeDB.mutate(db.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                </div>
                <CardDescription>
                  Created {db.createdAt ? new Date(db.createdAt).toLocaleDateString() : 'N/A'}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Save } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EnvVarRow } from '@/components/env/env-var-row';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useEnvVars, useCreateEnvVar, useUpdateEnvVar, useDeleteEnvVar, useRestartApp } from '@/hooks/useApp';

export function AppEnvPage() {
  const { id } = useParams<{ id: string }>();
  const { data: envVars, isLoading } = useEnvVars(id!);
  const createEnvVar = useCreateEnvVar(id!);
  const updateEnvVar = useUpdateEnvVar(id!);
  const deleteEnvVar = useDeleteEnvVar();
  const restartApp = useRestartApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleAdd = () => {
    if (!newKey.trim()) return;
    createEnvVar.mutate({ key: newKey, value: newValue }, {
      onSuccess: () => {
        setNewKey('');
        setNewValue('');
        setDialogOpen(false);
      },
    });
  };

  const handleUpdate = (envVarId: string, key: string, value: string) => {
    updateEnvVar.mutate({ key, value });
  };

  const handleDelete = (envVarId: string) => {
    deleteEnvVar.mutate({ id: envVarId, appId: id! });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Environment Variables</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => restartApp.mutate(id!)}
          >
            <Save className="h-3.5 w-3.5 mr-1" /> Save & Redeploy
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Variable
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Environment Variable</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Key</label>
                  <Input
                    placeholder="DATABASE_URL"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Value</label>
                  <Input
                    placeholder="postgres://..."
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={!newKey.trim()}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 mb-2" />
            ))
          ) : !envVars || envVars.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">No environment variables</p>
          ) : (
            <div>
              {envVars.map((envVar) => (
                <EnvVarRow
                  key={envVar.id}
                  envVar={envVar}
                  onUpdate={(id, key, value) => handleUpdate(id, key, value)}
                  onDelete={(id) => handleDelete(id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useApp, useUpdateApp, useDeleteApp } from '@/hooks/useApp';
import { toast } from 'sonner';

export function AppSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: app, isLoading } = useApp(id);
  const updateApp = useUpdateApp(id!);
  const deleteApp = useDeleteApp();
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [port, setPort] = useState('');
  const [buildCmd, setBuildCmd] = useState('');
  const [memoryLimit, setMemoryLimit] = useState('');
  const [cpuLimit, setCpuLimit] = useState('');

  // Initialize form when app loads
  useEffect(() => {
    if (app) {
      setName(app.name || '');
      setPort(String(app.port || ''));
      setBuildCmd(app.buildCmd || '');
      setMemoryLimit(String(app.memoryLimit || ''));
      setCpuLimit(String(app.cpuLimit || ''));
    }
  }, [app]);

  const handleSave = () => {
    updateApp.mutate({
      name: name || undefined,
      port: port ? parseInt(port) : undefined,
      buildCmd: buildCmd || undefined,
      memoryLimit: memoryLimit ? parseInt(memoryLimit) : undefined,
      cpuLimit: cpuLimit ? parseFloat(cpuLimit) : undefined,
    });
  };

  const handleDelete = () => {
    if (deleteConfirm !== app?.name) return;
    deleteApp.mutate(id!, {
      onSuccess: () => {
        navigate('/apps');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-zinc-100">Settings</h2>

      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
          <CardDescription>Basic application configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Application Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Port</label>
              <Input value={port} onChange={(e) => setPort(e.target.value)} type="number" />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Framework</label>
              <Input value={app?.framework || ''} disabled />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Build Command</label>
            <Input value={buildCmd} onChange={(e) => setBuildCmd(e.target.value)} placeholder="npm run build" />
          </div>
          <Button onClick={handleSave} disabled={updateApp.isPending}>
            {updateApp.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resources</CardTitle>
          <CardDescription>Set resource limits for your application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Memory Limit (MB)</label>
              <Input value={memoryLimit} onChange={(e) => setMemoryLimit(e.target.value)} type="number" placeholder="512" />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-1.5 block">CPU Limit (cores)</label>
              <Input value={cpuLimit} onChange={(e) => setCpuLimit(e.target.value)} type="number" step="0.5" placeholder="1" />
            </div>
          </div>
          <Button onClick={handleSave} variant="outline" disabled={updateApp.isPending}>
            {updateApp.isPending ? 'Saving...' : 'Save Resources'}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Danger Zone */}
      <Card className="border-red-900/50">
        <CardHeader>
          <CardTitle className="text-base text-red-400">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Delete this application</AlertTitle>
            <AlertDescription>
              This will permanently delete the application, all its deployments, environment variables, and domains.
              This action cannot be undone.
            </AlertDescription>
          </Alert>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
                Type <span className="font-mono text-red-400">{app?.name}</span> to confirm
              </label>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={app?.name}
              />
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfirm !== app?.name || deleteApp.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {deleteApp.isPending ? 'Deleting...' : 'Delete Application'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

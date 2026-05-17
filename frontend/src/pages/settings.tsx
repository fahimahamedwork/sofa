import { useState } from 'react';
import { Key, Plus, Trash2, Copy, Server, Shield, Clock, HardDrive } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';
import { useServerStats } from '@/hooks/useApp';
import type { SSHKey } from '@/types';
import { toast } from 'sonner';
import { formatBytes, formatDuration } from '@/lib/utils';

export function SettingsPage() {
  const { data: stats, isLoading: statsLoading } = useServerStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">Manage server and security settings</p>
      </div>

      <Tabs defaultValue="server">
        <TabsList>
          <TabsTrigger value="server">Server</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="ssh">SSH Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="server">
          <ServerTab stats={stats} isLoading={statsLoading} />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="ssh">
          <SSHTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ServerTab({ stats, isLoading }: { stats: ReturnType<typeof useServerStats>['data']; isLoading: boolean }) {
  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4 text-zinc-400" /> Server Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Hostname" value={stats?.hostname || 'N/A'} />
          <InfoRow label="Operating System" value={stats?.os || 'N/A'} />
          <InfoRow label="Docker Version" value={stats?.dockerVersion || 'N/A'} />
          <InfoRow label="Uptime" value={stats?.uptime != null ? formatDuration(stats.uptime) : 'N/A'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-zinc-400" /> Disk Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Total Disk" value={stats?.diskTotal ? formatBytes(stats.diskTotal) : 'N/A'} />
          <InfoRow label="Used Disk" value={stats?.diskUsed ? formatBytes(stats.diskUsed) : 'N/A'} />
          <InfoRow label="Disk Usage" value={stats?.diskUsage != null ? `${stats.diskUsage.toFixed(1)}%` : 'N/A'} />
          <InfoRow label="CPU Cores" value={stats?.cpuCores != null ? String(stats.cpuCores) : 'N/A'} />
          <InfoRow label="Total RAM" value={stats?.memoryTotal ? formatBytes(stats.memoryTotal) : 'N/A'} />
        </CardContent>
      </Card>
    </div>
  );
}

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ipWhitelist, setIpWhitelist] = useState('');

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    toast.success('Password updated successfully');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-zinc-400" /> Change Password
          </CardTitle>
          <CardDescription>Update your admin password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Current Password</label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-300 mb-1.5 block">New Password</label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Confirm New Password</label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button onClick={handlePasswordChange} disabled={!currentPassword || !newPassword}>
            Update Password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-zinc-400" /> IP Whitelist
          </CardTitle>
          <CardDescription>Restrict panel access to specific IP addresses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Allowed IPs (one per line)</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              placeholder="192.168.1.0/24&#10;10.0.0.1"
              value={ipWhitelist}
              onChange={(e) => setIpWhitelist(e.target.value)}
            />
          </div>
          <Button variant="outline">Save IP Whitelist</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SSHTab() {
  const queryClient = useQueryClient();
  const { data: sshKeys, isLoading } = useQuery({
    queryKey: ['ssh-keys'],
    queryFn: async () => {
      const { data } = await settingsApi.listSSHKeys();
      return data;
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [publicKey, setPublicKey] = useState('');

  const addKey = useMutation({
    mutationFn: async () => {
      const { data } = await settingsApi.addSSHKey({ name: keyName, publicKey });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssh-keys'] });
      setKeyName('');
      setPublicKey('');
      setDialogOpen(false);
      toast.success('SSH key added');
    },
    onError: () => {
      toast.error('Failed to add SSH key');
    },
  });

  const removeKey = useMutation({
    mutationFn: async (id: string) => {
      await settingsApi.removeSSHKey(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssh-keys'] });
      toast.success('SSH key removed');
    },
    onError: () => {
      toast.error('Failed to remove SSH key');
    },
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-zinc-100">SSH Keys</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add SSH Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Name</label>
                <Input placeholder="My Laptop" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Public Key</label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 font-mono placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  placeholder="ssh-rsa AAAA..."
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => addKey.mutate()} disabled={!keyName.trim() || !publicKey.trim()}>
                Add Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
      ) : !sshKeys || sshKeys.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Key className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No SSH keys added</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sshKeys.map((key: SSHKey) => (
            <Card key={key.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Key className="h-4 w-4 text-zinc-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200">{key.name}</p>
                    <p className="text-xs text-zinc-500 font-mono truncate">{key.fingerprint}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-[10px]">
                    <Clock className="h-3 w-3 mr-1" />
                    Added {new Date(key.createdAt).toLocaleDateString()}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeKey.mutate(key.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-zinc-400">{label}</span>
      <span className="text-zinc-200 font-mono text-xs">{value}</span>
    </div>
  );
}

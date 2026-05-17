import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DomainCard } from '@/components/domain/domain-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAppDomains, useAddDomain, useRemoveDomain } from '@/hooks/useApp';
import { domainsApi } from '@/lib/api';
import { toast } from 'sonner';
import type { DomainType } from '@/types';

export function AppDomainsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: domains, isLoading } = useAppDomains(id!);
  const addDomain = useAddDomain(id!);
  const removeDomain = useRemoveDomain();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hostname, setHostname] = useState('');
  const [domainType, setDomainType] = useState<DomainType>('custom');

  const handleAdd = () => {
    if (!hostname.trim()) return;
    addDomain.mutate({ domain: hostname, type: domainType }, {
      onSuccess: () => {
        setHostname('');
        setDialogOpen(false);
      },
    });
  };

  const handleVerify = async (domainId: string) => {
    try {
      await domainsApi.verifyDomain(domainId);
      toast.success('Domain verification initiated');
    } catch {
      toast.error('Verification failed');
    }
  };

  const handleSetPrimary = async (domainId: string) => {
    try {
      await domainsApi.setPrimary(domainId);
      toast.success('Primary domain updated');
    } catch {
      toast.error('Failed to set primary domain');
    }
  };

  const handleRemove = (domainId: string) => {
    removeDomain.mutate({ id: domainId, appId: id! });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Domains</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Domain
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Domain</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Hostname</label>
                <Input
                  placeholder="example.com"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Type</label>
                <div className="flex gap-2">
                  {(['primary', 'custom', 'subdomain'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setDomainType(type)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        domainType === type
                          ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-md bg-zinc-800/50 p-3 text-xs text-zinc-400">
                <p className="font-medium text-zinc-300 mb-1">DNS Configuration</p>
                <p>After adding the domain, create a CNAME or A record pointing to your server.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!hostname.trim()}>Add Domain</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))
      ) : !domains || domains.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-zinc-500">No domains configured</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {domains.map((domain) => (
            <DomainCard
              key={domain.id}
              domain={domain}
              onRemove={handleRemove}
              onSetPrimary={handleSetPrimary}
              onVerify={handleVerify}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Globe, ShieldCheck, ShieldAlert, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { domainsApi } from '@/lib/api';
import type { Domain } from '@/types';

export function DomainsPage() {
  const { data: domains, isLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: async () => {
      const { data } = await domainsApi.listAllDomains();
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Domains</h1>
        <p className="text-sm text-zinc-400 mt-1">Manage domains across all applications</p>
      </div>

      {/* SSL Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-emerald-500/10 p-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-50">
                {domains?.filter((d: Domain) => d.sslStatus === 'active').length ?? 0}
              </p>
              <p className="text-xs text-zinc-400">SSL Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-amber-500/10 p-2">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-50">
                {domains?.filter((d: Domain) => d.sslStatus === 'pending' || d.sslStatus === 'error').length ?? 0}
              </p>
              <p className="text-xs text-zinc-400">SSL Pending/Issue</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-zinc-800 p-2">
              <Globe className="h-5 w-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-50">{domains?.length ?? 0}</p>
              <p className="text-xs text-zinc-400">Total Domains</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Domain list */}
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))
      ) : !domains || domains.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-zinc-500">No domains configured</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {domains.map((domain: Domain) => (
              <Link
                key={domain.id}
                to={`/apps/${domain.appId}`}
                className="flex items-center gap-4 px-4 py-3 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors"
              >
                <Globe className="h-4 w-4 text-zinc-400 shrink-0" />
                <span className="text-sm text-zinc-200 flex-1">{domain.hostname}</span>
                <Badge variant="secondary" className="text-[10px]">{domain.appId}</Badge>
                <Badge variant={domain.sslStatus === 'active' ? 'running' : domain.sslStatus === 'error' ? 'error' : 'outline'} className="text-[10px]">
                  {domain.sslStatus === 'active' ? 'SSL Active' : domain.sslStatus === 'pending' ? 'SSL Pending' : domain.sslStatus === 'error' ? 'SSL Error' : 'No SSL'}
                </Badge>
                <ExternalLink className="h-3.5 w-3.5 text-zinc-500" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

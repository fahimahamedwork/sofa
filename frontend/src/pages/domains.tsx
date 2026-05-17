import { Link } from 'react-router-dom';
import { Globe, ShieldCheck, ShieldAlert, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
      if (Array.isArray(data)) return data;
      return [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Domains</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage domains across all applications</p>
      </div>

      {/* SSL Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-emerald-500/10 p-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {domains?.filter((d: Domain) => d.sslEnabled).length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">SSL Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-amber-500/10 p-2">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {domains?.filter((d: Domain) => !d.sslEnabled).length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">No SSL</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-muted p-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{domains?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total Domains</p>
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
            <p className="text-sm text-muted-foreground">No domains configured</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {domains.map((domain: Domain) => (
              <Link
                key={domain.id}
                to={`/apps/${domain.appId}`}
                className="flex items-center gap-4 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
              >
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground flex-1">{domain.domain}</span>
                <Badge variant="secondary" className="text-[10px]">{domain.type}</Badge>
                <Badge variant={domain.sslEnabled ? 'running' : 'outline'} className="text-[10px]">
                  {domain.sslEnabled ? 'SSL Active' : 'No SSL'}
                </Badge>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

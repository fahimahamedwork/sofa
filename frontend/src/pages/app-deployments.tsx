import { useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, RotateCcw, Rocket } from 'lucide-react';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/app/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDeployments, useRollback, useCreateDeployment } from '@/hooks/useApp';
import { formatDateRelative, truncateCommit, formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function AppDeploymentsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: deployments, isLoading } = useDeployments(slug!);
  const rollback = useRollback(slug!);
  const createDeployment = useCreateDeployment(slug!);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Deployments</h2>
        <Button size="sm" onClick={() => createDeployment.mutate()}>
          <Rocket className="h-3.5 w-3.5 mr-1" /> Redeploy
        </Button>
      </div>

      {!deployments || deployments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-zinc-500">No deployments yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {deployments.map((deployment) => (
            <Card key={deployment.id} className="overflow-hidden">
              <button
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-zinc-800/30 transition-colors cursor-pointer"
                onClick={() => setExpandedId(expandedId === deployment.id ? null : deployment.id)}
              >
                <StatusBadge status={deployment.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {deployment.commit && (
                      <span className="text-xs font-mono text-zinc-400">{truncateCommit(deployment.commit)}</span>
                    )}
                    {deployment.commitMessage && (
                      <span className="text-sm text-zinc-300 truncate">{deployment.commitMessage}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                    <span>{deployment.branch}</span>
                    <span>&middot;</span>
                    <span>{formatDateRelative(deployment.createdAt)}</span>
                    {deployment.buildDuration > 0 && (
                      <>
                        <span>&middot;</span>
                        <span>Built in {formatDuration(deployment.buildDuration)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(deployment.status === 'failed' || deployment.status === 'success') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        rollback.mutate(deployment.id);
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Rollback
                    </Button>
                  )}
                  {expandedId === deployment.id ? (
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  )}
                </div>
              </button>

              {expandedId === deployment.id && deployment.logs && (
                <div className="border-t border-zinc-800">
                  <ScrollArea className="max-h-64">
                    <pre className="p-4 text-xs font-mono text-zinc-300 bg-zinc-950 whitespace-pre-wrap">
                      {deployment.logs}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

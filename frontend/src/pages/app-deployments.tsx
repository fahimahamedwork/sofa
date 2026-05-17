import { useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, RotateCcw, Rocket } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/app/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDeployments, useRollback, useCreateDeployment } from '@/hooks/useApp';
import { formatDateRelative, formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function AppDeploymentsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: deployments, isLoading } = useDeployments(id!);
  const rollback = useRollback(id!);
  const createDeployment = useCreateDeployment(id!);
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
        <h2 className="text-lg font-semibold text-foreground">Deployments</h2>
        <Button size="sm" onClick={() => createDeployment.mutate()}>
          <Rocket className="h-3.5 w-3.5 mr-1" /> Redeploy
        </Button>
      </div>

      {!deployments || deployments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No deployments yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {deployments.map((deployment) => (
            <Card key={deployment.id} className="overflow-hidden">
              <button
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => setExpandedId(expandedId === deployment.id ? null : deployment.id)}
              >
                <StatusBadge status={deployment.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {deployment.commitHash && (
                      <span className="text-xs font-mono text-muted-foreground">{deployment.commitHash.substring(0, 7)}</span>
                    )}
                    {deployment.commitMessage && (
                      <span className="text-sm text-foreground truncate">{deployment.commitMessage}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
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
                  {(deployment.status === 'failed' || deployment.status === 'healthy') && (
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
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {expandedId === deployment.id && deployment.buildLog && (
                <div className="border-t border-border">
                  <ScrollArea className="max-h-64">
                    <pre className="p-4 text-xs font-mono text-foreground bg-background whitespace-pre-wrap">
                      {deployment.buildLog}
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

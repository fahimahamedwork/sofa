import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { DeployWizard } from '@/components/deploy/deploy-wizard';

export function DeployPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Deploy New Application</h1>
        <p className="text-sm text-zinc-400 mt-1">Create and deploy a new application</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Deployment Wizard</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <DeployWizard />
        </div>
      </Card>
    </div>
  );
}

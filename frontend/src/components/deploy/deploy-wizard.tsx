import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Rocket, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SourceSelector } from './source-selector';
import { useCreateApp } from '@/hooks/useApp';
import type { SourceType } from '@/types';
import { cn } from '@/lib/utils';

const steps = [
  { id: 1, label: 'Source' },
  { id: 2, label: 'Configure' },
  { id: 3, label: 'Review' },
];

export function DeployWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [appName, setAppName] = useState('');
  const [framework, setFramework] = useState('');
  const [buildCommand, setBuildCommand] = useState('');
  const [startCommand, setStartCommand] = useState('');
  const [port, setPort] = useState('3000');
  const createApp = useCreateApp();
  const navigate = useNavigate();

  const canNext = () => {
    if (currentStep === 1) return sourceType && sourceUrl;
    if (currentStep === 2) return appName;
    return true;
  };

  const handleDeploy = async () => {
    if (!sourceType || !appName) return;

    try {
      const result = await createApp.mutateAsync({
        name: appName,
        sourceType,
        sourceUrl,
        branch: sourceType === 'git' ? branch : undefined,
        framework: framework || undefined,
        buildCommand: buildCommand || undefined,
        startCommand: startCommand || undefined,
        port: port ? parseInt(port) : undefined,
      });
      navigate(`/apps/${result.slug}`);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                currentStep > step.id
                  ? 'bg-emerald-600 text-white'
                  : currentStep === step.id
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600'
                  : 'bg-zinc-800 text-zinc-500'
              )}
            >
              {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
            </div>
            <span className={cn(
              'text-sm font-medium hidden sm:inline',
              currentStep >= step.id ? 'text-zinc-200' : 'text-zinc-500'
            )}>
              {step.label}
            </span>
            {idx < steps.length - 1 && (
              <div className={cn(
                'w-8 h-px mx-1',
                currentStep > step.id ? 'bg-emerald-600' : 'bg-zinc-800'
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Choose source</h2>
                <p className="text-sm text-zinc-400 mt-1">Select where your application code lives</p>
              </div>
              <SourceSelector value={sourceType} onChange={setSourceType} />
              {sourceType && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
                      {sourceType === 'git' ? 'Repository URL' : sourceType === 'docker-image' ? 'Image URL' : 'Repository URL'}
                    </label>
                    <Input
                      placeholder={
                        sourceType === 'git' ? 'https://github.com/owner/repo' :
                        sourceType === 'docker-image' ? 'registry/image:tag' :
                        'https://github.com/owner/repo'
                      }
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                    />
                  </div>
                  {sourceType === 'git' && (
                    <div>
                      <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Branch</label>
                      <Input
                        placeholder="main"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Configure application</h2>
                <p className="text-sm text-zinc-400 mt-1">Set up your application settings</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Application Name</label>
                  <Input
                    placeholder="my-awesome-app"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Framework</label>
                  <Input
                    placeholder="next, react, node, etc."
                    value={framework}
                    onChange={(e) => setFramework(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Build Command</label>
                    <Input
                      placeholder="npm run build"
                      value={buildCommand}
                      onChange={(e) => setBuildCommand(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Start Command</label>
                    <Input
                      placeholder="npm start"
                      value={startCommand}
                      onChange={(e) => setStartCommand(e.target.value)}
                    />
                  </div>
                </div>
                <div className="w-32">
                  <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Port</label>
                  <Input
                    placeholder="3000"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Review & Deploy</h2>
                <p className="text-sm text-zinc-400 mt-1">Review your configuration before deploying</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Name</span>
                  <span className="text-zinc-200 font-medium">{appName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Source Type</span>
                  <span className="text-zinc-200 font-medium capitalize">{sourceType?.replace('-', ' ')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Source URL</span>
                  <span className="text-zinc-200 font-medium font-mono text-xs">{sourceUrl}</span>
                </div>
                {sourceType === 'git' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Branch</span>
                    <span className="text-zinc-200 font-medium">{branch}</span>
                  </div>
                )}
                {framework && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Framework</span>
                    <span className="text-zinc-200 font-medium">{framework}</span>
                  </div>
                )}
                {buildCommand && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Build Command</span>
                    <span className="text-zinc-200 font-mono text-xs">{buildCommand}</span>
                  </div>
                )}
                {startCommand && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Start Command</span>
                    <span className="text-zinc-200 font-mono text-xs">{startCommand}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Port</span>
                  <span className="text-zinc-200 font-medium">{port}</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        {currentStep < 3 ? (
          <Button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!canNext()}
          >
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleDeploy}
            disabled={createApp.isPending}
          >
            <Rocket className="h-4 w-4 mr-1" />
            {createApp.isPending ? 'Deploying...' : 'Deploy Now'}
          </Button>
        )}
      </div>
    </div>
  );
}

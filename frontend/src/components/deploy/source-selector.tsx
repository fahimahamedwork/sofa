import { GitBranch, Container, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SourceType } from '@/types';

const sourceTypes: { type: SourceType; label: string; description: string; icon: typeof GitBranch }[] = [
  {
    type: 'git',
    label: 'Git Repository',
    description: 'Deploy from a Git repository with automatic builds',
    icon: GitBranch,
  },
  {
    type: 'docker-image',
    label: 'Docker Image',
    description: 'Deploy a pre-built Docker image from a registry',
    icon: Container,
  },
  {
    type: 'dockerfile',
    label: 'Dockerfile',
    description: 'Build and deploy from a Dockerfile in your repo',
    icon: FileCode,
  },
];

interface SourceSelectorProps {
  value: SourceType | null;
  onChange: (type: SourceType) => void;
}

export function SourceSelector({ value, onChange }: SourceSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {sourceTypes.map((source) => {
        const isSelected = value === source.type;
        const Icon = source.icon;

        return (
          <button
            key={source.type}
            onClick={() => onChange(source.type)}
            className={cn(
              'relative flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition-all cursor-pointer',
              isSelected
                ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/50'
                : 'border-border bg-card hover:border-border hover:bg-card/80'
            )}
          >
            <div className={cn(
              'rounded-md p-2',
              isSelected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground'
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className={cn('font-medium text-sm', isSelected ? 'text-emerald-400' : 'text-foreground')}>
                {source.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{source.description}</p>
            </div>
            {isSelected && (
              <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-emerald-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}

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
                : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/80'
            )}
          >
            <div className={cn(
              'rounded-md p-2',
              isSelected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className={cn('font-medium text-sm', isSelected ? 'text-emerald-400' : 'text-zinc-200')}>
                {source.label}
              </p>
              <p className="text-xs text-zinc-500 mt-1">{source.description}</p>
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

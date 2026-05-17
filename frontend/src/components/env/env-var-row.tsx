import { useState } from 'react';
import { Eye, EyeOff, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EnvVar } from '@/types';

interface EnvVarRowProps {
  envVar: EnvVar;
  onUpdate?: (id: string, key: string, value: string) => void;
  onDelete?: (id: string) => void;
}

export function EnvVarRow({ envVar, onUpdate, onDelete }: EnvVarRowProps) {
  const [showValue, setShowValue] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editKey, setEditKey] = useState(envVar.key);
  const [editValue, setEditValue] = useState('');

  const handleSave = () => {
    if (editKey.trim() && onUpdate) {
      onUpdate(envVar.id, editKey, editValue);
      setEditing(false);
    }
  };

  const handleCancel = () => {
    setEditKey(envVar.key);
    setEditValue('');
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Input
          value={editKey}
          onChange={(e) => setEditKey(e.target.value)}
          className="h-8 text-xs font-mono flex-1"
          placeholder="KEY"
        />
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="h-8 text-xs font-mono flex-1"
          type="password"
          placeholder="NEW VALUE"
        />
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleSave}>
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleCancel}>
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-2 group">
      <span className="text-sm font-mono text-foreground flex-1 min-w-0 truncate">{envVar.key}</span>
      <span className="text-sm font-mono text-muted-foreground flex-1 min-w-0 truncate">
        {'••••••••'}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete?.(envVar.id)}>
          <Trash2 className="h-3.5 w-3.5 text-red-400" />
        </Button>
      </div>
    </div>
  );
}

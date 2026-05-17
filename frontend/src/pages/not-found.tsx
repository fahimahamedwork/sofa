import { Link } from 'react-router-dom';
import { Sofa, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      <div className="relative z-10 text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-xl bg-muted p-4">
            <Sofa className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <h1 className="text-6xl font-bold text-muted mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-2">Page Not Found</p>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link to="/">
          <Button>
            <Home className="h-4 w-4 mr-2" /> Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

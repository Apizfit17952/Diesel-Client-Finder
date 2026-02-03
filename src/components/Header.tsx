import { Fuel, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from './NotificationCenter';
import { DieselClient } from '@/data/malaysiaClients';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  newLeads: DieselClient[];
  onViewClient: (client: DieselClient) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function Header({ newLeads, onViewClient, onRefresh, isRefreshing }: HeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg gradient-primary p-2">
            <Fuel className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">DieselFinder</h1>
            <p className="text-xs text-muted-foreground">Malaysia Client Search</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user.email}
            </span>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </Button>
          
          <NotificationCenter newLeads={newLeads} onViewClient={onViewClient} />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

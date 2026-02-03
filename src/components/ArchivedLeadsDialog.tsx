import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Archive, RotateCcw, Trash2, Loader2, Building2, Fuel } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ArchivedLead {
  id: string;
  company_name: string;
  state: string;
  industry: string;
  estimated_usage: number;
  archived_at: string;
}

interface ArchivedLeadsDialogProps {
  onLeadsRestored: () => void;
}

export function ArchivedLeadsDialog({ onLeadsRestored }: ArchivedLeadsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [archivedLeads, setArchivedLeads] = useState<ArchivedLead[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadArchivedLeads = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('diesel_clients')
        .select('id, company_name, state, industry, estimated_usage, archived_at')
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false });

      if (error) throw error;
      setArchivedLeads(data || []);
    } catch (error) {
      console.error('Failed to load archived leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadArchivedLeads();
      setSelectedIds(new Set());
    }
  }, [open, user]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === archivedLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(archivedLeads.map(l => l.id)));
    }
  };

  const handleRestore = async () => {
    if (selectedIds.size === 0) return;

    setIsRestoring(true);
    try {
      const { error } = await supabase
        .from('diesel_clients')
        .update({ archived_at: null })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: 'Leads Restored',
        description: `${selectedIds.size} lead(s) have been restored.`,
      });

      setArchivedLeads(prev => prev.filter(l => !selectedIds.has(l.id)));
      setSelectedIds(new Set());
      onLeadsRestored();
    } catch (error) {
      console.error('Restore error:', error);
      toast({
        title: 'Restore Failed',
        description: 'Could not restore leads. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('diesel_clients')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: 'Leads Permanently Deleted',
        description: `${selectedIds.size} lead(s) have been permanently removed.`,
      });

      setArchivedLeads(prev => prev.filter(l => !selectedIds.has(l.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete Failed',
        description: 'Could not delete leads. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatUsage = (liters: number) => {
    return new Intl.NumberFormat('en-MY').format(liters);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Archive className="h-4 w-4" />
          Archive
          {archivedLeads.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {archivedLeads.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archived Leads
          </DialogTitle>
          <DialogDescription>
            View and restore archived leads. Permanently delete leads you no longer need.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : archivedLeads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Archive className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No archived leads</p>
          </div>
        ) : (
          <>
            {/* Action Bar */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === archivedLeads.length}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} of {archivedLeads.length} selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRestore}
                  disabled={selectedIds.size === 0 || isRestoring}
                  className="gap-2"
                >
                  {isRestoring ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Restore
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handlePermanentDelete}
                  disabled={selectedIds.size === 0 || isDeleting}
                  className="gap-2"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete Forever
                </Button>
              </div>
            </div>

            {/* Archived Leads List */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {archivedLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                      selectedIds.has(lead.id)
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-muted/30 border-border hover:bg-muted/50'
                    )}
                  >
                    <Checkbox
                      checked={selectedIds.has(lead.id)}
                      onCheckedChange={() => toggleSelection(lead.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium truncate">{lead.company_name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{lead.state}</span>
                        <span>•</span>
                        <span>{lead.industry || 'Unknown'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Fuel className="h-3 w-3" />
                          {formatUsage(lead.estimated_usage)} L/mo
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Archived {formatDate(lead.archived_at)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

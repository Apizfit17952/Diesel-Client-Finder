import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Fuel,
  ArrowUpDown,
  Eye,
  Trash2,
  Archive,
  Loader2,
} from 'lucide-react';
import { DieselClient, MIN_ORDER_LITERS } from '@/data/malaysiaClients';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClientTableProps {
  clients: DieselClient[];
  onViewClient: (client: DieselClient) => void;
  onClientDeleted?: () => void;
}

type SortField = 'companyName' | 'estimatedUsage' | 'state' | 'lastUpdated';
type SortOrder = 'asc' | 'desc';

const statusStyles = {
  active: 'bg-success/10 text-success border-success/30',
  potential: 'bg-info/10 text-info border-info/30',
  new: 'bg-accent/10 text-accent border-accent/30 animate-pulse-glow',
};

const priorityStyles = {
  high: 'bg-destructive/10 text-destructive border-destructive/30',
  medium: 'bg-warning/10 text-warning border-warning/30',
  low: 'bg-muted text-muted-foreground border-muted',
};

export function ClientTable({ clients, onViewClient, onClientDeleted }: ClientTableProps) {
  const { toast } = useToast();
  const [sortField, setSortField] = useState<SortField>('estimatedUsage');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<DieselClient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkArchiveDialogOpen, setBulkArchiveDialogOpen] = useState(false);
  const [isBulkArchiving, setIsBulkArchiving] = useState(false);

  const handleDeleteClick = (client: DieselClient) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

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

  const toggleSelectAll = () => {
    if (selectedIds.size === clients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(clients.map(c => c.id)));
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    
    setIsBulkArchiving(true);
    try {
      const { error } = await supabase
        .from('diesel_clients')
        .update({ archived_at: new Date().toISOString() })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: 'Leads Archived',
        description: `${selectedIds.size} lead(s) moved to archive. They can be restored anytime.`,
      });

      setSelectedIds(new Set());
      onClientDeleted?.();
    } catch (error) {
      console.error('Bulk archive error:', error);
      toast({
        title: 'Archive Failed',
        description: 'Could not archive leads. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsBulkArchiving(false);
      setBulkArchiveDialogOpen(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!clientToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('diesel_clients')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', clientToDelete.id);

      if (error) throw error;

      toast({
        title: 'Lead Archived',
        description: `${clientToDelete.companyName} has been moved to archive.`,
      });

      onClientDeleted?.();
    } catch (error) {
      console.error('Archive error:', error);
      toast({
        title: 'Archive Failed',
        description: 'Could not archive the lead. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedClients = [...clients].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'companyName':
        comparison = a.companyName.localeCompare(b.companyName);
        break;
      case 'estimatedUsage':
        comparison = a.estimatedUsage - b.estimatedUsage;
        break;
      case 'state':
        comparison = a.state.localeCompare(b.state);
        break;
      case 'lastUpdated':
        comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const formatUsage = (liters: number) => {
    return new Intl.NumberFormat('en-MY').format(liters);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/5 border-b border-primary/20">
          <span className="text-sm font-medium">
            {selectedIds.size} lead(s) selected
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setBulkArchiveDialogOpen(true)}
              className="gap-2"
            >
              <Archive className="h-4 w-4" />
              Archive Selected
            </Button>
          </div>
        </div>
      )}
      
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-12">
              <Checkbox
                checked={clients.length > 0 && selectedIds.size === clients.length}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead className="font-semibold">
              <button
                onClick={() => handleSort('companyName')}
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Building2 className="h-4 w-4" />
                Company
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </TableHead>
            <TableHead className="font-semibold">Industry</TableHead>
            <TableHead className="font-semibold">
              <button
                onClick={() => handleSort('state')}
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <MapPin className="h-4 w-4" />
                Location
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </TableHead>
            <TableHead className="font-semibold text-right">
              <button
                onClick={() => handleSort('estimatedUsage')}
                className="flex items-center gap-1 hover:text-primary transition-colors ml-auto"
              >
                <Fuel className="h-4 w-4" />
                Est. Usage (L/month)
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Priority</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedClients.map((client, index) => (
            <TableRow
              key={client.id}
              className={cn(
                'transition-all duration-200 hover:bg-muted/50',
                client.status === 'new' && 'bg-accent/5',
                selectedIds.has(client.id) && 'bg-primary/5',
                index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
              )}
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(client.id)}
                  onCheckedChange={() => toggleSelection(client.id)}
                />
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{client.companyName}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {client.contactPhone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {client.contactEmail}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">{client.industry}</span>
              </TableCell>
              <TableCell>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{client.state}</p>
                  <p className="text-xs text-muted-foreground">{client.city}</p>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="space-y-0.5">
                  <p className={cn(
                    'font-bold tabular-nums',
                    client.estimatedUsage >= MIN_ORDER_LITERS ? 'text-success' : 'text-muted-foreground'
                  )}>
                    {formatUsage(client.estimatedUsage)}
                  </p>
                  {client.estimatedUsage >= MIN_ORDER_LITERS && (
                    <p className="text-xs text-success">✓ Qualified</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn('capitalize', statusStyles[client.status])}>
                  {client.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn('capitalize', priorityStyles[client.priority])}>
                  {client.priority}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewClient(client)}
                    className="hover:bg-primary/10 hover:text-primary"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteClick(client)}
                    className="hover:bg-warning/10 hover:text-warning"
                    title="Archive lead"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Move <strong>{clientToDelete?.companyName}</strong> to archive? 
              You can restore it later from the Archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmArchive}
              disabled={isDeleting}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Archiving...
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Lead
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Archive Confirmation Dialog */}
      <AlertDialog open={bulkArchiveDialogOpen} onOpenChange={setBulkArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {selectedIds.size} Leads</AlertDialogTitle>
            <AlertDialogDescription>
              Move {selectedIds.size} selected lead(s) to archive? 
              You can restore them later from the Archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkArchive}
              disabled={isBulkArchiving}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {isBulkArchiving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Archiving...
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive All
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Sheet, Loader2, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';

interface SyncSheetsDialogProps {
  clients: any[];
}

export function SyncSheetsDialog({ clients }: SyncSheetsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [lastSyncResult, setLastSyncResult] = useState<'success' | 'error' | null>(null);
  const { syncToSheets, isSyncing } = useGoogleSheets();

  const handleSync = async () => {
    const trimmedId = spreadsheetId.trim();
    if (!trimmedId || !isValidSpreadsheetId(trimmedId)) return;
    
    const result = await syncToSheets(clients, trimmedId);
    setLastSyncResult(result.success ? 'success' : 'error');
    
    if (result.success) {
      setTimeout(() => setIsOpen(false), 1500);
    }
  };

  const isValidSpreadsheetId = (id: string): boolean => {
    // Google Spreadsheet IDs are typically 44 characters, alphanumeric with hyphens/underscores
    // Allow some flexibility (40-50 chars) to account for variations
    if (!id || id.length < 40 || id.length > 50) return false;
    return /^[a-zA-Z0-9-_]+$/.test(id);
  };

  const extractSpreadsheetId = (input: string): string => {
    // Handle full URL or just ID
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sheet className="h-4 w-4" />
          Sync to Google Sheets
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sheet className="h-5 w-5 text-primary" />
            Sync to Google Sheets
          </DialogTitle>
          <DialogDescription>
            Export your client data to a Google Spreadsheet for backup and analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="spreadsheet-id">Google Spreadsheet ID or URL</Label>
            <Input
              id="spreadsheet-id"
              placeholder="Paste spreadsheet URL or ID"
              value={spreadsheetId}
              onChange={(e) => {
                setSpreadsheetId(extractSpreadsheetId(e.target.value));
                setLastSyncResult(null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Create a new spreadsheet and share it with the service account email.
            </p>
          </div>

          <div className="rounded-lg bg-muted p-3 space-y-2">
            <p className="text-sm font-medium">Data to sync:</p>
            <p className="text-sm text-muted-foreground">
              {clients.length} clients will be exported with all details including contact info, 
              usage estimates, and status.
            </p>
          </div>

          {lastSyncResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              lastSyncResult === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'
            }`}>
              {lastSyncResult === 'success' ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Data synced successfully!</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">Sync failed. Check configuration.</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="ghost" size="sm" asChild>
            <a
              href="https://sheets.new"
              target="_blank"
              rel="noopener noreferrer"
              className="gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Create New Sheet
            </a>
          </Button>
          
          <Button 
            onClick={handleSync} 
            disabled={!spreadsheetId.trim() || isSyncing}
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Syncing...
              </>
            ) : (
              'Sync Now'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

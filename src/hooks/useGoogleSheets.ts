import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncResult {
  success: boolean;
  updatedCells?: number;
  rowsWritten?: number;
  error?: string;
}

export function useGoogleSheets() {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const syncToSheets = async (clients: any[], spreadsheetId: string): Promise<SyncResult> => {
    setIsSyncing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-sheets', {
        body: {
          action: 'sync',
          clients,
          spreadsheetId,
        },
      });

      if (error) {
        toast({
          title: 'Sync Failed',
          description: error.message,
          variant: 'destructive',
        });
        return { success: false, error: error.message };
      }

      if (data.error) {
        toast({
          title: 'Sync Failed',
          description: data.error,
          variant: 'destructive',
        });
        return { success: false, error: data.error };
      }

      toast({
        title: 'Sync Successful',
        description: `${data.rowsWritten} rows synced to Google Sheets`,
      });

      return { success: true, updatedCells: data.updatedCells, rowsWritten: data.rowsWritten };
    } catch (error: any) {
      toast({
        title: 'Sync Error',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setIsSyncing(false);
    }
  };

  return { syncToSheets, isSyncing };
}

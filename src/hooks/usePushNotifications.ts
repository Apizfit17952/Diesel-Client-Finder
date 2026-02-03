import { useState, useEffect, useCallback } from 'react';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.log('Push notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback(
    (options: NotificationOptions): Notification | null => {
      if (!isSupported || permission !== 'granted') {
        console.log('Cannot send notification - not supported or not permitted');
        return null;
      }

      try {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/favicon.ico',
          tag: options.tag,
          data: options.data,
          requireInteraction: options.requireInteraction || false,
        });

        // Auto-close after 10 seconds if not required interaction
        if (!options.requireInteraction) {
          setTimeout(() => notification.close(), 10000);
        }

        return notification;
      } catch (error) {
        console.error('Error sending notification:', error);
        return null;
      }
    },
    [isSupported, permission]
  );

  const notifyNewLead = useCallback(
    (lead: { companyName: string; industry: string; estimatedUsage: number; state: string }) => {
      return sendNotification({
        title: '🔔 New Diesel Lead Detected!',
        body: `${lead.companyName} (${lead.industry}) - Est. ${lead.estimatedUsage.toLocaleString()}L/month in ${lead.state}`,
        tag: `lead-${lead.companyName}`,
        requireInteraction: true,
        data: lead,
      });
    },
    [sendNotification]
  );

  const notifyActiveSearcher = useCallback(
    (lead: { companyName: string; searchIntent: string }) => {
      return sendNotification({
        title: '🚨 Active Diesel Buyer Detected!',
        body: `${lead.companyName} is actively searching: "${lead.searchIntent}"`,
        tag: `searcher-${lead.companyName}`,
        requireInteraction: true,
        data: lead,
      });
    },
    [sendNotification]
  );

  const notifyBulkLeads = useCallback(
    (count: number, region: string) => {
      return sendNotification({
        title: `📊 ${count} New Leads Found!`,
        body: `AI discovered ${count} qualified diesel clients in ${region}`,
        tag: 'bulk-leads',
        data: { count, region },
      });
    },
    [sendNotification]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    notifyNewLead,
    notifyActiveSearcher,
    notifyBulkLeads,
  };
}

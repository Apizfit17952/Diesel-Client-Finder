import { useState, useEffect } from 'react';
import { Bell, X, AlertCircle, CheckCircle, Fuel, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DieselClient } from '@/data/malaysiaClients';

interface Notification {
  id: string;
  type: 'new_lead' | 'high_usage' | 'update';
  title: string;
  message: string;
  client?: DieselClient;
  timestamp: Date;
  read: boolean;
}

interface NotificationCenterProps {
  newLeads: DieselClient[];
  onViewClient: (client: DieselClient) => void;
}

export function NotificationCenter({ newLeads, onViewClient }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Generate notifications from new leads
    const leadNotifications: Notification[] = newLeads.map((client) => ({
      id: `notif-${client.id}`,
      type: 'new_lead',
      title: 'New Diesel Client Available!',
      message: `${client.companyName} in ${client.city}, ${client.state} - Est. ${client.estimatedUsage.toLocaleString()}L/month`,
      client,
      timestamp: new Date(),
      read: false,
    }));
    setNotifications(leadNotifications);
  }, [newLeads]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleViewClient = (notification: Notification) => {
    if (notification.client) {
      markAsRead(notification.id);
      onViewClient(notification.client);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative',
          unreadCount > 0 && 'animate-pulse-glow'
        )}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-accent text-accent-foreground text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Notification Panel */}
          <div className="absolute right-0 top-full mt-2 w-96 max-h-[480px] overflow-hidden rounded-xl border border-border bg-card shadow-lg z-50 slide-in">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="bg-accent/10 text-accent">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[380px]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No notifications yet</p>
                  <p className="text-sm mt-1">New leads will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'p-4 hover:bg-muted/50 transition-colors cursor-pointer',
                        !notification.read && 'bg-accent/5 border-l-4 border-l-accent'
                      )}
                      onClick={() => handleViewClient(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'rounded-full p-2 mt-0.5',
                          notification.type === 'new_lead' && 'bg-accent/10 text-accent',
                          notification.type === 'high_usage' && 'bg-success/10 text-success',
                          notification.type === 'update' && 'bg-info/10 text-info'
                        )}>
                          {notification.type === 'new_lead' && <AlertCircle className="h-4 w-4" />}
                          {notification.type === 'high_usage' && <Fuel className="h-4 w-4" />}
                          {notification.type === 'update' && <CheckCircle className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          {notification.client && (
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                {notification.client.state}
                              </Badge>
                              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                                <Fuel className="h-3 w-3 mr-1" />
                                {notification.client.estimatedUsage.toLocaleString()}L
                              </Badge>
                            </div>
                          )}
                        </div>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-accent" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

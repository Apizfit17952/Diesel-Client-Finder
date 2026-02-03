import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Fuel,
  User,
  Calendar,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { DieselClient, MIN_ORDER_LITERS } from '@/data/malaysiaClients';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ClientDetailModalProps {
  client: DieselClient | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusStyles = {
  active: 'bg-success/10 text-success border-success/30',
  potential: 'bg-info/10 text-info border-info/30',
  new: 'bg-accent/10 text-accent border-accent/30',
};

const priorityStyles = {
  high: 'bg-destructive/10 text-destructive border-destructive/30',
  medium: 'bg-warning/10 text-warning border-warning/30',
  low: 'bg-muted text-muted-foreground border-muted',
};

export function ClientDetailModal({ client, isOpen, onClose }: ClientDetailModalProps) {
  const { toast } = useToast();

  if (!client) return null;

  const formatUsage = (liters: number) => {
    return new Intl.NumberFormat('en-MY').format(liters);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const openGoogleMaps = () => {
    const { lat, lng } = client.coordinates;
    const hasValidCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
    if (hasValidCoords) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
      return;
    }

    const query = encodeURIComponent(`${client.companyName} ${client.city} ${client.state} Malaysia`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{client.companyName}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{client.industry}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {/* Status & Priority */}
          <div className="col-span-2 flex items-center gap-3">
            <Badge variant="outline" className={cn('capitalize', statusStyles[client.status])}>
              {client.status}
            </Badge>
            <Badge variant="outline" className={cn('capitalize', priorityStyles[client.priority])}>
              {client.priority} priority
            </Badge>
            {client.estimatedUsage >= MIN_ORDER_LITERS && (
              <Badge className="bg-success text-success-foreground">
                ✓ Qualified Lead
              </Badge>
            )}
          </div>

          {/* Usage Card */}
          <div className="col-span-2 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/20 p-3">
                <Fuel className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Monthly Usage</p>
                <p className="text-3xl font-bold text-primary">
                  {formatUsage(client.estimatedUsage)} L
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Minimum order: {formatUsage(MIN_ORDER_LITERS)} L
                </p>
              </div>
            </div>
          </div>

          {/* Contact Person */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-primary" />
              Contact Person
            </div>
            <p className="font-medium">{client.contactPerson}</p>
          </div>

          {/* Location */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" />
              Location
            </div>
            <div>
              <p className="font-medium">{client.city}, {client.state}</p>
              <p className="text-sm text-muted-foreground">{client.region}</p>
            </div>
          </div>

          {/* Phone */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Phone className="h-4 w-4 text-primary" />
              Phone
            </div>
            <div className="flex items-center gap-2">
              <p className="font-medium font-mono">{client.contactPhone}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(client.contactPhone, 'Phone number')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Email */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-primary" />
              Email
            </div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{client.contactEmail}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => copyToClipboard(client.contactEmail, 'Email')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Last Updated */}
          <div className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Last updated: {new Date(client.lastUpdated).toLocaleDateString('en-MY', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>

          {/* Actions */}
          <div className="col-span-2 flex gap-3 mt-4 pt-4 border-t border-border">
            <Button className="flex-1 gradient-primary" onClick={openGoogleMaps}>
              <MapPin className="h-4 w-4 mr-2" />
              View on Map
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open(`mailto:${client.contactEmail}`, '_blank')}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open(`tel:${client.contactPhone}`, '_blank')}
            >
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

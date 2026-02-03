import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { malaysiaStates } from '@/data/malaysiaClients';

interface RegionFilterProps {
  selectedRegion: string;
  selectedState: string;
  onRegionChange: (region: string) => void;
  onStateChange: (state: string) => void;
}

const regions = [
  { id: 'all', label: 'All Malaysia', icon: '🇲🇾' },
  { id: 'pantaiTimur', label: 'Pantai Timur', icon: '🌅', highlight: true },
  { id: 'pantaiBarat', label: 'Pantai Barat', icon: '🏙️' },
  { id: 'borneo', label: 'Borneo', icon: '🌴' },
];

export function RegionFilter({
  selectedRegion,
  selectedState,
  onRegionChange,
  onStateChange,
}: RegionFilterProps) {
  const getStatesForRegion = (regionId: string): string[] => {
    if (regionId === 'all') {
      return [
        ...malaysiaStates.pantaiTimur,
        ...malaysiaStates.pantaiBarat,
        ...malaysiaStates.borneo,
        ...malaysiaStates.federal,
      ];
    }
    return malaysiaStates[regionId as keyof typeof malaysiaStates] || [];
  };

  const states = getStatesForRegion(selectedRegion);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MapPin className="h-4 w-4 text-primary" />
        <span>Region Filter</span>
      </div>

      {/* Region Selection */}
      <div className="flex flex-wrap gap-2">
        {regions.map((region) => (
          <button
            key={region.id}
            onClick={() => {
              onRegionChange(region.id);
              onStateChange('all');
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              selectedRegion === region.id
                ? region.highlight
                  ? 'bg-accent text-accent-foreground shadow-md'
                  : 'bg-primary text-primary-foreground shadow-md'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
              region.highlight && selectedRegion !== region.id && 'ring-2 ring-accent/50'
            )}
          >
            <span>{region.icon}</span>
            <span>{region.label}</span>
            {region.highlight && selectedRegion !== region.id && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-accent/20 text-accent rounded-full">
                Priority
              </span>
            )}
          </button>
        ))}
      </div>

      {/* State Selection */}
      {states.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <button
            onClick={() => onStateChange('all')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
              selectedState === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            All States
          </button>
          {states.map((state) => (
            <button
              key={state}
              onClick={() => onStateChange(state)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                selectedState === state
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {state}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

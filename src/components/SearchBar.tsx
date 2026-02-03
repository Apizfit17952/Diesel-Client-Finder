import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { industries, MIN_ORDER_LITERS } from '@/data/malaysiaClients';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedIndustry: string;
  onIndustryChange: (industry: string) => void;
  minUsageFilter: boolean;
  onMinUsageFilterChange: (enabled: boolean) => void;
}

export function SearchBar({
  searchQuery,
  onSearchChange,
  selectedIndustry,
  onIndustryChange,
  minUsageFilter,
  onMinUsageFilterChange,
}: SearchBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const clearFilters = () => {
    onSearchChange('');
    onIndustryChange('all');
    onMinUsageFilterChange(false);
  };

  const hasActiveFilters = searchQuery || selectedIndustry !== 'all' || minUsageFilter;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies, contacts, cities..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-card border-border focus:ring-primary"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => onSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filter Toggle */}
        <Button
          variant={showFilters ? 'secondary' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'gap-2',
            hasActiveFilters && 'border-accent text-accent'
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="h-2 w-2 rounded-full bg-accent" />
          )}
        </Button>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border fade-in">
          {/* Industry Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Industry</label>
            <Select value={selectedIndustry} onValueChange={onIndustryChange}>
              <SelectTrigger className="w-[200px] bg-card">
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Minimum Usage Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Minimum Order</label>
            <Button
              variant={minUsageFilter ? 'default' : 'outline'}
              onClick={() => onMinUsageFilterChange(!minUsageFilter)}
              className={cn(
                'h-10',
                minUsageFilter && 'bg-success hover:bg-success/90'
              )}
            >
              ≥ {MIN_ORDER_LITERS.toLocaleString()} L
            </Button>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

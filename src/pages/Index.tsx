import { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/Header';
import { StatCard } from '@/components/StatCard';
import { RegionFilter } from '@/components/RegionFilter';
import { SearchBar } from '@/components/SearchBar';
import { ClientTable } from '@/components/ClientTable';
import { ClientDetailModal } from '@/components/ClientDetailModal';
import { SyncSheetsDialog } from '@/components/SyncSheetsDialog';
import { LeadDiscovery } from '@/components/LeadDiscovery';
import { LeadScoringDashboard } from '@/components/LeadScoringDashboard';
import { ArchivedLeadsDialog } from '@/components/ArchivedLeadsDialog';
import {
  sampleClients,
  DieselClient,
  MIN_ORDER_LITERS,
  getQualifiedClients,
  getNewLeads,
  getHighPriorityClients,
} from '@/data/malaysiaClients';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  Fuel,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Index() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [clients, setClients] = useState<DieselClient[]>(sampleClients);
  const [selectedClient, setSelectedClient] = useState<DieselClient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Filters
  const [selectedRegion, setSelectedRegion] = useState('pantaiTimur');
  const [selectedState, setSelectedState] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [minUsageFilter, setMinUsageFilter] = useState(true);

  // Map database row to DieselClient
  const mapRowToClient = (row: any): DieselClient => ({
    id: row.id,
    companyName: row.company_name,
    contactPerson: row.contact_person || '',
    contactPhone: row.phone || '',
    contactEmail: row.email || '',
    industry: row.industry || 'Other',
    state: row.state,
    region: row.region,
    city: row.address?.split(',')[0] || row.state,
    estimatedUsage: row.estimated_usage,
    priority: row.priority as 'high' | 'medium' | 'low',
    status: row.status === 'new' ? 'new' : row.status === 'active' ? 'active' : 'potential',
    lastUpdated: row.updated_at,
    coordinates: { lat: row.latitude ?? 0, lng: row.longitude ?? 0 },
  });

  // Map DieselClient to database row format
  const mapClientToRow = (client: DieselClient, userId: string) => ({
    user_id: userId,
    company_name: client.companyName,
    contact_person: client.contactPerson,
    phone: client.contactPhone,
    email: client.contactEmail,
    industry: client.industry,
    state: client.state,
    region: client.region,
    address: client.city,
    latitude: client.coordinates.lat,
    longitude: client.coordinates.lng,
    estimated_usage: client.estimatedUsage,
    priority: client.priority,
    status: client.status,
    notes: '',
  });

  // Load clients from database on mount
  useEffect(() => {
    if (!user) return;

    const loadClients = async () => {
      const { data, error } = await supabase
        .from('diesel_clients')
        .select('*')
        .is('archived_at', null)  // Only load non-archived leads
        .order('created_at', { ascending: false });

      if (error) {
        // Log generic message only - avoid exposing internal details
        return;
      }

      if (data && data.length > 0) {
        setClients(data.map(mapRowToClient));
        setDbInitialized(true);
      } else if (!dbInitialized) {
        // Seed sample data to database for first-time users
        await seedSampleData();
      }
    };

    loadClients();
  }, [user]);

  const seedSampleData = async () => {
    if (!user) return;

    const clientsToInsert = sampleClients.map((client) => mapClientToRow(client, user.id));

    const { error } = await supabase.from('diesel_clients').insert(clientsToInsert);

    if (error && /column .*latitude|column .*longitude/i.test(error.message || '')) {
      const clientsToInsertWithoutCoords = clientsToInsert.map((c: any) => {
        const { latitude: _lat, longitude: _lng, ...rest } = c;
        return rest;
      });
      const { error: retryError } = await supabase.from('diesel_clients').insert(clientsToInsertWithoutCoords);
      if (!retryError) {
        setDbInitialized(true);
        return;
      }
    }

    if (error) {
      // Silently handle error - avoid exposing internal details
    } else {
      setDbInitialized(true);
      toast({
        title: 'Sample Data Loaded',
        description: 'Initial client data has been added to your database.',
      });
    }
  };

  // Filter clients based on all criteria
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Region filter
      if (selectedRegion !== 'all') {
        const regionMap: Record<string, string> = {
          pantaiTimur: 'Pantai Timur',
          pantaiBarat: 'Pantai Barat',
          borneo: 'Borneo',
          // Handle direct region values
          'Pantai Timur': 'Pantai Timur',
          'Utara': 'Utara',
          'Tengah': 'Tengah',
          'Selatan': 'Selatan',
          'Borneo': 'Borneo',
        };
        if (client.region !== regionMap[selectedRegion]) return false;
      }

      // State filter
      if (selectedState !== 'all' && client.state !== selectedState) return false;

      // Industry filter
      if (selectedIndustry !== 'all' && client.industry !== selectedIndustry) return false;

      // Minimum usage filter
      if (minUsageFilter && client.estimatedUsage < MIN_ORDER_LITERS) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          client.companyName.toLowerCase().includes(query) ||
          client.contactPerson.toLowerCase().includes(query) ||
          client.city.toLowerCase().includes(query) ||
          client.industry.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [clients, selectedRegion, selectedState, searchQuery, selectedIndustry, minUsageFilter]);

  // Prepare data for Google Sheets sync (database format)
  const clientsForSync = useMemo(() => {
    return filteredClients.map((client) => ({
      id: client.id,
      company_name: client.companyName,
      contact_person: client.contactPerson,
      phone: client.contactPhone,
      email: client.contactEmail,
      industry: client.industry,
      state: client.state,
      region: client.region,
      address: client.city,
      estimated_usage: client.estimatedUsage,
      priority: client.priority,
      status: client.status,
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: client.lastUpdated,
    }));
  }, [filteredClients]);

  // Statistics
  const stats = useMemo(() => {
    const qualified = getQualifiedClients(filteredClients);
    const newLeads = getNewLeads(filteredClients);
    const highPriority = getHighPriorityClients(filteredClients);
    const totalUsage = filteredClients.reduce((sum, c) => sum + c.estimatedUsage, 0);

    return {
      totalClients: filteredClients.length,
      qualifiedClients: qualified.length,
      newLeads: newLeads.length,
      highPriority: highPriority.length,
      totalUsage,
    };
  }, [filteredClients]);

  const newLeads = useMemo(() => getNewLeads(clients), [clients]);

  const handleViewClient = (client: DieselClient) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Reload from database
    if (user) {
      const { data, error } = await supabase
        .from('diesel_clients')
        .select('*')
        .is('archived_at', null)  // Only load non-archived leads
        .order('created_at', { ascending: false });

      if (!error && data) {
        setClients(data.map(mapRowToClient));
      }
    }

    // Trigger refresh for LeadScoringDashboard
    setRefreshCounter(prev => prev + 1);

    setIsRefreshing(false);
    toast({
      title: 'Data Refreshed',
      description: 'Client data has been updated from the database.',
    });
  };

  // Show notification toast for new leads on mount
  useEffect(() => {
    if (newLeads.length > 0) {
      toast({
        title: `🔔 ${newLeads.length} New Leads Available!`,
        description: 'New diesel clients detected in Pantai Timur region.',
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header
        newLeads={newLeads}
        onViewClient={handleViewClient}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="container py-8 space-y-8">
        {/* Hero Section */}
        <div className="rounded-2xl gradient-dark p-8 text-primary-foreground">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold mb-3">
                Diesel Client Discovery
              </h2>
              <p className="text-primary-foreground/80 text-lg">
                Automatically find and connect with potential diesel clients across Malaysia.
                Focused on <span className="text-accent font-semibold">Pantai Timur</span> region
                with minimum order of <span className="text-accent font-semibold">{MIN_ORDER_LITERS.toLocaleString()} liters</span>.
              </p>
            </div>
            <div className="flex-shrink-0">
              <SyncSheetsDialog clients={clientsForSync} />
            </div>
          </div>
        </div>

        {/* Auto Lead Discovery */}
        <LeadDiscovery onLeadsImported={handleRefresh} />

        {/* Lead Scoring Dashboard */}
        <LeadScoringDashboard refreshTrigger={refreshCounter} />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Clients"
            value={stats.totalClients}
            subtitle="Matching current filters"
            icon={Users}
          />
          <StatCard
            title="Qualified Leads"
            value={stats.qualifiedClients}
            subtitle={`≥ ${MIN_ORDER_LITERS.toLocaleString()}L/month`}
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title="New Leads"
            value={stats.newLeads}
            subtitle="Recently discovered"
            icon={AlertCircle}
            variant="accent"
          />
          <StatCard
            title="Total Est. Usage"
            value={`${(stats.totalUsage / 1000).toFixed(0)}K L`}
            subtitle="Monthly potential"
            icon={Fuel}
          />
        </div>

        {/* Filters Section */}
        <div className="space-y-6 p-6 rounded-xl bg-card border border-border">
          <RegionFilter
            selectedRegion={selectedRegion}
            selectedState={selectedState}
            onRegionChange={setSelectedRegion}
            onStateChange={setSelectedState}
          />
          
          <div className="border-t border-border pt-4">
            <SearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedIndustry={selectedIndustry}
              onIndustryChange={setSelectedIndustry}
              minUsageFilter={minUsageFilter}
              onMinUsageFilterChange={setMinUsageFilter}
            />
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">
                Client Results
              </h3>
              <span className="text-sm text-muted-foreground">
                ({filteredClients.length} clients found)
              </span>
            </div>
            <ArchivedLeadsDialog onLeadsRestored={handleRefresh} />
          </div>

          {filteredClients.length > 0 ? (
            <ClientTable clients={filteredClients} onViewClient={handleViewClient} onClientDeleted={handleRefresh} />
          ) : (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Fuel className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h4 className="text-lg font-medium text-foreground mb-2">No clients found</h4>
              <p className="text-muted-foreground">
                Try adjusting your filters to find more potential clients.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Client Detail Modal */}
      <ClientDetailModal
        client={selectedClient}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

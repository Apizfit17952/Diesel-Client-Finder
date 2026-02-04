import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Search, Loader2, MapPin, Plus, Fuel, Factory, Star, CheckCircle2, 
  AlertCircle, ExternalLink, Bell, BellRing, Sparkles, Brain, Target
} from 'lucide-react';
import { firecrawlApi } from '@/lib/api/firecrawl';
import { aiLeadDiscoveryApi } from '@/lib/api/aiLeadDiscovery';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface DiscoveredLead {
  id: string;
  companyName: string;
  industry: string;
  location: string;
  state: string;
  region: string;
  contactInfo: string;
  phone: string;
  email: string;
  address: string;
  latitude?: number;
  longitude?: number;
  sourceUrl: string;
  snippet: string;
  estimatedUsage: number;
  selected: boolean;
  qualityScore: number;
  qualityFactors: string[];
  verified: boolean;
  verifying: boolean;
  aiAnalyzed: boolean;
  searchIntent?: string;
  reasoning?: string;
}

// More targeted search queries for diesel-using businesses
const SEARCH_QUERIES = [
  // East Coast specific industrial queries
  'kilang kelapa sawit Terengganu diesel generator "Sdn Bhd"',
  'kontraktor pembinaan Kelantan diesel heavy machinery "Sdn Bhd"',
  'syarikat pengangkutan lori Pahang diesel fleet "Sdn Bhd"',
  'kilang pembuatan Kuantan industrial diesel "Berhad"',
  'ladang kelapa sawit Kemaman diesel supply',
  'syarikat perlombongan Pahang diesel fuel "Enterprise"',
  'pembinaan jalan raya Terengganu diesel machinery',
  'kilang petrokimia Kerteh diesel industrial',
  'pelabuhan Kuantan marine diesel bunker',
  'syarikat logging Kelantan diesel equipment',
  // Intent-based queries - people looking for diesel
  '"cari pembekal diesel" Malaysia',
  '"pembekal diesel" Terengganu Pahang Kelantan',
  '"diesel supply" palm oil mill Malaysia',
  '"bulk diesel" construction company Pantai Timur',
];

const REGIONS = [
  { value: 'all', label: 'All Regions' },
  { value: 'Pantai Timur', label: 'Pantai Timur (East Coast)' },
  { value: 'Utara', label: 'Utara (Northern)' },
  { value: 'Tengah', label: 'Tengah (Central)' },
  { value: 'Selatan', label: 'Selatan (Southern)' },
  { value: 'Sabah', label: 'Sabah' },
  { value: 'Sarawak', label: 'Sarawak' },
];

const normalizeCompanyKey = (name: string): string => {
  return (name || '')
    .toLowerCase()
    .replace(/\(m\)/g, ' malaysia ')
    .replace(/\b(sdn\.?\s*bhd\.?|sendirian\s+berhad|berhad|bhd\.?|enterprise|industries|industry|trading|resources|holdings|group|services|service|sdn)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const buildCompanyTokenKey = (name: string): string => {
  const tokens = normalizeCompanyKey(name)
    .split(' ')
    .map(t => t.trim())
    .filter(Boolean)
    .filter(t => t.length > 2)
    .sort();
  return tokens.join(' ');
};

interface LeadDiscoveryProps {
  onLeadsImported: () => void;
}

export function LeadDiscovery({ onLeadsImported }: LeadDiscoveryProps) {
  const { user } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [discoveredLeads, setDiscoveredLeads] = useState<DiscoveredLead[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('Pantai Timur');
  const [customQuery, setCustomQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [searchProgress, setSearchProgress] = useState({ current: 0, total: 0, phase: '' });
  const [useAI, setUseAI] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Push notifications
  const { 
    isSupported: notificationsSupported, 
    permission: notificationPermission,
    requestPermission,
    notifyNewLead,
    notifyActiveSearcher,
    notifyBulkLeads,
  } = usePushNotifications();

  // Request notification permission on mount
  useEffect(() => {
    if (notificationsSupported && notificationPermission === 'default') {
      // Will request on first search
    }
  }, [notificationsSupported, notificationPermission]);

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success('Push notifications enabled! You will be notified of new leads.');
    } else {
      toast.error('Notification permission denied. You can enable it in browser settings.');
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setDiscoveredLeads([]);
    
    // Request notification permission if not granted
    if (notificationsSupported && notificationPermission === 'default') {
      await requestPermission();
    }
    
    try {
      // First, fetch existing company names to prevent duplicates
      let existingCompanyNames: string[] = [];
      if (user) {
        const { data: existingClients } = await supabase
          .from('diesel_clients')
          .select('company_name')
          .eq('user_id', user.id)
          .is('archived_at', null);
        
        existingCompanyNames = (existingClients || []).map(c => c.company_name);
        console.log(`Found ${existingCompanyNames.length} existing clients to deduplicate`);
      }

      // Get randomized search queries to ensure variety
      const usedQueriesKey = `used_queries_${selectedRegion}`;
      const storedUsedQueries = JSON.parse(sessionStorage.getItem(usedQueriesKey) || '[]');
      
      const queries = customQuery 
        ? [customQuery]
        : await aiLeadDiscoveryApi.generateSearchQueries(selectedRegion, [], storedUsedQueries);
      
      // Store used queries in session to avoid repetition
      const newUsedQueries = [...storedUsedQueries, ...queries].slice(-30);
      sessionStorage.setItem(usedQueriesKey, JSON.stringify(newUsedQueries));
      
      console.log('Using search queries:', queries);
      setSearchProgress({ current: 0, total: queries.length, phase: 'Searching' });
      
      const allSearchResults: any[] = [];
      
      // Phase 1: Search using Firecrawl
      for (let i = 0; i < Math.min(queries.length, 6); i++) {
        const query = queries[i];
        setSearchProgress({ current: i + 1, total: Math.min(queries.length, 6), phase: 'Searching' });
        
        console.log(`Searching query ${i + 1}:`, query);
        
        const response = await firecrawlApi.search(query, {
          limit: 15,
          lang: 'ms',
          country: 'MY',
          scrapeOptions: { formats: ['markdown'] },
        });
        
        console.log(`Search response for query ${i + 1}:`, response);
        
        if (response.success && response.data) {
          // Handle Firecrawl response format - data is nested
          const results = Array.isArray(response.data) ? response.data : 
                         (response.data.data && Array.isArray(response.data.data)) ? response.data.data : [];
          console.log(`Found ${results.length} results for query ${i + 1}`);
          allSearchResults.push(...results);
        } else if (response.error) {
          console.warn(`Search query ${i + 1} failed:`, response.error);
        }
        
        // Delay between requests
        if (i < queries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`Total search results collected: ${allSearchResults.length}`);

      if (allSearchResults.length === 0) {
        toast.warning('No results found. Try a different search query or region.');
        setIsSearching(false);
        return;
      }

      // Phase 2: AI Analysis (if enabled)
      let finalLeads: DiscoveredLead[] = [];
      
      if (useAI) {
        setSearchProgress({ current: 0, total: 1, phase: 'AI Analyzing' });
        setIsAnalyzing(true);
        
        console.log('Starting AI analysis with', allSearchResults.length, 'results');
        
        const aiResponse = await aiLeadDiscoveryApi.analyzeLeads(
          allSearchResults,
          selectedRegion,
          5460,
          existingCompanyNames
        );
        
        setIsAnalyzing(false);
        
        console.log('AI Response:', aiResponse);
        
        if (aiResponse.success && aiResponse.data) {
          const { leads, summary, totalQualified, activeSearchers } = aiResponse.data;
          
          console.log(`AI found ${leads?.length || 0} leads`);
          
          // Convert AI leads to our format
          finalLeads = classifyAndFilterLeads((leads || []).map((lead, index) => ({
            id: `ai-lead-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            companyName: lead.companyName,
            industry: lead.industry,
            location: lead.location || lead.state,
            state: lead.state,
            region: lead.region || selectedRegion,
            contactInfo: lead.contactInfo?.phone || lead.contactInfo?.email || 'To be verified',
            phone: lead.contactInfo?.phone || '',
            email: lead.contactInfo?.email || '',
            address: lead.contactInfo?.address || '',
            latitude: lead.latitude,
            longitude: lead.longitude,
            sourceUrl: '',
            snippet: lead.reasoning,
            estimatedUsage: lead.estimatedUsage,
            selected: false,
            qualityScore: lead.confidence,
            qualityFactors: lead.dieselNeedIndicators || [],
            verified: lead.googleMapsVerified || false,
            verifying: false,
            aiAnalyzed: true,
            searchIntent: lead.searchIntent,
            reasoning: lead.reasoning,
          })));
          
          // Send notifications for high-priority leads (without audio to avoid AbortError)
          if (notificationPermission === 'granted' && finalLeads.length > 0) {
            // Notify about bulk leads
            notifyBulkLeads(finalLeads.length, selectedRegion);
            
            // Notify about active searchers (high priority!)
            finalLeads
              .filter(l => l.searchIntent && l.searchIntent.length > 0)
              .slice(0, 2)
              .forEach((lead, i) => {
                setTimeout(() => {
                  notifyActiveSearcher({
                    companyName: lead.companyName,
                    searchIntent: lead.searchIntent || 'Looking for diesel supplier',
                  });
                }, 3000 + i * 2000);
              });
          }
          
          toast.success(
            `AI discovered ${totalQualified} qualified leads! ${activeSearchers ? `${activeSearchers} actively searching for diesel.` : ''}`
          );
        } else {
          // Fallback to basic parsing if AI fails
          console.warn('AI analysis failed, using basic parsing:', aiResponse.error);
          toast.warning(`AI analysis unavailable (${aiResponse.error}), using basic parsing...`);
          finalLeads = classifyAndFilterLeads(parseLeadsBasic(allSearchResults, existingCompanyNames));
        }
      } else {
        // Basic parsing without AI
        finalLeads = classifyAndFilterLeads(parseLeadsBasic(allSearchResults, existingCompanyNames));
      }
      
      // Sort by quality score
      finalLeads.sort((a, b) => b.qualityScore - a.qualityScore);
      
      setDiscoveredLeads(finalLeads);
      
      if (finalLeads.length === 0) {
        toast.info('No new qualified leads found. Try different search parameters or the leads may already be in your database.');
      }
      
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search for leads. Please try again.');
    } finally {
      setIsSearching(false);
      setIsAnalyzing(false);
      setSearchProgress({ current: 0, total: 0, phase: '' });
    }
  };

  // Filter and classify leads by sector
  const classifyAndFilterLeads = (leads: DiscoveredLead[]): DiscoveredLead[] => {
    const sectors = [
      'factory', 'hotel', 'hospital', 'marine', 'plantation', 'upstream', 'downstream', 'contractor'
    ];
    return leads.filter(lead => {
      const isEndUser = sectors.some(sector => lead.industry.toLowerCase().includes(sector));
      const isSupplier = /supplier|reseller/i.test(lead.industry);
      return isEndUser && !isSupplier;
    }).map(lead => ({
      ...lead,
      industry: sectors.find(sector => lead.industry.toLowerCase().includes(sector)) || lead.industry
    }));
  };

  // Basic parsing fallback (without AI)
  const parseLeadsBasic = (results: any[], existingCompanyNames: string[] = []): DiscoveredLead[] => {
    const leads: DiscoveredLead[] = [];
    const seenCompanies = new Set<string>();
    const existingSet = new Set(existingCompanyNames.map(n => buildCompanyTokenKey(n)));
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const title = result.title || '';
      const description = result.description || '';
      const content = `${title} ${description}`.toLowerCase();
      
      // Basic quality check
      const hasBusinessIndicator = /sdn\.?\s*bhd|berhad|enterprise|industries/i.test(content);
      const hasDieselIndicator = /diesel|generator|genset|machinery|kilang|mill|fleet|truck|lori/i.test(content);
      
      if (!hasBusinessIndicator || !hasDieselIndicator) continue;
      
      // Extract company name
      const sdbMatch = title.match(/([A-Za-z0-9\s&'-]+(?:sdn\.?\s*bhd\.?|berhad|enterprise))/i);
      const companyName = sdbMatch?.[1]?.trim() || title.split(' - ')[0] || title;
      
      if (companyName.length < 5) continue;
      
      const normalizedName = buildCompanyTokenKey(companyName);
      
      // Check against existing companies
      if (existingSet.has(normalizedName)) continue;
      
      // Check against already seen in this batch
      if (seenCompanies.has(normalizedName)) continue;
      seenCompanies.add(normalizedName);
      
      leads.push({
        id: `lead-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        companyName: companyName.substring(0, 100),
        industry: detectIndustry(content),
        location: detectState(content),
        state: detectState(content),
        region: selectedRegion,
        contactInfo: 'To be verified',
        phone: extractPhone(content) || '',
        email: extractEmail(content) || '',
        address: '',
        sourceUrl: result.url || '',
        snippet: description.substring(0, 250),
        estimatedUsage: estimateUsage(content),
        selected: false,
        qualityScore: calculateBasicScore(result),
        qualityFactors: extractFactors(content),
        verified: false,
        verifying: false,
        aiAnalyzed: false,
      });
    }
    
    return leads.filter(l => l.estimatedUsage >= 5460 && l.qualityScore >= 40).slice(0, 20);
  };

  const detectIndustry = (content: string): string => {
    const industries: Record<string, string[]> = {
      'Palm Oil': ['sawit', 'palm', 'cpo', 'mill'],
      'Construction': ['pembinaan', 'construction', 'kontraktor'],
      'Manufacturing': ['kilang', 'manufacturing', 'factory'],
      'Transportation': ['pengangkutan', 'transport', 'lori', 'fleet'],
      'Mining': ['lombong', 'mining', 'quarry'],
      'Marine': ['marine', 'pelabuhan', 'port', 'bunker'],
    };
    
    for (const [ind, keywords] of Object.entries(industries)) {
      if (keywords.some(k => content.includes(k))) return ind;
    }
    return 'Industrial';
  };

  const detectState = (content: string): string => {
    const states: Record<string, string[]> = {
      'Terengganu': ['terengganu', 'kuala terengganu', 'kemaman', 'dungun', 'kerteh'],
      'Kelantan': ['kelantan', 'kota bharu', 'gua musang'],
      'Pahang': ['pahang', 'kuantan', 'temerloh', 'gebeng'],
    };
    
    for (const [state, patterns] of Object.entries(states)) {
      if (patterns.some(p => content.includes(p))) return state;
    }
    return 'Malaysia';
  };

  const extractPhone = (content: string): string | null => {
    const match = content.match(/(\+?6?0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4})/);
    return match?.[0] || null;
  };

  const extractEmail = (content: string): string | null => {
    const match = content.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
    return match?.[0]?.toLowerCase() || null;
  };

  const estimateUsage = (content: string): number => {
    if (/sawit|palm|mill/i.test(content)) return 18000;
    if (/mining|lombong/i.test(content)) return 22000;
    if (/marine|bunker/i.test(content)) return 20000;
    if (/kilang|factory/i.test(content)) return 15000;
    if (/pembinaan|construction/i.test(content)) return 12000;
    if (/transport|fleet/i.test(content)) return 10000;
    return 7000;
  };

  const calculateBasicScore = (result: any): number => {
    const content = `${result.title || ''} ${result.description || ''}`.toLowerCase();
    let score = 30;
    
    if (/sdn\.?\s*bhd|berhad/i.test(content)) score += 25;
    if (/diesel|generator|genset/i.test(content)) score += 20;
    if (/(\+?6?0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4})/.test(content)) score += 15;
    if (/@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+/.test(content)) score += 10;
    
    return Math.min(score, 100);
  };

  const extractFactors = (content: string): string[] => {
    const factors: string[] = [];
    if (/sdn\.?\s*bhd|berhad/i.test(content)) factors.push('Registered business');
    if (/diesel/i.test(content)) factors.push('Diesel mentioned');
    if (/generator|genset/i.test(content)) factors.push('Generator usage');
    if (/kilang|factory/i.test(content)) factors.push('Industrial facility');
    return factors;
  };

  const toggleLeadSelection = (leadId: string) => {
    setDiscoveredLeads(prev => 
      prev.map(lead => 
        lead.id === leadId ? { ...lead, selected: !lead.selected } : lead
      )
    );
  };

  const selectAllLeads = () => {
    const allSelected = discoveredLeads.every(l => l.selected);
    setDiscoveredLeads(prev => prev.map(lead => ({ ...lead, selected: !allSelected })));
  };

  const handleImportSelected = async () => {
    const selectedLeads = discoveredLeads.filter(l => l.selected);
    if (selectedLeads.length === 0) {
      toast.warning('Please select at least one lead to import');
      return;
    }

    if (!user) {
      toast.error('Please sign in to import leads');
      return;
    }

    setIsImporting(true);

    const existingKeySet = new Set<string>();
    try {
      const { data: existingClients } = await supabase
        .from('diesel_clients')
        .select('company_name, state')
        .eq('user_id', user.id)
        .is('archived_at', null);

      (existingClients || []).forEach((c: any) => {
        const key = `${buildCompanyTokenKey(c.company_name)}|${String(c.state || '').toLowerCase().trim()}`;
        existingKeySet.add(key);
      });
    } catch {
      // Ignore fetch errors; import will still rely on DB constraint
    }

    let successCount = 0;
    let duplicateCount = 0;
    const importedIds: string[] = [];

    try {
      for (const lead of selectedLeads) {
        const dedupeKey = `${buildCompanyTokenKey(lead.companyName)}|${String(lead.state || '').toLowerCase().trim()}`;
        if (existingKeySet.has(dedupeKey)) {
          duplicateCount++;
          continue;
        }

        const clientToInsert = {
          user_id: user.id,
          company_name: lead.companyName,
          contact_person: 'To be contacted',
          phone: lead.phone || '',
          email: lead.email || '',
          address: lead.address || '',
          state: lead.state,
          region: lead.region,
          industry: lead.industry,
          estimated_usage: lead.estimatedUsage,
          status: 'new' as const,
          priority: lead.qualityScore >= 70 ? 'high' as const : lead.qualityScore >= 50 ? 'medium' as const : 'low' as const,
          notes: `${lead.aiAnalyzed ? '🤖 AI Analyzed\n' : ''}Quality Score: ${lead.qualityScore}/100\nFactors: ${lead.qualityFactors.join(', ')}${lead.searchIntent ? `\n\n🎯 Search Intent: ${lead.searchIntent}` : ''}${lead.reasoning ? `\n\nReasoning: ${lead.reasoning}` : ''}${lead.sourceUrl ? `\n\nSource: ${lead.sourceUrl}` : ''}\n\n${lead.snippet}`,
        };

        const insertPayload: any = { ...clientToInsert };
        if (typeof lead.latitude === 'number' && typeof lead.longitude === 'number') {
          insertPayload.latitude = lead.latitude;
          insertPayload.longitude = lead.longitude;
        }

        const { error } = await supabase
          .from('diesel_clients')
          .insert(insertPayload);

        if (error && /column .*latitude|column .*longitude/i.test(error.message || '')) {
          const { error: retryError } = await supabase
            .from('diesel_clients')
            .insert(clientToInsert);
          if (!retryError) {
            successCount++;
            importedIds.push(lead.id);
            existingKeySet.add(dedupeKey);
            continue;
          }
        }

        if (error) {
          if (error.code === '23505') {
            duplicateCount++;
            existingKeySet.add(dedupeKey);
          } else {
            console.error('Import error for lead:', lead.companyName, error);
          }
          continue;
        }

        successCount++;
        importedIds.push(lead.id);
        existingKeySet.add(dedupeKey);
      }
    } finally {
      setIsImporting(false);
    }

    if (successCount > 0 && duplicateCount > 0) {
      toast.success(`Imported ${successCount} new leads. ${duplicateCount} duplicate(s) skipped.`);
    } else if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} leads!`);
    } else if (duplicateCount > 0) {
      toast.warning(`All ${duplicateCount} selected leads already exist in your database.`);
    } else {
      toast.error('Failed to import leads. Please try again.');
    }

    if (importedIds.length > 0) {
      setDiscoveredLeads(prev => prev.filter(l => !importedIds.includes(l.id)));
      onLeadsImported();
    }
  };

  const getQualityBadge = (score: number, aiAnalyzed: boolean) => {
    if (score >= 70) return { label: aiAnalyzed ? 'AI Verified' : 'High Quality', variant: 'default' as const, icon: aiAnalyzed ? Brain : Star };
    if (score >= 50) return { label: 'Good Lead', variant: 'secondary' as const, icon: CheckCircle2 };
    return { label: 'Potential', variant: 'outline' as const, icon: AlertCircle };
  };

  const selectedCount = discoveredLeads.filter(l => l.selected).length;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Powered Lead Discovery
            </CardTitle>
            <CardDescription>
              Automatically find and analyze qualified diesel clients with AI verification
            </CardDescription>
          </div>
          
          {/* Notification Toggle */}
          {notificationsSupported && (
            <Button
              variant={notificationPermission === 'granted' ? 'outline' : 'secondary'}
              size="sm"
              onClick={handleEnableNotifications}
              className="gap-2"
            >
              {notificationPermission === 'granted' ? (
                <>
                  <BellRing className="h-4 w-4 text-green-500" />
                  Notifications On
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" />
                  Enable Alerts
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map(region => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              placeholder="Custom search query (optional)"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              className="flex-1"
            />
            
            <Button 
              onClick={handleSearch} 
              disabled={isSearching}
              className="gap-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {searchProgress.phase} ({searchProgress.current}/{searchProgress.total})
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Discover Leads
                </>
              )}
            </Button>
          </div>
          
          {/* AI Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="ai-mode" className="font-medium">AI-Powered Analysis</Label>
                <p className="text-xs text-muted-foreground">
                  Use AI to verify leads, estimate diesel usage, and detect buyer intent
                </p>
              </div>
            </div>
            <Switch
              id="ai-mode"
              checked={useAI}
              onCheckedChange={setUseAI}
            />
          </div>
        </div>

        {/* AI Analyzing Indicator */}
        {isAnalyzing && (
          <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div className="relative">
              <Brain className="h-6 w-6 text-primary animate-pulse" />
              <Sparkles className="h-3 w-3 text-primary absolute -top-1 -right-1" />
            </div>
            <div>
              <p className="font-medium">AI is analyzing search results...</p>
              <p className="text-sm text-muted-foreground">
                Identifying qualified diesel clients and detecting buyer intent
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {discoveredLeads.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={discoveredLeads.every(l => l.selected)}
                  onCheckedChange={selectAllLeads}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedCount} of {discoveredLeads.length} selected
                </span>
                {discoveredLeads.some(l => l.aiAnalyzed) && (
                  <Badge variant="outline" className="gap-1">
                    <Brain className="h-3 w-3" />
                    AI Verified
                  </Badge>
                )}
              </div>
              
              <Button
                onClick={handleImportSelected}
                disabled={selectedCount === 0 || isImporting}
                size="sm"
                className="gap-2"
              >
                {isImporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Import Selected
              </Button>
            </div>

            <div className="grid gap-3 max-h-[500px] overflow-y-auto">
              {discoveredLeads.map(lead => {
                const qualityBadge = getQualityBadge(lead.qualityScore, lead.aiAnalyzed);
                const QualityIcon = qualityBadge.icon;
                
                return (
                  <div
                    key={lead.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      lead.selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    } ${lead.searchIntent ? 'ring-2 ring-accent/50' : ''}`}
                    onClick={() => toggleLeadSelection(lead.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={lead.selected}
                        onCheckedChange={() => toggleLeadSelection(lead.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h4 className="font-semibold">{lead.companyName}</h4>
                          
                          <Badge variant={qualityBadge.variant} className="gap-1">
                            <QualityIcon className="h-3 w-3" />
                            {lead.qualityScore}%
                          </Badge>
                          
                          {lead.aiAnalyzed && (
                            <Badge variant="outline" className="gap-1 text-primary border-primary">
                              <Sparkles className="h-3 w-3" />
                              AI
                            </Badge>
                          )}
                          
                          {lead.searchIntent && (
                            <Badge className="gap-1 bg-accent text-accent-foreground">
                              <Target className="h-3 w-3" />
                              Active Buyer
                            </Badge>
                          )}
                        </div>
                        
                        {lead.searchIntent && (
                          <div className="mb-2 p-2 bg-accent/10 rounded text-sm">
                            <span className="font-medium">🎯 Buyer Intent: </span>
                            {lead.searchIntent}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground mb-2">
                          <Badge variant="secondary" className="text-xs">
                            <Factory className="h-3 w-3 mr-1" />
                            {lead.industry}
                          </Badge>
                          
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {lead.state}, {lead.region}
                          </span>
                          
                          <span className="flex items-center gap-1">
                            <Fuel className="h-3 w-3" />
                            ~{lead.estimatedUsage.toLocaleString()}L/month
                          </span>
                        </div>
                        
                        {/* Contact Details */}
                        <div className="flex flex-wrap gap-2 text-xs mb-2">
                          {lead.phone && (
                            <span className="bg-muted px-2 py-1 rounded">📞 {lead.phone}</span>
                          )}
                          {lead.email && (
                            <span className="bg-muted px-2 py-1 rounded">✉️ {lead.email}</span>
                          )}
                          {lead.address && (
                            <span className="bg-muted px-2 py-1 rounded">📍 {lead.address}</span>
                          )}
                        </div>
                        
                        {/* Quality Factors */}
                        <div className="flex flex-wrap gap-1 text-xs text-muted-foreground mb-2">
                          {lead.qualityFactors.slice(0, 4).map((factor, i) => (
                            <span key={i} className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                              ✓ {factor}
                            </span>
                          ))}
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {lead.snippet}
                        </p>
                        
                        {lead.sourceUrl && (
                          <a 
                            href={lead.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Source
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isSearching && !isAnalyzing && discoveredLeads.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="relative inline-block mb-3">
              <Fuel className="h-12 w-12 opacity-50" />
              <Brain className="h-6 w-6 absolute -bottom-1 -right-1 text-primary" />
            </div>
            <p>Click "Discover Leads" to find qualified diesel clients</p>
            <p className="text-sm mt-1">
              {useAI ? 'AI will analyze and verify each lead' : 'Basic search mode active'}
            </p>
            <p className="text-xs mt-2 text-muted-foreground/70">
              Only businesses with verified diesel needs (≥5,460L/month) will appear
            </p>
            {notificationPermission !== 'granted' && notificationsSupported && (
              <p className="text-xs mt-3 text-accent">
                💡 Enable notifications to get alerted when new leads are found
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

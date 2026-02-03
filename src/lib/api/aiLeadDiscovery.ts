import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  title?: string;
  description?: string;
  url?: string;
  markdown?: string;
}

interface AIAnalyzedLead {
  companyName: string;
  industry: string;
  location: string;
  state: string;
  region: string;
  latitude?: number;
  longitude?: number;
  estimatedUsage: number;
  confidence: number;
  dieselNeedIndicators: string[];
  contactInfo: {
    phone: string;
    email: string;
    address: string;
  };
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  searchIntent?: string;
  googleMapsVerified?: boolean;
}

interface AILeadDiscoveryResponse {
  success: boolean;
  data?: {
    leads: AIAnalyzedLead[];
    summary: string;
    totalQualified: number;
    activeSearchers?: number;
  };
  error?: string;
}

export const aiLeadDiscoveryApi = {
  analyzeLeads: async (
    searchResults: SearchResult[],
    region: string = 'Pantai Timur',
    minUsage: number = 5460,
    existingCompanyNames: string[] = []
  ): Promise<AILeadDiscoveryResponse> => {
    try {
      console.log(`AI Lead Discovery: Sending ${searchResults.length} results for analysis`);
      console.log(`Region: ${region}, Min Usage: ${minUsage}, Existing Companies: ${existingCompanyNames.length}`);
      
      const { data, error } = await supabase.functions.invoke('ai-lead-discovery', {
        body: {
          searchResults,
          region,
          minUsage,
          existingCompanies: existingCompanyNames,
        },
      });

      if (error) {
        console.error('AI Lead Discovery error:', error);
        return { success: false, error: error.message };
      }

      console.log('AI Lead Discovery response:', data);
      return data as AILeadDiscoveryResponse;
    } catch (error) {
      console.error('AI Lead Discovery API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // Generate smart search queries using AI - with variety to avoid duplicates
  generateSearchQueries: async (region: string, _industries: string[], usedQueries: string[] = []): Promise<string[]> => {
    // More diverse queries with timestamps to ensure variety
    const baseQueries: Record<string, string[]> = {
      'Pantai Timur': [
        'kilang kelapa sawit Terengganu "Sdn Bhd" diesel generator',
        'syarikat pembinaan Pahang excavator heavy machinery diesel',
        'kontraktor perlombongan Kelantan diesel fuel supply',
        'syarikat pengangkutan lori Kuantan fleet management diesel',
        'kilang pembuatan industri Kemaman genset backup power',
        'ladang sawit Dungun mill diesel consumption',
        'syarikat kayu Gua Musang logging diesel equipment',
        'pelabuhan Kuantan bunker marine diesel supply',
        'projek infrastruktur Terengganu diesel heavy machinery',
        '"pembekal diesel" Terengganu Kelantan Pahang bulk',
        'kilang petrokimia Kerteh diesel industrial fuel',
        'contractor marine vessel Terengganu diesel bunker',
        'palm oil mill Pahang diesel generator power',
        'construction company Kelantan heavy equipment fuel',
        'mining quarry Pahang diesel consumption tender',
        'logistics company Pantai Timur diesel fleet',
        'power plant Terengganu backup diesel generator',
        'factory manufacturing Kuantan industrial diesel',
      ],
      'Utara': [
        'kilang industri Penang manufacturing diesel generator',
        'syarikat pembinaan Perak heavy machinery diesel',
        'ladang sawit Kedah palm oil mill diesel',
        'logistik pengangkutan Butterworth fleet diesel',
        'power station Perak diesel generator backup',
        'port Penang marine bunker diesel supply',
      ],
      'Tengah': [
        'kilang Shah Alam industrial diesel consumption',
        'port Klang marine bunker diesel supply',
        'syarikat pembinaan Selangor heavy equipment diesel',
        'kilang Nilai manufacturing diesel generator',
        'logistics hub Selangor fleet diesel fuel',
        'factory industrial Klang diesel power backup',
      ],
      'Selatan': [
        'pelabuhan Johor Bahru bunker diesel marine',
        'kilang Pasir Gudang industrial diesel fuel',
        'ladang sawit Johor palm oil mill diesel',
        'syarikat pembinaan Melaka diesel machinery',
        'logistics port Johor diesel fleet management',
        'manufacturing factory Johor diesel generator',
      ],
    };

    const regionQueries = baseQueries[region] || baseQueries['Pantai Timur'];
    
    // Filter out already used queries and shuffle for variety
    const availableQueries = regionQueries.filter(q => !usedQueries.includes(q));
    
    // Shuffle the available queries
    const shuffled = [...availableQueries].sort(() => Math.random() - 0.5);
    
    // Return first 6 unique queries
    return shuffled.slice(0, 6);
  },

  // Get random query index to ensure variety
  getRandomQuerySet: (region: string): number => {
    return Math.floor(Math.random() * 3);
  },
};

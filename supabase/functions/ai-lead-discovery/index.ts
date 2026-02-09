import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("Origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

interface SearchResult {
  title?: string;
  description?: string;
  url?: string;
  markdown?: string;
}

interface AnalyzedLead {
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
  priority: "high" | "medium" | "low";
  searchIntent?: string;
  googleMapsVerified?: boolean;
}

// Malaysian states with their major cities/areas for location validation
const MALAYSIA_LOCATIONS: Record<string, string[]> = {
  'Terengganu': ['kuala terengganu', 'kemaman', 'dungun', 'kerteh', 'marang', 'besut', 'setiu', 'hulu terengganu'],
  'Kelantan': ['kota bharu', 'gua musang', 'tanah merah', 'machang', 'pasir mas', 'tumpat', 'bachok', 'kuala krai'],
  'Pahang': ['kuantan', 'temerloh', 'bentong', 'pekan', 'gebeng', 'jerantut', 'rompin', 'raub', 'cameron highlands'],
  'Johor': ['johor bahru', 'pasir gudang', 'iskandar', 'batu pahat', 'muar', 'segamat', 'kluang', 'pontian'],
  'Perak': ['ipoh', 'taiping', 'lumut', 'manjung', 'sitiawan', 'teluk intan', 'kampar'],
  'Selangor': ['shah alam', 'klang', 'petaling jaya', 'subang', 'puchong', 'rawang', 'sepang'],
  'Penang': ['georgetown', 'butterworth', 'bayan lepas', 'seberang perai', 'nibong tebal'],
  'Kedah': ['alor setar', 'sungai petani', 'kulim', 'langkawi', 'jitra'],
  'Sabah': ['kota kinabalu', 'sandakan', 'tawau', 'lahad datu', 'keningau'],
  'Sarawak': ['kuching', 'miri', 'sibu', 'bintulu', 'mukah'],
  'Negeri Sembilan': ['seremban', 'nilai', 'port dickson', 'senawang'],
  'Melaka': ['melaka', 'ayer keroh', 'alor gajah'],
  'Perlis': ['kangar', 'arau', 'padang besar'],
};

// Map states to regions
const STATE_TO_REGION: Record<string, string> = {
  'Terengganu': 'Pantai Timur',
  'Kelantan': 'Pantai Timur',
  'Pahang': 'Pantai Timur',
  'Perlis': 'Pantai Barat',
  'Kedah': 'Pantai Barat',
  'Pulau Pinang': 'Pantai Barat',
  'Perak': 'Pantai Barat',
  'Selangor': 'Pantai Barat',
  'Negeri Sembilan': 'Pantai Barat',
  'Melaka': 'Pantai Barat',
  'Johor': 'Pantai Barat',
  'Sabah': 'Borneo',
  'Sarawak': 'Borneo',
  'Kuala Lumpur': 'Federal',
  'Putrajaya': 'Federal',
  'Labuan': 'Federal',
};

function normalizeCompanyKey(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\(m\)/g, ' malaysia ')
    .replace(/\b(sdn\.?\s*bhd\.?|sendirian\s+berhad|berhad|bhd\.?|enterprise|industries|industry|trading|resources|holdings|group|services|service|sdn)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCompanyTokenKey(name: string): string {
  const tokens = normalizeCompanyKey(name)
    .split(' ')
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length > 2);

  tokens.sort();
  return tokens.join(' ');
}

type GeocodeResult = {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  state?: string;
  city?: string;
};

async function geocodeMalaysia(query: string, apiKey: string): Promise<GeocodeResult | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', query);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('region', 'my');
  url.searchParams.set('components', 'country:MY');

  const resp = await fetch(url.toString());
  const data = await resp.json();
  if (!data || data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
    return null;
  }

  const result = data.results[0];
  const location = result?.geometry?.location;
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return null;
  }

  const components: any[] = Array.isArray(result.address_components) ? result.address_components : [];
  const getComponent = (type: string) => components.find((c) => Array.isArray(c.types) && c.types.includes(type));
  const state = getComponent('administrative_area_level_1')?.long_name;
  const city = getComponent('locality')?.long_name || getComponent('administrative_area_level_2')?.long_name;

  return {
    latitude: location.lat,
    longitude: location.lng,
    formattedAddress: typeof result.formatted_address === 'string' ? result.formatted_address : undefined,
    state: typeof state === 'string' ? state : undefined,
    city: typeof city === 'string' ? city : undefined,
  };
}

function validateAndCorrectLocation(text: string, suggestedState: string): { state: string; region: string; city?: string } {
  const lowerText = text.toLowerCase();
  
  // First, try to find exact city/area matches
  for (const [state, cities] of Object.entries(MALAYSIA_LOCATIONS)) {
    for (const city of cities) {
      if (lowerText.includes(city)) {
        return {
          state,
          region: STATE_TO_REGION[state] || 'Malaysia',
          city: city.charAt(0).toUpperCase() + city.slice(1),
        };
      }
    }
  }
  
  // Check for state names directly
  for (const state of Object.keys(MALAYSIA_LOCATIONS)) {
    if (lowerText.includes(state.toLowerCase())) {
      return {
        state,
        region: STATE_TO_REGION[state] || 'Malaysia',
      };
    }
  }
  
  // Fallback to suggested state if valid
  if (suggestedState && STATE_TO_REGION[suggestedState]) {
    return {
      state: suggestedState,
      region: STATE_TO_REGION[suggestedState],
    };
  }
  
  return { state: 'Malaysia', region: 'Malaysia' };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchResults, region, minUsage, existingCompanies } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`AI Lead Discovery: Analyzing ${searchResults?.length || 0} results for region: ${region || 'all'}`);
    console.log(`Existing companies to exclude: ${existingCompanies?.length || 0}`);

    // Validate input
    if (!searchResults || !Array.isArray(searchResults) || searchResults.length === 0) {
      console.log("No search results provided, returning empty response");
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            leads: [],
            summary: "No search results to analyze. Please try different search queries.",
            totalQualified: 0,
            activeSearchers: 0,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out invalid results and prepare content for AI
    const validResults = searchResults.filter((r: SearchResult) => 
      r && (r.title || r.description || r.markdown)
    );

    if (validResults.length === 0) {
      console.log("No valid search results after filtering");
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            leads: [],
            summary: "Search results did not contain analyzable content.",
            totalQualified: 0,
            activeSearchers: 0,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a set of existing company keys for deduplication (fuzzy)
    const existingCompanySet = new Set(
      (existingCompanies || []).map((name: string) => buildCompanyTokenKey(name))
    );

    const systemPrompt = `You are an expert lead analyst specializing in identifying diesel fuel consumers in Malaysia.

Your task is to analyze web search results and identify REAL, HIGH-QUALITY business leads that need diesel fuel.

CRITICAL REQUIREMENTS:
1. Only identify REAL registered Malaysian businesses - must have "Sdn Bhd", "Berhad", "Enterprise", "Industries", or similar business registration
2. Extract the EXACT company name as registered (include Sdn Bhd, etc.)
3. VERIFY the location against known Malaysian states and cities
4. Focus on industries that consume large amounts of diesel:
   - Palm oil mills and plantations (18,000+ L/month)
   - Construction companies with heavy machinery (12,000+ L/month)
   - Mining and quarrying operations (22,000+ L/month)
   - Transportation/logistics fleets (10,000+ L/month)
   - Manufacturing factories with generators (15,000+ L/month)
   - Marine/port operations (20,000+ L/month)
   - Timber and logging companies (14,000+ L/month)
   - Oil & gas service companies (25,000+ L/month)

5. EXCLUDE:
   - Directory listings, news articles, job postings
   - Social media pages, blogs, forums
   - Government agencies (unless they have diesel needs)
   - Retail fuel stations
   - Companies without clear business registration

6. Malaysian Geographic Validation:
   - Pantai Timur states: Terengganu, Kelantan, Pahang
   - Utara states: Penang, Perak, Kedah, Perlis
   - Tengah states: Selangor, Kuala Lumpur, Negeri Sembilan
   - Selatan states: Johor, Melaka
   - East Malaysia: Sabah, Sarawak
   
7. VERIFY location by checking for city/area names:
   - Terengganu: Kuala Terengganu, Kemaman, Dungun, Kerteh, Marang
   - Kelantan: Kota Bharu, Gua Musang, Tanah Merah, Machang
   - Pahang: Kuantan, Temerloh, Pekan, Gebeng, Jerantut

8. Look for DIESEL NEED SIGNALS:
   - Generator/genset usage mentions
   - Heavy machinery operations
   - Fleet of trucks/lorries
   - Industrial processes requiring backup power
   - Construction project sites
   - Mining equipment operations

9. DETECT BUYER INTENT (HIGH PRIORITY):
   - Phrases like "cari diesel", "pembekal diesel", "diesel supplier"
   - Mentions of bulk diesel purchase or tender
   - Diesel delivery service requirements

IMPORTANT: Only return leads that are genuinely likely to need bulk diesel (≥5,460L/month).
Be conservative - quality over quantity. Each lead should be a real business you're confident exists.`;

    const existingList = (existingCompanies || []).length > 0
      ? `\n\nEXCLUDE these companies (already in database): ${(existingCompanies || []).slice(0, 50).join(', ')}`
      : '';

    const userPrompt = `Analyze these search results and identify qualified diesel leads for the ${region || 'Malaysia'} region.
Minimum estimated usage: ${minUsage || 5460} liters/month.
${existingList}

Search Results to Analyze:
${validResults.slice(0, 20).map((r: SearchResult, i: number) => 
  `[${i + 1}] Title: ${r.title || 'N/A'}
URL: ${r.url || 'N/A'}
Description: ${r.description || 'N/A'}
Content: ${(r.markdown || '').substring(0, 500)}
---`
).join('\n')}

For each VALID NEW lead, provide:
1. Exact company name (must include business registration type like Sdn Bhd)
2. Industry category
3. Verified location (state and city if found)
4. Estimated monthly diesel usage (based on industry standards)
5. Confidence score (0-100) - how certain you are this is a real diesel customer
6. List of diesel need indicators found in the content
7. Contact info if available (phone, email, address)
8. Your reasoning for qualification
9. Priority level (high/medium/low)
10. Any detected buyer intent (if actively looking for diesel)

Return ONLY leads with:
- Confidence >= 60
- Estimated usage >= ${minUsage || 5460}L
- Real registered business name
- Valid Malaysian location

Be strict and accurate. Do not fabricate or guess information.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_leads",
              description: "Return analyzed diesel leads with quality scores",
              parameters: {
                type: "object",
                properties: {
                  leads: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        companyName: { type: "string", description: "Exact registered company name" },
                        industry: { type: "string" },
                        location: { type: "string", description: "City or area name" },
                        state: { type: "string", description: "Malaysian state" },
                        region: { type: "string" },
                        estimatedUsage: { type: "number", description: "Monthly diesel usage in liters" },
                        confidence: { type: "number", description: "Confidence score 0-100" },
                        dieselNeedIndicators: { type: "array", items: { type: "string" } },
                        contactInfo: {
                          type: "object",
                          properties: {
                            phone: { type: "string" },
                            email: { type: "string" },
                            address: { type: "string" },
                          },
                        },
                        reasoning: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        searchIntent: { type: "string", description: "Detected buyer intent if any" },
                      },
                      required: ["companyName", "industry", "state", "estimatedUsage", "confidence", "dieselNeedIndicators", "reasoning", "priority"],
                    },
                  },
                  summary: { type: "string", description: "Brief summary of analysis results" },
                  totalQualified: { type: "number" },
                  activeSearchers: { type: "number", description: "Number of leads with buyer intent" },
                },
                required: ["leads", "summary", "totalQualified"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_leads" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ success: false, error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received successfully");

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No valid tool call response from AI");
      throw new Error("No valid response from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    const geocodeCache = new Map<string, GeocodeResult | null>();

    // Post-process leads: validate locations, deduplicate (fuzzy), and enhance with geocoding
    const processedLeads = (result.leads || [])
      .filter((lead: AnalyzedLead) => {
        const key = buildCompanyTokenKey(lead.companyName);
        if (existingCompanySet.has(key)) {
          console.log(`Filtered duplicate: ${lead.companyName}`);
          return false;
        }
        return true;
      })
      .map((lead: AnalyzedLead) => {
        const locationText = `${lead.companyName} ${lead.location || ''} ${lead.state || ''} ${lead.contactInfo?.address || ''}`;
        const validatedLocation = validateAndCorrectLocation(locationText, lead.state);

        return {
          ...lead,
          state: validatedLocation.state,
          region: validatedLocation.region,
          location: validatedLocation.city || lead.location || validatedLocation.state,
          googleMapsVerified: false,
        };
      });

    const geocodedLeads = await Promise.all(
      processedLeads.map(async (lead: AnalyzedLead) => {
        if (!googleMapsApiKey) return lead;

        const query = `${lead.companyName} ${lead.contactInfo?.address || ''} ${lead.location || ''} ${lead.state || ''} Malaysia`;
        if (!query.trim()) return lead;

        if (!geocodeCache.has(query)) {
          geocodeCache.set(query, await geocodeMalaysia(query, googleMapsApiKey));
        }
        const geo = geocodeCache.get(query);
        if (!geo) return lead;

        const state = geo.state && STATE_TO_REGION[geo.state] ? geo.state : lead.state;
        const regionFromState = STATE_TO_REGION[state] || lead.region;

        return {
          ...lead,
          latitude: geo.latitude,
          longitude: geo.longitude,
          state,
          region: regionFromState,
          location: geo.city || lead.location,
          contactInfo: {
            ...lead.contactInfo,
            address: geo.formattedAddress || lead.contactInfo?.address || '',
          },
          googleMapsVerified: true,
        };
      })
    );

    const regionFilteredLeads = geocodedLeads.filter((lead: AnalyzedLead) => {
      if (!region || region === 'all') return true;
      return lead.region === region || lead.state === region;
    });

    // Remove duplicates within the results
    const seenCompanies = new Set<string>();
    const uniqueLeads = regionFilteredLeads.filter((lead: AnalyzedLead) => {
      const normalized = buildCompanyTokenKey(lead.companyName);
      if (seenCompanies.has(normalized)) {
        return false;
      }
      seenCompanies.add(normalized);
      return true;
    });

    console.log(`AI analyzed: ${uniqueLeads.length} unique qualified leads, ${result.activeSearchers || 0} active searchers`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          leads: uniqueLeads,
          summary: result.summary || `Found ${uniqueLeads.length} qualified leads in ${region || 'Malaysia'}`,
          totalQualified: uniqueLeads.length,
          activeSearchers: result.activeSearchers || 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI Lead Discovery error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

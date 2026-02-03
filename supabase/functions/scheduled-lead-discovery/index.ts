import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Search queries for different diesel-using industries
const SEARCH_QUERIES = [
  "kilang sawit Malaysia diesel generator",
  "construction company Malaysia diesel fuel",
  "logistics trucking company Malaysia diesel",
  "plantation company Terengganu Kelantan Pahang diesel",
  "mining company Malaysia diesel equipment",
  "factory manufacturing Malaysia diesel backup generator",
  "shipping company Malaysia diesel fuel supplier",
  "quarry company Malaysia diesel machinery",
  "timber logging company Malaysia diesel",
  "agricultural farm Malaysia diesel tractor",
  "cold storage warehouse Malaysia diesel generator",
  "aquaculture fish farm Malaysia diesel pump",
  "oil palm mill Pantai Timur diesel",
  "rubber factory Malaysia diesel power",
  "cement factory Malaysia diesel truck fleet"
];

const MALAYSIA_STATES = [
  "Terengganu", "Kelantan", "Pahang", "Johor", "Selangor", 
  "Perak", "Kedah", "Penang", "Perlis", "Melaka",
  "Negeri Sembilan", "Sabah", "Sarawak"
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("scheduled-lead-discovery function called");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!firecrawlApiKey) {
      console.log("No FIRECRAWL_API_KEY configured");
      return new Response(
        JSON.stringify({ error: "Firecrawl API not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pick a random search query for variety
    const randomQuery = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
    console.log("Running search:", randomQuery);

    // Search using Firecrawl
    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: randomQuery,
        limit: 15,
        lang: "ms",
        country: "my",
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.log("Firecrawl search failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Search failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchData = await searchResponse.json();
    const results = searchData.data || [];
    console.log(`Found ${results.length} search results`);

    const leads: any[] = [];

    for (const result of results) {
      // Basic extraction from search result
      const title = result.title || "";
      const description = result.description || "";
      const content = result.markdown || result.content || "";
      const url = result.url || "";
      const fullText = `${title} ${description} ${content}`.toLowerCase();

      // Skip irrelevant results
      if (fullText.includes("directory") || fullText.includes("facebook.com") || 
          fullText.includes("instagram.com") || fullText.includes("linkedin.com")) {
        continue;
      }

      // Detect state
      let detectedState = "Unknown";
      for (const state of MALAYSIA_STATES) {
        if (fullText.includes(state.toLowerCase())) {
          detectedState = state;
          break;
        }
      }

      // Detect industry
      let industry = "General";
      const industries: Record<string, string[]> = {
        "Palm Oil": ["sawit", "palm oil", "kelapa sawit", "cpo"],
        "Construction": ["construction", "pembinaan", "building", "contractor"],
        "Logistics": ["logistics", "trucking", "transport", "pengangkutan"],
        "Manufacturing": ["factory", "kilang", "manufacturing", "pembuatan"],
        "Mining": ["mining", "quarry", "kuari", "perlombongan"],
        "Agriculture": ["farm", "pertanian", "ladang", "plantation"],
        "Fishing": ["aquaculture", "fish", "ikan", "perikanan"]
      };

      for (const [ind, keywords] of Object.entries(industries)) {
        if (keywords.some(k => fullText.includes(k))) {
          industry = ind;
          break;
        }
      }

      // Extract company name from title
      let companyName = title.split(/[-|–]/)[0].trim();
      if (companyName.length < 3 || companyName.length > 100) {
        companyName = title.slice(0, 80);
      }

      // Extract contact info
      const phoneMatch = fullText.match(/(?:0\d{1,2}[-\s]?\d{7,8}|01\d[-\s]?\d{7,8}|\+60\s?\d{1,2}[-\s]?\d{7,8})/);
      const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

      // Calculate quality score
      let qualityScore = 30;
      if (phoneMatch) qualityScore += 15;
      if (emailMatch) qualityScore += 15;
      if (industry !== "General") qualityScore += 15;
      if (detectedState !== "Unknown") qualityScore += 10;
      if (fullText.includes("diesel") || fullText.includes("generator")) qualityScore += 15;

      // Estimate usage based on industry
      const usageEstimates: Record<string, number> = {
        "Palm Oil": 25000,
        "Manufacturing": 15000,
        "Mining": 30000,
        "Construction": 12000,
        "Logistics": 20000,
        "Agriculture": 8000,
        "Fishing": 6000,
        "General": 5500
      };

      const estimatedUsage = usageEstimates[industry] || 5500;

      if (qualityScore >= 40 && estimatedUsage >= 5000) {
        leads.push({
          companyName,
          industry,
          state: detectedState,
          region: ["Terengganu", "Kelantan", "Pahang"].includes(detectedState) ? "Pantai Timur" : "Other",
          estimatedUsage,
          qualityScore,
          phone: phoneMatch ? phoneMatch[0] : null,
          email: emailMatch ? emailMatch[0] : null,
          sourceUrl: url,
          discoveredAt: new Date().toISOString()
        });
      }
    }

    console.log(`Qualified leads found: ${leads.length}`);

    // Use AI to enhance lead analysis if available
    if (lovableApiKey && leads.length > 0) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: "You are a diesel fuel sales analyst. Analyze leads and provide conversion predictions."
              },
              {
                role: "user",
                content: `Analyze these ${leads.length} diesel leads and rate their conversion likelihood from 1-10: ${JSON.stringify(leads.slice(0, 5))}`
              }
            ],
            max_tokens: 500
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          console.log("AI analysis completed");
        }
      } catch (aiError) {
        console.log("AI analysis skipped:", aiError);
      }
    }

    // Send email notification if high-priority leads found
    const highPriorityLeads = leads.filter(l => l.qualityScore >= 60);
    
    if (highPriorityLeads.length > 0) {
      try {
        const emailPayload = {
          leads: highPriorityLeads,
          recipientEmail: "hafizhashim6007@gmail.com",
          discoveryType: "Scheduled Auto-Discovery (Hourly)"
        };

        // Call the email function
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-lead-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`
          },
          body: JSON.stringify(emailPayload)
        });

        if (emailResponse.ok) {
          console.log("Email notification sent for", highPriorityLeads.length, "leads");
        } else {
          console.log("Email notification failed:", await emailResponse.text());
        }
      } catch (emailError) {
        console.log("Email notification error:", emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        query: randomQuery,
        leadsFound: leads.length,
        highPriorityLeads: highPriorityLeads.length,
        leads
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("scheduled-lead-discovery error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

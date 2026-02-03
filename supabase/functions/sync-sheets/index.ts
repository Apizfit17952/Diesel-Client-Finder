import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("Origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("sync-sheets function called");
    
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("No auth header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.log("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("User authenticated:", user.id);

    const { action, clients, spreadsheetId } = await req.json();
    console.log("Action:", action, "Spreadsheet ID:", spreadsheetId, "Clients count:", clients?.length);

    const serviceAccountKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!serviceAccountKey) {
      console.log("No service account key configured");
      return new Response(
        JSON.stringify({ error: "Google Sheets not configured. Please add GOOGLE_SERVICE_ACCOUNT_KEY secret." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountKey);
    } catch (e) {
      console.log("Failed to parse service account key");
      return new Response(
        JSON.stringify({ error: "Invalid GOOGLE_SERVICE_ACCOUNT_KEY format. Must be valid JSON." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create JWT for Google API authentication
    const header = { alg: "RS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const claimSet = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    };

    const encoder = new TextEncoder();
    const base64url = (data: Uint8Array | string) => {
      const str = typeof data === "string" ? data : String.fromCharCode(...data);
      return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    };

    const headerB64 = base64url(JSON.stringify(header));
    const claimB64 = base64url(JSON.stringify(claimSet));
    const signatureInput = `${headerB64}.${claimB64}`;

    // Import private key and sign
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = serviceAccount.private_key
      .replace(pemHeader, "")
      .replace(pemFooter, "")
      .replace(/\s/g, "");
    const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      encoder.encode(signatureInput)
    );

    const jwt = `${signatureInput}.${base64url(new Uint8Array(signature))}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      console.log("Failed to get Google access token:", tokenData);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with Google. Check service account configuration." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = tokenData.access_token;
    console.log("Got Google access token");

    if (action === "sync") {
      // Prepare data rows
      const headers = [
        "ID", "Company Name", "Contact Person", "Phone", "Email", 
        "Industry", "State", "Region", "Address", "Estimated Usage (L)", 
        "Priority", "Status", "Notes", "Created At", "Updated At"
      ];

      const rows = clients.map((client: any) => [
        client.id,
        client.company_name,
        client.contact_person || "",
        client.phone ? `'${client.phone}` : "",
        client.email || "",
        client.industry || "",
        client.state,
        client.region,
        client.address || "",
        client.estimated_usage,
        client.priority || "medium",
        client.status || "new",
        client.notes || "",
        client.created_at,
        client.updated_at,
      ]);

      const data = [headers, ...rows];

      // Clear existing data and write new data
      const clearResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1:clear`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!clearResponse.ok) {
        const errorText = await clearResponse.text();
        console.log("Failed to clear sheet:", errorText);
        return new Response(
          JSON.stringify({ error: "Failed to clear sheet. Ensure the spreadsheet is shared with the service account email." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:O${data.length}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: data }),
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.log("Failed to update sheet:", errorText);
        return new Response(
          JSON.stringify({ error: "Failed to update sheet. Check spreadsheet permissions." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await updateResponse.json();
      console.log("Sync successful:", result);
      return new Response(
        JSON.stringify({ success: true, updatedCells: result.updatedCells, rowsWritten: data.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("sync-sheets error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

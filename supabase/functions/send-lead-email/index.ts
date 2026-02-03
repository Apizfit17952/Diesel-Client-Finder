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

interface LeadEmailRequest {
  leads: {
    companyName: string;
    industry: string;
    state: string;
    estimatedUsage: number;
    qualityScore: number;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    qualityFactors?: string[];
  }[];
  recipientEmail: string;
  discoveryType: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("send-lead-email function called");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("No RESEND_API_KEY configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured. Please add RESEND_API_KEY secret." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendFrom = Deno.env.get("RESEND_FROM") || "Diesel Lead Discovery <onboarding@resend.dev>";
    if (!Deno.env.get("RESEND_FROM")) {
      console.log("RESEND_FROM not configured; using default resend.dev sender");
    }

    const { leads, recipientEmail, discoveryType }: LeadEmailRequest = await req.json();

    console.log(`Sending email to ${recipientEmail} for ${leads.length} leads`);

    const highPriorityLeads = leads.filter(l => l.qualityScore >= 70);
    const mediumPriorityLeads = leads.filter(l => l.qualityScore >= 50 && l.qualityScore < 70);

    const formatLead = (lead: LeadEmailRequest['leads'][0]) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; font-weight: 600;">${lead.companyName}</td>
        <td style="padding: 12px;">${lead.industry}</td>
        <td style="padding: 12px;">${lead.state}</td>
        <td style="padding: 12px;">${lead.estimatedUsage.toLocaleString()}L/month</td>
        <td style="padding: 12px;">
          <span style="background-color: ${lead.qualityScore >= 70 ? '#10b981' : lead.qualityScore >= 50 ? '#f59e0b' : '#6b7280'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
            ${lead.qualityScore}/100
          </span>
        </td>
        <td style="padding: 12px;">
          ${lead.contactPerson || 'N/A'}<br/>
          <small>${lead.phone || ''}</small><br/>
          <small>${lead.email || ''}</small>
        </td>
      </tr>
    `;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Diesel Leads Discovered</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🔔 New High-Priority Diesel Leads Discovered</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Discovery Type: ${discoveryType}</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="display: flex; gap: 20px; margin-bottom: 30px;">
              <div style="flex: 1; background: #dcfce7; padding: 20px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #166534;">${highPriorityLeads.length}</div>
                <div style="color: #166534; font-size: 14px;">High Priority</div>
              </div>
              <div style="flex: 1; background: #fef3c7; padding: 20px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #92400e;">${mediumPriorityLeads.length}</div>
                <div style="color: #92400e; font-size: 14px;">Medium Priority</div>
              </div>
              <div style="flex: 1; background: #e5e7eb; padding: 20px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #374151;">${leads.length}</div>
                <div style="color: #374151; font-size: 14px;">Total Leads</div>
              </div>
            </div>

            ${highPriorityLeads.length > 0 ? `
              <h2 style="color: #166534; border-bottom: 2px solid #dcfce7; padding-bottom: 10px;">🌟 High Priority Leads (Score 70+)</h2>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 12px; text-align: left;">Company</th>
                    <th style="padding: 12px; text-align: left;">Industry</th>
                    <th style="padding: 12px; text-align: left;">Location</th>
                    <th style="padding: 12px; text-align: left;">Est. Usage</th>
                    <th style="padding: 12px; text-align: left;">Score</th>
                    <th style="padding: 12px; text-align: left;">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  ${highPriorityLeads.map(formatLead).join('')}
                </tbody>
              </table>
            ` : ''}

            ${mediumPriorityLeads.length > 0 ? `
              <h2 style="color: #92400e; border-bottom: 2px solid #fef3c7; padding-bottom: 10px;">⚡ Medium Priority Leads (Score 50-69)</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 12px; text-align: left;">Company</th>
                    <th style="padding: 12px; text-align: left;">Industry</th>
                    <th style="padding: 12px; text-align: left;">Location</th>
                    <th style="padding: 12px; text-align: left;">Est. Usage</th>
                    <th style="padding: 12px; text-align: left;">Score</th>
                    <th style="padding: 12px; text-align: left;">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  ${mediumPriorityLeads.map(formatLead).join('')}
                </tbody>
              </table>
            ` : ''}

            <div style="margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <h3 style="margin: 0 0 10px 0; color: #1e40af;">💡 Quick Actions</h3>
              <ul style="margin: 0; padding-left: 20px; color: #374151;">
                <li>Review high-priority leads first for immediate outreach</li>
                <li>Verify contact information before reaching out</li>
                <li>Check estimated diesel usage against your inventory</li>
                <li>Schedule follow-ups within 24 hours for best conversion</li>
              </ul>
            </div>

            <p style="color: #6b7280; font-size: 12px; margin-top: 30px; text-align: center;">
              This email was sent automatically by your Diesel Lead Discovery System.<br/>
              Discovered at ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} (Malaysia Time)
            </p>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [recipientEmail],
        subject: `🔔 ${highPriorityLeads.length} High-Priority Diesel Leads Discovered!`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      return new Response(
        JSON.stringify({ error: emailResult.message || "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-lead-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

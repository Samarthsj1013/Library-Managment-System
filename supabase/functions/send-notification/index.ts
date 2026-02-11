import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const { to, studentName, bookTitle, status, adminNote } = await req.json();

    if (!to || !bookTitle || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, bookTitle, status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isApproved = status === 'approved';
    const subject = isApproved
      ? `✅ Book Request Approved: ${bookTitle}`
      : `❌ Book Request Rejected: ${bookTitle}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: ${isApproved ? '#16a34a' : '#dc2626'};">
          ${isApproved ? '✅ Request Approved' : '❌ Request Rejected'}
        </h2>
        <p>Hello ${studentName || 'Student'},</p>
        <p>Your request for <strong>"${bookTitle}"</strong> has been <strong>${status}</strong>.</p>
        ${isApproved
          ? '<p>The book has been issued to you. Please collect it from the library. You have <strong>14 days</strong> to return it.</p>'
          : `<p>Unfortunately, your request was not approved.${adminNote ? ` Reason: ${adminNote}` : ''}</p>`
        }
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Library Management System</p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Library <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error sending notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

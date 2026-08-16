import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAuthedUserId } from '../_shared/rate-limit-example.ts';
import { sendEmail, buildBugReportEmail } from '../_shared/email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BugReportRequest {
  description: string;
  context?: Record<string, unknown>;
}

///*** Persists the report (bug_reports table survives even if email
// delivery fails) and emails support via Resend, with reply-to set to the
// reporter so support can reply directly. ***///
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const callerId = await getAuthedUserId(req);
    if (!callerId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { description, context } = (await req.json()) as BugReportRequest;

    if (!description || !description.trim()) {
      return new Response(JSON.stringify({ error: 'description is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: insertError } = await supabase.from('bug_reports').insert({
      user_id: callerId,
      description,
      context: context ?? null,
    });

    if (insertError) {
      console.error('Failed to save bug report:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save bug report' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let email: unknown = null;
    const supportEmail = Deno.env.get('SUPPORT_EMAIL');
    if (supportEmail) {
      const [{ data: authUser }, { data: profile }] = await Promise.all([
        supabase.auth.admin.getUserById(callerId),
        supabase.from('profiles').select('username').eq('id', callerId).single(),
      ]);

      const reporterEmail = authUser?.user?.email;
      if (reporterEmail) {
        const { subject, html } = buildBugReportEmail(
          description,
          context,
          reporterEmail,
          profile?.username
        );
        email = await sendEmail(supportEmail, subject, html, { replyTo: reporterEmail });
      }
    }

    return new Response(JSON.stringify({ success: true, email }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending bug report:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

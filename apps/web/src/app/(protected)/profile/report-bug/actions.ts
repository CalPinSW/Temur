'use server';

import { createClient, getUser } from '@/lib/supabase/server';

export interface ReportBugState {
  error?: string;
  success?: boolean;
}

export async function submitBugReport(
  _prevState: ReportBugState,
  formData: FormData
): Promise<ReportBugState> {
  const user = await getUser();
  if (!user) return { error: 'You must be signed in.' };

  const description = String(formData.get('description') ?? '').trim();
  if (!description) {
    return { error: 'Please describe what happened.' };
  }

  const contextRaw = String(formData.get('context') ?? '{}');
  let context: Record<string, unknown>;
  try {
    context = JSON.parse(contextRaw);
  } catch {
    context = {};
  }

  const supabase = await createClient();
  const { error } = await supabase.functions.invoke('send-bug-report', {
    body: { description, context },
  });

  if (error) {
    return { error: 'Failed to submit bug report. Please try again, or email support directly.' };
  }

  return { success: true };
}

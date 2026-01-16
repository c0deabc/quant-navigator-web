import { supabase } from '@/integrations/supabase/client';

type AuditDetails = Record<string, unknown>;

export async function logAuditEvent({
  action,
  entityType,
  entityId,
  details,
}: {
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: AuditDetails;
}): Promise<void> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('audit_logs').insert({
      action,
      entity_type: entityType,
      entity_id: (entityId ?? null) as any, // DB column is UUID; caller should pass uuid strings
      details: (details ?? null) as any,
      user_id: user.id,
      ip_address: null,
    });

    if (error) throw error;
  } catch (err) {
    // Never block primary user actions on audit logging failures.
    if (import.meta.env.DEV) console.warn('Audit logging failed:', err);
  }
}

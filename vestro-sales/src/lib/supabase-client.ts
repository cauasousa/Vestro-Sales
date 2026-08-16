import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/src/lib/session';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Realtime subscriptions are RLS-scoped by the connection's JWT — without this, the
 * client connects anonymously and receives nothing for tables like chat_messages that
 * require auth.uid() to match. Call before subscribing to any channel.
 */
export async function syncSupabaseSession(): Promise<boolean> {
    const session = getSession();
    if (!session) return false;

    const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
    });
    return !error;
}

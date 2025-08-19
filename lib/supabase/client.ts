import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

// Lazily create a client only in the browser to avoid build-time env requirements
export const createClient = () => {
  if (typeof window === "undefined") {
    // Return a minimal no-op client on the server during build/SSR
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
        eq: () => ({ single: async () => ({ data: null, error: null }) }),
        gte: () => ({ select: () => ({}) }),
        order: () => ({})
      }),
      channel: () => ({ on: () => ({ on: () => ({ subscribe: () => "noop" }) }) }),
      removeChannel: () => {},
    } as any
  }
  return createClientComponentClient()
}

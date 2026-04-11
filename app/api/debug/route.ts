import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  return Response.json({
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
    SUPABASE_ANON_KEY: (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'NOT SET').substring(0, 20) + '...',
  })
}

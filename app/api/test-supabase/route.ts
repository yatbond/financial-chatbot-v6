import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
  const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  console.log('TEST: service role available:', !!SUPABASE_SERVICE_ROLE)
  console.log('TEST: anon key available:', !!SUPABASE_ANON)
  
  // Try with service role key
  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE || SUPABASE_ANON, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  const { data, error } = await client
    .from('financial_data')
    .select('raw_financial_type')
    .eq('project_id', '5e23b0ff-fff6-4903-a2ea-e0e640ed83c8')
    .eq('year', 2026)
    .eq('month', 2)
    .eq('sheet_name', 'Financial Status')
    .eq('item_code', '3')
    .limit(20)
  
  return Response.json({
    usingServiceRole: !!SUPABASE_SERVICE_ROLE,
    error,
    count: data?.length || 0,
    data: data?.slice(0, 10),
  })
}

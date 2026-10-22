import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireStaffUser } from '@/lib/apiAuth';

export async function GET(request: Request) {
  const staff = await requireStaffUser(request);
  if (staff.error) return staff.error;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabase.from('services').select('*').order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

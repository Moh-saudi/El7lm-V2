import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';

function response(body: Record<string, unknown>, status = 200) {
  return withPrivateResponseHeaders(NextResponse.json(body, { status }));
}

export async function POST(req: NextRequest) {
  const authorization = await authorizeAdmin(req);
  if (!authorization.ok) return authorization.response;

  try {
    const { uid } = await req.json();
    const employeeId = typeof uid === 'string' ? uid.trim() : '';
    if (!employeeId) return response({ success: false, error: 'Missing Employee UID' }, 400);

    const db = getSupabaseAdmin();
    const { data: employee, error: lookupError } = await db
      .from('employees')
      .select('id,uid,authUserId,isActive')
      .or(`id.eq.${employeeId},uid.eq.${employeeId},authUserId.eq.${employeeId}`)
      .limit(1)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!employee) return response({ success: false, error: 'Employee not found' }, 404);

    // Database account status is authoritative for application access.
    // Do not treat a legacy employee id as a Supabase Auth UUID.
    const { error: updateError } = await db
      .from('employees')
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .eq('id', employee.id);

    if (updateError) throw updateError;

    return response({ success: true, message: 'Employee account disabled' });
  } catch (error: unknown) {
    console.error('[admin/employees/delete]', error);
    return response(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      500,
    );
  }
}

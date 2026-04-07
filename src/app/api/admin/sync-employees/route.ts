import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const db = getSupabaseAdmin();

    const { data: employees, error } = await db.from('employees').select('*');
    if (error) throw error;

    if (!employees || employees.length === 0) {
      return NextResponse.json({ success: false, message: 'No employees found' });
    }

    let successCount = 0;
    let errorCount = 0;
    const results: unknown[] = [];

    for (const emp of employees) {
      try {
        let permissions: unknown[] = [];
        let roleName = '';

        if ((emp as any).roleId) {
          const { data: role } = await db.from('roles').select('*').eq('id', (emp as any).roleId).single();
          if (role) {
            permissions = (role as any).permissions || [];
            roleName = (role as any).name || '';
          }
        }

        const updateData = {
          employeeId: (emp as any).id,
          roleId: (emp as any).roleId || null,
          role: (emp as any).roleId || null,
          employeeRole: (emp as any).roleId || null,
          roleName: (emp as any).roleName || roleName,
          permissions,
          accountType: 'admin',
          name: (emp as any).name,
          email: (emp as any).email,
          phone: (emp as any).phone,
          isActive: (emp as any).isActive !== false,
          department: (emp as any).department || '',
          updated_at: new Date().toISOString(),
          lastSyncedAt: new Date().toISOString(),
        };

        await db.from('users').upsert({ id: (emp as any).id, ...updateData });

        results.push({ name: (emp as any).name, email: (emp as any).email, roleId: (emp as any).roleId, roleName, status: 'success' });
        successCount++;
      } catch (err: any) {
        results.push({ name: (emp as any).name, email: (emp as any).email, status: 'error', error: err.message });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${successCount} employees`,
      data: { total: employees.length, success: successCount, errors: errorCount, results },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

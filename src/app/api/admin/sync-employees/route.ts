import { adminDb } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API to sync all employees data to users collection
 * This ensures all employees have correct roleId and permissions
 * 
 * GET /api/admin/sync-employees
 */
export async function GET(request: NextRequest) {
    console.log('🔄 Starting employee sync...');

    try {
        // 1. جلب جميع الموظفين
        const employeesSnapshot = await adminDb.collection('employees').get();
        console.log(`📋 Found ${employeesSnapshot.size} employees`);

        if (employeesSnapshot.empty) {
            return NextResponse.json({
                success: false,
                message: 'No employees found'
            });
        }

        const results: any[] = [];
        let successCount = 0;
        let errorCount = 0;

        for (const employeeDoc of employeesSnapshot.docs) {
            const employeeData = employeeDoc.data();
            const employeeId = employeeDoc.id;

            console.log(`\n📌 Processing: ${employeeData.name || 'Unknown'} (${employeeData.email})`);

            try {
                // 2. جلب صلاحيات الدور
                let permissions: string[] = [];
                let roleName = '';

                if (employeeData.roleId) {
                    const roleDoc = await adminDb.collection('roles').doc(employeeData.roleId).get();
                    if (roleDoc.exists) {
                        const roleData = roleDoc.data();
                        permissions = roleData?.permissions || [];
                        roleName = roleData?.name || '';
                        console.log(`   ✅ Role found: ${roleName}`);
                    } else {
                        console.log(`   ⚠️ Role not found: ${employeeData.roleId}`);
                    }
                }

                // 3. تحديث بيانات المستخدم في users collection
                const userRef = adminDb.collection('users').doc(employeeId);
                const userDoc = await userRef.get();

                const updateData = {
                    // بيانات الموظف
                    employeeId: employeeId,
                    roleId: employeeData.roleId || null,
                    role: employeeData.roleId || null,
                    employeeRole: employeeData.roleId || null,
                    roleName: employeeData.roleName || roleName,
                    permissions: permissions,

                    // بيانات أساسية
                    accountType: 'admin',
                    name: employeeData.name,
                    email: employeeData.email,
                    phone: employeeData.phone,
                    isActive: employeeData.isActive !== false,
                    department: employeeData.department || '',

                    // تحديث الوقت
                    updated_at: new Date(),
                    lastSyncedAt: new Date()
                };

                if (userDoc.exists) {
                    await userRef.update(updateData);
                } else {
                    await userRef.set({
                        ...updateData,
                        uid: employeeId,
                        created_at: new Date()
                    });
                }

                results.push({
                    name: employeeData.name,
                    email: employeeData.email,
                    roleId: employeeData.roleId,
                    roleName: roleName,
                    permissions: permissions,
                    status: 'success'
                });

                successCount++;

            } catch (error: any) {
                console.log(`   ❌ Error: ${error.message}`);
                results.push({
                    name: employeeData.name,
                    email: employeeData.email,
                    status: 'error',
                    error: error.message
                });
                errorCount++;
            }
        }

        console.log('\n📊 Sync Summary:');
        console.log(`   ✅ Successfully synced: ${successCount} employees`);
        console.log(`   ❌ Errors: ${errorCount} employees`);

        return NextResponse.json({
            success: true,
            message: `Synced ${successCount} employees successfully`,
            data: {
                total: employeesSnapshot.size,
                success: successCount,
                errors: errorCount,
                results: results
            }
        });

    } catch (error: any) {
        console.error('❌ Fatal error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

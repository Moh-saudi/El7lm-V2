import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase/config';
import { Employee, Role, DEFAULT_ROLES } from '../_types';
import { message } from 'antd';

export function useEmployees() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- جلب البيانات ---
    const fetchEmployees = useCallback(async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from('employees')
                .select('*')
                .order('createdAt', { ascending: false });

            if (fetchError) throw fetchError;

            const emps: Employee[] = (data || []).map((row: any) => ({
                id: row.id,
                uid: row.uid || row.id,
                name: row.name,
                email: row.email,
                phone: row.phone,
                roleId: row.roleId || row.role,
                roleName: row.roleName,
                department: row.department,
                isActive: row.isActive ?? true,
                avatar: row.avatar || row.photoURL,
                createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
                lastLogin: row.lastLogin ? new Date(row.lastLogin) : undefined,
                jobTitle: row.jobTitle,
                notes: row.notes
            }));
            setEmployees(emps);
        } catch (err: any) {
            console.error('Error fetching employees:', err);
            setError(err.message);
        }
    }, []);

    const fetchRoles = useCallback(async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from('roles')
                .select('*');

            if (fetchError) throw fetchError;

            if (data && data.length > 0) {
                const fetchedRoles: Role[] = data.map((row: any) => ({
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    permissions: row.permissions || [],
                    isSystem: row.isSystem
                }));
                setRoles(fetchedRoles);
            } else {
                // استخدام الأدوار الافتراضية إذا كانت قاعدة البيانات فارغة
                setRoles(DEFAULT_ROLES);
            }
        } catch (err) {
            console.error('Error fetching roles:', err);
        }
    }, []);

    const refreshAll = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchEmployees(), fetchRoles()]);
        setLoading(false);
    }, [fetchEmployees, fetchRoles]);

    useEffect(() => {
        refreshAll();
    }, [refreshAll]);


    // --- إدارة الموظفين ---
    const addEmployee = async (data: Omit<Employee, 'id' | 'uid' | 'createdAt'>, password?: string) => {
        setLoading(true);
        try {
            // 1. الحصول على التوكن للمصادقة
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('You must be logged in');
            const token = session.access_token;

            // 2. استدعاء API الإنشاء
            const response = await fetch('/api/admin/employees/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...data,
                    password
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'فشل إنشاء الموظف');
            }

            // 3. تحديث القائمة (بما أن الـ API قام بالحفظ في قاعدة البيانات، نحتاج فقط لإعادة الجلب)
            message.success('تم إنشاء حساب الموظف وتسجيله بنجاح');
            fetchEmployees();
            return true;
        } catch (err: any) {
            console.error('Error adding employee:', err);
            message.error(err.message || 'فشل إضافة الموظف');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const updateEmployee = async (id: string, data: Partial<Employee>) => {
        setLoading(true);
        try {
            await supabase.from('employees').update({
                ...data,
                updatedAt: new Date().toISOString()
            }).eq('id', id);

            setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, ...data } : emp));
            message.success('تم تحديث البيانات بنجاح');
            return true;
        } catch (err: any) {
            console.error('Error updating employee:', err);
            message.error('فشل تحديث البيانات');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const deleteEmployee = async (id: string) => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('You must be logged in');
            const token = session.access_token;

            const response = await fetch('/api/admin/employees/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ uid: id })
            });

            if (!response.ok) {
                const res = await response.json();
                throw new Error(res.error || 'فشل تعطيل الحساب');
            }

            // تحديث الواجهة محلياً
            setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, isActive: false } : emp));
            message.success('تم تعطيل حساب الموظف وطرده من النظام');
            return true;
        } catch (err: any) {
            console.error('Error disabling employee:', err);
            message.error(err.message || 'فشل الحذف');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const resetEmployeePassword = async (uid: string, newPassword: string) => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('You must be logged in');
            const token = session.access_token;

            const response = await fetch('/api/admin/employees/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ uid, newPassword })
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'فشل تغيير كلمة المرور');
            }

            message.success('تم تغيير كلمة المرور بنجاح');
            return true;
        } catch (err: any) {
            console.error('Password reset error:', err);
            message.error(err.message || 'فشل تغيير كلمة المرور');
            return false;
        } finally {
            setLoading(false);
        }
    };


    // --- إدارة الأدوار ---
    const addRole = async (roleData: Omit<Role, 'id'>) => {
        setLoading(true);
        try {
            const newId = crypto.randomUUID();
            const { data, error: insertError } = await supabase.from('roles').insert({
                id: newId,
                ...roleData,
                isSystem: false,
                createdAt: new Date().toISOString()
            }).select().single();

            if (insertError) throw insertError;

            const newRole = { id: newId, ...roleData, isSystem: false } as Role;
            setRoles(prev => [...prev, newRole]);
            message.success('تم إنشاء الدور الجديد بنجاح');
            return true;
        } catch (err) {
            console.error(err);
            message.error('فشل إنشاء الدور');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const updateRole = async (id: string, roleData: Partial<Role>) => {
        setLoading(true);
        try {
            await supabase.from('roles').update({
                ...roleData,
                updatedAt: new Date().toISOString()
            }).eq('id', id);

            setRoles(prev => prev.map(r => r.id === id ? { ...r, ...roleData } : r));
            message.success('تم تحديث صلاحيات الدور');
            return true;
        } catch (err) {
            console.error(err);
            message.error('فشل تحديث الدور');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const deleteRole = async (id: string) => {
        setLoading(true);
        try {
            await supabase.from('roles').delete().eq('id', id);
            setRoles(prev => prev.filter(r => r.id !== id));
            message.success('تم حذف الدور');
            return true;
        } catch (err) {
            console.error(err);
            message.error('فشل حذف الدور');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        employees,
        roles,
        loading,
        error,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        resetEmployeePassword,
        addRole,
        updateRole,
        deleteRole
    };
}

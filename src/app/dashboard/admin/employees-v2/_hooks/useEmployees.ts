import { useState, useCallback, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
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
            const q = query(collection(db, 'employees'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);

            const emps: Employee[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                emps.push({
                    id: doc.id,
                    uid: data.uid || doc.id,
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    roleId: data.roleId || data.role,
                    roleName: data.roleName,
                    department: data.department,
                    isActive: data.isActive ?? true,
                    avatar: data.avatar || data.photoURL,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                    lastLogin: data.lastLogin?.toDate ? data.lastLogin.toDate() : undefined,
                    jobTitle: data.jobTitle,
                    notes: data.notes
                });
            });
            setEmployees(emps);
        } catch (err: any) {
            console.error('Error fetching employees:', err);
            setError(err.message);
        }
    }, []);

    const fetchRoles = useCallback(async () => {
        try {
            const q = query(collection(db, 'roles'));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const fetchedRoles: Role[] = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    fetchedRoles.push({
                        id: doc.id,
                        name: data.name,
                        description: data.description,
                        permissions: data.permissions || [],
                        isSystem: data.isSystem
                    });
                });
                // نضيف أدوار النظام الافتراضية إذا لم تكن موجودة في الداتابيس
                // أو يمكننا دمجها. هنا نعتمد على الداتابيس كمصدر الحقيقة وإذا فرغت نستخدم الافتراضي
                setRoles(fetchedRoles);
            } else {
                // استخدام الأدوار الافتراضية إذا كانت الداتابيس فارغة
                setRoles(DEFAULT_ROLES);

                // (اختياري) حفظ الأدوار الافتراضية في الداتابيس لتكوينها لأول مرة
                // DEFAULT_ROLES.forEach(async role => {
                //    await setDoc(doc(db, 'roles', role.id), role);
                // });
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
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('You must be logged in');
            const token = await currentUser.getIdToken();

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

            // 3. تحديث القائمة (بما أن الـ API قام بالحفظ في Firestore، نحتاج فقط لإعادة الجلب)
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
            await updateDoc(doc(db, 'employees', id), {
                ...data,
                updatedAt: serverTimestamp()
            });

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
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('You must be logged in');
            const token = await currentUser.getIdToken();

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
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('You must be logged in');
            const token = await currentUser.getIdToken();

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
            // نستخدم الاسم كـ ID بسيط بعد تنظيفه (اختياري)
            // أو نترك Firestore ينشئ ID
            const res = await addDoc(collection(db, 'roles'), {
                ...roleData,
                isSystem: false,
                createdAt: serverTimestamp()
            });

            const newRole = { id: res.id, ...roleData, isSystem: false } as Role;
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
            await updateDoc(doc(db, 'roles', id), {
                ...roleData,
                updatedAt: serverTimestamp()
            });

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
            await deleteDoc(doc(db, 'roles', id));
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

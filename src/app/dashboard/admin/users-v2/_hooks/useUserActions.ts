import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/config';
import { User, AccountType } from '../_types';
import { message } from 'antd';
import { useAuth } from '@/lib/firebase/auth-provider';
import { notifyUserUpdate } from '@/lib/notifications/admin-notifications';

export function useUserActions() {
    const [loading, setLoading] = useState(false);

    // الحصول على اسم الجدول
    const getTableName = (accountType: AccountType): string => {
        if (accountType === 'admin') return 'users';
        return accountType + 's';
    };

    // استيراد بيانات الموظف الحالي
    const { userData } = useAuth();
    // التحقق هل المستخدم الحالي موظف
    const isEmployee = !!(userData?.employeeId || userData?.roleId);

    // دالة مساعدة لإرسال الإشعار
    const sendNotificationIfNeeded = async (targetUser: User, action: 'update' | 'activate' | 'suspend' | 'delete') => {
        if (isEmployee && userData) {
            await notifyUserUpdate(
                {
                    id: userData.employeeId || userData.uid,
                    name: userData.name || userData.displayName || 'موظف',
                    email: userData.email || undefined
                },
                {
                    id: targetUser.id,
                    name: targetUser.name || (targetUser as any).full_name || 'مستخدم'
                },
                action
            );
        }
    };

    // تعليق حساب
    const suspendUser = useCallback(async (user: User, reason: string) => {
        setLoading(true);
        try {
            const tableName = getTableName(user.accountType);

            await supabase.from(tableName).update({
                isActive: false,
                suspendedAt: new Date().toISOString(),
                suspendReason: reason,
            }).eq('id', user.id);

            // تحديث في users أيضاً إذا كان مختلف
            if (tableName !== 'users') {
                await supabase.from('users').update({
                    isActive: false,
                    suspendedAt: new Date().toISOString(),
                    suspendReason: reason,
                }).eq('id', user.id);
            }

            // إرسال إشعار
            await sendNotificationIfNeeded(user, 'suspend');

            message.success('تم تعليق الحساب بنجاح');
            return true;
        } catch (error: any) {
            console.error('Error suspending user:', error);
            message.error('حدث خطأ في تعليق الحساب');
            return false;
        } finally {
            setLoading(false);
        }
    }, [userData, isEmployee]);

    // تفعيل حساب
    const activateUser = useCallback(async (user: User) => {
        setLoading(true);
        try {
            const tableName = getTableName(user.accountType);

            await supabase.from(tableName).update({
                isActive: true,
                suspendedAt: null,
                suspendReason: null,
            }).eq('id', user.id);

            if (tableName !== 'users') {
                await supabase.from('users').update({
                    isActive: true,
                    suspendedAt: null,
                    suspendReason: null,
                }).eq('id', user.id);
            }

            // إرسال إشعار
            await sendNotificationIfNeeded(user, 'activate');

            message.success('تم تفعيل الحساب بنجاح');
            return true;
        } catch (error: any) {
            console.error('Error activating user:', error);
            message.error('حدث خطأ في تفعيل الحساب');
            return false;
        } finally {
            setLoading(false);
        }
    }, [userData, isEmployee]);

    // حذف حساب (soft delete)
    const deleteUser = useCallback(async (user: User, permanent = false) => {
        setLoading(true);
        try {
            const tableName = getTableName(user.accountType);

            if (permanent) {
                await supabase.from(tableName).delete().eq('id', user.id);
                if (tableName !== 'users') {
                    await supabase.from('users').delete().eq('id', user.id);
                }
                message.success('تم حذف الحساب نهائياً');
            } else {
                await supabase.from(tableName).update({
                    isDeleted: true,
                    deletedAt: new Date().toISOString(),
                }).eq('id', user.id);
                if (tableName !== 'users') {
                    await supabase.from('users').update({
                        isDeleted: true,
                        deletedAt: new Date().toISOString(),
                    }).eq('id', user.id);
                }
                message.success('تم حذف الحساب');
            }

            // إرسال إشعار
            await sendNotificationIfNeeded(user, 'delete');

            return true;
        } catch (error: any) {
            console.error('Error deleting user:', error);
            message.error('حدث خطأ في حذف الحساب');
            return false;
        } finally {
            setLoading(false);
        }
    }, [userData, isEmployee]);

    // استعادة حساب محذوف
    const restoreUser = useCallback(async (user: User) => {
        setLoading(true);
        try {
            const tableName = getTableName(user.accountType);

            await supabase.from(tableName).update({
                isDeleted: false,
                deletedAt: null,
            }).eq('id', user.id);

            if (tableName !== 'users') {
                await supabase.from('users').update({
                    isDeleted: false,
                    deletedAt: null,
                }).eq('id', user.id);
            }

            // إرسال إشعار (نعتبره تفعيل أو تحديث)
            await sendNotificationIfNeeded(user, 'activate');

            message.success('تم استعادة الحساب بنجاح');
            return true;
        } catch (error: any) {
            console.error('Error restoring user:', error);
            message.error('حدث خطأ في استعادة الحساب');
            return false;
        } finally {
            setLoading(false);
        }
    }, [userData, isEmployee]);

    // توثيق حساب
    const verifyUser = useCallback(async (user: User) => {
        setLoading(true);
        try {
            const tableName = getTableName(user.accountType);

            await supabase.from(tableName).update({
                verificationStatus: 'verified',
                verifiedAt: new Date().toISOString(),
            }).eq('id', user.id);

            if (tableName !== 'users') {
                await supabase.from('users').update({
                    verificationStatus: 'verified',
                    verifiedAt: new Date().toISOString(),
                }).eq('id', user.id);
            }

            // إرسال إشعار (كعملية تحديث)
            await sendNotificationIfNeeded(user, 'update');

            message.success('تم توثيق الحساب بنجاح');
            return true;
        } catch (error: any) {
            console.error('Error verifying user:', error);
            message.error('حدث خطأ في توثيق الحساب');
            return false;
        } finally {
            setLoading(false);
        }
    }, [userData, isEmployee]);

    // تغيير نوع الحساب
    const changeAccountType = useCallback(async (user: User, newType: AccountType) => {
        setLoading(true);
        try {
            // تحديث في users
            await supabase.from('users').update({
                accountType: newType,
            }).eq('id', user.id);

            message.success('تم تغيير نوع الحساب بنجاح');
            return true;
        } catch (error: any) {
            console.error('Error changing account type:', error);
            message.error('حدث خطأ في تغيير نوع الحساب');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    // تحديث بيانات المستخدم
    const updateUser = useCallback(async (user: User, data: Partial<User>) => {
        setLoading(true);
        try {
            const tableName = getTableName(user.accountType);

            const updateData: any = {
                updatedAt: new Date().toISOString(),
            };

            if (data.name) {
                updateData.name = data.name;
                updateData.full_name = data.name;
            }
            if (data.phone) updateData.phone = data.phone;
            if (data.country) updateData.country = data.country;
            if (data.city) updateData.city = data.city;
            if (data.accountType) updateData.accountType = data.accountType;

            // تحديث في الجدول الخاص
            if (tableName !== 'users') {
                if (data.accountType && data.accountType !== user.accountType) {
                    // منطق تغيير النوع يتم التعامل معه في changeAccountType
                } else {
                    await supabase.from(tableName).update(updateData).eq('id', user.id);
                }
            }

            // تحديث في users
            await supabase.from('users').update(updateData).eq('id', user.id);

            // إرسال إشعار
            await sendNotificationIfNeeded(user, 'update');

            message.success('تم تحديث بيانات المستخدم بنجاح');
            return true;
        } catch (error: any) {
            console.error('Error updating user:', error);
            message.error('حدث خطأ في تحديث البيانات');
            return false;
        } finally {
            setLoading(false);
        }
    }, [userData, isEmployee]);

    // إرسال رسالة
    const sendMessage = useCallback(async (user: User, title: string, body: string, method: 'notification' | 'email') => {
        setLoading(true);
        try {
            if (method === 'notification') {
                await supabase.from('notifications').insert({
                    id: crypto.randomUUID(),
                    userId: user.id,
                    title,
                    message: body,
                    isRead: false,
                    createdAt: new Date().toISOString(),
                    type: 'info',
                    category: 'system',
                    metadata: {
                        senderId: 'admin',
                        senderName: 'الإدارة',
                    }
                });
            } else if (method === 'email') {
                // استخدام جدول mail لإرسال البريد
                await supabase.from('mail').insert({
                    id: crypto.randomUUID(),
                    to: user.email,
                    message: {
                        subject: title,
                        text: body,
                        html: `<div dir="rtl" style="font-family: Arial, sans-serif;">
                            <h2>${title}</h2>
                            <p>${body.replace(/\n/g, '<br>')}</p>
                            <hr>
                            <p style="font-size: 12px; color: #888;">تم الإرسال من لوحة تحكم الحلم</p>
                        </div>`,
                    }
                });
            }

            return true;
        } catch (error: any) {
            console.error('Error sending message:', error);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        suspendUser,
        activateUser,
        deleteUser,
        restoreUser,
        verifyUser,
        changeAccountType,
        updateUser,
        sendMessage,
    };
}

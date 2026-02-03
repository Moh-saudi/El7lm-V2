import { useState, useCallback } from 'react';
import { doc, updateDoc, deleteDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { User, AccountType } from '../_types';
import { message } from 'antd';
import { useAuth } from '@/lib/firebase/auth-provider';
import { notifyUserUpdate } from '@/lib/notifications/admin-notifications';

export function useUserActions() {
    const [loading, setLoading] = useState(false);

    // الحصول على اسم المجموعة
    const getCollectionName = (accountType: AccountType): string => {
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
            const collectionName = getCollectionName(user.accountType);

            await updateDoc(doc(db, collectionName, user.id), {
                isActive: false,
                suspendedAt: new Date(),
                suspendReason: reason,
            });

            // تحديث في users أيضاً إذا كان مختلف
            if (collectionName !== 'users') {
                await updateDoc(doc(db, 'users', user.id), {
                    isActive: false,
                    suspendedAt: new Date(),
                    suspendReason: reason,
                });
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
            const collectionName = getCollectionName(user.accountType);

            await updateDoc(doc(db, collectionName, user.id), {
                isActive: true,
                suspendedAt: null,
                suspendReason: null,
            });

            if (collectionName !== 'users') {
                await updateDoc(doc(db, 'users', user.id), {
                    isActive: true,
                    suspendedAt: null,
                    suspendReason: null,
                });
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
            const collectionName = getCollectionName(user.accountType);

            if (permanent) {
                await deleteDoc(doc(db, collectionName, user.id));
                if (collectionName !== 'users') {
                    await deleteDoc(doc(db, 'users', user.id));
                }
                message.success('تم حذف الحساب نهائياً');
            } else {
                await updateDoc(doc(db, collectionName, user.id), {
                    isDeleted: true,
                    deletedAt: new Date(),
                });
                if (collectionName !== 'users') {
                    await updateDoc(doc(db, 'users', user.id), {
                        isDeleted: true,
                        deletedAt: new Date(),
                    });
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
            const collectionName = getCollectionName(user.accountType);

            await updateDoc(doc(db, collectionName, user.id), {
                isDeleted: false,
                deletedAt: null,
            });

            if (collectionName !== 'users') {
                await updateDoc(doc(db, 'users', user.id), {
                    isDeleted: false,
                    deletedAt: null,
                });
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
            const collectionName = getCollectionName(user.accountType);

            await updateDoc(doc(db, collectionName, user.id), {
                verificationStatus: 'verified',
                verifiedAt: new Date(),
            });

            if (collectionName !== 'users') {
                await updateDoc(doc(db, 'users', user.id), {
                    verificationStatus: 'verified',
                    verifiedAt: new Date(),
                });
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
            await updateDoc(doc(db, 'users', user.id), {
                accountType: newType,
            });

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
            const collectionName = getCollectionName(user.accountType);

            const updateData: any = {
                updatedAt: new Date(),
            };

            if (data.name) {
                updateData.name = data.name;
                updateData.full_name = data.name;
            }
            if (data.phone) updateData.phone = data.phone;
            if (data.country) updateData.country = data.country;
            if (data.city) updateData.city = data.city;
            if (data.accountType) updateData.accountType = data.accountType;

            // تحديث في المجموعة الخاصة
            if (collectionName !== 'users') {
                // إذا تغير نوع الحساب، قد نحتاج لنقل المستند، لكن للتبسيط الآن سنحدث فقط إذا كان نفس النوع
                if (data.accountType && data.accountType !== user.accountType) {
                    // منطق تغيير النوع يتم التعامل معه في changeAccountType
                } else {
                    await updateDoc(doc(db, collectionName, user.id), updateData);
                }
            }

            // تحديث في users
            await updateDoc(doc(db, 'users', user.id), updateData);

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
                await addDoc(collection(db, 'notifications'), {
                    userId: user.id,
                    title,
                    message: body,
                    isRead: false,
                    createdAt: serverTimestamp(),
                    type: 'info',
                    category: 'system',
                    metadata: {
                        senderId: 'admin',
                        senderName: 'الإدارة',
                    }
                });
            } else if (method === 'email') {
                // استخدام مجموعة mail لإرسال البريد عبر Firebase Extension (إذا كان مفعلاً)
                await addDoc(collection(db, 'mail'), {
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

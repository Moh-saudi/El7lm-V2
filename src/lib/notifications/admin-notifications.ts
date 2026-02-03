/**
 * خدمة إشعارات الإدارة
 * ترسل إشعارات للمستوى الأعلى عند أي تحديث من الموظفين
 */

import { db } from '@/lib/firebase/config';
import { addDoc, collection, serverTimestamp, query, where, orderBy, limit, getDocs, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

// أنواع الإشعارات
export type AdminNotificationType =
    | 'user_update'      // تحديث بيانات مستخدم
    | 'user_status'      // تغيير حالة مستخدم
    | 'content_update'   // تحديث محتوى
    | 'payment_action'   // إجراء مالي
    | 'employee_login'   // تسجيل دخول موظف
    | 'settings_change'  // تغيير إعدادات
    | 'profile_update'   // تحديث ملف شخصي
    | 'general';         // عام

// مستوى الأهمية
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

// واجهة الإشعار
export interface AdminNotification {
    id?: string;
    type: AdminNotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;

    // معلومات الموظف الذي قام بالإجراء
    employeeId: string;
    employeeName: string;
    employeeEmail?: string;

    // تفاصيل إضافية
    actionType: string;           // نوع الإجراء (create, update, delete)
    targetType?: string;          // نوع الهدف (user, content, etc)
    targetId?: string;            // ID الهدف
    targetName?: string;          // اسم الهدف
    metadata?: Record<string, any>; // بيانات إضافية

    // حالة الإشعار
    isRead: boolean;
    readAt?: Date;
    readBy?: string;

    // التوقيت
    createdAt: any;
}

// إرسال إشعار للإدارة
export async function sendAdminNotification(notification: Omit<AdminNotification, 'id' | 'isRead' | 'createdAt'>): Promise<string | null> {
    try {
        const notificationData = {
            ...notification,
            isRead: false,
            createdAt: serverTimestamp()
        };

        console.log('📢 Sending admin notification:', {
            type: notification.type,
            title: notification.title,
            employee: notification.employeeName
        });

        const docRef = await addDoc(collection(db, 'admin_notifications'), notificationData);

        console.log('✅ Admin notification sent:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('❌ Error sending admin notification:', error);
        return null;
    }
}

// جلب الإشعارات غير المقروءة
export async function getUnreadNotifications(limitCount: number = 20): Promise<AdminNotification[]> {
    try {
        const q = query(
            collection(db, 'admin_notifications'),
            where('isRead', '==', false),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as AdminNotification));
    } catch (error) {
        console.error('Error fetching unread notifications:', error);
        return [];
    }
}

// جلب جميع الإشعارات
export async function getAllNotifications(limitCount: number = 50): Promise<AdminNotification[]> {
    try {
        const q = query(
            collection(db, 'admin_notifications'),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as AdminNotification));
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

// تحديد إشعار كمقروء
export async function markAsRead(notificationId: string, adminId: string): Promise<boolean> {
    try {
        const notificationRef = doc(db, 'admin_notifications', notificationId);
        await updateDoc(notificationRef, {
            isRead: true,
            readAt: serverTimestamp(),
            readBy: adminId
        });
        return true;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return false;
    }
}

// تحديد جميع الإشعارات كمقروءة
export async function markAllAsRead(adminId: string): Promise<boolean> {
    try {
        const unreadNotifications = await getUnreadNotifications(100);

        if (unreadNotifications.length === 0) return true;

        const batch = writeBatch(db);

        unreadNotifications.forEach(notification => {
            if (notification.id) {
                const notificationRef = doc(db, 'admin_notifications', notification.id);
                batch.update(notificationRef, {
                    isRead: true,
                    readAt: serverTimestamp(),
                    readBy: adminId
                });
            }
        });

        await batch.commit();
        console.log(`✅ Marked ${unreadNotifications.length} notifications as read`);
        return true;
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
    }
}

// حذف إشعار
export async function deleteNotification(notificationId: string): Promise<boolean> {
    try {
        await deleteDoc(doc(db, 'admin_notifications', notificationId));
        return true;
    } catch (error) {
        console.error('Error deleting notification:', error);
        return false;
    }
}

// ======================================
// دوال مساعدة لإرسال إشعارات محددة
// ======================================

// إشعار تحديث مستخدم
export async function notifyUserUpdate(
    employee: { id: string; name: string; email?: string },
    user: { id: string; name: string },
    action: 'update' | 'activate' | 'suspend' | 'delete'
) {
    const actionLabels = {
        update: 'تحديث بيانات',
        activate: 'تفعيل حساب',
        suspend: 'إيقاف حساب',
        delete: 'حذف حساب'
    };

    return sendAdminNotification({
        type: 'user_update',
        priority: action === 'delete' ? 'high' : 'medium',
        title: `${actionLabels[action]} مستخدم`,
        message: `قام ${employee.name} بـ${actionLabels[action]} للمستخدم "${user.name}"`,
        employeeId: employee.id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        actionType: action,
        targetType: 'user',
        targetId: user.id,
        targetName: user.name
    });
}

// إشعار تحديث محتوى
export async function notifyContentUpdate(
    employee: { id: string; name: string; email?: string },
    content: { id: string; name: string; type: string },
    action: 'create' | 'update' | 'delete' | 'approve' | 'reject'
) {
    const actionLabels = {
        create: 'إضافة',
        update: 'تحديث',
        delete: 'حذف',
        approve: 'الموافقة على',
        reject: 'رفض'
    };

    return sendAdminNotification({
        type: 'content_update',
        priority: action === 'delete' ? 'high' : 'medium',
        title: `${actionLabels[action]} ${content.type}`,
        message: `قام ${employee.name} بـ${actionLabels[action]} ${content.type}: "${content.name}"`,
        employeeId: employee.id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        actionType: action,
        targetType: content.type,
        targetId: content.id,
        targetName: content.name
    });
}

// إشعار إجراء مالي
export async function notifyPaymentAction(
    employee: { id: string; name: string; email?: string },
    payment: { id: string; amount: number; currency: string; userName: string },
    action: 'approve' | 'reject' | 'refund'
) {
    const actionLabels = {
        approve: 'الموافقة على',
        reject: 'رفض',
        refund: 'استرداد'
    };

    return sendAdminNotification({
        type: 'payment_action',
        priority: 'high',
        title: `${actionLabels[action]} دفعة مالية`,
        message: `قام ${employee.name} بـ${actionLabels[action]} دفعة بقيمة ${payment.amount} ${payment.currency} للمستخدم "${payment.userName}"`,
        employeeId: employee.id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        actionType: action,
        targetType: 'payment',
        targetId: payment.id,
        metadata: {
            amount: payment.amount,
            currency: payment.currency,
            userName: payment.userName
        }
    });
}

// إشعار تسجيل دخول موظف
export async function notifyEmployeeLogin(
    employee: { id: string; name: string; email?: string },
    loginInfo?: { ip?: string; device?: string }
) {
    return sendAdminNotification({
        type: 'employee_login',
        priority: 'low',
        title: 'تسجيل دخول موظف',
        message: `قام ${employee.name} بتسجيل الدخول`,
        employeeId: employee.id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        actionType: 'login',
        metadata: loginInfo
    });
}

// إشعار تحديث الملف الشخصي
export async function notifyProfileUpdate(
    employee: { id: string; name: string; email?: string },
    changes: string[]
) {
    return sendAdminNotification({
        type: 'profile_update',
        priority: 'low',
        title: 'تحديث ملف شخصي',
        message: `قام ${employee.name} بتحديث ملفه الشخصي (${changes.join('، ')})`,
        employeeId: employee.id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        actionType: 'update',
        targetType: 'profile',
        targetId: employee.id,
        metadata: { changes }
    });
}

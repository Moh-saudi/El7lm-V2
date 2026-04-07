/**
 * خدمة إشعارات الإدارة - Supabase Edition
 * تم تحويله من Firebase Firestore إلى Supabase
 */

import { supabase } from '@/lib/supabase/config';

export type AdminNotificationType =
  | 'user_update'
  | 'user_status'
  | 'content_update'
  | 'payment_action'
  | 'employee_login'
  | 'settings_change'
  | 'profile_update'
  | 'general';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface AdminNotification {
  id?: string;
  type: AdminNotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  actionType: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  readBy?: string;
  createdAt: string;
}

export async function sendAdminNotification(
  notification: Omit<AdminNotification, 'id' | 'isRead' | 'createdAt'>
): Promise<string | null> {
  try {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('admin_notifications').insert({
      id,
      ...notification,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    if (error) throw error;
    console.log('✅ Admin notification sent:', id);
    return id;
  } catch (error) {
    console.error('❌ Error sending admin notification:', error);
    return null;
  }
}

export async function getUnreadNotifications(limitCount = 20): Promise<AdminNotification[]> {
  try {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('isRead', false)
      .order('createdAt', { ascending: false })
      .limit(limitCount);
    if (error) throw error;
    return (data ?? []) as AdminNotification[];
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    return [];
  }
}

export async function getAllNotifications(limitCount = 50): Promise<AdminNotification[]> {
  try {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limitCount);
    if (error) throw error;
    return (data ?? []) as AdminNotification[];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function markAsRead(notificationId: string, adminId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('admin_notifications')
      .update({ isRead: true, readAt: new Date().toISOString(), readBy: adminId })
      .eq('id', notificationId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

export async function markAllAsRead(adminId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('admin_notifications')
      .update({ isRead: true, readAt: new Date().toISOString(), readBy: adminId })
      .eq('isRead', false);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('admin_notifications').delete().eq('id', notificationId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
}

export async function notifyUserUpdate(
  employee: { id: string; name: string; email?: string },
  user: { id: string; name: string },
  action: 'update' | 'activate' | 'suspend' | 'delete'
) {
  const actionLabels = { update: 'تحديث بيانات', activate: 'تفعيل حساب', suspend: 'إيقاف حساب', delete: 'حذف حساب' };
  return sendAdminNotification({
    type: 'user_update',
    priority: action === 'delete' ? 'high' : 'medium',
    title: `${actionLabels[action]} مستخدم`,
    message: `قام ${employee.name} بـ${actionLabels[action]} للمستخدم "${user.name}"`,
    employeeId: employee.id, employeeName: employee.name, employeeEmail: employee.email,
    actionType: action, targetType: 'user', targetId: user.id, targetName: user.name,
  });
}

export async function notifyContentUpdate(
  employee: { id: string; name: string; email?: string },
  content: { id: string; name: string; type: string },
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject'
) {
  const actionLabels = { create: 'إضافة', update: 'تحديث', delete: 'حذف', approve: 'الموافقة على', reject: 'رفض' };
  return sendAdminNotification({
    type: 'content_update',
    priority: action === 'delete' ? 'high' : 'medium',
    title: `${actionLabels[action]} ${content.type}`,
    message: `قام ${employee.name} بـ${actionLabels[action]} ${content.type}: "${content.name}"`,
    employeeId: employee.id, employeeName: employee.name, employeeEmail: employee.email,
    actionType: action, targetType: content.type, targetId: content.id, targetName: content.name,
  });
}

export async function notifyPaymentAction(
  employee: { id: string; name: string; email?: string },
  payment: { id: string; amount: number; currency: string; userName: string },
  action: 'approve' | 'reject' | 'refund'
) {
  const actionLabels = { approve: 'الموافقة على', reject: 'رفض', refund: 'استرداد' };
  return sendAdminNotification({
    type: 'payment_action', priority: 'high',
    title: `${actionLabels[action]} دفعة مالية`,
    message: `قام ${employee.name} بـ${actionLabels[action]} دفعة بقيمة ${payment.amount} ${payment.currency} للمستخدم "${payment.userName}"`,
    employeeId: employee.id, employeeName: employee.name, employeeEmail: employee.email,
    actionType: action, targetType: 'payment', targetId: payment.id,
    metadata: { amount: payment.amount, currency: payment.currency, userName: payment.userName },
  });
}

export async function notifyEmployeeLogin(
  employee: { id: string; name: string; email?: string },
  loginInfo?: { ip?: string; device?: string }
) {
  return sendAdminNotification({
    type: 'employee_login', priority: 'low',
    title: 'تسجيل دخول موظف',
    message: `قام ${employee.name} بتسجيل الدخول`,
    employeeId: employee.id, employeeName: employee.name, employeeEmail: employee.email,
    actionType: 'login', metadata: loginInfo,
  });
}

export async function notifyProfileUpdate(
  employee: { id: string; name: string; email?: string },
  changes: string[]
) {
  return sendAdminNotification({
    type: 'profile_update', priority: 'low',
    title: 'تحديث ملف شخصي',
    message: `قام ${employee.name} بتحديث ملفه الشخصي (${changes.join('، ')})`,
    employeeId: employee.id, employeeName: employee.name, employeeEmail: employee.email,
    actionType: 'update', targetType: 'profile', targetId: employee.id,
    metadata: { changes },
  });
}

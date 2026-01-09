'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Printer,
  Zap,
  TrendingUp
} from 'lucide-react';

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'success';
  payment_date: any;
  createdAt?: any;
  package_name?: string;
  packageType?: string;
  transaction_id?: string;
  customer_name?: string;
  customer_email?: string;
  receiptUrl?: string;
  source?: string; // مصدر البيانات: 'bulkPayments', 'geidea_payments', 'bulk_payments'
}

interface SubscriptionInfo {
  status: 'active' | 'expired' | 'pending' | 'inactive' | 'completed' | 'success' | 'cancelled' | 'failed' | 'rejected' | 'processing' | 'waiting';
  plan_name?: string;
  package_name?: string;
  packageType?: string;
  start_date?: any;
  end_date?: any;
  expires_at?: any;
  activated_at?: any;
  amount?: number;
  currency?: string;
  daysLeft?: number;
  isFromParent?: boolean; // ⬅️ هل الاشتراك من الحساب الأب؟
  parentAccountType?: string; // ⬅️ نوع الحساب الأب (academy, club, etc.)
  parentAccountName?: string; // ⬅️ اسم الحساب الأب
}

interface SubscriptionStatusPageProps {
  accountType: string;
}

const SubscriptionStatusPage: React.FC<SubscriptionStatusPageProps> = ({ accountType }) => {
  const { user, userData } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [parentSubscriptionUnsubscribe, setParentSubscriptionUnsubscribe] = useState<(() => void) | null>(null);

  useEffect(() => {
    // 🔒 حماية: التحقق من وجود user.uid قبل جلب البيانات
    if (!user?.uid) {
      console.warn('⚠️ [Subscription Status] لا يوجد user.uid - لا يمكن جلب البيانات');
      setError('يجب تسجيل الدخول للوصول إلى بيانات الاشتراك');
      setLoading(false);
      return;
    }

    // 🔒 حماية إضافية: التحقق من أن accountType صحيح
    if (!accountType) {
      console.warn('⚠️ [Subscription Status] لا يوجد accountType');
      setError('نوع الحساب غير محدد');
      setLoading(false);
      return;
    }

    const fetchSubscriptionData = async () => {
      try {
        setLoading(true);

        // 🔍 1. التحقق من الحسابات التابعة (لللاعبين التابعين لأكاديمية/نادي/مدرب/وكيل)
        let parentAccountId: string | null = null;
        let parentAccountType: string | null = null;
        let parentAccountName: string | null = null;

        if (accountType === 'player' && userData) {
          // التحقق من الانتماء لمنظمة
          parentAccountId = userData.club_id || userData.clubId ||
            userData.academy_id || userData.academyId ||
            userData.trainer_id || userData.trainerId ||
            userData.agent_id || userData.agentId ||
            userData.parentAccountId || userData.parent_account_id || null;

          if (parentAccountId) {
            // تحديد نوع الحساب الأب
            if (userData.club_id || userData.clubId) {
              parentAccountType = 'club';
            } else if (userData.academy_id || userData.academyId) {
              parentAccountType = 'academy';
            } else if (userData.trainer_id || userData.trainerId) {
              parentAccountType = 'trainer';
            } else if (userData.agent_id || userData.agentId) {
              parentAccountType = 'agent';
            }

            console.log('🔍 [Subscription Status] اللاعب تابع لحساب:', {
              parentAccountId,
              parentAccountType
            });

            // جلب اسم الحساب الأب
            if (parentAccountType && parentAccountId) {
              try {
                const parentCollection = parentAccountType === 'club' ? 'clubs' :
                  parentAccountType === 'academy' ? 'academies' :
                    parentAccountType === 'trainer' ? 'trainers' :
                      parentAccountType === 'agent' ? 'agents' : 'users';

                const parentDocRef = doc(db, parentCollection, parentAccountId);
                const parentDoc = await getDoc(parentDocRef);

                if (parentDoc.exists()) {
                  const parentData = parentDoc.data();
                  parentAccountName = parentData.name ||
                    parentData.club_name ||
                    parentData.academy_name ||
                    parentData.trainer_name ||
                    parentData.agent_name ||
                    parentData.full_name ||
                    'غير محدد';

                  console.log('✅ [Subscription Status] تم جلب اسم الحساب الأب:', parentAccountName);
                }
              } catch (error) {
                console.warn('⚠️ [Subscription Status] خطأ في جلب اسم الحساب الأب:', error);
              }
            }
          }
        }

        // 🔍 2. البحث في subscriptions collection (المصدر الأساسي) - اشتراك المستخدم نفسه
        console.log('🔍 البحث في subscriptions collection للمستخدم الحالي...');
        const subscriptionRef = doc(db, 'subscriptions', user.uid);
        const subscriptionDoc = await getDoc(subscriptionRef);

        if (subscriptionDoc.exists()) {
          const subData = subscriptionDoc.data();
          console.log('✅ تم العثور على اشتراك خاص للمستخدم في subscriptions:', subData);

          const expiresAt = subData.expires_at?.toDate ? subData.expires_at.toDate() :
            subData.end_date?.toDate ? subData.end_date.toDate() :
              subData.endDate?.toDate ? subData.endDate.toDate() : null;

          const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

          setSubscription({
            status: subData.status === 'active' && daysLeft > 0 ? 'active' :
              subData.status === 'active' && daysLeft <= 0 ? 'expired' :
                subData.status || 'inactive',
            plan_name: subData.plan_name || subData.package_name || 'باقة غير محددة',
            package_name: subData.package_name || subData.plan_name || 'باقة غير محددة',
            packageType: subData.packageType || subData.package_name || subData.plan_name,
            start_date: subData.activated_at || subData.start_date || subData.startDate,
            end_date: expiresAt,
            expires_at: expiresAt,
            activated_at: subData.activated_at || subData.created_at,
            amount: subData.package_price || subData.amount,
            currency: subData.currency || 'EGP',
            daysLeft: daysLeft,
            isFromParent: false // ⬅️ اشتراك خاص
          });
        } else if (parentAccountId && parentAccountType) {
          // 🔍 3. إذا لم يكن هناك اشتراك خاص، ابحث عن اشتراك الحساب الأب
          console.log('🔍 البحث عن اشتراك الحساب الأب...', { parentAccountId, parentAccountType });

          try {
            // جلب بيانات الحساب الأب من users collection
            const parentUserDocRef = doc(db, 'users', parentAccountId);
            const parentUserDoc = await getDoc(parentUserDocRef);

            if (parentUserDoc.exists()) {
              const parentUserData = parentUserDoc.data();
              const parentUid = parentUserData.uid || parentAccountId;

              // البحث عن اشتراك الحساب الأب
              const parentSubscriptionRef = doc(db, 'subscriptions', parentUid);
              const parentSubscriptionDoc = await getDoc(parentSubscriptionRef);

              if (parentSubscriptionDoc.exists()) {
                const parentSubData = parentSubscriptionDoc.data();
                console.log('✅ تم العثور على اشتراك الحساب الأب:', parentSubData);

                const expiresAt = parentSubData.expires_at?.toDate ? parentSubData.expires_at.toDate() :
                  parentSubData.end_date?.toDate ? parentSubData.end_date.toDate() :
                    parentSubData.endDate?.toDate ? parentSubData.endDate.toDate() : null;

                const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

                setSubscription({
                  status: parentSubData.status === 'active' && daysLeft > 0 ? 'active' :
                    parentSubData.status === 'active' && daysLeft <= 0 ? 'expired' :
                      parentSubData.status || 'inactive',
                  plan_name: parentSubData.plan_name || parentSubData.package_name || 'باقة غير محددة',
                  package_name: parentSubData.package_name || parentSubData.plan_name || 'باقة غير محددة',
                  packageType: parentSubData.packageType || parentSubData.package_name || parentSubData.plan_name,
                  start_date: parentSubData.activated_at || parentSubData.start_date || parentSubData.startDate,
                  end_date: expiresAt,
                  expires_at: expiresAt,
                  activated_at: parentSubData.activated_at || parentSubData.created_at,
                  amount: parentSubData.package_price || parentSubData.amount,
                  currency: parentSubData.currency || 'EGP',
                  daysLeft: daysLeft,
                  isFromParent: true, // ⬅️ اشتراك من الحساب الأب
                  parentAccountType: parentAccountType,
                  parentAccountName: parentAccountName || 'غير محدد'
                });

                // 🔍 إعداد Real-time listener لاشتراك الحساب الأب (لللاعبين التابعين)
                // ⚠️ مهم: هذا يسمح للاعب التابع برؤية تحديثات اشتراك الحساب الأب فوراً
                if (parentUid) {
                  const unsubscribeParentSubscription = onSnapshot(
                    doc(db, 'subscriptions', parentUid),
                    (parentDocSnapshot) => {
                      if (parentDocSnapshot.exists()) {
                        const parentSubData = parentDocSnapshot.data();
                        console.log('🔄 [Subscription Status] تم تحديث اشتراك الحساب الأب:', parentSubData);

                        const expiresAt = parentSubData.expires_at?.toDate ? parentSubData.expires_at.toDate() :
                          parentSubData.end_date?.toDate ? parentSubData.end_date.toDate() :
                            parentSubData.endDate?.toDate ? parentSubData.endDate.toDate() : null;

                        const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

                        setSubscription({
                          status: parentSubData.status === 'active' && daysLeft > 0 ? 'active' :
                            parentSubData.status === 'active' && daysLeft <= 0 ? 'expired' :
                              parentSubData.status || 'inactive',
                          plan_name: parentSubData.plan_name || parentSubData.package_name || 'باقة غير محددة',
                          package_name: parentSubData.package_name || parentSubData.plan_name || 'باقة غير محددة',
                          packageType: parentSubData.packageType || parentSubData.package_name || parentSubData.plan_name,
                          start_date: parentSubData.activated_at || parentSubData.start_date || parentSubData.startDate,
                          end_date: expiresAt,
                          expires_at: expiresAt,
                          activated_at: parentSubData.activated_at || parentSubData.created_at,
                          amount: parentSubData.package_price || parentSubData.amount,
                          currency: parentSubData.currency || 'EGP',
                          daysLeft: daysLeft,
                          isFromParent: true,
                          parentAccountType: parentAccountType,
                          parentAccountName: parentAccountName || 'غير محدد'
                        });

                        setIsUpdating(true);
                        setLastUpdateTime(new Date());
                        setTimeout(() => setIsUpdating(false), 2000);
                      }
                    },
                    (error) => {
                      console.error('❌ [Subscription Status] خطأ في listener اشتراك الحساب الأب:', error);
                    }
                  );

                  // حفظ unsubscribe function للتنظيف لاحقاً
                  setParentSubscriptionUnsubscribe(() => unsubscribeParentSubscription);
                } else {
                  // تنظيف listener السابق إن وجد
                  if (parentSubscriptionUnsubscribe) {
                    parentSubscriptionUnsubscribe();
                    setParentSubscriptionUnsubscribe(null);
                  }
                }
              } else {
                console.log('⚠️ [Subscription Status] الحساب الأب لا يملك اشتراك');
              }
            } else {
              console.log('⚠️ [Subscription Status] لم يتم العثور على بيانات الحساب الأب في users');
            }
          } catch (error) {
            console.error('❌ [Subscription Status] خطأ في جلب اشتراك الحساب الأب:', error);
          }
        }

        // 2. البحث في bulkPayments (المدفوعات الجماعية)
        console.log('🔍 البحث في bulkPayments collection...');
        const bulkPaymentsQuery = query(
          collection(db, 'bulkPayments'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(20)
        );

        const bulkPaymentsSnapshot = await getDocs(bulkPaymentsQuery);
        const paymentData: PaymentRecord[] = [];

        bulkPaymentsSnapshot.forEach((doc) => {
          const data = doc.data();
          paymentData.push({
            id: doc.id,
            amount: data.amount || 0,
            currency: data.currency || 'EGP',
            status: data.status === 'success' ? 'completed' :
              data.status === 'completed' ? 'completed' :
                data.status || 'pending',
            payment_date: data.createdAt || data.paymentDate,
            createdAt: data.createdAt,
            package_name: data.packageType || data.selectedPackage || 'باقة غير محددة',
            packageType: data.packageType || data.selectedPackage,
            transaction_id: data.transactionId,
            customer_name: data.userName || data.senderName || userData?.name,
            customer_email: data.userEmail || user?.email,
            receiptUrl: data.receiptUrl || data.receiptImage
          });
        });

        // 3. البحث في geidea_payments (البيانات الحقيقية من Geidea callbacks)
        if (paymentData.length === 0) {
          console.log('🔍 البحث في geidea_payments collection (بيانات Geidea الحقيقية)...');
          try {
            // البحث باستخدام customerEmail (الأكثر شيوعاً)
            const geideaPaymentsQueryByEmail = query(
              collection(db, 'geidea_payments'),
              where('customerEmail', '==', user?.email || ''),
              orderBy('callbackReceivedAt', 'desc'),
              limit(20)
            );

            const geideaPaymentsSnapshot = await getDocs(geideaPaymentsQueryByEmail);
            geideaPaymentsSnapshot.forEach((doc) => {
              const data = doc.data();
              // فقط المدفوعات الناجحة أو المعلقة
              if (data.status === 'success' || data.status === 'pending') {
                paymentData.push({
                  id: doc.id,
                  amount: data.amount || 0,
                  currency: data.currency || 'EGP',
                  status: data.status === 'success' ? 'completed' : 'pending',
                  payment_date: data.paidAt || data.callbackReceivedAt || data.createdAt,
                  createdAt: data.callbackReceivedAt || data.createdAt,
                  // ✨ استخدام اسم الباقة الفعلي من البيانات المثراة
                  package_name: data.plan_name || data.packageType || data.selectedPackage || 'اشتراك جيديا',
                  packageType: data.packageType || data.selectedPackage || 'geidea_subscription',
                  transaction_id: data.orderId || data.transactionId || data.merchantReferenceId || doc.id,
                  customer_name: data.customerName || userData?.name,
                  customer_email: data.customerEmail || user?.email,
                  receiptUrl: undefined,
                  source: 'geidea_payments'
                });
              }
            });

            if (geideaPaymentsSnapshot.empty) {
              console.log('ℹ️ لم يتم العثور على مدفوعات في geidea_payments باستخدام email');
            } else {
              console.log('✅ تم العثور على', geideaPaymentsSnapshot.docs.length, 'مدفوعة من geidea_payments');
            }
          } catch (geideaError) {
            console.warn('⚠️ خطأ في جلب البيانات من geidea_payments:', geideaError);
          }
        }

        // 4. البحث في bulk_payments (fallback)
        if (paymentData.length === 0) {
          console.log('🔍 البحث في bulk_payments collection...');
          const oldPaymentsQuery = query(
            collection(db, 'bulk_payments'),
            where('user_id', '==', user.uid),
            orderBy('payment_date', 'desc'),
            limit(20)
          );

          const oldPaymentsSnapshot = await getDocs(oldPaymentsQuery);
          oldPaymentsSnapshot.forEach((doc) => {
            const data = doc.data();
            paymentData.push({
              id: doc.id,
              amount: data.amount || 0,
              currency: data.currency || 'EGP',
              status: data.status === 'success' ? 'completed' :
                data.status === 'completed' ? 'completed' :
                  data.status || 'pending',
              payment_date: data.payment_date || data.createdAt,
              createdAt: data.createdAt,
              package_name: data.package_name || data.selectedPackage || 'باقة غير محددة',
              packageType: data.selectedPackage || data.package_name,
              transaction_id: data.transaction_id || data.transactionId,
              customer_name: data.customer_name || userData?.name,
              customer_email: data.customer_email || user?.email,
              receiptUrl: data.receipt_url || data.receiptUrl
            });
          });
        }

        setPayments(paymentData);
        console.log('✅ تم جلب', paymentData.length, 'دفعة');

        // إذا لم يكن هناك اشتراك في subscriptions ولكن هناك مدفوعات مكتملة
        // (نستخدم subscriptionRef بدلاً من subscription state لأن setState غير متزامن)
        const subscriptionDocCheckRef = doc(db, 'subscriptions', user.uid);
        const subscriptionDocCheck = await getDoc(subscriptionDocCheckRef);

        if (!subscriptionDocCheck.exists() && paymentData.length > 0) {
          const completedPayment = paymentData.find(p => p.status === 'completed' || p.status === 'success');
          if (completedPayment) {
            setSubscription({
              status: 'active',
              plan_name: completedPayment.package_name || 'باقة غير محددة',
              package_name: completedPayment.package_name || 'باقة غير محددة',
              packageType: completedPayment.packageType,
              daysLeft: 30 // افتراضي
            });
          }
        }

      } catch (err: any) {
        console.error('❌ خطأ في جلب بيانات الاشتراك:', err);
        setError('حدث خطأ في جلب بيانات الاشتراك');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionData();

    // 🔒 إعداد Real-time listener للمدفوعات - محمي بـ user.uid
    // ⚠️ مهم: هذا الاستعلام يجلب فقط مدفوعات المستخدم الحالي (user.uid)
    // لا يمكن للمستخدم رؤية مدفوعات مستخدمين آخرين
    const unsubscribePayments = onSnapshot(
      query(
        collection(db, 'bulkPayments'),
        where('userId', '==', user.uid), // 🔒 فلترة حسب user.uid - فصل تام للبيانات
        orderBy('createdAt', 'desc'),
        limit(10)
      ),
      (snapshot) => {
        const paymentData: PaymentRecord[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          paymentData.push({
            id: doc.id,
            amount: data.amount || 0,
            currency: data.currency || 'EGP',
            status: data.status === 'success' ? 'completed' :
              data.status === 'completed' ? 'completed' :
                data.status || 'pending',
            payment_date: data.createdAt || data.paymentDate,
            createdAt: data.createdAt,
            package_name: data.packageType || data.selectedPackage || 'باقة غير محددة',
            packageType: data.packageType || data.selectedPackage,
            transaction_id: data.transactionId,
            customer_name: data.userName || data.senderName || userData?.name,
            customer_email: data.userEmail || user?.email,
            receiptUrl: data.receiptUrl || data.receiptImage
          });
        });
        setPayments(prev => {
          // دمج البيانات الجديدة مع القديمة
          const merged = [...paymentData, ...prev];
          const unique = merged.filter((p, index, self) =>
            index === self.findIndex(t => t.id === p.id)
          );
          return unique.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() :
              a.payment_date?.toDate ? a.payment_date.toDate().getTime() : 0;
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() :
              b.payment_date?.toDate ? b.payment_date.toDate().getTime() : 0;
            return dateB - dateA;
          });
        });
      },
      (error) => {
        console.error('Error in payments listener:', error);
      }
    );

    // 🔒 إعداد Real-time listener للاشتراك - محمي بـ user.uid
    // ⚠️ مهم: هذا الاستماع فقط لوثيقة المستخدم الحالي (user.uid)
    // لا يمكن للمستخدم رؤية اشتراكات مستخدمين آخرين
    // 🔍 ملاحظة: للحسابات التابعة، يتم جلب اشتراك الحساب الأب في fetchSubscriptionData
    const unsubscribeSubscription = onSnapshot(
      doc(db, 'subscriptions', user.uid), // 🔒 وثيقة المستخدم الحالي فقط - فصل تام للبيانات
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const subData = docSnapshot.data();
          console.log('🔄 [Subscription Status] تم تحديث بيانات الاشتراك من Firestore:', {
            timestamp: new Date().toLocaleTimeString('ar-SA'),
            status: subData.status,
            package_name: subData.package_name || subData.plan_name,
            expires_at: subData.expires_at,
            activated_at: subData.activated_at
          });

          const expiresAt = subData.expires_at?.toDate ? subData.expires_at.toDate() :
            subData.end_date?.toDate ? subData.end_date.toDate() :
              subData.endDate?.toDate ? subData.endDate.toDate() : null;

          const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

          // عرض جميع الحالات كما يحددها الادمن (pending, completed, rejected, etc.)
          let finalStatus = subData.status || 'inactive';

          // إذا كانت الحالة active ولكن انتهت المدة، نغيرها إلى expired
          if (finalStatus === 'active' && daysLeft <= 0) {
            finalStatus = 'expired';
          }

          // الحفاظ على معلومات الحساب الأب من state الحالي (إن وجدت)
          const currentSubscription = subscription;

          const newSubscription = {
            status: finalStatus, // ⬅️ نعرض الحالة كما هي من الادمن
            plan_name: subData.plan_name || subData.package_name || 'باقة غير محددة',
            package_name: subData.package_name || subData.plan_name || 'باقة غير محددة',
            packageType: subData.packageType || subData.package_name || subData.plan_name,
            start_date: subData.activated_at || subData.start_date || subData.startDate,
            end_date: expiresAt,
            expires_at: expiresAt,
            activated_at: subData.activated_at || subData.created_at,
            amount: subData.package_price || subData.amount,
            currency: subData.currency || 'EGP',
            daysLeft: daysLeft,
            // الحفاظ على معلومات الحساب الأب من state الحالي (إن وجدت)
            isFromParent: currentSubscription?.isFromParent || false,
            parentAccountType: currentSubscription?.parentAccountType,
            parentAccountName: currentSubscription?.parentAccountName
          };

          console.log('✅ [Subscription Status] تم تحديث state بالبيانات الجديدة:', newSubscription);

          // مؤشر بصري للتحديث
          setIsUpdating(true);
          setLastUpdateTime(new Date());
          setSubscription(newSubscription);

          // إخفاء المؤشر بعد ثانيتين
          setTimeout(() => {
            setIsUpdating(false);
          }, 2000);
        } else {
          // إذا لم يكن هناك اشتراك خاص، نتحقق من الحساب الأب (لللاعبين التابعين)
          console.log('⚠️ [Subscription Status] لا يوجد اشتراك خاص - التحقق من الحساب الأب...');
          // ملاحظة: التحقق من الحساب الأب يتم في fetchSubscriptionData
          // هنا نحتفظ بالبيانات الموجودة في state (إن كانت من الحساب الأب)
          if (subscription?.isFromParent) {
            console.log('✅ [Subscription Status] الاشتراك من الحساب الأب - الحفاظ على البيانات');
            // لا نفعل شيئاً - نحتفظ بالبيانات الموجودة
          }
        }
      },
      (error) => {
        console.error('❌ [Subscription Status] خطأ في subscription listener:', error);
      }
    );

    return () => {
      unsubscribePayments();
      unsubscribeSubscription();
      // تنظيف listener الحساب الأب إن وجد
      if (parentSubscriptionUnsubscribe) {
        parentSubscriptionUnsubscribe();
        setParentSubscriptionUnsubscribe(null);
      }
    };
  }, [user?.uid, userData, accountType, parentSubscriptionUnsubscribe]);

  // عداد انتهاء ديناميكي يحدث كل ثانية
  useEffect(() => {
    if (!subscription?.expires_at) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const expiresAt = subscription.expires_at?.toDate
        ? subscription.expires_at.toDate()
        : subscription.expires_at instanceof Date
          ? subscription.expires_at
          : new Date(subscription.expires_at);

      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    // تحديث فوري
    updateCountdown();

    // تحديث كل ثانية
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [subscription?.expires_at]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, text: 'مكتمل' };
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, text: 'في الانتظار' };
      case 'failed':
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, text: 'فشل' };
      case 'cancelled':
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle, text: 'ملغي' };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: AlertCircle, text: status };
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'غير محدد';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'غير محدد';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="mt-4 text-gray-600">جاري تحميل بيانات الاشتراك...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* مؤشر التحديث الفوري */}
      {isUpdating && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-pulse">
          <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            <span className="text-sm font-medium">🔄 تم تحديث بيانات الاشتراك!</span>
            {lastUpdateTime && (
              <span className="text-xs opacity-75">
                {lastUpdateTime.toLocaleTimeString('ar-SA')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* عنوان الصفحة */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">حالة الاشتراك</h1>
          <p className="text-gray-600">عرض تفاصيل اشتراك {accountType === 'trainer' ? 'المدرب' : accountType}</p>
          {lastUpdateTime && (
            <p className="text-xs text-gray-400 mt-1">
              آخر تحديث: {lastUpdateTime.toLocaleTimeString('ar-SA')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 ml-2" />
            تصدير البيانات
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 ml-2" />
            طباعة التقرير
          </Button>
        </div>
      </div>

      {/* حالة الاشتراك الحالية */}
      {subscription && (
        <Card className={
          subscription.status === 'active' || subscription.status === 'completed' || subscription.status === 'success'
            ? 'border-green-500 border-2' :
            subscription.status === 'expired' || subscription.status === 'cancelled' || subscription.status === 'failed' || subscription.status === 'rejected'
              ? 'border-red-500 border-2' :
              subscription.status === 'pending' || subscription.status === 'processing' || subscription.status === 'waiting'
                ? 'border-yellow-500 border-2' :
                'border-gray-500 border-2'
        }>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <Zap className={`w-5 h-5 ${subscription.status === 'active' || subscription.status === 'completed' || subscription.status === 'success'
                ? 'text-green-600' :
                subscription.status === 'expired' || subscription.status === 'cancelled' || subscription.status === 'failed' || subscription.status === 'rejected'
                  ? 'text-red-600' :
                  subscription.status === 'pending' || subscription.status === 'processing' || subscription.status === 'waiting'
                    ? 'text-yellow-600' :
                    'text-gray-600'
                }`} />
              حالة الاشتراك الحالية
              {subscription.isFromParent && (
                <Badge className="mr-2 bg-blue-100 text-blue-800 border-blue-200 text-xs">
                  📋 من {subscription.parentAccountType === 'academy' ? 'أكاديمية' :
                    subscription.parentAccountType === 'club' ? 'نادي' :
                      subscription.parentAccountType === 'trainer' ? 'مدرب' :
                        subscription.parentAccountType === 'agent' ? 'وكيل' : 'حساب أب'}: {subscription.parentAccountName}
                </Badge>
              )}
              {subscription.activated_at && (
                <span className="text-xs text-gray-500 font-normal mr-2">
                  (تم التفعيل: {formatDate(subscription.activated_at)})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">الباقة</span>
                </div>
                <div className="text-xl font-bold text-blue-700">
                  {subscription.package_name || subscription.plan_name || 'غير محدد'}
                </div>
              </div>

              <div className={`p-4 rounded-lg ${subscription.status === 'active' || subscription.status === 'completed' || subscription.status === 'success'
                ? 'bg-gradient-to-br from-green-50 to-green-100' :
                subscription.status === 'expired' || subscription.status === 'cancelled' || subscription.status === 'failed' || subscription.status === 'rejected'
                  ? 'bg-gradient-to-br from-red-50 to-red-100' :
                  subscription.status === 'pending' || subscription.status === 'processing' || subscription.status === 'waiting'
                    ? 'bg-gradient-to-br from-yellow-50 to-yellow-100' :
                    'bg-gradient-to-br from-gray-50 to-gray-100'
                }`}>
                <div className="flex items-center gap-2 mb-2">
                  {subscription.status === 'active' || subscription.status === 'completed' || subscription.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : subscription.status === 'expired' || subscription.status === 'cancelled' || subscription.status === 'failed' || subscription.status === 'rejected' ? (
                    <XCircle className="w-5 h-5 text-red-600" />
                  ) : subscription.status === 'pending' || subscription.status === 'processing' || subscription.status === 'waiting' ? (
                    <Clock className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-600" />
                  )}
                  <span className="text-sm font-medium text-gray-700">الحالة</span>
                </div>
                <div className={`text-xl font-bold ${subscription.status === 'active' || subscription.status === 'completed' || subscription.status === 'success'
                  ? 'text-green-700' :
                  subscription.status === 'expired' || subscription.status === 'cancelled' || subscription.status === 'failed' || subscription.status === 'rejected'
                    ? 'text-red-700' :
                    subscription.status === 'pending' || subscription.status === 'processing' || subscription.status === 'waiting'
                      ? 'text-yellow-700' :
                      'text-gray-700'
                  }`}>
                  {subscription.status === 'active' ? 'مفعل' :
                    subscription.status === 'completed' ? 'مكتمل' :
                      subscription.status === 'success' ? 'ناجح' :
                        subscription.status === 'expired' ? 'منتهي' :
                          subscription.status === 'pending' ? 'قيد المراجعة' :
                            subscription.status === 'processing' ? 'قيد المعالجة' :
                              subscription.status === 'waiting' ? 'في الانتظار' :
                                subscription.status === 'cancelled' ? 'ملغي' :
                                  subscription.status === 'failed' ? 'فشل' :
                                    subscription.status === 'rejected' ? 'مرفوض' :
                                      subscription.status || 'غير محدد'}
                </div>
                {/* عداد انتهاء ديناميكي */}
                {countdown && subscription.status !== 'expired' && subscription.status !== 'cancelled' && subscription.status !== 'failed' && subscription.status !== 'rejected' && (
                  <div className="mt-2 p-2 bg-white/50 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">⏰ الوقت المتبقي:</div>
                    <div className="flex gap-1 text-sm font-bold text-gray-800">
                      {countdown.days > 0 && <span>{countdown.days} يوم</span>}
                      {countdown.hours > 0 && <span>{countdown.hours} ساعة</span>}
                      {countdown.minutes > 0 && <span>{countdown.minutes} دقيقة</span>}
                      <span>{countdown.seconds} ثانية</span>
                    </div>
                  </div>
                )}
                {subscription.daysLeft !== undefined && subscription.daysLeft >= 0 && !countdown && (
                  <div className="text-xs text-gray-600 mt-1">
                    {subscription.daysLeft > 0 ? `${subscription.daysLeft} يوم متبقي` : 'انتهى الاشتراك'}
                  </div>
                )}
              </div>

              {subscription.expires_at && (
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">تاريخ الانتهاء</span>
                  </div>
                  <div className="text-lg font-bold text-purple-700">
                    {formatDate(subscription.expires_at)}
                  </div>
                </div>
              )}

              {subscription.amount && (
                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">المبلغ المدفوع</span>
                  </div>
                  <div className="text-lg font-bold text-orange-700">
                    {subscription.amount.toLocaleString()} {subscription.currency || 'EGP'}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ملخص المدفوعات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            ملخص المدفوعات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{payments.length}</div>
              <div className="text-sm text-gray-600">إجمالي المدفوعات</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {payments.filter(p => p.status === 'completed' || p.status === 'success').length}
              </div>
              <div className="text-sm text-gray-600">المدفوعات المكتملة</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {payments.filter(p => p.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">المدفوعات المعلقة</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* قائمة المدفوعات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            سجل المدفوعات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">لا توجد مدفوعات مسجلة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => {
                const statusInfo = getStatusInfo(payment.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <div key={payment.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <CreditCard className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {payment.package_name || 'باقة غير محددة'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {payment.customer_name || userData?.name || 'غير محدد'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(payment.payment_date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {payment.amount} {payment.currency}
                        </div>
                        <Badge className={`mt-1 ${statusInfo.color}`}>
                          <StatusIcon className="w-3 h-3 ml-1" />
                          {statusInfo.text}
                        </Badge>
                      </div>
                    </div>
                    {payment.transaction_id && (
                      <div className="mt-2 text-xs text-gray-500">
                        رقم المعاملة: {payment.transaction_id}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionStatusPage;


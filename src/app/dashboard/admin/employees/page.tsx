'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { cn } from '@/lib/utils/index';
import { SUPPORTED_COUNTRIES, getCitiesByCountry, getCountryFromCity, searchCities } from '@/data/countries-from-register';
import { AccountTypeProtection } from '@/hooks/useAccountTypeAuth';
import { useAuth } from '@/lib/firebase/auth-provider';
import { auth, db } from '@/lib/firebase/config';
import { supabase } from '@/lib/supabase/config';
import { Employee, EmployeeRole, RolePermissions } from '@/types/employees';
import type { DateOrTimestamp } from '@/types/common';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowUpRight,
  Briefcase,
  Building2,
  Check,
  CheckCircle,
  Copy,
  Download,
  Edit,
  FileText,
  Globe,
  History,
  Image as ImageIcon,
  Key,
  LayoutGrid,
  List,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Sparkles,
  Table as TableIcon,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

// Zod Schema للتحقق من بيانات الموظف
const employeeSchema = z.object({
  name: z.string().min(2, 'الاسم يجب أن يكون على الأقل حرفين').max(100, 'الاسم طويل جداً'),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  phone: z.string().regex(/^\d{8,15}$/, 'رقم الهاتف يجب أن يحتوي على 8 إلى 15 رقمًا'),
  role: z.enum(['support', 'finance', 'sales', 'content', 'supervisor', 'admin'], {
    errorMap: () => ({ message: 'يرجى اختيار وظيفة صحيحة' })
  }),
  department: z.string().min(1, 'يرجى اختيار القسم'),
  birthDate: z.string().optional(),
  hireDate: z.string().optional(),
  salary: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'الراتب يجب أن يكون رقمًا صالحًا'
  }),
  supervisor: z.string().optional(),
  workStartTime: z.string().optional(),
  workEndTime: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  sendWelcomeEmail: z.boolean().optional()
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

type AvatarValue = Employee['avatar'] | string;

type EmployeeFormState = Partial<Employee> & {
  avatar?: AvatarValue;
  sendWelcomeEmail?: boolean;
};

const resolveAvatarUrl = (avatar?: AvatarValue): string | undefined => {
  if (!avatar) return undefined;
  return typeof avatar === 'string' ? avatar : avatar.url;
};

// الصلاحيات الافتراضية لكل دور وظيفي
const DEFAULT_PERMISSIONS: Record<EmployeeRole, RolePermissions> = {
  support: {
    canViewUsers: true,
    canEditUsers: false,
    canViewFinancials: false,
    canManagePayments: false,
    allowedLocations: [],
    canViewReports: false,
    canManageContent: false,
    canManageEmployees: false,
    canViewSupport: true,
    canManageSupport: true
  },
  finance: {
    canViewUsers: true,
    canEditUsers: false,
    canViewFinancials: true,
    canManagePayments: true,
    allowedLocations: [],
    canViewReports: true,
    canManageContent: false,
    canManageEmployees: false,
    canViewSupport: false,
    canManageSupport: false
  },
  sales: {
    canViewUsers: true,
    canEditUsers: false,
    canViewFinancials: false,
    canManagePayments: false,
    allowedLocations: [],
    canViewReports: true,
    canManageContent: false,
    canManageEmployees: false,
    canViewSupport: true,
    canManageSupport: false
  },
  content: {
    canViewUsers: false,
    canEditUsers: false,
    canViewFinancials: false,
    canManagePayments: false,
    allowedLocations: [],
    canViewReports: false,
    canManageContent: true,
    canManageEmployees: false,
    canViewSupport: false,
    canManageSupport: false
  },
  admin: {
    canViewUsers: true,
    canEditUsers: true,
    canViewFinancials: true,
    canManagePayments: true,
    allowedLocations: [],
    canViewReports: true,
    canManageContent: true,
    canManageEmployees: true,
    canViewSupport: true,
    canManageSupport: true
  },
  supervisor: {
    canViewUsers: true,
    canEditUsers: true,
    canViewFinancials: true,
    canManagePayments: false,
    allowedLocations: [],
    canViewReports: true,
    canManageContent: true,
    canManageEmployees: false,
    canViewSupport: true,
    canManageSupport: true
  }
};


export default function EmployeesManagement() {
  const { user, userData } = useAuth();

  // التحقق من الصلاحيات - نسخة مبسطة سهلة الصيانة
  const getUserRole = (): EmployeeRole => (userData?.role as EmployeeRole) || 'support';
  const hasPermission = (perm: keyof RolePermissions): boolean => {
    const role = getUserRole();
    return !!DEFAULT_PERMISSIONS[role]?.[perm];
  };

  const canEditEmployee = (): boolean => hasPermission('canManageEmployees') || hasPermission('canEditUsers');
  const canDeleteEmployee = (): boolean => hasPermission('canManageEmployees');
  const canAddEmployee = (): boolean => hasPermission('canManageEmployees');
  const canEditRole = (): boolean => hasPermission('canManageEmployees');

  // تحديث واجهة المستخدم لعرض الصلاحيات
  const renderEmployeeActions = (employee: Employee) => (
    <div className="flex gap-2 items-center">
      {canEditEmployee() && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditingEmployee(employee);
            setNewEmployee(employee);
            // تحميل جميع الدول الفريدة من locations
            const uniqueCountries = Array.from(new Set(
              employee.locations.map(loc => loc.countryName || loc.countryId).filter(Boolean)
            ));
            setSelectedCountries(uniqueCountries);
            setSelectedCities(employee.locations.map(loc => loc.cityName || loc.cityId));
            setShowAddDialog(true);
          }}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Edit className="w-4 h-4" />
        </Button>
      )}

      {canEditEmployee() && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSendPasswordReset(employee)}
          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
        >
          {resettingPasswordFor === employee.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Key className="w-4 h-4" />
          )}
        </Button>
      )}

      {canDeleteEmployee() && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDeleteEmployee(employee.id)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );

  // Add state for form errors
  const [formErrors, setFormErrors] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: ''
  });

  // تحسين دالة التحقق باستخدام Zod
  const validateForm = () => {
    try {
      // قراءة القيم من الحقول مباشرة أو من draftRef
      const nameVal = (document.querySelector('#emp_name') as HTMLInputElement | null)?.value || draftRef.current.name || newEmployee.name || '';
      const emailVal = (document.querySelector('#emp_email') as HTMLInputElement | null)?.value || draftRef.current.email || newEmployee.email || '';
      const phoneVal = (document.querySelector('#emp_phone') as HTMLInputElement | null)?.value || draftRef.current.phone || newEmployee.phone || '';
      const roleVal = (draftRef.current.role as string) || newEmployee.role || '';
      const deptVal = (draftRef.current.department as string) || newEmployee.department || '';

      console.log('🔍 التحقق من النموذج:', { nameVal, emailVal, phoneVal, roleVal, deptVal });

      const formData: Partial<EmployeeFormData> = {
        name: nameVal,
        email: emailVal,
        phone: phoneVal,
        role: roleVal as EmployeeRole,
        department: deptVal
      };

      // التحقق باستخدام Zod
      employeeSchema.parse(formData);

      // مسح الأخطاء
      setFormErrors({
        name: '',
        email: '',
        phone: '',
        role: '',
        department: ''
      });

      console.log('✅ نجح التحقق من النموذج');
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('❌ أخطاء التحقق:', error.errors);
        const errors = {
          name: '',
          email: '',
          phone: '',
          role: '',
          department: ''
        };

        error.errors.forEach((err) => {
          const path = err.path[0] as string;
          if (path in errors) {
            (errors as any)[path] = err.message;
          }
        });

        setFormErrors(errors);

        // عرض أول خطأ للمستخدم
        const firstError = error.errors[0];
        if (firstError) {
          console.error(`❌ خطأ في الحقل "${firstError.path[0]}": ${firstError.message}`);
          toast.error(firstError.message);
        }
      } else {
        console.error('❌ خطأ غير متوقع في التحقق:', error);
      }
      return false;
    }
  };

  // تحسين handlers باستخدام useCallback
  // مدمجة ضمن handleInputChange أسفلًا

  const handleSelectChange = useCallback((field: keyof Employee, value: string) => {
    setNewEmployee(prev => ({ ...prev, [field]: value }));

    // مسح خطأ الحقل عند التعديل
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [formErrors]);

  const handleCheckboxChange = useCallback((field: keyof Employee, checked: boolean) => {
    setNewEmployee(prev => ({ ...prev, [field]: checked }));
  }, []);

  // تحديث حقول الإدخال النصية بشكل موحّد
  const handleInputChange = useCallback((field: keyof Employee, value: string) => {
    setNewEmployee(prev => ({ ...prev, [field]: value }));
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [formErrors]);

  // تحديث نموذج إضافة/تعديل الموظف كمكوّن دالة بسيط
  // نموذج مبسط لتفادي أي تعقيد وإعادة تهيئة أثناء الكتابة
  // استخدام key prop لإعادة إنشاء المكون فقط عند فتح المودال أو تغيير الموظف
  function SimpleEmployeeForm() {
    // استخدام useState مع lazy initializer - key prop يضمن إعادة إنشاء المكون عند تغيير الموظف
    // قراءة editingEmployee مرة واحدة فقط عند mount (lazy initializer)
    // استخدام draftRef كقيمة احتياطية للحفاظ على البيانات عند إعادة التهيئة
    const [local, setLocal] = useState<EmployeeFormState>(() => {
      // حساب initial data مرة واحدة فقط عند mount
      // استخدام editingEmployee من closure - key prop يضمن إعادة إنشاء المكون عند تغييره
      const currentEmployee = editingEmployee;

      // إذا كان هناك بيانات محفوظة في draftRef (من جلسة سابقة)، استخدمها
      if (Object.keys(draftRef.current).length > 0 && !currentEmployee) {
        console.log('🔄 [SimpleEmployeeForm] استعادة البيانات من draftRef:', draftRef.current);
        return { ...draftRef.current };
      }

      if (currentEmployee) {
        return {
          name: currentEmployee.name || '',
          email: currentEmployee.email || '',
          phone: currentEmployee.phone || '',
          birthDate: currentEmployee.birthDate || '',
          role: currentEmployee.role || 'support',
          department: currentEmployee.department || '',
          hireDate: currentEmployee.hireDate || '',
          salary: (currentEmployee as any).salary || '',
          supervisor: currentEmployee.supervisor || '',
          workStartTime: currentEmployee.workStartTime || '09:00',
          workEndTime: currentEmployee.workEndTime || '17:00',
          notes: currentEmployee.notes || '',
          avatar: currentEmployee.avatar || '',
          isActive: currentEmployee.isActive !== false,
          sendWelcomeEmail: (currentEmployee as any).sendWelcomeEmail !== false
        };
      }
      return {
        name: '',
        email: '',
        phone: '',
        birthDate: '',
        role: 'support',
        department: '',
        hireDate: '',
        salary: '',
        supervisor: '',
        workStartTime: '09:00',
        workEndTime: '17:00',
        notes: '',
        avatar: '',
        isActive: true,
        sendWelcomeEmail: true
      };
    });

    // تحديث draftRef عند كل تغيير في local state
    useEffect(() => {
      draftRef.current = { ...local };
      console.log('🔄 [SimpleEmployeeForm] تم تحديث draftRef:', draftRef.current);
    }, [local]); // تحديث عند كل تغيير في local

    const localAvatarUrl = resolveAvatarUrl(local.avatar);

    const onInput = (field: keyof EmployeeFormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      // تقييد أنواع محددة أثناء الكتابة
      if (field === 'phone') {
        // أرقام فقط (تحذف أي رموز/حروف)
        value = value.replace(/\D/g, '');
      }
      if (field === 'salary') {
        // رقم عشري بسيط: يسمح بنقطة واحدة
        value = value.replace(/[^\d.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) {
          value = parts[0] + '.' + parts.slice(1).join('');
        }
      }
      setLocal(prev => { const next = { ...prev, [field]: value }; draftRef.current = next; return next; });
      if (formErrors[field as keyof typeof formErrors]) {
        setFormErrors(prev => ({ ...prev, [field]: '' }));
      }
    };

    const onCheckbox = (field: keyof EmployeeFormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocal(prev => { const next = { ...prev, [field]: e.target.checked }; draftRef.current = next; return next; });
    };

    const onSelect = (field: keyof Employee) => (value: string) => {
      setLocal(prev => { const next = { ...prev, [field]: value }; draftRef.current = next; return next; });
      if (formErrors[field as keyof typeof formErrors]) {
        setFormErrors(prev => ({ ...prev, [field]: '' }));
      }
    };

    return (
      <div className="py-4 space-y-6">
        {/* معلومات شخصية */}
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <div className="flex gap-3 items-center mb-4">
            <div className="flex justify-center items-center w-10 h-10 bg-blue-100 rounded-full">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">المعلومات الشخصية</h3>
              <p className="text-sm text-gray-600">البيانات الأساسية للموظف</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">الاسم الكامل *</Label>
              <Input
                id="emp_name"
                value={local.name as string}
                onChange={onInput('name')}
                placeholder="أدخل الاسم الكامل"
                className={`w-full h-11 text-sm sm:h-12 sm:text-base ${formErrors.name ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
                dir="rtl"
              />
              {formErrors.name && (
                <p className="text-sm text-red-500">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">البريد الإلكتروني *</Label>
              <Input
                id="emp_email"
                type="email"
                value={local.email as string}
                onChange={onInput('email')}
                placeholder="example@el7lm.com"
                className={`w-full h-11 text-sm sm:h-12 sm:text-base ${formErrors.email ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
                dir="ltr"
              />
              {formErrors.email && (
                <p className="text-sm text-red-500">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">رقم الهاتف *</Label>
              <Input
                id="emp_phone"
                type="tel"
                value={local.phone as string}
                onChange={onInput('phone')}
                placeholder="05xxxxxxxx"
                className={`w-full h-11 text-sm sm:h-12 sm:text-base text-left ${formErrors.phone ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
                dir="ltr"
              />
              {formErrors.phone && (
                <p className="text-sm text-red-500">{formErrors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">تاريخ الميلاد</Label>
              <Input
                id="emp_birth"
                type="date"
                value={(local.birthDate as string) || ''}
                onChange={onInput('birthDate')}
                className="w-full h-11 text-sm border-gray-300 sm:h-12 sm:text-base focus:border-blue-500"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium text-gray-700">الصورة الشخصية</Label>
              <div className="flex gap-4 items-center">
                {localAvatarUrl ? (
                  <div className="relative">
                    <img
                      src={localAvatarUrl}
                      alt="صورة الموظف"
                      className="object-cover w-20 h-20 rounded-full border-2 border-blue-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLocal(prev => ({ ...prev, avatar: undefined }));
                        draftRef.current = { ...draftRef.current, avatar: undefined };
                      }}
                      className="flex absolute -top-2 -right-2 justify-center items-center w-6 h-6 text-white bg-red-500 rounded-full hover:bg-red-600"
                      title="حذف الصورة"
                      aria-label="حذف الصورة"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-center items-center w-20 h-20 text-2xl font-semibold text-white bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full">
                    {(local.name as string)?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    title="رفع صورة الموظف"
                    aria-label="رفع صورة الموظف"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const avatarUrl = await handleAvatarUpload(file, editingEmployee?.id);
                        if (avatarUrl) {
                          setLocal(prev => ({ ...prev, avatar: avatarUrl }));
                          draftRef.current = { ...draftRef.current, avatar: avatarUrl };
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="w-full"
                  >
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="ml-2 w-4 h-4 animate-spin" />
                        جاري الرفع...
                      </>
                    ) : (
                      <>
                        <Upload className="ml-2 w-4 h-4" />
                        {localAvatarUrl ? 'تغيير الصورة' : 'رفع صورة'}
                      </>
                    )}
                  </Button>
                  <p className="mt-1 text-xs text-gray-500">الحد الأقصى: 5 ميجابايت (JPG, PNG, WEBP)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* معلومات العمل */}
        <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
          <div className="flex gap-3 items-center mb-4">
            <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-full">
              <Briefcase className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">معلومات العمل</h3>
              <p className="text-sm text-gray-600">الوظيفة والصلاحيات في المنصة</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">الوظيفة *</Label>
              <Select
                value={(local.role as string) || ''}
                onValueChange={onSelect('role')}
              >
                <SelectTrigger className={`w-full h-11 text-sm sm:h-12 sm:text-base ${formErrors.role ? 'border-red-500' : 'border-gray-300 focus:border-green-500'}`}>
                  <SelectValue placeholder="اختر الوظيفة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="support">دعم فني</SelectItem>
                  <SelectItem value="finance">مالية</SelectItem>
                  <SelectItem value="sales">مبيعات</SelectItem>
                  <SelectItem value="content">محتوى</SelectItem>
                  <SelectItem value="supervisor">مشرف</SelectItem>
                  <SelectItem value="admin">مدير نظام</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.role && (
                <p className="text-sm text-red-500">{formErrors.role}</p>
              )}

              {/* معاينة الصلاحيات */}
              {local.role && (
                <div className="p-3 mt-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="mb-2 text-xs font-semibold text-blue-900">الصلاحيات الممنوحة:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(DEFAULT_PERMISSIONS[local.role as EmployeeRole] || {}).map(([key, value]) => {
                      if (typeof value === 'boolean' && value) {
                        const permissionLabels: Record<string, string> = {
                          canViewUsers: 'عرض المستخدمين',
                          canEditUsers: 'تعديل المستخدمين',
                          canViewFinancials: 'عرض التقارير المالية',
                          canManagePayments: 'إدارة المدفوعات',
                          canViewReports: 'عرض التقارير',
                          canManageContent: 'إدارة المحتوى',
                          canManageEmployees: 'إدارة الموظفين',
                          canViewSupport: 'عرض تذاكر الدعم',
                          canManageSupport: 'إدارة تذاكر الدعم'
                        };
                        return (
                          <div key={key} className="flex gap-1 items-center">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-blue-800">{permissionLabels[key] || key}</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">القسم *</Label>
              <Select
                value={(local.department as string) || ''}
                onValueChange={onSelect('department')}
              >
                <SelectTrigger className={`w-full h-11 text-sm sm:h-12 sm:text-base ${formErrors.department ? 'border-red-500' : 'border-gray-300 focus:border-green-500'}`}>
                  <SelectValue placeholder="اختر القسم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="التقنية">التقنية</SelectItem>
                  <SelectItem value="المالية">المالية</SelectItem>
                  <SelectItem value="المبيعات">المبيعات</SelectItem>
                  <SelectItem value="المحتوى">المحتوى</SelectItem>
                  <SelectItem value="الدعم الفني">الدعم الفني</SelectItem>
                  <SelectItem value="الإدارة">الإدارة</SelectItem>
                  <SelectItem value="التسويق">التسويق</SelectItem>
                  <SelectItem value="الموارد البشرية">الموارد البشرية</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.department && (
                <p className="text-sm text-red-500">{formErrors.department}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">تاريخ التعيين</Label>
              <Input
                id="emp_hire"
                type="date"
                value={(local.hireDate as string) || ''}
                onChange={onInput('hireDate')}
                className="w-full h-11 text-sm border-gray-300 sm:h-12 sm:text-base focus:border-green-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">الراتب الشهري</Label>
              <Input
                id="emp_salary"
                type="text"
                inputMode="decimal"
                value={(local.salary as string) || ''}
                onChange={onInput('salary')}
                placeholder="0.00"
                className="w-full h-11 text-sm border-gray-300 sm:h-12 sm:text-base focus:border-green-500"
                dir="ltr"
              />
              <p className="text-xs text-gray-500">أدخل الراتب بالأرقام (مثال: 5000 أو 5000.50)</p>
            </div>
          </div>
        </div>

        {/* معلومات المنصة */}
        <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
          <div className="flex gap-3 items-center mb-4">
            <div className="flex justify-center items-center w-10 h-10 bg-purple-100 rounded-full">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">إعدادات المنصة</h3>
              <p className="text-sm text-gray-600">الصلاحيات والمناطق الجغرافية</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">المشرف المباشر</Label>
                <Select
                  value={(local.supervisor as string) || ''}
                  onValueChange={onSelect('supervisor')}
                >
                  <SelectTrigger className="w-full h-11 text-sm border-gray-300 sm:h-12 sm:text-base focus:border-purple-500">
                    <SelectValue placeholder="اختر المشرف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مشرف</SelectItem>
                    {employees.filter(emp => emp.role === 'supervisor' || emp.role === 'admin').map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} - {emp.role === 'admin' ? 'مدير نظام' : 'مشرف'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">ساعات العمل</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="emp_wstart"
                    type="time"
                    value={(local.workStartTime as string) || '09:00'}
                    onChange={onInput('workStartTime')}
                    className="flex-1 h-11 text-sm border-gray-300 sm:h-12 sm:text-base focus:border-purple-500"
                  />
                  <span className="flex items-center text-sm text-gray-500">إلى</span>
                  <Input
                    id="emp_wend"
                    type="time"
                    value={(local.workEndTime as string) || '17:00'}
                    onChange={onInput('workEndTime')}
                    className="flex-1 h-11 text-sm border-gray-300 sm:h-12 sm:text-base focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">المناطق الجغرافية *</Label>
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <LocationSelector />
              </div>
            </div>
          </div>
        </div>

        {/* معلومات إضافية */}
        <div className="p-6 bg-gradient-to-r from-gray-50 rounded-xl border border-gray-200 to-slate-50">
          <div className="flex gap-3 items-center mb-4">
            <div className="flex justify-center items-center w-10 h-10 bg-gray-100 rounded-full">
              <AlertCircle className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">معلومات إضافية</h3>
              <p className="text-sm text-gray-600">ملاحظات ومعلومات إضافية</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">الملاحظات</Label>
              <Input
                id="emp_notes"
                value={(local.notes as string) || ''}
                onChange={onInput('notes')}
                placeholder="أي ملاحظات إضافية حول الموظف..."
                className="w-full h-11 text-sm border-gray-300 sm:h-12 sm:text-base focus:border-gray-500"
              />
            </div>

            <div className="flex gap-4 items-center">
              <div className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  title="تفعيل الحساب فوراً"
                  checked={!!local.isActive}
                  onChange={onCheckbox('isActive')}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  تفعيل الحساب فوراً
                </Label>
              </div>

              <div className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  id="sendWelcomeEmail"
                  title="إرسال بريد ترحيبي"
                  checked={!!local.sendWelcomeEmail}
                  onChange={onCheckbox('sendWelcomeEmail')}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="sendWelcomeEmail" className="text-sm font-medium text-gray-700">
                  إرسال بريد ترحيبي
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* مزامنة الحالة المحلية إلى الحالة العامة عند الحفظ */}
        <div className="hidden">
          {/* عنصر مخفي يُحدَّث قبل الحفظ عبر handleSaveEmployee */}
        </div>
      </div>
    );
  }

  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'grid'>('cards');
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [citySearchQuery, setCitySearchQuery] = useState<string>('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [employeeActivities, setEmployeeActivities] = useState<any[]>([]);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [selectedEmployeeForActivity, setSelectedEmployeeForActivity] = useState<Employee | null>(null);
  const [resettingPasswordFor, setResettingPasswordFor] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState({
    action: '',
    durationMinutes: '',
    notes: ''
  });
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  // أحدث مسودّة للحقول من النموذج المبسط
  const draftRef = useRef<EmployeeFormState>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New employee form state
  const [newEmployee, setNewEmployee] = useState<EmployeeFormState>({
    name: '',
    email: '',
    phone: '',
    role: 'support',
    isActive: true,
    department: '',
    regions: []
  });

  // إضافة state للنافذة المنبثقة لبيانات الدخول
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [newUserCredentials, setNewUserCredentials] = useState<{
    email: string;
    password: string;
    phone?: string;
    authUserId?: string;
  } | null>(null);

  // Add state for sending credentials
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [credentialsCopied, setCredentialsCopied] = useState(false);

  // تحميل الدول والمدن - استخدام نفس الدوال من ملف اللاعبين
  const loadCountries = async () => {
    try {
      setLoadingLocations(true);
      // استخدام SUPPORTED_COUNTRIES مباشرة (نفس ما يستخدمه ملف اللاعبين)
      // إزالة التكرارات بناءً على اسم الدولة (name) وليس id لأن id قد يتكرر
      const uniqueCountries = SUPPORTED_COUNTRIES.filter((country, index, self) =>
        index === self.findIndex((c) => c.name === country.name)
      );
      setCountries(uniqueCountries);
      console.log(`✅ تم تحميل ${uniqueCountries.length} دولة`);
    } catch (error) {
      console.error('Error loading countries:', error);
      toast.error('حدث خطأ في تحميل بيانات المناطق');
      setCountries([]); // تعيين مصفوفة فارغة في حالة الخطأ
    } finally {
      setLoadingLocations(false);
    }
  };

  // تحديث المدن المتاحة عند تغيير الدول المختارة
  useEffect(() => {
    if (selectedCountries.length > 0) {
      try {
        // جمع المدن من جميع الدول المختارة
        const allCities: string[] = [];
        selectedCountries.forEach(countryName => {
          const cities = getCitiesByCountry(countryName);
          allCities.push(...cities);
        });
        // إزالة التكرارات
        const uniqueCities = Array.from(new Set(allCities));
        setAvailableCities(uniqueCities);
        console.log(`🗺️ تم تحديث المدن المتاحة لـ ${selectedCountries.length} دولة (${uniqueCities.length} مدينة)`);
      } catch (error) {
        console.warn('Error loading cities:', error);
        setAvailableCities([]);
      }
    } else {
      setAvailableCities([]);
    }
  }, [selectedCountries]);

  useEffect(() => {
    loadCountries();
  }, []);

  // Filter employees
  const filteredEmployees = employees.filter(employee => {
    const employeeName = employee.name || '';
    const employeeEmail = employee.email || '';
    const employeeDepartment = employee.department || '';

    const matchesSearch =
      employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employeeEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employeeDepartment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.phone || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && employee.isActive) ||
      (statusFilter === 'inactive' && !employee.isActive);

    return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
  });

  // Get unique departments
  const departments = useMemo(() => {
    return Array.from(new Set(employees.map(e => e.department).filter(Boolean))) as string[];
  }, [employees]);

  // Role labels
  const getRoleLabel = (role: EmployeeRole) => {
    const labels: Record<EmployeeRole, string> = {
      support: 'دعم فني',
      finance: 'مالية',
      sales: 'مبيعات',
      content: 'محتوى',
      supervisor: 'مشرف',
      admin: 'مدير نظام'
    };
    return labels[role] || role;
  };

  // Normalize allowed regions from the authenticated user
  const normalizedAllowedRegions = useMemo(() => {
    const regions = userData?.permissions?.allowedRegions;
    if (!regions || regions.length === 0) {
      return null;
    }

    return regions
      .map(region => ({
        countryId: (region?.countryId || '').toString().trim(),
        cityId: (region?.cityId || '').toString().trim()
      }))
      .filter(entry => entry.countryId || entry.cityId);
  }, [userData]);

  const hasRegionAccess = useCallback(
    (employee: Employee) => {
      if (userData?.accountType === 'admin') {
        return true;
      }

      if (!normalizedAllowedRegions || normalizedAllowedRegions.length === 0) {
        return true;
      }

      if (!employee.locations || employee.locations.length === 0) {
        return false;
      }

      return employee.locations.some(location => {
        const locationCountry = (location.countryId || location.countryName || '').toString().trim();
        const locationCity = (location.cityId || location.cityName || '').toString().trim();

        return normalizedAllowedRegions.some(region => {
          const matchesCountry = !region.countryId || region.countryId === locationCountry;
          const matchesCity = !region.cityId || region.cityId === locationCity;
          return matchesCountry && matchesCity;
        });
      });
    },
    [normalizedAllowedRegions, userData?.accountType]
  );

  const canViewAllEmployees = userData?.accountType === 'admin';

  // Load employees
  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const employeesRef = collection(db, 'employees');
      const employeesSnap = await getDocs(employeesRef);

      const employeesList: Employee[] = [];
      employeesSnap.forEach(employeeDoc => {
        employeesList.push({ id: employeeDoc.id, ...employeeDoc.data() } as Employee);
      });

      const filteredEmployees = showAllEmployees && canViewAllEmployees
        ? employeesList
        : employeesList.filter(emp => hasRegionAccess(emp));

      if (!showAllEmployees && filteredEmployees.length !== employeesList.length) {
        console.log(
          `👀 تم تصفية ${employeesList.length - filteredEmployees.length} موظف حسب المناطق المسموح لها`
        );
      }

      setEmployees(filteredEmployees);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  }, [hasRegionAccess, showAllEmployees, canViewAllEmployees]);

  useEffect(() => {
    if (!user || !userData) {
      return;
    }

    loadEmployees();
  }, [loadEmployees, user, userData]);

  // Chart data - توزيع الموظفين حسب الدور
  const roleDistributionData = useMemo(() => {
    const roleCounts: Record<string, number> = {};
    employees.forEach(emp => {
      const roleLabel = getRoleLabel(emp.role);
      roleCounts[roleLabel] = (roleCounts[roleLabel] || 0) + 1;
    });
    return Object.entries(roleCounts).map(([name, value]) => ({ name, value }));
  }, [employees]);

  // Chart data - توزيع الموظفين حسب القسم
  const departmentDistributionData = useMemo(() => {
    const deptCounts: Record<string, number> = {};
    employees.forEach(emp => {
      const dept = emp.department || 'غير محدد';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    return Object.entries(deptCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [employees]);

  // Colors for charts
  const CHART_COLORS = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
  ];

  // Export functions
  const exportToPDF = useCallback(() => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // العنوان
      pdf.setFontSize(18);
      pdf.text('تقرير الموظفين - منصة الحلم', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // التاريخ
      pdf.setFontSize(10);
      const date = new Date().toLocaleDateString('ar-EG');
      pdf.text(`تاريخ التقرير: ${date}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // الإحصائيات
      pdf.setFontSize(14);
      pdf.text('الإحصائيات', 20, yPosition);
      yPosition += 8;
      pdf.setFontSize(10);
      pdf.text(`إجمالي الموظفين: ${employees.length}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`موظفين نشطين: ${employees.filter(e => e.isActive).length}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`الأقسام: ${new Set(employees.map(e => e.department).filter(Boolean)).size}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`الوظائف: ${new Set(employees.map(e => e.role)).size}`, 20, yPosition);
      yPosition += 10;

      // جدول الموظفين
      pdf.setFontSize(14);
      pdf.text('قائمة الموظفين', 20, yPosition);
      yPosition += 8;

      // رؤوس الجدول
      pdf.setFontSize(9);
      const headers = ['الاسم', 'البريد', 'الوظيفة', 'القسم', 'الحالة'];
      const colWidths = [40, 50, 35, 35, 20];
      let xPosition = 20;

      pdf.setFillColor(200, 200, 200);
      pdf.rect(xPosition, yPosition - 5, pageWidth - 40, 8, 'F');
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');

      headers.forEach((header, index) => {
        pdf.text(header, xPosition + 2, yPosition);
        xPosition += colWidths[index];
      });

      yPosition += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);

      // بيانات الموظفين
      filteredEmployees.forEach((employee, index) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }

        xPosition = 20;
        const rowData = [
          employee.name || '-',
          employee.email || '-',
          getRoleLabel(employee.role),
          employee.department || '-',
          employee.isActive ? 'نشط' : 'غير نشط'
        ];

        rowData.forEach((data, colIndex) => {
          const text = String(data).substring(0, 20); // تقليل النص
          pdf.text(text, xPosition + 2, yPosition);
          xPosition += colWidths[colIndex];
        });

        yPosition += 6;
      });

      // حفظ الملف
      const fileName = `employees_report_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      toast.success('تم تصدير التقرير بنجاح');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('حدث خطأ أثناء تصدير التقرير');
    }
  }, [employees, filteredEmployees, getRoleLabel]);

  const exportToExcel = useCallback(() => {
    try {
      // إعداد البيانات
      const data = filteredEmployees.map(emp => ({
        'الاسم': emp.name || '',
        'البريد الإلكتروني': emp.email || '',
        'الهاتف': emp.phone || '',
        'الوظيفة': getRoleLabel(emp.role),
        'القسم': emp.department || '',
        'الراتب الشهري': (emp as any).salary ? `${Number((emp as any).salary).toLocaleString('ar-EG')} ر.ق` : 'غير محدد',
        'الحالة': emp.isActive ? 'نشط' : 'غير نشط',
        'المناطق': emp.locations?.map(loc => `${loc.cityName}, ${loc.countryName}`).join('; ') || '',
        'المشرف': emp.supervisor ? employees.find(e => e.id === emp.supervisor)?.name || '' : '',
        'تاريخ الإنشاء': emp.createdAt ? new Date(emp.createdAt as any).toLocaleDateString('ar-EG') : ''
      }));

      // إنشاء workbook
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'الموظفين');

      // إضافة ورقة إحصائيات
      const statsData = [
        ['الإحصائية', 'القيمة'],
        ['إجمالي الموظفين', employees.length],
        ['موظفين نشطين', employees.filter(e => e.isActive).length],
        ['الأقسام', new Set(employees.map(e => e.department).filter(Boolean)).size],
        ['الوظائف', new Set(employees.map(e => e.role)).size],
        ['تاريخ التقرير', new Date().toLocaleDateString('ar-EG')]
      ];
      const statsWs = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, statsWs, 'الإحصائيات');

      // حفظ الملف
      const fileName = `employees_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('تم تصدير التقرير بنجاح');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('حدث خطأ أثناء تصدير التقرير');
    }
  }, [employees, filteredEmployees, getRoleLabel]);

  // Upload avatar function
  const handleAvatarUpload = async (file: File, employeeId?: string) => {
    try {
      setUploadingAvatar(true);

      console.log('🔄 [Employee Avatar Upload] بدء رفع الصورة:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        employeeId: employeeId || 'new'
      });

      // التحقق من نوع الملف
      if (!file.type.startsWith('image/')) {
        toast.error('الملف المحدد ليس صورة');
        return;
      }

      // التحقق من حجم الملف (5MB)
      if (file.size > 5 * 1024 * 1024) {
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
        toast.error(`حجم الصورة كبير جداً (${fileSizeMB} ميجابايت). الحد الأقصى: 5 ميجابايت`);
        return;
      }

      // إنشاء اسم فريد للملف
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const fileName = employeeId
        ? `employees/${employeeId}.${fileExt}`
        : `employees/temp_${timestamp}.${fileExt}`;

      console.log('📤 [Employee Avatar Upload] رفع الصورة إلى Cloudflare R2:', {
        bucket: 'avatars',
        fileName,
        fileSize: file.size,
        fileType: file.type
      });

      const { storageManager } = await import('@/lib/storage');

      // رفع الصورة - استخدام bucket avatars لأنه موجود ومستخدم في المشروع
      // في R2، هذا سيقوم بالرفع إلى المجلد avatars/employees/...
      const result = await storageManager.upload('avatars', fileName, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type
      });

      if (!result?.publicUrl) {
        throw new Error('فشل في الحصول على رابط الصورة');
      }

      const publicUrl = result.publicUrl;
      console.log('✅ [Employee Avatar Upload] تم الرفع بنجاح:', publicUrl);

      toast.success('✅ تم رفع الصورة بنجاح');
      return publicUrl;
    } catch (error: any) {
      console.error('📋 [Employee Avatar Upload] تفاصيل الخطأ:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      toast.error(`حدث خطأ غير متوقع أثناء رفع الصورة: ${error?.message || 'خطأ غير معروف'}`);
      return;
    } finally {
      setUploadingAvatar(false);
    }
  };


  // Log activity function
  const logActivity = async (employeeId: string, action: string, details?: any) => {
    try {
      const activity = {
        employeeId,
        action,
        details: details || {},
        timestamp: new Date(),
        performedBy: user?.uid || 'system'
      };

      await setDoc(doc(collection(db, 'employee_activities')), activity);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // Load employee activities
  const loadEmployeeActivities = async (employeeId: string) => {
    try {
      const activitiesRef = collection(db, 'employee_activities');
      const q = query(activitiesRef, where('employeeId', '==', employeeId));
      const snapshot = await getDocs(q);

      const activities = snapshot.docs
        .map(doc => {
          const data = doc.data() as { timestamp?: DateOrTimestamp } & Record<string, unknown>;
          return {
            id: doc.id,
            ...data
          };
        })
        .sort((a, b) => {
          const aTime = (a.timestamp as DateOrTimestamp | undefined)?.seconds || 0;
          const bTime = (b.timestamp as DateOrTimestamp | undefined)?.seconds || 0;
          return bTime - aTime;
        });

      setEmployeeActivities(activities);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const handleOpenActivityLog = (employee: Employee) => {
    if (!hasRegionAccess(employee)) {
      toast.error('ليس لديك الصلاحية لعرض سجل هذا الموظف');
      return;
    }

    setSelectedEmployeeForActivity(employee);
    loadEmployeeActivities(employee.id);
    setShowActivityLog(true);
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return '0 د';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours} س ${mins} د`;
    }
    return `${mins} د`;
  };

  const totalActivityMinutes = useMemo(() => {
    return employeeActivities.reduce((sum, activity) => {
      const value = Number(activity?.details?.durationMinutes || 0);
      if (isNaN(value) || value <= 0) {
        return sum;
      }
      return sum + value;
    }, 0);
  }, [employeeActivities]);

  const handleAddActivityEntry = async () => {
    if (!selectedEmployeeForActivity) {
      toast.error('يرجى اختيار موظف أولاً');
      return;
    }

    if (!activityForm.action.trim()) {
      toast.error('يرجى كتابة وصف للحركة');
      return;
    }

    const durationMinutes = activityForm.durationMinutes ? Number(activityForm.durationMinutes) : 0;
    if (activityForm.durationMinutes && (isNaN(durationMinutes) || durationMinutes < 0)) {
      toast.error('يرجى إدخال زمن صالح بالأرقام');
      return;
    }

    setIsSavingActivity(true);
    try {
      await logActivity(selectedEmployeeForActivity.id, activityForm.action.trim(), {
        notes: activityForm.notes.trim() || undefined,
        durationMinutes: durationMinutes || undefined,
        recordedBy: user?.email || user?.uid || 'admin_panel'
      });

      setActivityForm({ action: '', durationMinutes: '', notes: '' });
      await loadEmployeeActivities(selectedEmployeeForActivity.id);
      toast.success('تم حفظ الحركة بنجاح');
    } catch (error) {
      console.error('Error saving activity entry:', error);
      toast.error('حدث خطأ أثناء حفظ الحركة');
    } finally {
      setIsSavingActivity(false);
    }
  };

  const handleSendPasswordReset = async (employee: Employee) => {
    if (!employee.email) {
      toast.error('لا يوجد بريد إلكتروني لهذا الموظف');
      return;
    }

    try {
      setResettingPasswordFor(employee.id);
      await sendPasswordResetEmail(auth, employee.email);
      toast.success('تم إرسال رابط تغيير كلمة المرور بنجاح');
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      if (error.code === 'auth/user-not-found') {
        toast.error('الموظف غير موجود في نظام المصادقة');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('تم إرسال العديد من الطلبات، حاول مجدداً لاحقاً');
      } else {
        toast.error(error.message || 'حدث خطأ أثناء إرسال الرابط');
      }
    } finally {
      setResettingPasswordFor(null);
    }
  };

  // Render employee card
  const renderEmployeeCard = (employee: Employee, compact: boolean = false) => {
    const employeeAvatarUrl = resolveAvatarUrl(employee.avatar);
    return (
      <div
        key={employee.id}
        className={cn(
          'bg-white rounded-2xl border shadow-sm transition border-slate-100 hover:border-blue-200 hover:shadow-md',
          compact ? 'p-4' : 'p-5'
        )}
      >
        <div className={cn('flex flex-col gap-3', compact ? '' : 'md:flex-row md:items-start md:justify-between')}>
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex justify-center items-center w-12 h-12 text-lg font-semibold text-white bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full">
                {employeeAvatarUrl ? (
                  <img
                    src={employeeAvatarUrl}
                    alt={employee.name}
                    className="object-cover w-12 h-12 rounded-full"
                  />
                ) : (
                  <span>{employee.name?.charAt(0) || 'U'}</span>
                )}
              </div>
              <div>
                <h3 className={cn('font-semibold text-slate-900', compact ? 'text-base' : 'text-lg')}>
                  {employee.name}
                </h3>
                <p className="text-sm text-slate-500">{employee.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center mt-3">
              <Badge variant="outline" className="text-xs">
                {getRoleLabel(employee.role)}
              </Badge>
              {employee.isActive ? (
                <Badge className="text-xs text-emerald-700 bg-emerald-50">
                  <CheckCircle className="ml-1 w-3 h-3" />
                  نشط
                </Badge>
              ) : (
                <Badge className="text-xs text-red-700 bg-red-50">
                  غير نشط
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className={cn('grid gap-4 mt-4', compact ? 'grid-cols-1' : 'md:grid-cols-2')}>
          <div>
            <p className="text-xs text-slate-500">القسم</p>
            <div className="flex gap-2 items-center mt-1">
              <Building2 className="w-4 h-4 text-purple-400" />
              <p className="text-sm font-medium text-slate-900">
                {employee.department || '—'}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500">الهاتف</p>
            <div className="flex gap-2 items-center mt-1">
              <Phone className="w-4 h-4 text-blue-400" />
              <a
                href={`tel:${employee.phone}`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                {employee.phone || '—'}
              </a>
            </div>
          </div>
          {(employee as any).salary && (
            <div>
              <p className="text-xs text-slate-500">الراتب الشهري</p>
              <div className="flex gap-2 items-center mt-1">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-700">
                  {Number((employee as any).salary).toLocaleString('ar-EG', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })} ر.ق
                </p>
              </div>
            </div>
          )}
          {(employee as any).birthDate && (
            <div>
              <p className="text-xs text-slate-500">تاريخ الميلاد</p>
              <div className="flex gap-2 items-center mt-1">
                <span className="text-sm font-medium text-slate-900">
                  {(employee as any).birthDate}
                </span>
              </div>
            </div>
          )}
          {(employee as any).hireDate && (
            <div>
              <p className="text-xs text-slate-500">تاريخ التوظيف</p>
              <div className="flex gap-2 items-center mt-1">
                <span className="text-sm font-medium text-slate-900">
                  {(employee as any).hireDate}
                </span>
              </div>
            </div>
          )}
          {((employee as any).workStartTime || (employee as any).workEndTime) && (
            <div>
              <p className="text-xs text-slate-500">ساعات العمل</p>
              <div className="flex gap-2 items-center mt-1">
                <span className="text-sm font-medium text-slate-900">
                  {(employee as any).workStartTime || '—'} - {(employee as any).workEndTime || '—'}
                </span>
              </div>
            </div>
          )}
          {(employee as any).notes && (
            <div className={compact ? '' : 'md:col-span-2'}>
              <p className="text-xs text-slate-500">ملاحظات</p>
              <div className="mt-1">
                <p className="text-sm text-slate-700 line-clamp-2">
                  {(employee as any).notes}
                </p>
              </div>
            </div>
          )}
          {employee.locations && employee.locations.length > 0 && (
            <div className={compact ? '' : 'md:col-span-2'}>
              <p className="text-xs text-slate-500">المناطق</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {employee.locations.slice(0, 3).map((loc, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {loc.cityName}
                  </Badge>
                ))}
                {employee.locations.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{employee.locations.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* بيانات تسجيل الدخول */}
          {((employee as any).loginMethods || employee.authUserId) && (
            <div className={compact ? '' : 'md:col-span-2'}>
              <div className="p-3 mt-2 bg-blue-50 rounded-lg border border-blue-100">
                <p className="mb-2 text-xs font-semibold text-blue-900">طرق تسجيل الدخول:</p>
                <div className="space-y-2">
                  {(employee as any).loginMethods?.email?.enabled && (
                    <div className="flex gap-2 items-center text-xs">
                      <Mail className="w-3 h-3 text-blue-600" />
                      <span className="text-blue-800">إيميل: {(employee as any).loginMethods.email.email || employee.email}</span>
                      {employee.authUserId && (
                        <Badge variant="outline" className="px-1 py-0 text-xs">✓ محفوظ</Badge>
                      )}
                    </div>
                  )}
                  {(employee as any).loginMethods?.whatsapp?.enabled && (
                    <div className="flex gap-2 items-center text-xs">
                      <Phone className="w-3 h-3 text-green-600" />
                      <span className="text-green-800">واتساب: {(employee as any).loginMethods.whatsapp.phone || employee.phone}</span>
                      <Badge variant="outline" className="px-1 py-0 text-xs">✓ محفوظ</Badge>
                    </div>
                  )}
                  {!((employee as any).loginMethods) && employee.authUserId && (
                    <div className="flex gap-2 items-center text-xs text-gray-600">
                      <Mail className="w-3 h-3" />
                      <span>إيميل: {employee.email}</span>
                      <Badge variant="outline" className="px-1 py-0 text-xs">✓ محفوظ</Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={cn('mt-5 flex flex-wrap gap-2', compact && 'gap-2')}>
          {canEditEmployee() && (
            <Button
              size="sm"
              variant="outline"
              className={cn('flex-1', compact && 'text-xs')}
              onClick={() => {
                setEditingEmployee(employee);
                setNewEmployee(employee);
                // setSelectedCountry removed - using setSelectedCountries instead
                setSelectedCities(employee.locations.map(loc => loc.cityName || loc.cityId));
                setShowAddDialog(true);
              }}
            >
              <Edit className="ml-2 w-4 h-4" />
              تعديل
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className={cn('flex-1', compact && 'text-xs')}
            onClick={() => handleOpenActivityLog(employee)}
          >
            <History className="ml-2 w-4 h-4" />
            السجل
          </Button>
          {canEditEmployee() && (
            <Button
              size="sm"
              variant="outline"
              className={cn('flex-1', compact && 'text-xs', 'text-orange-700 border-orange-200 hover:bg-orange-50')}
              onClick={() => handleSendPasswordReset(employee)}
              disabled={resettingPasswordFor === employee.id}
            >
              {resettingPasswordFor === employee.id ? (
                <>
                  <Loader2 className="ml-2 w-4 h-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Key className="ml-2 w-4 h-4" />
                  إرسال رابط تغيير كلمة المرور
                </>
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className={cn('flex-1', compact && 'text-xs')}
            onClick={async () => {
              const employeeData = `
الاسم: ${employee.name}
البريد: ${employee.email}
الهاتف: ${employee.phone || '-'}
الوظيفة: ${getRoleLabel(employee.role)}
القسم: ${employee.department || '-'}
الراتب: ${(employee as any).salary ? `${Number((employee as any).salary).toLocaleString('ar-EG')} ر.ق` : 'غير محدد'}
تاريخ الميلاد: ${(employee as any).birthDate || '-'}
تاريخ التوظيف: ${(employee as any).hireDate || '-'}
ساعات العمل: ${(employee as any).workStartTime || '—'} - ${(employee as any).workEndTime || '—'}
الحالة: ${employee.isActive ? 'نشط' : 'غير نشط'}
المناطق: ${employee.locations?.map(loc => `${loc.cityName}, ${loc.countryName}`).join('; ') || '-'}
المشرف: ${employee.supervisor ? employees.find(e => e.id === employee.supervisor)?.name || '-' : 'بدون مشرف'}
${(employee as any).notes ? `ملاحظات: ${(employee as any).notes}` : ''}
              `.trim();
              await navigator.clipboard.writeText(employeeData);
              toast.success('تم نسخ بيانات الموظف');
            }}
          >
            <Copy className="ml-2 w-4 h-4" />
            نسخ
          </Button>
          {canDeleteEmployee() && (
            <Button
              size="sm"
              variant="outline"
              className={cn('flex-1 text-red-600 border-red-200 hover:bg-red-50', compact && 'text-xs')}
              onClick={() => handleDeleteEmployee(employee.id)}
            >
              <Trash2 className="ml-2 w-4 h-4" />
              حذف
            </Button>
          )}
        </div>
      </div>
    );
  };

  // تحديث مكون اختيار المناطق - اختيار متعدد للدول
  function LocationSelector() {
    // معالج اختيار/إلغاء اختيار دولة
    const handleCountryToggle = (countryName: string) => {
      if (selectedCountries.includes(countryName)) {
        setSelectedCountries(prev => prev.filter(c => c !== countryName));
        // إزالة المدن التي تنتمي للدولة المحذوفة
        const citiesToRemove = getCitiesByCountry(countryName);
        setSelectedCities(prev => prev.filter(city => !citiesToRemove.includes(city)));
      } else {
        setSelectedCountries(prev => [...prev, countryName]);
      }
    };

    // معالج البحث في المدن
    const handleCitySearch = (query: string) => {
      setCitySearchQuery(query);

      if (query.length > 0) {
        // البحث في جميع الدول المختارة
        const allSearchResults: string[] = [];
        if (selectedCountries.length > 0) {
          selectedCountries.forEach(countryName => {
            const results = searchCities(query, countryName);
            allSearchResults.push(...results);
          });
        } else {
          const results = searchCities(query);
          allSearchResults.push(...results);
        }
        // إزالة التكرارات
        const uniqueResults = Array.from(new Set(allSearchResults));
        setAvailableCities(uniqueResults);
        setShowCityDropdown(true);
      } else {
        // إعادة تحميل المدن من جميع الدول المختارة
        if (selectedCountries.length > 0) {
          const allCities: string[] = [];
          selectedCountries.forEach(countryName => {
            const cities = getCitiesByCountry(countryName);
            allCities.push(...cities);
          });
          setAvailableCities(Array.from(new Set(allCities)));
        }
        setShowCityDropdown(false);
      }
    };

    // معالج اختيار/إلغاء اختيار مدينة
    const handleCityToggle = (city: string) => {
      if (selectedCities.includes(city)) {
        setSelectedCities(prev => prev.filter(c => c !== city));
      } else {
        setSelectedCities(prev => [...prev, city]);
      }
      setCitySearchQuery('');
      setShowCityDropdown(false);
    };

    // معالج اختيار كل الدول
    const handleSelectAllCountries = () => {
      if (countries && Array.isArray(countries)) {
        const allCountryNames = countries.map(c => c.name);
        setSelectedCountries(allCountryNames);
      }
    };

    // معالج إلغاء اختيار كل الدول
    const handleDeselectAllCountries = () => {
      setSelectedCountries([]);
      setSelectedCities([]); // إزالة المدن أيضاً عند إلغاء اختيار كل الدول
    };

    // معالج اختيار كل المدن المتاحة
    const handleSelectAllCities = () => {
      if (availableCities && Array.isArray(availableCities)) {
        setSelectedCities(availableCities);
      }
    };

    // معالج إلغاء اختيار كل المدن
    const handleDeselectAllCities = () => {
      setSelectedCities([]);
    };

    // التحقق من اختيار كل الدول
    const allCountriesSelected = countries && Array.isArray(countries) &&
      selectedCountries.length === countries.length &&
      countries.every(c => selectedCountries.includes(c.name));

    // التحقق من اختيار كل المدن المتاحة
    const allCitiesSelected = availableCities && Array.isArray(availableCities) &&
      availableCities.length > 0 &&
      availableCities.every(city => selectedCities.includes(city));

    return (
      <div className="space-y-4">
        <div className="grid gap-2">
          <div className="flex justify-between items-center">
            <Label>الدول *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={allCountriesSelected ? handleDeselectAllCountries : handleSelectAllCountries}
                className="h-7 text-xs"
              >
                {allCountriesSelected ? 'إلغاء الكل' : 'اختيار الكل'}
              </Button>
            </div>
          </div>
          <div className="grid overflow-y-auto grid-cols-2 gap-2 p-3 max-h-48 rounded-lg border">
            {countries && Array.isArray(countries) && countries.length > 0 ? (
              countries.map((country, index) => (
                <div key={`country-${country.name}-${index}-${country.id || index}`} className="flex gap-2 items-center">
                  <Checkbox
                    id={`country-${country.name}-${index}`}
                    checked={selectedCountries.includes(country.name)}
                    onCheckedChange={() => handleCountryToggle(country.name)}
                  />
                  <label
                    htmlFor={`country-${country.name}-${index}`}
                    className="flex gap-2 items-center text-sm cursor-pointer select-none"
                  >
                    <span className="text-xl">{country.flag || '🏳️'}</span>
                    <span>{country.name}</span>
                  </label>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-4 text-sm text-center text-gray-500">
                جاري تحميل الدول...
              </div>
            )}
          </div>

          {/* الدول المختارة */}
          {selectedCountries.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
              <span className="text-xs text-gray-600">الدول المختارة:</span>
              {selectedCountries.map((country) => (
                <Badge
                  key={country}
                  variant="secondary"
                  className="flex gap-1 items-center px-2 py-1 bg-green-100"
                >
                  {country}
                  <button
                    type="button"
                    onClick={() => handleCountryToggle(country)}
                    className="ml-1 hover:text-red-600"
                    title="إزالة الدولة"
                    aria-label="إزالة الدولة"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {selectedCountries.length > 0 && (
          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <Label>المدن *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={allCitiesSelected ? handleDeselectAllCities : handleSelectAllCities}
                  className="h-7 text-xs"
                  disabled={!availableCities || !Array.isArray(availableCities) || availableCities.length === 0}
                >
                  {allCitiesSelected ? 'إلغاء الكل' : 'اختيار الكل'}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {/* حقل البحث */}
              <div className="relative">
                <Input
                  placeholder="ابحث عن مدينة..."
                  value={citySearchQuery}
                  onChange={(e) => handleCitySearch(e.target.value)}
                  onFocus={() => {
                    if (availableCities && Array.isArray(availableCities) && availableCities.length > 0) {
                      setShowCityDropdown(true);
                    }
                  }}
                  className="w-full h-11 text-sm sm:h-12 sm:text-base"
                />
                {showCityDropdown && availableCities && Array.isArray(availableCities) && availableCities.length > 0 && (
                  <div className="overflow-y-auto absolute z-50 mt-1 w-full max-h-48 bg-white rounded-lg border shadow-lg">
                    {availableCities.map((city) => (
                      <div
                        key={city}
                        className="flex gap-2 items-center px-4 py-2 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleCityToggle(city)}
                      >
                        <Checkbox
                          checked={selectedCities.includes(city)}
                          onCheckedChange={() => handleCityToggle(city)}
                        />
                        <span className="text-sm">{city}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* المدن المختارة */}
              {selectedCities.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  {selectedCities.map((city) => (
                    <Badge
                      key={city}
                      variant="secondary"
                      className="flex gap-1 items-center px-2 py-1"
                    >
                      {city}
                      <button
                        type="button"
                        onClick={() => handleCityToggle(city)}
                        className="ml-1 hover:text-red-600"
                        title="إزالة المدينة"
                        aria-label="إزالة المدينة"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* قائمة المدن المتاحة (عند عدم وجود بحث) */}
              {!citySearchQuery && availableCities && Array.isArray(availableCities) && availableCities.length > 0 && (
                <div className="grid overflow-y-auto grid-cols-2 gap-2 p-3 max-h-48 rounded-lg border">
                  {availableCities.slice(0, 20).map((city) => (
                    <div key={city} className="flex gap-2 items-center">
                      <Checkbox
                        id={`city-${city}`}
                        checked={selectedCities.includes(city)}
                        onCheckedChange={() => handleCityToggle(city)}
                      />
                      <label
                        htmlFor={`city-${city}`}
                        className="text-sm cursor-pointer select-none"
                      >
                        {city}
                      </label>
                    </div>
                  ))}
                  {availableCities.length > 20 && (
                    <div className="col-span-2 text-xs text-center text-gray-500">
                      و {availableCities.length - 20} مدينة أخرى - استخدم البحث للعثور عليها
                    </div>
                  )}
                </div>
              )}

              {selectedCountries.length > 0 && (!availableCities || !Array.isArray(availableCities) || availableCities.length === 0) && !citySearchQuery && (
                <div className="flex gap-2 items-center p-4 text-sm text-yellow-600 bg-yellow-50 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span>لا توجد مدن مضافة للدول المختارة</span>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedCountries.length === 0 && (
          <div className="p-3 text-sm text-gray-500 bg-gray-50 rounded-lg">
            يرجى اختيار دولة واحدة على الأقل لعرض المدن المتاحة
          </div>
        )}
      </div>
    );
  }

  // دالة لإنشاء كلمة مرور بسيطة
  const generateStrongPassword = () => {
    // كلمة مرور بسيطة: 8 أحرف فقط (أحرف صغيرة وأرقام)
    const length = 8;
    const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";

    // إضافة رقم واحد على الأقل
    password += "0123456789"[Math.floor(Math.random() * 10)];

    // إكمال باقي الأحرف عشوائياً
    for (let i = 1; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // خلط الأحرف
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  // تحديث دالة حفظ الموظف
  const savingRef = useRef(false);
  const handleSaveEmployee = async () => {
    try {
      if (savingRef.current) {
        console.log('⚠️ [Save Employee] العملية قيد التنفيذ بالفعل، تم تجاهل الطلب');
        return; // منع الضغط المزدوج
      }
      savingRef.current = true;
      console.log('🔄 [Save Employee] بدء عملية حفظ الموظف...', {
        editingEmployee: editingEmployee?.id || 'new',
        draftRef: draftRef.current,
        selectedCountries: selectedCountries.length,
        selectedCities: selectedCities.length
      });

      // Validate form
      if (!validateForm()) {
        console.log('❌ فشل في التحقق من صحة النموذج');
        console.log('📋 بيانات النموذج:', {
          name: draftRef.current.name || newEmployee.name,
          email: draftRef.current.email || newEmployee.email,
          phone: draftRef.current.phone || newEmployee.phone,
          role: draftRef.current.role || newEmployee.role,
          department: draftRef.current.department || newEmployee.department,
          selectedCountries: selectedCountries.length,
          selectedCities: selectedCities.length
        });
        savingRef.current = false; // إعادة تعيين savingRef عند الفشل
        return;
      }

      // لا نحتاج مزامنة الحالة لأن SimpleEmployeeForm يستخدم draftRef مباشرة
      // draftRef يتم تحديثه تلقائياً عند كل تغيير في الحقول

      // قراءة أحدث قيم من الحقول مباشرة أو من draftRef
      const nameVal = (document.querySelector('#emp_name') as HTMLInputElement | null)?.value || draftRef.current.name || newEmployee.name || '';
      const emailVal = (document.querySelector('#emp_email') as HTMLInputElement | null)?.value || draftRef.current.email || newEmployee.email || '';
      const phoneVal = (document.querySelector('#emp_phone') as HTMLInputElement | null)?.value || draftRef.current.phone || newEmployee.phone || '';
      const roleVal = (draftRef.current.role as string) || newEmployee.role || '';
      const deptVal = (draftRef.current.department as string) || newEmployee.department || '';

      console.log('📋 [Save Employee] القيم المقروءة:', {
        nameVal,
        emailVal,
        phoneVal,
        roleVal,
        deptVal,
        selectedCountries: selectedCountries.length,
        selectedCities: selectedCities.length
      });

      // Validate required fields
      if (!nameVal.trim()) {
        toast.error('يرجى إدخال اسم الموظف');
        savingRef.current = false;
        return;
      }

      if (!emailVal.trim()) {
        toast.error('يرجى إدخال البريد الإلكتروني');
        savingRef.current = false;
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailVal)) {
        toast.error('يرجى إدخال بريد إلكتروني صحيح');
        savingRef.current = false;
        return;
      }

      if (!phoneVal.trim()) {
        toast.error('يرجى إدخال رقم الهاتف');
        savingRef.current = false;
        return;
      }

      // phone: 8-15 digits
      if (!/^\d{8,15}$/.test(phoneVal)) {
        toast.error('رقم الهاتف يجب أن يحتوي على 8 إلى 15 رقمًا');
        savingRef.current = false;
        return;
      }

      // salary (اختياري): رقم صالح
      const salaryStr = (draftRef.current.salary as string) || '';
      if (salaryStr && isNaN(Number(salaryStr))) {
        toast.error('الراتب يجب أن يكون رقمًا صالحًا');
        savingRef.current = false;
        return;
      }

      if (!roleVal) {
        toast.error('يرجى اختيار الوظيفة');
        savingRef.current = false;
        return;
      }

      if (!deptVal?.trim()) {
        toast.error('يرجى اختيار القسم');
        savingRef.current = false;
        return;
      }

      if (selectedCountries.length === 0) {
        toast.error('يرجى اختيار دولة واحدة على الأقل');
        savingRef.current = false;
        return;
      }

      if (selectedCities.length === 0) {
        toast.error('يرجى اختيار مدينة واحدة على الأقل');
        savingRef.current = false;
        return;
      }

      console.log('✅ تم التحقق من صحة البيانات بنجاح');

      // Check if email already exists in employees collection
      const emailQuery = query(
        collection(db, 'employees'),
        where('email', '==', emailVal)
      );
      const emailQuerySnapshot = await getDocs(emailQuery);

      if (!editingEmployee && !emailQuerySnapshot.empty) {
        toast.error('البريد الإلكتروني مستخدم بالفعل');
        savingRef.current = false;
        return;
      }

      let authUserId = '';

      if (!editingEmployee) {
        try {
          console.log('🔄 بدء إنشاء موظف جديد...');

          // Generate strong password
          const tempPassword = generateStrongPassword();
          console.log('🔑 تم إنشاء كلمة مرور مؤقتة');

          // Prepare employee data first - استخدام القيم من draftRef
          const employeeData: any = {
            name: nameVal,
            email: emailVal,
            phone: phoneVal,
            role: roleVal as EmployeeRole,
            department: deptVal,
            permissions: DEFAULT_PERMISSIONS[roleVal as EmployeeRole],
            avatar: (draftRef.current.avatar as any) || '',
            createdAt: new Date(),
            isActive: true,
            locations: selectedCities.map(cityName => {
              // استخدام نفس المنطق من ملف اللاعبين - أسماء المدن مباشرة
              // تحديد الدولة من المدينة أو استخدام أول دولة مختارة
              const detectedCountry = getCountryFromCity(cityName) || selectedCountries[0] || '';
              return {
                countryId: detectedCountry,
                countryName: detectedCountry,
                cityId: cityName, // استخدام اسم المدينة كـ ID
                cityName: cityName
              };
            })
          };

          // إضافة الحقول الإضافية إذا كانت موجودة
          if (draftRef.current.birthDate) {
            employeeData.birthDate = draftRef.current.birthDate;
          }
          if (draftRef.current.hireDate) {
            employeeData.hireDate = draftRef.current.hireDate;
          }
          if (draftRef.current.salary) {
            employeeData.salary = draftRef.current.salary;
          }
          if (draftRef.current.supervisor) {
            employeeData.supervisor = draftRef.current.supervisor;
          }
          if (draftRef.current.workStartTime) {
            employeeData.workStartTime = draftRef.current.workStartTime;
          }
          if (draftRef.current.workEndTime) {
            employeeData.workEndTime = draftRef.current.workEndTime;
          }
          if (draftRef.current.notes) {
            employeeData.notes = draftRef.current.notes;
          }

          console.log('📋 بيانات الموظف المحضرة:', employeeData);

          // Create Firestore document first
          const employeeRef = doc(collection(db, 'employees'));
          console.log('📄 إنشاء مستند Firestore...');
          await setDoc(employeeRef, employeeData);
          console.log('✅ تم إنشاء مستند Firestore بنجاح');

          // Try to create auth account
          try {
            console.log('🔐 إنشاء حساب Firebase Auth...');
            const userCredential = await createUserWithEmailAndPassword(
              auth,
              emailVal,
              tempPassword
            );

            authUserId = userCredential.user.uid;
            console.log('✅ تم إنشاء حساب Firebase Auth بنجاح:', authUserId);

            // Update document with auth ID, avatar, and login methods
            console.log('🔄 تحديث مستند الموظف بـ Auth ID وبيانات تسجيل الدخول...');
            const loginMethodsData = {
              email: {
                enabled: true,
                email: emailVal,
                authUserId: authUserId,
                createdAt: new Date()
              },
              whatsapp: {
                enabled: true,
                phone: phoneVal,
                formattedPhone: phoneVal.startsWith('+') ? phoneVal : `+${phoneVal}`,
                createdAt: new Date()
              }
            };

            console.log('📋 بيانات تسجيل الدخول المراد حفظها:', JSON.stringify(loginMethodsData, null, 2));

            await updateDoc(employeeRef, {
              authUserId: authUserId,
              avatar: (draftRef.current.avatar as any) || employeeData.avatar,
              loginMethods: loginMethodsData
            });

            // التحقق من الحفظ
            const savedDoc = await getDoc(employeeRef);
            const savedData = savedDoc.data();
            console.log('✅ تم تحديث مستند الموظف بنجاح');
            console.log('📊 بيانات تسجيل الدخول المحفوظة في قاعدة البيانات:', JSON.stringify(savedData?.loginMethods, null, 2));
            console.log('🆔 Auth User ID المحفوظ:', savedData?.authUserId);

            // Log activity
            await logActivity(employeeRef.id, 'تم إنشاء موظف جديد', {
              name: nameVal,
              email: emailVal,
              role: roleVal,
              createdBy: user?.email || 'system'
            });

            // Send password reset email
            console.log('📧 إرسال بريد إعادة تعيين كلمة المرور...');
            await sendPasswordResetEmail(auth, emailVal);
            console.log('✅ تم إرسال بريد إعادة تعيين كلمة المرور');

            // Save credentials for display
            setNewUserCredentials({
              email: emailVal,
              password: tempPassword,
              phone: phoneVal,
              authUserId: authUserId
            });

            setShowCredentialsDialog(true);
            toast.success('تم إنشاء الحساب بنجاح');
            console.log('🎉 تم إنشاء الموظف بنجاح!');

          } catch (authError: any) {
            console.error('Firebase Auth Error:', authError);

            // If auth creation fails, delete the employee document
            await deleteDoc(employeeRef);

            if (authError.code === 'auth/email-already-in-use') {
              // Special handling for existing email
              const existingUserQuery = query(
                collection(db, 'employees'),
                where('email', '==', newEmployee.email)
              );
              const existingUserSnapshot = await getDocs(existingUserQuery);

              if (existingUserSnapshot.empty) {
                // Email exists in Auth but not in employees collection
                toast.error('البريد الإلكتروني مسجل في النظام ولكن غير مرتبط بموظف. يرجى استخدام بريد إلكتروني آخر.');
              } else {
                toast.error('البريد الإلكتروني مستخدم بالفعل');
              }
            } else if (authError.code === 'auth/invalid-email') {
              toast.error('البريد الإلكتروني غير صالح');
            } else if (authError.code === 'auth/operation-not-allowed') {
              toast.error('تم تعطيل إنشاء الحسابات بالبريد الإلكتروني وكلمة المرور');
            } else if (authError.code === 'auth/weak-password') {
              toast.error('كلمة المرور ضعيفة جداً');
            } else {
              toast.error('حدث خطأ أثناء إنشاء الحساب');
            }
            savingRef.current = false;
            return;
          }

        } catch (error) {
          console.error('Error creating employee:', error);
          toast.error('حدث خطأ أثناء إنشاء الموظف');
          savingRef.current = false;
          return;
        }
      } else {
        // Update existing employee
        try {
          const employeeData: any = {
            name: nameVal,
            phone: phoneVal,
            role: roleVal as EmployeeRole,
            department: deptVal,
            permissions: DEFAULT_PERMISSIONS[roleVal as EmployeeRole],
            avatar: (draftRef.current.avatar as any) || '',
            locations: selectedCities.map(cityName => {
              // استخدام نفس المنطق من ملف اللاعبين - أسماء المدن مباشرة
              // تحديد الدولة من المدينة أو استخدام أول دولة مختارة
              const detectedCountry = getCountryFromCity(cityName) || selectedCountries[0] || '';
              return {
                countryId: detectedCountry,
                countryName: detectedCountry,
                cityId: cityName, // استخدام اسم المدينة كـ ID
                cityName: cityName
              };
            }),
            // تحديث بيانات تسجيل الدخول
            loginMethods: {
              email: {
                enabled: true,
                email: emailVal,
                authUserId: editingEmployee.authUserId || '',
                updatedAt: new Date()
              },
              whatsapp: {
                enabled: true,
                phone: phoneVal,
                formattedPhone: phoneVal.startsWith('+') ? phoneVal : `+${phoneVal}`,
                updatedAt: new Date()
              }
            }
          };

          // إضافة الحقول الإضافية إذا كانت موجودة
          if (draftRef.current.birthDate) {
            employeeData.birthDate = draftRef.current.birthDate;
          }
          if (draftRef.current.hireDate) {
            employeeData.hireDate = draftRef.current.hireDate;
          }
          if (draftRef.current.salary) {
            employeeData.salary = draftRef.current.salary;
          }
          if (draftRef.current.supervisor) {
            employeeData.supervisor = draftRef.current.supervisor;
          }
          if (draftRef.current.workStartTime) {
            employeeData.workStartTime = draftRef.current.workStartTime;
          }
          if (draftRef.current.workEndTime) {
            employeeData.workEndTime = draftRef.current.workEndTime;
          }
          if (draftRef.current.notes) {
            employeeData.notes = draftRef.current.notes;
          }

          console.log('🔄 تحديث بيانات الموظف مع بيانات تسجيل الدخول...');
          console.log('📋 بيانات تسجيل الدخول المراد حفظها:', JSON.stringify(employeeData.loginMethods, null, 2));

          await updateDoc(doc(db, 'employees', editingEmployee.id), employeeData);

          // التحقق من الحفظ
          const updatedDoc = await getDoc(doc(db, 'employees', editingEmployee.id));
          const updatedData = updatedDoc.data();
          console.log('✅ تم تحديث بيانات الموظف بنجاح');
          console.log('📊 بيانات تسجيل الدخول المحفوظة في قاعدة البيانات:', JSON.stringify(updatedData?.loginMethods, null, 2));

          // Log activity
          await logActivity(editingEmployee.id, 'تم تحديث بيانات الموظف', {
            updatedFields: Object.keys(employeeData),
            updatedBy: user?.email || 'system',
            loginMethodsUpdated: true
          });

          toast.success('تم تحديث بيانات الموظف بنجاح');
        } catch (error) {
          console.error('❌ [Save Employee] خطأ في تحديث الموظف:', error);
          toast.error('حدث خطأ أثناء تحديث بيانات الموظف');
          savingRef.current = false;
          return;
        }
      }

      // Reset form
      setShowAddDialog(false);
      setEditingEmployee(null);
      setNewEmployee({
        name: '',
        email: '',
        phone: '',
        role: 'support',
        isActive: true,
        department: '',
        sendWelcomeEmail: true
      });
      setSelectedCities([]);
      setSelectedCountries([]);
      setFormErrors({
        name: '',
        email: '',
        phone: '',
        role: '',
        department: ''
      });
      draftRef.current = {}; // إعادة تعيين draftRef

      // Refresh employee list
      await loadEmployees();

    } catch (error: any) {
      console.error('Error in handleSaveEmployee:', error);

      // معالجة أخطاء محددة
      if (error?.code === 'permission-denied') {
        toast.error('ليس لديك صلاحية لإضافة موظفين');
      } else if (error?.code === 'unavailable') {
        toast.error('الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً');
      } else if (error?.message?.includes('network')) {
        toast.error('خطأ في الاتصال. تحقق من اتصال الإنترنت');
      } else if (error?.message?.includes('quota')) {
        toast.error('تم تجاوز الحد المسموح. يرجى المحاولة لاحقاً');
      } else {
        toast.error(`حدث خطأ غير متوقع: ${error?.message || 'خطأ غير معروف'}`);
      }
    } finally {
      savingRef.current = false; // إعادة تعيين savingRef في جميع الحالات
    }
  };

  // Add function to send credentials via email
  const sendCredentialsEmail = async () => {
    try {
      setIsSendingEmail(true);
      // Here you would integrate with your email sending service
      // For now, we'll just simulate it
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('تم إرسال بيانات الدخول إلى البريد الإلكتروني');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('حدث خطأ أثناء إرسال البريد الإلكتروني');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Add function to send credentials via WhatsApp
  const sendCredentialsSMS = async () => {
    try {
      setIsSendingSMS(true);
      // Here you would integrate with your WhatsApp service
      // For now, we'll just simulate it
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('تم إرسال بيانات الدخول عبر WhatsApp');
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      toast.error('حدث خطأ أثناء إرسال الرسالة عبر WhatsApp');
    } finally {
      setIsSendingSMS(false);
    }
  };

  // Update CredentialsDialog component
  function CredentialsDialog() {
    return (
      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex gap-2 items-center text-green-600">
              <CheckCircle className="w-5 h-5" />
              تم إنشاء حساب الموظف بنجاح
            </DialogTitle>
            <DialogDescription>
              يرجى حفظ أو إرسال بيانات الدخول التالية للموظف بشكل آمن
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* Credentials Display */}
            <div className="p-4 space-y-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <h4 className="flex gap-2 items-center text-sm font-semibold text-gray-900">
                  <Mail className="w-4 h-4 text-blue-500" />
                  بيانات الدخول
                </h4>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">البريد الإلكتروني</Label>
                  <div className="flex gap-2 items-center p-2 bg-white rounded border">
                    <Mail className="w-3 h-3 text-gray-500" />
                    <span className="flex-1 text-sm font-medium text-gray-900">{newUserCredentials?.email}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">كلمة المرور</Label>
                  <div className="flex gap-2 items-center p-2 bg-white rounded border">
                    <Key className="w-3 h-3 text-gray-500" />
                    <span className="flex-1 font-mono text-sm font-medium text-gray-900">{newUserCredentials?.password}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">رقم الهاتف (WhatsApp)</Label>
                  <div className="flex gap-2 items-center p-2 bg-white rounded border">
                    <Phone className="w-3 h-3 text-gray-500" />
                    <span className="flex-1 text-sm font-medium text-gray-900">{newUserCredentials?.phone || 'غير متوفر'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Send Options */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">خيارات الإرسال</h4>

              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={sendCredentialsEmail}
                  disabled={isSendingEmail}
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="ml-2 w-4 h-4 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Mail className="ml-2 w-4 h-4" />
                      إرسال عبر البريد
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={sendCredentialsSMS}
                  disabled={isSendingSMS}
                >
                  {isSendingSMS ? (
                    <>
                      <Loader2 className="ml-2 w-4 h-4 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Phone className="ml-2 w-4 h-4" />
                      إرسال عبر WhatsApp
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Copy to Clipboard */}
            <div className="space-y-4">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  const credentials = `
بيانات الدخول للنظام:
------------------------
                بيانات تسجيل الدخول:

📧 تسجيل الدخول عبر البريد الإلكتروني:
البريد الإلكتروني: ${newUserCredentials?.email}
كلمة المرور المؤقتة: ${newUserCredentials?.password}
معرف الحساب: ${newUserCredentials?.authUserId || 'غير متوفر'}

📱 تسجيل الدخول عبر WhatsApp:
رقم الهاتف: ${newUserCredentials?.phone || 'غير متوفر'}
يمكن تسجيل الدخول باستخدام رقم الهاتف عبر WhatsApp OTP

ملاحظات مهمة:
- يرجى تغيير كلمة المرور فور تسجيل الدخول
- هذه البيانات سرية، يرجى عدم مشاركتها
- في حال وجود أي مشكلة، يرجى التواصل مع الدعم الفني
- جميع بيانات تسجيل الدخول محفوظة في قاعدة البيانات
                `.trim();

                  navigator.clipboard.writeText(credentials);
                  setCredentialsCopied(true);
                  toast.success('تم نسخ البيانات إلى الحافظة');

                  setTimeout(() => setCredentialsCopied(false), 2000);
                }}
              >
                {credentialsCopied ? (
                  <>
                    <Check className="ml-2 w-4 h-4" />
                    تم النسخ
                  </>
                ) : (
                  <>
                    <Copy className="ml-2 w-4 h-4" />
                    نسخ البيانات
                  </>
                )}
              </Button>
            </div>

            {/* Important Notes */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <h4 className="flex gap-2 items-center mb-1 text-xs font-medium text-blue-800">
                <AlertCircle className="w-3 h-3" />
                ملاحظات
              </h4>
              <ul className="space-y-1 text-xs list-disc list-inside text-blue-700">
                <li>سيتم إرسال رابط تغيير كلمة المرور تلقائياً</li>
                <li>يجب تغيير كلمة المرور عند أول تسجيل دخول</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="default"
              onClick={() => {
                setShowCredentialsDialog(false);
                setNewUserCredentials(null);
                setCredentialsCopied(false);
              }}
            >
              <Check className="ml-2 w-4 h-4" />
              تم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Delete employee
  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;

    try {
      // الحصول على بيانات الموظف
      const employeeDoc = await getDoc(doc(db, 'employees', employeeId));
      const employeeData = employeeDoc.data();

      if (employeeData?.authUserId) {
        // حذف حساب المصادقة إذا كان موجوداً
        try {
          // Note: Deleting Firebase Auth users requires Admin SDK
          // We'll need to implement this through a secure backend function
          toast.info('سيتم تعطيل حساب المصادقة للموظف');

          // تحديث حالة الموظف إلى غير نشط
          await updateDoc(doc(db, 'employees', employeeId), {
            isActive: false,
            deactivatedAt: new Date(),
            deactivationReason: 'تم حذف الحساب'
          });
        } catch (authError) {
          console.error('Error deleting auth account:', authError);
        }
      }

      // Log activity before deletion
      await logActivity(employeeId, 'تم حذف الموظف', {
        deletedBy: user?.email || 'system',
        deletedAt: new Date().toISOString()
      });

      // حذف بيانات الموظف من Firestore
      await deleteDoc(doc(db, 'employees', employeeId));
      toast.success('تم حذف الموظف بنجاح');

      loadEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('حدث خطأ أثناء حذف الموظف');
    }
  };

  // Toggle employee status
  const toggleEmployeeStatus = async (employee: Employee) => {
    try {
      const newStatus = !employee.isActive;
      await updateDoc(doc(db, 'employees', employee.id), {
        isActive: newStatus
      });

      // Log activity
      await logActivity(employee.id, `تم ${newStatus ? 'تفعيل' : 'تعطيل'} الموظف`, {
        previousStatus: employee.isActive ? 'نشط' : 'غير نشط',
        newStatus: newStatus ? 'نشط' : 'غير نشط',
        changedBy: user?.email || 'system'
      });

      loadEmployees();
      toast.success(`تم ${newStatus ? 'تفعيل' : 'تعطيل'} الموظف بنجاح`);
    } catch (error) {
      console.error('Error updating employee status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الموظف');
    }
  };

  // تحديث عرض المناطق في جدول الموظفين
  const renderLocations = (employee: Employee) => {
    if (!employee.locations?.length) return '-';

    const locationsByCountry = employee.locations.reduce((acc, loc) => {
      if (!acc[loc.countryName]) {
        acc[loc.countryName] = [];
      }
      acc[loc.countryName].push(loc.cityName);
      return acc;
    }, {} as Record<string, string[]>);

    return (
      <div className="space-y-1">
        {Object.entries(locationsByCountry).map(([country, cities]) => (
          <div key={country} className="text-sm">
            <span className="font-medium">{country}:</span>
            <span className="text-gray-600"> {cities.join('، ')}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <AccountTypeProtection allowedTypes={['admin']}>
        <div className="p-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full border-b-2 border-blue-500 animate-spin"></div>
                <p className="mt-4 text-gray-600">جاري تحميل بيانات الموظفين...</p>
              </div>
            </div>
          </div>
        </div>
      </AccountTypeProtection>
    );
  }

  return (
    <AccountTypeProtection allowedTypes={['admin']}>
      <div className="min-h-screen bg-slate-50" dir="rtl">
        <div className="px-4 py-8 mx-auto space-y-8 max-w-7xl sm:px-6 lg:px-8">
          {/* Header */}
          <header className="flex flex-col gap-4 p-8 text-white bg-gradient-to-l from-indigo-600 via-blue-600 to-sky-500 rounded-3xl shadow-xl">
            <div className="flex flex-wrap gap-4 justify-between items-center">
              <div>
                <p className="text-sm tracking-widest uppercase text-white/80">
                  لوحة تحكم إدارة الموظفين
                </p>
                <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                  إدارة موظفي منصة الحلم
                </h1>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => setShowAddDialog(true)}
                  variant="default"
                  className="bg-white text-slate-900 hover:bg-white/90"
                >
                  <UserPlus className="ml-2 w-4 h-4" />
                  إضافة موظف جديد
                </Button>
                <Button
                  onClick={exportToPDF}
                  variant="secondary"
                  className="text-white bg-white/20 hover:bg-white/30"
                >
                  <FileText className="ml-2 w-4 h-4" />
                  تصدير PDF
                </Button>
                <Button
                  onClick={exportToExcel}
                  variant="secondary"
                  className="text-white bg-white/20 hover:bg-white/30"
                >
                  <Download className="ml-2 w-4 h-4" />
                  تصدير Excel
                </Button>
              </div>
            </div>
            <p className="max-w-3xl text-base text-white/90">
              إدارة شاملة لموظفي المنصة، صلاحياتهم، وأدوارهم في النظام. أضف موظفين جدد، عدّل الصلاحيات، واتبع الأداء.
            </p>
          </header>

          {/* Stats */}
          <section className="grid gap-4 md:grid-cols-4">
            <Card className="border-none shadow-sm bg-white/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">إجمالي الموظفين</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-between items-end">
                <span className="text-3xl font-bold text-slate-900">{employees.length}</span>
                <Badge className="bg-slate-100 text-slate-800">
                  {filteredEmployees.length} بعد التصفية
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">موظفين نشطين</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-between items-end">
                <span className="text-3xl font-bold text-emerald-600">
                  {employees.filter(e => e.isActive).length}
                </span>
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">الأقسام</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-between items-end">
                <span className="text-3xl font-bold text-purple-600">
                  {new Set(employees.map(e => e.department).filter(Boolean)).size}
                </span>
                <Building2 className="w-6 h-6 text-purple-400" />
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500">الوظائف</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-between items-end">
                <span className="text-3xl font-bold text-orange-600">
                  {new Set(employees.map(e => e.role)).size}
                </span>
                <Briefcase className="w-6 h-6 text-orange-400" />
              </CardContent>
            </Card>
          </section>

          {/* Charts Section */}
          <section className="grid gap-6 md:grid-cols-2">
            {/* توزيع الموظفين حسب الدور */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex gap-2 items-center">
                  <Users className="w-5 h-5 text-blue-500" />
                  توزيع الموظفين حسب الدور
                </CardTitle>
              </CardHeader>
              <CardContent>
                {roleDistributionData.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={roleDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {roleDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            direction: 'rtl'
                          }}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: '20px' }}
                          iconType="circle"
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    لا توجد بيانات للعرض
                  </div>
                )}
              </CardContent>
            </Card>

            {/* توزيع الموظفين حسب القسم */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex gap-2 items-center">
                  <Building2 className="w-5 h-5 text-purple-500" />
                  توزيع الموظفين حسب القسم
                </CardTitle>
              </CardHeader>
              <CardContent>
                {departmentDistributionData.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={departmentDistributionData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={100}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            direction: 'rtl'
                          }}
                        />
                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]}>
                          {departmentDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    لا توجد بيانات للعرض
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Filters */}
          <Card className="border-none shadow-md">
            <CardHeader className="space-y-3">
              <div className="flex gap-3 items-center text-slate-500">
                <Search className="w-5 h-5" />
                <div>
                  <p className="text-sm tracking-widest uppercase text-slate-400">البحث والتصفية</p>
                  <h2 className="text-2xl font-semibold text-slate-900">مركز إدارة الموظفين</h2>
                </div>
              </div>
              <p className="text-sm text-slate-500">
                استخدم البحث والتصفية لتحديد الموظفين بسرعة، ثم اختر طريقة العرض المناسبة.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 pointer-events-none text-slate-400" />
                    <Input
                      className="pl-10 h-11 text-sm"
                      placeholder="ابحث بالاسم، البريد، الهاتف..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="h-11 text-sm">
                      <SelectValue placeholder="تصفية حسب الوظيفة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الوظائف</SelectItem>
                      <SelectItem value="support">دعم فني</SelectItem>
                      <SelectItem value="finance">مالية</SelectItem>
                      <SelectItem value="sales">مبيعات</SelectItem>
                      <SelectItem value="content">محتوى</SelectItem>
                      <SelectItem value="supervisor">مشرف</SelectItem>
                      <SelectItem value="admin">مدير نظام</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="h-11 text-sm">
                      <SelectValue placeholder="تصفية حسب القسم" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الأقسام</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-11 text-sm">
                      <SelectValue placeholder="حالة الموظف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الحالات</SelectItem>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="inactive">غير نشط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* أزرار اختيار طريقة العرض */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                  <div className="flex gap-2 items-center">
                    <span className="text-sm font-medium text-slate-700">طريقة العرض:</span>
                    <div className="flex gap-2 p-1 rounded-lg border border-slate-200 bg-slate-50">
                      <Button
                        size="sm"
                        variant={viewMode === 'cards' ? 'default' : 'ghost'}
                        onClick={() => setViewMode('cards')}
                        className={cn(
                          'h-8 gap-2',
                          viewMode === 'cards'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'text-slate-600 hover:bg-slate-100'
                        )}
                      >
                        <List className="w-4 h-4" />
                        قائمة
                      </Button>
                      <Button
                        size="sm"
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        onClick={() => setViewMode('grid')}
                        className={cn(
                          'h-8 gap-2',
                          viewMode === 'grid'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'text-slate-600 hover:bg-slate-100'
                        )}
                      >
                        <LayoutGrid className="w-4 h-4" />
                        شبكة
                      </Button>
                      <Button
                        size="sm"
                        variant={viewMode === 'table' ? 'default' : 'ghost'}
                        onClick={() => setViewMode('table')}
                        className={cn(
                          'h-8 gap-2',
                          viewMode === 'table'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'text-slate-600 hover:bg-slate-100'
                        )}
                      >
                        <TableIcon className="w-4 h-4" />
                        جدول
                      </Button>
                      {canViewAllEmployees && (
                        <Button
                          size="sm"
                          variant={showAllEmployees ? 'default' : 'outline'}
                          onClick={() => setShowAllEmployees(prev => !prev)}
                          className={cn(
                            'h-8 px-3 text-xs capitalize',
                            showAllEmployees ? 'bg-slate-900 text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                          )}
                        >
                          {showAllEmployees ? 'تقييد بالمناطق' : 'عرض كل الموظفين'}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">
                    {filteredEmployees.length} موظف
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employees Display */}
          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              {loading && (
                <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200">
                  <p className="text-base text-slate-500">جاري تحميل الموظفين...</p>
                </div>
              )}

              {!loading && filteredEmployees.length === 0 && (
                <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 text-slate-500">
                  لا توجد موظفين مطابقين لخيارات البحث الحالية
                </div>
              )}

              {!loading && filteredEmployees.length > 0 && (
                <>
                  {/* عرض القائمة (Cards) */}
                  {viewMode === 'cards' && (
                    <div className="space-y-4">
                      {filteredEmployees.map((employee) => renderEmployeeCard(employee, false))}
                    </div>
                  )}

                  {/* عرض الشبكة (Grid) */}
                  {viewMode === 'grid' && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredEmployees.map((employee) => renderEmployeeCard(employee, true))}
                    </div>
                  )}

                  {/* عرض الجدول (Table) */}
                  {viewMode === 'table' && (
                    <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>الموظف</TableHead>
                            <TableHead>الوظيفة</TableHead>
                            <TableHead>القسم</TableHead>
                            <TableHead>الراتب</TableHead>
                            <TableHead>التواصل</TableHead>
                            <TableHead>المناطق</TableHead>
                            <TableHead>التبعية</TableHead>
                            <TableHead>الحالة</TableHead>
                            <TableHead className="text-center">الإجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEmployees.map((employee) => {
                            const tableAvatarUrl = resolveAvatarUrl(employee.avatar);
                            return (
                              <TableRow key={employee.id}>
                                <TableCell>
                                  <div className="flex gap-3 items-center">
                                    <div className="flex justify-center items-center w-10 h-10 font-semibold text-white bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full">
                                      {tableAvatarUrl ? (
                                        <img
                                          src={tableAvatarUrl}
                                          alt={employee.name}
                                          className="object-cover w-10 h-10 rounded-full"
                                        />
                                      ) : (
                                        <span>{employee.name?.charAt(0) || 'U'}</span>
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-medium">{employee.name}</div>
                                      <div className="text-sm text-gray-500">{employee.email}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="capitalize">
                                    {getRoleLabel(employee.role)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2 items-center">
                                    <Building2 className="w-4 h-4 text-gray-400" />
                                    <span>{employee.department || '-'}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {(employee as any).salary ? (
                                    <div className="flex gap-2 items-center">
                                      <Briefcase className="w-4 h-4 text-emerald-400" />
                                      <span className="font-medium text-emerald-700">
                                        {Number((employee as any).salary).toLocaleString('ar-EG')} ر.ق
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="flex gap-2 items-center">
                                      <Mail className="w-4 h-4 text-gray-400" />
                                      <a href={`mailto:${employee.email}`} className="text-sm text-blue-600 hover:underline">
                                        {employee.email}
                                      </a>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      <Phone className="w-4 h-4 text-gray-400" />
                                      <a href={`tel:${employee.phone}`} className="text-sm text-blue-600 hover:underline">
                                        {employee.phone || '-'}
                                      </a>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {renderLocations(employee)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2 items-center">
                                    <Building2 className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm">
                                      {employee.supervisor ? (
                                        employees.find(emp => emp.id === employee.supervisor)?.name || 'غير محدد'
                                      ) : 'بدون مشرف'}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2 items-center">
                                    <Switch
                                      checked={employee.isActive}
                                      onCheckedChange={() => toggleEmployeeStatus(employee)}
                                    />
                                    <span className={employee.isActive ? 'text-green-600' : 'text-red-600'}>
                                      {employee.isActive ? 'نشط' : 'غير نشط'}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2 justify-center">
                                    {renderEmployeeActions(employee)}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="px-2 h-8"
                                      onClick={async () => {
                                        const employeeData = `
الاسم: ${employee.name}
البريد: ${employee.email}
الهاتف: ${employee.phone || '-'}
الوظيفة: ${getRoleLabel(employee.role)}
القسم: ${employee.department || '-'}
الراتب: ${(employee as any).salary ? `${Number((employee as any).salary).toLocaleString('ar-EG')} ر.ق` : 'غير محدد'}
تاريخ الميلاد: ${(employee as any).birthDate || '-'}
تاريخ التوظيف: ${(employee as any).hireDate || '-'}
ساعات العمل: ${(employee as any).workStartTime || '—'} - ${(employee as any).workEndTime || '—'}
الحالة: ${employee.isActive ? 'نشط' : 'غير نشط'}
المناطق: ${employee.locations?.map(loc => `${loc.cityName}, ${loc.countryName}`).join('; ') || '-'}
المشرف: ${employee.supervisor ? employees.find(e => e.id === employee.supervisor)?.name || '-' : 'بدون مشرف'}
${(employee as any).notes ? `ملاحظات: ${(employee as any).notes}` : ''}
              `.trim();
                                        await navigator.clipboard.writeText(employeeData);
                                        toast.success('تم نسخ بيانات الموظف');
                                      }}
                                      title="نسخ بيانات الموظف"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Add/Edit Employee Dialog */}
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogContent key={editingEmployee?.id || 'new'} className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  {editingEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  {editingEmployee
                    ? 'قم بتحديث بيانات الموظف وصلاحياته في النظام'
                    : 'أدخل بيانات الموظف الجديد وحدد صلاحياته في منصة الحلم'
                  }
                </DialogDescription>
              </DialogHeader>

              <SimpleEmployeeForm key={`form-${editingEmployee?.id || 'new'}`} />

              <DialogFooter className="gap-3 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddDialog(false);
                    setEditingEmployee(null);
                    setNewEmployee({
                      name: '',
                      email: '',
                      phone: '',
                      role: 'support',
                      isActive: true,
                      department: '',
                      sendWelcomeEmail: true
                    });
                    setSelectedCities([]);
                    setSelectedCountries([]);
                    setFormErrors({
                      name: '',
                      email: '',
                      phone: '',
                      role: '',
                      department: ''
                    });
                    draftRef.current = {}; // إعادة تعيين draftRef عند الإلغاء
                  }}
                  className="px-6"
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveEmployee}
                  disabled={savingRef.current}
                  className="px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingEmployee ? (
                    <>
                      <Edit className="ml-2 w-4 h-4" />
                      تحديث الموظف
                    </>
                  ) : (
                    <>
                      <UserPlus className="ml-2 w-4 h-4" />
                      إضافة الموظف
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Credentials Dialog */}
          <CredentialsDialog />

          {/* Activity Log Dialog */}
          <Dialog open={showActivityLog} onOpenChange={setShowActivityLog}>
            <DialogContent className="sm:max-w-[960px] xl:max-w-[1100px] w-full max-h-[85vh] px-0 pb-0 overflow-hidden">
              <DialogHeader>
                <DialogTitle className="flex gap-2 items-center">
                  <History className="w-5 h-5 text-blue-500" />
                  سجل نشاطات الموظف
                </DialogTitle>
                <DialogDescription>
                  {selectedEmployeeForActivity && (
                    <div className="mt-2">
                      <p className="font-semibold text-slate-900">{selectedEmployeeForActivity.name}</p>
                      <p className="text-sm text-slate-500">{selectedEmployeeForActivity.email}</p>
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="px-5 py-4 space-y-5">
                {selectedEmployeeForActivity && (
                  <div className="space-y-5 rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 shadow-md w-full">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase">الوقت الإجمالي المسجل</p>
                      <span className="text-4xl font-bold text-slate-900">{formatDuration(totalActivityMinutes)}</span>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-600">وصف الحركة</Label>
                        <Input
                          placeholder="مثلاً: متابعة تذاكر الدعم أو مراجعة التقارير"
                          value={activityForm.action}
                          onChange={(e) =>
                            setActivityForm((prev) => ({ ...prev, action: e.target.value }))
                          }
                          className="h-14 text-base rounded-xl w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-600">زمن العمل (دقائق)</Label>
                        <Input
                          placeholder="مثلاً: 45"
                          inputMode="numeric"
                          value={activityForm.durationMinutes}
                          onChange={(e) =>
                            setActivityForm((prev) => ({ ...prev, durationMinutes: e.target.value }))
                          }
                          className="h-14 text-base rounded-xl w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-600">ملاحظات إضافية</Label>
                        <Textarea
                          placeholder="ملاحظات قصيرة لمساعدة الفريق"
                          value={activityForm.notes}
                          onChange={(e) =>
                            setActivityForm((prev) => ({ ...prev, notes: e.target.value }))
                          }
                          className="min-h-[160px] text-base rounded-xl w-full"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleAddActivityEntry}
                        disabled={isSavingActivity}
                        className="flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-base text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        {isSavingActivity ? (
                          <>
                            <Loader2 className="ml-2 w-4 h-4 animate-spin text-white" />
                            جاري الحفظ...
                          </>
                        ) : (
                          <>
                            <Sparkles className="ml-2 w-4 h-4" />
                            حفظ الحركة
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                {employeeActivities.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    <History className="mx-auto mb-4 w-12 h-12 text-slate-300" />
                    <p>لا توجد نشاطات مسجلة لهذا الموظف</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {employeeActivities.map((activity) => {
                      const timestamp = activity.timestamp?.seconds
                        ? new Date(activity.timestamp.seconds * 1000)
                        : activity.timestamp instanceof Date
                          ? activity.timestamp
                          : new Date();
                      const durationMinutes = Number(activity.details?.durationMinutes || 0);
                      const detailEntries = activity.details
                        ? Object.entries(activity.details).filter(([key]) => key !== 'durationMinutes')
                        : [];

                      return (
                        <div
                          key={activity.id}
                          className="p-4 rounded-lg border bg-slate-50 border-slate-200"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 space-y-2">
                              <p className="font-semibold text-slate-900">{activity.action}</p>
                              {detailEntries.length > 0 && (
                                <div className="text-sm text-slate-600">
                                  {detailEntries.map(([key, value]) => (
                                    <p key={key}>
                                      <span className="font-medium">{key}:</span> {String(value)}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {durationMinutes > 0 && (
                                <p className="text-xs font-semibold text-amber-700">
                                  الوقت المسجل: {formatDuration(durationMinutes)}
                                </p>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              {timestamp.toLocaleString('ar-EG')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowActivityLog(false)}>
                  إغلاق
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Permissions Preview Dialog */}
          <Dialog open={false} onOpenChange={() => { }}>
            {/* سيتم إضافة هذا لاحقاً */}
          </Dialog>
        </div>
      </div>
    </AccountTypeProtection>
  );
}

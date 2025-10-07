'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { AccountTypeProtection } from '@/hooks/useAccountTypeAuth';
import { useAuth } from '@/lib/firebase/auth-provider';
import { auth, db } from '@/lib/firebase/config';
import { Employee, EmployeeRole, RolePermissions } from '@/types/employees';
import {
    createUserWithEmailAndPassword,
    sendPasswordResetEmail
} from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import {
    AlertCircle,
    Briefcase,
    Building2,
    Check,
    CheckCircle,
    Copy,
    Edit,
    Key,
    Loader2,
    Mail,
    MessageSquare,
    Phone,
    Search,
    Trash2,
    UserPlus,
    Users,
    X
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { COUNTRIES_DATA, Country } from '@/lib/cities-data';

// الصلاحيات الافتراضية لكل دور وظيفي
const DEFAULT_PERMISSIONS: Record<EmployeeRole, RolePermissions> = {
  support: {
    canViewUsers: true,
    canEditUsers: false,
    canViewFinancials: false,
    canManagePayments: false,
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
    canViewReports: true,
    canManageContent: false,
    canManageEmployees: false,
    canViewSupport: true,
    canManageSupport: false,
    allowedRegions: []
  },
  content: {
    canViewUsers: false,
    canEditUsers: false,
    canViewFinancials: false,
    canManagePayments: false,
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
    canViewReports: true,
    canManageContent: true,
    canManageEmployees: false,
    canViewSupport: true,
    canManageSupport: true
  }
};


export default function EmployeesManagement() {
  const { user, userData } = useAuth();

  // التحقق من صلاحيات المستخدم
  const isSystemAdmin = userData?.role === 'admin';
  const isSupervisor = userData?.role === 'supervisor';

  // تحديث التحكم في الصلاحيات
  const canEditEmployee = (employee: Employee) => {
    if (isSystemAdmin) return true; // مدير النظام يمكنه تعديل أي موظف
    if (isSupervisor) {
      // المشرف يمكنه تعديل الموظفين في نفس المناطق فقط
      return employee.locations?.some(loc =>
        userData?.permissions?.allowedLocations?.some(allowed =>
          allowed.countryId === loc.countryId && allowed.cityId === loc.cityId
        )
      );
    }
    return false;
  };

  const canDeleteEmployee = (employee: Employee) => {
    return isSystemAdmin; // فقط مدير النظام يمكنه حذف الموظفين
  };

  const canAddEmployee = () => {
    return isSystemAdmin || isSupervisor; // مدير النظام والمشرف يمكنهم إضافة موظفين
  };

  const canEditRole = (employee: Employee) => {
    return isSystemAdmin; // فقط مدير النظام يمكنه تغيير نوع الوظيفة
  };

  // تحديث واجهة المستخدم لعرض الصلاحيات
  const renderEmployeeActions = (employee: Employee) => (
    <div className="flex items-center gap-2">
      {canEditEmployee(employee) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditingEmployee(employee);
            setNewEmployee(employee);
            setSelectedCountry(employee.locations[0]?.countryId || '');
            setSelectedCities(employee.locations.map(loc => loc.cityId));
            setShowAddDialog(true);
          }}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Edit className="w-4 h-4" />
        </Button>
      )}

      {canDeleteEmployee(employee) && (
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

  // Add validation function
  const validateForm = () => {
    const errors = {
      name: '',
      email: '',
      phone: '',
      role: '',
      department: ''
    };
    let isValid = true;

    if (!newEmployee.name?.trim()) {
      errors.name = 'يرجى إدخال اسم الموظف';
      isValid = false;
    }

    if (!newEmployee.email?.trim()) {
      errors.email = 'يرجى إدخال البريد الإلكتروني';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmployee.email)) {
        errors.email = 'يرجى إدخال بريد إلكتروني صحيح';
        isValid = false;
      }
    }

    if (!newEmployee.phone?.trim()) {
      errors.phone = 'يرجى إدخال رقم الهاتف';
      isValid = false;
    }

    if (!newEmployee.role) {
      errors.role = 'يرجى اختيار الوظيفة';
      isValid = false;
    }

    if (!newEmployee.department?.trim()) {
      errors.department = 'يرجى اختيار القسم';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  // تحسين handlers باستخدام useCallback
  const handleInputChange = useCallback((field: keyof Employee, value: string) => {
    setNewEmployee(prev => ({ ...prev, [field]: value }));

    // مسح خطأ الحقل عند التعديل
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [formErrors]);

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

  // تحديث نموذج إضافة/تعديل الموظف
  const EmployeeForm = useMemo(() => (
    <div className="space-y-6 py-4">
      {/* معلومات شخصية */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">المعلومات الشخصية</h3>
            <p className="text-sm text-gray-600">البيانات الأساسية للموظف</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">الاسم الكامل *</Label>
            <Input
              value={newEmployee.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="أدخل الاسم الكامل"
              className={`w-full ${formErrors.name ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
              dir="rtl"
            />
            {formErrors.name && (
              <p className="text-sm text-red-500">{formErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">البريد الإلكتروني *</Label>
            <Input
              type="email"
              value={newEmployee.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="example@el7lm.com"
              className={`w-full ${formErrors.email ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
              dir="ltr"
            />
            {formErrors.email && (
              <p className="text-sm text-red-500">{formErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">رقم الهاتف *</Label>
            <Input
              type="tel"
              value={newEmployee.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="05xxxxxxxx"
              className={`w-full text-left ${formErrors.phone ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
              dir="ltr"
            />
            {formErrors.phone && (
              <p className="text-sm text-red-500">{formErrors.phone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">تاريخ الميلاد</Label>
            <Input
              type="date"
              value={newEmployee.birthDate || ''}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
              className="w-full border-gray-300 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* معلومات العمل */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">معلومات العمل</h3>
            <p className="text-sm text-gray-600">الوظيفة والصلاحيات في المنصة</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">الوظيفة *</Label>
            <Select
              value={newEmployee.role || ''}
              onValueChange={(value: EmployeeRole) => {
                setNewEmployee(prev => ({
                  ...prev,
                  role: value,
                  permissions: DEFAULT_PERMISSIONS[value]
                }));
                if (formErrors.role) {
                  setFormErrors(prev => ({ ...prev, role: '' }));
                }
              }}
            >
              <SelectTrigger className={`w-full ${formErrors.role ? 'border-red-500' : 'border-gray-300 focus:border-green-500'}`}>
                <SelectValue placeholder="اختر الوظيفة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="support">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>دعم فني</span>
                  </div>
                </SelectItem>
                <SelectItem value="finance">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>مالية</span>
                  </div>
                </SelectItem>
                <SelectItem value="sales">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>مبيعات</span>
                  </div>
                </SelectItem>
                <SelectItem value="content">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>محتوى</span>
                  </div>
                </SelectItem>
                <SelectItem value="supervisor">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span>مشرف</span>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>مدير نظام</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {formErrors.role && (
              <p className="text-sm text-red-500">{formErrors.role}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">القسم *</Label>
            <Select
              value={newEmployee.department || ''}
              onValueChange={(value) => handleSelectChange('department', value)}
            >
              <SelectTrigger className={`w-full ${formErrors.department ? 'border-red-500' : 'border-gray-300 focus:border-green-500'}`}>
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
              type="date"
              value={newEmployee.hireDate || ''}
              onChange={(e) => handleInputChange('hireDate', e.target.value)}
              className="w-full border-gray-300 focus:border-green-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">الراتب الشهري</Label>
            <Input
              type="number"
              value={newEmployee.salary || ''}
              onChange={(e) => handleInputChange('salary', e.target.value)}
              placeholder="0.00"
              className="w-full border-gray-300 focus:border-green-500"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* معلومات المنصة */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <Building2 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">إعدادات المنصة</h3>
            <p className="text-sm text-gray-600">الصلاحيات والمناطق الجغرافية</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">المشرف المباشر</Label>
              <Select
                value={newEmployee.supervisor || ''}
                onValueChange={(value) => {
                  setNewEmployee(prev => ({ ...prev, supervisor: value }));
                }}
              >
                <SelectTrigger className="w-full border-gray-300 focus:border-purple-500">
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
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={newEmployee.workStartTime || '09:00'}
                  onChange={(e) => {
                    setNewEmployee(prev => ({ ...prev, workStartTime: e.target.value }));
                  }}
                  className="flex-1 border-gray-300 focus:border-purple-500"
                />
                <span className="flex items-center text-gray-500">إلى</span>
                <Input
                  type="time"
                  value={newEmployee.workEndTime || '17:00'}
                  onChange={(e) => {
                    setNewEmployee(prev => ({ ...prev, workEndTime: e.target.value }));
                  }}
                  className="flex-1 border-gray-300 focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">المناطق الجغرافية *</Label>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <LocationSelector />
            </div>
          </div>
        </div>
      </div>

      {/* معلومات إضافية */}
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-xl border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
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
            <textarea
              value={newEmployee.notes || ''}
              onChange={(e) => {
                setNewEmployee(prev => ({ ...prev, notes: e.target.value }));
              }}
              placeholder="أي ملاحظات إضافية حول الموظف..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-gray-500 focus:ring-1 focus:ring-gray-500 resize-none"
              rows={3}
              dir="rtl"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                title="تفعيل الحساب فوراً"
                checked={newEmployee.isActive !== false}
                onChange={(e) => handleCheckboxChange('isActive', e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                تفعيل الحساب فوراً
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sendWelcomeEmail"
                title="إرسال بريد ترحيبي"
                checked={newEmployee.sendWelcomeEmail !== false}
                onChange={(e) => handleCheckboxChange('sendWelcomeEmail', e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="sendWelcomeEmail" className="text-sm font-medium text-gray-700">
                إرسال بريد ترحيبي
              </Label>
            </div>
          </div>
        </div>
      </div>
    </div>
  ), [newEmployee, formErrors, handleInputChange, handleSelectChange, handleCheckboxChange, employees, countries, selectedCountry, selectedCities]);

  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // New employee form state
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
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
  } | null>(null);

  // Add state for sending credentials
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [credentialsCopied, setCredentialsCopied] = useState(false);

  // Load employees
  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const employeesRef = collection(db, 'employees');
      const employeesSnap = await getDocs(employeesRef);

      const employeesList: Employee[] = [];
      employeesSnap.forEach(doc => {
        employeesList.push({ id: doc.id, ...doc.data() } as Employee);
      });

      setEmployees(employeesList);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  // تحميل الدول والمدن
  const loadCountries = async () => {
    try {
      setLoadingLocations(true);
      // استخدام البيانات الموجودة من ملف cities-data
      setCountries(COUNTRIES_DATA);
    } catch (error) {
      console.error('Error loading countries:', error);
      toast.error('حدث خطأ في تحميل بيانات المناطق');
    } finally {
      setLoadingLocations(false);
    }
  };

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
      employeeDepartment.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || employee.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // تحديث مكون اختيار المناطق
  const LocationSelector = () => {
    const selectedCountryData = countries.find(c => c.id === selectedCountry);

    return (
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label>الدولة</Label>
          <Select
            value={selectedCountry}
            onValueChange={(value) => {
              setSelectedCountry(value);
              setSelectedCities([]);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="اختر الدولة" />
            </SelectTrigger>
            <SelectContent>
              {countries.map(country => (
                <SelectItem key={country.id} value={country.id}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{country.flag}</span>
                    <span>{country.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCountryData && (
          <div className="grid gap-2">
            <Label>المدن</Label>
            {selectedCountryData.cities.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg max-h-48 overflow-y-auto">
                {selectedCountryData.cities.map(city => (
                  <div key={city.id} className="flex items-center gap-2">
                    <Checkbox
                      id={city.id}
                      checked={selectedCities.includes(city.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCities(prev => [...prev, city.id]);
                        } else {
                          setSelectedCities(prev => prev.filter(id => id !== city.id));
                        }
                      }}
                    />
                    <label
                      htmlFor={city.id}
                      className="text-sm cursor-pointer select-none flex items-center gap-1"
                    >
                      {city.name}
                      {city.isCapital && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-600">
                          عاصمة
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-yellow-600 bg-yellow-50 p-4 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>لا توجد مدن مضافة لهذه الدولة</span>
              </div>
            )}
          </div>
        )}

        {selectedCities.length > 0 && (
          <div className="mt-4">
            <Label className="text-sm text-gray-500">المدن المختارة:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedCities.map(cityId => {
                const city = selectedCountryData?.cities.find(c => c.id === cityId);
                if (!city) return null;

                return (
                  <Badge key={cityId} variant="secondary" className="flex items-center gap-1">
                    {city.name}
                    <button
                      type="button"
                      title={`إزالة ${city.name}`}
                      onClick={() => setSelectedCities(prev => prev.filter(id => id !== cityId))}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // دالة لإنشاء كلمة مرور قوية
  const generateStrongPassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";

    // التأكد من وجود حرف كبير على الأقل
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];

    // التأكد من وجود حرف صغير على الأقل
    password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];

    // التأكد من وجود رقم على الأقل
    password += "0123456789"[Math.floor(Math.random() * 10)];

    // التأكد من وجود رمز خاص على الأقل
    password += "!@#$%^&*"[Math.floor(Math.random() * 8)];

    // إكمال باقي الأحرف عشوائياً
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // خلط الأحرف
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  // تحديث دالة حفظ الموظف
  const handleSaveEmployee = async () => {
    try {
      console.log('🔄 بدء عملية حفظ الموظف...', { newEmployee, selectedCountry, selectedCities });

      // Validate form
      if (!validateForm()) {
        console.log('❌ فشل في التحقق من صحة النموذج');
        return;
      }

      // Validate required fields
      if (!newEmployee.name?.trim()) {
        toast.error('يرجى إدخال اسم الموظف');
        return;
      }

      if (!newEmployee.email?.trim()) {
        toast.error('يرجى إدخال البريد الإلكتروني');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmployee.email)) {
        toast.error('يرجى إدخال بريد إلكتروني صحيح');
        return;
      }

      if (!newEmployee.phone?.trim()) {
        toast.error('يرجى إدخال رقم الهاتف');
        return;
      }

      if (!newEmployee.role) {
        toast.error('يرجى اختيار الوظيفة');
        return;
      }

      if (!newEmployee.department?.trim()) {
        toast.error('يرجى اختيار القسم');
        return;
      }

      if (!selectedCountry) {
        toast.error('يرجى اختيار الدولة');
        return;
      }

      if (selectedCities.length === 0) {
        toast.error('يرجى اختيار مدينة واحدة على الأقل');
        return;
      }

      console.log('✅ تم التحقق من صحة البيانات بنجاح');

      // Check if email already exists in employees collection
      const emailQuery = query(
        collection(db, 'employees'),
        where('email', '==', newEmployee.email)
      );
      const emailQuerySnapshot = await getDocs(emailQuery);

      if (!editingEmployee && !emailQuerySnapshot.empty) {
        toast.error('البريد الإلكتروني مستخدم بالفعل');
        return;
      }

      let authUserId = '';

      if (!editingEmployee) {
        try {
          console.log('🔄 بدء إنشاء موظف جديد...');

          // Generate strong password
          const tempPassword = generateStrongPassword();
          console.log('🔑 تم إنشاء كلمة مرور مؤقتة');

          // Prepare employee data first
          const employeeData: Partial<Employee> = {
            name: newEmployee.name,
            email: newEmployee.email,
            phone: newEmployee.phone,
            role: newEmployee.role,
            department: newEmployee.department,
            createdAt: new Date(),
            isActive: true,
            locations: selectedCities.map(cityId => {
              const selectedCountryData = countries.find(c => c.id === selectedCountry);
              const city = selectedCountryData?.cities.find(c => c.id === cityId);
              return {
                countryId: selectedCountry,
                countryName: selectedCountryData?.name || '',
                cityId: cityId,
                cityName: city?.name || ''
              };
            })
          };

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
              newEmployee.email,
              tempPassword
            );

            authUserId = userCredential.user.uid;
            console.log('✅ تم إنشاء حساب Firebase Auth بنجاح:', authUserId);

            // Update document with auth ID
            console.log('🔄 تحديث مستند الموظف بـ Auth ID...');
            await updateDoc(employeeRef, {
              authUserId: authUserId
            });
            console.log('✅ تم تحديث مستند الموظف بنجاح');

            // Send password reset email
            console.log('📧 إرسال بريد إعادة تعيين كلمة المرور...');
            await sendPasswordResetEmail(auth, newEmployee.email);
            console.log('✅ تم إرسال بريد إعادة تعيين كلمة المرور');

            // Save credentials for display
            setNewUserCredentials({
              email: newEmployee.email,
              password: tempPassword
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
            return;
          }

        } catch (error) {
          console.error('Error creating employee:', error);
          toast.error('حدث خطأ أثناء إنشاء الموظف');
          return;
        }
      } else {
        // Update existing employee
        try {
          const employeeData: Partial<Employee> = {
            name: newEmployee.name,
            phone: newEmployee.phone,
            role: newEmployee.role,
            department: newEmployee.department,
            locations: selectedCities.map(cityId => {
              const selectedCountryData = countries.find(c => c.id === selectedCountry);
              const city = selectedCountryData?.cities.find(c => c.id === cityId);
              return {
                countryId: selectedCountry,
                countryName: selectedCountryData?.name || '',
                cityId: cityId,
                cityName: city?.name || ''
              };
            })
          };

          await updateDoc(doc(db, 'employees', editingEmployee.id), employeeData);
          toast.success('تم تحديث بيانات الموظف بنجاح');
        } catch (error) {
          console.error('Error updating employee:', error);
          toast.error('حدث خطأ أثناء تحديث بيانات الموظف');
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
        department: ''
      });
      setSelectedCountry('');
      setSelectedCities([]);

      // Refresh employee list
      loadEmployees();

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

  // Add function to send credentials via SMS
  const sendCredentialsSMS = async () => {
    try {
      setIsSendingSMS(true);
      // Here you would integrate with your SMS service
      // For now, we'll just simulate it
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('تم إرسال بيانات الدخول عبر رسالة نصية');
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast.error('حدث خطأ أثناء إرسال الرسالة النصية');
    } finally {
      setIsSendingSMS(false);
    }
  };

  // Update CredentialsDialog component
  const CredentialsDialog = () => (
    <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            تم إنشاء حساب الموظف بنجاح
          </DialogTitle>
          <DialogDescription>
            يرجى حفظ أو إرسال بيانات الدخول التالية للموظف بشكل آمن
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Credentials Display */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-600">البريد الإلكتروني</Label>
              <div className="flex items-center gap-2 p-2 bg-white rounded border">
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="flex-1 font-medium text-gray-900">{newUserCredentials?.email}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-600">كلمة المرور المؤقتة</Label>
              <div className="flex items-center gap-2 p-2 bg-white rounded border">
                <Key className="w-4 h-4 text-gray-500" />
                <span className="flex-1 font-mono font-medium text-gray-900">{newUserCredentials?.password}</span>
              </div>
            </div>
          </div>

          {/* Send Options */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">خيارات إرسال بيانات الدخول</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={sendCredentialsEmail}
                disabled={isSendingEmail}
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 ml-2" />
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
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 ml-2" />
                    إرسال عبر SMS
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
البريد الإلكتروني: ${newUserCredentials?.email}
كلمة المرور المؤقتة: ${newUserCredentials?.password}

ملاحظات مهمة:
- يرجى تغيير كلمة المرور فور تسجيل الدخول
- هذه البيانات سرية، يرجى عدم مشاركتها
- في حال وجود أي مشكلة، يرجى التواصل مع الدعم الفني
                `.trim();

                navigator.clipboard.writeText(credentials);
                setCredentialsCopied(true);
                toast.success('تم نسخ البيانات إلى الحافظة');

                setTimeout(() => setCredentialsCopied(false), 2000);
              }}
            >
              {credentialsCopied ? (
                <>
                  <Check className="w-4 h-4 ml-2" />
                  تم النسخ
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 ml-2" />
                  نسخ البيانات
                </>
              )}
            </Button>
          </div>

          {/* Important Notes */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              تعليمات مهمة
            </h4>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>سيتم إرسال رابط تغيير كلمة المرور تلقائياً إلى البريد الإلكتروني</li>
              <li>يجب على الموظف تغيير كلمة المرور عند أول تسجيل دخول</li>
              <li>تأكد من إرسال البيانات بشكل آمن</li>
              <li>احتفظ بنسخة من البيانات في مكان آمن للرجوع إليها عند الحاجة</li>
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
            <Check className="w-4 h-4 ml-2" />
            تم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

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
      await updateDoc(doc(db, 'employees', employee.id), {
        isActive: !employee.isActive
      });
      loadEmployees();
    } catch (error) {
      console.error('Error updating employee status:', error);
      alert('حدث خطأ أثناء تحديث حالة الموظف');
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
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
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
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إدارة موظفي الشركة</h1>
            <p className="text-gray-600">إدارة الموظفين وصلاحياتهم في النظام</p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4 ml-2" />
            إضافة موظف
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي الموظفين</p>
                  <p className="text-2xl font-bold">{employees.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">موظفين نشطين</p>
                  <p className="text-2xl font-bold text-green-600">
                    {employees.filter(e => e.isActive).length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">الأقسام</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {new Set(employees.map(e => e.department).filter(Boolean)).size}
                  </p>
                </div>
                <Building2 className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">الوظائف</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {new Set(employees.map(e => e.role)).size}
                  </p>
                </div>
                <Briefcase className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>البحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث بالاسم، البريد، القسم..."
                  className="pr-10"
                />
              </div>
            </div>

            <div>
              <Label>الوظيفة</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الوظائف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الوظائف</SelectItem>
                  <SelectItem value="support">دعم فني</SelectItem>
                  <SelectItem value="finance">مالية</SelectItem>
                  <SelectItem value="sales">مبيعات</SelectItem>
                  <SelectItem value="content">محتوى</SelectItem>
                  <SelectItem value="supervisor">مشرف</SelectItem>
                  <SelectItem value="admin">مدير نظام</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <p className="text-sm text-gray-600">
                {filteredEmployees.length} من {employees.length} موظف
              </p>
            </div>
          </div>
        </div>

        {/* Employees Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الموظف</TableHead>
                <TableHead>الوظيفة</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>التواصل</TableHead>
                <TableHead>المناطق</TableHead>
                <TableHead>التبعية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        {employee.avatar ? (
                          <img
                            src={employee.avatar}
                            alt={employee.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <Users className="w-5 h-5 text-gray-600" />
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
                      {employee.role === 'support' && 'دعم فني'}
                      {employee.role === 'finance' && 'مالية'}
                      {employee.role === 'sales' && 'مبيعات'}
                      {employee.role === 'content' && 'محتوى'}
                      {employee.role === 'supervisor' && 'مشرف'}
                      {employee.role === 'admin' && 'مدير نظام'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span>{employee.department || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{employee.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{employee.phone || '-'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {renderLocations(employee)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        {employee.supervisor ? (
                          employees.find(emp => emp.id === employee.supervisor)?.name || 'غير محدد'
                        ) : 'بدون مشرف'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
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
                    {renderEmployeeActions(employee)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Add/Edit Employee Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
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

            <EmployeeForm />

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
                  setSelectedCountry('');
                  setSelectedCities([]);
                  setFormErrors({
                    name: '',
                    email: '',
                    phone: '',
                    role: '',
                    department: ''
                  });
                }}
                className="px-6"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                onClick={handleSaveEmployee}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8"
              >
                {editingEmployee ? (
                  <>
                    <Edit className="w-4 h-4 ml-2" />
                    تحديث الموظف
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 ml-2" />
                    إضافة الموظف
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Credentials Dialog */}
        <CredentialsDialog />
        </div>
      </div>
    </AccountTypeProtection>
  );
}

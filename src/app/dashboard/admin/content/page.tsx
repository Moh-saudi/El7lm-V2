'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Eye, FileText, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  type: 'page' | 'post' | 'announcement';
  status: 'published' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export default function AdminContentPage() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);

  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load content items on component mount
  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await fetch('/api/admin/content');
        const result = await response.json();

        if (result.success) {
          setContentItems(result.data.items);
        } else {
          console.error('Failed to load content:', result.error);
        }
      } catch (error) {
        console.error('Error loading content:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadContent();
  }, []);

  const handleSave = async () => {
    if (!selectedItem) return;

    setLoading(true);
    try {
      const isNew = !selectedItem.id || selectedItem.id.startsWith('temp_');
      const url = '/api/admin/content';
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedItem),
      });

      const result = await response.json();

      if (result.success) {
        if (isNew) {
          setContentItems(prev => [result.data, ...prev]);
        } else {
          setContentItems(prev =>
            prev.map(item => item.id === selectedItem.id ? result.data : item)
          );
        }
        alert('تم حفظ المحتوى بنجاح');
        setIsEditing(false);
        setSelectedItem(null);
      } else {
        throw new Error(result.error || 'فشل في حفظ المحتوى');
      }
    } catch (error) {
      console.error('Error saving content:', error);
      alert(`حدث خطأ أثناء حفظ المحتوى: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المحتوى؟')) {
      try {
        const response = await fetch(`/api/admin/content?id=${id}`, {
          method: 'DELETE',
        });

        const result = await response.json();

        if (result.success) {
          setContentItems(prev => prev.filter(item => item.id !== id));
          if (selectedItem?.id === id) {
            setSelectedItem(null);
            setIsEditing(false);
          }
          alert('تم حذف المحتوى بنجاح');
        } else {
          throw new Error(result.error || 'فشل في حذف المحتوى');
        }
      } catch (error) {
        console.error('Error deleting content:', error);
        alert(`حدث خطأ أثناء حذف المحتوى: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
      }
    }
  };

  const handleEdit = (item: ContentItem) => {
    setSelectedItem(item);
    setIsEditing(true);
  };

  const handleNew = () => {
    setSelectedItem({
      id: `temp_${Date.now()}`,
      title: '',
      content: '',
      type: 'page',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setIsEditing(true);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل المحتوى...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            إدارة المحتوى
          </h1>
          <p className="text-gray-600">
            إدارة صفحات الموقع والمحتوى
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Content List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>قائمة المحتوى</CardTitle>
                <CardDescription>
                  جميع عناصر المحتوى
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button
                    onClick={handleNew}
                    className="w-full"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    إضافة محتوى جديد
                  </Button>

                  <Separator />

                  {contentItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedItem?.id === item.id
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.title}</h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {item.type} • {item.status}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Editor */}
          <div className="lg:col-span-2">
            {selectedItem ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {isEditing ? 'تحرير المحتوى' : 'عرض المحتوى'}
                    </span>
                    <div className="flex gap-2">
                      {!isEditing && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          تحرير
                        </Button>
                      )}
                      {isEditing && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          عرض
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {isEditing ? 'تحرير تفاصيل المحتوى' : 'عرض تفاصيل المحتوى'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">العنوان</Label>
                    <Input
                      id="title"
                      value={selectedItem.title}
                      onChange={(e) => setSelectedItem(prev => prev ? { ...prev, title: e.target.value } : null)}
                      disabled={!isEditing}
                      placeholder="عنوان المحتوى"
                    />
                  </div>

                  <div>
                    <Label htmlFor="type">النوع</Label>
                    <select
                      id="type"
                      name="content-type"
                      aria-label="نوع المحتوى"
                      value={selectedItem.type}
                      onChange={(e) => setSelectedItem(prev => prev ? { ...prev, type: e.target.value as any } : null)}
                      disabled={!isEditing}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="page">صفحة</option>
                      <option value="post">مقال</option>
                      <option value="announcement">إعلان</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="status">الحالة</Label>
                    <select
                      id="status"
                      name="content-status"
                      aria-label="حالة المحتوى"
                      value={selectedItem.status}
                      onChange={(e) => setSelectedItem(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                      disabled={!isEditing}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="draft">مسودة</option>
                      <option value="published">منشور</option>
                      <option value="archived">مؤرشف</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="content">المحتوى</Label>
                    <Textarea
                      id="content"
                      value={selectedItem.content}
                      onChange={(e) => setSelectedItem(prev => prev ? { ...prev, content: e.target.value } : null)}
                      disabled={!isEditing}
                      placeholder="محتوى النص"
                      rows={8}
                    />
                  </div>

                  {isEditing && (
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        disabled={loading}
                      >
                        إلغاء
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={loading}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'جاري الحفظ...' : 'حفظ'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>اختر عنصر محتوى للعرض أو التحرير</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

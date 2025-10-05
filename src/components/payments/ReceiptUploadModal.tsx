'use client';

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  X, 
  DollarSign, 
  Users, 
  Calendar,
  Image,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ReceiptUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: {
    tournamentName: string;
    amount: number;
    playerCount: number;
    registrationId: string;
  };
  onUploadSuccess?: (receiptData: any) => void;
}

export default function ReceiptUploadModal({ 
  isOpen, 
  onClose, 
  paymentData, 
  onUploadSuccess 
}: ReceiptUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        toast.error('يرجى اختيار ملف صورة أو PDF فقط');
        return;
      }
      
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('حجم الملف يجب أن يكون أقل من 5 ميجابايت');
        return;
      }

      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('يرجى اختيار ملف الإيصال');
      return;
    }

    setUploading(true);
    
    try {
      // Simulate upload process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const receiptData = {
        file: selectedFile,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        notes: notes,
        uploadDate: new Date(),
        paymentReference: `PAY-${paymentData.registrationId.slice(-8).toUpperCase()}`,
        amount: paymentData.amount,
        tournamentName: paymentData.tournamentName
      };

      toast.success('تم رفع الإيصال بنجاح! سيتم مراجعته خلال 24 ساعة');
      onUploadSuccess?.(receiptData);
      onClose();
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setNotes('');
      
    } catch (error) {
      toast.error('فشل في رفع الإيصال');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-blue-600 flex items-center justify-center gap-2">
            <Upload className="h-8 w-8" />
            رفع إيصال الدفع
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            ارفع إيصال الدفع لتأكيد عملية الدفع
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="p-3 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600">المبلغ الإجمالي المطلوب</p>
                  <p className="text-xl font-bold text-blue-800">{paymentData.amount} ج.م</p>
                </div>
                
                <div className="text-center">
                  <div className="p-3 bg-green-100 rounded-full w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600">عدد اللاعبين</p>
                  <p className="text-xl font-bold text-green-800">{paymentData.playerCount}</p>
                </div>
                
                <div className="text-center">
                  <div className="p-3 bg-orange-100 rounded-full w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-orange-600" />
                  </div>
                  <p className="text-sm text-gray-600">البطولة</p>
                  <p className="text-lg font-bold text-orange-800 line-clamp-1">{paymentData.tournamentName}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold text-gray-700">إيصال الدفع</Label>
            
            {!selectedFile ? (
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Upload className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">اضغط لرفع الإيصال</h3>
                <p className="text-sm text-gray-600 mb-4">
                  يمكنك رفع صورة أو ملف PDF للإيصال
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Image className="h-4 w-4" />
                  <span>JPG, PNG, PDF</span>
                  <span>•</span>
                  <span>أقل من 5 ميجابايت</span>
                </div>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {previewUrl && (
                  <div className="mt-4">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                )}
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="رفع ملف الإيصال"
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-base font-semibold text-gray-700">
              ملاحظات إضافية (اختياري)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات أو تفاصيل إضافية حول الدفع..."
              className="min-h-[100px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Payment Reference */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">رقم المرجع</span>
            </div>
            <p className="text-lg font-mono font-bold text-gray-900">
              PAY-{paymentData.registrationId.slice(-8).toUpperCase()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              تأكد من وجود هذا الرقم في إيصال الدفع
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <X className="h-4 w-4 mr-2" />
              إلغاء
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  جاري الرفع...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  رفع الإيصال
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

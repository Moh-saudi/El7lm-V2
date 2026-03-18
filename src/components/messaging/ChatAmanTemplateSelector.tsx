import React, { useEffect, useState } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { useChatAmanTemplates } from '@/hooks/use-chataman-templates';
import { ChatAmanTemplate } from '@/lib/services/chataman-service';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export interface ShortcutItem {
  label: string;
  value: string;
}

interface ChatAmanTemplateSelectorProps {
  onSelect: (template: ChatAmanTemplate | null, variables: string[]) => void;
  targetName?: string;
  targetPhone?: string;
  shortcuts?: ShortcutItem[]; // Optional list of custom shortcuts
  initialTemplateName?: string;
  className?: string;
}

export const ChatAmanTemplateSelector: React.FC<ChatAmanTemplateSelectorProps> = ({
  onSelect,
  targetName = '',
  targetPhone = '',
  shortcuts = [],
  initialTemplateName = 'none',
  className = ''
}) => {
  const { templates, loading, getVariableCount } = useChatAmanTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<ChatAmanTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);

  // Default shortcuts for typical client flows
  const defaultShortcuts: ShortcutItem[] = [
    ...(targetName ? [{ label: 'اسم العميل', value: targetName }] : []),
    ...(targetPhone ? [{ label: 'رقم الهاتف', value: targetPhone }] : []),
    { label: 'تاريخ اليوم', value: new Date().toLocaleDateString('ar-EG') },
    { label: 'رابط المنصة', value: 'https://el7lm.com' }
  ];

  const mergedShortcuts = [...defaultShortcuts, ...shortcuts];

  useEffect(() => {
    if (initialTemplateName && initialTemplateName !== 'none' && templates.length > 0) {
      handleSelectTemplate(initialTemplateName);
    }
  }, [initialTemplateName, templates]);

  const handleSelectTemplate = (templateName: string) => {
    if (templateName === 'none') {
      setSelectedTemplate(null);
      setTemplateVariables([]);
      onSelect(null, []);
      return;
    }

    const template = templates.find(t => t.name === templateName);
    if (!template) return;

    setSelectedTemplate(template);
    const varCount = getVariableCount(template);
    
    // Auto-fill variables based on count
    const initialVars = Array(varCount).fill('');
    if (varCount > 0 && targetName) {
      initialVars[0] = targetName; // Autoload Name into first variable by default
    }
    setTemplateVariables(initialVars);
    onSelect(template, initialVars);
  };

  const handleVariableChange = (index: number, value: string) => {
    const list = [...templateVariables];
    list[index] = value;
    setTemplateVariables(list);
    onSelect(selectedTemplate, list);
  };

  if (loading) {
     return <p className="text-center text-xs text-slate-400 py-3 animate-pulse">جاري جلب قوالب ChatAman...</p>;
  }

  return (
    <div className={`space-y-3 ${className}`} dir="rtl">
      <div>
        <Label className="text-xs font-bold text-slate-700">تحديد القالب من ChatAman</Label>
        <Select onValueChange={handleSelectTemplate} defaultValue={initialTemplateName}>
          <SelectTrigger className="text-xs h-9 border-slate-200 bg-white">
            <SelectValue placeholder="اختر قالباً للإرسال..." />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="none" className="font-bold text-slate-500">-- رسالة نصية حرة --</SelectItem>
            {templates.map(t => (
              <SelectItem key={t.name} value={t.name}>
                <div className="flex items-center justify-between w-full gap-6">
                  <span>{t.name}</span>
                  <Badge variant="outline" className={`text-[9px] font-normal px-1 py-0 h-4 ${
                    t.category?.toUpperCase() === 'MARKETING' 
                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                      : 'bg-sky-50 text-sky-700 border-sky-200'
                  }`}>
                    {t.category === 'MARKETING' ? 'تسويقي' : t.category === 'UTILITY' ? 'خدمي' : t.category || 'عام'}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTemplate && (
        <div className="p-3 border rounded-lg bg-slate-50/50 text-[11px] text-slate-600 border-dashed relative">
          <div className="absolute top-2 left-2">
             <Badge variant="outline" className={`text-[9px] font-normal px-1.5 py-0 h-4 ${
               selectedTemplate.category?.toUpperCase() === 'MARKETING' 
                 ? 'bg-amber-50 text-amber-700 border-amber-200' 
                 : 'bg-sky-50 text-sky-700 border-sky-200'
             }`}>
               {selectedTemplate.category === 'MARKETING' ? 'تسويقي (Marketing)' : selectedTemplate.category === 'UTILITY' ? 'خدمي (Utility)' : selectedTemplate.category || 'عام'}
             </Badge>
          </div>
          <span className="font-bold text-emerald-600 border-b pb-1 mb-1 block">محتوى القالب:</span>
          <div className="pt-2">{selectedTemplate.body || 'لا يوجد نص معاينة'}</div>
        </div>
      )}

      {selectedTemplate && templateVariables.length > 0 && (
        <div className="space-y-2 mt-4">
          <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            تعبئة المتغيرات الذكية
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {templateVariables.map((v, idx) => (
              <div key={idx} className="space-y-1">
                <Label className="text-[10px] text-slate-400">متغير {`{{${idx+1}}}`}</Label>
                <div className="relative">
                  <Input 
                    value={v}
                    onChange={(e) => handleVariableChange(idx, e.target.value)}
                    placeholder="اكتب المعطى..."
                    className="h-8 text-[11px] border-slate-200 bg-white pr-8 focus-visible:ring-emerald-500"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/80 rounded-md">
                          <Sparkles className="w-3 h-3 animate-pulse" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="text-[11px] w-52 shadow-xl border border-slate-100 rounded-xl" align="end">
                        <DropdownMenuLabel className="text-[10px] text-slate-400 text-right">💡 حشو تلقائي ذكي</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-slate-100" />
                        {mergedShortcuts.filter(s => s.value).map((s, sIdx) => (
                          <DropdownMenuItem 
                            key={sIdx} 
                            className="text-right cursor-pointer flex items-center justify-between p-2 hover:bg-emerald-50/60" 
                            onClick={() => handleVariableChange(idx, s.value)}
                          >
                            <span className="font-semibold text-slate-700">{s.label}</span>
                            <Badge variant="outline" className="text-[8px] font-normal border-emerald-100 bg-emerald-50/50 text-emerald-700 truncate max-w-[120px]">{s.value}</Badge>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

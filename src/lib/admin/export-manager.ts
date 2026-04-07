/**
 * نظام التصدير المتقدم للأدمن - Supabase Edition
 * تم تحويله من Firebase Firestore إلى Supabase
 */

import { supabase } from '@/lib/supabase/config';

export interface ExportConfig {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  dataType: 'users' | 'payments' | 'financial' | 'system' | 'comprehensive';
  fileName?: string;
  filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    status?: string;
    type?: string;
    country?: string;
  };
  includeCharts?: boolean;
  language?: 'ar' | 'en';
  compression?: boolean;
}

export interface ScheduledReport {
  id?: string;
  name: string;
  description: string;
  config: ExportConfig;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    enabled: boolean;
  };
  recipients: string[];
  createdBy: string;
  lastRun?: string;
  nextRun?: string;
  isActive: boolean;
}

export interface ExportData {
  users?: Record<string, unknown>[];
  payments?: Record<string, unknown>[];
  statistics?: Record<string, unknown>;
  metadata: { exportedAt: Date; exportedBy: string; totalRecords: number; filters: Record<string, unknown> };
}

class AdminExportManager {
  private static instance: AdminExportManager;

  static getInstance(): AdminExportManager {
    if (!AdminExportManager.instance) {
      AdminExportManager.instance = new AdminExportManager();
    }
    return AdminExportManager.instance;
  }

  async exportData(config: ExportConfig, adminId: string): Promise<Blob> {
    console.log(`🔄 [Export] بدء تصدير البيانات بتنسيق ${config.format}`);
    const data = await this.collectData(config);
    switch (config.format) {
      case 'pdf': return this.generatePDF(data, config);
      case 'excel': return this.generateExcel(data, config);
      case 'csv': return this.generateCSV(data, config);
      case 'json': return this.generateJSON(data, config);
      default: throw new Error(`نوع التصدير غير مدعوم: ${config.format}`);
    }
  }

  private async collectData(config: ExportConfig): Promise<ExportData> {
    const data: ExportData = {
      metadata: { exportedAt: new Date(), exportedBy: 'admin', totalRecords: 0, filters: config.filters || {} },
    };

    switch (config.dataType) {
      case 'users':
        data.users = await this.getUsersData(config.filters);
        data.metadata.totalRecords = data.users.length;
        break;
      case 'payments':
        data.payments = await this.getPaymentsData(config.filters);
        data.metadata.totalRecords = data.payments.length;
        break;
      case 'financial':
        data.payments = await this.getPaymentsData(config.filters);
        data.statistics = await this.getFinancialStats(config.filters);
        data.metadata.totalRecords = data.payments.length;
        break;
      case 'comprehensive':
        data.users = await this.getUsersData(config.filters);
        data.payments = await this.getPaymentsData(config.filters);
        data.statistics = await this.getSystemStats();
        data.metadata.totalRecords = (data.users?.length || 0) + (data.payments?.length || 0);
        break;
      case 'system':
        data.statistics = await this.getSystemStats();
        data.metadata.totalRecords = 1;
        break;
    }

    console.log(`✅ [Export] تم جمع ${data.metadata.totalRecords} سجل`);
    return data;
  }

  private async getUsersData(filters?: ExportConfig['filters']): Promise<Record<string, unknown>[]> {
    const tables = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents'];
    const users: Record<string, unknown>[] = [];

    for (const table of tables) {
      try {
        let query = supabase.from(table).select('*').order('createdAt', { ascending: false });
        if (filters?.dateFrom) query = query.gte('createdAt', filters.dateFrom.toISOString());
        if (filters?.dateTo) query = query.lte('createdAt', filters.dateTo.toISOString());

        const { data } = await query;
        (data ?? []).forEach((row: Record<string, unknown>) => {
          users.push({
            id: row.id, type: table,
            name: row.name ?? row.full_name,
            email: row.email, phone: row.phone,
            country: row.country, city: row.city,
            accountType: row.accountType ?? row.role,
            isVerified: row.isVerified ?? false,
            createdAt: row.createdAt ?? new Date().toISOString(),
            ...row,
          });
        });
      } catch (e) {
        console.warn(`فشل في جلب ${table}:`, e);
      }
    }

    return users;
  }

  private async getPaymentsData(filters?: ExportConfig['filters']): Promise<Record<string, unknown>[]> {
    try {
      let query = supabase.from('payments').select('*').order('createdAt', { ascending: false });
      if (filters?.dateFrom) query = query.gte('createdAt', filters.dateFrom.toISOString());
      if (filters?.dateTo) query = query.lte('createdAt', filters.dateTo.toISOString());
      if (filters?.status) query = query.eq('status', filters.status);

      const { data } = await query;
      const dbPayments = (data ?? []) as Record<string, unknown>[];
      const localPayments = this.getLocalStoragePayments();
      return [...dbPayments, ...localPayments];
    } catch (error) {
      console.error('خطأ في جلب بيانات المدفوعات:', error);
      return [];
    }
  }

  private async getFinancialStats(filters?: ExportConfig['filters']): Promise<Record<string, unknown>> {
    const payments = await this.getPaymentsData(filters);
    return {
      totalTransactions: payments.length,
      completedTransactions: payments.filter(p => p.status === 'completed').length,
      failedTransactions: payments.filter(p => p.status === 'failed').length,
      totalRevenue: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount || 0), 0),
      byCurrency: this.groupByCurrency(payments),
      byPaymentMethod: this.groupByPaymentMethod(payments),
      dailyStats: this.getDailyStats(payments),
      topPayers: this.getTopPayers(payments),
    };
  }

  private async getSystemStats(): Promise<Record<string, unknown>> {
    const tables = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents', 'payments'];
    const stats: Record<string, unknown> = { collectionCounts: {}, totalUsers: 0, systemHealth: 'healthy', lastUpdate: new Date() };
    const counts = stats.collectionCounts as Record<string, number>;
    let totalUsers = 0;

    for (const table of tables) {
      try {
        const { count } = await supabase.from(table).select('id', { count: 'exact', head: true });
        counts[table] = count ?? 0;
        if (table !== 'payments') totalUsers += count ?? 0;
      } catch {
        counts[table] = 0;
      }
    }
    stats.totalUsers = totalUsers;
    return stats;
  }

  private generateCSV(data: ExportData, _config: ExportConfig): Blob {
    let csvContent = '';
    const exportData = data.users?.length ? data.users : (data.payments ?? []);
    if (exportData.length > 0) {
      const headers = Object.keys(exportData[0]);
      csvContent += headers.join(',') + '\n';
      exportData.forEach(row => {
        const values = headers.map(h => {
          const v = row[h];
          if (v === null || v === undefined) return '';
          if (typeof v === 'object') return JSON.stringify(v);
          return String(v).replace(/,/g, ';');
        });
        csvContent += values.join(',') + '\n';
      });
    }
    return new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  private generatePDF(data: ExportData, config: ExportConfig): Blob {
    let content = `تقرير ${this.getReportTitle(config.dataType, config.language || 'ar')}\n\n`;
    content += `تاريخ التصدير: ${data.metadata.exportedAt.toLocaleString('ar-EG')}\n`;
    content += `عدد السجلات: ${data.metadata.totalRecords}\n\n`;
    if (data.users) content += `المستخدمين: ${data.users.length}\n`;
    if (data.payments) content += `المدفوعات: ${data.payments.length}\n`;
    if (data.statistics) content += `الإحصائيات: متوفرة\n`;
    return new Blob([content], { type: 'text/plain;charset=utf-8;' });
  }

  private generateExcel(data: ExportData, config: ExportConfig): Blob {
    let content = `${this.getReportTitle(config.dataType, config.language || 'ar')}\n`;
    content += `تاريخ التصدير: ${data.metadata.exportedAt.toLocaleString('ar-EG')}\n\n`;
    if (data.users?.length) {
      content += 'المستخدمين:\nالنوع\tالاسم\tالبريد\tالدولة\n';
      data.users.slice(0, 100).forEach(u => {
        content += `${u.type || ''}\t${u.name || ''}\t${u.email || ''}\t${u.country || ''}\n`;
      });
      content += '\n';
    }
    if (data.payments?.length) {
      content += 'المدفوعات:\nالمبلغ\tالعملة\tالحالة\tالتاريخ\n';
      data.payments.slice(0, 100).forEach(p => {
        content += `${p.amount || ''}\t${p.currency || ''}\t${p.status || ''}\t${p.createdAt || ''}\n`;
      });
    }
    return new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  }

  private generateJSON(data: ExportData, config: ExportConfig): Blob {
    return new Blob([JSON.stringify({ ...data, exportConfig: config, version: '1.0' }, null, 2)], { type: 'application/json' });
  }

  private getLocalStoragePayments(): Record<string, unknown>[] {
    try {
      const localData = localStorage.getItem('bulkPaymentHistory');
      return localData ? JSON.parse(localData) : [];
    } catch { return []; }
  }

  private groupByCurrency(payments: Record<string, unknown>[]) {
    const g: Record<string, { count: number; total: number }> = {};
    payments.forEach(p => {
      const c = String(p.currency || 'EGP');
      g[c] = g[c] || { count: 0, total: 0 };
      g[c].count++; g[c].total += Number(p.amount || 0);
    });
    return g;
  }

  private groupByPaymentMethod(payments: Record<string, unknown>[]) {
    const g: Record<string, number> = {};
    payments.forEach(p => { const m = String(p.paymentMethod || 'unknown'); g[m] = (g[m] || 0) + 1; });
    return g;
  }

  private getDailyStats(payments: Record<string, unknown>[]) {
    const d: Record<string, { count: number; revenue: number }> = {};
    payments.forEach(p => {
      const date = p.createdAt ? String(p.createdAt).split('T')[0] : new Date().toISOString().split('T')[0];
      d[date] = d[date] || { count: 0, revenue: 0 };
      d[date].count++;
      if (p.status === 'completed') d[date].revenue += Number(p.amount || 0);
    });
    return Object.entries(d).map(([date, s]) => ({ date, ...s }));
  }

  private getTopPayers(payments: Record<string, unknown>[]) {
    const s: Record<string, { name: string; total: number; count: number }> = {};
    payments.filter(p => p.status === 'completed' && p.payerId).forEach(p => {
      const id = String(p.payerId);
      s[id] = s[id] || { name: String(p.payerName || 'غير محدد'), total: 0, count: 0 };
      s[id].total += Number(p.amount || 0); s[id].count++;
    });
    return Object.entries(s).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.total - a.total).slice(0, 10);
  }

  private getReportTitle(dataType: string, language: string): string {
    const titles: Record<string, Record<string, string>> = {
      ar: { users: 'تقرير المستخدمين', payments: 'تقرير المدفوعات', financial: 'التقرير المالي', system: 'تقرير النظام', comprehensive: 'التقرير الشامل' },
      en: { users: 'Users Report', payments: 'Payments Report', financial: 'Financial Report', system: 'System Report', comprehensive: 'Comprehensive Report' },
    };
    return titles[language]?.[dataType] || 'تقرير عام';
  }

  async downloadFile(blob: Blob, filename: string): Promise<void> {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log(`✅ [Export] تم تنزيل الملف: ${filename}`);
  }
}

export const adminExportManager = AdminExportManager.getInstance();

export const exportUsers = async (format: 'pdf' | 'excel' | 'csv' = 'excel', filters?: ExportConfig['filters']) => {
  const config: ExportConfig = { format, dataType: 'users', fileName: `users_${format}_${new Date().toISOString().split('T')[0]}`, filters };
  const blob = await adminExportManager.exportData(config, 'admin');
  await adminExportManager.downloadFile(blob, `${config.fileName}.${format === 'excel' ? 'xls' : format}`);
};

export const exportPayments = async (format: 'pdf' | 'excel' | 'csv' = 'excel', filters?: ExportConfig['filters']) => {
  const config: ExportConfig = { format, dataType: 'payments', fileName: `payments_${format}_${new Date().toISOString().split('T')[0]}`, filters };
  const blob = await adminExportManager.exportData(config, 'admin');
  await adminExportManager.downloadFile(blob, `${config.fileName}.${format === 'excel' ? 'xls' : format}`);
};

export const exportFinancialReport = async (format: 'pdf' | 'excel' = 'pdf', filters?: ExportConfig['filters']) => {
  const config: ExportConfig = { format, dataType: 'financial', fileName: `financial_report_${new Date().toISOString().split('T')[0]}`, filters, includeCharts: true };
  const blob = await adminExportManager.exportData(config, 'admin');
  await adminExportManager.downloadFile(blob, `${config.fileName}.${format === 'excel' ? 'xls' : format}`);
};

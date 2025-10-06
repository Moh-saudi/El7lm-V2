import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileTableProps {
  data: Array<Record<string, any>>;
  columns: Array<{
    key: string;
    label: string;
    render?: (value: any, row: any) => React.ReactNode;
    className?: string;
  }>;
  actions?: (row: any) => React.ReactNode;
  className?: string;
  emptyMessage?: string;
}

const MobileTable: React.FC<MobileTableProps> = ({
  data,
  columns,
  actions,
  className = '',
  emptyMessage = 'لا توجد بيانات'
}) => {
  if (data.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {data.map((row, index) => (
        <Card key={index} className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              العنصر #{index + 1}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {columns.map((column) => {
              const value = row[column.key];
              const renderedValue = column.render ? column.render(value, row) : value;
              
              return (
                <div key={column.key} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">
                    {column.label}:
                  </span>
                  <div className={cn('text-sm text-gray-900', column.className)}>
                    {renderedValue}
                  </div>
                </div>
              );
            })}
            
            {actions && (
              <div className="pt-3 border-t">
                <div className="flex gap-2 justify-end">
                  {actions(row)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MobileTable;

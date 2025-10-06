import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface VirtualTableProps {
  data: Array<Record<string, any>>;
  columns: Array<{
    key: string;
    label: string;
    width?: number;
    render?: (value: any, row: any, index: number) => React.ReactNode;
    className?: string;
  }>;
  height?: number;
  itemHeight?: number;
  className?: string;
  onRowClick?: (row: any, index: number) => void;
  selectedRows?: Set<string>;
  onRowSelect?: (rowId: string, selected: boolean) => void;
}

const VirtualTable: React.FC<VirtualTableProps> = ({
  data,
  columns,
  height = 400,
  itemHeight = 50,
  className = '',
  onRowClick,
  selectedRows = new Set(),
  onRowSelect
}) => {
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      setContainerWidth(window.innerWidth);
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const totalWidth = useMemo(() => {
    return columns.reduce((sum, col) => sum + (col.width || 150), 0);
  }, [columns]);

  const Row = useCallback(({ index, style }: { index: number; style: any }) => {
    const row = data[index];
    if (!row) return null;

    const isSelected = selectedRows.has(row.id);

    return (
      <div
        className={cn(
          'flex items-center border-b border-gray-200 hover:bg-gray-50 cursor-pointer',
          isSelected && 'bg-blue-50',
          className
        )}
        onClick={() => onRowClick?.(row, index)}
      >
        {columns.map((column) => {
          const value = row[column.key];
          const renderedValue = column.render ? column.render(value, row, index) : value;

          return (
            <div
              key={column.key}
              className={cn(
                'px-4 py-2 flex-shrink-0',
                column.className
              )}
            >
              {renderedValue}
            </div>
          );
        })}
      </div>
    );
  }, [data, columns, selectedRows, onRowClick, className]);

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        لا توجد بيانات للعرض
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center border-b-2 border-gray-300 bg-gray-50 font-medium text-gray-700">
        {columns.map((column) => (
          <div
            key={column.key}
            className="px-4 py-3 flex-shrink-0"
          >
            {column.label}
          </div>
        ))}
      </div>

      {/* Virtual List */}
      <List
        height={height}
        itemCount={data.length}
        itemSize={itemHeight}
        width="100%"
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {Row}
      </List>
    </div>
  );
};

export default VirtualTable;

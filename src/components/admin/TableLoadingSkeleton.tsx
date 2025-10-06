import React from 'react';

interface TableLoadingSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

const TableLoadingSkeleton: React.FC<TableLoadingSkeletonProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true
}) => {
  return (
    <div className="w-full">
      {showHeader && (
        <div className="grid grid-cols-4 gap-4 p-4 border-b bg-gray-50">
          {Array.from({ length: columns }).map((_, index) => (
            <div
              key={index}
              className="h-4 bg-gray-200 rounded animate-pulse"
            />
          ))}
        </div>
      )}

      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-4 gap-4 p-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className={`h-4 bg-gray-200 rounded animate-pulse ${
                  colIndex === 0 ? 'w-3/4' : 'w-full'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableLoadingSkeleton;

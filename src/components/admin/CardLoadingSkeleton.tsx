import React from 'react';

interface CardLoadingSkeletonProps {
  count?: number;
  showImage?: boolean;
  showActions?: boolean;
}

const CardLoadingSkeleton: React.FC<CardLoadingSkeletonProps> = ({
  count = 3,
  showImage = false,
  showActions = false
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg border p-6 animate-pulse">
          {showImage && (
            <div className="w-full h-48 bg-gray-200 rounded-lg mb-4" />
          )}

          <div className="space-y-3">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />

            {showActions && (
              <div className="flex gap-2 pt-4">
                <div className="h-8 bg-gray-200 rounded w-20" />
                <div className="h-8 bg-gray-200 rounded w-20" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CardLoadingSkeleton;

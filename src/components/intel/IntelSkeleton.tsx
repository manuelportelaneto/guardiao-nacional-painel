import React from 'react';

interface IntelSkeletonProps {
    className?: string;
}

export const IntelSkeleton: React.FC<IntelSkeletonProps> = ({ className }) => {
    return (
        <div className={`animate-pulse bg-gray-800/50 rounded-xl ${className}`}>
            <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-4"></div>
            <div className="space-y-3">
                <div className="h-3 bg-gray-700/50 rounded"></div>
                <div className="h-3 bg-gray-700/50 rounded w-5/6"></div>
                <div className="h-3 bg-gray-700/50 rounded w-4/6"></div>
            </div>
        </div>
    );
};

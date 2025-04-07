import React from 'react';

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const containerClasses = {
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  };

  return (
    <div className={`flex items-center justify-center ${containerClasses[size]} ${className}`}>
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute w-full h-full border-4 border-blue-200 rounded-full animate-pulse"></div>
        <div className="absolute w-full h-full border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
        <div className="absolute w-full h-full border-4 border-transparent rounded-full animate-ping border-b-blue-400"></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;

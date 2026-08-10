import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'gray' | 'green' | 'amber' | 'purple' | 'indigo' | 'emerald';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'gray', size = 'sm' }: BadgeProps) {
  const variantStyles = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {children}
    </span>
  );
}

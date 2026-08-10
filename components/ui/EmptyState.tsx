import React from 'react';
import Link from 'next/link';
import { SearchX, PlusCircle } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionHref?: string;
  actionText?: string;
  onClearFilters?: () => void;
}

export function EmptyState({
  title = 'No case studies found',
  description = 'Try adjusting your search criteria or filters, or add a new case study via the Admin portal.',
  actionHref,
  actionText,
  onClearFilters,
}: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-gray-200 bg-white max-w-xl mx-auto my-8">
      <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
        <SearchX className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto leading-relaxed">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Clear Filters
          </button>
        )}
        {actionHref && actionText && (
          <Link
            href={actionHref}
            className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{actionText}</span>
          </Link>
        )}
      </div>
    </div>
  );
}

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-gray-800">Case Study Hub</span>
          <span>&bull;</span>
          <span>Internal Enterprise Repository</span>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-6">
          <Link href="/case-studies" className="hover:text-gray-900 transition-colors">
            Library
          </Link>
          <Link href="/admin" className="hover:text-gray-900 transition-colors">
            Admin Portal
          </Link>
          <Link href="/admin/case-studies/import" className="hover:text-gray-900 transition-colors">
            Bulk Import
          </Link>
        </div>
      </div>
    </footer>
  );
}

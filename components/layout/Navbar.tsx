'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Shield, PlusCircle, Layers, LogIn, UploadCloud } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/case-studies' && pathname.startsWith('/case-studies') && !pathname.startsWith('/admin')) {
      return true;
    }
    return pathname === path;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo */}
          <div className="flex items-center space-x-8">
            <Link href="/case-studies" className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-semibold">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-gray-900 tracking-tight">
                Case Study <span className="text-blue-600">Hub</span>
              </span>
            </Link>

            {/* Public Navigation Links */}
            <nav className="hidden md:flex space-x-1">
              <Link
                href="/case-studies"
                className={`px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/case-studies')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Library
              </Link>
            </nav>
          </div>

          {/* Right Action / Admin Navigation */}
          <div className="flex items-center space-x-3">
            <Link
              href="/admin/case-studies/new"
              className="inline-flex items-center space-x-1.5 text-xs sm:text-sm px-3.5 py-2 rounded-md font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-gray-500" />
              <span>Upload PDF</span>
            </Link>

            <Link
              href="/admin/case-studies/import"
              className="hidden lg:inline-flex items-center space-x-1.5 text-xs sm:text-sm px-3.5 py-2 rounded-md font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <UploadCloud className="w-4 h-4 text-gray-500" />
              <span>Bulk Import</span>
            </Link>

            <div className="h-5 w-px bg-gray-200 mx-1 hidden sm:block" />

            <Link
              href="/admin"
              className={`inline-flex items-center space-x-1.5 text-sm px-3.5 py-2 rounded-md font-medium transition-colors ${
                pathname.startsWith('/admin')
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </Link>

            <Link
              href="/login"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Auth Login"
            >
              <LogIn className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

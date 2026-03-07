'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, MessageSquareText, Menu } from 'lucide-react';
import clsx from 'clsx';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      name: '简历优化',
      href: '/resume',
      icon: FileText,
    },
    {
      name: 'AI 模拟面试',
      href: '/interview',
      icon: MessageSquareText,
    },
  ];

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-screen shadow-xl z-50">
      <div className="p-6 border-b border-gray-800 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Menu className="w-5 h-5 text-white" />
        </div>
        <h1 className="font-bold text-lg tracking-wide">AI 求职助手</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className={clsx('w-5 h-5', isActive ? 'text-white' : 'text-gray-400 group-hover:text-white')} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="bg-gray-800/50 rounded-lg p-4 text-xs text-gray-400 text-center">
          © 2024 AI Career Agent
          <br />
          赋能你的职业未来
        </div>
      </div>
    </div>
  );
}

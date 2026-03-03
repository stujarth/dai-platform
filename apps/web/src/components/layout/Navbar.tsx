import { Link, NavLink } from 'react-router-dom'
import { MessageSquare, Wand2, LayoutDashboard, GitBranch } from 'lucide-react'
import { useChatStore } from '@/stores/chat-store'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/wizard', label: 'Wizard', icon: Wand2 },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pipeline', label: 'Pipeline', icon: GitBranch },
] as const

export default function Navbar() {
  const isOpen = useChatStore((s) => s.isOpen)
  const togglePanel = useChatStore((s) => s.togglePanel)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-6">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-1 text-lg font-bold tracking-tight">
          DAI
          <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
        </Link>

        {/* Center: Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )
              }
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Right: Chat toggle + avatar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePanel}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isOpen
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>

          {/* User avatar placeholder */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
            U
          </div>
        </div>
      </div>
    </header>
  )
}

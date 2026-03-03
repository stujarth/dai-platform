import { Outlet } from 'react-router-dom'
import { useChatStore } from '@/stores/chat-store'
import Navbar from '@/components/layout/Navbar'
import ChatPanel from '@/components/chat/ChatPanel'
import { cn } from '@/lib/utils'

export default function AppShell() {
  const isOpen = useChatStore((s) => s.isOpen)

  return (
    <div className="flex h-screen flex-col">
      {/* Fixed top navbar */}
      <Navbar />

      {/* Content area below navbar */}
      <div className="flex min-h-0 flex-1">
        {/* Main content */}
        <main
          className={cn(
            'flex-1 overflow-auto transition-all duration-300',
            isOpen ? 'mr-[400px]' : 'mr-0',
          )}
        >
          <Outlet />
        </main>

        {/* Chat panel - slides in from right */}
        <aside
          className={cn(
            'fixed right-0 top-14 bottom-0 z-40 w-[400px] border-l border-gray-200 bg-white shadow-lg transition-transform duration-300 ease-in-out',
            isOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <ChatPanel />
        </aside>
      </div>
    </div>
  )
}

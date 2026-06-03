'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { cn } from '@/lib/utils'
import { ReminderProvider } from '@/components/providers/ReminderProvider'
import { SoundToggle } from '@/components/layout/SoundToggle'
import {
  LayoutDashboard, CheckSquare, Users, Bell, LogOut,
  Menu, X, Sun, Moon, ChevronDown, Plus,
} from 'lucide-react'
import { useTheme } from 'next-themes'

const navItems = [
  { href: '/dashboard', label: 'Ana Səhifə', icon: LayoutDashboard, adminOnly: false },
  { href: '/dashboard/tasks', label: 'Tapşırıqlar', icon: CheckSquare, adminOnly: false },
  { href: '/dashboard/users', label: 'İstifadəçilər', icon: Users, adminOnly: true },
  { href: '/dashboard/notifications', label: 'Bildirişlər', icon: Bell, adminOnly: false },
]

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isAdmin } = useAuth()
  const { unreadCount } = useNotifications()
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Yüklənir...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const filteredNav = navItems.filter(item => !item.adminOnly || isAdmin)

  return (
    <ReminderProvider>
      <div className="min-h-screen bg-background flex">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={cn(
          'fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-30 flex flex-col transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}>
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-border">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <CheckSquare className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground text-sm">AlcoPoint Task</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action — Admin */}
          {isAdmin && (
            <div className="px-4 pt-4">
              <Link
                href="/dashboard/tasks/new"
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
              >
                <Plus className="w-4 h-4" />
                Yeni Tapşırıq
              </Link>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {filteredNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive && 'text-primary')} />
                  <span className="flex-1">{item.label}</span>
                  {item.href === '/dashboard/notifications' && unreadCount > 0 && (
                    <span className="bg-rose-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-border">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-accent transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {profile ? getInitials(profile.ad_soyad) : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{profile?.ad_soyad || 'İstifadəçi'}</p>
                  <p className="text-xs text-muted-foreground">{isAdmin ? '👑 Admin' : '👤 İşçi'}</p>
                </div>
                <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform flex-shrink-0', userMenuOpen && 'rotate-180')} />
              </button>

              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-40">
                  <button
                    onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setUserMenuOpen(false) }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {theme === 'dark' ? 'Açıq Rejim' : 'Qaranlıq Rejim'}
                  </button>
                  <div className="border-t border-border" />
                  <button
                    onClick={() => router.push('/login')}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Çıxış
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
          {/* Top header */}
          <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden lg:block">
              <p className="text-sm text-muted-foreground">
                Xoş gəlmisiniz, <span className="text-foreground font-semibold">{profile?.ad_soyad}</span>
              </p>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              {/* Sound toggle */}
              <SoundToggle />
              {/* Theme toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              {/* Notification bell */}
              <Link href="/dashboard/notifications" className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 lg:p-6 animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </ReminderProvider>
  )
}

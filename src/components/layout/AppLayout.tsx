import { Outlet } from 'react-router-dom'
import { Toolbar } from './toolbar/Toolbar'

export function AppLayout() {
  return (
    <div className="flex h-dvh min-h-[620px] flex-col overflow-hidden bg-app text-cream">
      <Toolbar />
      <Outlet />
    </div>
  )
}

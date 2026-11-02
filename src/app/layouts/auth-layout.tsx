import { Outlet } from "react-router"

import { ThemeToggle } from "@/components/app/theme-toggle"

/** Public pages: login, register, invite landing, status. */
export function AuthLayout() {
  return (
    <main className="relative grid min-h-full place-items-center overflow-y-auto bg-background p-6">
      <ThemeToggle className="absolute top-3 right-3" />
      <Outlet />
    </main>
  )
}

import { NavLink, Outlet } from "react-router"

import { cn } from "@/lib/utils"

const links = [
  { to: "/login", label: "Login" },
  { to: "/register", label: "Register" },
  { to: "/invite/demo1234", label: "Invite" },
  { to: "/teams/demo-team/channels/demo-channel", label: "Channel" },
  { to: "/status", label: "Status" },
]

export function AppLayout() {
  return (
    <div className="min-h-svh">
      <header className="flex items-center gap-6 border-b px-6 py-3">
        <span className="font-semibold">Chatty</span>
        {/* Placeholder navigation until the real screens exist. */}
        <nav className="flex gap-4 text-sm">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn("text-muted-foreground hover:text-foreground", isActive && "text-foreground")
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}

import { useState } from "react"
import { Menu } from "@base-ui/react/menu"
import { ChevronDown, LogOut, Moon, Settings, Sun } from "lucide-react"
import { useNavigate } from "react-router"

import { Avatar } from "@/components/ui/avatar"
import { useAuth } from "@/features/auth"
import { useTheme } from "@/hooks/use-theme"

const itemClass =
  "flex h-9 cursor-pointer items-center gap-2 rounded-sm px-2.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 [&_svg]:size-[15px]"

/** The current user at the bottom of the sidebar, with account settings and logout. */
export function UserMenu() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  if (!user) return null

  const logOut = async () => {
    setLoggingOut(true)
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <Menu.Root>
      <Menu.Trigger className="flex h-11 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-sm px-2 text-left text-foreground transition-colors outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:bg-surface-hover">
        <Avatar name={user.display_name} />
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <strong className="truncate font-semibold">{user.display_name}</strong>
          <small className="truncate text-[11px] text-muted-foreground">Available</small>
        </span>
        <ChevronDown className="size-[15px] shrink-0 text-muted-foreground" aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="top" align="start" sideOffset={8} className="z-50 outline-none">
          <Menu.Popup className="w-[220px] rounded-md border bg-popover p-1 shadow-[0_8px_24px_var(--shadow)] outline-none">
            <Menu.Item className={itemClass} onClick={() => navigate("/profile")}>
              <Settings />
              Account settings
            </Menu.Item>
            <Menu.Item className={itemClass} onClick={toggleTheme} closeOnClick={false}>
              {theme === "dark" ? <Sun /> : <Moon />}
              Use {theme === "dark" ? "light" : "dark"} theme
            </Menu.Item>
            <Menu.Separator className="my-1 h-px bg-border" />
            <Menu.Item className={itemClass} disabled={loggingOut} onClick={() => void logOut()}>
              <LogOut />
              {loggingOut ? "Logging out…" : "Log out"}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

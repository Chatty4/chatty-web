import { useEffect, useState } from "react"
import { Outlet, useLocation, useMatches } from "react-router"

import { AppHeader } from "@/components/app/app-header"
import { Sidebar } from "@/components/app/sidebar"
import { TeamRail } from "@/components/app/team-rail"
import { ChannelsProvider } from "@/features/channels"
import { TeamsProvider } from "@/features/teams"
import { WsProvider } from "@/features/ws"

/** Routes inside the app set `handle: { title }` for the header. */
export type RouteHandle = { title?: string; subtitle?: string }

/** The three columns: team rail, sidebar and the main area. */
export function AppLayout() {
  const location = useLocation()
  const matches = useMatches()
  const handle = (matches.at(-1)?.handle ?? {}) as RouteHandle

  // The drawer belongs to the page it was opened on, so navigating closes it.
  const [drawerOpenOn, setDrawerOpenOn] = useState<string | null>(null)
  const drawerOpen = drawerOpenOn === location.pathname
  const closeDrawer = () => setDrawerOpenOn(null)

  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpenOn(null)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [drawerOpen])

  return (
    <WsProvider>
      <TeamsProvider>
        <ChannelsProvider>
          <div className="flex h-full bg-surface">
            <TeamRail />
            <Sidebar open={drawerOpen} onClose={closeDrawer} />
            <main className="relative flex min-w-0 flex-1 flex-col bg-surface">
              <AppHeader
                title={handle.title ?? "Chatty"}
                subtitle={handle.subtitle}
                onOpenMenu={() => setDrawerOpenOn(location.pathname)}
              />
              <div className="min-h-0 flex-1 overflow-y-auto bg-surface-subtle p-5 md:p-7">
                <div className="mx-auto max-w-[780px]">
                  <Outlet />
                </div>
              </div>
            </main>
          </div>
        </ChannelsProvider>
      </TeamsProvider>
    </WsProvider>
  )
}

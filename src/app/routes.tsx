import { createBrowserRouter } from "react-router"

import { AppLayout, type RouteHandle } from "@/app/layouts/app-layout"
import { AuthLayout } from "@/app/layouts/auth-layout"
import { GuestOnly } from "@/app/layouts/guest-only"
import { RequireAuth } from "@/app/layouts/require-auth"
import { LoginPage, RegisterPage } from "@/app/pages/auth-pages"
import { ChannelPage } from "@/app/pages/channel-page"
import { HomePage } from "@/app/pages/home-page"
import { InvitePage } from "@/app/pages/invite-page"
import { NotFoundPage } from "@/app/pages/not-found-page"
import { StatusPage } from "@/app/pages/status-page"

export const router = createBrowserRouter([
  {
    Component: AuthLayout,
    children: [
      {
        Component: GuestOnly,
        children: [
          { path: "login", Component: LoginPage },
          { path: "register", Component: RegisterPage },
        ],
      },
      { path: "invite/:inviteCode", Component: InvitePage },
      { path: "status", Component: StatusPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
  {
    Component: RequireAuth,
    children: [
      {
        Component: AppLayout,
        children: [
          { index: true, Component: HomePage, handle: { title: "Home" } satisfies RouteHandle },
          {
            path: "teams/:teamId/channels/:channelId",
            Component: ChannelPage,
            handle: { title: "Channel" } satisfies RouteHandle,
          },
        ],
      },
    ],
  },
])

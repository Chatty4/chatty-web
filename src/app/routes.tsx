import { createBrowserRouter } from "react-router"

import { AppLayout, type RouteHandle } from "@/app/layouts/app-layout"
import { AuthLayout } from "@/app/layouts/auth-layout"
import { GuestOnly } from "@/app/layouts/guest-only"
import { RequireAuth } from "@/app/layouts/require-auth"
import { LoginPage, RegisterPage } from "@/app/pages/auth-pages"
import {
  BrowseChannelsPage,
  ChannelSettingsPage,
  CreateChannelPage,
  StartDmPage,
} from "@/app/pages/channel-pages"
import { ChannelPage } from "@/app/pages/channel-page"
import { HomePage } from "@/app/pages/home-page"
import { InvitePage } from "@/app/pages/invite-page"
import { NotFoundPage } from "@/app/pages/not-found-page"
import { StatusPage } from "@/app/pages/status-page"
import { CreateTeamPage, TeamHomePage, TeamSettingsPage } from "@/app/pages/team-pages"

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
            path: "teams/new",
            Component: CreateTeamPage,
            handle: { title: "New team" } satisfies RouteHandle,
          },
          {
            path: "teams/:teamId",
            children: [
              { index: true, Component: TeamHomePage },
              {
                path: "settings",
                Component: TeamSettingsPage,
                handle: { title: "Team settings" } satisfies RouteHandle,
              },
              {
                path: "channels/new",
                Component: CreateChannelPage,
                handle: { title: "Create channel" } satisfies RouteHandle,
              },
              {
                path: "channels/browse",
                Component: BrowseChannelsPage,
                handle: { title: "Browse channels" } satisfies RouteHandle,
              },
              {
                path: "dms/new",
                Component: StartDmPage,
                handle: { title: "New message" } satisfies RouteHandle,
              },
              {
                path: "channels/:channelId",
                Component: ChannelPage,
                handle: { title: "Channel" } satisfies RouteHandle,
              },
              {
                path: "channels/:channelId/settings",
                Component: ChannelSettingsPage,
                handle: { title: "Channel settings" } satisfies RouteHandle,
              },
            ],
          },
        ],
      },
    ],
  },
])

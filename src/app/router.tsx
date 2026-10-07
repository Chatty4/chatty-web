import { createBrowserRouter, Navigate } from "react-router"

import { AppLayout } from "@/app/AppLayout"
import { ChannelPage } from "@/pages/ChannelPage"
import { InvitePage } from "@/pages/InvitePage"
import { LoginPage } from "@/pages/LoginPage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { RegisterPage } from "@/pages/RegisterPage"
import { StatusPage } from "@/pages/StatusPage"

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "invite/:inviteCode", element: <InvitePage /> },
      { path: "teams/:teamId/channels/:channelId", element: <ChannelPage /> },
      { path: "status", element: <StatusPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])

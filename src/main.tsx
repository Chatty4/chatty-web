import { Toast } from "@base-ui/react/toast"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router/dom"

import { router } from "@/app/routes"
import { AuthProvider } from "@/features/auth"
import { Toaster } from "@/components/ui/toaster"
import { toastManager } from "@/lib/toast"
import { initTheme } from "@/lib/theme"
import "./index.css"

initTheme()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <Toast.Provider toastManager={toastManager}>
        <RouterProvider router={router} />
        <Toaster />
      </Toast.Provider>
    </AuthProvider>
  </StrictMode>,
)

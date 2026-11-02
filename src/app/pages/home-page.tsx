import { useAuth } from "@/features/auth"

/** After login, until teams exist (CHAT-193). */
export function HomePage() {
  const { user } = useAuth()

  return (
    <section className="flex flex-col gap-4 rounded-md border bg-surface p-[22px]">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-[-0.02em]">
          Welcome{user ? `, ${user.display_name}` : ""}
        </h1>
        <p className="text-muted-foreground">
          You're logged in. Creating and joining teams is coming next.
        </p>
      </div>
    </section>
  )
}

import { Link } from "react-router"

export function NotFoundPage() {
  return (
    <section className="flex w-full max-w-[420px] flex-col gap-2 rounded-md border bg-surface p-7">
      <h1 className="text-xl font-semibold tracking-[-0.02em]">Page not found</h1>
      <p className="text-muted-foreground">This page doesn't exist or was moved.</p>
      <Link to="/" className="font-medium text-primary hover:underline">
        Go to Chatty
      </Link>
    </section>
  )
}

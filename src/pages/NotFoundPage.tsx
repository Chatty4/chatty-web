import { Link } from "react-router"

export function NotFoundPage() {
  return (
    <section className="space-y-2">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <Link to="/login" className="text-sm underline underline-offset-4">
        Go to the login page
      </Link>
    </section>
  )
}

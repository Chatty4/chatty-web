import { useState, type FormEvent } from "react"
import { Link, useLocation } from "react-router"

import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"

import { useAuth } from "../hooks/auth-context"
import type { FieldErrors, LoginInput } from "../types"
import { describeAuthError } from "../utils/errors"
import type { RedirectState } from "../utils/redirect"
import { validateLogin } from "../utils/validation"
import { AuthCard } from "./auth-card"

const FIELDS = ["email", "password"] as const

/** Shown after register created the account but couldn't log in with it. */
export type LoginNotice = { notice?: string }

export function LoginForm() {
  const { login } = useAuth()
  const location = useLocation()
  const state = location.state as (RedirectState & LoginNotice) | null

  const [values, setValues] = useState<LoginInput>({ email: "", password: "" })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof LoginInput>>({})
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  const change = (field: keyof LoginInput, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    const input = { ...values, email: values.email.trim() }
    const errors = validateLogin(input)
    setFieldErrors(errors)
    setFormError(undefined)
    if (Object.keys(errors).length) return

    setSubmitting(true)
    try {
      // On success GuestOnly leaves this page, for the page the user came from.
      await login(input)
    } catch (error) {
      const described = describeAuthError(error, FIELDS)
      setFieldErrors(described.fields)
      setFormError(described.form)
      setValues((current) => ({ ...current, password: "" }))
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      description="Log in to continue to your teams."
      onSubmit={submit}
      footer={
        <>
          New to Chatty?{" "}
          <Link to="/register" state={state} className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {state?.notice && !formError && (
        <p role="status" className="rounded-sm bg-accent px-3 py-2.5 text-[13px] text-primary">
          {state.notice}
        </p>
      )}
      {formError && <Alert>{formError}</Alert>}
      <FormField label="Email" error={fieldErrors.email}>
        {(control) => (
          <Input
            {...control}
            type="email"
            name="email"
            autoComplete="email"
            autoFocus
            value={values.email}
            onChange={(event) => change("email", event.target.value)}
          />
        )}
      </FormField>
      <FormField label="Password" error={fieldErrors.password}>
        {(control) => (
          <Input
            {...control}
            type="password"
            name="password"
            autoComplete="current-password"
            value={values.password}
            onChange={(event) => change("password", event.target.value)}
          />
        )}
      </FormField>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Logging in…" : "Log in"}
      </Button>
    </AuthCard>
  )
}

import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router"

import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"

import { useAuth } from "../hooks/auth-context"
import type { FieldErrors, RegisterInput } from "../types"
import { AccountCreatedError, describeAuthError } from "../utils/errors"
import type { RedirectState } from "../utils/redirect"
import { PASSWORD_MIN_LENGTH, validateRegister } from "../utils/validation"
import { AuthCard } from "./auth-card"
import type { LoginNotice } from "./login-form"

const FIELDS = ["display_name", "email", "password"] as const

export function RegisterForm() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as RedirectState

  const [values, setValues] = useState<RegisterInput>({ display_name: "", email: "", password: "" })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof RegisterInput>>({})
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  const change = (field: keyof RegisterInput, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    const input = { ...values, display_name: values.display_name.trim(), email: values.email.trim() }
    const errors = validateRegister(input)
    setFieldErrors(errors)
    setFormError(undefined)
    if (Object.keys(errors).length) return

    setSubmitting(true)
    try {
      // On success GuestOnly leaves this page, for the page the user came from.
      await register(input)
    } catch (error) {
      if (error instanceof AccountCreatedError) {
        const notice: LoginNotice = { notice: "Your account was created. Log in to continue." }
        navigate("/login", { replace: true, state: { ...state, ...notice } })
        return
      }
      const described = describeAuthError(error, FIELDS)
      setFieldErrors(described.fields)
      setFormError(described.form)
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="Create your account"
      description="Start a new team or join one with an invite."
      onSubmit={submit}
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" state={state} className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {formError && <Alert>{formError}</Alert>}
      <FormField label="Name" error={fieldErrors.display_name}>
        {(control) => (
          <Input
            {...control}
            name="display_name"
            autoComplete="name"
            autoFocus
            maxLength={60}
            value={values.display_name}
            onChange={(event) => change("display_name", event.target.value)}
          />
        )}
      </FormField>
      <FormField label="Email" error={fieldErrors.email}>
        {(control) => (
          <Input
            {...control}
            type="email"
            name="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => change("email", event.target.value)}
          />
        )}
      </FormField>
      <FormField
        label="Password"
        error={fieldErrors.password}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters, not only numbers.`}
      >
        {(control) => (
          <Input
            {...control}
            type="password"
            name="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(event) => change("password", event.target.value)}
          />
        )}
      </FormField>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Creating account…" : "Create account"}
      </Button>
    </AuthCard>
  )
}

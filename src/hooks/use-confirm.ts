import { useCallback, useRef, useState } from "react"

export type ConfirmOptions = {
  title: string
  description: string
  /** Label for the confirm button (default: "Confirm"). */
  action?: string
  /** Use the destructive button variant. */
  destructive?: boolean
}

export type ConfirmState = ConfirmOptions & {
  open: boolean
  resolve: ((value: boolean) => void) | null
}

/**
 * Imperative confirmation dialog hook.
 *
 * Usage:
 * ```tsx
 * const { confirm, confirmProps } = useConfirm()
 * // ...
 * const ok = await confirm({ title: "Delete?", description: "This cannot be undone.", destructive: true })
 * if (!ok) return
 * ```
 *
 * Spread `confirmProps` onto a `<ConfirmDialog />` in the component's JSX.
 */
export function useConfirm() {
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: "",
    description: "",
    resolve: null,
  })

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setState({ ...options, open: true, resolve })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true)
    resolveRef.current = null
    setState((s) => ({ ...s, open: false }))
  }, [])

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false)
    resolveRef.current = null
    setState((s) => ({ ...s, open: false }))
  }, [])

  return {
    confirm,
    confirmProps: {
      open: state.open,
      title: state.title,
      description: state.description,
      action: state.action,
      destructive: state.destructive,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  }
}

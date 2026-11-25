import { Component, type ReactNode } from "react"

type Props = { fallback: ReactNode; children: ReactNode }

/** A viewer that throws on a broken or unusual file shows `fallback`, not a blank app. */
export class PreviewErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

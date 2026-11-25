// One viewer per preview kind, each in its own chunk: a PDF or Word reader only downloads when
// someone opens such a file.

import { lazy, type ComponentType, type LazyExoticComponent } from "react"

import { previewKind, type PreviewKind } from "../../utils/preview"
import type { ViewerProps } from "./types"

type Viewer = LazyExoticComponent<ComponentType<ViewerProps>>

/** True when the app can show the file itself, so opening it previews instead of downloading. */
export function canPreview(file: { mime: string; filename: string }): boolean {
  const kind = previewKind(file)
  return kind !== null && VIEWERS[kind] !== undefined
}

export const VIEWERS: Partial<Record<PreviewKind, Viewer>> = {
  pdf: lazy(() => import("./pdf-viewer").then((m) => ({ default: m.PdfViewer }))),
  docx: lazy(() => import("./docx-viewer").then((m) => ({ default: m.DocxViewer }))),
  markdown: lazy(() => import("./markdown-viewer").then((m) => ({ default: m.MarkdownViewer }))),
  text: lazy(() => import("./text-viewer").then((m) => ({ default: m.TextViewer }))),
  image: lazy(() => import("./image-viewer").then((m) => ({ default: m.ImageViewer }))),
  audio: lazy(() => import("./audio-viewer").then((m) => ({ default: m.AudioViewer }))),
}

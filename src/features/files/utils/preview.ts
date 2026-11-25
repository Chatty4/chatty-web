// Which files the app can show without downloading them, and how. The file is fetched with its
// short-lived download URL and shown in the page: the bucket stays private, and no outside
// viewer ever gets the file.

const MB = 1024 * 1024

export type PreviewKind = "pdf" | "docx" | "markdown" | "table" | "text" | "image"

/** Text-like files are shown up to this size; past it, only their start. */
export const TEXT_PREVIEW_MAX_BYTES = 1 * MB

/** The pages a PDF preview draws; a longer document is downloaded to read the rest. */
export const PDF_PREVIEW_MAX_PAGES = 50

const BY_MIME: Record<string, PreviewKind> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/markdown": "markdown",
  "text/x-markdown": "markdown",
  "text/csv": "table",
  "text/tab-separated-values": "table",
  "application/json": "text",
  "application/xml": "text",
  "application/x-yaml": "text",
  "application/yaml": "text",
  "application/javascript": "text",
  "application/x-sh": "text",
  "application/sql": "text",
  // Shown as a picture: an <img> never runs an SVG's scripts.
  "image/svg+xml": "image",
  "image/bmp": "image",
  "image/avif": "image",
}

// Browsers send application/octet-stream for many of these, so the name decides.
const TEXT_EXTENSIONS = [
  "txt", "log", "json", "xml", "yaml", "yml", "toml", "ini", "env", "html", "htm", "css",
  "js", "jsx", "ts", "tsx", "py", "java", "kt", "c", "h", "cpp", "hpp", "cs", "go", "rs",
  "rb", "php", "swift", "sh", "ps1", "sql",
] // fmt: skip

const BY_EXTENSION: Record<string, PreviewKind> = {
  pdf: "pdf",
  docx: "docx",
  md: "markdown",
  markdown: "markdown",
  csv: "table",
  tsv: "table",
  ...Object.fromEntries(TEXT_EXTENSIONS.map((extension) => [extension, "text"])),
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".")
  return dot > 0 ? filename.slice(dot + 1).toLowerCase() : ""
}

const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "oga", "opus", "m4a", "aac", "flac", "weba"]

/** Sound files: a message plays them inline instead of opening a preview. */
export function isAudioFile(file: { mime: string; filename: string }): boolean {
  return file.mime.startsWith("audio/") || AUDIO_EXTENSIONS.includes(extensionOf(file.filename))
}

/**
 * How a file can be previewed, or null when it can only be downloaded. HTML is shown as its
 * source, never rendered.
 */
export function previewKind(file: { mime: string; filename: string }): PreviewKind | null {
  const mime = file.mime.split(";")[0]!.trim().toLowerCase()
  return (
    BY_MIME[mime] ??
    BY_EXTENSION[extensionOf(file.filename)] ??
    (mime.startsWith("text/") ? "text" : null)
  )
}

/** What every file viewer gets: the file's bytes, already downloaded, and its name. */
export type ViewerProps = {
  blob: Blob
  filename: string
}

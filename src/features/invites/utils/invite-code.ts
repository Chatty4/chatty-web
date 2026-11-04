const CODE = /^[A-Za-z0-9_-]+$/

/** The code from a pasted invite link or a bare code. Null when it's neither. */
export function parseInviteCode(input: string): string | null {
  const text = input.trim()
  const code = text.includes("/invite/")
    ? (text.split("/invite/")[1]?.split(/[/?#]/)[0] ?? "")
    : text
  return CODE.test(code) ? code : null
}

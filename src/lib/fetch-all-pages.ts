type Page<T> = { items: T[]; next_cursor: string | null }

/** Follows next_cursor until the last page and returns every item. */
export async function fetchAllPages<T>(
  fetchPage: (cursor: string | undefined) => Promise<Page<T>>,
): Promise<T[]> {
  const items: T[] = []
  let cursor: string | undefined
  for (;;) {
    const page = await fetchPage(cursor)
    items.push(...page.items)
    if (!page.next_cursor) return items
    cursor = page.next_cursor
  }
}

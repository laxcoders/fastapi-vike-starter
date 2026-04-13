/**
 * Centralised React Query key factories.
 *
 * Why a factory, not ad-hoc arrays:
 *
 * 1. **Hierarchical invalidation.** `queryClient.invalidateQueries({ queryKey: itemKeys.all })`
 *    knocks out every item-related cache entry — list views, details, pages.
 *    Ad-hoc arrays like `["items", id]` sprinkled across components make this impossible
 *    to do consistently, so mutations end up under-invalidating.
 * 2. **Refactor safety.** Renaming the "items" domain becomes a single-file edit instead
 *    of a codebase-wide grep-and-replace that always misses one call site.
 * 3. **Type inference at the use site.** Hooks that read from these keys pick up the
 *    `readonly` tuple types so a typo in the key is a compile error, not a silent cache miss.
 *
 * Convention: `all -> lists -> list(params) -> details -> detail(id)`. Copy the pattern
 * for every new resource you add.
 */

export const authKeys = {
  all: ["auth"] as const,
  currentUser: () => [...authKeys.all, "currentUser"] as const,
};

export const itemKeys = {
  all: ["items"] as const,
  lists: () => [...itemKeys.all, "list"] as const,
  list: (params: { page?: number; limit?: number }) => [...itemKeys.lists(), params] as const,
  details: () => [...itemKeys.all, "detail"] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
};

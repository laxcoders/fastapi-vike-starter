# React Testing — Patterns for This Project

Testing with Vitest + React Testing Library + jsdom. All tests live in `web/tests/`.

---

## 1. Setup

### Config — `vitest.config.ts`

```ts
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": new URL("./", import.meta.url).pathname } },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["lib/**", "services/**", "stores/**", "components/**", "pages/**"],
      exclude: ["pages/+config.ts", "pages/tailwind.css", "lib/types.ts"],
    },
  },
});
```

### Setup file — `tests/setup.ts`

```ts
import "@testing-library/jest-dom/vitest";
```

---

## 2. DOM Cleanup Between Tests

RTL auto-cleanup can fail in certain edge cases. Always add explicit cleanup in `beforeEach` for component tests:

```ts
import { cleanup } from "@testing-library/react";

beforeEach(() => {
  cleanup();
});
```

Without this, DOM from previous tests leaks and causes "Found multiple elements" errors.

---

## 3. Querying Elements

### Labels without `htmlFor` — DON'T use `getByLabelText`

Our form labels don't use `htmlFor`/`id` associations. `getByLabelText` will fail:

```ts
// WRONG — label not associated with input
screen.getByLabelText(/email/i)

// CORRECT — query by input type directly
document.querySelector('input[type="email"]') as HTMLInputElement
document.querySelector('input[type="password"]') as HTMLInputElement
```

### Multiple elements with same aria-label

Sidebar has both an overlay and a button with `aria-label="Close sidebar"`. Use `getAllBy*`:

```ts
// WRONG — throws "found multiple elements"
screen.getByRole("button", { name: /close sidebar/i })

// CORRECT
const buttons = screen.getAllByRole("button", { name: /close sidebar/i });
fireEvent.click(buttons[0]);
```

---

## 4. Mocking Patterns

### Mocking Vike

```ts
vi.mock("vike-react/usePageContext", () => ({
  usePageContext: () => ({ urlPathname: "/app/dashboard" }),
}));

vi.mock("vike/client/router", () => ({
  navigate: vi.fn(),
}));
```

### Mocking the API client

Use `vi.mock` with explicit `Mock` type cast (not `vi.mocked()` — causes tsc errors with axios types):

```ts
import apiClient from "@/services/client";
import type { Mock } from "vitest";

vi.mock("@/services/client", () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

const mockedPost = apiClient.post as Mock;
const mockedGet = apiClient.get as Mock;
```

### Mocking cookies (must be before import)

```ts
vi.mock("@/lib/cookies", () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
}));

// THEN import the module that uses cookies
import apiClient from "@/services/client";
```

### Zustand store — use `setState` directly

```ts
import { useAuthStore } from "@/stores/auth-store";

beforeEach(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

// Set up authenticated state
useAuthStore.setState({
  user: { id: "1", email: "jane@example.com", name: "Jane Doe", role: "am", is_active: true, created_at: "..." },
  isAuthenticated: true,
});
```

---

## 5. Testing Vike Guards

Guards throw Vike's `redirect()` objects. The thrown object structure is:

```ts
{
  _pageContextAbort: {
    _urlRedirect: { url: "/app/dashboard", statusCode: 302 }
  },
  _isAbortError: true
}
```

Test pattern:

```ts
import { guard } from "@/pages/app/+guard";
import type { PageContext } from "vike/types";

interface VikeRedirectError {
  _pageContextAbort?: { _urlRedirect?: { url?: string } };
}

function getRedirectUrl(err: unknown): string | undefined {
  return (err as VikeRedirectError)?._pageContextAbort?._urlRedirect?.url;
}

it("redirects to /login when no token", () => {
  try {
    guard({} as PageContext);
    expect.fail("Expected redirect");
  } catch (err) {
    expect(getRedirectUrl(err)).toBe("/login");
  }
});
```

---

## 6. Testing Components with React Query

Wrap in a fresh `QueryClientProvider`:

```ts
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
```

---

## 7. Cookie Helpers in jsdom

jsdom doesn't honor `max-age=0` for cookie deletion. Clear cookies manually between tests:

```ts
function clearCookies() {
  document.cookie.split(";").forEach((c) => {
    const key = c.split("=")[0].trim();
    document.cookie = `${key}=; max-age=0`;
  });
}

beforeEach(clearCookies);
```

---

## 8. Coverage

### Running coverage

```bash
npm run test:coverage
```

### What's excluded from coverage

- `pages/+config.ts` — pure config, no logic
- `pages/tailwind.css` — styles
- `lib/types.ts` — type-only file, no runtime code

### Coverage targets

- Backend: 90% (enforced by pytest `--cov-fail-under=90`)
- Frontend: 80% (Codecov threshold)

---

## 9. Pre-commit Checklist

ALWAYS run before committing frontend changes:

```bash
cd web
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # Vitest
```

All three must pass. CI runs all three.

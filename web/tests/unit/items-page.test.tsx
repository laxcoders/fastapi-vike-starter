import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/items", () => ({
  listItems: vi.fn(),
  createItem: vi.fn(),
  deleteItem: vi.fn(),
}));

import ItemsPage from "@/pages/app/items/+Page";
import { createItem, deleteItem, listItems } from "@/services/items";
import type { Item } from "@/lib/types";

const listItemsMock = vi.mocked(listItems);
const createItemMock = vi.mocked(createItem);
const deleteItemMock = vi.mocked(deleteItem);

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ItemsPage />
    </QueryClientProvider>,
  );
}

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    title: "First item",
    description: "desc",
    status: "active",
    owner_id: "user-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("ItemsPage", () => {
  beforeEach(() => {
    listItemsMock.mockReset();
    createItemMock.mockReset();
    deleteItemMock.mockReset();
  });
  afterEach(() => cleanup());

  it("shows the empty state when the API returns no items", async () => {
    listItemsMock.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      has_more: false,
    });

    renderPage();

    expect(await screen.findByText(/no items yet/i)).toBeInTheDocument();
  });

  it("renders each item returned by the API", async () => {
    listItemsMock.mockResolvedValueOnce({
      items: [makeItem({ id: "a", title: "Alpha" }), makeItem({ id: "b", title: "Beta" })],
      total: 2,
      page: 1,
      limit: 20,
      has_more: false,
    });

    renderPage();

    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("creates a new item and clears the form", async () => {
    listItemsMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      has_more: false,
    });
    createItemMock.mockResolvedValueOnce(makeItem({ id: "new", title: "Created" }));

    renderPage();
    await screen.findByText(/no items yet/i);

    const titleInput = document.querySelector<HTMLInputElement>('input[id="title"]')!;
    fireEvent.change(titleInput, { target: { value: "Brand new" } });
    fireEvent.click(screen.getByRole("button", { name: /create item/i }));

    await waitFor(() => {
      expect(createItemMock).toHaveBeenCalledWith("Brand new", undefined);
    });
    // After success, the title input resets to empty.
    await waitFor(() => {
      expect(titleInput.value).toBe("");
    });
  });

  it("refuses to submit when the title is blank", () => {
    listItemsMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      has_more: false,
    });
    renderPage();

    const submitButton = screen.getByRole("button", { name: /create item/i });
    expect(submitButton).toBeDisabled();
  });

  it("deletes an item via the row button", async () => {
    listItemsMock.mockResolvedValueOnce({
      items: [makeItem({ id: "to-delete", title: "Delete me" })],
      total: 1,
      page: 1,
      limit: 20,
      has_more: false,
    });
    deleteItemMock.mockResolvedValueOnce(undefined);

    renderPage();
    await screen.findByText("Delete me");

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(deleteItemMock).toHaveBeenCalledWith("to-delete");
    });
  });

  it("shows the 'has more' footer when the API indicates more pages", async () => {
    listItemsMock.mockResolvedValueOnce({
      items: [makeItem({ id: "one", title: "One" })],
      total: 25,
      page: 1,
      limit: 20,
      has_more: true,
    });

    renderPage();
    expect(await screen.findByText(/Showing 1 of 25 items/)).toBeInTheDocument();
  });
});

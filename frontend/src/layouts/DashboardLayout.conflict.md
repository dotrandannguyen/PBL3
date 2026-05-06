# Conflict note for DashboardLayout

This merge conflict happens because two branches changed the same regions of DashboardLayout in different ways.

## 1) Import block conflict

- Region: [frontend/src/layouts/DashboardLayout.jsx](frontend/src/layouts/DashboardLayout.jsx#L9-L17)
- HEAD adds the AI chat floating widget import: `FloatingChat`.
- master adds providers and modals for unread inbox, account modal, and search modal.
- Git cannot auto-merge because these are competing edits in the same import block.

## 2) Render block conflict

- Region: [frontend/src/layouts/DashboardLayout.jsx](frontend/src/layouts/DashboardLayout.jsx#L58-L64)
- HEAD renders the floating AI chat in the dashboard layout.
- master renders `AccountModal` and `SearchModal` instead.
- These edits are in the same JSX area, so Git needs a manual decision about which components should render (or whether to render all of them).

## Side effect to be aware of

- The layout currently uses `UnreadInboxProvider`, `AccountModalProvider`, and `SearchModalProvider` in the return tree, but those imports are only present on the master side of the conflict.
- Once you resolve the conflict, ensure the providers and any rendered components you keep are also imported.

## Proposed fix for this repo

Merge both changes so the dashboard keeps the AI chat widget and the account/search modals. That means:

- Keep all related imports: `FloatingChat`, `UnreadInboxProvider`, `AccountModalProvider`, `AccountModal`, `SearchModalProvider`, `SearchModal`.
- Render `FloatingChat` together with `AccountModal` and `SearchModal` in the layout.
- Keep the provider tree as-is (it already includes `UnreadInboxProvider`, `AccountModalProvider`, and `SearchModalProvider`).

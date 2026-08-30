# The Arcane Bazaar

A responsive D&D 5.5e item market and pricing guide built with React, TypeScript, Vite, and Tailwind CSS.

## Catalog data

The catalog is built at runtime from three local 5etools-format sources:

- `src/data/items.json`;
- `src/data/items-base.json`;
- `src/data/magicvariants.json`.

These files are immutable inputs. Application code, tests, builds, and maintenance scripts must never format, reorder, complete, or overwrite them. Derived data belongs in memory, test fixtures, or a separate report.

The loader downloads the three assets in parallel. The catalog pipeline resolves internal copies and item-entry references, materializes compatible generic variants over base items, normalizes the result for the React UI, checks deterministic IDs, and caches the complete operation as one promise. Vite emits the JSON files as independent production assets instead of including their contents in the main JavaScript bundle.

The latest corpus audit is recorded in [CATALOG_REPORT.md](./CATALOG_REPORT.md). Counts are diagnostic rather than stable test contracts, so future source updates may change them without requiring application changes.

## Run locally

Node.js 20.19+ is required.

```bash
npm install
npm run dev
```

## Validation

```bash
npm test
npm run build
```

Component and pricing tests use small fixtures. A dedicated integration test builds the complete catalog from the real JSON sources and verifies invariants such as immutability, valid origins, resolved references, and unique IDs.

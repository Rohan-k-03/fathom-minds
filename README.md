# Fathom Minds – SEPP Assessment Toolkit

This repository contains the source code and datasets behind the Fathom Minds prototype that helps council staff assess *State Environmental Planning Policy (SEPP) Part 2* scenarios. The project combines a TypeScript rules engine with a modern React frontend and supporting scripts for ingesting and validating property data.

---

## Table of contents

1. [Project structure](#project-structure)
2. [Prerequisites](#prerequisites)
3. [Getting started](#getting-started)
4. [Running the frontend (Vite)](#running-the-frontend-vite)
5. [Running tests & validation](#running-tests--validation)
6. [Building for production](#building-for-production)
7. [Deploying to Vercel](#deploying-to-vercel)
8. [Working with large overlay datasets](#working-with-large-overlay-datasets)
9. [Troubleshooting](#troubleshooting)

---

## Project structure

```
.
├── apps/
│   └── sepp-ui-prototype/      # React + Vite application (production UI)
├── form-page/                  # Historical Next.js prototype (currently unused)
├── sample-data/                # Curated property JSON used by the rules engine
├── schemas/                    # JSON Schema definitions for property data
├── scripts/                    # Utility scripts for CSV → JSON conversion, etc.
├── src/                        # TypeScript rules engine + overlay utilities
└── tests/                      # Vitest suites for the engine and loaders
```

> **Note:** Heavy source datasets (flood rasters, recordings, etc.) are intentionally excluded from Git version control because they exceed GitHub’s 100 MB limit. See [Working with large overlay datasets](#working-with-large-overlay-datasets) for details on restoring them locally.

---

## Prerequisites

- **Node.js** ≥ 20 (LTS recommended).  
- **pnpm** ≥ 10. Vercel and the project scripts assume pnpm; install via:
  ```bash
  corepack enable
  corepack prepare pnpm@latest --activate
  ```
- Optional: **git-lfs** if you plan to manage large datasets in your own fork.

---

## Getting started

1. **Clone the repository**
   ```bash
   git clone https://github.com/Rohan-k-03/fathom-minds.git
   cd fathom-minds
   ```

2. **Install root tooling (Vitest, TypeScript)**
   ```bash
   pnpm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd apps/sepp-ui-prototype
   pnpm install
   ```

---

## Running the frontend (Vite)

From `apps/sepp-ui-prototype`:

```bash
pnpm dev
```

The app will be available at <http://localhost:5173>. Hot-module reloading is enabled by default.

To run the production preview locally:

```bash
pnpm build
pnpm preview
```

---

## Running tests & validation

- **Rules engine & loaders**
  ```bash
  pnpm test
  ```
  (Run from the repository root. Uses Vitest.)

- **Property schema validation**
  ```bash
  cd apps/sepp-ui-prototype
  pnpm run validate:data
  ```
  This invokes `ajv` against `schemas/property.schema.json` and the curated sample dataset.

- **TypeScript checks**
  ```bash
  pnpm run typecheck
  ```

---

## Building for production

From `apps/sepp-ui-prototype`:

```bash
pnpm build
```

The compiled static assets are emitted to `apps/sepp-ui-prototype/dist`. Deployments (including Vercel) should point to this directory as the output.

---

## Deploying to Vercel

1. **Import the GitHub repository** in Vercel (Git integration).
2. **Project settings**
   - **Root Directory:** `apps/sepp-ui-prototype`
   - **Build Command:** `pnpm run build`
   - **Install Command:** `pnpm install`
   - **Output Directory:** `dist`
3. Trigger a deployment (push to `main` or use the “Redeploy” button). Vercel will automatically install dependencies, build the Vite app, and serve the contents of `dist`.

If you see a 404 after deployment, double-check that the root directory is set to `apps/sepp-ui-prototype`.

---

## Working with large overlay datasets

The original research project relies on sizeable flood rasters, shapefiles, and meeting recordings. These files are **not** tracked in Git. To work with the full dataset locally:

1. Obtain the raw data from the project owners.
2. Drop the folders (e.g., `Overlays datasets/`, `Updates/`) into the repository root.
3. Keep them out of Git using the existing `.gitignore` rules. If you want to version large assets in a fork, configure [Git LFS](https://git-lfs.com/).

The UI and rules engine run using the curated samples in `sample-data/` even without the heavy overlays.

---

## Troubleshooting

- **Vercel build succeeds but the site shows 404**  
  The root directory is probably not set to `apps/sepp-ui-prototype`. Update project settings and redeploy.

- **pnpm version mismatch**  
  Vercel auto-selects pnpm@10. If you need pnpm@9 locally, run `corepack prepare pnpm@9 --activate`.

- **Vitest cannot find Node types**  
  Ensure you ran `pnpm install` in the repository root (it installs `@types/node`).

- **Large files rejected by GitHub**  
  Store them outside the repo or use Git LFS; the main branch intentionally omits files >100 MB.

---

## Contributing

1. Fork the repo.
2. Create a branch (`git checkout -b feature/my-feature`).
3. Commit your changes with descriptive messages.
4. Push and open a Pull Request against `main`.

For questions or data access requests, please contact the Fathom Minds project team.

---

© Fathom Minds – SEPP Exempt Development Assessment Tool Prototype

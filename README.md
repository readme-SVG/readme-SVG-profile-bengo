# readme-SVG-profile-bengo

> GitHub profile cards as SVG, built for README embeds and shipped serverless.

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue?style=for-the-badge)](LICENSE)
![Node >=20](https://img.shields.io/badge/Node-%3E%3D20-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel)
![GitHub Actions](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)

> [!NOTE]
> This project generates dynamic SVG cards from GitHub API data and rotates slides every 10 minutes by default.

## Table of Contents

- [Features](#features)
- [Slides](#slides)
- [Themes](#themes)
- [Tech Stack](#tech-stack)
- [Technical Notes](#technical-notes)
  - [Project Structure](#project-structure)
  - [Key Design Decisions](#key-design-decisions)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Usage](#usage)
- [Configuration](#configuration)
- [License](#license)
- [Contacts](#contacts)

## Features

- 28 slide types for GitHub profiles: stats, profile card, language bar / list / donut, activity charts, top repos, commits, issues, pull requests, topics and more (see [Slides](#slides)).
- 11 color themes, including transparent `dark` / `light` and an auto light/dark `<picture>` snippet (see [Themes](#themes)).
- Slide rotation based on 10-minute time buckets; the CDN cache expires exactly when the slide changes.
- Several embeds on one page (`badge=1..8`) start at different points of the rotation.
- Slide filtering via query params: include only specific slide IDs in render output.
- Web UI preview tool for card generation, slide toggling, themes, and copy-paste embed snippets.
- Supports Markdown, HTML and auto light/dark HTML embed snippets for README integration.
- Optional GitHub token support to jump from `60 req/hr` to `5000 req/hr` rate limit tier.
- Serverless-first deployment via Vercel with function-level timeout config.
- Built for stability:
  - Only the data the current slide needs is fetched: 1–2 GitHub requests for most slides, instead of 5–8 on every hit.
  - Every GitHub request has a timeout, transient errors are retried once, and the whole card is answered within the function time limit.
  - Responses are cached in memory, revalidated with ETags (`304` responses do not count against the rate limit) and served stale if GitHub fails or rate-limits.
  - If a slide's data can't be loaded, README viewers get the profile card instead of an error.
  - User input is validated, and text from GitHub is sanitized, so a repo description can't break the SVG.
  - The API always returns SVG, even on errors.

## Slides

| ID | What it shows | GitHub data used |
|---|---|---|
| `repos` | Public repository count | profile |
| `stars` | Total stars earned | repos |
| `followers` / `following` | Follower / following counts | profile |
| `langbar` | Stacked language bar with top 6 languages | repos |
| `toprepos` | Top 3 repositories by stars | repos |
| `commits` | Two random recent commits | repos, commits, events |
| `events` | Last 4 public events | events |
| `spotlight` | A random repository with description, stats and topics | repos |
| `langlist` | Top 5 languages as bars | repos |
| `forked` | Top 3 repositories by forks | repos |
| `avgstars` | Average stars per original repository | repos |
| `age` | Account age | profile |
| `forks` | Total forks received | repos |
| `issues` | Open issues across own repositories | repos |
| `latestissues` | Latest open issues authored by the user | search |
| `closedissues` | Latest closed issues authored by the user | search |
| `profile` | Avatar, name, bio, location and key counts | profile, avatar |
| `overview` | 6-tile stats grid: stars, forks, followers, repos, issues, gists | repos |
| `activity` | Public events per day over the last 30 days | events |
| `hours` | Activity by hour of day, with a "night owl" / "early bird" label | events |
| `weekdays` | Activity by day of week | events |
| `langdonut` | Language donut chart | repos |
| `topics` | Most used repository topics | repos |
| `recent` | Recently pushed repositories | repos |
| `pullrequests` | Latest pull requests with open / draft / merged / closed state | search |
| `contrib` | Other people's repositories the user recently contributed to | events |
| `gists` | Public gist count | profile |

> [!NOTE]
> `activity`, `hours`, `weekdays`, `events` and `contrib` use the public events API, which only covers recent public activity (up to the last 100 events). `hours` and `weekdays` use UTC unless you pass `tz=`.

## Themes

Pass `theme=<name>`:

| Theme | Background |
|---|---|
| `dark` (default) | transparent, light text |
| `light` | transparent, dark text |
| `github_dark`, `github_light` | solid GitHub colors |
| `dracula`, `nord`, `tokyonight`, `gruvbox`, `onedark`, `catppuccin` | solid dark |
| `solarized_light` | solid light |

Unknown theme names fall back to `dark`. To follow the viewer's GitHub color mode, use a `<picture>` element (the preview UI generates it for you):

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://your-domain.vercel.app/api/card?user=OstinUA"/>
  <img src="https://your-domain.vercel.app/api/card?user=OstinUA&theme=light" width="495" alt="GitHub Stats"/>
</picture>
```

> [!TIP]
> If you are embedding this in a public profile README, always use a tokenized deployment to avoid rate-limit blowups during traffic spikes.

## Tech Stack

- **Runtime**: Node.js `>=20` (no runtime dependencies).
- **Serverless API**: Vercel function (`api/card.js`).
- **Frontend**: Vanilla HTML/CSS/JS (`index.html`, `styles.css`, `app.js`).
- **GitHub Integration**: GitHub REST API (`fetch` + caching/retrying wrapper).
- **Tests**: Node's built-in test runner (`node:test`), no extra packages.
- **Automation Script**: Python (`trigger action/trigger_action.py`) with `PyGithub`, `requests`, `python-dotenv`.
- **CI/CD**: GitHub Actions workflow for AI-assisted issue generation.

## Technical Notes

### Project Structure

```txt
.
├── api/
│   └── card.js                # SVG card API handler
├── lib/
│   ├── constants.js           # Dimensions, language colors, themes
│   ├── data.js                # Loads only the data a slide needs
│   ├── github.js              # GitHub REST client (timeouts, retries, cache, ETags)
│   ├── helpers.js             # String/number/XML-safe helpers
│   └── svg.js                 # SVG utility builders
├── slides/                    # Individual slide renderers (+ common.js, stat.js)
├── scripts/
│   ├── check.js               # Syntax check for all JS files (npm run lint)
│   └── dev.js                 # Local server without the Vercel CLI
├── test/                      # node:test suite and fixtures
├── .github/workflows/
│   ├── ai-issue.yml           # AI issue automation workflow
│   └── lint.yml               # Lint + tests on pull requests
├── index.html                 # Preview and embed UI
├── app.js                     # Frontend logic for preview/snippets
├── styles.css                 # UI styling
├── trigger action/
│   └── trigger_action.py      # Workflow event processing script
├── vercel.json                # Vercel runtime and headers config
├── requirements.txt           # Python dependencies
└── package.json               # Node metadata + engine constraints
```

### Key Design Decisions

- **SVG-first output contract**: API returns `image/svg+xml` in both success and error paths, so embeds never hard-fail as broken JSON.
- **Cache-aware dynamic behavior**: non-preview requests map to a deterministic 10-minute bucket and are CDN-cached until that bucket ends (`s-maxage` = seconds left), so the slide flips on time.
- **Data on demand**: each slide declares the GitHub resources it `needs`; the handler picks the slide first and fetches only those. Only the user profile is required, every other resource fails soft.
- **Resilient GitHub client**: per-request timeouts bounded by an overall deadline, one retry for network/5xx errors, in-memory cache with ETag revalidation and stale-if-error, de-duplicated concurrent requests. The token is only ever sent to `api.github.com`.
- **Graceful degradation**: if a slide's data is unavailable or a slide throws, README viewers get the profile card (cached for 60s so it recovers quickly); preview requests (`_slide=`) show the exact error instead.
- **Composable slide registry**: all slide modules are registered through `slides/index.js` with `id`, `label`, `needs` and `render`, making extension straightforward.
- **Zero-framework frontend**: keeps preview page lightweight, dependency-free, and portable.

> [!IMPORTANT]
> The API requires `?user=<github_username>`. Without it, it returns an SVG error card intentionally.

## Getting Started

### Prerequisites

Install these dependencies before local development:

- Node.js `>=20`
- npm (bundled with Node)
- Python `>=3.10` (recommended: `3.11`)
- A GitHub Personal Access Token (optional but strongly recommended)

### Installation

```bash
# 1) Clone repository
git clone https://github.com/readme-SVG/readme-SVG-profile-bengo.git
cd readme-SVG-profile-bengo

# 2) Install Python dependencies (for workflow script tooling)
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 3) Run the preview UI + API locally (no Vercel CLI needed)
npm run dev        # real GitHub API on http://localhost:3000
npm run dev:mock   # offline, uses the test fixtures for any username

# Optional: Vercel CLI for full serverless emulation
npm i -g vercel

# 4) Configure env vars (token is optional but highly recommended)
export GITHUB_TOKEN="your_token_here"
```

> [!WARNING]
> Running without `GITHUB_TOKEN` will hit unauthenticated GitHub API limits quickly, especially with multiple embeds.

## Testing

The test suite uses Node's built-in runner and needs no `npm install`:

```bash
npm run lint   # syntax check of every JS file
npm test       # unit + integration tests (GitHub is mocked, no network needed)
```

The tests cover:

- Every slide in every theme with full, empty, single-item and hostile data (control characters, `<script>`, emoji, CJK, `null`s, wrong types), checking the output is well-formed SVG with no `NaN` / `undefined`.
- The handler: input validation, fetching only what a slide needs, rate limits, 404s, fallbacks, cache headers, badge offsets, pagination, and that the token never leaves `api.github.com`.
- The GitHub client: cache, request de-duplication, ETag revalidation, stale-if-error, retries, timeouts and the overall deadline.
- That the preview UI (`app.js`) lists exactly the server's slides and themes.

Manual smoke test:

```bash
npm run dev:mock
curl "http://localhost:3000/api/card?user=octocat&slides=overview&_slide=0" -o card.svg
test -s card.svg && echo "SVG generated"

# Optional: validate Python script import health
python -m py_compile "trigger action/trigger_action.py"
```

When adding a slide: create `slides/<id>.js` exporting `{ id, label, needs, render }`, append it to `slides/index.js` **and** to `ALL_SLIDES` in `app.js` (same order), then run `npm test`.

## Deployment

### Vercel (recommended)

```bash
# Authenticate and deploy
vercel
vercel --prod
```

`vercel.json` already defines:

- Function timeout for `api/card.js` (`maxDuration: 10`).
- CORS headers for `/api/*` GET endpoints.

If Vercel import/deploy fails with a project-name validation error, set a lowercase slug explicitly, for example:

```bash
vercel link --project readme-svg-profile-bengo
```

Vercel project slugs are safest in lowercase letters, numbers, and hyphens only.

### CI/CD Notes

- `.github/workflows/lint.yml` runs `npm run lint` and `npm test` on every pull request.
- `.github/workflows/ai-issue.yml` runs on pushes to `main` and selected PR events.
- The workflow executes `trigger action/trigger_action.py` and relies on repo secrets for tokenized operations.

## Usage

### Direct API

```bash
# Minimal
curl "https://your-domain.vercel.app/api/card?user=OstinUA"

# Restrict to selected slides
curl "https://your-domain.vercel.app/api/card?user=OstinUA&slides=repos,stars,commits"

# Force preview slide index (mostly for debugging/UI preview)
curl "https://your-domain.vercel.app/api/card?user=OstinUA&slides=repos,stars&_slide=1"

# Theme, and a second card that starts elsewhere in the rotation
curl "https://your-domain.vercel.app/api/card?user=OstinUA&theme=tokyonight&badge=2"

# Active hours / weekdays in your time zone (UTC+3)
curl "https://your-domain.vercel.app/api/card?user=OstinUA&slides=hours,weekdays&tz=3"
```

### README Embeds

```md
<!-- Markdown embed -->
![GitHub Stats](https://your-domain.vercel.app/api/card?user=OstinUA)

<!-- HTML embed with width control -->
<img src="https://your-domain.vercel.app/api/card?user=OstinUA" width="495" alt="GitHub Stats"/>
```

> [!CAUTION]
> Avoid setting tiny image widths in README markdown unless you want text clipping on specific slide layouts.

## Configuration

Environment variables used in this project:

| Variable | Required | Description |
|---|---:|---|
| `GITHUB_TOKEN` | No (but recommended) | Increases GitHub API rate limit and reduces request failures. |
| `REPOSITORY` | Workflow-only | Repository slug for `trigger_action.py` in CI contexts. |
| `EVENT_NAME` | Workflow-only | Event name consumed by automation script. |
| `COMMIT_SHA` | Workflow-only | Commit SHA passed from GitHub Actions. |
| `PR_NUMBER` | Workflow-only | Pull request number for PR event handling. |
| `GH_MODELS_TOKEN` | Workflow-only | Token for model-powered workflow steps. |
| `ALLOWED_USER` | Workflow-only | Optional identity gate in automation flow. |

API query parameters:

| Parameter | Required | Description |
|---|---:|---|
| `user` | Yes | GitHub username (a leading `@` is ignored). |
| `slides` | No | Comma-separated slide IDs to include (see [Slides](#slides)). Unknown IDs are ignored. |
| `theme` | No | Color theme (see [Themes](#themes)). Default `dark`. |
| `badge` | No | `1`–`8`. Each badge starts at a different point of the rotation so several cards on one page don't repeat. Default `1`. |
| `tz` | No | UTC offset in hours for `hours` / `weekdays`, e.g. `3`, `-5`, `5.5`. Default `0`. |
| `_slide` | No | Preview index override (debug/preview use). Disables caching and shows exact errors. |

## License

This project is licensed under **GPL-3.0**. See [`LICENSE`](LICENSE) for legal terms.

## Contacts

## ❤️ Support the Project

[![Patreon](https://img.shields.io/badge/Patreon-OstinFCT-f96854?style=flat-square&logo=patreon)](https://www.patreon.com/OstinFCT)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-fctostin-29abe0?style=flat-square&logo=ko-fi)](https://ko-fi.com/fctostin)
[![Boosty](https://img.shields.io/badge/Boosty-Support-f15f2c?style=flat-square)](https://boosty.to/ostinfct)
[![YouTube](https://img.shields.io/badge/YouTube-FCT--Ostin-red?style=flat-square&logo=youtube)](https://www.youtube.com/@FCT-Ostin)
[![Telegram](https://img.shields.io/badge/Telegram-FCTostin-2ca5e0?style=flat-square&logo=telegram)](https://t.me/FCTostin)

If this project saves you time, drop a ⭐ on GitHub or support the author directly.

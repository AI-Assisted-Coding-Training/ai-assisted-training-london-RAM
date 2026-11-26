# Planning Poker

A web application for agile estimation. Team members join a shared room, vote privately on a work item, reveal the votes together and agree on an estimate.

## Overview

- **Frontend** — this repository. A static web application, deployed to GitHub Pages.
- **Backend** — an existing service, maintained separately. The frontend talks to it over WebSocket as described in the [API contract](docs/api-contract.md).
- **Scope** — features, UI and behaviour are defined in the project backlog. Epics, stories and acceptance criteria are the source of truth for what the application does.

## Prerequisites

- Latest [VS Code](https://code.visualstudio.com/)
- GitHub Copilot licence and the GitHub Copilot Chat extension installed in VS Code
- Any modern web browser

Preflight check:


Both commands must succeed, and Copilot Chat must reply to `Hello`.

## Getting started

1. Clone the repository.
2. Open [index.html](index.html) in a browser to preview the static landing page. No build step is required.
3. Create a room and share its join URL. Voting stays closed for everyone until the host selects **Start voting**, which runs a 60-second discussion followed by a 20-second voting window. The host can select **Skip discussion** to open the full voting window immediately. Votes reveal when the window expires, when everyone has voted, or when the host reveals early. Only the host sees the countdown. After each round, the host can save an item name (up to 20 characters) and the agreed estimate (up to 4 characters); saved estimates appear in a read-only session history panel for everyone in the room until the room ends. See [system design](docs/system-design.md) for how history works within the API contract and its limitations.

## Project structure

| Path | Contents |
|---|---|
| `docs/` | Project documentation, including the [API contract](docs/api-contract.md) |
| `tools/` | Developer tooling |

## API contract

The [API contract](docs/api-contract.md) describes the WebSocket protocol, room and voting behaviour, and the `/health` route. It is the fixed interface between the frontend and the backend; the frontend integrates with it and does not change it.

## Deployment

The landing page uses plain HTML and CSS. To publish it, configure GitHub Pages to deploy from the root (`/`) of the branch containing the site.

## How we work

- Any frontend tech stack can be used, as long as it builds to a static site deployable to GitHub Pages.

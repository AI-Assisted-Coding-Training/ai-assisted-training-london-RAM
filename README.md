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
3. Create a room and share its join URL. Voting stays closed for everyone until the host selects **Start voting**, which runs a 60-second discussion followed by a 20-second voting window. The host can select **Skip discussion** to open the full voting window immediately. Votes reveal when the window expires, when everyone has voted, or when the host reveals early. Only the host sees the countdown. Shared item names and saving agreed estimates are not supported by the current backend.

In an active room, copy the join URL or scan its QR code to join from another
device. Use the deployed site or another address reachable from that device;
a local file or `localhost` URL is not shareable across devices.

## Project structure

| Path | Contents |
|---|---|
| `docs/` | Project documentation, including the [API contract](docs/api-contract.md) |
| `tools/` | Developer tooling |
| `vendor/` | Browser bundle of `qrcode-generator` 2.0.4 and its [MIT license](vendor/qrcode.LICENSE) |

## API contract

The [API contract](docs/api-contract.md) describes the WebSocket protocol, room and voting behaviour, and the `/health` route. It is the fixed interface between the frontend and the backend; the frontend integrates with it and does not change it.

## Deployment

The landing page uses plain HTML and CSS. To publish it, configure GitHub Pages to deploy from the root (`/`) of the branch containing the site.

## How we work

- Any frontend tech stack can be used, as long as it builds to a static site deployable to GitHub Pages.

# Planning Poker: agent guide

> **Required: Review and update this guide with every change.** If the change affects what agents need to know about the project, update this file in the same commit or pull request. If the guidance still applies, leave it unchanged.

## Project and scope

- This repository owns the Planning Poker frontend. It must build to a static site deployable to GitHub Pages; no frontend framework is mandated. The backend is maintained separately.
- Use the Planning Poker GitHub Project (AI-Assisted-Coding-Training, project 4, key `PPO`) for feature scope and acceptance criteria. See [backlog configuration](.backlog/config.json) and [epic and story templates](.backlog/_templates/).
- Read the [README](README.md) for project setup and the [API contract](docs/api-contract.md) before changing any backend integration. Integrate with the contract rather than changing it to suit the frontend.

## Working in this repository

- [Local skills](.agents/skills/) document project workflows. [Tooling](tools/) contains the packaged Backlog Assistant extension.
- There is no frontend source tree or established build, lint, or test command yet. Document the actual commands and GitHub Pages deployment steps when adding tooling.
- Keep guidance on architecture, project layout, validation commands, deployment, and contributor workflows current. Remove stale guidance and link to authoritative docs rather than duplicating them.

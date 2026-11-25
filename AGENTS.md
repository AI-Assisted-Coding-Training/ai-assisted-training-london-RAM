# Planning Poker: agent guide

## Project and scope

- This repository owns the Planning Poker frontend. It must build to a static site deployable to GitHub Pages; no frontend framework is mandated. The backend is maintained separately.
- Use the Planning Poker GitHub Project (AI-Assisted-Coding-Training, project 4, key `PPO`) for feature scope and acceptance criteria. See [backlog configuration](.backlog/config.json) and [epic and story templates](.backlog/_templates/).
- Read the [README](README.md) for project setup and the [API contract](docs/api-contract.md) before changing any backend integration. Integrate with the contract rather than changing it to suit the frontend.

## Working in this repository

- [Local skills](.agents/skills/) document project workflows. [Tooling](tools/) contains the packaged Backlog Assistant extension.
- There is no frontend source tree or established build, lint, or test command yet. Document the actual commands and GitHub Pages deployment steps when adding tooling.
- When a change introduces or alters architecture, project layout, validation commands, deployment, or contributor workflows, update this guide in the same change. Remove stale guidance and link to authoritative docs rather than duplicating them. Routine changes that don't affect this guidance don't need an edit here.

---
name: architecture-diagrams
description: Describe the repository's system architecture in Mermaid and keep it current. Use when asked about or to document the architecture, and when a change affects components, boundaries, data flows, integrations, deployment, or persistence.
---

# Architecture diagrams

Maintain [the system design](../../../docs/system-design.md) as an accurate,
concise description of the current architecture.

1. Inspect the relevant implementation, configuration, deployment files and
   documentation. For a change in progress, include its final state. Check
   the working tree rather than assuming a clean checkout.
2. Identify system boundaries, major components, external services,
   communication paths and storage. Distinguish implemented behavior from
   plans or contractual expectations. Do not invent missing details.
3. Update the existing Mermaid diagrams and accompanying text in
   `docs/system-design.md` when the architecture has changed. Add or remove
   diagrams only when needed for clarity; preserve unrelated documentation.
   Link to the supporting repository sources and record material uncertainty.
4. Check that Mermaid blocks are well formed, their relationships and labels
   match the evidence, and links resolve. Use an existing Mermaid validation
   tool if available. Report any validation that could not be performed.

For a question or review without a requested repository change, describe the
architecture without modifying files. If an implementation change does not
affect the documented architecture, leave the document unchanged.

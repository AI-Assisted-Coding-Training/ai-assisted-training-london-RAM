---
name: commit-and-open-pr
description: Stage new files, commit and push changes, and create a pull request with a description based on the actual changes. Use when asked to commit new files and open a PR, or to publish changes as a pull request.
---

# Commit and Open a Pull Request

Publish the requested changes and describe them accurately. Follow the
repository's contribution instructions and any user-specified file scope,
branch, remote, base branch, commit message, or PR details.

## Procedure

1. **Inspect the repository.** Check the current branch, remotes, default
   branch, and `git status`, including staged, modified, and untracked files.
   Identify the new files the user intends to publish. Do not include
   ignored files, secrets, credentials, or unrelated work. If the intended
   scope is unclear, or unrelated changes are already staged, ask the user
   how to proceed; never silently unstage or commit someone else's work.
   If there are no requested changes to publish, explain and stop.

2. **Prepare the branch.** Use the current feature branch unless the user
   specifies another. If on the target base branch or in detached HEAD,
   create and switch to a suitably named feature branch before committing.
   Determine the PR's base branch from the user's request or the target
   repository's default branch. Do not rewrite history or force push.

3. **Review and stage.** Inspect the contents of the selected new files
   and any other explicitly requested changes. Stage only those paths
   explicitly; avoid staging the entire working tree. Review the staged
   diff, including the file list, for scope and sensitive content. If
   sensitive content is found, stop and tell the user rather than committing
   or pushing it.

4. **Validate and commit.** Run the relevant available checks when
   appropriate, and report any failures or checks not run. Create a
   descriptive commit for the staged changes, following repository
   conventions and applicable commit-trailer instructions. Do not amend
   existing commits unless explicitly requested.

5. **Push and open the PR.** Push the feature branch to the appropriate
   remote, setting its upstream if needed. Determine the target repository
   and base branch, including fork relationships when applicable. Check for
   an existing PR for this head and base before creating one; reuse it
   instead of opening a duplicate. If push or PR creation fails, report the
   error and do not claim success.

6. **Describe and report.** For a new PR, write a concise title and
   description from the full branch diff against the base, not just the
   latest commit. Summarise the purpose and substantive changes, and list
   checks actually run and their results; do not invent outcomes. Follow
   any PR template. If reusing an existing PR, do not overwrite its
   description without the user's approval. Report the PR link, branch,
   commit, and validation status.

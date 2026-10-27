---
name: keep-landing-in-sync
description: Review and update the Instagram Saved Posts landing site and user-facing documentation whenever the main app changes. Use for every app change, including feature, setup, deployment, configuration, or behavior updates.
---

# Keep the landing site in sync

The app repository is the source of truth. The sibling instagram-saved-posts-landing repository presents its user-facing features, setup guidance, and documentation. Every change to the app triggers a landing sync review before handoff.

## Workflow

1. Review the app changes and verify what users can actually do from the implementation and its current documentation.
2. Inspect the relevant landing sources in the sibling repository. Common locations include:
   - src/app/page.tsx and src/components/landing/ for the home page.
   - src/data/ for feature, FAQ, comparison, and architecture content.
   - content/docs/ for setup, feature, and operations documentation.
3. Update all affected landing content in the same task. Check feature descriptions, onboarding and install steps, configuration names, deployment instructions, supported capabilities, limitations, screenshots, and security or privacy claims when those areas changed.
4. Keep claims specific to verified app behavior. Preserve the landing site's own voice and design; avoid copying internal implementation details or duplicating the app README.
5. If the app change does not alter any user-facing or documented fact, leave the landing content alone and report that the repository was reviewed and why no edit was needed.
6. Summarize app and landing changes together. If the landing repository is unavailable or a claim cannot be verified, identify the unsynced item as incomplete rather than implying the site is current.

Do not push, publish, deploy, or create external issues as part of synchronization unless the user explicitly requests that action.

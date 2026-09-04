# Contributing to Desk-Support

Thank you for considering a contribution to Desk-Support.

Desk-Support is an application for organising internal support operations around tickets, assets, teams, departments, people, notifications, communication and working files. Contributions should make the product **more reliable, clearer to use, easier to maintain, or more useful to real support teams**.

## Before you start

For small fixes, documentation changes and obvious bugs, you can generally open a pull request directly.

For substantial changes — especially changes to the data model, authentication, permissions, routing, storage, notifications, calling, or the overall product experience — please open an issue first. This helps avoid building a large change in a direction that does not fit the project.

## Development setup

### Requirements

- Node.js
- npm
- Git
- A Supabase project when working on backend-backed functionality
- Android Studio and/or Xcode when working on native mobile builds
- Platform tooling for Electron when working on desktop packaging

### Local setup

```bash
git clone https://github.com/codedbyhassan/Desk-Support.git
cd Desk-Support
npm install
```

Create your local environment file from the example:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Never commit `.env` or real credentials.

### Run locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Working on the codebase

The source is organised broadly as follows:

```text
src/
├── components/   # Reusable UI and feature components
├── config/       # Application configuration
├── context/      # Global state/providers
├── hooks/        # Reusable React/application hooks
├── lib/          # Clients and shared utilities
├── pages/        # Route-level screens
├── services/     # Domain/application services
├── styles/       # Styling
└── types/        # Shared TypeScript types
```

When making a change, prefer placing logic in the layer that owns it rather than adding more logic to an already large page component.

## Code standards

### TypeScript

- Prefer explicit, meaningful types.
- Avoid introducing new `any` values.
- Use `unknown` when the shape genuinely is not known yet, then narrow it before use.
- Reuse existing domain types instead of creating slightly different copies of the same object.
- Keep API and database types aligned with the actual schema.

### React

- Prefer functional components and hooks.
- Keep components focused on a clear responsibility.
- Reuse existing components before introducing duplicates.
- Treat hook dependency warnings as signals to investigate rather than problems to silence.
- Avoid unnecessary state and effects.

### UI

Desk-Support is intentionally a focused operational product. New UI should be:

- clear before decorative
- responsive
- accessible by keyboard and screen reader where practical
- consistent with the existing design language
- useful on small screens as well as desktop
- careful with loading, empty, success and error states

Do not introduce a new visual pattern when an existing component already solves the problem.

### Data and security

- Never commit secrets.
- Never expose service-role credentials to browser code.
- Treat frontend route protection as UX, not as the final security boundary.
- Changes involving Supabase policies, authentication or sensitive data should be reviewed carefully.
- Validate user-controlled input at appropriate boundaries.

## Making a change

Create a branch from `main`:

```bash
git checkout -b feat/short-description
```

Use a descriptive branch name, for example:

```text
feat/asset-import
fix/ticket-assignment
fix/mobile-navigation
docs/setup-guide
refactor/notification-service
```

Keep each pull request focused. A pull request that fixes one problem cleanly is much easier to review than a pull request that mixes unrelated refactors, redesigns and bug fixes.

## Commit messages

Use concise, descriptive commit messages. Conventional Commit-style prefixes are encouraged:

```text
feat: add asset import
fix: correct ticket assignment
refactor: simplify notification service
docs: improve local setup
style: refine ticket list spacing
chore: update dependencies
```

## Before opening a pull request

Run the checks relevant to your change:

```bash
npm run lint:types
npm run lint:js
npm run lint:css
npm run build
```

If the complete lint command is appropriate for your branch, you can also run:

```bash
npm run lint
```

If a check cannot be run because it depends on external infrastructure or platform-specific tooling, explain that clearly in the pull request.

## Pull requests

A good pull request should explain:

1. **What changed?**
2. **Why was it needed?**
3. **How was it tested?**
4. **Are there database, environment, migration, or platform changes?**
5. **Are there screenshots or recordings for UI changes?**

For UI changes, screenshots are strongly encouraged.

### Pull request checklist

- [ ] The change has a clear purpose.
- [ ] Existing functionality was not unnecessarily duplicated.
- [ ] TypeScript types are appropriate.
- [ ] Loading, empty and error states were considered.
- [ ] Responsive behaviour was checked where relevant.
- [ ] Accessibility was considered.
- [ ] No secrets or credentials were committed.
- [ ] Relevant lint/type/build checks were run.
- [ ] Documentation was updated if behaviour or setup changed.

## Reporting bugs

A useful bug report should include:

- a clear description of the problem
- the expected behaviour
- the actual behaviour
- steps to reproduce it
- browser/OS/device information when relevant
- relevant console or terminal errors
- screenshots or recordings when useful

Do not post passwords, access tokens, private keys, personal data or other sensitive information in an issue.

## Feature requests

Good feature requests explain the operational problem first rather than prescribing a solution immediately.

For example:

> “Support staff need to know which employee currently has a laptop before responding to a hardware ticket.”

is more useful than:

> “Add a laptop button to the dashboard.”

Describe the workflow, the users affected and the desired outcome.

## Database and Supabase changes

Changes to the database are especially important because application code and the database schema must evolve together.

When making schema-related changes:

- document the migration
- consider existing data
- consider rollback/recovery
- review Row Level Security implications
- update application types where necessary
- test affected queries and mutations
- avoid weakening access controls just to make a request succeed

## Desktop and mobile changes

Desk-Support can be delivered beyond the browser through Electron and Capacitor. Platform-specific changes should not silently break the web experience.

When relevant, test the affected platform and state which platforms were checked in the pull request.

## Review philosophy

Reviews are about improving the software, not winning arguments.

Expect reviewers to ask questions about:

- correctness
- security
- maintainability
- user experience
- type safety
- performance
- consistency with existing architecture

Please respond to review feedback constructively. If you disagree with a suggestion, explain the trade-off and propose an alternative where appropriate.

## What we value

The best Desk-Support contributions are not necessarily the biggest ones.

A small fix that prevents a ticket from disappearing, a clearer empty state, a safer database query, a better error message, a useful test, or a cleaner type can have more value than another large feature.

**Build for the people who have to use the system when something has already gone wrong.**

## License

By contributing to Desk-Support, you agree that your contributions will be licensed under the project's MIT License.

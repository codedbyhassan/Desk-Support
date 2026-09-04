# Security Policy

## Supported versions

Desk-Support is under active development. Security fixes are prioritised for the current `main` branch.

Because the project is evolving quickly, older commits or unreleased builds may not receive individual security patches.

## Reporting a vulnerability

Please **do not open a public GitHub issue for a security vulnerability**.

Instead, contact the project maintainer privately through the contact method available on the maintainer's GitHub profile:

**https://github.com/codedbyhassan**

When reporting a vulnerability, please include:

- A clear description of the issue.
- The affected component or route.
- Steps to reproduce the issue.
- The potential impact.
- Any relevant logs, screenshots or proof of concept that can be safely shared.
- A suggested mitigation, if you have one.

Please avoid including real passwords, access tokens, private keys, customer information or other sensitive data in your report.

## What to expect

The maintainer will review the report, investigate the issue and determine the appropriate remediation. If the issue is confirmed, a fix may be developed and released before public disclosure where practical.

Please allow reasonable time for investigation and remediation before publicly disclosing a vulnerability.

## Security principles

Desk-Support handles operational data and therefore security should be considered at every layer:

- Keep secrets out of source control.
- Never expose Supabase service-role credentials to client-side code.
- Enforce sensitive data access at the database/backend layer.
- Review Row Level Security policies whenever data access changes.
- Validate untrusted input.
- Avoid logging credentials or sensitive user data.
- Keep dependencies reasonably current.
- Treat authentication and authorisation changes as security-sensitive.

## Third-party services

Deployments may depend on external services such as Supabase and platform-specific services. Their configuration, credentials and security policies are part of the deployment environment and should be managed separately from this repository.

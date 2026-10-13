# Security policy

## Reporting a problem

Please **don't open a public issue** for a security problem. Instead, report it privately through GitHub:
**Security → Report a vulnerability** on this repository (a private security advisory). Include what you found,
how to reproduce it, and which version you're running (`git describe --tags` or the image tag).

You'll get a reply as soon as possible. Once a fix is released, the advisory is published with credit to you,
unless you'd rather stay anonymous.

## Supported versions

Only the latest release gets security fixes. Keep your install up to date: see
[docs/upgrading.md](docs/upgrading.md).

## How the app protects data

See [docs/security.md](docs/security.md): what's exposed, Row Level Security, where secrets live, how Canvas
tokens are stored, and what leaves your server.

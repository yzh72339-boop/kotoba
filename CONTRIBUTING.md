# Contributing to Kotoba

Kotoba's project source and original course content are available under the
[MIT License](LICENSE). Anyone may copy, modify, fork and redistribute them.
Third-party dependencies and third-party materials keep their own licenses.

Fork the public repository, create a branch, and open a pull request with a
short explanation and the checks you ran. Maintainers review changes before
merging. Open source does not grant direct write access to the original main
branch or access to the maintainer's private learning application.

## Development

Use Node.js 24 and the existing lockfile. Follow the setup in README.md and
docs/OPEN-SOURCE-SETUP.md. Configure your own Supabase project and owner account.
Never use another person's production database for development.

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run content:audit
npm run build
```

Make small changes, preserve stable course/card IDs and existing learning data,
and do not disable Auth or RLS. Include relevant regression tests. Explain any
database change and its compatibility before introducing a migration. Content
contributions need natural examples, translations, answer explanations and
level-appropriate exercises. The full content targets remain tracked in
CONTENT-AUDIT.md; do not weaken those checks to pass a build.

Never commit environment files, passwords, API keys, login state, personal
learning exports or recordings. Report vulnerabilities as described in
SECURITY.md rather than including secrets in an issue or pull request.

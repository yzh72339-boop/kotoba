# Security

Source availability does not make learning data public. Keep Supabase Auth,
the single-owner restriction, RLS and private Storage enabled in every deployed
instance. Contributors must use their own project and account.

Only the Supabase project URL and Publishable Key may be browser environment
variables. Service-role keys, Google client secrets, database credentials and
AI keys stay server-side. Real environment files, session state, recordings,
exports, backups and deployment evidence must not be published.

## Reporting a vulnerability

Use the repository's Security > Report a vulnerability feature if private
vulnerability reporting is enabled. Otherwise contact the maintainer privately
through an established channel. Do not post working credentials, personal data
or details enabling an unpatched exploit in a public issue. A public issue may
request a private reporting channel without including exploit details.

The repository does not promise a formal security response SLA. Deployed
instances and dependency updates remain the responsibility of their operators.

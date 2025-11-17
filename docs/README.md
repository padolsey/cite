# Documentation Directory

This directory contains **internal planning and design documents** for the CITE project.

## Structure

### Internal Docs (this directory)
- `api-v2-planning.md` - Complex API features planned for v2 (session management, analytics, batch ops, etc.)
- (Future: architecture.md, design-decisions.md, etc.)

### Public-Facing Docs (served by the app)
- `/static/docs/api-v1.md` - **The actual v1 API specification** (simplified, user-facing)
- This is what gets served at `https://your-site.com/docs/api-v1.md`

## Guidelines

### When adding docs:
- **API documentation** → Put in `/static/docs/` (gets served publicly)
- **Internal planning/architecture** → Put in `/docs/` (not served, for developers)

### No build step needed
- Files in `/static/` are automatically served by SvelteKit
- No copying or build process required for docs
- Just edit `/static/docs/api-v1.md` directly for API changes

## API Versioning

### v1 (Current - Simplified)
- Stateless only (no session management)
- Simple + Full evaluation modes
- Core risk classification
- Basic webhooks and resources
- Focus: Clarity and 80% use case

See: `/static/docs/api-v1.md`

### v2 (Planned - Advanced Features)
- Session management (optional)
- Analytics endpoints
- Batch evaluation
- Custom policy management
- Human review queue
- Multi-modal support
- Streaming evaluation

See: `/docs/api-v2-planning.md`

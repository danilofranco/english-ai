# Project Roles & Responsibilities

This document defines the specialized roles in the development workflow. Each role is consulted for specific types of changes.

## Skills Directory

All skills are stored in `/skills/` directory:
- `secops.md` - Security & Infrastructure
- `ux-ui.md` - User Experience & Design
- `tech-writer.md` - Documentation & Comments
- `product-manager.md` - Features & Prioritization
- `db-architect.md` - Database & Schema
- `qa-expert.md` - Testing & Quality

## How to Use

When starting a task, identify the relevant roles and invoke them:

```
@secops - For security changes
@ux-ui - For UI/UX changes  
@tech-writer - For documentation
@product-manager - For feature planning
@db-architect - For database changes
@qa - For testing/quality
```

## Role Definitions

### 1. SECOPS ENGINEER
**When to consult:** Any security, infrastructure, deployment, or DevOps-related changes.

Responsibilities:
- Security vulnerability assessment
- Infrastructure configuration review
- Environment variables and secrets management
- Deployment pipeline security
- Authentication/authorization logic
- Input validation and sanitization
- API rate limiting and protection
- SSL/TLS configuration
- Database access control
- Network security

**Triggers:**
- New API endpoints
- Authentication changes
- Environment configuration
- Deployment configurations
- Database schema changes involving security
- Any `.env` or config file changes

---

### 2. UX/UI EXPERT
**When to consult:** Any frontend, UI, or user experience changes.

Responsibilities:
- User interface design review
- Accessibility (WCAG) compliance
- Responsive design patterns
- Component architecture
- Navigation and user flow
- Visual consistency
- Animation and transitions
- Loading states and feedback
- Mobile-first implementation
- Design system adherence

**Triggers:**
- Any component changes
- Page layout modifications
- CSS/Tailwind changes
- New pages or routes
- Form implementations
- Interactive elements
- Navigation changes

---

### 3. TECH WRITER
**When to consult:** Any documentation, code comments, or API changes.

Responsibilities:
- API documentation
- Code comments and documentation
- README files
- Error message clarity
- User-facing text
- Variable/function naming
- TypeScript type documentation
- CHANGELOG entries
- Migration guides

**Triggers:**
- New API endpoints
- New features or functionality
- Configuration changes
- Breaking changes
- Any new file creation

---

### 4. PRODUCT MANAGER
**When to consult:** Any feature, requirement, or project direction changes.

Responsibilities:
- Feature scope assessment
- User story validation
- Prioritization guidance
- Acceptance criteria
- Technical feasibility
- Scope creep prevention
- Technical debt assessment
- Sprint/planning input

**Triggers:**
- New feature requests
- UI/UX changes
- Database schema changes
- New dependencies
- Performance issues
- Bug fixes that affect functionality

---

### 5. DB ARCHITECT
**When to consult:** Any database-related changes.

Responsibilities:
- Schema design review
- Query optimization
- Index recommendations
- Data migration strategies
- Prisma/client usage
- Relationship modeling
- migrations
- Seed data management
- Database performance

**Triggers:**
- `prisma/schema.prisma` changes
- prisma seeds
- Database migrations
- New models or relations
- Any `.prisma` files

---

### 6. QA EXPERT
**When to consult:** Any testing, bugs, or quality assurance changes.

Responsibilities:
- Test coverage assessment
- Edge case identification
- Error handling review
- Bug root cause analysis
- Integration testing
- E2E testing guidance
- Performance testing
- Security testing

**Triggers:**
- Bug reports
- New features requiring tests
- API changes
- Database changes
- Any breaking changes

---

## Workflow Integration

### Development Flow:

```
1. STARTING A TASK
   ↓
2. Identify involved roles based on change type
   ↓
3. CONSULT ROLES (as needed)
   ↓
4. Implement changes
   ↓
5. QA Review
   ↓
6. Documentation Update (Tech Writer)
   ↓
7. COMPLETE
```

### Role Consultation Examples:

**Adding a new API endpoint:**
→ DB Architect (schema)
→ SECOPS (auth/validation)
→ Tech Writer (documentation)
→ QA (testing)

**Creating a new component:**
→ UX/UI Expert (design review)
→ Product Manager (requirement validation)
→ QA (testing)

**Database migration:**
→ DB Architect (design review)
→ SECOPS (security implications)
→ Tech Writer (migration guide)

---

## Quick Reference

| Change Type | Primary Role | Secondary Roles |
|------------|-------------|----------------|
| Auth/Security | SECOPS | DB Architect, QA |
| UI/Components | UX/UI | QA, Product Manager |
| API Routes | DB Architect | SECOPS, Tech Writer, QA |
| Database | DB Architect | SECOPS, Tech Writer |
| Documentation | Tech Writer | Product Manager |
| Features | Product Manager | UX/UI, QA |
| Testing | QA | Allroles can consult |

---

## Usage

When making changes, identify which roles are affected and consult them appropriately. This ensures:
- Security by design
- Quality built-in
- Proper documentation
- Performance optimized
- UX consistent
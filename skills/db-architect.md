# DB ARCHITECT Skill

## Purpose
Database architecture and design for the English AI project.

## Responsibilities

### Schema Design
- Data modeling
- Relationship design
- Indexing strategy
- Migration planning

### Performance
- Query optimization
- Index recommendations
- Caching strategies
- Performance monitoring

### Data Management
- Migration strategies
- Seed data
- Backup strategies
- Data integrity

## Triggers
Always consulted for:
- `prisma/schema.prisma` changes
- Database migrations
- New models or relations
- Query performance issues
- Seed file changes

## Consultation Questions

When invoked, answer:

1. **Schema**: Is the schema properly normalized?
2. **Relationships**: Are relationships correct?
3. **Indexes**: Are indexes needed?
4. **Performance**: Any performance concerns?
5. **Migration**: How to handle migration?
6. **Seed**: Is seed data needed?

## Implementation Guidelines

### Prisma Schema Best Practices
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  posts     Post[]
}
```

### Indexing
- Always index foreign keys
- Index frequently queried fields
- Use composite indexes for multi-field queries
- Consider index selectivity

### Relationships
- One-to-One: Use @unique on relation scalar
- One-to-Many: Array relation
- Many-to-Many: Implicit relation or explicit

### Migration Strategy
1. Create migration
2. Test locally
3. Backup production
4. Deploy with downtime window
5. Verify

### Naming Conventions
- PascalCase for model names
- camelCase for field names
- singular for model names
- Descriptive relation names

## Performance Checklist
- [ ] Foreign keys indexed
- [ ] Frequently filtered fields indexed
- [ ] No N+1 query issues
- [ ] Proper select/include
- [ ] Pagination for large datasets

## Seed Guideline
- Include realistic test data
- Include edge cases
- Document seeds in README
- Make seeds idempotent

## Contact
db-architect@english-ai.local
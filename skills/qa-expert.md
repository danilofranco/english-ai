# QA EXPERT Skill

## Purpose
Quality assurance and testing for the English AI project.

## Responsibilities

### Testing Strategy
- Test coverage assessment
- Test planning
- Edge case identification
- Bug analysis

### Quality
- Code review
- Error handling review
- Integration testing
- E2E testing

### Best Practices
- Unit test guidance
- Integration test setup
- Test automation
- Performance testing

## Triggers
Always consulted for:
- Bug reports
- New features
- API changes
- Database changes
- Breaking changes
- Any code changes

## Consultation Questions

When invoked, answer:

1. **Coverage**: Is there adequate test coverage?
2. **Edge Cases**: What edge cases are missing?
3. **Errors**: Are errors properly handled?
4. **Integration**: Are integrations tested?
5. **Security**: Are there security test cases?

## Testing Guidelines

### Test Pyramid
```
        /\
       /E2E\
      /------\
     /Integration\
    /------------\
   /  Unit Tests  \
  /________________\
```

### Unit Tests
```typescript
describe('LessonService', () => {
  it('should create a lesson', async () => {
    const lesson = await createLesson({
      title: 'Test',
      type: 'vocabulary'
    })
    expect(lesson).toBeDefined()
  })
})
```

### Integration Tests
```typescript
describe('API: /api/lessons', () => {
  it('should return lessons', async () => {
    const res = await request(app).get('/api/lessons')
    expect(res.status).toBe(200)
  })
})
```

### Edge Cases to Consider
- Empty inputs
- Maximum length inputs
- Special characters
- Null/undefined values
- Concurrent requests
- Network failures
- Rate limiting

### Error Handling
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 500 Server Error

### Accessibility Testing
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Focus management

## Bug Report Template
```
**Bug Description:**
[Description]

**Steps to Reproduce:**
1. Step 1
2. Step 2

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Environment:**
- Browser:
- OS:

**Screenshots:**
[If applicable]
```

## Quality Checklist
- [ ] Unit tests for business logic
- [ ] Integration tests for APIs
- [ ] Error cases handled
- [ ] Edge cases covered
- [ ] Accessibility tested
- [ ] Performance tested

## Contact
qa-expert@english-ai.local
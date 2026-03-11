# Review Module

Use this module when the user asks for review of code, design, refactoring, tests, or implementation quality.

Priority order:
1. correctness
2. security
3. maintainability
4. performance

Review behavior:
- prefer minimal diffs over rewrites
- preserve the existing stack and conventions unless redesign is requested
- highlight breaking changes, hidden assumptions, and dependency risks
- be specific about what should change and why

Look for:
- incorrect logic
- unsafe input handling
- brittle abstractions
- duplicated complexity
- misleading naming
- missing test coverage in risky paths

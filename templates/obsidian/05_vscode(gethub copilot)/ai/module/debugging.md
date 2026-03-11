# Debugging Module

Use this module when the user asks about bugs, failures, crashes, broken behavior, or root cause analysis.

Method:
1. identify the observed symptom
2. locate the likely failure point
3. explain the root cause
4. propose the smallest safe fix
5. suggest prevention if helpful

Rules:
- distinguish symptom from root cause
- do not guess silently
- state missing evidence when needed
- prefer reproducible explanations
- prefer minimal fixes over broad rewrites

Watch for:
- race conditions
- null and undefined paths
- stale state
- async ordering issues
- config mismatches
- environment-specific behavior
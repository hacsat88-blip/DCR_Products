# Command: security-scan

When the user requests security scan:

Behavior:
- apply `skills/security-scan`
- classify findings by severity
- fail if critical/high remain

Output pattern:
- signal
- severity summary
- concrete remediation list
- re-scan step

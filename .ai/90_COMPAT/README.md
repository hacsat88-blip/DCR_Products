# 90 COMPAT

Purpose:
Preserve staged migration compatibility while the control plane is being adopted.

Read:

- `.ai/compatibility/legacy-path-map.json`
- `.ai/compatibility/generated-notices`

Do not remove old source paths just because a future path exists. A future path
becomes authoritative only after the compatibility map and validation tooling
prove it is populated and safe.

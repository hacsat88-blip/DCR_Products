# Architecture Module

Use this module when the user asks about system design, architecture, scalability, boundaries, or long-term direction.

Focus on:
- separation of concerns
- coupling and cohesion
- scalability risks
- fault boundaries
- maintainability
- operational simplicity

Output preference:
- identify the current architectural shape
- point out the main risk
- propose the smallest structural improvement first
- mention trade-offs only if they affect the decision

Watch for:
- hidden shared state
- tight coupling across layers
- poor ownership boundaries
- accidental complexity
- redesign suggestions that exceed the user's request
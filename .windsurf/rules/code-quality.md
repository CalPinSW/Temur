---
trigger: always_on
---
If you come across code that is no longer used, or is uneccessary, please remove it.

If you come see opportunities for refactoring, please offer to do so, even if it is not directly related to the current task.

Refactoring should be done with the goal of making the codebase more maintainable, readable, and performant.

When writing JSX, use the `Themed` components provided by the `@/components/themed` module wherever possible. If creating a new component, consider creating a themed version of it first and using that.

Avoid using React fragments when possible. Prefer using views instead. 
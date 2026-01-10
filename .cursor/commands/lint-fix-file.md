# Lint Fix File - Deep Analysis & Fix

This command analyzes linting errors in a file, understands the business logic context, and provides intelligent fixes for complex issues that cannot be auto-fixed.

## Usage

Reference a file when using this command. The command will:

1. Read all linting errors for the specified file
2. Analyze each error in depth
3. Understand the business logic and codebase context
4. Provide intelligent fixes that preserve functionality

## Process

### Step 1: Run ESLint on the File

First, run ESLint on the entire project and filter for the target file. This ensures type-aware rules (which require full TypeScript project context) are properly detected:

1. **Run ESLint Command**
   - Extract the file path from the user's file reference
   - Execute: `yarn lint` to lint the entire project (ensures full TypeScript project context is loaded)
   - Filter the output for the target file using grep: `yarn lint 2>&1 | grep -A 5 "<file-path>"`
   - This approach is necessary because:
     - Type-aware ESLint rules (TypeScript ESLint, SonarJS) require full project context
     - Single-file linting (`yarn lint:file`) may not load the complete TypeScript project
     - Full project linting catches errors that single-file linting misses
   - Capture the full output including all errors, warnings, and their line numbers

2. **Parse ESLint Output**
   - Extract all linting errors from the filtered command output
   - Note the rule name, severity (error/warning), line number, and message for each issue
   - Identify which errors are auto-fixable (ESLint may indicate this with `--fix` suggestion)
   - Focus on errors that require manual intervention and deeper analysis

### Step 2: Deep Analysis for Each Error

For each linting error that is NOT auto-fixable:

1. **Understand the Error**
   - Read the error message and rule documentation
   - Identify the specific code causing the issue
   - Understand why the linter is flagging it

2. **Analyze Business Logic Context**
   - Read the file containing the error to understand the function/component
   - Search for usages of the problematic code to understand impact
   - Check related files (imports, exports, tests) to understand dependencies
   - Review similar patterns in the codebase to maintain consistency

3. **Identify Impact**
   - Determine what business logic or functionality might be affected
   - Check if the fix could break existing behavior
   - Verify if tests exist and how they might be affected
   - Consider edge cases and error handling

4. **Propose Solution**
   - Provide a fix that addresses the linting error
   - Ensure the fix maintains existing functionality
   - Follow project patterns and conventions
   - Consider type safety, performance, and maintainability

### Step 3: Implementation

- Apply fixes one at a time, starting with the most critical errors
- After each fix, verify no new errors were introduced
- Ensure the code still follows project conventions

## Error Categories

### TypeScript Errors

- `@typescript-eslint/no-explicit-any`: Replace with proper types
- `@typescript-eslint/no-unused-vars`: Remove or prefix with `_`
- `@typescript-eslint/no-non-null-assertion`: Use proper null checks
- Type mismatches: Fix type definitions or add type guards

### React/React Hooks Errors

- `react-hooks/exhaustive-deps`: Add missing dependencies or use refs
- `react-hooks/rules-of-hooks`: Fix hook usage order/conditions
- `react/jsx-key`: Add proper keys to list items

### Import/Export Errors

- `import/order`: Fix import ordering per project rules
- `import/no-duplicates`: Consolidate duplicate imports
- `import/no-unresolved`: Fix import paths (use path aliases)

### Accessibility Errors

- `jsx-a11y/*`: Add proper ARIA attributes and semantic HTML
- Ensure keyboard navigation and screen reader support

### Code Quality Errors

- `sonarjs/*`: Address code smells and complexity
- Logic errors: Fix control flow and edge cases

## Guidelines

1. **Never Break Functionality**: Always verify that fixes maintain existing behavior
2. **Follow Project Patterns**: Use existing code patterns and conventions
3. **Type Safety First**: Prefer proper types over type assertions
4. **Test Impact**: Consider how changes affect existing tests
5. **Documentation**: Add comments if the fix requires non-obvious reasoning
6. **Incremental Fixes**: Fix one error at a time to avoid cascading issues

## Example Workflow

```markdown
1. Run ESLint on entire project and filter for target file: `yarn lint 2>&1 | grep -A 5 "<file-path>"`
   - This ensures type-aware rules work correctly (they need full project context)
2. Parse ESLint output to extract all errors for the target file
3. For each error (especially non-auto-fixable ones):
   a. Read the file to understand context
   b. Search for usages to understand impact
   c. Check related files and tests
   d. Propose fix with explanation
   e. Apply fix
   f. Re-run `yarn lint 2>&1 | grep -A 5 "<file-path>"` to verify fix
4. Final verification: Run `yarn lint 2>&1 | grep -A 5 "<file-path>"` again to ensure all errors are resolved
```

**Note**: Always use `yarn lint` (full project) instead of `yarn lint:file` because:

- Type-aware rules require full TypeScript project context
- Single-file linting may miss type-aware errors (e.g., SonarJS redundant checks)
- The project uses `project: './tsconfig.json'` which needs full project analysis

## Special Considerations

- **Extension Context**: Be aware of browser extension contexts (background, content, popup, devtools)
- **Cross-Browser**: Ensure fixes work with webextension-polyfill patterns
- **State Management**: Consider Zustand store impacts
- **Testing**: Use `@src/test` utilities for any test-related changes
- **Icons**: Use Hugeicons, not lucide-react
- **Path Aliases**: Use `@src/*`, `@assets/*`, `@pages/*` aliases

# React 18 -> 19 Migration Instructions for LLM

Migrate the Nx workspace's React projects from 18 to 19. Run the codemods first, fix the rest by hand, typecheck and build after each project.

## Step 1: Codemods

```bash
npx codemod@latest react/19/migration-recipe
npx types-react-codemod@latest preset-19 ./PROJECT_PATH --yes
```

The first command handles API changes. The second runs the complete `@types/react` 19 preset non-interactively, including `useRef-required-initial`, `refobject-defaults`, and the other React 19 type transforms. Review the diffs because some transforms can produce false positives.

## Step 2: Removed APIs (fix by hand if codemod misses)

- `ReactDOM.render` / `hydrate` -> `createRoot` / `hydrateRoot` from `react-dom/client`. Note `hydrateRoot(container, element)` swaps the arg order vs `hydrate`.
- `ReactDOM.unmountComponentAtNode` -> keep the root from `createRoot` / `hydrateRoot` and call `root.unmount()`.
- `ReactDOM.findDOMNode` -> use refs.
- `propTypes` -> removed for ALL components (class and function); drop it, use TS types.
- `defaultProps` -> removed for FUNCTION components (use default params); still works on classes.
- Legacy string refs -> callback refs or `useRef`.
- Legacy Context: consumer `contextTypes` and provider `childContextTypes` / `getChildContext` -> `createContext`.
- `React.createFactory` -> replace factories with JSX.
- Module pattern factories that return an object with `render` -> convert them to regular function components that return JSX.
- `react-test-renderer/shallow` -> install and import `react-shallow-renderer`, or preferably migrate to `@testing-library/react`.
- `react-test-renderer` is deprecated -> migrate tests to `@testing-library/react`.

## Step 3: ref as prop

For function components, `forwardRef` is no longer needed because `ref` is available as a normal prop. Existing `forwardRef` calls still work but are deprecated. This behavior does not apply to class components: a ref passed to a class component still targets the component instance and is not available through `props`.

## Step 4: Types

`@types/react@19` moves the `JSX` namespace out of global scope into the `react` module (`React.JSX`); `useRef` needs an initial arg; implicit `children` is removed (declare it on props). The `scoped-jsx` codemod (part of `preset-19`) rewrites JSX type _usages_: it points `JSX.Element`, `JSX.IntrinsicElements`, and the like at the `react`-scoped namespace.

It does NOT rewrite global `JSX` _augmentations_. A custom element or web component typed with a global augmentation:

```ts
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'my-element': ...;
    }
  }
}
```

no longer merges into the JSX namespace selected by the project's `jsx` compiler option, so the element becomes a `TS2339` unknown-property error in every consuming `.tsx`. Re-target both the import and augmentation to the matching JSX runtime. For `jsx: "react-jsx"`:

```ts
import type {} from 'react/jsx-runtime';

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'my-element': ...;
    }
  }
}
```

Use `react/jsx-dev-runtime` for `jsx: "react-jsxdev"`, and `react` for classic `jsx: "react"` or `jsx: "preserve"` modes. Importing the same module being augmented ensures it is part of the program and avoids `TS2664: Invalid module name in augmentation`. Keep any existing `eslint-disable` comment on the `namespace` line.

## Validate

Run build and typecheck across the affected projects, then lint and test:

```bash
nx run PROJECT:build
nx affected -t build,typecheck,lint,test
```

Most React 19 breakages are type-level (the `JSX` namespace move, implicit `children`, ref types) and surface only at `typecheck`, not at `build` or `test`. A type change in a shared library often errors only in its consumers, so re-run until every project that depends on what you changed is green, not just the project you edited.

## Notes for LLM

- Codemods first (API + types), then manual.
- One project at a time; typecheck and build after each.
- A custom element or JSX augmentation may live in a non-React library that React code pulls in through a bare side-effect import (`import '@scope/ui';`). Fix it there; `typecheck` on the consumers points you to it.
- Confirm third-party libs support React 19 before bumping.

## References

- React 19 upgrade guide (the TypeScript section covers the `JSX`, `useRef`, and `ref` changes): <https://react.dev/blog/2024/04/25/react-19-upgrade-guide>
- `types-react-codemod` (what each codemod does, including `scoped-jsx`): <https://github.com/eps1lon/types-react-codemod>

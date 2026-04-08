// Stub for react/compiler-runtime (React Compiler hook — only needed with React 19 compiler output)
// For React 18, we provide a no-op implementation
import { useRef } from 'react'

// Must match the sentinel used by React Compiler output: Symbol.for (global registry), not Symbol()
const REACT_MEMO_CACHE_SENTINEL = Symbol.for('react.memo_cache_sentinel')

export function c(size: number): unknown[] {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ref = useRef<unknown[] | null>(null)
  if (ref.current === null || ref.current.length !== size) {
    ref.current = new Array(size).fill(REACT_MEMO_CACHE_SENTINEL)
  }
  return ref.current
}

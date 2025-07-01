import { def, isFunction, UIID } from '../helper';
import type { ObserveFn } from '../types';

export const __EFFECTS: ObserveFn<unknown>[] & { [UIID]: boolean } = def(
  [],
  UIID,
  false
) as ObserveFn<unknown>[] & { [UIID]: boolean };

/**
 * Create a reactive effect.
 * @param fn A function which may read the value of a `signal`.
 *
 * @remarks
 * The given function will be called whenever any `signal` it reads is updated.
 * It is useful for creating side effects that depend on the values of `signal`s.
 */
export const createEffect = <T>(fn: ObserveFn<T>) => {
  if (__DEV__ && !isFunction(fn)) {
    throw new TypeError(
      'First parameter of `' + createEffect.name + '()` must be a function.'
    );
  }

  // Must be called inside the component
  if (__DEV__ && !__EFFECTS[UIID]) {
    throw new Error(
      '`' + createEffect.name + '()` must be called inside the component.'
    );
  }

  __EFFECTS.push(fn);
};

/**
 * Create a memoized value.
 * @param fn A function which takes the previous value as an argument.
 * @param initialValue The initial value of the memoized value.
 *
 * @remarks
 * The given function will be called whenever any `signal` it reads is updated.
 * It is useful for creating memoized values that depend on the values of `signal`s.
 */
export const createMemo = <T>(fn: (prev: T) => T, initialValue: T) => {
  if (__DEV__ && !isFunction(fn)) {
    throw new Error(
      'First parameter of `' + createMemo.name + '()` must be a function.'
    );
  }

  let oldVal: T = initialValue;
  return () => (oldVal = fn(oldVal));
};

/**
 * Create a reactive reference to an element.
 * @returns A function that takes an element to store and returns the stored element.
 *          If the argument is undefined, the function returns the stored element.
 * @remarks
 * The reference will be updated whenever the element is updated.
 * It is useful for creating references to elements in the DOM.
 */
export const createRef = <T extends HTMLElement | SVGElement>() => {
  let elem: T;

  return (element: T) => {
    if (element === undefined) {
      return elem;
    }

    return (elem = element);
  };
};

// Re-export other hooks
export { createSignal, untrackSignal, withoutBatch } from '../signal';

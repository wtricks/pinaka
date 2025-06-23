import {
  def,
  falsy,
  isBool,
  isEqual,
  isFunction,
  scheduler,
  values,
} from '../helper';
import type {
  Cleanup,
  Getter,
  ObserveFn,
  ObserveResult,
  Setter,
  Signal,
  SignalDep,
} from '../types';

let __SIGNAL_COUNT = 0;
let __TRACK_SUBS: { [ID: number]: SignalDep } | null = null;

/**
 * Create a `signal` by passing the initial value of the signal.
 * @param initialValue The initial value of the `signal`.
 * @param equals Either a boolean or a function which returns a boolean value.
 *               If set to `false` or evaluates to `false`, it will notify all its subscribers on any value change.
 * @returns An array containing two functions: a getter and a setter for the signal.
 */
export const createSignal = <T>(
  initialValue: T,
  equals: boolean | ((prev: T, curr: T) => boolean) = isEqual
): Signal<T> => {
  if (__DEV__ && !isBool(equals) && !isFunction(equals)) {
    throw new TypeError(
      'Second parameter of `' +
        createSignal.name +
        '()` must be boolean value or a function which evaluate to boolean value.'
    );
  }

  const DEP: SignalDep = def(
    def({}, 1, 2, true),
    0,
    __SIGNAL_COUNT++
  ) as SignalDep;

  const isValuesEqual: (prev: T, curr: T) => boolean = isBool(equals)
    ? falsy
    : equals;

  const getter: Getter<T> = () => {
    if (__TRACK_SUBS) {
      __TRACK_SUBS[DEP[0]] = DEP;
    }

    return initialValue;
  };

  const setter: Setter<T> = val => {
    const newValue = isFunction(val) ? val(initialValue) : val;
    if (isValuesEqual(initialValue, newValue)) {
      return;
    }

    initialValue = newValue;
    batchUpdate(DEP);
  };

  return [getter, setter];
};

/**
 * Observe a `signal` inside a function and register the provided function
 * to run whenever the `signal` changes.
 * @param fn The function representing the signal being observed.
 * @param dummyFn An optional function to trigger the tracking of the `signal`.
 *                When provided, the changes are reacted based on the signal used inside 'dummyFn',
 *                otherwise, it reacts on the basis of 'signalUpdate' itself.
 * @returns The result of the `dummyFn` or `signalUpdate` function.
 */
export const observeSignal = <T>(
  fn: ObserveFn<T>,
  dummyFn?: ObserveFn<T>
): ObserveResult<T> => {
  if (__DEV__ && !isFunction(fn)) {
    throw new Error(
      'Second parameter of `' + observeSignal.name + '()` must be a function.'
    );
  }

  if (__DEV__ && dummyFn !== undefined && !isFunction(fn)) {
    throw new Error(
      'Third parameter of `' +
        observeSignal.name +
        '()` is optional, but if used it must be a function.'
    );
  }

  const CLEANUP_FN: Cleanup[] = []; // hold cleanup functions

  __TRACK_SUBS = {}; // begin tracking
  const value = (dummyFn || fn)();

  let DEP: SignalDep;
  for (DEP of values(__TRACK_SUBS)) {
    DEP[DEP[1]] = fn;
    CLEANUP_FN.push([DEP, DEP[1]++]);
  }

  __TRACK_SUBS = null; // completed tracking

  // we don't need to create any function if no signal found.
  if (!CLEANUP_FN.length) {
    return [value, falsy];
  }

  const cleanupFn = () => {
    let arr;

    for (arr of CLEANUP_FN) {
      delete arr[0][arr[1]];
    }
  };

  return [value, cleanupFn];
};

/**
 * Get the values of `signals` without adding them as `subscriber`.
 * @param signalGetter The getter function of any `signal`.
 * @returns The value obtained from the `signal` without tracking it.
 *
 * @remarks
 * This function temporarily disables tracking of `signals` to obtain their values without adding them as `subscriber`.
 * It can be used when you want to access a `signal`'s value without triggering any side effects.
 */
export const untrackSignal = <T>(signalGetter: Getter<T>): T => {
  if (__DEV__ && !isFunction(signalGetter)) {
    throw new Error(
      'First parameter of `' + untrackSignal.name + '()` must be a function.'
    );
  }

  if (!__TRACK_SUBS) {
    return signalGetter();
  }

  // Disable tracking scope
  const TEMP_HOLDER = __TRACK_SUBS;

  __TRACK_SUBS = null;
  const value = signalGetter();
  __TRACK_SUBS = TEMP_HOLDER;

  return value;
};

/**
 * Run a function after completing all microTasks of current queue.
 */
const __PROMISE = scheduler();

const __DEEP_FLUSH = 3,
  __HOLDER: { [key: number]: SignalDep } = {};

let __IS_RAN1: { [key: number]: boolean } = {},
  __IS_RAN2: { [key: number]: boolean } = {},
  __PENDING = false;

let batchUpdate: (arg0: SignalDep) => void;

/**
 * Batch updates
 * @param DEP
 */
const batchDep = (batchUpdate = (DEP: SignalDep) => {
  // Avoid adding same subscribers again.
  if (__IS_RAN1[DEP[0]]) {
    return;
  }

  // record entry of subscribers
  __IS_RAN1[DEP[0]] = !0;

  // hold subscribers untill, 'flushUpdates' will gonna run.
  __HOLDER[DEP[0]] = DEP;

  if (!__PENDING) {
    __PENDING = true;
    __PROMISE(flushUpdates);
  }
});

/**
 * This function is usefull when we want to notify subscribes without batch process.
 */
const flushEffectsNow = (DEP: SignalDep) => {
  // Avoid adding same subscribers again.
  if (__IS_RAN1[DEP[0]]) {
    return;
  }

  __IS_RAN1[DEP[0]] = !0;
  helperFn(DEP);
};

/**
 * main function which'll be used to flush updates.
 */
const flushUpdates = () => {
  // this is usefull, when we want to control deep function calls.
  // ex. signal change -> subscribers runs -> may change other signals -> then so on.
  let key,
    canFlushMore = __DEEP_FLUSH;

  while (canFlushMore-- > 0) {
    for (key in __HOLDER) {
      helperFn(__HOLDER[key]);
      delete __HOLDER[key];
    }
  }

  // Cleanup everthing as default
  __IS_RAN1 = {};
  __IS_RAN2 = {};
  __PENDING = false;
};

/**
 * Run each subscribers function
 * @param DEP
 */
const helperFn = (DEP: SignalDep) => {
  let key: PropertyKey;

  for (key in DEP) {
    if (__IS_RAN2[key]) {
      continue;
    }

    __IS_RAN2[key] = true;
    DEP[key]();
  }
};

/**
 * Change `signals` value without running the batch process.
 * @param fn A function which may change `signals`.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const withoutBatch = (fn: Function): void => {
  if (__DEV__ && !isFunction(fn)) {
    throw new TypeError(
      'First parameter of `' + withoutBatch.name + '()` must be a function.'
    );
  }

  batchUpdate = flushEffectsNow;
  fn(); // call user-defined function
  batchUpdate = batchDep;

  if (!__PENDING) {
    __IS_RAN2 = {};
    __IS_RAN1 = {};
  }
};

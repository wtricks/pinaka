// Used to hold subscribers
export type SignalDep = {
  0: number;
  1: number; // subscribers unique id
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
} & { [key: number]: Function };

// Signals getter function
export type Getter<T> = () => T;

// Signals setter function
export type Setter<T> = (val: T | ((val: T) => T)) => void;

// Signals getter and setter function
export type Signal<T> = [Getter<T>, Setter<T>];

// Observer functions
export type ObserveFn<T> = () => T;

// Observer result
export type ObserveResult<T> = [val: T, cleanup: () => void];

// Cleanup function
export type Cleanup = [s: SignalDep, id: number];

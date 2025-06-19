import { expect, it, describe, vi } from 'vitest';

import { createSignal, observeSignal, untrackSignal, withoutBatch } from '.';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const tick = async (fn: Function) => {
  return new Promise(resolve =>
    setTimeout(() => {
      resolve(true);
      fn();
    }, 0)
  );
};

describe('createSignal', () => {
  it('should create a signal with initial value', () => {
    const initialValue = 42;
    const [getter] = createSignal(initialValue);
    expect(getter()).toBe(initialValue);
  });

  it('should update signal value', () => {
    const initialValue = 42;
    const [getter, setter] = createSignal(initialValue);

    setter(24);
    expect(getter()).toBe(24);
  });

  it('should notify subscribers when value changes', async () => {
    const initialValue = 42;
    const newValue = 24;
    const [getter, setter] = createSignal(initialValue);
    const subscriber = vi.fn(() => getter());

    observeSignal(subscriber);
    setter(newValue);

    await tick(() => {
      expect(subscriber).toBeCalledTimes(2);
    });
  });

  it('should notify subscribers only once in a batch', async () => {
    const initialValue = 42;
    const [getter1, setter1] = createSignal(initialValue);
    const [getter2, setter2] = createSignal(initialValue);

    // have two dependencies
    const subscriber = vi.fn(() => getter1() + getter2());

    observeSignal(subscriber);

    // Change signals as many time
    setter1(30);
    setter2(1000);
    setter1(10);
    setter1(50);
    setter2(1020);

    await tick(() => {
      expect(subscriber).toBeCalledTimes(2);
    });
  });

  it('should not notify subscribers when changed value is same as before', async () => {
    const initialValue = 42;
    const [getter, setter] = createSignal(initialValue);
    const subscriber = vi.fn(() => getter());

    observeSignal(subscriber);

    // Change signals as many time
    setter(42);
    setter(42);
    setter(42);

    await tick(() => {
      expect(subscriber).toBeCalledTimes(1);
    });
  });

  it('should update signal value when second argument (custom equaly checker) is false or evaluate to false (even new value is same as before)', async () => {
    const initialValue = 40;
    const [getter, setter] = createSignal(
      initialValue,
      false /** or. (prev, curr) => false*/
    );
    const subscriber = vi.fn(() => getter());
    observeSignal(subscriber);

    // as our rule, subscribers runs only once per batch.
    setter(40);
    setter(40);
    setter(40);

    await tick(() => {
      expect(subscriber).toBeCalledTimes(2);
    });
  });
});

describe('observeSignal', () => {
  it('should call the provided function when signal changes', async () => {
    const [getter, setter] = createSignal(0);
    const observer = vi.fn(() => getter());

    observeSignal(observer);

    setter(42);

    await tick(() => {
      expect(observer).toBeCalledTimes(2);
    });
  });

  it('should track changes based on dummy function (1)', async () => {
    const [getter, setter] = createSignal(0);
    const [getter1] = createSignal(0);

    const observer = vi.fn(() => getter());
    const observer2 = vi.fn(() => getter1());

    observeSignal(observer, observer2);

    setter(42);
    setter(120);

    await tick(() => {
      expect(observer).toBeCalledTimes(0);
      expect(observer2).toBeCalledTimes(1);
    });
  });

  it('should track changes based on dummy function (2)', async () => {
    const [getter] = createSignal(0);
    const [getter1, setter2] = createSignal(0);

    const observer = vi.fn(() => getter());
    const observer2 = vi.fn(() => getter1());

    observeSignal(observer, observer2);

    setter2(42);

    await tick(() => {
      expect(observer).toBeCalledTimes(1);
      expect(observer2).toBeCalledTimes(1);
    });
  });
});

describe('untrackSignal', () => {
  it('should get signal value without tracking', async () => {
    const initialValue = 42;
    const [getter, setter] = createSignal(initialValue);
    const subscriber = vi.fn(() => untrackSignal(getter));

    observeSignal(subscriber);
    setter(45);

    await tick(() => {
      expect(subscriber).toBeCalledTimes(1);
    });
  });
});

describe('withoutBatch', () => {
  it('should change signal value without batching', async () => {
    const [getter, setter] = createSignal(0);
    const observer = vi.fn(() => getter());

    observeSignal(observer);

    withoutBatch(() => {
      setter(30);
      setter(40);
    });

    expect(observer).toBeCalledTimes(2);

    setter(100);
    await tick(() => expect(observer).toBeCalledTimes(3));
  });
});

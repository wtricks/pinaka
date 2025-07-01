import {
  __DESTROY__,
  __SPACE__,
  __UPDATE__,
  emptyObject,
  isArray,
  isFunction,
  runAll,
  UIID,
  VOID0,
} from '../helper';
import { __EFFECTS } from '../hooks';
import { observeSignal } from '../signal';
import type {
  Component,
  ErrorStack,
  ObserveFn,
  ReturnObject,
  TextNode,
  VNode,
} from '../types';
import {
  createTextNode,
  destroyNodes,
  insertElement,
  removeElement,
} from './dom';
import { buildPropsForComponent } from './props';
import { generateDOMViaVNodes } from './vnode';

export const createComponent = <T extends object, P extends object>(
  parent: HTMLElement | SVGElement,
  vnode: VNode<T, P>['c'],
  space?: TextNode,
  dep?: ObserveFn<void>[],
  stack?: ErrorStack
): void | ReturnObject => {
  const textnode = /** A empty text Node */ createTextNode();
  insertElement(
    textnode as unknown as HTMLElement,
    parent,
    space as unknown as Element
  );

  let currentComponentStack: ErrorStack;
  if (__DEV__) {
    currentComponentStack = {
      name: (vnode as { t: { name: string } }).t.name || 'Anonymous',
      parent: stack,
      children: [],
    };

    stack!.children.push(currentComponentStack);
    stack = currentComponentStack;
  }

  // If it is build-in component
  if ((vnode as { [UIID]: number })[UIID] == 1) {
    if (__DEV__) {
      try {
        return (vnode as { t: typeof createComponent }).t(
          parent,
          vnode,
          space,
          dep,
          stack as ErrorStack
        );
      } catch (error) {
        console.log(error, currentComponentStack!);
        return;
      }
    }

    return (vnode as { t: typeof createComponent }).t(
      parent,
      vnode,
      space,
      dep,
      stack
    );
  }

  const store: Record<string, unknown> = {},
    currentComponentEffects: ObserveFn<void>[] = [],
    childHolder: [TextNode[], ObserveFn<void>[]] = [[], []];

  if (__DEV__) {
    if (!isFunction((vnode as { t: unknown }).t)) {
      throw new TypeError(
        "Invalid component type, Expected a type of 'function'."
      );
    }

    try {
      buildPropsForComponent(
        store,
        (vnode as { p: Record<string, unknown> }).p || emptyObject
      );
      store.children = (vnode as { c: unknown }).c;
      const node: VNode<object, object> = (
        vnode as { t: Component<object, object> }
      ).t(
        ((vnode as VNode<object, object>).t as { AII: boolean }).AII
          ? (vnode as VNode<object, object>).p
          : store
      );

      if (!node || (isArray(node) && node.length == 0)) {
        throw new RangeError('Component must have atleast one child node.');
      }

      generateDOMViaVNodes(
        parent,
        node,
        space,
        childHolder[1],
        childHolder[0],
        currentComponentStack!
      );
    } catch (error) {
      console.log(error, currentComponentStack!);
    }
  } else {
    buildPropsForComponent(
      store,
      (vnode as { p: Record<string, unknown> }).p || emptyObject
    );
    store.children = (vnode as { c: unknown }).c;
    generateDOMViaVNodes(
      parent,
      (vnode as { t: Component<object, object> }).t(
        ((vnode as VNode<object, object>).t as { AII: boolean }).AII
          ? (vnode as VNode<object, object>).p
          : store
      ),
      space,
      childHolder[1],
      childHolder[0]
    );
  }

  // resolve `watchers`
  let index = 0;
  for (const effect of __EFFECTS) {
    const current = index++;
    observeSignal(
      () => {
        currentComponentEffects[current]?.();
        (currentComponentEffects as Record<number, unknown>)[current] =
          effect();

        if (__DEV__) {
          try {
            if (
              currentComponentEffects[current] &&
              !isFunction(currentComponentEffects[current])
            ) {
              throw new TypeError(
                'Function used in `createEffect()` can return only function or void.'
              );
            }
          } catch (error) {
            console.log(error, currentComponentStack!);
          }
        }
      },
      VOID0,
      childHolder[1]
    );
  }

  // make it empty, so it can hold effects for other components.
  __EFFECTS.length = 0;

  return createReturnObject(
    parent,
    textnode as unknown as TextNode,
    childHolder,
    currentComponentEffects
  );
};

export const createReturnObject = (
  parent: HTMLElement | SVGElement,
  space: TextNode,
  holder: [TextNode[], ObserveFn<void>[]],
  dep?: ObserveFn<void>[]
): ReturnObject => {
  return {
    [__UPDATE__]() {
      //
    },
    [__SPACE__]() {
      const lastElement = holder[0].slice(-1)[0];
      if (!lastElement) {
        return space;
      }

      return __SPACE__ in lastElement
        ? (lastElement as unknown as { [__SPACE__]: () => void })[__SPACE__]()
        : lastElement;
    },
    [__DESTROY__](remove: boolean) {
      if (remove) {
        removeElement(space as unknown as Element, parent);
      }

      if (dep) {
        runAll(dep);
      }

      let element;
      for (element of holder) {
        // @ts-expect-error TODO: fix this
        destroyNodes(parent, element);
      }
    },
  };
};

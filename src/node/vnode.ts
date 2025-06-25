import {
  __CASE__,
  __COMPONENT_PREFIX,
  __DESTROY__,
  __SPACE__,
  def,
  emptyArray,
  emptyObject,
  isArray,
  isFunction,
  isObject,
  isString,
  UIID,
  VOID0,
} from '../helper';
import type {
  Component,
  ErrorStack,
  ObserveFn,
  TextNode,
  VNode,
  VNodeCase,
} from '../types';
import {
  createElement,
  createExpression,
  createTextNode,
  insertElement,
} from './dom';

const __GLOBAL_COMPONENTS: Record<string, Component<object, object>> = {};

/**
 * Registers a component globally with Pinaka, so that it can be used in template literals.
 * @param name The name of the component. This is the name you will use in your template literals.
 * @param component The component that you want to register.
 */
export const registerGlobalComponent = <T extends object, P extends object>(
  name: string,
  component: Component<T, P>
) => {
  (component as unknown as { [UIID]: boolean })[UIID] = true;
  __GLOBAL_COMPONENTS[name] = component as unknown as Component<object, object>;
};

/**
 * Retrieves a globally registered component by name.
 * @param name The name of the component to retrieve.
 * @returns The component that was registered with the given name.
 * @throws An error if a component with the given name is not registered.
 */
export const getGlobalComponent = (name: string) => {
  if (__DEV__ && !__GLOBAL_COMPONENTS[name]) {
    throw new Error('Component `<pinaka:' + name + '>` is not registered.');
  }

  return __GLOBAL_COMPONENTS[name];
};

/**
 * Creates a virtual node (VNode) with the specified type, properties, and children.
 *
 * @typeparam T - The type of the object for the node type.
 * @typeparam P - The type of the object for the node properties.
 * @param type - The type of the node, either a string or a component function.
 * @param props - Optional properties or children for the node. If not an object or contains UIID, it is treated as children.
 * @param children - Optional children for the node. Defaults to an empty array if not provided.
 * @returns A VNode object representing the virtual node.
 * @throws {TypeError} If in development mode and type is not a string or function.
 * @throws {TypeError} If in development mode and ref attribute is present but not a function.
 */
export const createNode = <T extends object, P extends object>(
  type: VNode<T, P>['t'],
  props?: VNode<T, P>['p'] | VNode<T, P>['c'],
  children?: VNode<T, P>['c']
): VNode<T, P> => {
  if (__DEV__ && !isString(type) && !isFunction(type)) {
    throw new TypeError(
      'The first parameter of `' +
        createNode.name +
        '()` must be a string or a function.'
    );
  }

  if (!isObject(props) || UIID in (props as VNode<T, P>['p'])) {
    children = props as VNode<T, P>['c'];
    props = emptyObject as unknown as VNode<T, P>['p'];
  } else if (__CASE__ in (props as VNode<T, P>['p'])) {
    def(
      props as VNode<T, P>['p'],
      __CASE__,
      (props as unknown as { [__CASE__]: VNodeCase })[__CASE__]
    );
  }

  if (!children) {
    children = emptyArray as unknown as VNode<T, P>['c'];
  }

  if (
    __DEV__ &&
    'ref' in (props as VNode<T, P>['p']) &&
    !isFunction((props as unknown as { ref: unknown }).ref)
  ) {
    throw new TypeError('The `ref` attribute must be a function.');
  }

  const node = {
    t: type,
    p: props as VNode<T, P>['p'],
    c: children,
    [UIID]: 0,
  };

  if (isString(type) && type.startsWith(__COMPONENT_PREFIX)) {
    node.t = getGlobalComponent(
      type.slice(__COMPONENT_PREFIX.length)
    ) as unknown as VNode<T, P>['t'];
  } else if (isFunction(type) && UIID in type) {
    node[UIID] = 1;
  }

  return node as VNode<T, P>;
};

export const generateDOMViaVNodes = <T extends object, P extends object>(
  parent: HTMLElement | SVGElement,
  vnode: VNode<T, P>['c'],
  space?: TextNode,
  dep?: ObserveFn<void>[],
  holder?: TextNode[],
  stack?: ErrorStack
): TextNode | void => {
  if (!vnode) {
    return;
  }

  let currentElement: TextNode | void | HTMLElement | SVGElement = VOID0;

  if (isArray(vnode)) {
    let vnodeSingle: VNode | void;
    let nextElement: TextNode | void;

    for (vnodeSingle of vnode) {
      nextElement = generateDOMViaVNodes(
        parent,
        vnodeSingle,
        space,
        dep,
        holder,
        stack
      );
      space = (
        nextElement
          ? __SPACE__ in nextElement
            ? (nextElement as unknown as { [__SPACE__]: () => void })[
                __SPACE__
              ]()
            : nextElement
          : VOID0
      ) as TextNode;
    }

    return space;
  }

  if (isFunction(vnode)) {
    // for dynamic expressions
    currentElement = createExpression(vnode as ObserveFn<string>, dep!);
  } else if (!(UIID in (vnode as unknown as Component<object, object>))) {
    // for static text
    currentElement = createTextNode(vnode + '') as TextNode;
  } else if (isFunction((vnode as VNode<object, object>).t)) {
    // for components
  } else {
    currentElement = createElement(
      (vnode as VNode<object, object>).t as string
    );
    generateDOMViaVNodes(
      currentElement as HTMLElement,
      (vnode as VNode<object, object>).c,
      undefined,
      dep,
      undefined,
      stack
    );
  }

  if (holder) {
    holder.push(currentElement as TextNode);
  } else if (
    __SPACE__ in (currentElement as unknown as { [__DESTROY__]: () => void })
  ) {
    dep!.push(
      (currentElement as unknown as { [__DESTROY__]: () => void })[__DESTROY__]
    );
  }

  if (
    !(__SPACE__ in (currentElement as unknown as { [__DESTROY__]: () => void }))
  ) {
    insertElement(
      parent,
      currentElement as HTMLElement,
      space as unknown as Element
    );
  }

  return space ? (currentElement as TextNode) : VOID0;
};

import { __DESTROY__, isFunction, runAll } from '../helper';
import { observeSignal } from '../signal';
import type { ObserveFn, TextNode } from '../types';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';

/**
 * Checks if the given node is an SVG element.
 * @param node The node to check.
 * @returns True if the node is an SVG element, false otherwise.
 */
export const isSVG = (node: Element | string) => {
  return node == 'svg' || node instanceof SVGElement;
};

/**
 * Creates a new element with the given tag name. If `isSVG` is truthy, the element
 * is created in the SVG namespace.
 * @param tag The tag name of the element to create.
 * @param isSVG Creates the element in the SVG namespace if truthy.
 * @returns The created element.
 */
export const createElement = (tag: string) => {
  return isSVG(tag)
    ? document.createElementNS(SVG_NAMESPACE, tag)
    : document.createElement(tag);
};

/**
 * Sets an attribute on the given element. If the value is a function, it calls the
 * function and sets the attribute to the result. If the value is null or undefined,
 * it removes the attribute from the element. If the attribute name starts with
 * 'xlink:', it sets the attribute in the xlink namespace.
 *
 * @param element The element to set the attribute on.
 * @param name The name of the attribute to set.
 * @param value The value of the attribute to set. If null or undefined, the
 * attribute is removed from the element.
 */

export const setAttribute = (
  element: Element,
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  value?: string | boolean | Function | number | null
) => {
  if (!value) {
    element.removeAttribute(name);
    return;
  }

  value = isFunction(value) ? value + '' : value;

  if (name.startsWith('xlink:')) {
    element.setAttributeNS(XLINK_NAMESPACE, name, value as string);
  } else if (name in element) {
    (element as unknown as Record<string, unknown>)[name] = value;
  } else {
    element.setAttribute(name, value as string);
  }
};

/**
 * Adds an event listener to the given element. Returns a function to remove the
 * event listener.
 *
 * @param element The element to add the event listener to.
 * @param name The name of the event to listen to.
 * @param handler The event handler function to call when the event is triggered.
 * @param options The options to pass to `addEventListener`. If not provided, the
 * event handler is added without capture and passive.
 * @returns A function to remove the event listener.
 */
export const setListener = (
  element: Element,
  name: string,
  handler: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions
) => {
  element.addEventListener(name, handler, options);
  return () => element.removeEventListener(name, handler, options);
};

/**
 * Inserts the given element into the given parent element before the given
 * sibling element, if any. If the sibling element is not provided, the element
 * is appended to the end of the parent element.
 *
 * @param element The element to insert.
 * @param parent The parent element to insert into.
 * @param before The sibling element to insert before. If not provided, the
 * element is appended to the end of the parent element.
 */
export const insertElement = (
  element: Element,
  parent: Element,
  before?: Element
) => {
  if (before) {
    parent.insertBefore(element, before.nextSibling);
  } else {
    parent.appendChild(element);
  }
};

/**
 * Removes the given element from its parent element.
 *
 * @param element The element to remove.
 */
export const removeElement = (element: Element, parent?: Element) => {
  (parent || element.parentNode)?.removeChild(element);
};

/**
 * Creates a new text node with the given text.
 *
 * @param text The text to add to the text node. If not provided, an empty text
 * node is created.
 * @returns The created text node.
 */
export const createTextNode = (text: string = '') => {
  return document.createTextNode(text);
};

/**
 * Creates a new text node that evaluates the given expression and sets the text
 * content of the node to the result. The expression is evaluated whenever any
 * signal it depends on is updated.
 *
 * @param expression The expression to evaluate. If null or undefined, an empty
 * text node is created.
 * @param dep An array of dependents that are updated whenever the expression is
 * evaluated.
 * @returns The created text node.
 */
export const createExpression = (
  expression: ObserveFn<string>,
  dep: ObserveFn<void>[]
): TextNode => {
  // eslint-disable-next-line prefer-const
  let space = createTextNode('p'),
    oldvalue: string;

  observeSignal(
    () => {
      oldvalue = expression();
      if (space.nodeValue != oldvalue) {
        space.data = oldvalue;
      }
    },
    undefined,
    dep
  );

  return space as TextNode;
};

/**
 * Destroys the nodes and runs the associated cleanup functions stored in the
 * given holder array. The holder array is also cleared after calling this
 * function.
 *
 * @param parent The parent element of the nodes to destroy.
 * @param holder The holder array containing the nodes to destroy and their
 * associated cleanup functions.
 */
export const destroyNodes = (
  parent: Element,
  holder: [TextNode[], ObserveFn<void>[]]
) => {
  runAll(holder[1]);

  let element;
  for (element of holder[0]) {
    if (__DESTROY__ in element) {
      (element as unknown as { [__DESTROY__]: (remove: boolean) => void })[
        __DESTROY__
      ](true);
    } else {
      removeElement(element as unknown as Element, parent);
    }
  }

  holder[0].length = holder[1].length = 0;
};

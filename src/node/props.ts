import {
  emptyArray,
  emptyObject,
  isArray,
  isFunction,
  isObject,
  isString,
} from '../helper';
import { observeSignal } from '../signal';
import type { ClassName, Directive, ObserveFn, StyleProp } from '../types';
import { setAttribute, setListener } from './dom';

/**
 * Binds properties to a given HTML or SVG element based on the provided props object.
 *
 * This function iterates over each key in the `props` object and applies them to the `element`.
 * It handles several special cases:
 * - Skips the `use` property.
 * - Calls the `ref` function if present to obtain a reference to the element.
 * - Resolves `class` and `style` properties using specific resolution functions.
 * - Adds event listeners for keys starting with `on` followed by an uppercase letter.
 * - Observes signal changes for reactive attributes and updates them accordingly.
 * - Sets other properties as attributes on the element.
 *
 * The `dep` array is used to track dependencies for reactive properties and event listeners.
 *
 * @param element The HTML or SVG element to which the properties will be applied.
 * @param props A record of properties to set on the element.
 * @param dep An array of dependency functions to observe for changes.
 * @returns An array of directives from the `use` property, if any, or an empty array.
 */
export const buildPropsForElement = (
  element: HTMLElement | SVGElement,
  props: Record<string, unknown>,
  dep: ObserveFn<void>[]
) => {
  for (const key in props) {
    if (key == 'use') {
      continue;
    } else if (key == 'ref') {
      (props as { ref: (element: HTMLElement | SVGElement) => void }).ref(
        element
      );
    } else if (key == 'class') {
      resolveClassProp(element, (props as { class: ClassName })[key], dep);
    } else if (key == 'style') {
      resolveStyleProp(
        element.style,
        (props as { style: StyleProp })[key],
        dep
      );
    } else if (/^on[A-Z]/.test(key)) {
      dep.push(
        setListener(
          element,
          key.slice(2),
          (props as { [key: string]: (event: Event) => void })[key]
        )
      );
    } else if (isFunction(props[key])) {
      // Can be a reactive attribute
      observeSignal(
        () =>
          setAttribute(element, key, (props as { [key: string]: string })[key]),
        undefined,
        dep
      );
    } else {
      setAttribute(element, key, (props as { [key: string]: string })[key]);
    }
  }

  return props.use
    ? isArray(props.use)
      ? props.use
      : [props.use]
    : (emptyArray as unknown as Directive<unknown, HTMLElement>[]);
};

/**
 * Resolves a style property given to an element.
 *
 * The `value` parameter can be either a string or an object. If `value` is a
 * string, it is set as the `cssText` property of the element's style object.
 * If `value` is an object, each of its properties is set as a CSS property
 * of the element's style object.
 *
 * If `value` is a function, it is called when the style property is resolved,
 * and its return value is used instead.
 *
 * @param elementStyle The style object of the element.
 * @param value The value to resolve. Can be either a string, an object, or
 * a function.
 * @param dep The dependency array to add the resolved style property to.
 */
export const resolveStyleProp = (
  elementStyle: CSSStyleDeclaration,
  value: StyleProp | ObserveFn<StyleProp>,
  dep: ObserveFn<void>[]
) => {
  let oldvalue: StyleProp;

  observeSignal(
    () => {
      const styleRes = isFunction(value) ? value() : value;

      if (__DEV__ && !isString(styleRes) && !isObject(styleRes)) {
        throw new TypeError(
          `Expected a object or string, but got ${typeof styleRes}`
        );
      }

      if (isString(styleRes)) {
        oldvalue = emptyObject as unknown as StyleProp;
        elementStyle.cssText = styleRes;
      } else if (isObject(styleRes)) {
        for (const key in styleRes as Record<string, unknown>) {
          delete (oldvalue as unknown as Record<string, unknown>)[key];
          elementStyle.setProperty(
            key,
            (styleRes as unknown as Record<string, string>)[key]
          );
        }
      }

      for (const key in oldvalue as Record<string, unknown>) {
        (elementStyle as unknown as Record<string, unknown>)[key] = '';
      }

      oldvalue = styleRes as unknown as StyleProp;
    },
    undefined,
    dep
  );
};

/**
 * Resolves and sets the class attribute of a given element based on the provided value.
 * If the value is a function, it evaluates the function to get the class names.
 * Supports string, array, or object formats for class names.
 * Observes changes in the provided signals and updates the class attribute accordingly.
 *
 * @param element - The HTML or SVG element to set the class attribute on.
 * @param value - The class name(s) as a string, array, or object, or a function returning them.
 * @param dep - An array of dependencies that trigger re-evaluation of the class names when changed.
 */
export const resolveClassProp = (
  element: HTMLElement | SVGElement,
  value: ClassName | ObserveFn<ClassName>,
  dep: ObserveFn<void>[]
) => {
  observeSignal(
    () => {
      const classNameStr = isFunction(value) ? value() : value;
      const classNameArr = isArray(classNameStr)
        ? classNameStr
        : isString(classNameStr)
          ? [classNameStr]
          : [];

      if (isObject(classNameStr) && !isArray(classNameStr)) {
        for (const className in classNameStr as Record<string, unknown>) {
          if ((classNameStr as Record<string, unknown>)[className]) {
            classNameArr.push(className);
          }
        }
      }

      const className = classNameArr.join(' ');
      setAttribute(element, className ? 'className' : 'class', className);
    },
    undefined,
    dep
  );
};

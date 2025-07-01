import type { __DESTROY__, __SPACE__, __UPDATE__, UIID } from '../helper';
import type { ObserveFn } from './signal';

export type Component<T extends object, P extends object = object> = (
  props: P
) => VNode<T, P> & { [UIID]: true };

export type VNode<T extends object = object, P extends object = object> = {
  t: string | Component<T, P> | { AII: boolean }; // 'AII' means no observe signals in props for component
  p: P;
  c:
    | VNode
    | VNode[]
    | Component<object, object>
    | ObserveFn<string | boolean | number>
    | string
    | number
    | boolean;
  [UIID]: 0 | 1;
};

export type VNodeCase = boolean | ObserveFn<boolean>;

export type TextNode = Text & {
  [__SPACE__]: () => void;
  [__UPDATE__]: (space: TextNode) => TextNode;
  [__DESTROY__]: (remove: boolean) => void;
};

export type ErrorStack = {
  children: ErrorStack[];
  parent?: ErrorStack;
  name: string;
};

export type ClassName = string | string[] | Record<string, boolean>;

export type StyleProp = string | Record<string, string | number>;

export type Directive<V, T extends HTMLElement> = [
  fn: string | DirectiveFn<V, T>,
  value: unknown,
  args: string[],
];

export interface DirectiveFn<V, T extends HTMLElement | SVGElement> {
  (element: T, value: V, ...args: string[]): DirectiveResult<V>;
}

export type DirectiveResult<V> = {
  update: (newvalue: V) => void;
  destroy: (element: HTMLElement | SVGElement) => void;
};

export type ReturnObject = {
  [__UPDATE__]: () => void;
  [__SPACE__]: () => void;
  [__DESTROY__]: (remove: boolean) => void;
};

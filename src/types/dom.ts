import type { __DESTROY__, __SPACE__, __UPDATE__, UIID } from '../helper';
import type { ObserveFn } from './signal';

export type Component<T extends object, P extends object = object> = (
  props: T
) => VNode<T, P> & { [UIID]: true };

export type VNode<T extends object = object, P extends object = object> = {
  t: string | Component<T, P>;
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
  parent: ErrorStack;
  name: string;
};

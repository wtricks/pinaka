import type { UIID } from '../helper';
import type { ObserveFn } from './signal';

export type Component<T extends object, P extends object = object> = (
  props: T
) => VNode<T, P> & { [UIID]: true };

export type VNode<T extends object = object, P extends object = object> = {
  t: string | Component<T, P>;
  p: P;
  c: VNode | VNode[] | string | number | boolean;
  [UIID]: 0 | 1;
};

export type VNodeCase = boolean | ObserveFn<boolean>;

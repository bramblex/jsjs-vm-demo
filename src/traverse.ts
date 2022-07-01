import { Node } from "estree";

const isNode = (target: any): target is Node =>
  target && typeof target.type === 'string';

const isNodeArray = (target: any): target is Node[] =>
  Array.isArray(target) && target[0] && isNode(target[0]);

const isChildNode = (target: any): target is Node | Node[] =>
  isNodeArray(target) || isNode(target);

const getChildrenKeys = (node: Node): (keyof Node)[] =>
  (Object.keys(node) as (keyof Node)[]).filter(key => isChildNode(node[key]));

const traverseChildren = <T>(func: (node: Node, ctx: T) => Node) => (node: Node, ctx: T) => {
  if (isNode(node)) {
    for (const key of getChildrenKeys(node)) {
      const child = node[key] as any as Node | Node[];
      if (isNodeArray(child)) {
        for (let i = 0; i < child.length; i++) {
          child[i] = child[i] && func(child[i], ctx);
        }
      } else {
        (node as any)[key] = func((node as any)[key], ctx);
      }
    }
  }
  return node;
}

export const traverse = <T>(func: (node: Node, ctx: T, next: (node: Node, ctx: T) => Node) => Node) => {
  const _traverse = (node: Node, ctx: T): Node => func(node, ctx, _traverseChildren);
  const _traverseChildren = traverseChildren(_traverse);
  return _traverse;
};
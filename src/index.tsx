enum PatchType {
  STAY,
  ADD_NODE,
  REMOVE_NODE,
  REPLACE_NDOE,
  UPDATE_NODE,
  SET_ATTRIBUTE,
  REMOVE_ATTRIBUTE,
}

type PropPatch =
  | {
    type: PatchType.STAY,
  }
  | {
    type: PatchType.SET_ATTRIBUTE,
    name: string,
    value: string,
  }
  | {
    type: PatchType.REMOVE_ATTRIBUTE,
    name: string,
  };

type NodePatch =
  | {
    type: PatchType.STAY,
  }
  | {
    type: PatchType.ADD_NODE | PatchType.REPLACE_NDOE,
    node: JSX.Element,
  }
  | {
    type: PatchType.REMOVE_NODE,
  }
  | {
    type: PatchType.UPDATE_NODE,
    props: Array<PropPatch>,
    children: Array<NodePatch>,
  };

function isElement(node: Node|Element): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

function diffProps(newNode: JSX.Element, oldNode: JSX.Element) {
  const patches: Array<PropPatch> = [];
  const props = {
    ...newNode.props,
    ...oldNode.props,
  };

  Object.keys(props).forEach(propName => {
    if (propName === 'children') {
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(oldNode.props, propName)) {
      patches.push({
        type: PatchType.SET_ATTRIBUTE,
        name: propName,
        value: newNode.props[propName],
      })
    } else if (!Object.prototype.hasOwnProperty.call(newNode.props, propName)) {
      patches.push({
        type: PatchType.REMOVE_ATTRIBUTE,
        name: propName,
      });
    } else if (newNode.props[propName] !== oldNode.props[propName]) {
      patches.push({
        type: PatchType.SET_ATTRIBUTE,
        name: propName,
        value: newNode.props[propName],
      });
    } else {
      patches.push({
        type: PatchType.STAY,
      });
    }
  });
  return patches;
}

function diffChildren(newNode: JSX.Element, oldNode: JSX.Element) {
  const patches: Array<NodePatch> = [];
  const maxLength = Math.max(newNode.props.children.length, oldNode.props.children.length);

  for (let i = 0; i < maxLength; i += 1) {
    patches.push(diff(newNode.props.children[i], oldNode.props.children[i]));
  }
  return patches;
}

function diff(newNode: JSX.Element, oldNode: JSX.Element): NodePatch {
  if (!oldNode) {
    return {
      type: PatchType.ADD_NODE,
      node: newNode,
    };
  }
  if (!newNode) {
    return {
      type: PatchType.REMOVE_NODE,
    };
  }
  if (
    (typeof newNode !== typeof oldNode) ||
    (typeof newNode === 'string' && newNode !== oldNode) ||
    (newNode.type !== oldNode.type)) {
    return {
      type: PatchType.REPLACE_NDOE,
      node: newNode,
    };
  }
  if (newNode.type) {
    return {
      type: PatchType.UPDATE_NODE,
      props: diffProps(newNode, oldNode),
      children: diffChildren(newNode, oldNode),
    };
  }
  return {
    type: PatchType.STAY,
  };
}

function patch(parent: Element, el: Node|Element, nodePatch: NodePatch) {
  if (nodePatch.type === PatchType.ADD_NODE) {
    parent.appendChild(createElement(nodePatch.node));
  } else if (nodePatch.type === PatchType.REPLACE_NDOE) {
    parent.replaceChild(createElement(nodePatch.node), el);
  } else if (nodePatch.type === PatchType.REMOVE_NODE) {
    parent.removeChild(el);
  } else if (nodePatch.type === PatchType.UPDATE_NODE && isElement(el)) {
    nodePatch.props.forEach(propPatch => {
      if (propPatch.type === PatchType.SET_ATTRIBUTE) {
        el.setAttribute(propPatch.name, propPatch.value);
      } else if (propPatch.type === PatchType.REMOVE_ATTRIBUTE) {
        el.removeAttribute(propPatch.name);
      }
    });
    nodePatch.children.forEach((childNodePatch, index) => {
      if (childNodePatch) {
        patch(el, el.childNodes[index], childNodePatch);
      }
    });
  }
}

function createElement(node: JSX.Element) {
  if (typeof node === 'string') {
    return document.createTextNode(node);
  }

  const el = document.createElement<'listing'>(node.type);

  if (!node.props) {
    return el;
  }
  Object.keys(node.props)
    .filter(propName => propName !== 'children')
    .forEach(propName => createProp(el, propName, node.props[propName]));
  (node.props.children || [])
    .map((childNode: JSX.Element) => el.appendChild(createElement(childNode)));
  return el;
}

function createProp(el: Element, propName: string, propValue: string) {
  if (propName === 'className') {
    el.setAttribute('class', propValue);
    return;
  }
  el.setAttribute(propName, propValue);
}

function h(type: string, props: null | Record<string, any>, ...children: Array<JSX.Element|string>): JSX.Element {
  return {
    key: 0, // dead code key
    type,
    props: {
      ...props,
      children: Array.prototype.concat.apply([], children),
    },
  };
}

function view(count: number) {
  const range = Object.keys(Array.from(new Array(5))).map((item, index) => index);

  return (
    <ul id={String(count)} className="list">
      <li className="list__first list__item">Top</li>
      { range.map(i => <li id={String(count)} className="list__item">Item {String(Math.round(Math.random() * 1000000000) + 1)}</li>) }
      <li className="list__first list__item">Bottom</li>
    </ul>
  );
}

function render(count: number) {
  const root = document.querySelector('#root');
  const el = createElement(view(count));

  root.appendChild(el);
  tick(root, root.childNodes[0], count);
}

function tick(root: Element, el: Node|Element, count: number) {
  patch(root, el, diff(view(count + 1), view(count)));
  if (count > 100) {
    return;
  }
  setTimeout(() => tick(root, el, count + 1), 20);
}

render(0);
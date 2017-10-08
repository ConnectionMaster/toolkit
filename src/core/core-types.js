{
  const SANDBOX_CONTEXT = Symbol('sandbox-context');

  const ID = Symbol('id');

  class VirtualNode {

    constructor() {
      this[ID] = opr.Toolkit.utils.createUUID();
      this.parentNode = null;
    }

    get id() {
      return this[ID];
    }

    get parentElement() {
      if (this.parentNode) {
        return this.parentNode.isElement() ? this.parentNode :
                                             this.parentNode.parentElement;
      }
      return null;
    }

    get rootElement() {
      if (this.parentElement) {
        return this.parentElement.rootElement;
      }
      return this;
    }

    isRoot() {
      return this instanceof Root;
    }

    isComponent() {
      return this instanceof Component;
    }

    isElement() {
      return this instanceof VirtualElement;
    }

    isComment() {
      return this instanceof Comment;
    }

    isCompatible(node) {
      return node && this.nodeType === node.nodeType && this.key === node.key;
    }
  }

  class Component extends VirtualNode {

    constructor() {
      super();
      this.child = null;
      this.comment = new Comment(this.constructor.name, this);
      this.cleanUpTasks = [];
    }

    get sandbox() {
      let sandbox = this[SANDBOX_CONTEXT];
      if (!sandbox) {
        sandbox = opr.Toolkit.Sandbox.create(this);
        this[SANDBOX_CONTEXT] = sandbox;
      }
      return sandbox;
    }

    connectTo(service, listeners) {
      opr.Toolkit.assert(
          service.connect instanceof Function,
          'Services have to define the connect() method');
      const disconnect = service.connect(listeners);
      opr.Toolkit.assert(
          disconnect instanceof Function,
          'The result of the connect() method has to be a disconnect() method');
      disconnect.service = service;
      this.cleanUpTasks.push(disconnect);
    }

    appendChild(child) {
      this.child = child;
      this.child.parentNode = this;
      this.comment.parentNode = null;  // TODO: unit test
      this.comment = null;
    }

    removeChild(child) {
      console.assert(this.child === child);
      this.child.parentNode = null;
      this.child = null;
      this.comment = new Comment(this.constructor.name, this);
    }

    get childElement() {
      if (this.child) {
        if (this.child.isComponent()) {
          return this.child.childElement;
        }
        if (this.child.isElement()) {
          return this.child;
        }
      }
      return null;
    }

    get placeholder() {
      if (this.comment) {
        return this.comment;
      }
      if (this.child && this.child.isComponent()) {
        return this.child.placeholder;
      }
      return null;
    }

    render() {
      return undefined;
    }

    broadcast(name, data) {
      this.rootElement.ref.dispatchEvent(new CustomEvent(name, {
        detail: data,
        bubbles: true,
        composed: true,
      }))
    }

    onCreated() {
    }

    onAttached() {
    }

    onPropsReceived(props) {
    }

    onUpdated() {
    }

    onDestroyed() {
    }

    onDetached() {
    }

    get nodeType() {
      return 'component';
    }

    get ref() {
      return this.childElement ? this.childElement.ref : this.placeholder.ref;
    }

    isCompatible(node) {
      return super.isCompatible(node) && this.constructor === node.constructor;
    }
  }

  class ComponentElement extends HTMLElement {

    cssImports(paths) {
      return paths.map(loader.getPath)
          .map(path => `@import url(${path});`)
          .join('\n');
    }

    async connectedCallback() {
      const shadow = this.attachShadow({
        mode: 'open',
      });
      const data = {
        styles: this.props.styles,
        onStylesLoaded: () =>
            this.props.onLoad(shadow.querySelector(':host > slot')),
      };
      const update =
          opr.Toolkit.render(props => this.render(props), data, shadow);
    }

    disconnectedCallback() {
      this.props.onUnload();
    }

    render({styles = [], onStylesLoaded}) {
      return [
        'slot',
        [
          'style',
          {
            onLoad: onStylesLoaded,
          },
          this.cssImports(styles),
        ],
      ];
    }
  }

  class Root extends Component {

    static register() {
      let ElementClass = customElements.get(this.elementName);
      if (!ElementClass) {
        ElementClass = class extends ComponentElement {};
        customElements.define(this.elementName, ElementClass);
        this.elementClass = ElementClass;
      } else {
        if (this.elementClass !== ElementClass) {
          console.error(
              `Element name: ${this.elementName} is already registered by:`,
              ElementClass.component);
          throw new Error(
              `Duplicate '${this.elementName}' element declaration!`);
        }
      }
    }

    constructor(container, dispatch) {
      super();
      this.container = container;
      this.dispatch = dispatch;
    }

    get parentElement() {
      const containerElement = new VirtualElement('root');
      containerElement.children.push(this);
      containerElement.ref = this.container;
      return containerElement;
    }

    async getInitialState(defaultProps = {}) {
      return defaultProps;
    }

    getReducers() {
      return [];
    }

    get nodeType() {
      return 'root';
    }
  }

  class VirtualElement extends VirtualNode {

    constructor(name) {
      super();
      this.name = name;
      this.attrs = {};
      this.dataset = {};
      this.style = {};
      this.classNames = [];
      this.listeners = {};
      this.metadata = {};
      this.children = [];
      this.text = null;
      this.key = null;
      this.ref = null;
    }

    setAttribute(name, value) {
      this.attrs[name] = String(value);
    }

    removeAttribute(name) {
      delete this.attrs[name];
    }

    setDataAttribute(name, value) {
      this.dataset[name] = String(value);
    }

    removeDataAttribute(name) {
      delete this.dataset[name];
    }

    addClassName(className) {
      this.classNames.push(className);
    }

    removeClassName(className) {
      this.classNames = this.classNames.filter(item => item !== className);
    }

    setStyleProperty(prop, value) {
      this.style[prop] = String(value);
    }

    removeStyleProperty(prop) {
      delete this.style[prop];
    }

    addListener(name, listener) {
      this.listeners[name] = listener;
    }

    removeListener(name, listener) {
      delete this.listeners[name];
    }

    insertChild(child, index = this.children.length) {
      this.children.splice(index, 0, child);
      child.parentNode = this;
    }

    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index >= 0) {
        this.children.splice(index, 1);
        child.parentNode = null;
        return true;
      }
      return false;
    }

    moveChild(child, from, to) {
      console.assert(this.children[from] === child);
      this.children.splice(from, 1);
      this.children.splice(to, 0, child);
    }

    get nodeType() {
      return 'element';
    }

    isCompatible(node) {
      return super.isCompatible(node) && this.name === node.name;
    }
  }

  class Comment extends VirtualNode {

    constructor(text, parentNode) {
      super();
      this.text = text;
      this.parentNode = parentNode;
      this.ref = null;
    }

    get nodeType() {
      return 'comment';
    }
  }

  const CoreTypes = {
    VirtualNode,
    Component,
    Root,
    VirtualElement,
    Comment,
  };

  module.exports = CoreTypes;
}

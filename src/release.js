{
  loader.prefix('core', '/src/');

  const {
    SUPPORTED_ATTRIBUTES,
    SUPPORTED_EVENTS,
    SUPPORTED_STYLES,
    SUPPORTED_FILTERS,
    SUPPORTED_TRANSFORMS
  } = loader.get('core/consts');

  const {
    VirtualNode,
    Root,
    Component,
    VirtualElement,
    Comment,
  } = loader.get('core/core-types');

  const App = loader.get('core/app');
  const Sandbox = loader.get('core/sandbox');
  const Template = loader.get('core/template');
  const ComponentTree = loader.get('core/component-tree');
  const ComponentLifecycle = loader.get('core/component-lifecycle');
  const Diff = loader.get('core/diff');
  const Patch = loader.get('core/patch');
  const Reconciler = loader.get('core/reconciler');
  const Document = loader.get('core/document');
  const Service = loader.get('core/service');
  const utils = loader.get('core/utils');

  // config
  const settings = {};

  let init;
  const readyPromise = new Promise(resolve => {
    init = resolve;
  });

  const ready = async () => {
    await readyPromise;
  };

  const logLevels = ['debug', 'info', 'warn', 'error'];

  const configure = options => {
    settings.plugins = options.plugins || [];
    settings.level = logLevels.includes(options.level) ? options.level : 'info';
    settings.debug = options.debug || false;
    settings.preload = options.preload || false;
    settings.bundles = options.bundles || [];
    settings.bundleRootPath = options.bundleRootPath || '';
    Object.freeze(settings);
    init();
  };

  const isDebug = () => settings.debug;

  const render = (templateProvider, props, container) => {
    const parent = new Root(container);
    const template = templateProvider(props);
    if (template) {
      const element = ComponentTree.createFromTemplate(template);
      Patch.addElement(element, parent).apply();
    }
    return props => {
      const template = templateProvider(props);
      let element;
      if (template) {
        element = ComponentTree.createFromTemplate(template);
      }
      const patches = Diff.calculate(parent.child, element, parent);
      for (const patch of patches) {
        patch.apply();
      }
    }
  };

  const create = root => new App(root, settings);

  const assert = (condition, ...messages) => {
    if (isDebug()) {
      console.assert(condition, ...messages);
    }
  };

  const warn = (...messages) => {
    console.warn(...messages);
  };

  const Toolkit = {
    // constants
    SUPPORTED_ATTRIBUTES,
    SUPPORTED_EVENTS,
    SUPPORTED_STYLES,
    SUPPORTED_FILTERS,
    SUPPORTED_TRANSFORMS,
    // core classes
    App,
    ComponentTree,
    ComponentLifecycle,
    Document,
    Diff,
    Patch,
    Reconciler,
    Template,
    Sandbox,
    Service,
    // core types
    VirtualNode,
    Root,
    Component,
    VirtualElement,
    Comment,
    // utils
    utils,
    create,
    render,
    configure,
    ready,
    // debug
    isDebug,
    assert,
    warn,
  };

  window.opr = window.opr || {};
  window.opr.Toolkit = Toolkit;
}

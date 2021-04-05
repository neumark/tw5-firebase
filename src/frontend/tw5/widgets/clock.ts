// from:
// https://tiddlywiki.com/dev/static/Using%2520ES2016%2520for%2520Writing%2520Plugins.html
// https://webpack.js.org/configuration/resolve/#resolvefallback
// https://github.com/basarat/typescript-book/blob/master/docs/project/external-modules.md

/// <reference path="../tw5-types.ts" />
/*
import { widget as Widget } from '$:/core/modules/widgets/widget.js';

class ClockWidget extends Widget {
  constructor(parseTreeNode, options) {
    super(parseTreeNode, options);
    this.logger = new $tw.utils.Logger('clock-widget');
  }

  render(parent, nextSibling) {
    if (!$tw.browser) { return; }
    this.logger.log('Rendering clock DOM nodes');
    this.computeAttributes()
    this.parentDomNode = parent;
    this.domNode = $tw.utils.domMaker('div', {
      document: this.document,
      class: 'tc-clock-widget'
    });
    parent.insertBefore(this.domNode, nextSibling);
    this.tick();
  }

  tick() {
    this.logger.log('Tick!');
    if (!document.contains(this.domNode)) {
      // Apparently the widget was removed from the DOM. Do some clean up.
      return this.stop();
    }
    this.start();
    this.domNode.innerHTML = this.dateString;
  }

  start() {
    if (!this.clockTicker) {
      this.logger.log('Starting clock');
      this.clockTicker = setInterval(this.tick.bind(this), 1000);
    }
  }

  stop() {
    this.logger.log('Stopping clock');
    clearInterval(this.clockTicker);
    this.clockTicker = null;
  }

  get dateString() {
    const format = 'DDth MMM YYYY at hh12:0mm:0ss am';
    return $tw.utils.formatDateString(new Date(), format);
  }
}

export { ClockWidget as clock };
*/
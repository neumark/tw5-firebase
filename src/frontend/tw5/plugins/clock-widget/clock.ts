// from:
// https://tiddlywiki.com/dev/static/Using%2520ES2016%2520for%2520Writing%2520Plugins.html
// https://webpack.js.org/configuration/resolve/#resolvefallback
// https://github.com/basarat/typescript-book/blob/master/docs/project/external-modules.md

import { ParseTree, Widget, WidgetConstructor } from '../../tw5-types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { widget } = require('$:/core/modules/widgets/widget.js');
const Widget: WidgetConstructor = widget;
class ClockWidget extends Widget implements Widget {
    private domNode: HTMLElement | null = null;
    private clockTicker?: ReturnType<typeof setInterval>;

    constructor(parseTreeNode: ParseTree, options: any) {
        super(parseTreeNode, options);
        // this.logger = new $tw.utils.Logger('clock-widget');
    }

    render(parent: HTMLElement, nextSibling: HTMLElement) {
        // this.logger.log('Rendering clock DOM nodes');
        this.computeAttributes();
        this.parentDomNode = parent;
        this.domNode = $tw.utils.domMaker('div', {
            document: this.document,
            class: 'tc-clock-widget',
        });
        parent.insertBefore(this.domNode, nextSibling);
        this.tick();
    }

    tick() {
        console.log('Tick!');
        if (this.domNode instanceof Node && !document.contains(this.domNode)) {
            // Apparently the widget was removed from the DOM. Do some clean up.
            return this.stop();
        }
        this.start();
        this.domNode!.innerHTML = this.dateString;
    }

    start() {
        if (!this.clockTicker) {
            console.log('Starting clock');
            this.clockTicker = setInterval(this.tick.bind(this), 1000);
        }
    }

    stop() {
        console.log('Stopping clock');
        clearInterval(this.clockTicker!);
        this.clockTicker = undefined;
    }

    get dateString() {
        const format = 'DDth MMM YYYY at hh12:0mm:0ss am';
        return $tw.utils.formatDateString(new Date(), format);
    }
}

export { ClockWidget as clock };

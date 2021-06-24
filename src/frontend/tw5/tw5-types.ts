import { HTTPMethod } from '../../shared/apiclient/http-transport';
import { Revision } from '../../shared/model/revision';
import { Tiddler } from '../../shared/model/tiddler';

// Minimal typings for TW5, lots of stuff is missing (intentionally).

export type CallbackFn = (err: any, ...data: any[]) => void;

// standard tiddler definition, but every field except title is optional, allowing any custom field
export type TW5TiddlerFields = { title: string } & Partial<Omit<Tiddler, 'fields'>> & { [fieldName: string]: any };

export interface TW5Tiddler {
    fields: TW5TiddlerFields;
    getFieldDay: () => string;
    getFieldList: (fieldName: string) => any[];
    getFieldString: (fieldName: string) => string;
    getFieldStringBlock: () => string;
    getFieldStrings: (fieldNames: string[]) => string[];
    hasField: (fieldName: string) => boolean;
    hasTag: (tag: string) => boolean;
    isDraft: () => boolean;
    isEqual: (tiddler: TW5Tiddler, excludeFields?: Record<string, boolean>) => boolean;
    isPlugin: () => boolean;
}

export interface VariableInfo {
    text: string;
    params: any;
    srcVariable: string;
    isCacheable: boolean;
}

// found using grep -R 'addEventListener("tm-' node_modules/tiddlywiki | cut -d '(' -f 2 | cut -d , -f 1 | sort | uniq -c
export type AddEventListenerArgs =
    | ['tm-auto-save-wiki']
    | ['tm-browser-refresh']
    | ['tm-clear-browser-storage']
    | ['tm-clear-password']
    | ['tm-close-tiddler']
    | ['tm-consent-accept']
    | ['tm-consent-clear']
    | ['tm-consent-decline']
    | ['tm-copy-syncer-logs-to-clipboard']
    | ['tm-copy-to-clipboard']
    | ['tm-download-file', (event: Event) => string | undefined]
    | ['tm-focus-selector']
    | ['tm-full-screen']
    | ['tm-home']
    | ['tm-load-plugin-from-library']
    | ['tm-load-plugin-library']
    | ['tm-login']
    | ['tm-logout']
    | ['tm-modal']
    | ['tm-notify']
    | ['tm-open-external-window']
    | ['tm-open-window']
    | ['tm-permalink']
    | ['tm-permaview']
    | ['tm-print']
    | ['tm-save-wiki']
    | ['tm-scroll']
    | ['tm-server-refresh']
    | ['tm-set-password']
    | ['tm-show-switcher']
    | ['tm-slice-tiddler']
    | ['tm-unload-plugin-library']
    | ['tm-zip-add-text-file']
    | ['tm-zip-create']
    | ['tm-zip-download']
    | ['tm-zip-render-file'];

// any module with module-type: parser can extend this type, so it will never be complete.
// from: tiddlywiki/core/modules/parsers/wikiparser/wikiparser.js
export type ParseTree =
    | { type: 'element'; tag: string; attributes?: { [key: string]: string }; children?: ParseTree[] } //- an HTML element
    | { type: 'text'; text: string } // a text node
    | { type: 'entity'; value: string } // - an entity
    | { type: 'raw'; html: string } // - raw HTML
    | { type: 'string'; value: string } // - literal string
    | { type: 'indirect'; textReference: string } // - indirect through a text reference
    | { type: 'macro'; macro: any /*<TBD>*/ }
    // from: tiddlywiki/core/modules/parsers/textparser.js
    | {
          type: 'codeblock';
          attributes: {
              code: { type: 'string'; value: string /*text*/ };
              language: { type: 'string'; value: string /*type*/ };
          };
      }
    // from: tiddlywiki/core/modules/parsers/csvparser.js
    | { type: 'scrollable'; children?: ParseTree[] };

// based on: https://instil.co/blog/crazy-powerful-typescript-tuple-types/
type ConvertEventListener<T> = T extends AddEventListenerArgs
    ? {
          type: T[0];
          handler: T[1];
      }
    : never;

type ConvertEventListeners<T extends [...any[]]> = T extends [infer Head, ...infer Tail]
    ? [ConvertEventListener<Head>, ...ConvertEventListeners<Tail>]
    : [];

export type Event = any; // TODO, what's an event in Widget context?

export interface Widget {
    parentDomNode: HTMLElement;
    parseTreeNode: ParseTree;
    wiki: Wiki;
    parentWidget: Widget;
    document: Document;
    attributes: { [key: string]: string };
    children: Widget[];
    domNodes: HTMLElement[];

    addEventListener(...args: AddEventListenerArgs): void;
    addEventListeners<T extends [...any[]]>(...listeners: ConvertEventListeners<T>): void;
    allowActionPropagation(): boolean;
    assignAttributes(domNode: HTMLElement, options: any): void;
    computeAttributes(): { [key: string]: boolean };
    dispatchEvent(event: any): void;
    evaluateMacroModule(name: string, actualParams: any, defaultValue: any): any;
    execute(): void;
    findFirstDomNode(): HTMLElement | null;
    findNextSiblingDomNode(startIndex: number): HTMLElement | null;
    getAttribute(name: string, defaultText: any): any;
    getStateQualifier(name: string): string;
    getVariable(name: string, options: any): any;
    getVariableInfo(name: string, options: any): any;
    hasAttribute(name: string): boolean;
    hasVariable(name: string, value?: any): boolean;
    initialise(parseTreeNode: HTMLElement, options: any): void;
    invokeActionString(actions: string, triggeringWidget: Widget, event: Event, variables: any): any;
    invokeActions(triggeringWidget: Widget, event: Event): void;
    invokeActionsByTag(tag: string, event: Event, variables: any): any;
    makeChildWidget(parseTreeNode: ParseTree): void;
    makeChildWidgets(parseTreeNodes: ParseTree[]): void;
    nextSibling(): HTMLElement | null;
    previousSibling(): HTMLElement | null;
    refresh(changedTiddlers: TW5Tiddler[]): boolean;
    refresh(changedTiddlers: TW5Tiddler[]): void;
    refreshChildren(changedTiddlers: TW5Tiddler[]): void;
    refreshSelf(): void;
    removeChildDomNodes(): void;
    render(parent: HTMLElement, nextSibling: HTMLElement): void;
    renderChildren(parent: HTMLElement, nextSibling: HTMLElement): void;
    resolveVariableParameters(formalParams: any, actualParams: any): any;
    setVariable(name: string, value: any, params: any, isMacroDefinition: boolean): void;
    substituteVariableReferences(text: string): string;
}

export interface WidgetConstructorOptions {
    wiki: Wiki; // mandatory reference to wiki associated with this render tree
    parentWidget: Widget; // optional reference to a parent renderer node for the context chain
    document?: Document; // optional document object to use instead of global document
}

export interface WidgetConstructor {
    new (parseTreeNode: ParseTree, options: WidgetConstructorOptions): Widget;
}

export interface Wiki {
    tiddlerExists: (title: string) => boolean;
    getTiddlerText: (title: string, fallback?: string) => string | undefined;
    getTiddler: (title: string) => TW5Tiddler | undefined;
}

export interface SyncAdaptorTiddlerInfo {
    bag?: string;
}

export interface SyncAdaptor {
    name?: string;
    supportsLazyLoading?: boolean;
    setLoggerSaveBuffer?: (buffer: any) => void;
    isReady: () => boolean;
    getTiddlerInfo: (tiddler: TW5Tiddler) => SyncAdaptorTiddlerInfo | undefined;
    getTiddlerRevision: (title: string) => Revision | undefined;
    getStatus: (callback: CallbackFn) => void;
    // login, logout not used
    saveTiddler: (tiddler: TW5Tiddler, callback: CallbackFn) => void;
    loadTiddler: (title: string, callback: CallbackFn) => void;
    deleteTiddler: (
        title: string,
        callback: CallbackFn,
        options: {
            tiddlerInfo: {
                adaptorInfo: SyncAdaptorTiddlerInfo;
            };
        },
    ) => void;
}

export interface Logger {
    setSaveBuffer: (buffer: any) => void;
    log: (message: string, ...data: any[]) => void;
}

export interface LoggerConstructor {
    new (loggerName?: string): Logger;
}

export interface TW5TiddlerConstructor {
    new (...fields: TW5Tiddler['fields'][]): TW5Tiddler;
}

export interface Translator {
    getString: (label: string) => string;
}

export interface TW5ImportFileInfo {
    file: File;
    type: string;
    isBinary: boolean;
    callback: CallbackFn;
}

// found using grep -R 'addHook("th-' node_modules/tiddlywiki |  cut -d '(' -f 2 | cut -d , -f 1 | sort | uniq -c
export type AddHookArguments =
    | ['th-renaming-tiddler', /*newTiddler*/ string, /*oldTiddler*/ string]
    | ['th-importing-file', (info: TW5ImportFileInfo) => boolean]
    | ['th-deleting-tiddler']
    | ['th-importing-tiddler']
    | ['th-opening-default-tiddlers-list']
    | ['th-page-refreshed']
    | ['th-page-refreshing']
    | ['th-relinking-tiddler']
    | ['th-rendering-element']
    | ['th-saving-tiddler'];

export interface DomMakerOptions {
    document: Document;
    class: string;
}

export interface TW {
    utils: {
        // defined in tiddlywiki/core/modules/utils/dom/http.js
        httpRequest: (
            options: Partial<{
                type: HTTPMethod;
                url: string;
                headers: { [key: string]: string };
                data: string;
                callback: CallbackFn;
            }>,
        ) => void;
        Logger: LoggerConstructor;
        error: (message: string) => void;
        domMaker: (tag: string, options: DomMakerOptions) => HTMLElement;
        formatDateString(date: Date, format: string): string;
    };
    boot: {
        boot: () => void;
    };
    wiki: Wiki;
    Tiddler: TW5TiddlerConstructor;
    preloadTiddlerArray: (tiddlerFields: TW5TiddlerFields[]) => void;
    language?: Translator;
    hooks: {
        addHook: (...args: AddHookArguments) => void;
    };
}

declare global {
    const $tw: TW;
}

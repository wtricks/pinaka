/**
 * Pinaka - A faster & smaller JavaScript library.
 * @author Anuj Kumar<anujkumar00p@gmail.com>
 * @link https://github.com/thestackmastery
 * @link https://github.com/wtricks
 */
export default () => {
    const version = '1.0.0';
    const truthy = () => true;
    const falsy = () => false;
    const keys = Object.keys;
    const values = Object.values;
    const isArray = Array.isArray;
    const emptyArray = Object.freeze([]);
    const emptyObject = Object.freeze({});
    const isString = (v) => typeof v === 'string';
    const isFunction = (v) => typeof v === 'function';
    const isEqual = (firstValue, secondValue) => firstValue === secondValue;
    const isObject = (v) => v != null && typeof v == 'object' && !isArray(v);

    /**
     * Run all array functions.
     * @param {Function[]} array 
     */
    const runAll = (array) => {
        let runableFn;

        for(runableFn of array) {
            runableFn();
        }
    }

    /**
     * Define a property with or wihout options.
     * @param {object} obj 
     * @param {string} property 
     * @param {any} value 
     * @param {undefined|object} options
     */
    const def = (obj, property, value, options) => {
        return Object.defineProperty(obj, property, {
            value: value,
            writable: true,
            enumerable: false,
            ...(options && options)
        });
    }

    /** REACTIVITY */
    const $PROMISE = Promise.resolve(), $HOLDER2 = {};
    let $STATE_COUNT = 0, $UNIQUE_ID = 0, $PENDING = false;
    let $IS_RAN1 = {}, $IS_RAN2 = {}, $IS_RAN3 = {};
    let $DEEP_FLUSH = 3, batchUpdate = falsy;
    let effectHolder = [], $TRACK = false, $HOLDER = {};

    /**
         * Create a `signal` by passing the initial value of the signal.
         * @param {any} initialValue The initial value of the `signal`.
         * @param {boolean | Function} equals Either a boolean or a function which returns a boolean value. 
         *               If set to `false` or evaluates to `false`, it will notify all its subscribers on any value change.
         * @returns An array containing two functions: a getter and a setter for the signal.
         */
    const createSignal = (initialValue, equals = isEqual) => {
        const dep = def({}, '$', $STATE_COUNT++);
        equals = equals || falsy;

        const getter = () => {
            if ($TRACK) {
                $HOLDER[dep.$] = dep;
            }

            return initialValue;
        }

        const setter = (val) => {
            const newValue = isFunction(val) ? val(initialValue) : val;
            if (equals(initialValue, newValue)) return;
            
            batchUpdate(dep);
            initialValue = newValue;
        }

        return [getter, setter]
    }

    /**
     * Create a `effect` that runs three times in the component lifecycle
     * (onMounted, onUpdated, onDestroy). It will automatically track `signals`
     * used inside it and run when one of the `signals` changes.
     *
     * @param fn The `effect` function to be executed on lifecycle events. 
     *           `Effect` function can return a cleanup function, 
     *           which will be called before destroying the component
     */
    const createEffect = (fn) => {
        effectHolder.push(fn);
    }

    /**
     * Memorize the previous calculated value of a function.
     * @param fn A function which may use `signals`.
     * @param value The initial value to pass as an argument for `fn`.
     * @returns A function that calculates and memorizes the result of `fn`.
     */
    const createMemo = (fn, initialValue) => {
        let oldVal = initialValue;
        return () => oldVal = fn(oldVal);
    }

    /**
    * Observe a `signal` inside a function and register the provided function 
    * to run whenever the `signal` changes.
    * @param {Function[]} dep The object to store `unsubscribe` functions.
    * @param {Function} fn The function representing the signal being observed.
    * @param {Function|undefined} dummyFn An optional function to trigger the tracking of the `signal`.
    *                When provided, the changes are reacted based on the signal used inside 'dummyFn',
    *                otherwise, it reacts on the basis of 'signalUpdate' itself.
    * @returns The result of the `dummyFn` or `signalUpdate` function.
    */
    const observeSignal = (dep, fn, dummyFn) => {
        const unsubscribers = [];

        $TRACK = true;
        const value = (dummyFn || fn)();
        $TRACK = false;

        if (keys($HOLDER).length > 0) {
            let key;

            for(key in $HOLDER) {
                $HOLDER[key][$UNIQUE_ID] = fn;
                unsubscribers.push([ $HOLDER[key], $UNIQUE_ID++ ]);
            }

            $HOLDER = {};
            dep.push(() => {
                let arr;
                
                for(arr of unsubscribers) {
                    delete arr[0][arr[1]];
                }
            })
        }

        return value;
    }

    /**
     * Get the values of `signals` without adding them as `subscriber`.
     * @param fn The getter function of any `signal`.
     * @returns The value obtained from the `signal` without tracking it.
     *
     * @remarks
     * This function temporarily disables tracking of `signals` to obtain their values without adding them as `subscriber`.
     * It can be used when you want to access a `signal`'s value without triggering any side effects.
     */
    const untrackSignal = (signalGetter) => {
        const tempHold = $TRACK;

        $TRACK = false;
        const value = signalGetter();
        $TRACK = tempHold;

        return value;
    }

    /**
     * Create an `HTMLElement` holder.
     * @returns A function that can be used as a setter and getter for the `HTMLElement`.
     */
    const createRef = () => {
        let elem;
    
        return (element) => {
            if (element === undefined) {
                return elem;
            }
    
            return elem = element;
        };
    }

    const batchDep = batchUpdate = (dep) => {
        if ($IS_RAN1[dep.$]) return;
        $IS_RAN1[dep.$] = true;
    
        $HOLDER2[dep.$] = dep;
    
        if (!$PENDING) {
            $PENDING = true;
            $PROMISE.then(flushUpdates);
        }
    }

    const flushEffectsNow = (dep) => {
        if ($IS_RAN3[dep.$]) return;
        $IS_RAN3[dep.$] = !0;
        runAll(values(effect));
    }
    
    const flushUpdates = () => {
        let key1, key2, dep;
        let canFlushMore = $DEEP_FLUSH;
    
        while (canFlushMore-- > 0) {
            for (key1 in $HOLDER2) {
                dep = $HOLDER2[key1];
    
                for (key2 in dep) {
                    if ($IS_RAN2[key2]) continue;
                    $IS_RAN2[key2] = true;
                    dep[key2]();
                }
                delete $HOLDER2[key1];
            }
        }
    
        $IS_RAN1 = {};
        $IS_RAN2 = {};
        $PENDING = false;
    }

    /**
     * Change `signals` value without running the batch process.
     * @param fn A function which may change `signals`.
     *
     * @remarks
     * This function temporarily overrides the `batchUpdate` function to `flushEffectsNow`,
     * allowing `signals` to be updated directly without batching the `subscribers`. After executing
     * the provided function, the original `batchUpdate` function is restored, and any subsequent
     * changes to `signals` will be batched as usual.
     */
    const unbatchUpdate = (fn) => {
        batchUpdate = flushEffectsNow;
        fn(); // call user-defined function
        $IS_RAN3 = {};
        batchUpdate = batchDep;
    } 

    /** Build Props */
    const [buildPropsForElement, buildPropsForComponent] = (() => {
        const buildPropsForElement = (insert, element, props, dep) => {
            let directives = [], key;
        
            for(key in props) {
                if (key == 'bind') {
                    bindObjectToElement(element, props.key, dep);
                } else if (key == 'ref') {
                    props[key]?.(element);
                } else if (key == 'class') {
                    resolveClass(element, props.class, dep);
                } else if (key == 'style') {
                    resolveStyle(element, props.style, dep);
                } else if (key.startsWith('on:')) {
                    dep.push(listen(element, key.slice(3), props[key]));
                } else if (key == 'use') {
                    directives.push(isArray(props[key])?props[key]:[props[key]]);
                } else if (typeof props[key] == 'function') {
                    observeSignal(dep, () => attribute(element, key, props[key]));
                } else attribute(element, key, props[key]);
            }
        
            insert(element);
            for(key of directives) {
                const result = key[0](element, (key[1] = isFunction(key[1]) ? key[1] : falsy)(), ...key[2]);
                if (result.destroy !== undefined) dep.push(result.destroy);
                if (result.update !== undefined) {
                    observeSignal(dep, (() => result.update(key[1]())), key[1])
                }
            }
        }
        
        const bindObjectToElement = (element, obj, dep) => {
            const fn = isFunction(obj) ? obj : (() => obj);
            let oldValue = emptyObject;
        
            const resolveIt = (nValue = fn()) => {
                let key;
    
                if (!isObject(nValue)) {
                    throw new Error(`Only 'object' can be bind with the elements.`);
                }
        
                for(key in nValue) {
                    attribute(element, key, nValue[key]);
                    delete oldValue[key];
                }
        
                for(key in oldValue) {
                    element.removeAttribute(key);
                }
        
                oldValue = nValue;
            }
        
            resolveIt(observeSignal(dep, resolveIt));
        }
        
        const resolveClass = (element, value, dep) => {
            observeSignal(dep, () => {
                let nValue = typeof value === 'function' ? value() : value;
                let className = isArray(nValue) ? nValue : [];
        
                if (isObject(nValue)) {
                    let cls;
    
                    for(cls in nValue) {
                        className.push(cls);
                    }
                }
                element.setAttribute('class', className.join(" "));
            });
        }
        
        const resolveStyle = (element, value, dep) => {
            let oldValue = emptyObject, fn = isFunction(value) ? value : () => value;
        
            const resolveIt = (nValue = fn()) => {
                if (isString(nValue)) {
                    element.setAttribute('style', nValue);
                    return;
                }
        
                if (isString(oldValue))
                    oldValue = emptyObject;
        
                let key, extra;
                const solveObject = (obj) => {
                    for(key in obj) {
                        delete oldValue[key];
                        extra = isNaN(obj[key]) ? obj[key] : `${obj[key]}px`;
                        if (key[0] != '-') element.style[key] = extra;
                        else element.style.setProperty(key, extra);
                    }
                }
        
        
                if (isArray(nValue)) {
                    for(key of nValue) {
                        solveObject(key);
                    }
                } else solveObject(nValue);
        
                for(key in oldValue) {
                    element.style[key] = '';
                }
        
                oldValue = nValue;
            }
        
            resolveIt(observeSignal(dep, resolveIt, fn));
        }

        let $EFFECT_ID = 0;
        const buildPropsForComponent = (store, props, dep) => {
            let directives = {}, key;

            for(key in props) {
                if (key == 'bind') {
                    bindObjectToComponent(store, props, props.bind, dep);
                } else if (key == 'use') {
                    directives = props[key];
                } else if (key.startsWith('on:')) {
                    store[key.slice(3)] = props[key];
                } else {
                    createKeyFunction(store, key, props[key]);
                }
            }

            return directives;
        }

        const createKeyFunction = (store, key, expression) => {
            delete store[key];

            def(store, key, null, {
                get() {
                    return isFunction(expression) 
                        ? expression() : expression;
                }
            })
        } 

        const bindObjectToComponent = (store, props, bind, dep) => {
            const DEP = def({}, '$',`.${$EFFECT_ID++}.`);
            let oldValue = emptyObject, fn = isFunction(bind) ? bind : () => bind;

            const bindObject = (nValue = fn()) => {
                let key;

                if (isObject(nValue)) {
                    throw new Error("Only 'object' can be bind with the components.");
                }

                for(key in nValue) {
                    if (key in oldValue) {
                        if (nValue[key] !== oldValue[key]) {
                            store[key] = nValue[key];
                            batchUpdate(DEP);
                        }
                        continue;
                    }
                    def(store, key, null, {
                        get() { 
                            if ($TRACK) $HOLDER[DEP.$] = DEP;
                            return nValue[key]
                        }
                    })

                    delete oldValue[key];
                }

                for(key in oldValue) {
                    delete store[key];
                    if (props[key]) {
                        store[key] = props[key];
                    }
                }

                oldValue = nValue;
            }

            bindObject(observeSignal(dep, bindObject, fn));
        }

        return [buildPropsForElement, buildPropsForComponent]
    })();

    /**
     * Create HTML Node.
     * @param {string} type 
     * @returns {SVGElement|HTMLElement}
     */
    const element = (type) => {
        return type !== 'svg' ? document.createElement(type)
            : document.createElementNS("http://www.w3.org/2000/svg", type);
    }

    /**
     * Set attribute of an element.
     * @param {SVGElement|HTMLElement} element 
     * @param {string} key 
     * @param {string} value
     */
    const attribute = (element, key, value) => {
        if (key in element) {
            return element[key] = value;
        }
        element.setAttribute(key, `${value}`);
    }

    /**
     * Attach an event listener with element.
     * @param {SVGElement|HTMLElement} element 
     * @param {string} event 
     * @param {Function} handler 
     * @returns A cleanup function.
     */
    const listen = (element, event, handler) => {
        element.addEventListener(event, handler);
        return () => element.removeEventListener(event, handler);
    }
    
    /**
     * Create a text node.
     * @param {string} v 
     * @returns 
     */
    const text = (v = '') => document.createTextNode(v);

    /**
     * Destroy a component & its child components.
     * @param {any[][]} holder 
     */
    const destroyNodes = (holder) => {
        runAll(holder[1]);
        
        let element;
        for(element of holder[0]) {
            if (element.$d) {
                element.$d();
                continue;
            }
            
            element.parentNode.removeChild(element);
        }
    }

    /**
     * Change position of nodes in DOM tree.
     * @param {SVGElement|HTMLElement} parent 
     * @param {SVGElement|HTMLElement|Comment|Text} anchor 
     * @param {any[][]} holder
     */
    const insertNodes = (parent, anchor, holder) => {
        let length = holder[0].length, element, index = 0;
    
        while(index < length) {
            element = holder[0][index++];
    
            if (element.$u) {
                anchor = element.$u(anchor);
            } else {
                parent.insertBefore(element, anchor.nextSibling);
                anchor = element;
            }
        }
        
        return anchor;
    }
    

    /**
     * Create reactive text node.
     * @param {Function} fn 
     * @param {Function[]} dep 
     */
    const createExpression = (fn, dep) => {
        let space = text(''), oldvalue;
        observeSignal(dep, () => {
            if (space.nodeValue != (oldvalue = fn()))
                space.data = oldvalue;
        });
        return space;
    }

    /**
     * Construct DOM nodes and components.
     * @param {SVGElement|HTMLElement} parent 
     * @param {object} vnode 
     * @param {Function[]} dep 
     * @param {Function} insert
     */
    const createNode = (parent, vnode, dep, insert) => {

        if (isString(vnode)) {
            insert(text(vnode));
        } 
        
        else if (typeof vnode == 'function') {
            insert(createExpression(vnode, dep));
        } 
        
        else if (isArray(vnode)) {
            let elem;

            for(elem of vnode) {
                createNode(parent, elem, dep, insert);
            }
        } 
        
        else if (isFunction(vnode.type)) {
            createComponent(parent, vnode, insert);
        } 
        
        else if (vnode.type.startsWith('p:')) {
            const tag = vnode.type.slice(2);
            if (tag in builtInComponent) {
                return builtInComponent[tag](parent, vnode, insert, dep);
            } 

            vnode.type = getGlobalComponent(tag);
            createComponent(parent, vnode, insert);
        } else {
            const elem = element(vnode.type);
            buildPropsForElement(insert, elem, (vnode.props || emptyObject), dep);
            
            if (vnode.children) {
                createNode(elem, vnode.children, dep, (el) => {
                    if (el.$d) dep.push(el.$d);
                    else elem.appendChild(el);
                });
            }
        }
    }

    const createComponent = (parent, vnode, insert) => {
        const space = text();
        parent.appendChild(space);
    
        const store = {}, childHolder  = [[], []];
        const directives = buildPropsForComponent(store, (vnode.props||emptyObject), childHolder[1]);

        let anchor = space, effect = [];
        const node = vnode.type(store, { slots: vnode.children, use: directives });
        

        if (node == undefined || (isArray(node) && node.length == 0)) {
            throw new Error(`Component must return at least one node.`);
        }

        createNode(parent, node, childHolder[1], (el) => {
            childHolder[0].push(el);
            if (el.$l) {
                anchor = el.$l();
                return;
            }

            parent.insertBefore(el, anchor.nextSibling); 
            anchor = el;
        });

        // RUN ALL EFFECTS
        for(const fn of effectHolder) {
            const obj = { value: null };
            observeSignal(childHolder[1], () => {
                obj.value?.();
                obj.value = fn();
            });
            effect.push(obj);
        }

        effectHolder.length = 0;

        insert({
            $s: space,
            $l() {
                let temp = childHolder[0].at(-1);
                return temp.$l ? temp.$l() : temp;
            },
            $d() {
                for(let o of effect) o.value?.();
                destroyNodes(childHolder);
                parent.removeChild(space);
            },
            $u(anchor) {
                parent.insertBefore(space, anchor.nextSibling);
                return insertNodes(parent, space, childHolder);
            }
        });
    }

    const createEachBlock = (parent, vnode, insert) => {
        const space = text();
        parent.appendChild(space);

        const dep = [];
        const keyFn = vnode.props?.key || ((_, index) => index);
        const listItemFn = vnode.children;
        const listFn  = vnode.props?.list || (() => emptyArray);

        let nodeHolderArray = [];
        let nodeHolderObject = {};

        const renderList = (value = listFn()) => {
            if (!isArray(value)) {
                throw new Error(`<p:each> requires list to be an array.`);
            }

            let newNodeHolderObject = {};
            let key, length = value.length, index = 0;
            let item, anchor = space, extra, $$$;
        
            nodeHolderArray.length = length;
            while(index < length) {
                key = /* key */ keyFn(value[index], index);
                if (newNodeHolderObject[key]) {
                    throw new Error(`Duplicate keys found.`);
                }

                item = nodeHolderObject[key];
                if (item == undefined) {
                    item = [[], [], index];
                    createNode(parent, listItemFn(() => value[index], () => item[2]), item[1], (el) => {
                        item[0].push(el);
                        if (el.$l) {
                            anchor = el.$l();
                            return;
                        }
            
                        parent.insertBefore(el, anchor.nextSibling); 
                        anchor = el;
                    });

                    if (item[0].length == 0) {
                        throw new Error(`Component <p:each> requires at least one children.`);
                    }
                } else {
                    anchor = (extra = item[0].at(-1)).$l ? extra.$l() : extra;
                }

                delete nodeHolderObject[key];
                newNodeHolderObject[key] = nodeHolderArray[index++] = item;
            }

            for(index in nodeHolderObject) {
                destroyNodes(nodeHolderObject[index]);
            }

            index = 0;
            anchor = space;
            while(index < length) {
                item = nodeHolderArray[index];
                $$$ = (extra=nodeHolderArray[index][0]).$l ? extra.$l() : extra;
                extra = (extra=nodeHolderArray[index][0]).$s ? extra.$s : extra;
                
                if (item[2] != index && anchor.nextSibling != extra) {
                    insertNodes(parent, anchor, item);
                }
                item[2] = index++;
                anchor = $$$;
            }

            nodeHolderObject = newNodeHolderObject;
        }

        // Initial Rendering
        renderList(observeSignal(dep, renderList, listFn));

        insert({
            $s: space,
            $l() {
                let temp = nodeHolderArray.at(-1);
                if (!temp) return space;

                return (temp = temp[0].at(-1)).$l ? temp.$l() : temp;
            },
            $d() {
                parent.removeChild(space);
                dep[0] && dep[0]();

                let index;
                for(index in nodeHolderObject) {
                    destroyNodes(nodeHolderObject[index]);
                }
            },
            $u(anchor) {
                parent.insertBefore(space, anchor.nextSibling);

                let item;
                for(item of nodeHolderArray) {
                    anchor = insertNodes(parent, space, item);
                }

                return anchor;
            }
        })
    }

    const createCaseBlock = (parent, vnode, insert) => {
        const space = text();
        parent.appendChild(space);

        const childNodes = vnode.children;
        const childHolder = [[], []];
        const activeNodes = [];
        let last = -2;

        const renderCase = () => {
            let anchor = space;
            let selected = -1;

            let index = 0, fn, result;
            for(; index < childNodes.length; index++) {
                // If user didn't passed 'if', we can assume that it is last node.
                fn = childNodes[index].props?.if || truthy;
                result = (activeNodes.length > index) ? fn() : observeSignal(activeNodes, renderCase, fn);
                if (activeNodes.length == index) activeNodes.push(truthy);

                if (result) {
                    selected = index;
                    break;
                }
            }

            index = activeNodes.length;
            while(index-- > 1 && selected < index) activeNodes.pop()();

            if (selected != last) {
                last = selected;
                destroyNodes(childHolder);
                childHolder[0].length = childHolder[1].length = 0;

                createNode(parent, childNodes[selected], childHolder[1], (el) => {
                    childHolder[0].push(el);
                    if (el.$l) {
                        anchor = el.$l();
                        return;
                    }
        
                    parent.insertBefore(el, anchor.nextSibling); 
                    anchor = el;
                });

                if (childHolder[0].length == 0) {
                    throw new Error(`Component <p:case> requires at least one children.`);
                }
            }
        }

        renderCase(); // initial rendering
        insert({
            $s: space,
            $l() {
                let temp = childHolder[0].at(-1);
                return !temp ? space : temp.$l ? temp.$l() : temp;
            },
            $d() {
                destroyNodes(childHolder);
                parent.removeChild(space);
            },
            $u(anchor) {
                parent.insertBefore(space, anchor.nextSibling);
                return insertNodes(parent, space, childHolder);
            }
        })
    }

    const createPortal = (__, vnode, _, dep) => {
        if (!(vnode.props.target instanceof Node)) {
            throw new Error("Target is not found in <p:portal>");
        }
    
        const childHolder = [[], []];
        const rootNode = vnode.props.target;
    
        createNode(rootNode, vnode.children, childHolder[1], (el) => {
            if (!el.$l) rootNode.appendChild(el);
            childHolder[0].push(el);
        });
    
        dep.push(() => destroyNodes(childHolder));
    }
 
    const createSlot = (__, vnode, insert, dep) => {
        const childHolder = [[], []];

        let node;
        if (typeof vnode.children == 'function') {
            const store = {}
            const directives = buildPropsForComponent(store, (vnode.props||emptyObject), childHolder[1]);
            node = vnode.children(store, { use: directives });
        } else {
            node = vnode.children;
        }
    
        createNode(__, node, dep, insert);
    }

    const createComment = (_, vnode, insert) => {
        insert(document.createComment(`${vnode.children}`));
    }

    const createVNode = (type, props, children) => {
        if (!isObject(props)) {
            if (children == undefined) children = props;
            props = emptyObject;
        } else if ('if' in props){
            def(props, 'if', props.if)
        }
    
        return { type, props: props, children }
    }

    /**
     * Built-in components
     */
    const builtInComponent = {
        each: createEachBlock,
        case: createCaseBlock,
        portal: createPortal,
        slot: createSlot,
        comment: createComment
    }

    const $GLOBAL = {}, $COMPONENT = {}, $DIRECTIVE = {};
    const compilerOptions = { allowComment: false, isCustomTag: falsy};
    let $onError = (error) => {
        let logMessage = `${error.message} ${error.line ? `${error.line}:${error.column}` : ''}`;
        if (error.layout) logMessage += `\n${error.layout}\n`

        if (!error.isError) {
            console.warn('[pinaka warn]', logMessage);
        } else console.error('[pinaka error]',logMessage);
    }

    const use = (name, value, ...rest) => {
        const handler = isString(name) ? $DIRECTIVE[name] : name;
        return [handler||truthy, value, rest];
    }

    const global = (name) => {
        return $GLOBAL[name];
    }
    
    const getGlobalComponent = (name) => {
        return $COMPONENT[name] || (() => {
            throw new Error(`Component '<p:${name}>' is not registered.`);
        });
    }

    /**
     * Instantiate `Pinaka` Application
     * @param {Function} component 
     * @param {HTMLElement|SVGElement} target 
     * @param {object|undefined} options 
     * @returns 
     */
    const createApp = (component, target, options) => {
        if (!(target instanceof Node)) {
            throw new Error(`Target is not found.`);
        }

        let props = emptyObject;
        if (options) {
            if (isObject(options.initialProps)) props = options.initialProps;
            if (isFunction(options.errorHandler))
                $onError = options.errorHandler;

            Object.assign($GLOBAL, options.global);
            Object.assign($DIRECTIVE, options.directive);
            Object.assign(compilerOptions, options.config);
            Object.assign($COMPONENT, options.component)

            if (isArray(options.plugins)) {
                const optionsForPlugins = {
                    component(name, component) {
                        $COMPONENT[name] = component;
                    },
                    directive(name, directive) {
                        $DIRECTIVE[name] = directive;
                    },
                    global(name, value) {
                        $GLOBAL[name] = value;
                    },
                    version: VERSION
                };

                for(const plugin of options.plugins) {
                    if (isFunction(plugin)) {
                        plugin(optionsForPlugins);
                    } else if (isArray(plugin)) {
                        plugin[0](optionsForPlugins, ...plugin[1])
                    }
                }
            }
        }

        let destroy = falsy;
        createComponent(target, createVNode(component, props), ($) => destroy = $.$d);
        return destroy;
    }

    return {
        use,
        global, 
        version,
        createApp,
        p: createVNode,
        watch: createEffect,
        memo: createMemo,
        signal: createSignal,
        ref: createRef,
        unbatch: unbatchUpdate,
        untrack: untrackSignal
    }
}

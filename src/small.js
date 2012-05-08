/**
 * ??????AMD???????˙õ??
 * @example
 * //??????????????
 *
 * SNS.require(["sns/follow"], function(Follow){
 *      new Follow()
 *  })
 *
 *
 *
 * //??????????????????∑⁄???ß›?
 *
 * SNS.require([{module:"sns/follow",version:"1.0",skin:null}], function(Follow){
 *   new Follow()
 * })
 *
 */

/**
 * ?????????SNS widget?????
 * ???????????????????
 *
 */

SNS.provide(function () {

    /*
     * -------------------------------------------------------------
     * ?????ßª???????
     * -------------------------------------------------------------
     */

    var
        win = window,
        //????????require????
        require,
        exports,
        //???????
        isFunction = SNS.isFunction,
        isArray = SNS.isArray(),
        mix = SNS.mix,
        //????õ•
        storage = SNS.storage,
        //?????????
        isOpera = typeof opera !== "undefined" && opera.toString() === "[object Opera]",
        head = document.getElementsByTagName("head")[0],

        //sns???????
        defaultConfig = {
            pkgs     :[],
            timestamp:20111212,
            skin     :true,
            combo    :[]
        },

        comboConfigs = {},

        //{"sns/feed":[]}
        setComboConfigs = function (configs) {
            for (var p  in configs) {
                var name = require.normalize(p);
                comboConfigs[name] = [];
                for (var i = 0; i < configs[p].length; i++) {
                    comboConfigs[name].push(require.normalize(configs[p][i]))
                }
            }
        },


        currentlyAddingModuleName,

        //????????ßª??????????????ß÷???????
        loadingModules = {},

        //??????????????????
        definedModules = [],

        //???????????????????????
        memoryModules = {},

        //?????????ß‹???????
        requireModules = {},

        /**
         *
         *
         */
            keyWords = /*["require"]*/[],

        isKeyWord = function (s) {
            var result = false;
            for (var i = 0; i < keyWords.length; i++) {
                if (keyWords[i] === s) {
                    result = true;
                    break;

                }
            }
            return result;
        },

        /**
         * ????callback
         */
            custemEvents = {},
        beforeRequire = [],
        beforeLoad = [],
        beforeDefined = [],
        afterDefined = [],
        beforeMemoize = [],
        beforeExe = [],
        afterExe = [],


        //????????????
        SNS_TIME_STAMP = "sns_time_stamp",
        SNS_INTERVAL_TIME = "sns_interval_time",
        SNS_LAST_MODIFIY = "sns_last_modifiy",

        timeStamp = function (t) {
            if (t)storage(SNS_TIME_STAMP, t);
            else return storage(SNS_TIME_STAMP) || 20111206;
        },
        interval = function (interval) {
            if (interval)storage(SNS_INTERVAL_TIME, interval);
            else return storage(SNS_INTERVAL_TIME) || 0;
        },


        // ????url???ßª??????¶œ? requirejs
        parseUriOptions = {
            strictMode:false,
            key       :["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"],
            q         :{
                name  :"queryKey",
                parser:/(?:^|&)([^&=]*)=?([^&]*)/g
            },
            parser    :{
                strict:/^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
                loose :/^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
            }
        },

        parseUri = function (str) {
            var o = parseUriOptions,
                m = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
                uri = {},
                i = 14;
            while (i--) uri[o.key[i]] = m[i] || "";
            uri[o.q.name] = {};
            uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
                if ($1) uri[o.q.name][$1] = $2;
            });
            return uri;
        },

        trimDots = function (ary) {
            var i, part;

            for (i = 0; i < ary.length; i++) {
                part = ary[i];

                if (part === ".") {
                    ary.splice(i, 1);

                    i -= 1;

                } else if (part === "..") {

                    if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {


                        break;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        },

        getHost = function (url) {
            return url.replace(/^(\w+:\/\/[^/]+)\/?.*$/, '$1');
        },

        getDirectory = function (url) {

            var s = url.match(/.*(?=\/.*$)/);
            return (s ? s[0] : '.') + '/';

        },


        normalizeURL = function (name, baseName, version) {
            if (!isKeyWord(name)) {

                var pkg, pkgPath, pkgConfig;

                //???°§??

                if (name.charAt(0) === ".") {

                    baseName = baseName.split("/");
                    baseName = baseName.slice(0, baseName.length - 1);

                    name = baseName.concat(name.split("/"));

                    trimDots(name);

                    name = name.join("/");

                }

                //??°§??
                else if (name.charAt(0) === "/") {
                    name += getHost(baseName);
                }
                //???°§??
                else if (name.match(/^\w+:/)) {

                }
                //????°§??
                else {

                    //??????
                    var nameArray = name.split("/");
                    var pkgName = nameArray[0];

                    var pkgConfig = SNS.config("pkgs", {
                        name:pkgName
                    });


                    //
                    if (pkgConfig && pkgConfig.path) {
                        pkgPath = getDirectory(require.normalize(pkgConfig.path));
                        var v = version || pkgConfig.version;
                        if (v) {
                            pkgPath = pkgPath.replace("{version}", v);


                        } else {
                            pkgPath = pkgPath.replace("{version}", "");
                        }
                        if (pkgName === name) {
                            pkgPath = pkgConfig.main ? (pkgPath + pkgConfig.main) : (pkgPath + "/index.js")
                        }

                        nameArray.splice(0, 1, pkgPath);

                    }
                    else {
                        pkgPath = normalizeURL("./widget", baseName);
                        nameArray.splice(0, 0, pkgPath);
                    }

                    name = nameArray.join("/");
                }
            }
            name = name.replace(/([^:\/])\/+/g, '$1\/');

            name = SNS.normalize(name)

            return name;
        },

        normalize = function (name, baseName, version) {
            if (!isKeyWord(name)) {
                name = normalizeURL(name, baseName, version);
                if ((name.indexOf(".js") === -1) && name.indexOf(".css") === -1) {
                    name += ".js";
                }
            }
            return name;
        },

        isCssPath = function (name) {
            return  name.indexOf(".css") !== -1
        },

        normalizeBatch = function (nameArray, baseName) {
            for (var i = 0; i < nameArray.length; i++) {
                nameArray[i] = normalize(nameArray[i], baseName);
            }
            return nameArray;
        },

        nameToUrl = function (name) {
            if (name.indexOf("?t") == -1)name += "?t=" + defaultConfig.timestamp
            return name;
        },

        urlToName = function (url) {
            var i, id = url;
            id = id.replace("??", "<>")
            if ((i = id.indexOf('?')) != -1)
                id = id.slice(0, i);
            if ((i = id.indexOf('#')) != -1)
                id = id.slice(0, i);
            id = id.replace("<>", "??");
            return id;
        },
        getCurrentScript = SNS.getCurrentScript,
        createScript = SNS.getScript,


        addLoadListener = SNS.addScriptLoadListener;


    var counter = 0;

    function checker(link, callback) {

        if (!link._checkCounter) {
            link._checkCounter = 0;
        }

        var target = link;
        if (target.sheet) {
            var stylesheets = document.styleSheets;
            for (var i = 0; i < stylesheets.length; i++) {
                var file = stylesheets[i];
                var owner = file.ownerNode ? file.ownerNode : file.owningElement;
                if (owner && (owner == link)) {
                    callback();
                    return;
                }

                if (link._checkCounter++ > 100) {
                    callback();
                    return;
                }
            }
        }

        window.setTimeout(checker, 10, link, callback);
    }


    function addLinkLoadListener(link, callback) {

        if (link.attachEvent || isOpera) {
            link.onload = callback;
            link.onerror = callback;
        }
        else {
            checker(link, callback);
        }

    }


    function createLink(configs, url, callback) {

        var link = document.createElement('link');
        link.type = 'text/css';
        link.rel = 'stylesheet';
        if (callback)addLinkLoadListener(link, callback);
        link.href = url;
        for (var p in configs) {
            link.setAttribute("data-" + p, configs[p]);
        }

        head.appendChild(link);


    }


    var currentPath = getDirectory(SNS.baseURI);

    function getInteractiveScript() {
        var script ,
            i,
            scripts = document.getElementsByTagName('script');
        if (document.attachEvent) {

            //ie6-9 ????????????ß÷?script???
            for (i = scripts.length - 1; i > -1 && (script = scripts[i]); i--) {
                if (script.readyState === 'interactive') {
                    return script;
                }
            }

        }
    }

    //require = createRequire(getCurrentScript().src);


    //combo url ???
    var comboRecord = {};


    //???ßÿ??????combo??? url;
    function isComboUrl(url) {
        return url.indexOf("??") !== -1 && url.indexOf(",") !== -1;
    }

    function splitComboUrl(comboUrl) {

        var result = [];
        var temp = comboUrl.split("??");
        var host = temp[0];

        var path = temp[1].split(",");

        for (var i = 0; i < path.length; i++) {
            result.push(host + path[i]);
        }

        return result;

    }

    function comboUrl(urlArray) {
        var result;
        if (SNS.config("supportCombo")) {


            //????css??js???????combo????????
            var jsUrls = {}, cssUrls = {}, localurl = [], result = [];

            for (var i = 0; i < urlArray.length; i++) {
                if (urlArray[i].indexOf(".css") !== -1) {
                    var uri = parseUri(urlArray[i]);
                    if (uri.protocol == "file") {
                        localurl.push(urlArray[i]);
                        continue;
                    }

                    if (!cssUrls[uri.host])cssUrls[uri.host] = [];
                    cssUrls[uri.host].push(uri.path);
                }
                else {

                    var uri = parseUri(urlArray[i]);
                    if (uri.protocol === "file") {
                        localurl.push(urlArray[i]);
                        continue;
                    }
                    if (!jsUrls[uri.host])jsUrls[uri.host] = [];
                    jsUrls[uri.host].push(uri.path);
                }

            }

            for (var p in cssUrls) {
                result.push("http://" + p + "??" + cssUrls[p].join(","));
            }
            for (var p in jsUrls) {
                result.push("http://" + p + "??" + jsUrls[p].join(","));
            }

            result = result.concat(localurl);
        }
        else {
            result = urlArray;
        }


        return result;
    }

    function comboAfterDefined(module) {

        var
            name = module.name,
            p = name.indexOf("??"),
            index,
            recode

        if (isComboUrl(name)) {

            recode = comboRecord[name];
            if (recode) {
                index = ++recode.index;

            } else {
                index = 0;
                recode = comboRecord[name] = {
                    index    :index = 0,
                    nameArray:splitComboUrl(name)
                };
            }

            module.name = recode.nameArray[index];

        }

    }


    function memoize(name, deps, factory) {

        var eventTarget = {
            name   :name,
            deps   :deps,
            factory:factory
        }

        for (var i = 0; i < beforeMemoize.length; i++) {

            beforeMemoize[i](eventTarget);
        }

        name = eventTarget.name;
        deps = deps;
        factory = factory;

        //  deps = normalizeBatch(deps, name);

        var realDeps = [];


        if (memoryModules[name]) throw new Error(name + " ??????????");


        for (var i = 0; i < deps.length; i++) {


            var nmlName = normalize(deps[i], name);


            if (nmlName !== name) {
                realDeps.push(nmlName);
            }
        }

        memoryModules[name] = {
            deps   :realDeps,
            factory:factory,
            require:createRequire(name)
        }
        breakCirle(memoryModules[name]);


        return name;
    }

    function initModule(name) {

        var mod = memoryModules[name];
        if (!mod) throw new Error(name + " load error");
        var mdeps = [];

        for (var i = 0; i < mod.deps.length; i++) {
            if (mod.deps[i] && !isKeyWord(mod.deps[i]) && !isRequire(mod.deps[i]) && !isMemoize(mod.deps[i])) {
                mdeps.push(mod.deps[i]);
            }
        }

        if (mdeps && mdeps.length > 0) {
            mod.require(mdeps);
        }
        else {
            exeModule(name);
        }

    }

    function wrapRequireCallback(name, deps, callback) {
        var require = createRequire(name);
        normalizeBatch(deps, name);
        name = name + SNS.guid();

        memoryModules[name] = {
            deps   :deps,
            factory:callback,
            require:require
        }
        return name;
    }

    function isMemoize(name) {
        return memoryModules[name] ? true : false;
    }

    function isRequire(name) {
        return requireModules[name] === undefined ? false : true;
    }

    function isLoading(name) {
        return loadingModules[name] ? true : false;
    }

    function exeModule(name) {

        var
            mod = memoryModules[name],
            deps = mod.deps,
            canExe = true,
            requireMods = [];

        for (var i = 0; i < deps.length; i++) {
            if (isKeyWord(deps[i])) {
                requireMods.push(mod.require);
                continue;
            }
            if (!isRequire(deps[i])) {
                canExe = false;
            } else {
                requireMods.push(requireModules[deps[i]]);
            }
        }

        if (!canExe) return;



        var result = mod.factory.apply(mod, requireMods);

        memoryModules[name] = null;

        var eventTarget = {
            name  :name,
            result:result
        }

        for (var i = 0; i < beforeRequire.length; i++) {
            beforeRequire[i](eventTarget);
        }

        result = eventTarget.result;
        //null ?????????????
        if (result === undefined) {
            result = null
        }
        requireModules[name] = result;

        notify(name);

    }

    function notify(name) {

        var mod, deps;

        for (var p in memoryModules) {

            mod = memoryModules[p];
            if (mod) {

                deps = mod.deps;
                for (var j = 0; j < deps.length; j++) {
                    if (deps[j] === name) {


                        exeModule(p);
                    }
                }
            }

        }
    }


    if (!window.console) {
        window.console = {};
        window.console.log = function (msg) {
        }
    }


    /**
     * -------------------------------------------------------------
     * ???????
     * -------------------------------------------------------------
     */

    function define(deps, factory) {

        var name, script, i;
        if (isFunction(deps)) {

            factory = deps;
            deps = [];
        }

        if (!factory) return;

        if (document.attachEvent) {
            var
                temp,
                scripts = document.getElementsByTagName('script');

            //ie6-9 ????????????ß÷?script???
            for (i = scripts.length - 1; i > -1 && (temp = scripts[i]); i--) {

                if (temp.readyState === 'interactive') {
                    script = temp;
                }
            }

        }

        // script = getCurrentScript();
        if (script) {
            name = urlToName(script.src);
        }
        else {
            name = currentlyAddingModuleName;
        }

        definedModules.push({
            factory:factory,
            deps   :deps,
            name   :name
        })


    }


    /**
     *  --------------------------------------------------------------
     *  ???????
     *  --------------------------------------------------------------
     */

    function breakCirle(mod) {
        for (var i = 0; i < mod.deps.length; i++) {
            if (mod.deps[i] == mod.name) {
                mod.deps.splice(i, 0);
            }
            else {
                var m = memoryModules[mod.deps[i]];
                if (m) {
                    for (var j = 0; j < m.deps.length; j++) {
                        if (m.deps[j] == mod.name) {
                            mod.deps.splice(i, 0);
                        }
                    }

                }
            }

        }
    }


    function createRequire(baseName) {
        // <div class="sns-widget" data-sns-follow='{useId:123}'></div>
        // SNS.require(["sns/follow"], function(Follow){ })

        // SNS.require({version:"1.0", skin:null, combo:true}, ["sns/follow"], function(Follow){ })

        /**
         * @ignore
         */

        var newRequire = function (deps, callback, context) {

            //?ßÿ??????????
            if (!callback) {
                callback = undefined;
                context = {mods:{}}
            }
            else if (SNS.isPlainObject(callback)) {
                context = callback;
                callback = undefined;
            } else if (!context) {
                context = {mods:{}};
            }

            var allDeps = [], needLoadDeps = [], i, comboMods = [], skinMods = [];
            var needLoadName = [], modConfig, modName;

            //???????
            for (i = 0; i < deps.length; i++) {
                if (!deps[i])continue;
                if (typeof deps[i] === "string") {
                    modName = deps[i];
                    modConfig = {}
                }
                else {
                    modName = deps[i].name;
                    modConfig = deps[i];
                    deps[i] = modName;
                }

                modConfig = SNS.mix(SNS.config("mods", {name:modName}) || {}, modConfig);


                if (modConfig.combo) {
                    for (var j = 0; j < modConfig.combo.length; j++) {

                        var cmodConfig = SNS.mix({}, SNS.config("mods", {name:modConfig.combo[j]}) || {});

                        modConfig.combo[j] = cmodConfig.name = normalize(modConfig.combo[j], baseName, modConfig.version)
                        context.mods[cmodConfig.name] = cmodConfig

                        comboMods.push(cmodConfig.name);


                    }

                }

                if (typeof modConfig.skin === "string") {
                    var cmodConfig = SNS.mix({}, SNS.config("mods", {name:modConfig.skin}) || {});
                    modConfig.skin = cmodConfig.name = normalize(modConfig.skin, baseName, modConfig.version);
                    context.mods[cmodConfig.name] = cmodConfig
                    comboMods.push(cmodConfig.name);
                }

                deps[i] = modName = modConfig.name = normalize(modName, baseName, modConfig.version);
                context.mods[modName] = modConfig;
                allDeps.push(deps[i]);


            }


            allDeps = allDeps.concat(comboMods);
            context.comboMods = comboMods;


            for (var i = 0; i < allDeps.length; i++) {

                modName = allDeps[i];


                modConfig = context.mods[modName] || {};


                if (modName && !isLoading(modName) && !isRequire(modName) && !isMemoize(modName)) {
                    needLoadDeps.push(modName);
                }


            }

            if (callback) {

                var newModuleName = wrapRequireCallback(baseName, allDeps, callback);
            }

            if (needLoadDeps.length === 0) {

                callback && exeModule(newModuleName);
                return;
            }


            //needLoadDeps = comboUrl(needLoadDeps);
            for (i = 0; i < needLoadDeps.length; i++) {


                newRequire.load(needLoadDeps[i], function (moduleName, cfgs) {


                    //  initModule(currentName);
                    var leName;
                    var mod = memoryModules[moduleName];
                    var realDeps = [];
                    if (!mod) {
                        //throw new Error(name+ " load error");
                        notify(moduleName);

                    }
                    else {
                        var mdeps = [];


                        for (var i = 0; i < mod.deps.length; i++) {

                            if (mod.deps[i] && !isKeyWord(mod.deps[i]) && !isRequire(mod.deps[i]) && !isMemoize(mod.deps[i])) {
                                if (!((cfgs.skin === null || typeof cfgs.skin === "string") && isCssPath(mod.deps[i]))) {
                                    var depsName = normalize(mod.deps[i], mod.name)
                                    mdeps.push({
                                        name   :depsName,
                                        version:cfgs.version
                                    });
                                    realDeps.push(depsName);
                                }
                            }
                        }
                        mod.deps = realDeps;
                        //????????????css

                        if (mdeps && mdeps.length > 0) {

                            mod.require(mdeps, context);
                        }
                        else {
                            exeModule(moduleName);
                        }
                    }

                }, context)

            }

        }


        newRequire.load = function (name, callback, context) {

            context = context || {};
            var modName, modConfig;

            var currentModule;
            var wrapCallback = function () {




                var currentModule, index = 0, temp;


                for (var i = 0; i < definedModules.length; i++) {
                    temp = definedModules[i];

                    if (temp) {
                        if (!temp.name || temp.name === name) {
                            currentModule = definedModules[i];
                            currentModule.name = name;
                            index = i;
                        }


                    }

                }


                //  currentModule = currentModule?currentModule:{name:name}
                if (currentModule) {


                    for (var j = 0; j < afterDefined.length; j++) {
                        afterDefined[j](currentModule);
                    }
                    modName = currentModule.name;
                    modConfig = context.mods[modName];

                    if (modConfig.combo) {
                        currentModule.deps = currentModule.deps.concat(modConfig.combo)
                    }
                    if (modConfig.skin) {
                        currentModule.deps = currentModule.deps.push(modConfig.skin)
                    }

                    var realName = memoize(modName, currentModule.deps, currentModule.factory);

                    definedModules.splice(index, 1);
                    callback && callback(realName, modConfig);


                }
                else {
                    currentModule = {name:name}
                    for (var j = 0; j < afterDefined.length; j++) {
                        afterDefined[j](currentModule);
                    }
                    modName = currentModule.name;
                    modConfig = context.mods[modName];

                    //????????????ÔÖ?????????????????????????
                    var realName = memoize(modName, [], modConfig.factory || function () {
                    });
                    callback && callback(realName, modConfig);
                }

                if (loadingModules[name]) {
                    delete loadingModules[name];
                }



            }

            if (name.indexOf(".css") !== -1) {
                currentModule = {name:name};
                for (var j = 0; j < afterDefined.length; j++) {
                    afterDefined[j](currentModule);
                }
                modName = currentModule.name;
                modConfig = context.mods[modName];
                var cssWrapCallback = function () {
                    var realName = memoize(modName, [], function () {
                    });
                    callback && callback(realName, modConfig);

                    if (loadingModules[name]) {
                        delete loadingModules[name];
                    }
                }

                if (loadingModules[name]) {
                    addLinkLoadListener(loadingModules[name], cssWrapCallback)
                } else {

                    loadingModules[name] = createLink({}, nameToUrl(name), cssWrapCallback);

                }
            }
            else {
                if (loadingModules[name]) {
                    addLoadListener(loadingModules[name], wrapCallback)
                } else {
                    currentlyAddingModuleName = name;
                    loadingModules[name] = createScript({}, nameToUrl(name), wrapCallback);
                    currentlyAddingModuleName = null;
                }


            }


        }


        newRequire.config = function (obj) {

            var pkgs = obj.pkgs || [],
                oldPkgs = defaultConfig.pkgs;
            delete obj.pkgs

            for (var i = 0; i < pkgs.length; i++) {
                pkgs[i].path = getDirectory(normalizeURL(pkgs[i].path, baseName));
                //  pkgs[i].timestamp =normalizeURL(pkgs[i].timestamp, pkgs[i].path);
            }

            mix(defaultConfig, obj, true);
            defaultConfig.pkgs = oldPkgs.concat(pkgs);


        };
        newRequire.combo = function (O) {
            setComboConfigs(O)
        };


        newRequire.normalize = function (n) {
            return normalize(n, baseName)
        }

        newRequire.beforeMemoize = function (fun) {

            beforeMemoize.push(fun);
        }
        newRequire.afterDefined = function (fun) {

            afterDefined.push(fun);
        }

        newRequire.beforeRequire = function (fun) {
            beforeRequire.push(fun);
        }

        newRequire.beforeLoad = function (fun) {
            beforeLoad.push(fun);
        }


        return newRequire;

    }

    require = createRequire(location.href);
    require.afterDefined(comboAfterDefined);


    /**
     * -------------------------------------------------------------------------
     * ????SNS cdn??
     * @todo combo
     * -------------------------------------------------------------------------
     *
     */






    SNS.config("pkgs", {
        name   :"sns",
        path   :currentPath + "/src/"

    })
    SNS.config("pkgs", {
        name   :"base",
        path   :currentPath
    })


    //?SNS ????????????
    require.beforeRequire(function (e) {
        var fileName = parseUri(e.name).file;
        if (e.result && e.result.prototype) e.result.prototype.name = fileName.split(".")[0];

    })


    //????????
    //@todo ????????®∞????????
    // ???????®∞??????????????

    function timeStampRequire() {
        var args = arguments;
        if (SNS.isDebug()) {
            require.config({
                timestamp:new Date().getTime()
            })

            require.apply(this, args);
        }
        else {


            var old = storage(SNS_LAST_MODIFIY),
                now = new Date().getTime(),
                itl = interval();
            if (!old || (old && ((now - old) > 1000 * 60 * itl))) {

                require.config({
                    timestamp:now
                })

                require(["sns/timestamp"], function (ts) {

                    timeStamp(ts.timestamp);
                    interval(ts.interval);

                    require.config({
                        timestamp:timeStamp()
                    })

                    require.apply(this, args);
                    storage(SNS_LAST_MODIFIY, now);

                })


            } else {
                require.config({
                    timestamp:timeStamp()
                })

                require.apply(this, args);
            }
        }
    }


    return      {

        /**
         *
         * @class ????????ÓïSNS??????????????AMD???????????????????????????????????∑⁄??????????? ??
         * @name SNS.define
         * @param {array} depsModules ???????????????
         * @param {function} factoryFun ?????????????
         * @example
         *
         *   SNS.define(["sns/foo"], function(foo){
         *
         *      //??return??????????
         *      return {
         *        newFoo:new Foo();
         *      }
         *   })
         *
         * @example
         *  // ????css???
         *   SNS.define(["sns/foo","sns/foo.css"], function(foo){
         *
         *      //??return??????????
         *      return {
         *        newFoo:new Foo();
         *      }
         *   })
         *
         */
        define :define,
        /**
         * @class ????????ÓïSNS??????????????AMD????????????? ???????????????????????∑⁄??????????? ??
         * @name SNS.require
         * @param {array} modules ???????????????
         * @param {function} callback ?????????????
         *  @example
         *   //????auth???
         *   SNS.require(["sns/auth"],function(Auth){
         *      var auth =  new Auth();
         *  })
         * @example
         *  //?ß›??∑⁄
         *  SNS.config("mods", {name: "sns/auth",  version: "2.0"})
         *   SNS.require(["sns/auth"],function(Auth){
         *      var auth =  new Auth();
         *  })
         *
         * @example
         *  // ?????????
         *  SNS.config("mods", {name: "sns/auth",  skin: "2.0"})
         *
         *   SNS.require(["sns/auth"],function(Auth){
         *      var auth =  new Auth();
         *  })
         *
         * @example
         *   // ?ùI???
         *  SNS.config("mods", {name: "sns/auth",  skin: ??sns/auth2.css??})
         *
         *   SNS.require(["sns/auth"],function(Auth){
         *      var auth =  new Auth();
         *  })

         */
        require:require//timeStampRequire



    }

});


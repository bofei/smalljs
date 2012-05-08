/**
 * 实现一个AMD类似的模块方案
 */
var sm = (function (win) {

    /*
     * -------------------------------------------------------------
     * 定义一些工具方法
     * -------------------------------------------------------------
     */

    var
        //初始化全局require方法
        require,
        //语言增强
        toString = Object.prototype.toString,
        type = function (obj) {
            return obj == null ? String(obj) : toString.call(obj);
        },
        isFunction = function (obj) {
            return type(obj) === "[object Function]";
        },

        //浏览器测试
        isOpera = typeof opera !== "undefined" && opera.toString() === "[object Opera]",
        head = document.getElementsByTagName("head")[0],

        //全局配置
        defaultConfig = {
            pkgs:[],
            timestamp:1
        },
        currentlyAddingModuleName,
        //预先声明一些变量保存加载过程中的模块信息
        loadingModules = {},

        //保存正在加载的模块信息
        definedModules = [],

        //保存已经被加载完成的模块信息
        memoryModules = {},

        //保存模块执行后的返回结果
        runedModules = {},

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
            return (s ? s[0] : '.');

        },
        normalize = function (name, baseName) {
            var pkg, pkgPath, pkgConfig;

            //相对路径

            if (name.charAt(0) === ".") {

                baseName = baseName.split("/");
                baseName = baseName.slice(0, baseName.length - 1);

                name = baseName.concat(name.split("/"));

                trimDots(name);

                name = name.join("/");

            }

            //根路径
            else if (name.charAt(0) === "/") {
                name += getHost(baseName);
            }
            //绝对路径
            else if (name.match(/^\w+:/)) {

            }
            //顶级路径
            else {

                //包配置
                var nameArray = name.split("/");
                var pkgName = nameArray[0];

                var pkgConfig = config("pkgs", {
                    name:pkgName
                });
                if (pkgConfig && pkgConfig.path) {
                    pkgPath = pkgConfig.path;

                    if (pkgName === name) {
                        pkgPath = pkgConfig.main ? (pkgPath + pkgConfig.main) : (pkgPath + "/index.js")
                    }

                    nameArray.splice(0, 1, pkgPath);

                }
                else {
                    pkgPath = normalize("./core", baseName);
                    nameArray.splice(0, 0, pkgPath);
                }

                name = nameArray.join("/");
            }

            name = name.replace(/([^:\/])\/+/g, '$1\/');

            if ((name.indexOf(".js") === -1) && name.indexOf(".css") === -1) {
                name += ".js";
            }

            return name;
        },



        isCssPath = function (name) {
            return  name.indexOf(".css") !== -1
        },


        nameToUrl = function (name) {
            if (name.indexOf("?t") == -1)name += "?t=" + defaultConfig.timestamp
            return name;
        },

        urlToName = function (url) {
            var i, id = url;

            if ((i = id.indexOf('?')) != -1)
                id = id.slice(0, i);
            if ((i = id.indexOf('#')) != -1)
                id = id.slice(0, i);

            return id;
        },

        createScript = function (configs, url, callback) {

            var node = document.createElement("script");
            node.type = "text/javascript";
            // node.charset = "utf-8";

            node.async = true;

            if (callback) addScriptLoadListener(node, callback);
            node.src = url;



            if (head.firstChild) {
                head.insertBefore(node, head.firstChild);
            } else {
                head.appendChild(node);
            }

            return node;
        },


        addScriptLoadListener = function (script, callback) {

            if (script.attachEvent) {
                script.attachEvent("onreadystatechange", function () {
                    var rs = script.readyState;
                    if (rs === 'loaded' || rs === 'complete') {
                        callback && callback();
                    }
                });
            } else {

                script.addEventListener("load", callback, false);
                script.addEventListener("error", function () {
                    console.log(script.src + " is error");
                    callback && callback();
                }, false);
            }

        };


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


        head.appendChild(link);


    }

    function getCurrentScript() {

        var script ,
            i,
            scripts = document.getElementsByTagName('script');
        //firefox4 and opera
        if (document.currentScript) {

            return document.currentScript;

        } else if (document.attachEvent) {

            //ie6-9 得到当前正在执行的script标签
            for (i = scripts.length - 1; i > -1 && (script = scripts[i]); i--) {


                if (script.readyState === 'interactive') {

                    return script;
                }
            }

        }
        else {

            // 参考 https://github.com/samyk/jiagra/blob/master/jiagra.js
            // chrome and firefox4以前的版本

            var stack;
            try {

                makeReferenceError

            } catch (e) {

                stack = e.stack;
            }

            if (!stack)
                return undefined;

            // chrome uses at, ff uses @

            var e = stack.indexOf(' at ') !== -1 ? ' at ' : '@';
            while (stack.indexOf(e) !== -1)stack = stack.substring(stack.indexOf(e) + e.length);

            stack = stack.replace(/:\d+:\d+$/ig, "");

            for (i = scripts.length - 1; i > -1 && (script = scripts[i]); i--) {

                if (scripts[i].src === stack) {
                    return script;
                }


            }

        }


    }


    function memoize(name, deps, factory) {


        var realDeps = [];
        if (memoryModules[name]) throw new Error(name + " 模块已经存在");
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

    function wrapRequireCallback(name, deps, callback) {
        name = name + guid();

        memoryModules[name] = {
            deps   :deps,
            factory:callback
        }
        return name;
    }

    function isMemoize(name) {
        return memoryModules[name] ? true : false;
    }

    function isRequire(name) {
        return runedModules[name] === undefined ? false : true;
    }

    function isRun(name) {
        return runedModules[name] === undefined ? false : true;
    }

    function isLoading(name) {
        return loadingModules[name] ? true : false;
    }

    function exeModule(name) {

        var
            mod = memoryModules[name],
            deps = mod.deps,
            canExe = true,
            exportsMods = [];

        for (var i = 0; i < deps.length; i++) {

            if (!isRequire(deps[i])) {
                canExe = false;
            } else {
                exportsMods.push(runedModules[deps[i]].exports);
            }
        }

        if (!canExe) return;
        var exports;

        if(mod.factory){
            exports = mod.factory.apply(mod, requireMods);
        }


        memoryModules[name] = null;

        runedModules[name] ={
            name:name,
            exports:exports
        };

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


    /**
     * -------------------------------------------------------------
     * 定义模块
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

            //ie6-9 得到当前正在执行的script标签
            for (i = scripts.length - 1; i > -1 && (temp = scripts[i]); i--) {

                if (temp.readyState === 'interactive') {
                    script = temp;
                }
            }

        }

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
     *  加载模块
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
        var newRequire = function (deps, callback) {
            var needLoadDeps = [], name;
            //搜集依赖
            for (var i = 0; i < deps.length; i++) {
                name = deps[i] = normalize(deps[i], baseName);

                if (name && !isLoading(name) && !isRun(name) && !isMemoize(name)) {
                    needLoadDeps.push(name);
                }
            }
            if (callback) {
                var newModuleName = wrapRequireCallback(baseName, deps, callback);
            }

            if (needLoadDeps.length === 0) {

                callback && exeModule(newModuleName);
                return;
            }

            for (i = 0; i < needLoadDeps.length; i++) {
                newRequire.load(needLoadDeps[i], function (moduleName) {

                    var mod = memoryModules[moduleName], deps, name, needLoadDeps;
                    if (!mod) {
                        //throw new Error(name+ " load error");
                        notify(moduleName);
                    }
                    else {
                        deps = mod.deps;
                        for (var i = 0; i < deps.length; i++) {
                            name = mod.deps[i];
                            if (name && !isLoading(name) && !isRun(name) && !isMemoize(name)) {
                                needLoadDeps.push(name);
                            }
                        }
                    }

                    //子模块依然加载css

                    if (needLoadDeps.length > 0) {
                        mod.require(needLoadDeps);
                    }
                    else {
                        exeModule(moduleName);
                    }
                })

            }

        }
        newRequire.load = function (name, callback) {


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

                if (!currentModule) {
                    currentModule = {
                        name   :name,
                        deps   :[],
                        factory:function () {
                        }
                    }
                }


                var realName = memoize(name, currentModule.deps, currentModule.factory);

                definedModules.splice(index, 1);
                callback && callback(realName, modConfig);


                if (loadingModules[name]) {
                    delete loadingModules[name];
                }
            }

            if (name.indexOf(".css") !== -1) {
                if (loadingModules[name]) {
                    addLinkLoadListener(loadingModules[name], wrapCallback)
                } else {
                    loadingModules[name] = createLink({}, nameToUrl(name), wrapCallback);
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


            defaultConfig.pkgs = oldPkgs.concat(pkgs);


        };
        newRequire.normalize = function (n) {
            return normalize(n, baseName)
        }
        return newRequire;
    }

    require = createRequire(location.href);


    config("pkgs", {
        name:"self",
        path:currentPath
    })


    return      {
        define :define,
        require:require
    }

})(window);

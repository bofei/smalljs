/**
 * 定义SNS全局命名空间。如果SNS模块已经被定义，保障已经存在的SNS对象不会被覆盖。
 *
 * @namespace SNS
 * 这是SNS-jsskd的保留的全局变量，提供一些基础方法
 *  @todo:<ul>
 *              <li> 模块循环依赖问题;</li>
 *              <li> 此模块的自动更新问题;</li>
 *              <li> 检测KISSY是否存在;</li>
 *              <li> SNS.js可以支持被combo;</li>
 *              <li> 加载两次sns.js出现加载异常</li>
 *              <li> 支持非标准模块如 kissy.js</li>
 *              <li> 模块加载异常判断</li>
 *              <li> 手动强制刷新</li>
 *           </ul>
 * @author 伯飞
 * @date 2012.3.6

 */

var SNS = (function () {

    var
        toString = Object.prototype.toString,
        type = function (obj) {
            return obj == null ? String(obj) : toString.call(obj);
        },
        isFunction = function (obj) {
            return type(obj) === "[object Function]";
        },
        isArray = Array.isArray || function (obj) {
            return type(obj) === "[object Array]";
        },
        isPlainObject = function (o) {
            return o && toString.call(o) === '[object Object]' && 'isPrototypeOf' in o;
        },
        //实现深度mix,参考kissy1.2
        hasEnumBug = !({toString:1}.propertyIsEnumerable('toString')),
        hasOwn = Object.prototype.hasOwnProperty,
        emumProperties = [
            'hasOwnProperty',
            'isPrototypeOf',
            'propertyIsEnumerable',
            'toString',
            'toLocaleString',
            'valueOf'
        ],
        _mix = function (p, r, s, ov, deep) {
            if (ov || !(p in r)) {
                var target = r[p], src = s[p];
                // prevent never-end loop
                if (target === src) {
                    return;
                }
                // 来源是数组和对象，并且要求深度 mix
                if (deep && src && (isArray(src) || isPlainObject(src))) {
                    // 目标值为对象或数组，直接 mix
                    // 否则 新建一个和源值类型一样的空数组/对象，递归 mix
                    var clone = target && (isArray(target) || isPlainObject(target)) ?
                        target :
                        (isArray(src) ? [] : {});
                    r[p] = SNS.mix(clone, src, ov, undefined, true);
                } else if (src !== undefined) {
                    r[p] = s[p];
                }
            }
        },

        mix = function (r, s, ov, wl, deep) {
            if (!s || !r) {
                return r;
            }
            if (ov === undefined) {
                ov = true;
            }
            var i, p, len;

            if (wl && (len = wl.length)) {
                for (i = 0; i < len; i++) {
                    p = wl[i];
                    if (p in s) {
                        _mix(p, r, s, ov, deep);
                    }
                }
            } else {
                for (p in s) {
                    // no hasOwnProperty judge !
                    _mix(p, r, s, ov, deep);
                }

                // fix #101
                if (hasEnumBug) {
                    for (var j = 0; j < emumProperties.length; j++) {
                        p = emumProperties[j];
                        if (ov && hasOwn.call(s, p)) {
                            r[p] = s[p];
                        }
                    }
                }

            }
            return r;

        },


        domain = {

            assets:{
                product:"a.tbcdn.cn",
                daily  :"assets.daily.taobao.net"
            },
            server:{
                product:"taobao.com",
                daily  :"daily.taobao.net"
            }
        },
        dailyEnv,

        //简单判断淘宝的daily环境
        isDaily = function () {
            return dailyEnv ? dailyEnv : dailyEnv = ((location.hostname.indexOf(domain.server.daily) !== -1)|| location.protocol=="file:" );

        },
        buildURI = function () {

            var args = Array.prototype.slice.call(arguments);

            if (args.length < 2) {
                return args[0] || '';
            }

            var uri = args.shift();

            uri += uri.indexOf('?') > 0 ? '&' : '?';

            return uri + args.join('&').replace(/&+/g, '&');

        },


        addStamp = function (url) {

            return buildURI(url, 't=' + new Date().getTime());

        },
        addScriptLoadListener = function (script, callback) {

            if (script.attachEvent) {
                script.attachEvent("onreadystatechange", function () {
                    var rs = script.readyState;
                    if (rs === 'loaded' || rs === 'complete') {
                        callback&&callback();
                    }
                });
            } else {

                script.addEventListener("load", callback, false);
                script.addEventListener("error", function () {
                    console.log(script.src + " is error");
                    callback&&callback();
                }, false);
            }

        },
        head = document.getElementsByTagName("head")[0],
        getScript = function (configs, url, callback) {

            var node = document.createElement("script");
            node.type = "text/javascript";
            // node.charset = "utf-8";

            node.async = true;

            if (callback) addScriptLoadListener(node, callback);
            node.src = url;
            for (var p in configs) {
                node.setAttribute("data-" + p, configs[p]);
            }


            if (head.firstChild) {
                head.insertBefore(node, head.firstChild);
            } else {
                head.appendChild(node);
            }

            return node;
        },
        getCurrentScript = function () {

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


        },


        ansyFuns = {
            api    :"sns/core/api",
           // ui     :"sns/core/ui",
           // alert  :"sns/core/alert",
           // confirm:"sns/core/alert",
            ajax   :"sns/core/ajax"

        },
        configs = {
            pkgs   :{},
            mods   :{}, //{"name":"sns/follow", "version":"1.0",skin}
            widgets:{}//mods的变种， 名称可以简化如 sns/widget/like->like
        }
        ;


    var exports = /** @lends SNS */{

        /**
         * 区分daily环境和生产环境的淘宝cnd和服务端域名</br>

         * 淘宝域名：SNS.domain.server</br>
         * * 淘宝域名：SNS.domain.assets</br>
         */
        domain:{
            /**
             * @field cdn
             * @field server
             */
            assets:isDaily() ? "assets.daily.taobao.net" : "a.tbcdn.cn",
            server:isDaily() ? "daily.taobao.net" : "taobao.com"
        },

        /**
         * 简单判断当前的环境是不是淘宝daily环境
         * @function
         * @returns {Boolean}
         */
        isDaily   :isDaily,
        /**
         * 简单判断当前的环境是不是淘宝域下
         * @function
         * @returns {Boolean}
         */
        isTBDomain:function () {
            return !(location.hostname.indexOf(exports.domain.server) === -1)
        },

        /**
         * 根据当前的环境（daily or 生产环境）切换url的域名
         * @param url
         * @returns url 和当前环境相符的url
         */
        normalize    :function (url) {
            if (isDaily()) {
                url = url.replace(domain.assets.product, domain.assets.daily).replace(domain.server.product, domain.server.daily)
            }
            else  url = url.replace(domain.assets.daily, domain.assets.product).replace(domain.server.daily, domain.server.product)

            //


            return url;
        },
        /**
         * 给url添加查询参数,支持添加多个参数
         * @param url {string} 需要处理的url
         * @param queryString {string} 需要添加的字符串如'name=bofei'
         * @return url
         */
        addParams    :buildURI,
        /**
         *@ignore 内部使用
         */
        isFunction   :isFunction,
        /**
         *@ignore 内部使用
         */
        isArray      :isArray,
        /**
         *@ignore 内部使用
         */
        isPlainObject:isPlainObject,

        /**
         * 简单模块模式的封装，为SNS SDK内部更好管理和组件代码
         * @param {object || function} source 可以是一个object或者是一个方法，如果是一个方法，先执行，再将返回的object的 minin到SNS
         * @returns SNS全局变量
         */
        provide              :function (source) {
            if (typeof source === "function") source = source();
            for (var p in source) {
                if (this[p] === undefined) {
                    this[p] = source[p];
                }
            }

            return this;
        },
        /**
         * 本地存储,如果value不存在，反对应Key的value值
         * @param key {string}
         * @param value {string}
         *
         */

        storage              :function (key, value) {

            var ls = window.localStorage,
                useObject = document.documentElement;

            if (ls) {
                if (value) {

                    ls.setItem(key, value);
                }
                else return ls.getItem(key);

            } else {
                try {
                    if (!useObject.style.behavior)useObject.style.behavior = 'url(#default#userData)';
                    if (value) {
                        useObject.setAttribute(key, value);
                        useObject.save("sns");

                    }
                    else {
                        useObject.load("sns");
                        return useObject.getAttribute(key);

                    }
                } catch (e) {

                }
            }
        },
        getScript            :getScript,
        addScriptLoadListener:addScriptLoadListener,

        /**
         * core.js的路径
         *
         */
        baseURI              :getCurrentScript().src,

        /**
         * 生成一个随机数
         * @returns {string}
         */
        guid:function () {
            return 'sns' + (Math.random() * (1 << 30)).toString(16).replace('.', '');
        },

        /**
         * 设置相关的配置
         * @param name {string}  配置的名称如mods(模块配置)，pkgs(包配置)
         * @param value {any} 配置的值
         * @returns  配置后的结果
         * @example
         *    配置包:
         *    SNS.config("pkgs",{
         *       name:"sns", //名称
         *       path:"http://a.tbcdn.cn/p/snsdk/src/{version}/",//可以设置版本
         *       version:"1.0"
         *     })
         *
         * @example
         *    配置模块
         *    SNS.config("mods",{
         *       name:"sns/follow", //名称
         *       skin:null, //不加载样式
         *       version:"2.0"//默认使用的版本
         *       combo:["sns/api"]//减少请求数，combo加载
         *     })
         *
         *  @todo combo配置可添加而不是覆盖
         */

        config:function (name, value) {
            var result;
            if (value !== undefined) {
                if (name === "pkgs" || name === "mods" || name === "widgets") {


                    if (isPlainObject(value)) {
                        if (name === "widgets") {
                            var realname = "mods";
                            var oldName = value.name;
                            var newName = "sns/widget/" + value.name;
                            value.name = newName;
                            var subCfg = configs[realname] = configs[realname] ? configs[realname] : {};
                            subCfg[newName] = mix(subCfg[newName] || {}, value);
                            var allsubCfg  = subCfg["*"]||{};

                            
                            result = mix(mix({},allsubCfg),subCfg[newName]);
                            result.name = oldName;

                        }
                        else {
                            var subCfg = configs[name] = configs[name] ? configs[name] : {};
                            subCfg[value.name] = mix(subCfg[value.name] || {}, value);
                            var allsubCfg  = subCfg["*"]||{};

                            result = mix(mix({},allsubCfg),subCfg[value.name]);


                        };



                    }


                } else {
                    result = configs[name] = value;
                }

            }
            else result = configs[name];

            return result;

        },
        /**
         * 常用的扩展对象的方法（参考KISSY1.2）
         * @param target {object} 被扩展的对象
         * @param source {object} 原始对象
         * @parma overwirite {Bool内部使用ean} 是否强制覆盖
         * @returns 被扩展的对象
         * @ignore
         */
        mix   :mix,

        isDebug:function () {
            return location.href.indexOf("sns-debug=true") !== -1;
        }


    }


    for (var p in ansyFuns) {

        ansyFuns[p] = (function (methorName, modName) {
            return function () {
                var args = arguments;

                SNS.require([modName], function (fun) {

                    if (isFunction(fun)) {

                        fun.apply(SNS, args);
                    }
                    else if (isPlainObject(fun) && isFunction(fun[methorName])) {
                        fun[methorName].apply(SNS, args);
                    }

                })
            }
        })(p, ansyFuns[p])

    }

    exports.provide(ansyFuns);


    if (typeof SNS !== 'undefined') {
        //保证SNS1.0和1.1和功能正常使用
        exports = exports.provide.call(SNS, exports);
    }

    //配置
    /*
    var comboRequire =['sns/core/widget']

    if(!window.KISSY){
        var kissyurl = exports.normalize("http://a.tbcdn.cn/s/kissy/1.2.0/kissy.js");
        exports.config("mods", {
            name   :kissyurl,
            factory:function () {
                KISSY.Config.base = exports.normalize("http://a.tbcdn.cn/s/kissy/1.2.0/");
            }
        })
        comboRequire.push(kissyurl)
    }

    exports.config("mods", {
        name :"*",
        combo:comboRequire
    })

   if(exports.isDebug()){
       exports.config("supportCombo", false);
   }
    else{
       exports.config("supportCombo", false);
   }
*/


    //配置初始化的时间，以判断登录失效时间
    exports.config("logintime",new Date().getTime());


    return exports;

})();

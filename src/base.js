/**
 * ����SNSȫ�������ռ䡣���SNSģ���Ѿ������壬�����Ѿ����ڵ�SNS���󲻻ᱻ���ǡ�
 *
 * @namespace SNS
 * ����SNS-jsskd�ı�����ȫ�ֱ������ṩһЩ��������
 *  @todo:<ul>
 *              <li> ģ��ѭ����������;</li>
 *              <li> ��ģ����Զ���������;</li>
 *              <li> ���KISSY�Ƿ����;</li>
 *              <li> SNS.js����֧�ֱ�combo;</li>
 *              <li> ��������sns.js���ּ����쳣</li>
 *              <li> ֧�ַǱ�׼ģ���� kissy.js</li>
 *              <li> ģ������쳣�ж�</li>
 *              <li> �ֶ�ǿ��ˢ��</li>
 *           </ul>
 * @author ����
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
        //ʵ�����mix,�ο�kissy1.2
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
                // ��Դ������Ͷ��󣬲���Ҫ����� mix
                if (deep && src && (isArray(src) || isPlainObject(src))) {
                    // Ŀ��ֵΪ��������飬ֱ�� mix
                    // ���� �½�һ����Դֵ����һ���Ŀ�����/���󣬵ݹ� mix
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

        //���ж��Ա���daily����
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

                //ie6-9 �õ���ǰ����ִ�е�script��ǩ
                for (i = scripts.length - 1; i > -1 && (script = scripts[i]); i--) {


                    if (script.readyState === 'interactive') {

                        return script;
                    }
                }

            }
            else {

                // �ο� https://github.com/samyk/jiagra/blob/master/jiagra.js
                // chrome and firefox4��ǰ�İ汾

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
            widgets:{}//mods�ı��֣� ���ƿ��Լ��� sns/widget/like->like
        }
        ;


    var exports = /** @lends SNS */{

        /**
         * ����daily�����������������Ա�cnd�ͷ��������</br>

         * �Ա�������SNS.domain.server</br>
         * * �Ա�������SNS.domain.assets</br>
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
         * ���жϵ�ǰ�Ļ����ǲ����Ա�daily����
         * @function
         * @returns {Boolean}
         */
        isDaily   :isDaily,
        /**
         * ���жϵ�ǰ�Ļ����ǲ����Ա�����
         * @function
         * @returns {Boolean}
         */
        isTBDomain:function () {
            return !(location.hostname.indexOf(exports.domain.server) === -1)
        },

        /**
         * ���ݵ�ǰ�Ļ�����daily or �����������л�url������
         * @param url
         * @returns url �͵�ǰ���������url
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
         * ��url��Ӳ�ѯ����,֧����Ӷ������
         * @param url {string} ��Ҫ�����url
         * @param queryString {string} ��Ҫ��ӵ��ַ�����'name=bofei'
         * @return url
         */
        addParams    :buildURI,
        /**
         *@ignore �ڲ�ʹ��
         */
        isFunction   :isFunction,
        /**
         *@ignore �ڲ�ʹ��
         */
        isArray      :isArray,
        /**
         *@ignore �ڲ�ʹ��
         */
        isPlainObject:isPlainObject,

        /**
         * ��ģ��ģʽ�ķ�װ��ΪSNS SDK�ڲ����ù�����������
         * @param {object || function} source ������һ��object������һ�������������һ����������ִ�У��ٽ����ص�object�� minin��SNS
         * @returns SNSȫ�ֱ���
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
         * ���ش洢,���value�����ڣ�����ӦKey��valueֵ
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
         * core.js��·��
         *
         */
        baseURI              :getCurrentScript().src,

        /**
         * ����һ�������
         * @returns {string}
         */
        guid:function () {
            return 'sns' + (Math.random() * (1 << 30)).toString(16).replace('.', '');
        },

        /**
         * ������ص�����
         * @param name {string}  ���õ�������mods(ģ������)��pkgs(������)
         * @param value {any} ���õ�ֵ
         * @returns  ���ú�Ľ��
         * @example
         *    ���ð�:
         *    SNS.config("pkgs",{
         *       name:"sns", //����
         *       path:"http://a.tbcdn.cn/p/snsdk/src/{version}/",//�������ð汾
         *       version:"1.0"
         *     })
         *
         * @example
         *    ����ģ��
         *    SNS.config("mods",{
         *       name:"sns/follow", //����
         *       skin:null, //��������ʽ
         *       version:"2.0"//Ĭ��ʹ�õİ汾
         *       combo:["sns/api"]//������������combo����
         *     })
         *
         *  @todo combo���ÿ���Ӷ����Ǹ���
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
         * ���õ���չ����ķ������ο�KISSY1.2��
         * @param target {object} ����չ�Ķ���
         * @param source {object} ԭʼ����
         * @parma overwirite {Bool�ڲ�ʹ��ean} �Ƿ�ǿ�Ƹ���
         * @returns ����չ�Ķ���
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
        //��֤SNS1.0��1.1�͹�������ʹ��
        exports = exports.provide.call(SNS, exports);
    }

    //����
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


    //���ó�ʼ����ʱ�䣬���жϵ�¼ʧЧʱ��
    exports.config("logintime",new Date().getTime());


    return exports;

})();

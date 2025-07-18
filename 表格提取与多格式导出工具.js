// ==UserScript==
// @name         表格提取与多格式导出工具（增强版）
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  自动检测网页中的表格，支持多种格式导出和快捷键操作，文件名优先使用表格上方的小标题。
// @author       Will
// @match        *://*/*
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/542879/%E8%A1%A8%E6%A0%BC%E6%8F%90%E5%8F%96%E4%B8%8E%E5%A4%9A%E6%A0%BC%E5%BC%8F%E5%AF%BC%E5%87%BA%E5%B7%A5%E5%85%B7%EF%BC%88%E5%A2%9E%E5%BC%BA%E7%89%88%EF%BC%89.user.js
// @updateURL https://update.greasyfork.org/scripts/542879/%E8%A1%A8%E6%A0%BC%E6%8F%90%E5%8F%96%E4%B8%8E%E5%A4%9A%E6%A0%BC%E5%BC%8F%E5%AF%BC%E5%87%BA%E5%B7%A5%E5%85%B7%EF%BC%88%E5%A2%9E%E5%BC%BA%E7%89%88%EF%BC%89.meta.js
// ==/UserScript==

(function () {
    "use strict";

    /* 本地嵌入 hotkeys-js 库 */
    (function (global, factory) {
        typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
        (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.hotkeys = factory());
    }(this, (function () {
        /*! hotkeys-js v3.13.15 | MIT © 2025 kenny wong <wowohoo@qq.com> https://jaywcjlove.github.io/hotkeys-js */
        ((e,t)=>{"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e="undefined"!=typeof globalThis?globalThis:e||self).hotkeys=t()})(this,function(){var e="undefined"!=typeof navigator&&0<navigator.userAgent.toLowerCase().indexOf("firefox");function u(e,t,n,o){e.addEventListener?e.addEventListener(t,n,o):e.attachEvent&&e.attachEvent("on".concat(t),n)}function i(e,t,n,o){e.removeEventListener?e.removeEventListener(t,n,o):e.detachEvent&&e.detachEvent("on".concat(t),n)}function h(t,e){var n=e.slice(0,e.length-1);for(let e=0;e<n.length;e++)n[e]=t[n[e].toLowerCase()];return n}function k(e){var t=(e=(e="string"!=typeof e?"":e).replace(/\s/g,"")).split(",");let n=t.lastIndexOf("");for(;0<=n;)t[n-1]+=",",t.splice(n,1),n=t.lastIndexOf("");return t}let o={backspace:8,"\u232b":8,tab:9,clear:12,enter:13,"\u21a9":13,return:13,esc:27,escape:27,space:32,left:37,up:38,right:39,down:40,arrowup:38,arrowdown:40,arrowleft:37,arrowright:39,del:46,delete:46,ins:45,insert:45,home:36,end:35,pageup:33,pagedown:34,capslock:20,num_0:96,num_1:97,num_2:98,num_3:99,num_4:100,num_5:101,num_6:102,num_7:103,num_8:104,num_9:105,num_multiply:106,num_add:107,num_enter:108,num_subtract:109,num_decimal:110,num_divide:111,"\u21ea":20,",":188,".":190,"/":191,"`":192,"-":e?173:189,"=":e?61:187,";":e?59:186,"'":222,"{":219,"}":221,"[":219,"]":221,"\\":220},m={"\u21e7":16,shift:16,"\u2325":18,alt:18,option:18,"\u2303":17,ctrl:17,control:17,"\u2318":91,cmd:91,meta:91,command:91},g={16:"shiftKey",18:"altKey",17:"ctrlKey",91:"metaKey",shiftKey:16,ctrlKey:17,altKey:18,metaKey:91},w={16:!1,18:!1,17:!1,91:!1},v={};for(let e=1;e<20;e++)o["f".concat(e)]=111+e;let O=[],b=null,t="all",E=new Map,K=e=>o[e.toLowerCase()]||m[e.toLowerCase()]||e.toUpperCase().charCodeAt(0);function l(e){t=e||"all"}function j(){return t||"all"}function C(n){if(void 0===n)Object.keys(v).forEach(e=>{Array.isArray(v[e])&&v[e].forEach(e=>a(e)),delete v[e]}),s(null);else if(Array.isArray(n))n.forEach(e=>{e.key&&a(e)});else if("object"==typeof n)n.key&&a(n);else if("string"==typeof n){for(var o=arguments.length,r=Array(1<o?o-1:0),i=1;i<o;i++)r[i-1]=arguments[i];let[e,t]=r;"function"==typeof e&&(t=e,e=""),a({key:n,scope:e,method:t,splitKey:"+"})}}let a=e=>{let{key:t,scope:i,method:l,splitKey:n="+"}=e;k(t).forEach(e=>{var e=e.split(n),t=e.length,r=e[t-1],r="*"===r?"*":K(r);if(v[r]){i=i||j();let n=1<t?h(m,e):[],o=[];v[r]=v[r].filter(e=>{var t=(!l||e.method===l)&&e.scope===i&&((e,t)=>{var n=e.length<t.length?t:e,o=e.length<t.length?e:t;let r=!0;for(let e=0;e<n.length;e++)~o.indexOf(n[e])||(r=!1);return r})(e.mods,n);return t&&o.push(e.element),!t}),o.forEach(e=>s(e))}})};function x(t,n,o,e){if(n.element===e){let e;if(n.scope===o||"all"===n.scope){for(var r in e=0<n.mods.length,w)Object.prototype.hasOwnProperty.call(w,r)&&(!w[r]&&~n.mods.indexOf(+r)||w[r]&&!~n.mods.indexOf(+r))&&(e=!1);(0!==n.mods.length||w[16]||w[18]||w[17]||w[91])&&!e&&"*"!==n.shortcut||(n.keys=[],n.keys=n.keys.concat(O),!1===n.method(t,n)&&(t.preventDefault?t.preventDefault():t.returnValue=!1,t.stopPropagation&&t.stopPropagation(),t.cancelBubble)&&(t.cancelBubble=!0))}}}function L(n,t){var e,o=v["*"];let r=n.keyCode||n.which||n.charCode;if((!n.key||"capslock"!=n.key.toLowerCase())&&_.filter.call(this,n)){if(93!==r&&224!==r||(r=91),~O.indexOf(r)||229===r||O.push(r),["metaKey","ctrlKey","altKey","shiftKey"].forEach(e=>{var t=g[e];n[e]&&!~O.indexOf(t)?O.push(t):!n[e]&&~O.indexOf(t)?O.splice(O.indexOf(t),1):"metaKey"===e&&n[e]&&(O=O.filter(e=>e in g||e===r))}),r in w){for(var i in w[r]=!0,m)Object.prototype.hasOwnProperty.call(m,i)&&(e=g[m[i]],_[i]=n[e]);if(!o)return}for(var l in w)Object.prototype.hasOwnProperty.call(w,l)&&(w[l]=n[g[l]]);n.getModifierState&&(!n.altKey||n.ctrlKey)&&n.getModifierState("AltGraph")&&(~O.indexOf(17)||O.push(17),~O.indexOf(18)||O.push(18),w[17]=!0,w[18]=!0);var a=j();if(o)for(let e=0;e<o.length;e++)o[e].scope===a&&("keydown"===n.type&&o[e].keydown||"keyup"===n.type&&o[e].keyup)&&x(n,o[e],a,t);if(r in v){var s=v[r],c=s.length;for(let e=0;e<c;e++)if(("keydown"===n.type&&s[e].keydown||"keyup"===n.type&&s[e].keyup)&&s[e].key){var f=s[e],p=f.splitKey,d=f.key.split(p),y=[];for(let e=0;e<d.length;e++)y.push(K(d[e]));y.sort().join("")===O.sort().join("")&&x(n,f,a,t)}}}}function _(e,t,n){O=[];var o,r=k(e);let i=[],l="all",a=document,s=0,c=!1,f=!0,p="+",d=!1,y=!1;for(void 0===n&&"function"==typeof t&&(n=t),"[object Object]"===Object.prototype.toString.call(t)&&(t.scope&&(l=t.scope),t.element&&(a=t.element),t.keyup&&(c=t.keyup),void 0!==t.keydown&&(f=t.keydown),void 0!==t.capture&&(d=t.capture),"string"==typeof t.splitKey&&(p=t.splitKey),!0===t.single)&&(y=!0),"string"==typeof t&&(l=t),y&&C(e,l);s<r.length;s++)e=r[s].split(p),i=[],1<e.length&&(i=h(m,e)),(e="*"===(e=e[e.length-1])?"*":K(e))in v||(v[e]=[]),v[e].push({keyup:c,keydown:f,scope:l,mods:i,shortcut:r[s],method:n,key:r[s],splitKey:p,element:a});void 0!==a&&window&&(E.has(a)||(t=function(){return L(0<arguments.length&&void 0!==arguments[0]?arguments[0]:window.event,a)},o=function(){var t=0<arguments.length&&void 0!==arguments[0]?arguments[0]:window.event;L(t,a);{let e=t.keyCode||t.which||t.charCode;t.key&&"capslock"==t.key.toLowerCase()&&(e=K(t.key));var n=O.indexOf(e);if(n<0||O.splice(n,1),t.key&&"meta"==t.key.toLowerCase()&&O.splice(0,O.length),(e=93!==e&&224!==e?e:91)in w)for(var o in w[e]=!1,m)m[o]===e&&(_[o]=!1)}},E.set(a,{keydownListener:t,keyupListenr:o,capture:d}),u(a,"keydown",t,d),u(a,"keyup",o,d)),b||(t=()=>{O=[]},b={listener:t,capture:d},u(window,"focus",t,d)))}function s(t){var e,n,o,r=Object.values(v).flat();r.findIndex(e=>{e=e.element;return e===t})<0&&({keydownListener:o,keyupListenr:n,capture:e}=E.get(t)||{},o)&&n&&(i(t,"keyup",n,e),i(t,"keydown",o,e),E.delete(t)),0<r.length&&0<E.size||(Object.keys(E).forEach(e=>{var{keydownListener:t,keyupListenr:n,capture:o}=E.get(e)||{};t&&n&&(i(e,"keyup",n,o),i(e,"keydown",t,o),E.delete(e))}),E.clear(),Object.keys(v).forEach(e=>delete v[e]),b&&({listener:n,capture:o}=b,i(window,"focus",n,o),b=null))}var n,r={getPressedKeyString:function(){return O.map(e=>{return n=e,Object.keys(o).find(e=>o[e]===n)||(t=e,Object.keys(m).find(e=>m[e]===t))||String.fromCharCode(e);var t,n})},setScope:l,getScope:j,deleteScope:function(e,t){var n,o;let r;for(o in e=e||j(),v)if(Object.prototype.hasOwnProperty.call(v,o))for(n=v[o],r=0;r<n.length;)n[r].scope===e?n.splice(r,1).forEach(e=>{e=e.element;return s(e)}):r++;j()===e&&l(t||"all")},getPressedKeyCodes:function(){return O.slice(0)},getAllKeyCodes:function(){let r=[];return Object.keys(v).forEach(e=>{v[e].forEach(e=>{var{key:e,scope:t,mods:n,shortcut:o}=e;r.push({scope:t,shortcut:o,mods:n,keys:e.split("+").map(e=>K(e))})})}),r},isPressed:function(e){return"string"==typeof e&&(e=K(e)),!!~O.indexOf(e)},filter:function(e){var t=(e=e.target||e.srcElement).tagName;let n=!0;var o="INPUT"===t&&!["checkbox","radio","range","button","file","reset","submit","color"].includes(e.type);return n=!e.isContentEditable&&(!o&&"TEXTAREA"!==t&&"SELECT"!==t||e.readOnly)?n:!1},trigger:function(t){let n=1<arguments.length&&void 0!==arguments[1]?arguments[1]:"all";Object.keys(v).forEach(e=>{v[e].filter(e=>e.scope===n&&e.shortcut===t).forEach(e=>{e&&e.method&&e.method()})})},unbind:C,keyMap:o,modifier:m,modifierMap:g};for(n in r)Object.prototype.hasOwnProperty.call(r,n)&&(_[n]=r[n]);if("undefined"!=typeof window){let t=window.hotkeys;_.noConflict=e=>(e&&window.hotkeys===_&&(window.hotkeys=t),_),window.hotkeys=_}return _});
    })));

    // 添加样式
    GM_addStyle(`
        .table-extract-button {
            position: absolute;
            background-color: #4CAF50;
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            font-size: 12px;
            display: none; /* 默认隐藏 */
        }
        #global-extract-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #007BFF;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }
        #export-menu {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #fff;
            padding: 20px;
            border: 1px solid #ccc;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            z-index: 10000;
        }
        #preview-window {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #fff;
            padding: 20px;
            border: 1px solid #ccc;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            z-index: 10001;
            max-height: 80vh;
            overflow-y: auto;
        }
        .status-message {
            margin-top: 10px;
            font-size: 14px;
            color: green;
        }
        .error-message {
            margin-top: 10px;
            font-size: 14px;
            color: red;
        }
    `);

    // 创建全局提取按钮
    const createGlobalExtractButton = () => {
        const button = document.createElement("div");
        button.id = "global-extract-button";
        button.textContent = "提取所有表格";
        button.addEventListener("click", extractAllTables);
        document.body.appendChild(button);
    };

    // 创建单个表格提取按钮
    const createExtractButton = (table) => {
        const button = document.createElement("div");
        button.textContent = "提取表格";
        button.classList.add("table-extract-button");

        // 固定按钮位置
        const rect = table.getBoundingClientRect();
        button.style.top = `${rect.top + window.scrollY}px`;
        button.style.left = `${rect.right + window.scrollX + 10}px`;
        document.body.appendChild(button);

        let hideTimeout;

        // 鼠标进入表格范围时显示按钮
        table.addEventListener("mouseenter", () => {
            clearTimeout(hideTimeout); // 清除隐藏按钮的定时器
            button.style.display = "block"; // 显示按钮
        });

        // 鼠标离开表格范围时延迟隐藏按钮
        table.addEventListener("mouseleave", () => {
            hideTimeout = setTimeout(() => {
                button.style.display = "none"; // 隐藏按钮
            }, 1000); // 延迟 1 秒隐藏按钮
        });

        // 鼠标进入按钮时清除隐藏按钮的定时器
        button.addEventListener("mouseenter", () => {
            clearTimeout(hideTimeout);
        });

        // 鼠标离开按钮时隐藏按钮
        button.addEventListener("mouseleave", () => {
            hideTimeout = setTimeout(() => {
                button.style.display = "none"; // 隐藏按钮
            }, 1000); // 延迟 1 秒隐藏按钮
        });

        // 添加点击事件
        button.addEventListener("click", () => {
            extractTableData(table);
        });
    };

    // 提取表格数据
    const extractTableData = (table) => {
        const rows = Array.from(table.querySelectorAll("tr"));
        const data = rows.map((row) => {
            return Array.from(row.querySelectorAll("td, th")).map((cell) => cell.innerText.trim());
        });

        showExportMenu(data, guessTableName(table), table);
    };

    // 显示导出菜单
    const showExportMenu = (data, filename, table) => {
        if (document.getElementById("export-menu")) return;

        const menu = document.createElement("div");
        menu.id = "export-menu";
        menu.innerHTML = `
            <h3 style="margin-top: 0;">选择导出格式：</h3>
            <button class="export-btn" data-format="json">JSON</button>
            <button class="export-btn" data-format="csv">CSV</button>
            <button class="export-btn" data-format="excel">Excel</button>
            <button class="export-btn" data-format="markdown">Markdown</button>
            <button class="export-btn" data-format="sql">SQL</button>
            <button class="export-btn" data-format="html">HTML (带样式)</button>
            <button class="export-btn" data-format="pdf-formatted">PDF (带格式)</button>
            <button class="export-btn" data-format="pdf-text">PDF (纯文本)</button>
            <button id="preview-data-btn">数据预览</button>
            <button id="copy-original-btn">复制到剪贴板（原格式）</button>
            <button id="copy-markdown-btn">复制到剪贴板（Markdown）</button>
            <button onclick="document.getElementById('export-menu').remove();">关闭</button>
            <div class="status-message" id="status-message"></div>
        `;

        document.body.appendChild(menu);

        // 绑定导出按钮事件
        document.querySelectorAll(".export-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const format = btn.dataset.format;
                exportData(data, format, filename, table).then((success) => {
                    const statusMessage = document.getElementById("status-message");
                    if (success) {
                        statusMessage.textContent = `导出成功：${format.toUpperCase()} 文件已生成！`;
                        statusMessage.className = "status-message";
                    } else {
                        statusMessage.textContent = `导出失败：请检查控制台错误信息！`;
                        statusMessage.className = "error-message";
                    }
                });
            });
        });

        // 绑定数据预览事件
        document.getElementById("preview-data-btn").addEventListener("click", () => {
            showPreviewWindow(data);
        });

        // 绑定复制到剪贴板事件
        document.getElementById("copy-original-btn").addEventListener("click", () => {
            copyToClipboard(data, "original");
        });
        document.getElementById("copy-markdown-btn").addEventListener("click", () => {
            copyToClipboard(data, "markdown");
        });
    };

    // 导出数据
    const exportData = async (data, format, filename, table) => {
        try {
            let finalFilename;
            switch (format) {
                case "json":
                    finalFilename = `${filename}.json`;
                    saveFile(JSON.stringify(data, null, 2), finalFilename, "application/json");
                    break;
                case "csv":
                    finalFilename = `${filename}.csv`;
                    saveFile(toCSV(data), finalFilename, "text/csv");
                    break;
                case "excel":
                    finalFilename = `${filename}.xlsx`;
                    saveExcel(data, finalFilename);
                    break;
                case "markdown":
                    finalFilename = `${filename}.md`;
                    saveFile(toMarkdown(data), finalFilename, "text/plain");
                    break;
                case "sql":
                    finalFilename = `${filename}.sql`;
                    saveFile(toSQL(data), finalFilename, "text/plain");
                    break;
                case "html":
                    finalFilename = `${filename}.html`;
                    saveHTMLWithStyle(table, finalFilename);
                    break;
                case "pdf-formatted":
                    finalFilename = `${filename}.pdf`;
                    await savePDFFormatted(table, finalFilename);
                    break;
                case "pdf-text":
                    finalFilename = `${filename}.pdf`;
                    await savePDFText(data, finalFilename);
                    break;
                default:
                    alert("不支持的格式！");
                    return false;
            }
            return true; // 成功
        } catch (error) {
            console.error("导出失败：", error);
            return false; // 失败
        }
    };

    // 转换为 CSV 格式
    const toCSV = (data) => {
        return data.map((row) => row.join(",")).join("\n");
    };

    // 转换为 Markdown 格式
    const toMarkdown = (data) => {
        const header = data[0];
        const body = data.slice(1);
        const headerLine = "|" + header.join("|") + "|";
        const separator = "|" + header.map(() => "---").join("|") + "|";
        const bodyLines = body.map((row) => "|" + row.join("|") + "|");
        return [headerLine, separator, ...bodyLines].join("\n");
    };

    // 转换为 SQL 格式
    const toSQL = (data) => {
        const tableName = "my_table";
        const columns = data[0];
        const values = data.slice(1).map((row) =>
            row.map((value) => `"${value.replace(/"/g, '\\"')}"`).join(", ")
        );
        const insertStatements = values.map((val) => `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${val});`);
        return insertStatements.join("\n");
    };

    // 保存为 HTML 文件（保留表格样式）
    const saveHTMLWithStyle = (table, filename) => {
        const cloneTable = table.cloneNode(true); // 克隆表格节点
        const wrapper = document.createElement("div");
        wrapper.appendChild(cloneTable);
        const htmlContent = wrapper.innerHTML;
        saveFile(htmlContent, `${filename}.html`, "text/html");
    };

    // 保存为 PDF（带格式）
    const savePDFFormatted = (table, filename) => {
        return new Promise((resolve, reject) => {
            html2canvas(table).then((canvas) => {
                const imgData = canvas.toDataURL("image/png");
                const pdf = new jspdf.jsPDF();
                const imgWidth = 210; // A4 宽度
                const pageHeight = 297; // A4 高度
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                let heightLeft = imgHeight;

                pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft >= 0) {
                    pdf.addPage();
                    pdf.addImage(imgData, "PNG", 0, -pageHeight + heightLeft, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }

                pdf.save(`${filename}`);
                resolve();
            }).catch(reject);
        });
    };

    // 保存为 PDF（纯文本）
    const savePDFText = (data, filename) => {
        return new Promise((resolve, reject) => {
            const pdf = new jspdf.jsPDF();
            pdf.addFont("https://cdn.jsdelivr.net/gh/fengyuanchen/jsdocx@master/fonts/MicrosoftYaHei-normal.ttf", "MicrosoftYaHei", "normal");
            pdf.setFont("MicrosoftYaHei");

            const pageHeight = 297; // A4 高度
            let currentHeight = 10;

            data.forEach((row) => {
                const line = row.join(" | ");
                if (currentHeight > pageHeight - 10) {
                    pdf.addPage();
                    currentHeight = 10;
                }
                pdf.text(line, 10, currentHeight);
                currentHeight += 10;
            });

            pdf.save(`${filename}`);
            resolve();
        });
    };

    // 复制到剪贴板
    const copyToClipboard = (data, format) => {
        let content;
        if (format === "markdown") {
            const header = data[0];
            const body = data.slice(1);
            const headerLine = "|" + header.join("|") + "|";
            const separator = "|" + header.map(() => "---").join("|") + "|";
            const bodyLines = body.map((row) => "|" + row.join("|") + "|");
            content = [headerLine, separator, ...bodyLines].join("\n");
        } else {
            content = data.map((row) => row.join("\t")).join("\n"); // 原格式（Tab 分隔）
        }

        navigator.clipboard.writeText(content).then(() => {
            alert("内容已复制到剪贴板！");
        }).catch((error) => {
            console.error("复制失败：", error);
            alert("复制失败，请检查控制台！");
        });
    };

    // 保存文件
    const saveFile = (content, filename, mimeType) => {
        const blob = new Blob([content], { type: mimeType });
        saveAs(blob, filename);
    };

    // 保存 Excel 文件
    const saveExcel = (data, filename) => {
        try {
            const worksheet = XLSX.utils.aoa_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
            XLSX.writeFile(workbook, filename);
        } catch (error) {
            console.error("Excel 导出失败：", error);
            alert(`Excel 导出失败，请检查控制台：${error.message}`);
        }
    };

    // 尝试猜测表格的小标题名称
    const guessTableName = (table) => {
        let parent = table.parentElement;
        while (parent && parent.tagName !== "BODY") {
            const header = parent.querySelector("h1, h2, h3, p, span, div");
            if (header && header.innerText.trim()) {
                return header.innerText.trim().replace(/\s+/g, "_").replace(/[^\w]/g, "");
            }
            parent = parent.parentElement;
        }
        return "table"; // 默认文件名
    };

    // 批量提取所有表格
    const extractAllTables = () => {
        const tables = Array.from(document.querySelectorAll("table")).filter((table) => {
            const rows = table.querySelectorAll("tr");
            return rows.length >= 2 && Array.from(rows).some((row) => row.children.length >= 2);
        });

        if (tables.length === 0) {
            alert("未找到符合条件的表格！");
            return;
        }

        const allData = tables.flatMap((table) => {
            const rows = Array.from(table.querySelectorAll("tr"));
            return rows.map((row) => {
                return Array.from(row.querySelectorAll("td, th")).map((cell) => cell.innerText.trim());
            });
        });

        showBatchExportMenu(allData);
    };

    // 显示批量导出菜单
    const showBatchExportMenu = (data) => {
        const menu = document.createElement("div");
        menu.id = "batch-export-menu";
        menu.style.position = "fixed";
        menu.style.top = "50%";
        menu.style.left = "50%";
        menu.style.transform = "translate(-50%, -50%)";
        menu.style.backgroundColor = "#fff";
        menu.style.padding = "20px";
        menu.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
        menu.style.zIndex = "10000";

        menu.innerHTML = `
            <h3>批量导出选项：</h3>
            <button id="export-all-separate">逐个导出</button>
            <button id="export-all-merged">合并导出</button>
            <button onclick="document.getElementById('batch-export-menu').remove();">关闭</button>
        `;

        document.body.appendChild(menu);

        // 逐个导出
        document.getElementById("export-all-separate").addEventListener("click", () => {
            alert("逐个导出暂未实现！");
            menu.remove();
        });

        // 合并导出
        document.getElementById("export-all-merged").addEventListener("click", () => {
            exportData(data, "excel", "merged_tables").then((success) => {
                if (success) {
                    alert("所有表格已合并导出！");
                } else {
                    alert("导出失败，请检查控制台错误信息！");
                }
                menu.remove();
            });
        });
    };

    // 显示数据预览窗口
    const showPreviewWindow = (data) => {
        const previewWindow = document.createElement("div");
        previewWindow.id = "preview-window";
        previewWindow.innerHTML = `
            <h3>数据预览</h3>
            <table border="1">
                ${data.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
            </table>
            <button onclick="document.getElementById('preview-window').remove();">关闭</button>
        `;
        document.body.appendChild(previewWindow);
    };

    // 自动检测表格并添加提取按钮
    const detectTables = () => {
        document.querySelectorAll("table").forEach((table) => {
            const rows = table.querySelectorAll("tr");
            if (rows.length >= 2 && Array.from(rows).some((row) => row.children.length >= 2)) {
                createExtractButton(table);
            }
        });
    };

    // 页面加载完成后执行
    window.addEventListener("load", () => {
        createGlobalExtractButton();
        detectTables();
    });

    // 快捷键支持
    hotkeys("alt+e", (event) => {
        event.preventDefault();
        const targetTable = document.querySelector("table:hover");
        if (targetTable) {
            extractTableData(targetTable);
        } else {
            alert("请将鼠标悬停在一个表格上！");
        }
    });
})();

// ==UserScript==
// @name         Generate webpage links through markdown (triggered by right-click)
// @name:zh-CN   markdown生成网页链接（右键触发）
// @namespace    http://tampermonkey.net/
// @version      0.1.3
// @description  Generate Markdown link for the current page when right-click and copy it to the clipboard
// @description:zh-CN  右键点击时生成当前页面的Markdown链接并复制到剪贴板
// @author       Will
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        clipboard.writeText
// @grant        GM_notification
// @homepage     https://github.com/jwq2011/TamperMonkey-Scripts
// @supportURL   https://github.com/jwq2011/TamperMonkey-Scripts/issues
// ==/UserScript==

(function () {
    'use strict';

    // 生成 Markdown 格式的链接
    function getMdToUrl(title, url) {
        return `[${title}](${url})`;
    }

    // 使用现代 API 复制文本
    function copyText(text) {
        navigator.clipboard.writeText(text)
            .then(() => {
                GM_notification({
                    title: "✅ Markdown 链接已复制",
                    text: "已成功复制当前页面的 Markdown 链接到剪贴板。",
                    timeout: 3000
                });
            })
            .catch(err => {
                console.error('无法复制文本: ', err);
                GM_notification({
                    title: "❌ 复制失败",
                    text: "无法将 Markdown 链接复制到剪贴板。请尝试手动复制。",
                    timeout: 5000
                });
            });
    }

    // 右键菜单触发函数
    function generateAndCopyMarkdownLink() {
        const title = document.title;
        const url = document.URL;
        const markdown = getMdToUrl(title, url);
        copyText(markdown);
    }

    // 注册右键菜单项
    GM_registerMenuCommand("生成并复制当前页面的Markdown链接", generateAndCopyMarkdownLink);

})();

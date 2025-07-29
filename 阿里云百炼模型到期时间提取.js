// ==UserScript==
// @name         阿里云百炼模型到期时间提取 / Alibaba Bailian Model Expiration Extractor
// @description  在阿里云百炼模型市场页面提取所有非 '-' 的到期时间条目，并汇总展示。Extract non '-' expiration entries on Alibaba Bailian model market page.
// @namespace    https://github.com/your-username
// @version      0.2.0
// @author       YourName
// @license      MIT
// @homepage     https://github.com/your-username/bailian-expiry-extractor
// @supportURL   https://github.com/your-username/bailian-expiry-extractor/issues
// @match        https://bailian.console.aliyun.com/console?tab=model#/model-market*
// @connect      bailian.console.aliyun.com
// @grant        none
// @compatible   tampermonkey
// @compatible   violentmonkey
// @compatible   greasemonkey
// ==/UserScript==

(function () {
    'use strict';

    const LOG_PREFIX = '[Bailian Expiry Extractor]';

    // 存储提取的数据
    let extractedData = [];

    // 创建浮动按钮
    function createFloatingButton() {
        const button = document.createElement('button');
        button.id = 'bailian-extractor-btn';
        Object.assign(button.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '999999',
            backgroundColor: '#ff6a00',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            fontWeight: 'bold',
        });
        button.textContent = '查看到期模型';

        button.addEventListener('click', () => {
            showResultsModal();
        });

        document.body.appendChild(button);
    }

    // 显示结果弹窗
    function showResultsModal() {
        const modal = document.createElement('div');
        modal.id = 'bailian-extractor-modal';
        Object.assign(modal.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '1000000',
        });

        const content = document.createElement('div');
        Object.assign(content.style, {
            backgroundColor: 'white',
            width: '80%',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            borderRadius: '8px',
            padding: '20px',
            position: 'relative',
        });

        const title = document.createElement('h3');
        title.textContent = '非永久授权模型列表（到期时间 ≠ "-"）';
        content.appendChild(title);

        if (extractedData.length === 0) {
            content.appendChild(document.createTextNode('未找到相关数据。请确保页面已完全加载。'));
        } else {
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.innerHTML = `
                <thead>
                    <tr style="background:#f0f0f0;">
                        <th style="text-align:left;padding:8px;border:1px solid #ddd;">模型名称</th>
                        <th style="text-align:left;padding:8px;border:1px solid #ddd;">服务商</th>
                        <th style="text-align:left;padding:8px;border:1px solid #ddd;">到期时间</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;

            const tbody = table.querySelector('tbody');
            extractedData.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(item.name || '未知')}</td>
                    <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(item.provider || '未知')}</td>
                    <td style="padding:8px;border:1px solid #ddd; color: #d43f3a; font-weight: bold;">${escapeHtml(item.expiry)}</td>
                `;
                tbody.appendChild(tr);
            });

            content.appendChild(table);

            const copyBtn = document.createElement('button');
            copyBtn.textContent = '复制全部数据';
            copyBtn.style.marginTop = '15px';
            copyBtn.style.padding = '8px 12px';
            copyBtn.style.backgroundColor = '#007cba';
            copyBtn.style.color = 'white';
            copyBtn.style.border = 'none';
            copyBtn.style.borderRadius = '4px';
            copyBtn.style.cursor = 'pointer';
            copyBtn.onclick = () => {
                const text = extractedData.map(d => `${d.name}\t${d.provider}\t${d.expiry}`).join('\n');
                navigator.clipboard.writeText(text).then(() => {
                    copyBtn.textContent = '已复制！';
                    setTimeout(() => (copyBtn.textContent = '复制全部数据'), 2000);
                });
            };
            content.appendChild(copyBtn);
        }

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '10px';
        closeBtn.style.right = '15px';
        closeBtn.style.fontSize = '24px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => document.body.removeChild(modal);
        content.appendChild(closeBtn);

        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    // 转义 HTML 防止 XSS（简单实现）
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 提取数据的核心逻辑
    function extractExpirationData() {
        console.log(LOG_PREFIX, '开始提取到期时间数据...');

        // 清空旧数据
        extractedData = [];

        // 查找所有包含“到期时间”的元素
        const xpath = "//text()[contains(., '到期时间：')]";
        const snapshot = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        for (let i = 0; i < snapshot.snapshotLength; i++) {
            const node = snapshot.snapshotItem(i);
            const textContent = node.textContent.trim();

            // 匹配“到期时间：xxxx-xx-xx”格式
            const match = textContent.match(/到期时间：\s*([^，；\s]+)/);
            if (!match) continue;

            const expiry = match[1].trim();
            if (expiry === '-' || !expiry) continue; // 过滤掉 '-'

            // 获取父容器，尝试提取模型名和提供商
            let modelName = '未知';
            let provider = '未知';

            let parent = node.parentNode;
            for (let level = 0; level < 6 && parent; level++) {
                const parentText = parent.textContent;

                // 尝试找模型名（通常在前面）
                const nameMatch = parentText.match(/[\u4e00-\u9fa5a-zA-Z0-9\-\_]+\s*\(ID:/);
                if (nameMatch) {
                    modelName = nameMatch[0].replace(/\(ID:.*/, '').trim();
                }

                // 或者看是否有“服务商”字段
                const providerMatch = parentText.match(/服务商：\s*([^\s，；]+)/);
                if (providerMatch) {
                    provider = providerMatch[1].trim();
                }

                // 如果都找到了就跳出
                if (modelName !== '未知' && provider !== '未知') break;

                parent = parent.parentElement;
            }

            extractedData.push({ name: modelName, provider, expiry });
        }

        console.log(LOG_PREFIX, '提取完成，共找到', extractedData.length, '条非永久授权记录。', extractedData);
    }

    // 轮询检测 DOM 变化（应对 SPA 路由）
    function observeDOM() {
        const observer = new MutationObserver(() => {
            // 延迟执行，确保 DOM 完全渲染
            setTimeout(() => {
                extractExpirationData();
            }, 1000);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        // 初始提取一次
        setTimeout(extractExpirationData, 1500);
    }

    // 初始化
    function init() {
        console.log(LOG_PREFIX, '脚本已注入，准备监控页面...');
        createFloatingButton();
        observeDOM();
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

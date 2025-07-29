// ==UserScript==
// @name         阿里云百炼模型到期时间提取器（精准版）
// @description  精准提取阿里云百炼模型市场中“到期时间”不为“-”的模型，适配真实 DOM 结构。
// @namespace    https://github.com/your-username
// @version      0.6.0
// @author       will
// @license      MIT
// @homepage     https://github.com/your-username/bailian-expiry-extractor
// @supportURL   https://github.com/your-username/bailian-expiry-extractor/issues
// @include      https://bailian.console.aliyun.com/console*
// @connect      bailian.console.aliyun.com
// @grant        none
// @run-at       document-start
// @compatible   tampermonkey
// @compatible   violentmonkey
// ==/UserScript==

(function () {
    'use strict';

    // 🔧 调试开关：设为 true 查看详细日志
    const DEBUG = false;

    function log(...args) {
        if (DEBUG) console.log('[Bailian Expiry]', ...args);
    }

    const LOG_PREFIX = '[Bailian Expiry]';
    let extractedData = [];

    // 创建浮动按钮
    function createFloatingButton() {
        if (document.getElementById('bailian-extractor-btn')) return;

        const button = document.createElement('button');
        button.id = 'bailian-extractor-btn';
        Object.assign(button.style, {
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: '2147483647',
            backgroundColor: '#ff6a00',
            color: 'white',
            border: 'none',
            padding: '12px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            opacity: 0.95,
            fontFamily: 'Arial, sans-serif',
        });
        button.textContent = '📅 查看即将到期模型';

        button.addEventListener('click', () => {
            showResultsModal();
        });

        document.body.appendChild(button);
        log('✅ 按钮已创建');
    }

    // 显示结果弹窗
    function showResultsModal() {
        if (document.getElementById('bailian-extractor-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'bailian-extractor-modal';
        Object.assign(modal.style, {
            position: 'fixed',
            top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '2147483647',
            fontFamily: 'Arial, sans-serif',
        });

        const content = document.createElement('div');
        Object.assign(content.style, {
            backgroundColor: 'white',
            width: '90%', maxWidth: '800px',
            maxHeight: '80vh', overflow: 'auto',
            borderRadius: '10px',
            padding: '20px',
            position: 'relative',
        });

        const title = document.createElement('h3');
        title.textContent = '📌 即将到期的模型列表';
        content.appendChild(title);

        if (extractedData.length === 0) {
            content.appendChild(document.createTextNode('未找到“到期时间”不为“-”的模型。'));
        } else {
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.innerHTML = `
                <thead>
                    <tr style="background:#f5f5f5;">
                        <th style="text-align:left;padding:10px;border:1px solid #ddd;">模型名称</th>
                        <th style="text-align:left;padding:10px;border:1px solid #ddd;">到期时间</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;

            const tbody = table.querySelector('tbody');
            extractedData.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(item.name)}</td>
                    <td style="padding:10px;border:1px solid #ddd; color: #d9534f; font-weight: bold;">${escapeHtml(item.expiry)}</td>
                `;
                tbody.appendChild(tr);
            });

            content.appendChild(table);

            const copyBtn = document.createElement('button');
            copyBtn.textContent = '📋 复制为 CSV';
            copyBtn.style.marginTop = '15px';
            copyBtn.style.padding = '10px';
            copyBtn.style.backgroundColor = '#007cba';
            copyBtn.style.color = 'white';
            copyBtn.style.border = 'none';
            copyBtn.style.borderRadius = '4px';
            copyBtn.style.cursor = 'pointer';
            copyBtn.onclick = () => {
                const csv = [
                    ['模型名称', '到期时间'].join(','),
                    ...extractedData.map(d => [d.name, d.expiry].map(escapeCsv).join(','))
                ].join('\n');
                navigator.clipboard.writeText(csv).then(() => {
                    copyBtn.textContent = '✅ 已复制！';
                    setTimeout(() => copyBtn.textContent = '📋 复制为 CSV', 2000);
                });
            };
            content.appendChild(copyBtn);
        }

        const close = document.createElement('span');
        close.textContent = '×';
        close.style.position = 'absolute';
        close.style.top = '10px'; close.right = '16px';
        close.style.fontSize = '24px';
        close.style.cursor = 'pointer';
        close.onclick = () => document.body.removeChild(modal);
        content.appendChild(close);

        modal.appendChild(content);
        document.body.appendChild(modal);
        log('✅ 弹窗显示完成');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function escapeCsv(text) {
        const str = String(text || '');
        return `"${str.replace(/"/g, '""')}"`;
    }

    // 核心提取逻辑
    function extractDataFromTable() {
        log('开始从表格中提取数据...');

        const rows = document.querySelectorAll('tr[data-row-key]');
        log('找到', rows.length, '个模型行');

        const results = [];

        rows.forEach(row => {
            // 获取模型名称
            const nameEl = row.querySelector('.name__QVnRn');
            const modelName = nameEl ? nameEl.textContent.trim() : '未知模型';

            // 查找“免费额度”或“模型限流”列中的“到期时间”
            const expiryCell = row.querySelector('td.efm_ant-table-cell:has(.value__V7Z7e)');
            if (!expiryCell) return;

            const expiryText = expiryCell.textContent;
            const match = expiryText.match(/到期时间：\s*([^\s]+)/);
            if (!match) return;

            const expiry = match[1].trim();
            if (expiry !== '-' && /^\d{4}-\d{2}-\d{2}/.test(expiry)) {
                results.push({ name: modelName, expiry });
                log('✅ 匹配到有效到期时间:', modelName, expiry);
            }
        });

        extractedData = results;
        log('✅ 提取完成，共找到', extractedData.length, '条记录');
    }

    // 监听 DOM 变化（应对动态加载）
    function observeDOM() {
        const observer = new MutationObserver(() => {
            log('DOM 变化，尝试重新提取...');
            setTimeout(extractDataFromTable, 800);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        log('✅ 已启动 DOM 监听');
    }

    // 初始化
    function init() {
        console.log(LOG_PREFIX, '脚本已注入，DEBUG:', DEBUG);

        const waitForTable = () => {
            const table = document.querySelector('.efm_ant-table');
            if (table) {
                log('表格已加载，开始提取');
                extractDataFromTable();
                createFloatingButton();
                observeDOM();
            } else {
                setTimeout(waitForTable, 1000);
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', waitForTable);
        } else {
            waitForTable();
        }
    }

    init();
})();

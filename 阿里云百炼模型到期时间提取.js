// ==UserScript==
// @name         阿里云百炼模型到期时间提取器
// @name:en      Bailian Model Expiry Extractor
// @namespace    https://github.com/jwq2011/
// @version      1.4.0
// @author       will
// @description  精准提取模型名称、Code、免费额度（支持百分比/无额度）、倒计时、到期时间，一键复制 Code。
// @description:en Accurately extract model name, code, quota (%, 0, or N/M), countdown, expiry, and copy code.
// @license      MIT
// @homepage     https://github.com/jwq2011/TamperMonkey-Scripts.git
// @supportURL   https://github.com/jwq2011/TamperMonkey-Scripts.git/issues
// @match        https://bailian.console.aliyun.com/console*
// @grant        GM_setClipboard
// @run-at       document-end
// @compatible   tampermonkey
// @compatible   violentmonkey
// ==/UserScript==

(function () {
    'use strict';

    const DEBUG = false;
    const LOG_PREFIX = '[Bailian Expiry+]';

    function log(...args) {
        if (DEBUG) console.log(LOG_PREFIX, ...args);
    }

    let extractedData = [];

    // 用户可自定义显示哪些列（默认只显示原始5个）
    const userSettings = {
        showModelType: false,     // 模型类型
        showContextLength: false, // 上下文长度
        showPrice: false,          // 价格
        showProtocol: false,      // 模型协议
        showLimit: false,         // 限流
        showDescription: false,    // 描述
        showVendor: false,        // 供应商（子页面无）
        showUpdateTime: false,     // 更新时间（子页面无）
    };

    function createFloatingButton() {
        const btnId = 'bailian-extractor-btn';
        if (document.getElementById(btnId)) return;

        const button = document.createElement('button');
        button.id = btnId;
        Object.assign(button.style, {
            position: 'fixed', top: '80px', right: '20px', zIndex: '2147483647',
            backgroundColor: '#ff6a00', color: 'white', border: 'none',
            padding: '12px 16px', borderRadius: '8px', cursor: 'pointer',
            fontSize: '14px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            opacity: 0.95, fontFamily: 'Arial, sans-serif'
        });
        button.textContent = '📊 提取模型信息';

        button.addEventListener('click', () => {
            button.disabled = true;
            button.textContent = '🔍 提取中...';

            let needWait = false;

            // 自动切换视图
            if (switchToListView()) {
                needWait = true;
            }

            // 自动展开折叠区域
            if (autoExpandFoldedRows()) {
                needWait = true;
            }

            // 等待 DOM 更新
            setTimeout(() => {
                const data = extractAllModels();
                if (data.length === 0) {
                    alert('❌ 未找到任何模型信息，请确认已打开【模型市场】页面并完全加载。');
                } else {
                    extractedData = data;
                    showResultsModal();
                }
                button.disabled = false;
                button.textContent = '📊 提取模型信息';
            }, needWait ? 1200 : 500);
        });

        document.body.appendChild(button);
        log('✅ 按钮已创建');
    }

    // 自动切换到列表视图（精准判断）
    function switchToListView() {
        // 判断是否已经是列表视图
        const isListView = document.querySelector('.bl-icon-list-line.active__VRFfX');
        if (isListView) {
            log('✅ 当前已是列表视图');
            return false;
        }

        // 否则，点击列表图标切换
        const listViewIcon = document.querySelector('.bl-icon-list-line');
        const button = listViewIcon?.closest('button');

        if (button && button.offsetWidth > 0 && button.offsetHeight > 0) {
            button.click();
            log('✅ 已切换到列表视图');
            return true;
        }

        log('⚠️ 未找到“切换到列表视图”按钮');
        return false;
    }

    // 自动展开折叠区域
    function autoExpandFoldedRows() {
        const expandButtons = [...document.querySelectorAll('button[aria-label="展开"], button[title="展开"]')];
        let clicked = false;
        for (const btn of expandButtons) {
            if (btn.offsetWidth > 0 && btn.offsetHeight > 0) {
                btn.click();
                clicked = true;
                log('✅ 点击展开按钮');
            }
        }
        return clicked;
    }

    // 提取模型信息
    function extractAllModels() {
        log('🔍 开始提取模型数据...');

        const rowSelectors = ['tr[data-row-key]', '.ant-table-row', 'tr[role="row"]'];
        let rows = [];
        for (const sel of rowSelectors) {
            rows = [...document.querySelectorAll(sel)];
            if (rows.length > 0) break;
        }

        if (rows.length === 0) {
            log('❌ 未找到任何行');
            return [];
        }

        const results = [];

        // 判断是否是子页面（详情页）
        const isSubPage = /\/model-market\/detail\//.test(location.hash);

        for (const row of rows) {
            // --- 模型名称 ---
            let name = '未知模型';
            if (isSubPage) {
                const nameEl = row.querySelector('.name__QVnRn') || row.querySelector('td:first-child');
                name = (nameEl?.textContent || '未知模型').trim();
            } else {
                const nameContainer = row.querySelector('.model-name__xEkXf');
                const nameEl = nameContainer?.querySelector('span');
                name = (nameEl?.textContent || '未知模型').trim();
            }

            // --- Code 提取 ---
            let code = '';
            if (isSubPage) {
                const spans = row.querySelectorAll('span');
                for (const span of spans) {
                    const text = span.textContent.trim();
                    if (/^qwen[-\w]*\d/.test(text)) {
                        code = text.toLowerCase();
                        break;
                    }
                }
            } else {
                const codeCell = row.querySelector('td:nth-child(2)');
                const codeText = codeCell?.textContent.trim().split(/\s+/)[0] || '';
                if (/^qwen[-\w]*\d/.test(codeText)) {
                    code = codeText.toLowerCase();
                }
            }
            code = code || '—';

            // --- 免费额度 + 百分比 ---
            let freeQuota = '—';
            let quotaText = '0';
            let percentText = '0%';

            const quotaSpan = row.querySelector('.value__V7Z7e');
            if (quotaSpan) {
                const text = quotaSpan.textContent.trim();
                const match = text.match(/(\d[\d,]*)\s*\/\s*(\d[\d,]+)/);
                if (match) {
                    const used = parseInt(match[1].replace(/,/g, ''));
                    const total = parseInt(match[2].replace(/,/g, ''));
                    quotaText = `${used.toLocaleString()}/${total.toLocaleString()}`;
                }
            }

            const percentSpan = row.querySelector('.efm_ant-progress-text');
            if (percentSpan) {
                const pct = percentSpan.textContent.trim();
                if (/^\d+(\.\d+)?%$/.test(pct)) {
                    percentText = pct;
                }
            }

            if (quotaText !== '0') {
                freeQuota = `${quotaText} · ${percentText}`;
            } else if (/^\d+(\.\d+)?%$/.test(percentText)) {
                freeQuota = percentText;
            } else {
                freeQuota = /无免费额度/.test(row.textContent) ? '0 · 0%' : '—';
            }

            // --- 到期时间 ---
            const expiryMatch = row.textContent.match(/到期时间.?(\d{4}-\d{2}-\d{2})/);
            if (!expiryMatch) continue;

            const expiry = expiryMatch[1];
            const expiryDate = new Date(expiry);
            const today = new Date().setHours(0, 0, 0, 0);
            const daysLeft = Math.ceil((expiryDate - today) / 86400000);
            if (daysLeft < 0) continue;

            // --- 可选字段 ---
            const modelType = userSettings.showModelType ? (row.cells[2]?.textContent || '—') : undefined;
            const contextLength = userSettings.showContextLength ? (row.cells[3]?.textContent || '—') : undefined;
            const price = userSettings.showPrice ? (row.cells[4]?.textContent || '—') : undefined;
            const protocol = userSettings.showProtocol ? (row.cells[5]?.textContent || '—') : undefined;
            const limit = userSettings.showLimit ? (row.cells[6]?.textContent || '—') : undefined;
            const description = userSettings.showDescription ? (row.cells[9]?.textContent || '—') : undefined;
            const vendor = (userSettings.showVendor && !isSubPage) ? (row.cells[10]?.textContent || '—') : undefined;
            const updateTime = (userSettings.showUpdateTime && !isSubPage) ? (row.cells[11]?.textContent || '—') : undefined;

            results.push({
                name, code, freeQuota, daysLeft, expiry,
                ...(userSettings.showModelType && { modelType }),
                ...(userSettings.showContextLength && { contextLength }),
                ...(userSettings.showPrice && { price }),
                ...(userSettings.showProtocol && { protocol }),
                ...(userSettings.showLimit && { limit }),
                ...(userSettings.showDescription && { description }),
                ...(userSettings.showVendor && { vendor }),
                ...(userSettings.showUpdateTime && { updateTime })
            });

            log('✅ 提取:', name, code, freeQuota, `剩余 ${daysLeft} 天`, expiry);
        }

        return results.sort((a, b) => a.daysLeft - b.daysLeft);
    }

    // 显示结果弹窗
    function showResultsModal() {
        const modalId = 'bailian-extractor-modal';
        if (document.getElementById(modalId)) document.body.removeChild(document.getElementById(modalId));

        const modal = document.createElement('div');
        modal.id = modalId;
        Object.assign(modal.style, {
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: '2147483647', fontFamily: 'Arial, sans-serif'
        });

        const content = document.createElement('div');
        Object.assign(content.style, {
            backgroundColor: 'white', width: '95%', maxWidth: '1000px', maxHeight: '85vh',
            overflow: 'auto', borderRadius: '10px', padding: '20px', position: 'relative'
        });

        const title = document.createElement('h3');
        title.textContent = `✅ 提取结果（${extractedData.length} 个模型）`;
        content.appendChild(title);

        if (extractedData.length === 0) {
            content.appendChild(document.createTextNode('未找到有效模型信息。'));
        } else {
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.innerHTML = `
                <thead>
                    <tr style="background:#f5f5f5;">
                        <th style="text-align:left;padding:10px;border:1px solid #ddd;">模型名称</th>
                        <th style="text-align:left;padding:10px;border:1px solid #ddd;">Code</th>
                        <th style="text-align:left;padding:10px;border:1px solid #ddd;">免费额度</th>
                        <th style="text-align:left;padding:10px;border:1px solid #ddd;">倒计时显示</th>
                        <th style="text-align:left;padding:10px;border:1px solid #ddd;">到期时间</th>
                        ${userSettings.showModelType ? '<th style="text-align:left;padding:10px;border:1px solid #ddd;">模型类型</th>' : ''}
                        ${userSettings.showContextLength ? '<th style="text-align:left;padding:10px;border:1px solid #ddd;">上下文长度</th>' : ''}
                        ${userSettings.showPrice ? '<th style="text-align:left;padding:10px;border:1px solid #ddd;">价格</th>' : ''}
                        ${userSettings.showProtocol ? '<th style="text-align:left;padding:10px;border:1px solid #ddd;">模型协议</th>' : ''}
                        ${userSettings.showLimit ? '<th style="text-align:left;padding:10px;border:1px solid #ddd;">限流</th>' : ''}
                        ${userSettings.showDescription ? '<th style="text-align:left;padding:10px;border:1px solid #ddd;">描述</th>' : ''}
                        ${userSettings.showVendor ? '<th style="text-align:left;padding:10px;border:1px solid #ddd;">供应商</th>' : ''}
                        ${userSettings.showUpdateTime ? '<th style="text-align:left;padding:10px;border:1px solid #ddd;">更新时间</th>' : ''}
                    </tr>
                </thead>
                <tbody></tbody>
            `;

            const tbody = table.querySelector('tbody');
            extractedData.forEach(item => {
                const tr = document.createElement('tr');
                appendCell(tr, item.name);
                appendCodeCell(tr, item.code);
                appendCell(tr, item.freeQuota);
                appendCountdownCell(tr, item.daysLeft);
                appendCell(tr, item.expiry, { color: '#d9534f', fontWeight: 'bold' });
                if (userSettings.showModelType) appendCell(tr, item.modelType || '—');
                if (userSettings.showContextLength) appendCell(tr, item.contextLength || '—');
                if (userSettings.showPrice) appendCell(tr, item.price || '—');
                if (userSettings.showProtocol) appendCell(tr, item.protocol || '—');
                if (userSettings.showLimit) appendCell(tr, item.limit || '—');
                if (userSettings.showDescription) appendCell(tr, item.description || '—');
                if (userSettings.showVendor) appendCell(tr, item.vendor || '—');
                if (userSettings.showUpdateTime) appendCell(tr, item.updateTime || '—');
                tbody.appendChild(tr);
            });

            content.appendChild(table);

            const csvBtn = document.createElement('button');
            csvBtn.textContent = '📋 复制为 CSV';
            csvBtn.style.marginTop = '15px';
            csvBtn.style.padding = '10px';
            csvBtn.style.backgroundColor = '#007cba';
            csvBtn.style.color = 'white';
            csvBtn.style.border = 'none';
            csvBtn.style.borderRadius = '4px';
            csvBtn.style.cursor = 'pointer';
            csvBtn.onclick = () => {
                const csv = [
                    ['模型名称', 'Code', '免费额度', '倒计时显示', '到期时间',
                     ...(userSettings.showModelType ? ['模型类型'] : []),
                     ...(userSettings.showContextLength ? ['上下文长度'] : []),
                     ...(userSettings.showPrice ? ['价格'] : []),
                     ...(userSettings.showProtocol ? ['模型协议'] : []),
                     ...(userSettings.showLimit ? ['限流'] : []),
                     ...(userSettings.showDescription ? ['描述'] : []),
                     ...(userSettings.showVendor ? ['供应商'] : []),
                     ...(userSettings.showUpdateTime ? ['更新时间'] : [])
                    ].join(','),
                    ...extractedData.map(d => [
                        d.name,
                        d.code,
                        d.freeQuota,
                        `剩余 ${d.daysLeft} 天`,
                        d.expiry,
                        ...(userSettings.showModelType ? [d.modelType || '—'] : []),
                        ...(userSettings.showContextLength ? [d.contextLength || '—'] : []),
                        ...(userSettings.showPrice ? [d.price || '—'] : []),
                        ...(userSettings.showProtocol ? [d.protocol || '—'] : []),
                        ...(userSettings.showLimit ? [d.limit || '—'] : []),
                        ...(userSettings.showDescription ? [d.description || '—'] : []),
                        ...(userSettings.showVendor ? [d.vendor || '—'] : []),
                        ...(userSettings.showUpdateTime ? [d.updateTime || '—'] : [])
                    ].map(s => `"${String(s).replace(/"/g, '""')}"`).join(','))
                ].join('\n');
                navigator.clipboard.writeText(csv).then(() => {
                    csvBtn.textContent = '✅ 已复制！';
                    setTimeout(() => csvBtn.textContent = '📋 复制为 CSV', 2000);
                });
            };
            content.appendChild(csvBtn);
        }

        const close = document.createElement('span');
        close.textContent = '×';
        close.style.position = 'absolute'; close.style.top = '10px'; close.style.right = '16px';
        close.style.fontSize = '24px'; close.style.cursor = 'pointer';
        close.onclick = () => document.body.removeChild(modal);
        content.appendChild(close);

        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    // 工具函数：创建表格单元格
    function appendCell(tr, text, style = {}) {
        const td = document.createElement('td');
        td.style.padding = '10px';
        td.style.border = '1px solid #ddd';
        Object.assign(td.style, style);
        td.textContent = text;
        tr.appendChild(td);
    }

    function appendCodeCell(tr, code) {
        const td = document.createElement('td');
        td.style.padding = '10px';
        td.style.border = '1px solid #ddd';
        td.style.cursor = 'pointer';
        td.style.color = '#007cba';
        td.style.fontWeight = 'bold';
        td.title = '点击复制 Code';
        td.textContent = code;
        td.onclick = () => {
            GM_setClipboard(code);
            td.textContent = '✅ 已复制！';
            setTimeout(() => td.textContent = code, 1500);
        };
        tr.appendChild(td);
    }

    function appendCountdownCell(tr, daysLeft) {
        const td = document.createElement('td');
        td.style.padding = '10px';
        td.style.border = '1px solid #ddd';
        td.style.fontWeight = 'bold';
        td.style.color = daysLeft < 30 ? '#d9534f' :
                        daysLeft < 90 ? '#f0ad4e' : '#5cb85c';
        td.textContent = `剩余 ${daysLeft} 天`;
        tr.appendChild(td);
    }

    // 初始化
    function init() {
        console.log(LOG_PREFIX, '脚本已注入，版本:', GM_info.script.version);
        setTimeout(createFloatingButton, 1000);
    }

    init();
})();

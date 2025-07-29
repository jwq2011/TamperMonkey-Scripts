// ==UserScript==
// @name         阿里云百炼模型到期时间提取器
// @name:en      Bailian Model Expiry Extractor
// @namespace    https://github.com/jwq2011/
// @version      0.9.1
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

    const DEBUG = true;
    const LOG_PREFIX = '[Bailian Expiry+]';

    function log(...args) {
        if (DEBUG) console.log(LOG_PREFIX, ...args);
    }

    let extractedData = [];

    // 创建按钮
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
            }, 500);
        });

        document.body.appendChild(button);
        log('✅ 按钮已创建');
    }

    // 提取所有模型
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

        for (const row of rows) {
            // --- 模型名称 ---
            const nameEl = row.querySelector('.name__QVnRn') ||
                           row.querySelector('.model-name') ||
                           row.querySelector('td:first-child .text');
            const name = (nameEl?.textContent || '未知模型').trim();

            // --- Code 提取（精准从 DOM 中查找）---
            let code = '';
            const text = row.textContent;

            // 查找所有 span，找内容匹配 qwen-xxx 的
            const spans = row.querySelectorAll('span');
            for (const span of spans) {
                const text = span.textContent.trim();
                // 匹配 qwen 开头的标识符，如 qwen3-235b-a22b-thinking-2507
                if (/^qwen[-\w]*\d/.test(text)) {
                    code = text.toLowerCase();
                    break;
                }
            }

            // 清理：确保是标准格式（可选）
            // 例如：qwen3-235b-a22b-thinking-2507 → 可保留原样，或简化为 qwen-235b
            // 如果你希望简化，取消下面注释：
            /*
            if (code.includes('235b')) code = 'qwen-235b';
            else if (code.includes('30b')) code = 'qwen-30b';
            else if (code.includes('32b')) code = 'qwen-32b';
            else if (code.includes('14b')) code = 'qwen-14b';
            else if (code.includes('8b')) code = 'qwen-8b';
            else if (code.includes('4b')) code = 'qwen-4b';
            else if (code.includes('1.7b')) code = 'qwen-1.7b';
            else if (code.includes('0.6b')) code = 'qwen-0.6b';
            else if (code.includes('plus')) code = 'qwen-plus';
            else if (code.includes('turbo')) code = 'qwen-turbo';
            else if (code.includes('qwen3')) code = 'qwen3';
            */
            code = code || '—';

            // --- 免费额度提取（支持多种格式）---
            let freeQuota = '0'; // 默认为 0
            const quotaText = text;

            // 匹配 “30,893/1,000,000” 格式
            const ratioMatch = quotaText.match(/(\d[\d,]*)\s*\/\s*(\d[\d,]+)/);
            if (ratioMatch) {
                const used = parseInt(ratioMatch[1].replace(/,/g, ''));
                const total = parseInt(ratioMatch[2].replace(/,/g, ''));
                freeQuota = `${used.toLocaleString()}/${total.toLocaleString()}`;
            } else {
                // 匹配百分比：如 “3.09%”
                const percentMatch = quotaText.match(/(\d+(\.\d+)?%)/);
                if (percentMatch) {
                    freeQuota = percentMatch[1];
                }
                // 匹配 “无免费额度” → 显示为 0
                else if (/无免费额度/.test(quotaText)) {
                    freeQuota = '0';
                }
            }

            // --- 到期时间 ---
            const expiryMatch = text.match(/到期时间.?(\d{4}-\d{2}-\d{2})/);
            if (!expiryMatch) continue;

            const expiry = expiryMatch[1];
            const expiryDate = new Date(expiry);
            const today = new Date().setHours(0, 0, 0, 0);
            const daysLeft = Math.ceil((expiryDate - today) / 86400000);

            if (daysLeft < 0) continue; // 跳过已过期

            results.push({
                name,
                code,
                freeQuota,
                daysLeft,
                expiry
            });

            log('✅ 提取:', name, code, freeQuota, `剩余 ${daysLeft} 天`, expiry);
        }

        return results.sort((a, b) => a.daysLeft - b.daysLeft);
    }

    // 显示结果
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

                tbody.appendChild(tr);
            });

            content.appendChild(table);

            // CSV 导出
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
                    ['模型名称', 'Code', '免费额度', '倒计时显示', '到期时间'].join(','),
                    ...extractedData.map(d => [
                        d.name,
                        d.code,
                        d.freeQuota,
                        `剩余 ${d.daysLeft} 天`,
                        d.expiry
                    ].map(escapeCsv).join(','))
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

    function escapeCsv(text) {
        return `"${String(text).replace(/"/g, '""')}"`;
    }

    // 初始化
    function init() {
        console.log(LOG_PREFIX, '脚本已注入，版本:', GM_info.script.version);
        setTimeout(createFloatingButton, 1000);
    }

    init();
})();

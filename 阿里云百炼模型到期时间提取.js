// ==UserScript==
// @name         阿里云百炼模型到期时间提取器
// @name:en      Bailian Model Expiry Extractor (Ultimate Stable)
// @namespace    https://github.com/your-username
// @version      0.7.0
// @author       will
// @description  无视页面结构变化，直接从当前 DOM 提取模型名称、Code、免费额度、倒计时、到期时间，支持一键复制 Code。
// @description:en Extract model name, code, quota, countdown, expiry from current DOM, copy code with one click.
// @license      MIT
// @homepage     https://github.com/your-username/bailian-expiry-extractor
// @supportURL   https://github.com/your-username/bailian-expiry-extractor/issues
// @match        https://bailian.console.aliyun.com/console*
// @grant        GM_setClipboard
// @grant        GM_addStyle
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

    // 存储提取结果
    let extractedData = [];

    // 创建浮动按钮
    function createFloatingButton() {
        const btnId = 'bailian-extractor-btn';
        if (document.getElementById(btnId)) return;

        const button = document.createElement('button');
        button.id = btnId;
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
        button.textContent = '🔄 提取模型信息';

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
                button.textContent = '🔄 提取模型信息';
            }, 500);
        });

        document.body.appendChild(button);
        log('✅ 按钮已创建');
    }

    // 核心提取函数
    function extractAllModels() {
        log('🔍 开始提取所有模型...');

        // 尝试多种表格行选择器
        const rowSelectors = [
            'tr[data-row-key]',
            '.ant-table-row',
            'tr[role="row"]',
            '.table-row', // 自定义类
        ];

        let rows = [];
        for (const sel of rowSelectors) {
            rows = [...document.querySelectorAll(sel)];
            if (rows.length > 0) {
                log('✅ 使用选择器:', sel);
                break;
            }
        }

        if (rows.length === 0) {
            log('❌ 未找到任何行，请检查页面是否加载完成');
            return [];
        }

        log('📊 找到', rows.length, '行');

        const results = [];

        for (const row of rows) {
            // === 1. 提取模型名称 ===
            const nameEl = row.querySelector('.name__QVnRn') ||
                           row.querySelector('.model-name') ||
                           row.querySelector('td:first-child .text') ||
                           row.cells[0];
            const name = (nameEl?.textContent || '未知模型').trim();

            // === 2. 提取 Code（通常在第二列或隐藏字段）===
            let code = '';
            const textContent = row.textContent;

            // 常见 Code 模式匹配
            const codeMatch = textContent.match(/\b(qwen-(?:plus|turbo|max|vl-plus|audio-plus|3))\b/i);
            if (codeMatch) {
                code = codeMatch[1];
            } else {
                // 尝试从属性或隐藏 span 中找
                const codeSpan = [...row.querySelectorAll('span')].find(s =>
                    /\bqwen-/i.test(s.textContent)
                );
                code = codeSpan?.textContent.trim() || '';
            }

            // === 3. 提取免费额度和到期时间 ===
            let freeQuota = '0/0';
            let expiry = null;

            const cellTexts = [...row.querySelectorAll('td')].map(td => td.textContent);

            for (const text of cellTexts) {
                const quotaMatch = text.match(/(\d+)\/(\d+).*?免费额度/);
                if (quotaMatch) {
                    freeQuota = `${quotaMatch[1]}/${quotaMatch[2]}`;
                }

                const expiryMatch = text.match(/到期时间.?(\d{4}-\d{2}-\d{2})/);
                if (expiryMatch && expiryMatch[1] !== '-') {
                    expiry = expiryMatch[1];
                }
            }

            // 只有到期时间有效才保留
            if (!expiry) continue;

            const daysLeft = Math.ceil((new Date(expiry) - new Date().setHours(0, 0, 0, 0)) / 86400000);
            if (daysLeft < 0) continue; // 过期的也跳过

            results.push({
                name,
                code: code || '—',
                freeQuota,
                daysLeft,
                expiry
            });

            log('✅ 提取:', name, code, freeQuota, expiry, `剩余 ${daysLeft} 天`);
        }

        return results.sort((a, b) => a.daysLeft - b.daysLeft);
    }

    // 显示结果
    function showResultsModal() {
        const modalId = 'bailian-extractor-modal';
        if (document.getElementById(modalId)) {
            document.body.removeChild(document.getElementById(modalId));
        }

        const modal = document.createElement('div');
        modal.id = modalId;
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
            width: '95%', maxWidth: '1000px',
            maxHeight: '85vh',
            overflow: 'auto',
            borderRadius: '10px',
            padding: '20px',
            position: 'relative',
        });

        const title = document.createElement('h3');
        title.textContent = '✅ 提取结果（共 ' + extractedData.length + ' 个）';
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

                // 模型名称
                appendCell(tr, item.name);

                // Code（可复制）
                const codeCell = document.createElement('td');
                codeCell.style.padding = '10px';
                codeCell.style.border = '1px solid #ddd';
                codeCell.style.cursor = 'pointer';
                codeCell.style.color = '#007cba';
                codeCell.style.fontWeight = 'bold';
                codeCell.title = '点击复制 Code';
                codeCell.textContent = item.code;
                codeCell.onclick = () => {
                    GM_setClipboard(item.code);
                    codeCell.textContent = '✅ 已复制！';
                    setTimeout(() => codeCell.textContent = item.code, 1500);
                };
                tr.appendChild(codeCell);

                // 免费额度
                appendCell(tr, item.freeQuota);

                // 倒计时
                const countdownCell = document.createElement('td');
                countdownCell.style.padding = '10px';
                countdownCell.style.border = '1px solid #ddd';
                countdownCell.style.fontWeight = 'bold';
                countdownCell.style.color = item.daysLeft < 30 ? '#d9534f' :
                                          item.daysLeft < 90 ? '#f0ad4e' : '#5cb85c';
                countdownCell.textContent = `剩余 ${item.daysLeft} 天`;
                tr.appendChild(countdownCell);

                // 到期时间
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
        close.style.position = 'absolute';
        close.style.top = '10px';
        close.style.right = '16px';
        close.style.fontSize = '24px';
        close.style.cursor = 'pointer';
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

    // 初始化
    function init() {
        console.log(LOG_PREFIX, '脚本已注入，版本:', GM_info.script.version);

        // 延迟执行，确保 DOM 加载
        setTimeout(() => {
            createFloatingButton();
        }, 1000);
    }

    init();
})();

// ==UserScript==
// @name         阿里云百炼模型到期时间提取器
// @name:en      Bailian Model Expiry Extractor
// @name:zh      阿里云百炼模型到期时间提取器
// @namespace    https://greasyfork.org/zh-CN/scripts/543956-%E9%98%BF%E9%87%8C%E4%BA%91%E7%99%BE%E7%82%BC%E6%A8%A1%E5%9E%8B%E5%88%B0%E6%9C%9F%E6%97%B6%E9%97%B4%E6%8F%90%E5%8F%96%E5%99%A8
// @version      1.5.0
// @author       will
// @description  精准提取模型名称、Code、免费额度（支持百分比/无额度）、倒计时、到期时间，一键复制 Code。
// @description:en Accurately extract model name, code, quota (%, 0, or N/M), countdown, expiry, and copy code.
// @license      MIT
// @homepage     https://github.com/jwq2011/TamperMonkey-Scripts
// @supportURL   https://github.com/jwq2011/TamperMonkey-Scripts/issues
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

    (function loadUserSettings() {
        try {
            const saved = localStorage.getItem('bailian_user_settings');
            if (saved) {
                Object.assign(userSettings, JSON.parse(saved));
            }
        } catch (e) {
            console.error('[Bailian Settings] 加载用户设置失败:', e);
        }
    })();

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

        button.addEventListener('click', async () => {
            button.disabled = true;
            button.textContent = '🔍 提取中...';

            try {
                // 等待页面完全加载
                await waitForPageLoad();

                // 自动切换视图
                let needWait = false;
                if (await switchToListView()) {
                    needWait = true;
                }

                // 自动展开折叠区域
                if (await autoExpandFoldedRows()) {
                    needWait = true;
                }

                // 等待 DOM 更新
                if (needWait) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }

                const data = extractAllModels();
                if (data.length === 0) {
                    alert('❌ 未找到任何模型信息，请确认已打开【模型广场】页面并完全加载。');
                } else {
                    extractedData = data;
                    showResultsModal();
                }
            } catch (error) {
                console.error('执行过程中发生错误:', error);
                alert('❌ 执行过程中发生错误，请刷新页面后重试。');
            } finally {
                button.disabled = false;
                button.textContent = '📊 提取模型信息';
            }
        });

        document.body.appendChild(button);

        createSettingsPanel(); // 添加设置按钮

        log('✅ 按钮已创建');
    }

    // 等待页面加载完成
    function waitForPageLoad() {
        return new Promise((resolve) => {
            const maxWaitTime = 10000;
            const startTime = Date.now();

            function checkLoadStatus() {
                if (document.readyState === 'complete' ||
                    (document.querySelector('.efm_ant-table') &&
                     document.querySelector('.model-name__xEkXf'))) {
                    resolve();
                    return;
                }

                if (Date.now() - startTime > maxWaitTime) {
                    resolve();
                    return;
                }

                setTimeout(checkLoadStatus, 500);
            }

            checkLoadStatus();
        });
    }

    // 自动切换到列表视图（精准判断）
    async function switchToListView() {
        log('🔍 正在尝试切换到列表视图...');

        // 先检查当前视图状态
        const currentViewIcon = document.querySelector('.bl-icon-list-line.active__VRFfX');
        if (currentViewIcon) {
            log('✅ 当前已是列表视图');
            return false;
        }

        // 等待一段时间确保DOM完全渲染
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 尝试多种方式寻找列表视图按钮
        let clicked = false;

        // 方式1：查找所有列表图标
        const listViewIcons = document.querySelectorAll('.bl-icon-list-line');
        log(`找到 ${listViewIcons.length} 个列表视图图标`);

        for (let i = 0; i < listViewIcons.length; i++) {
            const icon = listViewIcons[i];
            const button = icon.closest('button');

            if (button) {
                // 检查按钮是否存在且可见
                if (button.offsetWidth > 0 && button.offsetHeight > 0) {
                    // 检查是否已经有active类
                    if (!button.classList.contains('active__VRFfX')) {
                        log(`尝试点击第 ${i+1} 个列表视图按钮`);
                        try {
                            button.click();
                            log('✅ 已点击切换到列表视图');
                            clicked = true;
                            await new Promise(resolve => setTimeout(resolve, 1000)); // 等待动画
                            break;
                        } catch (error) {
                            log(`点击按钮 ${i+1} 失败:`, error);
                        }
                    } else {
                        log(`按钮 ${i+1} 已经激活`);
                        clicked = false;
                    }
                } else {
                    log(`按钮 ${i+1} 不可见`);
                }
            } else {
                log(`按钮 ${i+1} 不存在或无法获取父元素`);
            }
        }

        // 方式2：如果没找到，尝试查找包含特定文本的按钮
        if (!clicked) {
            log('尝试通过文本查找列表视图按钮...');
            const buttons = document.querySelectorAll('button');
            for (let i = 0; i < buttons.length; i++) {
                const button = buttons[i];
                if (button.offsetWidth > 0 && button.offsetHeight > 0) {
                    const text = button.textContent || button.innerText || '';
                    if (text.includes('列表') || text.includes('List')) {
                        log(`找到包含"列表"的按钮，尝试点击`);
                        try {
                            button.click();
                            log('✅ 已点击包含"列表"的按钮');
                            clicked = true;
                            await new Promise(resolve => setTimeout(resolve, 1000)); // 等待动画
                            break;
                        } catch (error) {
                            log(`点击包含"列表"的按钮失败:`, error);
                        }
                    }
                }
            }
        }

        // 方式3：尝试强制刷新页面
        if (!clicked) {
            log('⚠️ 未找到可点击的列表视图按钮，将尝试刷新页面');
            // 为了防止页面卡死，我们只记录日志
        }

        return clicked;
    }

    // 自动展开折叠区域
    async function autoExpandFoldedRows() {
        log('🔍 正在尝试展开折叠区域...');

        // 等待一段时间确保DOM完全渲染
        await new Promise(resolve => setTimeout(resolve, 1000));

        let clicked = false;
        let expandedCount = 0;

        // 方法1: 查找所有展开/收起按钮
        const expandButtons = [...document.querySelectorAll('button.efm_ant-table-row-expand-icon')];
        log(`找到 ${expandButtons.length} 个展开/收起按钮`);

        for (const btn of expandButtons) {
            // 检查按钮是否可见
            if (btn.offsetWidth > 0 && btn.offsetHeight > 0) {
                // 检查是否为折叠状态（collapsed）
                const isCollapsed = btn.classList.contains('efm_ant-table-row-expand-icon-collapsed');
                const isExpanded = btn.classList.contains('efm_ant-table-row-expand-icon-expanded');

                if (isCollapsed) {
                    try {
                        btn.click();
                        log('✅ 点击展开按钮');
                        expandedCount++;
                        clicked = true;
                        await new Promise(resolve => setTimeout(resolve, 500)); // 等待动画
                    } catch (error) {
                        log('点击展开按钮失败:', error);
                    }
                } else if (isExpanded) {
                    log('✅ 按钮已是展开状态');
                }
            }
        }

        // 方法2: 如果没有找到折叠按钮，尝试查找其他可能的展开按钮
        if (expandedCount === 0) {
            const collapseButtons = [...document.querySelectorAll('button[aria-label="展开"], button[title="展开"]')];
            log(`备用方法：找到 ${collapseButtons.length} 个展开按钮`);

            for (const btn of collapseButtons) {
                if (btn.offsetWidth > 0 && btn.offsetHeight > 0) {
                    try {
                        btn.click();
                        log('✅ 点击展开按钮（备用方法）');
                        expandedCount++;
                        clicked = true;
                        await new Promise(resolve => setTimeout(resolve, 500)); // 等待动画
                    } catch (error) {
                        log('点击备用展开按钮失败:', error);
                    }
                }
            }
        }

        // 方法3: 如果还是没有找到，尝试查找所有带展开图标的按钮
        if (expandedCount === 0) {
            const allExpandButtons = [...document.querySelectorAll('button')];
            log(`第三种方法：总共找到 ${allExpandButtons.length} 个按钮`);

            for (const btn of allExpandButtons) {
                if (btn.offsetWidth > 0 && btn.offsetHeight > 0) {
                    // 检查按钮是否包含展开相关文字
                    const text = btn.textContent || btn.innerText || '';
                    const hasExpandText = text.includes('展开') || text.includes('展开') ||
                                         text.includes('expand') || text.includes('Expand');

                    if (hasExpandText) {
                        try {
                            btn.click();
                            log('✅ 通过文字匹配点击展开按钮');
                            expandedCount++;
                            clicked = true;
                            await new Promise(resolve => setTimeout(resolve, 500)); // 等待动画
                        } catch (error) {
                            log('通过文字匹配点击展开按钮失败:', error);
                        }
                    }
                }
            }
        }

        if (expandedCount > 0) {
            log(`✅ 成功展开 ${expandedCount} 个折叠项`);
        } else {
            log('⚠️ 未找到可展开的折叠项');
        }

        return clicked;
    }

    // 提取模型信息
    function extractAllModels() {
        log('🔍 开始提取模型数据...');

        // 等待页面完全加载
        const maxWaitTime = 5000;
        const startTime = Date.now();

        // 等待表格出现
        while (Date.now() - startTime < maxWaitTime) {
            const table = document.querySelector('.efm_ant-table');
            if (table) {
                log('✅ 表格已加载');
                break;
            }
            // 短暂等待
            const dummy = new Promise(resolve => setTimeout(resolve, 100));
            dummy.then(() => {});
        }

        // 查找行元素
        const rowSelectors = [
            'tr[data-row-key]',
            '.ant-table-row',
            'tr[role="row"]',
            '.efm_ant-table-row'
        ];

        let rows = [];
        for (const sel of rowSelectors) {
            rows = [...document.querySelectorAll(sel)];
            if (rows.length > 0) {
                log(`✅ 找到 ${rows.length} 行数据`);
                break;
            }
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

            // --- 可选字段提取（使用 nth-child 精准定位）---
            const modelType = userSettings.showModelType ? (row.querySelector('td:nth-child(3)')?.textContent || '—') : undefined;
            const contextLength = userSettings.showContextLength ? (row.querySelector('td:nth-child(4)')?.textContent || '—') : undefined;
            const price = userSettings.showPrice ? (row.querySelector('td:nth-child(5)')?.textContent || '—') : undefined;
            const protocol = userSettings.showProtocol ? (row.querySelector('td:nth-child(6)')?.textContent || '—') : undefined;
            const freeQuotaCol = row.querySelector('td:nth-child(7)')?.textContent || '—';
            const autoStopCol = row.querySelector('td:nth-child(8)')?.textContent || '—';
            const limit = userSettings.showLimit ? (row.querySelector('td:nth-child(9)')?.textContent || '—') : undefined;
            const description = userSettings.showDescription ? (row.querySelector('td:nth-child(10)')?.textContent || '—') : undefined;
            const vendor = (userSettings.showVendor && !isSubPage) ? (row.querySelector('td:nth-child(11)')?.textContent || '—') : undefined;
            const updateTime = (userSettings.showUpdateTime && !isSubPage) ? (row.querySelector('td:nth-child(12)')?.textContent || '—') : undefined;

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
            backgroundColor: 'white', width: '95%', maxWidth: '1200px', maxHeight: '85vh',
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
                        <th style="text-align:left;padding:10px;border:1px solid #ddd;">Code(点击自动复制)</th>
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
                const headers = [
                    '模型名称', 'Code', '免费额度', '倒计时显示', '到期时间',
                    ...(userSettings.showModelType ? ['模型类型'] : []),
                    ...(userSettings.showContextLength ? ['上下文长度'] : []),
                    ...(userSettings.showPrice ? ['价格'] : []),
                    ...(userSettings.showProtocol ? ['模型协议'] : []),
                    ...(userSettings.showLimit ? ['限流'] : []),
                    ...(userSettings.showDescription ? ['描述'] : []),
                    ...(userSettings.showVendor ? ['供应商'] : []),
                    ...(userSettings.showUpdateTime ? ['更新时间'] : [])
                ];

                const rows = extractedData.map(d => [
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
                ].map(s => `"${String(s).replace(/"/g, '""')}"`).join(','));

                const csv = [headers.join(','), ...rows].join('\n');
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

    // 创建设置按钮和弹窗
    function createSettingsPanel() {
        const settingsBtnId = 'bailian-settings-btn';
        if (document.getElementById(settingsBtnId)) return;

        // 设置按钮
        const settingsBtn = document.createElement('button');
        settingsBtn.id = settingsBtnId;
        Object.assign(settingsBtn.style, {
            position: 'fixed', top: '140px', right: '20px', zIndex: '2147483646',
            backgroundColor: '#4CAF50', color: 'white', border: 'none',
            padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
            fontSize: '16px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            opacity: 0.95, fontFamily: 'Arial, sans-serif'
        });
        settingsBtn.textContent = '⚙️ 设置';
        settingsBtn.title = '点击打开设置面板';

        settingsBtn.addEventListener('click', () => {
            showSettingsModal();
        });

        document.body.appendChild(settingsBtn);
        log('✅ 设置按钮已创建');
    }

    // 显示设置弹窗
    function showSettingsModal() {
        const modalId = 'bailian-settings-modal';
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
            backgroundColor: 'white', width: '90%', maxWidth: '500px', padding: '20px',
            borderRadius: '10px', position: 'relative'
        });

        const title = document.createElement('h3');
        title.textContent = '🔧 设置面板';
        content.appendChild(title);

        const form = document.createElement('div');
        form.style.marginTop = '15px';

        const fields = [
            { key: 'showModelType', label: '显示模型类型' },
            { key: 'showContextLength', label: '显示上下文长度' },
            { key: 'showPrice', label: '显示价格' },
            { key: 'showProtocol', label: '显示模型协议' },
            { key: 'showLimit', label: '显示限流' },
            { key: 'showDescription', label: '显示描述' },
            { key: 'showVendor', label: '显示供应商（仅主页面）' },
            { key: 'showUpdateTime', label: '显示更新时间（仅主页面）' }
        ];

        fields.forEach(field => {
            const div = document.createElement('div');
            div.style.marginBottom = '12px';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `setting-${field.key}`;
            checkbox.checked = userSettings[field.key];
            checkbox.onchange = () => {
                userSettings[field.key] = checkbox.checked;
                localStorage.setItem('bailian_user_settings', JSON.stringify(userSettings));
            };

            const label = document.createElement('label');
            label.htmlFor = `setting-${field.key}`;
            label.textContent = field.label;
            label.style.marginLeft = '8px';

            div.appendChild(checkbox);
            div.appendChild(label);
            form.appendChild(div);
        });

        content.appendChild(form);

        const saveBtn = document.createElement('button');
        saveBtn.textContent = '✅ 保存并关闭';
        saveBtn.style.marginTop = '20px';
        saveBtn.style.padding = '10px 16px';
        saveBtn.style.backgroundColor = '#007cba';
        saveBtn.style.color = 'white';
        saveBtn.style.border = 'none';
        saveBtn.style.borderRadius = '4px';
        saveBtn.style.cursor = 'pointer';
        saveBtn.onclick = () => {
            document.body.removeChild(modal);
            alert('✅ 设置已保存，下次提取时生效。');
        };
        content.appendChild(saveBtn);

        const close = document.createElement('span');
        close.textContent = '×';
        close.style.position = 'absolute'; close.style.top = '10px'; close.style.right = '16px';
        close.style.fontSize = '24px'; close.style.cursor = 'pointer';
        close.onclick = () => document.body.removeChild(modal);
        content.appendChild(close);

        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    // 初始化
    function init() {
        console.log(LOG_PREFIX, '脚本已注入，版本:', GM_info.script.version);
        setTimeout(createFloatingButton, 1000);
    }

    init();
})();

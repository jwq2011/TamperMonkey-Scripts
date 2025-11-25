// ==UserScript==
// @name         Jira Activity Module Fullscreen Toggle with AI Analysis
// @namespace    http://tampermonkey.net/
// @version      2.0.5
// @description  Add fullscreen toggle and AI-powered analysis for Jira activity log module.
// @description  为 Jira 活动日志模块添加全屏切换和 AI 分析功能。
// @author       Will
// @license      MIT
// @homepage     https://github.com/jwq2011/TamperMonkey-Scripts
// @supportURL   https://github.com/jwq2011/TamperMonkey-Scripts/issues
// @match        *://jira-sh.xxxxauto.com:8080/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      dashscope.aliyuncs.com
// @connect      jira-sh.xxxxauto.com
// @require      https://cdn.jsdelivr.net/npm/marked/marked.min.js
// @compatible   tampermonkey
// @compatible   violentmonkey
// @compatible   greasemonkey
// @run-at       document-idle
// @downloadURL https://update.greasyfork.org/scripts/552113/Jira%20Activity%20Module%20Fullscreen%20Toggle%20with%20AI%20Analysis.user.js
// @updateURL https://update.greasyfork.org/scripts/552113/Jira%20Activity%20Module%20Fullscreen%20Toggle%20with%20AI%20Analysis.meta.js
// ==/UserScript==

(function () {
    'use strict';

    if (window.activityFullscreenScriptLoaded) return;
    window.activityFullscreenScriptLoaded = true;

    const DEFAULT_TEMPLATE = `问题时间：
分析科室：BSP
分析日志文件名：
分析过程：问题时间点为XXXX，聚焦问题时间点展开因果分析。
分析结论：正常修复；正常扭转；压测复现；
修复计划：XXX完成代码合入、XXX完成代码提交。
扭转科室：IVI
扭转目的：需要XXXX组检查某某时间段有无异常。`;

    const DEFAULT_MODELS = ['qwen-plus', 'qwen-max', 'qwen-turbo', 'qwen-flash-2025-07-28', 'qwen-flash', 'qwen-plus-2025-07-14', 'qwen3-30b-a3b-instruct-2507'];
    const PROMPTS = [
        {
            id: 'project-manager',
            name: '项目经理分析',
            content: `你是一名资深项目经理兼技术分析师，请仔细阅读以下 JIRA 活动日志内容，分析并总结以下几点：

1. **关键讨论点**：有哪些重要的讨论、意见分歧或建议？
2. **变更记录**：涉及哪些字段修改、状态流转或责任人调整？
3. **风险与问题**：是否存在延期风险、技术难点、资源瓶颈？
4. **结论与行动项**：最终达成什么共识？谁负责下一步？

日志内容如下：

{content}`
        },
        {
            id: 'jira-expert',
            name: 'JIRA专家分析',
            content: `作为JIRA系统分析专家，请执行以下结构化步骤分析当前网页：
 1. **提取关键内容**：从HTML或截图中识别核心元素——问题ID（格式：PROJECT-XXX）、摘要标题、状态（如“进行中”）、优先级标签、分配负责人。若存在评论区，列出最新3条评论的发送者和时间戳。
 2. **解析活动日志**：扫描“Activity”区域，提取过去24小时内的日志条目（操作类型：创建/更新/解决；操作者；时间）。按时间倒序汇总，重点标注状态变更（如“从‘待办’转为‘进行中’”）。
 3. **生成总结**：用非技术语言简述当前状态（例如：“问题处于解决阶段，最近被John Doe更新，包含2条新评论”），并指出潜在风险（如“超过24小时未更新，可能阻塞进度”）。
 4. **输出价值建议**：提供3项可操作洞察——① 优先级建议（如“高优先级问题需今日处理”）；② 后续步骤（如“联系分配者确认解决时间”）；③ 业务价值点（如“此问题影响sprint目标，延迟将导致交付延期”）。

 输出格式：严格使用Markdown分段，标题为【当前摘要】【活动日志摘要】【行动建议】，避免技术术语，确保5分钟内可读完。

 日志内容如下：

{content}`
        }
    ];
    const DASHSCOPE_API_KEY = GM_getValue('DASHSCOPE_API_KEY', '');
    const MODEL_NAME = GM_getValue('MODEL_NAME', 'qwen-plus');
    const PROMPT_ID = GM_getValue('PROMPT_ID', 'jira-expert');
    const TEMPLATE_CONTENT = GM_getValue('TEMPLATE_CONTENT', DEFAULT_TEMPLATE);

    GM_addStyle(`
        .activity-fullscreen-btn, .activity-analyze-btn, .activity-config-btn, .activity-template-btn {
            margin-left: 10px;
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .activity-fullscreen-btn { background-color: #0052cc; }
        .activity-fullscreen-btn.exit { background-color: #d04437; }
        .activity-analyze-btn { background-color: #008000; }
        .activity-config-btn { background-color: #ff9900; }
        .activity-template-btn { background-color: #666666; }

        #exit-fullscreen-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background-color: #d04437;
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        #ai-config-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10001;
            width: 400px;
        }
        #ai-config-modal label {
            display: block;
            margin-top: 10px;
        }
        #ai-config-modal input, #ai-config-modal select {
            width: 100%;
            padding: 6px;
            margin-top: 4px;
        }
        #ai-config-modal button {
            margin-top: 15px;
            padding: 8px 12px;
            background-color: #0052cc;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        #overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
        }

        /* AI Result Modal */
        #ai-result-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10002;
            width: 80%;
            max-width: 800px;
            max-height: 80vh;
            overflow: hidden;
            resize: both;
            display: flex;
            flex-direction: column;
        }

        #ai-result-header {
            padding: 10px 15px;
            background: #0052cc;
            color: white;
            cursor: move;
            user-select: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        #ai-result-close {
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
        }

        #ai-result-content {
            padding: 15px;
            overflow-y: auto;
            flex-grow: 1;
        }

        #ai-result-actions {
            padding: 10px;
            text-align: right;
            border-top: 1px solid #eee;
        }

        #ai-result-actions button {
            margin-left: 10px;
            padding: 6px 12px;
            background-color: #0052cc;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        
        /* Loading indicator for AI analysis */
        .ai-analysis-loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
            margin-right: 10px;
            vertical-align: middle;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Template Editor Modal */
        #template-editor-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10001;
            width: 600px;
            max-width: 90%;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
        }
        
        #template-editor-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        #template-editor-title {
            margin: 0;
            font-size: 18px;
        }
        
        #template-editor-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
        }
        
        #template-textarea {
            flex-grow: 1;
            min-height: 300px;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            resize: vertical;
            font-family: monospace;
        }
        
        #template-editor-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 15px;
        }
        
        #template-save-btn, #template-reset-btn, #template-copy-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        
        #template-save-btn {
            background-color: #0052cc;
            color: white;
        }
        
        #template-reset-btn {
            background-color: #ff9900;
            color: white;
        }
        
        #template-copy-btn {
            background-color: #008000;
            color: white;
        }
    `);

    function createButtons() {
        const activityModule = document.getElementById('activitymodule');
        if (!activityModule) return;

        const heading = activityModule.querySelector('#activitymodule_heading');
        if (!heading) return;

        [...heading.querySelectorAll('.activity-fullscreen-btn, .activity-analyze-btn, .activity-config-btn, .activity-template-btn')].forEach(btn => btn.remove());

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'activity-fullscreen-btn';
        toggleBtn.textContent = '全屏模式';
        toggleBtn.addEventListener('click', toggleFullscreen);
        heading.appendChild(toggleBtn);

        const analyzeBtn = document.createElement('button');
        analyzeBtn.className = 'activity-analyze-btn';
        analyzeBtn.textContent = 'AI 分析';
        analyzeBtn.addEventListener('click', analyzeContent);
        heading.appendChild(analyzeBtn);

        const templateBtn = document.createElement('button');
        templateBtn.className = 'activity-template-btn';
        templateBtn.textContent = '模板';
        templateBtn.addEventListener('click', openTemplateEditor);
        heading.appendChild(templateBtn);

        const configBtn = document.createElement('button');
        configBtn.className = 'activity-config-btn';
        configBtn.textContent = '配置';
        configBtn.addEventListener('click', openConfigModal);
        heading.appendChild(configBtn);
    }

    function toggleFullscreen() {
        const activityModule = document.getElementById('activitymodule');
        const toggleBtn = document.querySelector('.activity-fullscreen-btn');
        const isFullscreen = activityModule.classList.contains('fullscreen-active');

        if (!isFullscreen) {
            activityModule.classList.add('fullscreen-active');
            activityModule.style.cssText = `
                position: fixed !important;
                top: 70px !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                z-index: 9999 !important;
                width: 100% !important;
                height: calc(100% - 70px) !important;
                margin: 0 !important;
                padding: 20px !important;
                overflow-y: auto !important;
                background-color: #fff !important;
                box-shadow: 0 0 15px rgba(0,0,0,0.2) !important;
                box-sizing: border-box !important;
            `;
            document.querySelector('.aui-sidebar')?.style.setProperty('display', 'none', 'important');

            const content = document.querySelector('.issue-body-content');
            content?.querySelectorAll('.module').forEach(module => {
                if (module.id !== 'activitymodule' && module.id !== 'stalker') {
                    module.style.display = 'none';
                    module.dataset.wasHidden = 'true';
                }
            });

            toggleBtn.textContent = '退出全屏';
            toggleBtn.classList.add('exit');

            const exitBtn = document.createElement('button');
            exitBtn.id = 'exit-fullscreen-btn';
            exitBtn.textContent = '退出全屏';
            exitBtn.addEventListener('click', toggleFullscreen);
            document.body.appendChild(exitBtn);

        } else {
            activityModule.classList.remove('fullscreen-active');
            activityModule.style.cssText = '';
            document.querySelector('.aui-sidebar')?.style.removeProperty('display');

            const content = document.querySelector('.issue-body-content');
            content?.querySelectorAll('.module').forEach(module => {
                if (module.dataset.wasHidden === 'true') {
                    module.style.display = '';
                    delete module.dataset.wasHidden;
                }
            });

            toggleBtn.textContent = '全屏模式';
            toggleBtn.classList.remove('exit');
            document.getElementById('exit-fullscreen-btn')?.remove();
        }
    }

    async function analyzeContent() {
        const contentDiv = document.querySelector('.mod-content');
        if (!contentDiv) {
            showResultModal("未找到内容区域");
            return;
        }

        showResultModal("正在收集页面内容，请稍候...");
        
        // 获取完整的活动日志内容
        const fullContent = await getFullActivityContent();
        
        if (!fullContent.trim()) {
            showResultModal("内容为空");
            return;
        }

        showResultModal("正在分析中，请稍候...");

        // 获取当前选中的prompt
        const currentPromptId = GM_getValue('PROMPT_ID', 'jira-expert');
        const currentPrompt = PROMPTS.find(p => p.id === currentPromptId) || PROMPTS[1]; // 默认使用JIRA专家分析
        const promptContent = currentPrompt.content.replace('{content}', fullContent);

        try {
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
                    headers: {
                        'Authorization': `Bearer ${GM_getValue('DASHSCOPE_API_KEY')}`,
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({
                        model: GM_getValue('MODEL_NAME'),
                        messages: [
                            { role: 'system', content: '你是一位经验丰富的项目管理与技术分析专家。' },
                            { role: 'user', content: promptContent }
                        ]
                    }),
                    onload: res => {
                        try {
                            const result = JSON.parse(res.responseText);
                            resolve(result);
                        } catch (e) {
                            reject(e);
                        }
                    },
                    onerror: reject
                });
            });

            const result = response.choices?.[0]?.message?.content || '分析失败';
            showResultModal(result);
        } catch (err) {
            console.error(err);
            showResultModal("分析失败，请检查网络或 API 配置");
        }
    }

    /**
     * 获取完整的活动日志内容，包括所有标签页
     */
    async function getFullActivityContent() {
        const modContent = document.querySelector('.mod-content');
        if (!modContent) return '';

        // 直接获取当前页面上所有内容，而不需要额外的AJAX请求
        // 移除脚本标签和其他不必要的元素
        const clonedContent = modContent.cloneNode(true);
        const scripts = clonedContent.querySelectorAll('script');
        scripts.forEach(script => script.remove());
        
        // 获取纯文本内容
        return clonedContent.innerText;
    }

    function showResultModal(content) {
        // 移除已有弹窗
        const oldOverlay = document.getElementById('overlay');
        const oldModal = document.getElementById('ai-result-modal');
        if (oldOverlay) oldOverlay.remove();
        if (oldModal) oldModal.remove();

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.id = 'overlay';
        document.body.appendChild(overlay);

        // 创建弹窗主体
        const modal = document.createElement('div');
        modal.id = 'ai-result-modal';

        const header = document.createElement('div');
        header.id = 'ai-result-header';
        header.textContent = 'AI 分析结果';

        const closeBtn = document.createElement('button');
        closeBtn.id = 'ai-result-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => {
            document.body.removeChild(overlay);
            document.body.removeChild(modal);
        };
        header.appendChild(closeBtn);

        const contentBox = document.createElement('div');
        contentBox.id = 'ai-result-content';
        
        // 安全地解析内容，如果marked不可用则使用普通文本
        try {
            contentBox.innerHTML = marked.parse(content);
        } catch (e) {
            contentBox.innerHTML = '<pre>' + content.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>';
        }

        const actions = document.createElement('div');
        actions.id = 'ai-result-actions';

        const copyBtn = document.createElement('button');
        copyBtn.textContent = '复制';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(content).then(() => {
                alert("已复制到剪贴板");
            }).catch(err => {
                // 降级处理
                const textArea = document.createElement('textarea');
                textArea.value = content;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    alert("已复制到剪贴板");
                } catch (err) {
                    alert("复制失败，请手动复制");
                }
                document.body.removeChild(textArea);
            });
        };

        const newWindowBtn = document.createElement('button');
        newWindowBtn.textContent = '新窗口打开';
        newWindowBtn.onclick = () => {
            const win = window.open('', '_blank');
            win.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>AI 分析结果</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        pre { white-space: pre-wrap; }
                    </style>
                </head>
                <body>
                    ${contentBox.innerHTML}
                </body>
                </html>
            `);
            win.document.close();
        };

        actions.appendChild(copyBtn);
        actions.appendChild(newWindowBtn);

        modal.appendChild(header);
        modal.appendChild(contentBox);
        modal.appendChild(actions);
        document.body.appendChild(modal);

        // 拖拽功能
        let isDragging = false;
        let offsetX, offsetY;

        header.onmousedown = (e) => {
            isDragging = true;
            offsetX = e.clientX - modal.getBoundingClientRect().left;
            offsetY = e.clientY - modal.getBoundingClientRect().top;
            modal.style.cursor = 'grabbing';
        };

        document.onmousemove = (e) => {
            if (!isDragging) return;
            modal.style.left = `${e.clientX - offsetX}px`;
            modal.style.top = `${e.clientY - offsetY}px`;
            modal.style.transform = 'none';
        };

        document.onmouseup = () => {
            isDragging = false;
            modal.style.cursor = 'default';
        };
    }

    function openConfigModal() {
        const overlay = document.createElement('div');
        overlay.id = 'overlay';
        document.body.appendChild(overlay);

        const modal = document.createElement('div');
        modal.id = 'ai-config-modal';

        const keyLabel = document.createElement('label');
        keyLabel.textContent = 'API Key';
        const keyInput = document.createElement('input');
        keyInput.type = 'password';
        keyInput.value = GM_getValue('DASHSCOPE_API_KEY', '');
        keyLabel.appendChild(keyInput);

        const modelLabel = document.createElement('label');
        modelLabel.textContent = '模型名称';
        const modelSelect = document.createElement('select');
        DEFAULT_MODELS.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            if (model === GM_getValue('MODEL_NAME', 'qwen-plus')) option.selected = true;
            modelSelect.appendChild(option);
        });
        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.textContent = '自定义...';
        modelSelect.appendChild(customOption);
        modelLabel.appendChild(modelSelect);

        const customInput = document.createElement('input');
        customInput.placeholder = '输入模型名称';
        customInput.style.display = modelSelect.value === 'custom' ? 'block' : 'none';
        modelSelect.addEventListener('change', () => {
            customInput.style.display = modelSelect.value === 'custom' ? 'block' : 'none';
        });

        const promptLabel = document.createElement('label');
        promptLabel.textContent = '分析模板';
        const promptSelect = document.createElement('select');
        PROMPTS.forEach(prompt => {
            const option = document.createElement('option');
            option.value = prompt.id;
            option.textContent = prompt.name;
            if (prompt.id === GM_getValue('PROMPT_ID', 'jira-expert')) option.selected = true;
            promptSelect.appendChild(option);
        });
        promptLabel.appendChild(promptSelect);

        const saveBtn = document.createElement('button');
        saveBtn.textContent = '保存配置';
        saveBtn.onclick = () => {
            GM_setValue('DASHSCOPE_API_KEY', keyInput.value);
            const selectedModel = modelSelect.value === 'custom' ? customInput.value : modelSelect.value;
            GM_setValue('MODEL_NAME', selectedModel);
            GM_setValue('PROMPT_ID', promptSelect.value);
            alert('配置已保存');
            document.body.removeChild(overlay);
            document.body.removeChild(modal);
        };

        modal.appendChild(keyLabel);
        modal.appendChild(modelLabel);
        modal.appendChild(modelSelect);
        modal.appendChild(customInput);
        modal.appendChild(promptLabel);
        modal.appendChild(promptSelect);
        modal.appendChild(saveBtn);
        document.body.appendChild(modal);
    }

    function openTemplateEditor() {
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.id = 'overlay';
        document.body.appendChild(overlay);

        // 创建模态框
        const modal = document.createElement('div');
        modal.id = 'template-editor-modal';

        // 创建头部
        const header = document.createElement('div');
        header.id = 'template-editor-header';

        const title = document.createElement('h3');
        title.id = 'template-editor-title';
        title.textContent = '模板编辑器';

        const closeBtn = document.createElement('button');
        closeBtn.id = 'template-editor-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => {
            document.body.removeChild(overlay);
            document.body.removeChild(modal);
        };

        header.appendChild(title);
        header.appendChild(closeBtn);

        // 创建文本区域
        const textarea = document.createElement('textarea');
        textarea.id = 'template-textarea';
        textarea.value = GM_getValue('TEMPLATE_CONTENT', DEFAULT_TEMPLATE);

        // 创建操作按钮
        const actions = document.createElement('div');
        actions.id = 'template-editor-actions';

        const copyBtn = document.createElement('button');
        copyBtn.id = 'template-copy-btn';
        copyBtn.textContent = '复制到剪贴板';
        copyBtn.onclick = () => {
            const content = textarea.value;
            // 直接使用降级处理方法以确保兼容性
            const textArea = document.createElement('textarea');
            textArea.value = content;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            textArea.setSelectionRange(0, 99999); // A method for mobile devices
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    alert('模板已复制到剪贴板');
                } else {
                    alert('复制失败，请手动复制');
                }
            } catch (err) {
                alert('复制失败，请手动复制');
            }
            document.body.removeChild(textArea);
        };

        const resetBtn = document.createElement('button');
        resetBtn.id = 'template-reset-btn';
        resetBtn.textContent = '重置为默认';
        resetBtn.onclick = () => {
            if (confirm('确定要重置为默认模板吗？')) {
                textarea.value = DEFAULT_TEMPLATE;
            }
        };

        const saveBtn = document.createElement('button');
        saveBtn.id = 'template-save-btn';
        saveBtn.textContent = '保存';
        saveBtn.onclick = () => {
            GM_setValue('TEMPLATE_CONTENT', textarea.value);
            alert('模板已保存');
            document.body.removeChild(overlay);
            document.body.removeChild(modal);
        };

        actions.appendChild(copyBtn);
        actions.appendChild(resetBtn);
        actions.appendChild(saveBtn);

        // 组装模态框
        modal.appendChild(header);
        modal.appendChild(textarea);
        modal.appendChild(actions);

        document.body.appendChild(modal);
    }

    function initialize() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                createButtons();
            });
        } else {
            createButtons();
        }

        setTimeout(() => {
            if (!document.querySelector('.activity-fullscreen-btn')) {
                createButtons();
            }
        }, 3000);
    }

    initialize();
})();
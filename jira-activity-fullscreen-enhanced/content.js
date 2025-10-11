// content.js —— 动态判断是否在用户配置的域名中运行
(function() {
    'use strict';

    // 防重复执行
    if (window.activityFullscreenScriptLoaded) return;
    window.activityFullscreenScriptLoaded = true;

    // 从 storage 读取配置
    chrome.storage.sync.get(['enabledDomains', 'isEnabled'], function(config) {
        if (!config.isEnabled) return;

        const currentHost = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : '';
        const fullHost = currentHost + port;

        if (!config.enabledDomains || !config.enabledDomains.includes(fullHost)) {
            console.log(`[Jira全屏助手] 当前域名 ${fullHost} 未在配置中，跳过注入。`);
            return;
        }

        console.log(`[Jira全屏助手] 在 ${fullHost} 注入成功。`);

        // 创建按钮函数
        function createToggleButton() {
            const activityModule = document.getElementById('activitymodule');
            if (!activityModule) return;

            const heading = activityModule.querySelector('#activitymodule_heading');
            if (!heading) return;

            const existingButton = heading.querySelector('.activity-fullscreen-btn');
            if (existingButton) existingButton.remove();

            const button = document.createElement('button');
            button.className = 'activity-fullscreen-btn';
            button.textContent = '全屏模式';
            button.style.cssText = `
                margin-left: 15px;
                padding: 6px 16px;
                background-color: #0052cc;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                font-weight: normal;
                vertical-align: middle;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                transition: all 0.2s ease;
            `;

            heading.appendChild(button);

            let isFullscreen = false;

            button.addEventListener('click', function() {
                toggleFullscreen(activityModule, button, isFullscreen);
                isFullscreen = !isFullscreen;
            });

            console.log('✅ Jira 全屏助手：按钮已添加');
        }

        function toggleFullscreen(module, btn, isOn) {
            if (!isOn) {
                module.style.cssText = `
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

                const sidebar = document.querySelector('.aui-sidebar');
                if (sidebar) sidebar.style.display = 'none';

                const content = document.querySelector('.issue-body-content');
                if (content) {
                    const modules = content.querySelectorAll('.module');
                    modules.forEach(m => {
                        if (m.id !== 'activitymodule' && m.id !== 'stalker') {
                            m.style.display = 'none';
                            m.dataset.wasHidden = 'true';
                        }
                    });
                }

                btn.textContent = '退出全屏';
                btn.style.backgroundColor = '#d04437';
            } else {
                module.style.cssText = '';

                const sidebar = document.querySelector('.aui-sidebar');
                if (sidebar) sidebar.style.display = '';

                const content = document.querySelector('.issue-body-content');
                if (content) {
                    const modules = content.querySelectorAll('.module');
                    modules.forEach(m => {
                        if (m.dataset.wasHidden === 'true') {
                            m.style.display = '';
                            delete m.dataset.wasHidden;
                        }
                    });
                }

                btn.textContent = '全屏模式';
                btn.style.backgroundColor = '#0052cc';
            }
        }

        function initialize() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', createToggleButton);
            } else {
                createToggleButton();
            }

            setTimeout(() => {
                if (!document.querySelector('.activity-fullscreen-btn')) {
                    createToggleButton();
                }
            }, 3000);
        }

        initialize();
    });
})();

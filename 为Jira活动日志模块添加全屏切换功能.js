// ==UserScript==
// @name         Jira Activity Module Fullscreen Toggle
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  为Jira活动日志模块添加全屏切换功能（默认关闭，手动启用）
// @author       Will
// @homepage     https://github.com/jwq2011/TamperMonkey-Scripts
// @supportURL   https://github.com/jwq2011/TamperMonkey-Scripts/issues
// @match        *://jira-sh.xxxxauto.com:8080/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // 防止重复执行
    if (window.activityFullscreenScriptLoaded) {
        return;
    }
    window.activityFullscreenScriptLoaded = true;

    // 创建按钮的函数
    function createToggleButton() {
        const activityModule = document.getElementById('activitymodule');
        if (!activityModule) {
            console.log('未找到活动日志模块');
            return;
        }

        // 查找标题元素
        const heading = activityModule.querySelector('#activitymodule_heading');
        if (!heading) {
            console.log('未找到活动日志标题');
            return;
        }

        // 移除可能存在的旧按钮
        const existingButton = heading.querySelector('.activity-fullscreen-btn');
        if (existingButton) {
            existingButton.remove();
        }

        // 创建新按钮
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

        // 添加到标题中
        heading.appendChild(button);

        // 设置状态
        let isFullscreen = false;

        // 点击事件处理
        button.addEventListener('click', function() {
            if (!isFullscreen) {
                // 进入全屏模式
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
                
                // 隐藏侧边栏
                const sidebar = document.querySelector('.aui-sidebar');
                if (sidebar) {
                    sidebar.style.display = 'none';
                }
                
                // 隐藏内容区域中的其他模块
                const content = document.querySelector('.issue-body-content');
                if (content) {
                    const modules = content.querySelectorAll('.module');
                    modules.forEach(module => {
                        if (module.id !== 'activitymodule' && module.id !== 'stalker') {
                            module.style.display = 'none';
                            module.dataset.wasHidden = 'true';
                        }
                    });
                }
                
                isFullscreen = true;
                button.textContent = '退出全屏';
                button.style.backgroundColor = '#d04437';
                
                console.log('已进入全屏模式');
            } else {
                // 退出全屏模式
                activityModule.style.cssText = '';
                
                // 显示侧边栏
                const sidebar = document.querySelector('.aui-sidebar');
                if (sidebar) {
                    sidebar.style.display = '';
                }
                
                // 显示内容区域中的其他模块
                const content = document.querySelector('.issue-body-content');
                if (content) {
                    const modules = content.querySelectorAll('.module');
                    modules.forEach(module => {
                        if (module.dataset.wasHidden === 'true') {
                            module.style.display = '';
                            delete module.dataset.wasHidden;
                        }
                    });
                }
                
                isFullscreen = false;
                button.textContent = '全屏模式';
                button.style.backgroundColor = '#0052cc';
                
                console.log('已退出全屏模式');
            }
        });

        console.log('全屏切换按钮已添加');
    }

    // 初始化函数
    function initialize() {
        // 等待页面加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createToggleButton);
        } else {
            createToggleButton();
        }
        
        // 如果3秒内按钮还没创建，再尝试一次
        setTimeout(() => {
            if (!document.querySelector('.activity-fullscreen-btn')) {
                createToggleButton();
            }
        }, 3000);
    }

    // 启动脚本
    initialize();
})();

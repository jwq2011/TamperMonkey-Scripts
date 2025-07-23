// ==UserScript==
// @name         Reddit Chinese Translation Detector
// @name:zh-CN   Reddit 中文翻译检测器
// @name:zh-TW   Reddit 中文翻譯檢測器
// @namespace    http://tampermonkey.net/
// @version      1.2.1
// @description  Detect and navigate to Chinese translated Reddit posts. Automatically checks if Reddit posts support ?tl=zh-hans parameter and provides one-click switching.
// @description:zh-CN  检测并导航到 Reddit 的中文翻译帖子。自动检查 Reddit 帖子是否支持切换参数，并提供一键切换功能。
// @description:zh-TW  檢測並導航到 Reddit 的中文翻譯貼文。自動檢查 Reddit 貼文是否支援切換參數，並提供一鍵切換功能。
// @author       You
// @match        https://www.reddit.com/*
// @exclude      https://www.reddit.com/login*
// @exclude      https://www.reddit.com/register*
// @grant        GM_xmlhttpRequest
// @connect      www.reddit.com
// @license      MIT
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 配置键名
    const CONFIG_KEY = 'reddit_chinese_translation_detector_enabled';

    // 检查是否已启用
    let isEnabled = localStorage.getItem(CONFIG_KEY) === 'true';

    // 创建样式
    const style = document.createElement('style');
    style.textContent = `
        #translation-toggle-container {
            position: fixed !important;
            top: 10px !important;
            right: 10px !important;
            z-index: 2147483647 !important;
            display: flex !important;
            gap: 10px !important;
            align-items: center !important;
            background: rgba(255, 255, 255, 0.95) !important;
            padding: 10px !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2) !important;
            font-family: Arial, sans-serif !important;
            font-size: 14px !important;
            border: 1px solid #ccc !important;
        }

        #translation-toggle-label {
            margin: 0 !important;
            color: #333 !important;
            white-space: nowrap !important;
        }

        #translation-toggle {
            margin: 0 5px !important;
            transform: scale(1.2) !important;
        }

        #translation-button {
            padding: 8px 16px !important;
            background-color: #0079d3 !important;
            color: white !important;
            border: none !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            font-size: 14px !important;
            font-weight: bold !important;
            transition: all 0.2s !important;
            white-space: nowrap !important;
        }

        #translation-button:hover:not(:disabled) {
            background-color: #0066b2 !important;
            transform: translateY(-1px) !important;
        }

        #translation-button:disabled {
            background-color: #cccccc !important;
            cursor: not-allowed !important;
            transform: none !important;
        }

        #translation-button.checking {
            background-color: #ffd700 !important;
            color: #333 !important;
        }

        @media (max-width: 768px) {
            #translation-toggle-container {
                top: 5px !important;
                right: 5px !important;
                padding: 8px !important;
                font-size: 12px !important;
                max-width: 90vw !important;
            }

            #translation-button {
                padding: 6px 12px !important;
                font-size: 12px !important;
            }
        }
    `;
    document.head.appendChild(style);

    // 创建控制面板
    function createControlPanel() {
        // 移除可能存在的旧面板
        const oldPanel = document.getElementById('translation-toggle-container');
        if (oldPanel) {
            oldPanel.remove();
        }

        const container = document.createElement('div');
        container.id = 'translation-toggle-container';

        const label = document.createElement('span');
        label.id = 'translation-toggle-label';
        label.textContent = '翻译检测:';

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.id = 'translation-toggle';
        toggle.checked = isEnabled;

        const button = document.createElement('button');
        button.id = 'translation-button';
        button.textContent = isEnabled ? '检测中...' : '已禁用';
        button.disabled = true;

        container.appendChild(label);
        container.appendChild(toggle);
        container.appendChild(button);

        document.body.appendChild(container);

        // 事件监听
        toggle.addEventListener('change', function() {
            isEnabled = this.checked;
            localStorage.setItem(CONFIG_KEY, isEnabled);
            if (isEnabled) {
                button.disabled = true;
                button.textContent = '检测中...';
                checkTranslation();
            } else {
                button.disabled = true;
                button.textContent = '已禁用';
            }
        });

        button.addEventListener('click', function() {
            const currentUrl = window.location.href;
            const translatedUrl = addTranslationParam(currentUrl);
            window.location.href = translatedUrl;
        });

        return { toggle, button };
    }

    // 添加翻译参数
    function addTranslationParam(url) {
        const urlObj = new URL(url);
        // 先移除可能存在的tl参数
        urlObj.searchParams.delete('tl');
        urlObj.searchParams.set('tl', 'zh-hans');
        return urlObj.toString();
    }

    // 检测翻译页面是否真正支持
    function checkTranslation() {
        // 如果已禁用，不执行检测
        if (!isEnabled) {
            return;
        }

        const { button } = window.translationElements;

        // 检查是否已经是翻译页面
        const currentUrl = window.location.href;
        const urlObj = new URL(currentUrl);
        if (urlObj.searchParams.get('tl') === 'zh-hans') {
            button.disabled = true;
            button.textContent = '已是中文';
            return;
        }

        // 只在特定页面类型检测（帖子页面）
        if (!isPostPage()) {
            button.disabled = true;
            button.textContent = '仅限帖子页';
            return;
        }

        button.classList.add('checking');
        button.disabled = true;
        button.textContent = '检测中...';

        const translatedUrl = addTranslationParam(currentUrl);

        // 使用 GM_xmlhttpRequest 进行实际验证测试
        GM_xmlhttpRequest({
            method: 'GET',
            url: translatedUrl,
            onload: function(response) {
                button.classList.remove('checking');
                try {
                    // 检查最终URL是否保持了tl=zh-hans参数
                    const finalUrl = response.finalUrl || translatedUrl;
                    const finalUrlObj = new URL(finalUrl);
                    const hasTranslationParam = finalUrlObj.searchParams.get('tl') === 'zh-hans';

                    // 检查响应状态
                    const isValidStatus = response.status === 200;

                    // 检查是否是真正支持翻译的页面
                    // 通过检查页面内容中的关键特征来判断
                    const pageContent = response.responseText;

                    // 检查是否重定向到了错误页面
                    const isNoThinkPage = (
                        finalUrl.includes('/no_think') ||
                        pageContent.includes('/no_think') ||
                        pageContent.includes('no_think')
                    );

                    // 检查是否有网络错误
                    const hasNetworkError = (
                        response.status === 0 ||
                        pageContent.includes('ERR_TUNNEL_CONNECTION_FAILED') ||
                        pageContent.includes('net::ERR_')
                    );

                    // 检查是否是有效的Reddit帖子页面（包含帖子相关内容）
                    const hasPostContent = (
                        pageContent.includes('data-testid="post-container"') ||
                        pageContent.includes('class="Post"') ||
                        (pageContent.includes('post-title') && pageContent.includes('Comments'))
                    );

                    // 检查页面标题是否包含翻译标识
                    const hasTranslationInTitle = (
                        pageContent.includes('>Translated<') ||
                        pageContent.includes('翻译') ||
                        pageContent.includes('translated')
                    );

                    // 检查页面语言属性
                    const hasChineseLangAttr = (
                        pageContent.includes('lang="zh"') ||
                        pageContent.includes('lang="zh-CN"') ||
                        pageContent.includes('lang="zh-Hans"')
                    );

                    console.log('Translation check debug info:', {
                        status: response.status,
                        finalUrl: finalUrl,
                        hasTranslationParam: hasTranslationParam,
                        isNoThinkPage: isNoThinkPage,
                        hasNetworkError: hasNetworkError,
                        hasPostContent: hasPostContent,
                        hasTranslationInTitle: hasTranslationInTitle,
                        hasChineseLangAttr: hasChineseLangAttr
                    });

                    // 最严格的验证逻辑：
                    // 1. 状态必须是200
                    // 2. 必须保持翻译参数
                    // 3. 不能是/no_think页面
                    // 4. 不能有网络错误
                    // 5. 必须包含帖子内容
                    // 6. （可选）必须有翻译相关的标识
                    const isActuallyTranslated = (
                        isValidStatus &&
                        hasTranslationParam &&
                        !isNoThinkPage &&
                        !hasNetworkError &&
                        hasPostContent &&
                        (hasTranslationInTitle || hasChineseLangAttr || pageContent.includes('tl=zh-hans'))
                    );

                    if (isActuallyTranslated) {
                        button.disabled = false;
                        button.textContent = '切换到中文';
                    } else {
                        button.disabled = true;
                        button.textContent = '无中文版本';
                    }
                } catch (e) {
                    console.error('Translation detection error:', e);
                    button.classList.remove('checking');
                    button.disabled = true;
                    button.textContent = '检测失败';
                }
            },
            onerror: function(error) {
                button.classList.remove('checking');
                button.disabled = true;
                button.textContent = '检测失败';
                console.error('Translation detection network error:', error);
            },
            ontimeout: function() {
                button.classList.remove('checking');
                button.disabled = true;
                button.textContent = '检测超时';
                console.log('Translation detection timeout');
            },
            timeout: 15000 // 15秒超时
        });
    }

    // 判断是否为帖子页面
    function isPostPage() {
        const path = window.location.pathname;
        // 匹配 /r/subreddit/comments/post_id/... 格式
        return /^\/r\/[^\/]+\/comments\/[^\/]+/.test(path);
    }

    // 初始化
    function init() {
        // 等待body元素存在
        if (!document.body) {
            setTimeout(init, 100);
            return;
        }

        // 创建控制元素
        window.translationElements = createControlPanel();

        // 初始检测
        if (isEnabled) {
            // 等待页面完全加载后再检测
            setTimeout(checkTranslation, 3000);
        }

        // 监听URL变化（使用更可靠的方案）
        let lastUrl = location.href;
        const checkUrlChange = () => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                if (isEnabled) {
                    setTimeout(checkTranslation, 1500);
                }
            }
            setTimeout(checkUrlChange, 500);
        };
        checkUrlChange();
    }

    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

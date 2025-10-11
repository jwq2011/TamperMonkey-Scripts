// options.js —— 保存用户配置
document.addEventListener('DOMContentLoaded', loadOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('setShortcut').addEventListener('click', requestShortcut);

function loadOptions() {
    const statusEl = document.getElementById('status');
    chrome.storage.sync.get(['enabledDomains', 'isEnabled'], function(config) {
        const domains = config.enabledDomains || ['jira-sh.xxxxauto.com:8080'];
        document.getElementById('domains').value = domains.join('\n');
        statusEl.textContent = '✅ 配置已加载';
        statusEl.style.background = '#e6ffe6';
    });

    // 显示当前快捷键
    chrome.commands.getAll((commands) => {
        const toggleCmd = commands.find(c => c.name === 'toggle-fullscreen');
        if (toggleCmd && toggleCmd.shortcut) {
            document.getElementById('shortcut').value = toggleCmd.shortcut;
        }
    });
}

function saveOptions() {
    const domainsText = document.getElementById('domains').value.trim();
    const domains = domainsText.split('\n').map(d => d.trim()).filter(d => d);

    chrome.storage.sync.set({
        enabledDomains: domains,
        isEnabled: true
    }, function() {
        const statusEl = document.getElementById('status');
        statusEl.textContent = '✅ 保存成功！请刷新 Jira 页面生效。';
        statusEl.style.background = '#e6ffe6';
    });
}

function requestShortcut() {
    alert('请前往 chrome://extensions/shortcuts 设置快捷键。\n（点击扩展右侧的“键盘快捷键”按钮）');
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
}

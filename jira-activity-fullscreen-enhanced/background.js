// background.js —— 监听快捷键命令
chrome.commands.onCommand.addListener((command) => {
    if (command === "toggle-fullscreen") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: toggleFullscreenFromBackground
                });
            }
        });
    }
});

function toggleFullscreenFromBackground() {
    const button = document.querySelector('.activity-fullscreen-btn');
    if (button) {
        button.click();
    } else {
        alert('未找到全屏按钮，请确保在 Jira 问题页并已加载脚本。');
    }
}

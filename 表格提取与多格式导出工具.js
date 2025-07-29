// ==UserScript==
// @name         Table Extraction and Multi Format Export Tool (Enhanced Version)
// @name:zh-CN   表格提取与多格式导出工具（增强版）
// @namespace    http://tampermonkey.net/
// @version      1.6.5
// @description  Automatically detect tables in web pages, support multiple format exports and shortcut key operations, and prioritize using subheadings above the table for file names.
// @description:zh-CN  自动检测网页中的表格，支持多种格式导出和快捷键操作，文件名优先使用表格上方的小标题。
// @author       Will
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// @license      MIT
// @homepage     https://github.com/jwq2011/TamperMonkey-Scripts
// @supportURL   https://github.com/jwq2011/TamperMonkey-Scripts/issues
// ==/UserScript==

(function () {
    "use strict";

    // 初始化默认设置
    const defaultSettings = {
        showGlobalButton: false, // 默认不显示全局按钮
    };

    // 获取用户设置（如果不存在，则使用默认值）
    let settings;
    try {
        const storedSettings = GM_getValue("settings", "{}");
        settings = Object.assign({}, defaultSettings, typeof storedSettings === "string" ? JSON.parse(storedSettings) : storedSettings);
    } catch (error) {
        console.error("解析用户设置失败：", error);
        settings = Object.assign({}, defaultSettings);
    }
    console.log("加载设置：", settings);

    // 保存用户设置
    const saveSettings = () => {
        try {
            GM_setValue("settings", JSON.stringify(settings));
            console.log("保存设置：", settings);
        } catch (error) {
            console.error("保存用户设置失败：", error);
        }
    };

    // 创建 Tampermonkey 设置命令
    GM_registerMenuCommand("设置 - 显示全局按钮", () => {
        const userInput = confirm(
            "是否显示全局“提取所有表格”按钮？\n当前状态：" +
            (settings.showGlobalButton ? "已启用" : "已禁用")
        );
        settings.showGlobalButton = userInput;
        saveSettings();

        // 根据设置决定是否显示按钮
        if (settings.showGlobalButton) {
            createGlobalExtractButton();
        } else {
            const existingButton = document.getElementById("global-extract-button");
            if (existingButton) {
                existingButton.remove();
                console.log("移除了全局按钮");
            }
        }
    });

    // 注册右键菜单命令
    GM_registerMenuCommand("提取所有表格", () => {
        console.log("执行提取所有表格命令");
        extractAllTables();
    });

    // 添加样式
    GM_addStyle(`
        .table-extract-button {
            position: absolute;
            background-color: #4CAF50;
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            font-size: 12px;
            display: none; /* 默认隐藏 */
        }
        #global-extract-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #007BFF;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            font-size: 14px;
            width: auto; /* 自适应宽度 */
            max-width: 200px; /* 最大宽度限制 */
            text-align: center;
            white-space: nowrap; /* 防止换行 */
            overflow: hidden; /* 超出部分隐藏 */
            text-overflow: ellipsis; /* 省略号表示超出内容 */
        }
        .export-menu,
        .preview-window {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #fff;
            padding: 20px;
            border: 1px solid #ccc;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            max-height: 80vh;
            overflow-y: auto;
        }
        .preview-window {
            z-index: 10001;
        }
        .preview-window table {
            border-collapse: collapse;
            width: 100%;
            max-width: 80vw;
        }
        .preview-window td {
            padding: 5px;
            border: 1px solid #ddd;
        }
        .status-message {
            margin-top: 10px;
            font-size: 14px;
            color: green;
        }
        .error-message {
            margin-top: 10px;
            font-size: 14px;
            color: red;
        }
    `);

    // 批量提取所有表格
    const extractAllTables = () => {
        console.log("执行批量提取所有表格逻辑");
        const tables = Array.from(document.querySelectorAll("table")).filter((table) => {
            const rows = table.querySelectorAll("tr");
            return rows.length >= 2 && Array.from(rows).some((row) => row.children.length >= 2);
        });

        if (tables.length === 0) {
            alert("未找到符合条件的表格！");
            console.warn("未找到符合条件的表格");
            return;
        }

        const allData = tables.flatMap((table) => {
            const rows = Array.from(table.querySelectorAll("tr"));
            return rows.map((row) =>
                Array.from(row.querySelectorAll("td, th")).map((cell) => cell.innerText.trim())
            );
        });

        showBatchExportMenu(allData); // 调用批量导出菜单
    };

    // 显示批量导出菜单
    const showBatchExportMenu = (data) => {
        console.log("显示批量导出菜单...");

        // 移除旧的批量导出菜单
        const existingMenu = document.getElementById("batch-export-menu");
        if (existingMenu) {
            existingMenu.remove();
            console.log("移除了旧的批量导出菜单");
        }

        // 创建新的批量导出菜单
        const menu = document.createElement("div");
        menu.id = "batch-export-menu";
        menu.className = "export-menu";
        menu.innerHTML = `
            <h3>批量导出选项：</h3>
            <button id="export-all-separate">逐个导出</button>
            <button id="export-all-merged">合并导出</button>
            <button id="close-batch-menu-btn">关闭</button>
        `;
        document.body.appendChild(menu);

        // 逐个导出（暂未实现）
        document.getElementById("export-all-separate").addEventListener("click", () => {
            alert("逐个导出暂未实现！");
            menu.remove();
        });

        // 合并导出
        document.getElementById("export-all-merged").addEventListener("click", () => {
            exportData(data, "excel", "merged_tables").then((success) => {
                if (success) {
                    alert("所有表格已合并导出！");
                } else {
                    alert("导出失败，请检查控制台错误信息！");
                }
                menu.remove();
            });
        });

        // 关闭按钮事件绑定
        const closeBtn = document.getElementById("close-batch-menu-btn");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                console.log("点击关闭按钮：关闭批量导出菜单");
                menu.remove();
            });
        } else {
            console.warn("未找到批量导出菜单的关闭按钮");
        }
    };

    // 提取单个表格数据
    const extractTableData = (table) => {
        const rows = Array.from(table.querySelectorAll("tr"));
        const data = rows.map((row) => {
            return Array.from(row.querySelectorAll("td, th")).map((cell) => cell.innerText.trim());
        });

        showExportMenu(data, guessTableName(table), table);
    };

    // 显示导出菜单
    const showExportMenu = (data, filename, table) => {
        console.log("显示导出菜单...");

        // 移除旧的导出菜单
        const existingMenu = document.getElementById("export-menu");
        if (existingMenu) {
            existingMenu.remove();
            console.log("移除了旧的导出菜单");
        }

        // 创建新的导出菜单
        const menu = document.createElement("div");
        menu.id = "export-menu";
        menu.className = "export-menu";
        menu.innerHTML = `
            <h3 style="margin-top: 0;">选择导出格式：</h3>
            <button class="export-btn" data-format="json">JSON</button>
            <button class="export-btn" data-format="csv">CSV</button>
            <button class="export-btn" data-format="excel">Excel</button>
            <button class="export-btn" data-format="markdown">Markdown</button>
            <button class="export-btn" data-format="sql">SQL</button>
            <button class="export-btn" data-format="html">HTML (带样式)</button>
            <button class="export-btn" data-format="pdf-formatted">PDF (带格式)</button>
            <button class="export-btn" data-format="pdf-text">PDF (纯文本)</button>
            <button id="preview-data-btn">数据预览</button>
            <button id="copy-original-btn">复制到剪贴板（原格式）</button>
            <button id="copy-markdown-btn">复制到剪贴板（Markdown）</button>
            <button id="close-export-menu-btn">关闭</button>
            <div class="status-message" id="status-message"></div>
        `;
        document.body.appendChild(menu);

        // 绑定导出按钮事件
        document.querySelectorAll(".export-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const format = btn.dataset.format;
                exportData(data, format, filename, table).then((success) => {
                    const statusMessage = document.getElementById("status-message");
                    if (success) {
                        statusMessage.textContent = `导出成功：${format.toUpperCase()} 文件已生成！`;
                        statusMessage.className = "status-message";
                    } else {
                        statusMessage.textContent = `导出失败：请检查控制台错误信息！`;
                        statusMessage.className = "error-message";
                    }
                });
            });
        });

        // 数据预览按钮事件绑定
        const previewBtn = document.getElementById("preview-data-btn");
        if (previewBtn) {
            previewBtn.addEventListener("click", () => {
                console.log("点击数据预览按钮：触发预览功能");
                showPreviewWindow(data);
            });
        } else {
            console.warn("未找到数据预览按钮");
        }

        // 复制到剪贴板（原格式）
        const copyOriginalBtn = document.getElementById("copy-original-btn");
        if (copyOriginalBtn) {
            copyOriginalBtn.addEventListener("click", () => {
                console.log("点击复制到剪贴板（原格式）");
                copyToClipboard(data, "original");
            });
        }

        // 复制到剪贴板（Markdown）
        const copyMarkdownBtn = document.getElementById("copy-markdown-btn");
        if (copyMarkdownBtn) {
            copyMarkdownBtn.addEventListener("click", () => {
                console.log("点击复制到剪贴板（Markdown）");
                copyToClipboard(data, "markdown");
            });
        }

        // 关闭按钮事件绑定
        const closeBtn = document.getElementById("close-export-menu-btn");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                console.log("点击关闭按钮：关闭导出菜单");
                menu.remove();
            });
        } else {
            console.warn("未找到导出菜单的关闭按钮");
        }
    };

    // 显示数据预览窗口
    const showPreviewWindow = (data) => {
        console.log("显示数据预览窗口");

        // 移除旧的预览窗口
        const existingPreview = document.getElementById("preview-window");
        if (existingPreview) {
            existingPreview.remove();
            console.log("移除了旧的数据预览窗口");
        }

        // 创建新的预览窗口
        const previewWindow = document.createElement("div");
        previewWindow.id = "preview-window";
        previewWindow.className = "preview-window";
        previewWindow.innerHTML = `
            <h3>数据预览</h3>
            <table border="1">
                ${data.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
            </table>
            <button id="close-preview-window-btn" style="margin-top: 10px;">关闭</button>
        `;
        document.body.appendChild(previewWindow);

        // 关闭按钮事件绑定
        const closeBtn = document.getElementById("close-preview-window-btn");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                console.log("点击关闭按钮：关闭数据预览窗口");
                previewWindow.remove();
            });
        } else {
            console.warn("未找到数据预览窗口的关闭按钮");
        }
    };

    // 导出数据
    const exportData = async (data, format, filename, table) => {
        try {
            let finalFilename;
            switch (format) {
                case "json":
                    finalFilename = `${filename}.json`;
                    saveFile(JSON.stringify(data, null, 2), finalFilename, "application/json");
                    break;
                case "csv":
                    finalFilename = `${filename}.csv`;
                    saveFile(toCSV(data), finalFilename, "text/csv");
                    break;
                case "excel":
                    finalFilename = `${filename}.xlsx`;
                    saveExcel(data, finalFilename);
                    break;
                case "markdown":
                    finalFilename = `${filename}.md`;
                    saveFile(toMarkdown(data), finalFilename, "text/plain");
                    break;
                case "sql":
                    finalFilename = `${filename}.sql`;
                    saveFile(toSQL(data), finalFilename, "text/plain");
                    break;
                case "html":
                    finalFilename = `${filename}.html`;
                    saveHTMLWithStyle(table, finalFilename);
                    break;
                case "pdf-formatted":
                    finalFilename = `${filename}.pdf`;
                    await savePDFFormatted(table, finalFilename);
                    break;
                case "pdf-text":
                    finalFilename = `${filename}.pdf`;
                    await savePDFText(data, finalFilename);
                    break;
                default:
                    alert("不支持的格式！");
                    return false;
            }
            return true; // 成功
        } catch (error) {
            console.error("导出失败：", error);
            return false; // 失败
        }
    };

    // 转换为 CSV 格式
    const toCSV = (data) => {
        return data.map((row) => row.join(",")).join("\n");
    };

    // 转换为 Markdown 格式
    const toMarkdown = (data) => {
        const header = data[0];
        const body = data.slice(1);
        const headerLine = "|" + header.join("|") + "|";
        const separator = "|" + header.map(() => "---").join("|") + "|";
        const bodyLines = body.map((row) => "|" + row.join("|") + "|");
        return [headerLine, separator, ...bodyLines].join("\n");
    };

    // 转换为 SQL 格式
    const toSQL = (data) => {
        const tableName = "my_table";
        const columns = data[0];
        const values = data.slice(1).map((row) =>
            row.map((value) => `"${value.replace(/"/g, '\\"')}"`).join(", ")
        );
        const insertStatements = values.map((val) => `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${val});`);
        return insertStatements.join("\n");
    };

    // 保存为 HTML 文件（保留表格样式）
    const saveHTMLWithStyle = (table, filename) => {
        const cloneTable = table.cloneNode(true); // 克隆表格节点
        const wrapper = document.createElement("div");
        wrapper.appendChild(cloneTable);
        const htmlContent = wrapper.innerHTML;
        saveFile(htmlContent, `${filename}.html`, "text/html");
    };

    // 保存为 PDF（带格式）
    const savePDFFormatted = (table, filename) => {
        return new Promise((resolve, reject) => {
            html2canvas(table).then((canvas) => {
                const imgData = canvas.toDataURL("image/png");
                const pdf = new jspdf.jsPDF();
                const imgWidth = 210; // A4 宽度
                const pageHeight = 297; // A4 高度
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                let heightLeft = imgHeight;

                pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft >= 0) {
                    pdf.addPage();
                    pdf.addImage(imgData, "PNG", 0, -pageHeight + heightLeft, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }

                pdf.save(`${filename}`);
                resolve();
            }).catch(reject);
        });
    };

    // 保存为 PDF（纯文本）
    const savePDFText = (data, filename) => {
        return new Promise((resolve, reject) => {
            const pdf = new jspdf.jsPDF();
            pdf.addFont("https://cdn.jsdelivr.net/gh/fengyuanchen/jsdocx@master/fonts/MicrosoftYaHei-normal.ttf", "MicrosoftYaHei", "normal");
            pdf.setFont("MicrosoftYaHei");

            const pageHeight = 297; // A4 高度
            let currentHeight = 10;

            data.forEach((row) => {
                const line = row.join(" | ");
                if (currentHeight > pageHeight - 10) {
                    pdf.addPage();
                    currentHeight = 10;
                }
                pdf.text(line, 10, currentHeight);
                currentHeight += 10;
            });

            pdf.save(`${filename}`);
            resolve();
        });
    };

    // 复制到剪贴板
    const copyToClipboard = (data, format) => {
        let content;
        if (format === "markdown") {
            const header = data[0];
            const body = data.slice(1);
            const headerLine = "|" + header.join("|") + "|";
            const separator = "|" + header.map(() => "---").join("|") + "|";
            const bodyLines = body.map((row) => "|" + row.join("|") + "|");
            content = [headerLine, separator, ...bodyLines].join("\n");
        } else {
            content = data.map((row) => row.join("\t")).join("\n"); // 原格式（Tab 分隔）
        }

        navigator.clipboard.writeText(content).then(() => {
            alert("内容已复制到剪贴板！");
        }).catch((error) => {
            console.error("复制失败：", error);
            alert("复制失败，请检查控制台！");
        });
    };

    // 保存文件
    const saveFile = (content, filename, mimeType) => {
        const blob = new Blob([content], { type: mimeType });
        saveAs(blob, filename);
    };

    // 保存 Excel 文件
    const saveExcel = (data, filename) => {
        try {
            const worksheet = XLSX.utils.aoa_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
            XLSX.writeFile(workbook, filename);
        } catch (error) {
            console.error("Excel 导出失败：", error);
            alert(`Excel 导出失败，请检查控制台：${error.message}`);
        }
    };

    // 猜测表格的小标题名称
    const guessTableName = (table) => {
        let parent = table.parentElement;
        while (parent && parent.tagName !== "BODY") {
            const header = parent.querySelector("h1, h2, h3, p, span, div");
            if (header && header.innerText.trim()) {
                return header.innerText.trim().replace(/\s+/g, "_").replace(/[^\w]/g, "");
            }
            parent = parent.parentElement;
        }
        return "table"; // 默认文件名
    };

    // 创建全局提取按钮
    const createGlobalExtractButton = () => {
        if (!settings.showGlobalButton) {
            console.log("用户未启用全局按钮，跳过创建");
            return;
        }

        // 如果按钮已存在，先移除
        const existingButton = document.getElementById("global-extract-button");
        if (existingButton) {
            existingButton.remove();
            console.log("移除旧的全局按钮");
        }

        const button = document.createElement("div");
        button.id = "global-extract-button";
        button.textContent = "提取所有表格";
        button.style.position = "fixed";
        button.style.top = "20px";
        button.style.right = "20px";
        button.style.zIndex = "10000";

        // 将函数绑定到按钮点击事件
        button.addEventListener("click", () => {
            console.log("点击全局按钮：触发提取所有表格");
            extractAllTables();
        });

        document.body.appendChild(button);
        console.log("创建新的全局按钮");

        // 拖动功能
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        button.addEventListener("mousedown", (e) => {
            console.log("开始拖动全局按钮");
            isDragging = true;
            offsetX = e.clientX - button.getBoundingClientRect().left;
            offsetY = e.clientY - button.getBoundingClientRect().top;
        });

        document.addEventListener("mousemove", (e) => {
            if (isDragging) {
                console.log("拖动全局按钮到新位置");
                const newX = Math.min(Math.max(e.clientX - offsetX, 0), window.innerWidth - button.offsetWidth);
                const newY = Math.min(Math.max(e.clientY - offsetY, 0), window.innerHeight - button.offsetHeight);
                button.style.left = `${newX}px`;
                button.style.top = `${newY}px`;
            }
        });

        document.addEventListener("mouseup", () => {
            console.log("结束拖动全局按钮");
            isDragging = false;
        });
    };

    // 自动检测表格并添加提取按钮
    const detectTables = () => {
        console.log("检测页面中的表格...");
        const tables = Array.from(document.querySelectorAll("table")).filter((table) => {
            const rows = table.querySelectorAll("tr");
            return rows.length >= 2 && Array.from(rows).some((row) => row.children.length >= 2);
        });

        if (tables.length === 0) {
            console.warn("未找到符合条件的表格");
        } else {
            console.log(`检测到 ${tables.length} 个表格`);
        }

        tables.forEach((table) => {
            createExtractButton(table);
        });
    };

    // 创建单个表格提取按钮
    const createExtractButton = (table) => {
        const button = document.createElement("div");
        button.textContent = "提取表格";
        button.classList.add("table-extract-button");

        // 固定按钮位置
        const rect = table.getBoundingClientRect();
        button.style.top = `${rect.top + window.scrollY}px`;
        button.style.left = `${rect.right + window.scrollX + 10}px`;
        document.body.appendChild(button);

        let hideTimeout;

        // 鼠标进入表格范围时显示按钮
        table.addEventListener("mouseenter", () => {
            clearTimeout(hideTimeout);
            button.style.display = "block";
            console.log("显示表格提取按钮");
        });

        // 鼠标离开表格范围时延迟隐藏按钮
        table.addEventListener("mouseleave", () => {
            hideTimeout = setTimeout(() => {
                button.style.display = "none";
                console.log("隐藏表格提取按钮");
            }, 1000);
        });

        // 添加点击事件
        button.addEventListener("click", () => {
            console.log("点击表格提取按钮：触发提取表格数据");
            extractTableData(table);
        });
    };

    // 页面加载完成后执行
    window.addEventListener("load", () => {
        console.log("页面加载完成，初始化脚本");

        // 根据设置决定是否显示全局按钮
        if (settings.showGlobalButton) {
            console.log("用户启用了全局按钮，尝试创建按钮");
            createGlobalExtractButton();
        } else {
            console.log("用户未启用全局按钮，跳过创建");
        }

        // 检测表格并添加提取按钮
        detectTables();
    });

    // 快捷键支持
    hotkeys("alt+e", (event) => {
        event.preventDefault();
        const targetTable = document.querySelector("table:hover");
        if (targetTable) {
            extractTableData(targetTable);
        } else {
            alert("请将鼠标悬停在一个表格上！");
        }
    });
})();

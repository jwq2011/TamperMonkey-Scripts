// ==UserScript==
// @name         表格提取与多格式导出工具 (增强版)
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  自动检测网页中的表格，鼠标悬浮时显示“提取表格”按钮，支持快捷键或点击提取数据，并优先使用表格上方的小标题作为文件名。
// @author       Will
// @match        *://*/*
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// @require      https://cdn.jsdelivr.net/npm/hotkeys-js/dist/hotkeys.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// ==/UserScript==

(function () {
    "use strict";

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
        }
        #export-menu {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #fff;
            padding: 20px;
            border: 1px solid #ccc;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            z-index: 10000;
        }
        #preview-window {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #fff;
            padding: 20px;
            border: 1px solid #ccc;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            z-index: 10001;
            max-height: 80vh;
            overflow-y: auto;
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

    // 创建全局提取按钮
    const createGlobalExtractButton = () => {
        const button = document.createElement("div");
        button.id = "global-extract-button";
        button.textContent = "提取所有表格";
        button.addEventListener("click", extractAllTables);
        document.body.appendChild(button);
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
            clearTimeout(hideTimeout); // 清除隐藏按钮的定时器
            button.style.display = "block"; // 显示按钮
        });

        // 鼠标离开表格范围时延迟隐藏按钮
        table.addEventListener("mouseleave", () => {
            hideTimeout = setTimeout(() => {
                button.style.display = "none"; // 隐藏按钮
            }, 1000); // 延迟 1 秒隐藏按钮
        });

        // 鼠标进入按钮时清除隐藏按钮的定时器
        button.addEventListener("mouseenter", () => {
            clearTimeout(hideTimeout);
        });

        // 鼠标离开按钮时隐藏按钮
        button.addEventListener("mouseleave", () => {
            hideTimeout = setTimeout(() => {
                button.style.display = "none"; // 隐藏按钮
            }, 1000); // 延迟 1 秒隐藏按钮
        });

        // 添加点击事件
        button.addEventListener("click", () => {
            extractTableData(table);
        });
    };

    // 提取表格数据
    const extractTableData = (table) => {
        const rows = Array.from(table.querySelectorAll("tr"));
        const data = rows.map((row) => {
            return Array.from(row.querySelectorAll("td, th")).map((cell) => cell.innerText.trim());
        });

        showExportMenu(data, guessTableName(table), table);
    };

    // 显示导出菜单
    const showExportMenu = (data, filename, table) => {
        if (document.getElementById("export-menu")) return;

        const menu = document.createElement("div");
        menu.id = "export-menu";
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
            <button onclick="document.getElementById('export-menu').remove();">关闭</button>
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

        // 绑定数据预览事件
        document.getElementById("preview-data-btn").addEventListener("click", () => {
            showPreviewWindow(data);
        });

        // 绑定复制到剪贴板事件
        document.getElementById("copy-original-btn").addEventListener("click", () => {
            copyToClipboard(data, "original");
        });
        document.getElementById("copy-markdown-btn").addEventListener("click", () => {
            copyToClipboard(data, "markdown");
        });
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

    // 尝试猜测表格的小标题名称
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

    // 批量提取所有表格
    const extractAllTables = () => {
        const tables = Array.from(document.querySelectorAll("table")).filter((table) => {
            const rows = table.querySelectorAll("tr");
            return rows.length >= 2 && Array.from(rows).some((row) => row.children.length >= 2);
        });

        if (tables.length === 0) {
            alert("未找到符合条件的表格！");
            return;
        }

        const allData = tables.flatMap((table) => {
            const rows = Array.from(table.querySelectorAll("tr"));
            return rows.map((row) => {
                return Array.from(row.querySelectorAll("td, th")).map((cell) => cell.innerText.trim());
            });
        });

        showBatchExportMenu(allData);
    };

    // 显示批量导出菜单
    const showBatchExportMenu = (data) => {
        const menu = document.createElement("div");
        menu.id = "batch-export-menu";
        menu.style.position = "fixed";
        menu.style.top = "50%";
        menu.style.left = "50%";
        menu.style.transform = "translate(-50%, -50%)";
        menu.style.backgroundColor = "#fff";
        menu.style.padding = "20px";
        menu.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
        menu.style.zIndex = "10000";

        menu.innerHTML = `
            <h3>批量导出选项：</h3>
            <button id="export-all-separate">逐个导出</button>
            <button id="export-all-merged">合并导出</button>
            <button onclick="document.getElementById('batch-export-menu').remove();">关闭</button>
        `;

        document.body.appendChild(menu);

        // 逐个导出
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
    };

    // 显示数据预览窗口
    const showPreviewWindow = (data) => {
        const previewWindow = document.createElement("div");
        previewWindow.id = "preview-window";
        previewWindow.innerHTML = `
            <h3>数据预览</h3>
            <table border="1">
                ${data.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
            </table>
            <button onclick="document.getElementById('preview-window').remove();">关闭</button>
        `;
        document.body.appendChild(previewWindow);
    };

    // 自动检测表格并添加提取按钮
    const detectTables = () => {
        document.querySelectorAll("table").forEach((table) => {
            const rows = table.querySelectorAll("tr");
            if (rows.length >= 2 && Array.from(rows).some((row) => row.children.length >= 2)) {
                createExtractButton(table);
            }
        });
    };

    // 页面加载完成后执行
    window.addEventListener("load", () => {
        createGlobalExtractButton();
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

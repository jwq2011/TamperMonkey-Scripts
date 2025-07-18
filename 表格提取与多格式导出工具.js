// ==UserScript==
// @name         表格提取与多格式导出工具 (增强版)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  自动检测网页中的表格，鼠标悬浮时显示“提取表格”按钮，支持快捷键或点击提取数据，并优先使用表格上方的小标题作为文件名。
// @author       YourName
// @match        *://*/*
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// @require      https://cdn.jsdelivr.net/npm/hotkeys-js/dist/hotkeys.min.js
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
    `);

    // 创建提取按钮
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

        showExportMenu(data, guessTableName(table));
    };

    // 显示导出菜单
    const showExportMenu = (data, filename) => {
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
            <button class="export-btn" data-format="html">HTML</button>
            <button class="export-btn" data-format="xml">XML</button>
            <button onclick="document.getElementById('export-menu').remove();">关闭</button>
        `;

        document.body.appendChild(menu);

        // 绑定导出按钮事件
        document.querySelectorAll(".export-btn").forEach((btn) => {
            btn.addEventListener("click", () => exportData(data, btn.dataset.format, filename));
        });
    };

    // 导出数据
    const exportData = (data, format, filename) => {
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
                    finalFilename = `${filename}.xlsx`; // 确保扩展名为 .xlsx
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
                    saveFile(toHTML(data), finalFilename, "text/html");
                    break;
                case "xml":
                    finalFilename = `${filename}.xml`;
                    saveFile(toXML(data), finalFilename, "application/xml");
                    break;
                default:
                    alert("不支持的格式！");
            }
        } catch (error) {
            console.error("导出失败：", error);
            alert(`导出失败，请检查浏览器控制台：${error.message}`);
        }

        // 关闭导出菜单
        document.getElementById("export-menu").remove();
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

    // 转换为 HTML 格式
    const toHTML = (data) => {
        const rows = data.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`);
        return `<table border="1">${rows.join("")}</table>`;
    };

    // 转换为 XML 格式
    const toXML = (data) => {
        const rows = data.map((row, i) => {
            const cells = row.map((cell, j) => `<cell col="${j}">${cell}</cell>`).join("");
            return `<row index="${i}">${cells}</row>`;
        });
        return `<table>${rows.join("")}</table>`;
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

            // 使用 XLSX.writeFile 导出 Excel 文件
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
    window.addEventListener("load", detectTables);

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

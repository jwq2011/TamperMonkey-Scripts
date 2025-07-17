// ==UserScript==
// @name         表格提取与多格式导出工具 (增强版)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  自动检测网页中的表格，支持快捷键或按钮提取数据，提供多种格式导出。
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
            position: fixed;
            background-color: #4CAF50;
            color: white;
            padding: 10px;
            border-radius: 5px;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            font-size: 14px;
            display: none;
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

    let currentTable = null; // 当前选中的表格

    // 创建提取按钮
    const createExtractButton = () => {
        const button = document.createElement("div");
        button.id = "table-extract-button";
        button.textContent = "提取表格 (Alt+E)";
        button.classList.add("table-extract-button");

        document.body.appendChild(button);

        // 按钮点击事件
        button.addEventListener("click", () => {
            if (currentTable) {
                extractTableData(currentTable);
            }
        });

        return button;
    };

    const extractButton = createExtractButton();

    // 确定表格并显示按钮
    const detectAndActivateTable = (event) => {
        const target = event.target;

        // 查找最近的表格元素
        const table = target.closest("table");
        if (!table) return;

        // 验证表格是否符合要求 (至少 2 行 2 列)
        const rows = table.querySelectorAll("tr");
        if (rows.length < 2 || !Array.from(rows).some((row) => row.children.length >= 2)) return;

        // 更新当前表格
        currentTable = table;

        // 显示按钮
        const rect = table.getBoundingClientRect();
        extractButton.style.top = `${rect.top + window.scrollY}px`;
        extractButton.style.left = `${rect.right + window.scrollX + 10}px`;
        extractButton.style.display = "block";
    };

    // 提取表格数据
    const extractTableData = (table) => {
        const rows = Array.from(table.querySelectorAll("tr"));
        const data = rows.map((row) => {
            return Array.from(row.querySelectorAll("td, th")).map((cell) => cell.innerText.trim());
        });

        showExportMenu(data);
    };

    // 显示导出菜单
    const showExportMenu = (data) => {
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
            btn.addEventListener("click", () => exportData(data, btn.dataset.format));
        });
    };

    // 导出数据
    const exportData = (data, format) => {
        const filename = `table.${format}`;
        switch (format) {
            case "json":
                saveFile(JSON.stringify(data, null, 2), filename, "application/json");
                break;
            case "csv":
                saveFile(toCSV(data), filename, "text/csv");
                break;
            case "excel":
                saveExcel(data, "table.xlsx");
                break;
            case "markdown":
                saveFile(toMarkdown(data), filename, "text/plain");
                break;
            case "sql":
                saveFile(toSQL(data), filename, "text/plain");
                break;
            case "html":
                saveFile(toHTML(data), filename, "text/html");
                break;
            case "xml":
                saveFile(toXML(data), filename, "application/xml");
                break;
            default:
                alert("不支持的格式！");
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
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, filename);
    };

    // 快捷键支持
    hotkeys("alt+e", (event) => {
        event.preventDefault();
        if (currentTable) {
            extractTableData(currentTable);
        } else {
            alert("请先将鼠标悬停在一个表格上！");
        }
    });

    // 鼠标悬停事件监听
    document.addEventListener("mouseover", detectAndActivateTable);
})();

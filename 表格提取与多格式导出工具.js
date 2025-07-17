// ==UserScript==
// @name         表格提取与多格式导出工具
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自动检测网页中的表格，支持多种格式导出，包括 JSON、Excel、CSV、Markdown、SQL 等。
// @author       YourName
// @match        *://*/*
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
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
            display: none;
        }
    `);

    // 创建提取按钮
    const createExtractButton = (table) => {
        const button = document.createElement("div");
        button.textContent = "提取表格";
        button.classList.add("table-extract-button");

        // 显示按钮
        table.addEventListener("mouseenter", () => {
            const rect = table.getBoundingClientRect();
            button.style.top = `${rect.top + window.scrollY}px`;
            button.style.left = `${rect.right + window.scrollX + 10}px`;
            button.style.display = "block";
            document.body.appendChild(button);
        });

        // 隐藏按钮
        table.addEventListener("mouseleave", () => {
            button.style.display = "none";
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

        showExportMenu(data);
    };

    // 显示导出菜单
    const showExportMenu = (data) => {
        if (document.getElementById("export-menu")) return;

        const menu = document.createElement("div");
        menu.id = "export-menu";
        menu.style.position = "fixed";
        menu.style.top = "50%";
        menu.style.left = "50%";
        menu.style.transform = "translate(-50%, -50%)";
        menu.style.backgroundColor = "#fff";
        menu.style.padding = "20px";
        menu.style.border = "1px solid #ccc";
        menu.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
        menu.style.zIndex = "10000";

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
        switch (format) {
            case "json":
                saveFile(JSON.stringify(data, null, 2), "table.json", "application/json");
                break;
            case "csv":
                saveFile(toCSV(data), "table.csv", "text/csv");
                break;
            case "excel":
                saveExcel(data, "table.xlsx");
                break;
            case "markdown":
                saveFile(toMarkdown(data), "table.md", "text/plain");
                break;
            case "sql":
                saveFile(toSQL(data), "table.sql", "text/plain");
                break;
            case "html":
                saveFile(toHTML(data), "table.html", "text/html");
                break;
            case "xml":
                saveFile(toXML(data), "table.xml", "application/xml");
                break;
            default:
                alert("不支持的格式！");
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
})();

// ==========================================
// ERP CONTABLE - ENGINE (app.js)
// ==========================================

// --- 1. DEFAULT DATA INITIALIZATION ---
const DEFAULT_CUENTAS = [
    { code: 101, name: "Caja General", type: "Activo" },
    { code: 102, name: "Bancos", type: "Activo" },
    { code: 103, name: "Cuentas por Cobrar", type: "Activo" },
    { code: 104, name: "Inventario de Mercadería", type: "Activo" },
    { code: 105, name: "IVA por Cobrar", type: "Activo" },
    { code: 106, name: "Herramientas de Trabajo", type: "Activo" },
    { code: 107, name: "Equipo de Cómputo", type: "Activo" },
    { code: 108, name: "Vehículos de Reparto", type: "Activo" },
    { code: 201, name: "Proveedores", type: "Pasivo" },
    { code: 202, name: "Cuentas por Pagar", type: "Pasivo" },
    { code: 203, name: "Cuota Laboral IGSS por Pagar", type: "Pasivo" },
    { code: 204, name: "IVA por Pagar", type: "Pasivo" },
    { code: 301, name: "Capital Social", type: "Patrimonio" },
    { code: 401, name: "Costo de Ventas", type: "Pérdida" },
    { code: 402, name: "Sueldos Ordinarios", type: "Pérdida" },
    { code: 403, name: "Bonificación Incentivo", type: "Pérdida" },
    { code: 404, name: "Depreciaciones (Gasto)", type: "Pérdida" },
    { code: 501, name: "Ventas", type: "Ganancia" }
];

// Load catalog from localStorage or initialize with defaults
let catalog = JSON.parse(localStorage.getItem("erp_catalog"));
if (!catalog || catalog.length === 0) {
    catalog = DEFAULT_CUENTAS;
    localStorage.setItem("erp_catalog", JSON.stringify(catalog));
}

// Load transaction entries (partidas) from localStorage
let entries = JSON.parse(localStorage.getItem("erp_entries"));
if (!entries || entries.length === 0) {
    // Populate with 4 balanced real-world demo entries so the user sees a working ERP immediately!
    const todayStr = new Date().toISOString().split('T')[0];
    entries = [
        {
            id: 1001,
            date: todayStr,
            description: "Apertura y constitución de la empresa con aportaciones de los socios.",
            details: [
                { code: 101, debe: 10000, haber: 0 },
                { code: 102, debe: 50000, haber: 0 },
                { code: 301, debe: 0, haber: 60000 }
            ]
        },
        {
            id: 1002,
            date: todayStr,
            description: "Compra de mercadería para el inventario al contado según factura No. 456.",
            details: [
                { code: 104, debe: 8000, haber: 0 },
                { code: 105, debe: 960, haber: 0 },
                { code: 102, debe: 0, haber: 8960 }
            ]
        },
        {
            id: 1003,
            date: todayStr,
            description: "Venta de mercadería al contado según factura No. 001 (Partida de Ingresos).",
            details: [
                { code: 102, debe: 11200, haber: 0 },
                { code: 501, debe: 0, haber: 10000 },
                { code: 204, debe: 0, haber: 1200 }
            ]
        },
        {
            id: 1004,
            date: todayStr,
            description: "Registro del costo de venta correspondiente a la mercadería entregada.",
            details: [
                { code: 401, debe: 5000, haber: 0 },
                { code: 104, debe: 0, haber: 5000 }
            ]
        }
    ];
    localStorage.setItem("erp_entries", JSON.stringify(entries));
}

// --- 2. GLOBAL CONTROLLERS & TAB NAVIGATION ---
document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initCatalogTab();
    initEntryCreator();
    initJournal();
    recalculateAll(); // Run initial calculation on load
    
    // Set default date to today
    document.getElementById("entry-date").valueAsDate = new Date();
});

// Navigation controller
function initTabs() {
    const navItems = document.querySelectorAll(".nav-item");
    const tabPanes = document.querySelectorAll(".tab-pane");
    const titleHeader = document.getElementById("current-tab-title");
    
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetTab = item.getAttribute("data-tab");
            
            navItems.forEach(nav => nav.classList.remove("active"));
            tabPanes.forEach(pane => pane.classList.remove("active"));
            
            item.classList.add("active");
            document.getElementById(`tab-${targetTab}`).classList.add("active");
            
            // Update Top Title
            titleHeader.textContent = item.querySelector("span:nth-child(2)").textContent;
            
            // Specific tab refreshes
            if (targetTab === "diario") initJournal();
            if (targetTab === "catalogo") initCatalogTab();
            
            // Recalculate sheets whenever opening report tabs
            recalculateAll();
        });
    });
}

// --- 3. DYNAMIC ENTRY CREATOR CONTROLLER ---
function initEntryCreator() {
    const rowsContainer = document.getElementById("entry-rows-container");
    const btnAddRow = document.getElementById("btn-add-row");
    const btnReset = document.getElementById("btn-reset-form");
    const form = document.getElementById("entry-form");
    
    // Add row event
    btnAddRow.addEventListener("click", () => {
        addRow();
    });
    
    // Reset form event
    btnReset.addEventListener("click", () => {
        resetEntryForm();
    });
    
    // Submit form event
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        saveEntry();
    });
    
    // Initialize with 2 empty rows
    resetEntryForm();
}

function getSortedCatalog() {
    return [...catalog].sort((a, b) => a.code - b.code);
}

function addRow(debitVal = "", creditVal = "") {
    const container = document.getElementById("entry-rows-container");
    const tr = document.createElement("tr");
    tr.className = "entry-row";
    
    const sortedCatalog = getSortedCatalog();
    let optionsHtml = `<option value="" disabled selected>Seleccione cuenta...</option>`;
    sortedCatalog.forEach(acct => {
        optionsHtml += `<option value="${acct.code}">[${acct.code}] ${acct.name} (${acct.type})</option>`;
    });
    
    tr.innerHTML = `
        <td>
            <select class="row-account-select" required>
                ${optionsHtml}
            </select>
        </td>
        <td>
            <input type="number" class="row-debe-input" placeholder="0.00" min="0" step="0.01" value="${debitVal}">
        </td>
        <td>
            <input type="number" class="row-haber-input" placeholder="0.00" min="0" step="0.01" value="${creditVal}">
        </td>
        <td style="text-align: center;">
            <button type="button" class="btn-remove-row">&times;</button>
        </td>
    `;
    
    // Attach event listeners to inputs for real-time calculations
    const select = tr.querySelector(".row-account-select");
    const debeInput = tr.querySelector(".row-debe-input");
    const haberInput = tr.querySelector(".row-haber-input");
    const btnRemove = tr.querySelector(".btn-remove-row");
    
    debeInput.addEventListener("input", () => {
        if (debeInput.value) {
            haberInput.value = ""; // An entry row cannot have both debit and credit
            haberInput.disabled = true;
        } else {
            haberInput.disabled = false;
        }
        updateRunningTotals();
    });
    
    haberInput.addEventListener("input", () => {
        if (haberInput.value) {
            debeInput.value = ""; // An entry row cannot have both debit and credit
            debeInput.disabled = true;
        } else {
            debeInput.disabled = false;
        }
        updateRunningTotals();
    });
    
    btnRemove.addEventListener("click", () => {
        const rowCount = container.querySelectorAll(".entry-row").length;
        if (rowCount > 2) {
            tr.remove();
            updateRunningTotals();
        } else {
            alert("Un asiento contable requiere al menos 2 movimientos (partida doble).");
        }
    });
    
    container.appendChild(tr);
    updateRunningTotals();
}

function updateRunningTotals() {
    const rows = document.querySelectorAll(".entry-row");
    let totalDebe = 0;
    let totalHaber = 0;
    
    rows.forEach(row => {
        const debeVal = parseFloat(row.querySelector(".row-debe-input").value) || 0;
        const haberVal = parseFloat(row.querySelector(".row-haber-input").value) || 0;
        totalDebe += debeVal;
        totalHaber += haberVal;
    });
    
    const diff = Math.abs(totalDebe - totalHaber);
    
    // Update elements
    document.getElementById("total-debe-val").textContent = `Q${totalDebe.toFixed(2)}`;
    document.getElementById("total-haber-val").textContent = `Q${totalHaber.toFixed(2)}`;
    document.getElementById("total-diff-val").textContent = `Q${diff.toFixed(2)}`;
    
    const bar = document.getElementById("balance-status-bar");
    const indicator = document.getElementById("balance-indicator");
    const saveBtn = document.getElementById("btn-save-entry");
    
    // Validation
    const isBalanced = diff < 0.005 && totalDebe > 0;
    
    if (isBalanced) {
        bar.style.borderColor = "rgba(57, 255, 20, 0.3)";
        indicator.textContent = "Cuadrado  ✓";
        indicator.className = "balance-indicator balanced";
        saveBtn.disabled = false;
    } else {
        bar.style.borderColor = "rgba(255, 0, 85, 0.3)";
        indicator.textContent = "Descuadrado ❌";
        indicator.className = "balance-indicator unbalanced";
        saveBtn.disabled = true;
    }
}

function resetEntryForm() {
    const container = document.getElementById("entry-rows-container");
    container.innerHTML = "";
    document.getElementById("entry-description").value = "";
    document.getElementById("entry-date").valueAsDate = new Date();
    
    // Initial 2 rows
    addRow();
    addRow();
}

// Save Entry in Virtual Database
function saveEntry() {
    const date = document.getElementById("entry-date").value;
    const description = document.getElementById("entry-description").value;
    const rows = document.querySelectorAll(".entry-row");
    
    const transactionDetails = [];
    
    rows.forEach(row => {
        const acctCode = parseInt(row.querySelector(".row-account-select").value);
        const debeVal = parseFloat(row.querySelector(".row-debe-input").value) || 0;
        const haberVal = parseFloat(row.querySelector(".row-haber-input").value) || 0;
        
        if (acctCode && (debeVal > 0 || haberVal > 0)) {
            transactionDetails.push({
                code: acctCode,
                debe: debeVal,
                haber: haberVal
            });
        }
    });
    
    if (transactionDetails.length < 2) {
        alert("Error: El asiento debe contener al menos 2 registros contables válidos.");
        return;
    }
    
    const newEntry = {
        id: Date.now(),
        date: date,
        description: description,
        details: transactionDetails
    };
    
    entries.push(newEntry);
    localStorage.setItem("erp_entries", JSON.stringify(entries));
    
    alert("✓ Asiento contable guardado exitosamente.");
    
    resetEntryForm();
    recalculateAll();
}

// --- 4. LIBRO DIARIO TABS ---
function initJournal() {
    const container = document.getElementById("journal-entries-list");
    const btnClear = document.getElementById("btn-clear-diary");
    
    // Clear ledger event
    btnClear.onclick = () => {
        if (confirm("¿Estás seguro de que deseas borrar TODAS las partidas contables registradas? Esta acción no se puede deshacer.")) {
            entries = [];
            localStorage.setItem("erp_entries", JSON.stringify(entries));
            initJournal();
            recalculateAll();
        }
    };
    
    if (entries.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 40px 0;">No hay partidas contables registradas aún. ¡Registra una en la pestaña de Crear Partida!</p>`;
        return;
    }
    
    // Sort entries chronologically
    const sortedEntries = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let html = "";
    sortedEntries.forEach((entry, idx) => {
        // Date formatting
        const dateObj = new Date(entry.date + "T00:00:00");
        const formattedDate = dateObj.toLocaleDateString("es-GT", { day: 'numeric', month: 'long', year: 'numeric' });
        
        let rowsHtml = "";
        let totalDebe = 0;
        let totalHaber = 0;
        
        entry.details.forEach(det => {
            const acct = catalog.find(c => c.code === det.code) || { name: `Cuenta Desconocida (${det.code})` };
            const isHaber = det.haber > 0;
            
            rowsHtml += `
                <tr>
                    <td style="padding-left: ${isHaber ? '30px' : '10px'}; font-weight: ${isHaber ? 'normal' : '500'};">
                        [${det.code}] ${acct.name}
                    </td>
                    <td class="monto" style="color: var(--color-primary);">${det.debe > 0 ? 'Q' + det.debe.toFixed(2) : '-'}</td>
                    <td class="monto" style="color: var(--color-accent);">${det.haber > 0 ? 'Q' + det.haber.toFixed(2) : '-'}</td>
                </tr>
            `;
            
            totalDebe += det.debe;
            totalHaber += det.haber;
        });
        
        html += `
            <div class="journal-entry-block">
                <div class="journal-entry-header">
                    <span style="font-weight: 700; color: var(--color-primary);">PARTIDA # ${idx + 1}</span>
                    <span style="font-size: 13px; color: var(--text-muted);">${formattedDate}</span>
                </div>
                <div class="journal-entry-desc">
                    <strong>Concepto:</strong> ${entry.description}
                </div>
                <table class="journal-entry-table">
                    <thead>
                        <tr>
                            <th style="width: 60%;">Cuenta</th>
                            <th style="width: 20%; text-align: right;">Debe (Q)</th>
                            <th style="width: 20%; text-align: right;">Haber (Q)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                        <tr class="total-row" style="font-weight: bold; border-top: 1px solid rgba(255,255,255,0.08);">
                            <td style="text-align: right; padding-right: 15px;">Totales Cuadrados:</td>
                            <td class="monto" style="border-bottom: 2px double var(--border-color);">Q${totalDebe.toFixed(2)}</td>
                            <td class="monto" style="border-bottom: 2px double var(--border-color);">Q${totalHaber.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// --- 5. CATALOGUE OF ACCOUNTS TAB ---
function initCatalogTab() {
    const grid = document.getElementById("catalog-accounts-grid");
    const sortedCatalog = getSortedCatalog();
    
    grid.innerHTML = "";
    sortedCatalog.forEach(acct => {
        let typeColor = "";
        if (acct.type === "Activo") typeColor = "var(--color-primary)";
        else if (acct.type === "Pasivo") typeColor = "var(--color-accent)";
        else if (acct.type === "Patrimonio") typeColor = "var(--color-warning)";
        else if (acct.type === "Pérdida") typeColor = "var(--color-danger)";
        else if (acct.type === "Ganancia") typeColor = "var(--color-success)";
        
        const card = document.createElement("div");
        card.className = "account-card";
        card.innerHTML = `
            <div class="account-card-info">
                <h4>${acct.name}</h4>
                <p style="color: ${typeColor}; font-weight: 600; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px;">${acct.type}</p>
            </div>
            <span class="account-card-code" style="border-color: ${typeColor}; color: ${typeColor};">${acct.code}</span>
        `;
        grid.appendChild(card);
    });
    
    // Modal controls
    const modal = document.getElementById("account-modal");
    const btnOpen = document.getElementById("btn-open-account-modal");
    const btnClose = document.getElementById("btn-close-account-modal");
    const btnCancel = document.getElementById("btn-cancel-account");
    const form = document.getElementById("new-account-form");
    
    btnOpen.onclick = () => modal.classList.add("open");
    btnClose.onclick = () => modal.classList.remove("open");
    btnCancel.onclick = () => modal.classList.remove("open");
    
    form.onsubmit = (e) => {
        e.preventDefault();
        const code = parseInt(document.getElementById("acct-code").value);
        const name = document.getElementById("acct-name").value;
        const type = document.getElementById("acct-type").value;
        
        // Checks
        const exists = catalog.some(c => c.code === code);
        if (exists) {
            alert(`Error: Ya existe una cuenta registrada con el código [${code}].`);
            return;
        }
        
        catalog.push({ code, name, type });
        localStorage.setItem("erp_catalog", JSON.stringify(catalog));
        
        alert(`✓ Cuenta "${name}" agregada con éxito al catálogo.`);
        form.reset();
        modal.classList.remove("open");
        initCatalogTab();
        recalculateAll();
    };
}

// --- 6. CORE CALCULATION ENGINE (VIRTUAL BACKEND) ---
function recalculateAll() {
    // 1. Calculate Ledger accumulated data
    const ledgerBalances = {};
    catalog.forEach(acct => {
        ledgerBalances[acct.code] = {
            debe: 0,
            haber: 0,
            acct: acct
        };
    });
    
    // Run sums from all journal entries
    entries.forEach(entry => {
        entry.details.forEach(det => {
            if (ledgerBalances[det.code]) {
                ledgerBalances[det.code].debe += det.debe;
                ledgerBalances[det.code].haber += det.haber;
            }
        });
    });
    
    // Render Sheets
    renderLibroMayor(ledgerBalances);
    const balanceSaldos = renderBalanceDeSaldos(ledgerBalances);
    const utilidad = renderEstadoDeResultados(balanceSaldos);
    renderBalanceGeneral(balanceSaldos, utilidad);
}

function renderLibroMayor(ledger) {
    const tbody = document.getElementById("mayor-table-body");
    tbody.innerHTML = "";
    
    const sortedCodes = Object.keys(ledger).map(Number).sort((a,b)=>a-b);
    
    sortedCodes.forEach(code => {
        const item = ledger[code];
        const acct = item.acct;
        
        // Balance depending on account natural balance
        let balance = 0;
        if (acct.type === "Activo" || acct.type === "Pérdida") {
            balance = item.debe - item.haber;
        } else {
            balance = item.haber - item.debe;
        }
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong style="color: var(--color-primary);">${code}</strong></td>
            <td>${acct.name} <span style="font-size: 10px; color: var(--text-muted);">(${acct.type})</span></td>
            <td class="monto">${item.debe > 0 ? 'Q' + item.debe.toFixed(2) : '-'}</td>
            <td class="monto">${item.haber > 0 ? 'Q' + item.haber.toFixed(2) : '-'}</td>
            <td class="monto" style="font-weight: bold; color: ${balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                Q${balance.toFixed(2)}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderBalanceDeSaldos(ledger) {
    const tbody = document.getElementById("saldos-table-body");
    tbody.innerHTML = "";
    
    const sortedCodes = Object.keys(ledger).map(Number).sort((a,b)=>a-b);
    let sumDeudor = 0;
    let sumAcreedor = 0;
    
    const accountsWithSaldos = {};
    
    sortedCodes.forEach(code => {
        const item = ledger[code];
        const acct = item.acct;
        
        // General Net balance formula for Saldos sheets
        const net = item.debe - item.haber;
        let deudor = 0;
        let acreedor = 0;
        
        // Decides columns using account type normal balance or abnormal offsets
        if (acct.type === "Activo" || acct.type === "Pérdida") {
            if (net >= 0) {
                deudor = net;
            } else {
                acreedor = -net; // Abnormal credit balance for asset/expense
            }
        } else {
            if (net <= 0) {
                acreedor = -net;
            } else {
                deudor = net; // Abnormal debit balance for liability/equity/income
            }
        }
        
        // Save to balances object for financial report usage
        accountsWithSaldos[code] = {
            code: code,
            name: acct.name,
            type: acct.type,
            deudor: deudor,
            acreedor: acreedor,
            saldo: deudor > 0 ? deudor : -acreedor
        };
        
        if (deudor > 0 || acreedor > 0) {
            sumDeudor += deudor;
            sumAcreedor += acreedor;
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${code}</strong></td>
                <td>${acct.name}</td>
                <td class="monto debit-val">${deudor > 0 ? 'Q' + deudor.toFixed(2) : '-'}</td>
                <td class="monto credit-val">${acreedor > 0 ? 'Q' + acreedor.toFixed(2) : '-'}</td>
            `;
            tbody.appendChild(tr);
        }
    });
    
    document.getElementById("saldos-total-deudor").textContent = `Q${sumDeudor.toFixed(2)}`;
    document.getElementById("saldos-total-acreedor").textContent = `Q${sumAcreedor.toFixed(2)}`;
    
    return accountsWithSaldos;
}

function renderEstadoDeResultados(saldos) {
    const tbody = document.getElementById("resultados-table-body");
    tbody.innerHTML = "";
    
    // Retrieve balances
    const ventas = saldos[501] ? saldos[501].acreedor : 0;
    const costoVentas = saldos[401] ? saldos[401].deudor : 0;
    const gananciaBruta = ventas - costoVentas;
    
    // Operations Expenses (all Pérdida accounts except Costo de Ventas 401)
    let totalGastos = 0;
    const gastosHtmlRows = [];
    
    Object.keys(saldos).forEach(code => {
        const item = saldos[code];
        if (item.type === "Pérdida" && item.code !== 401) {
            const gastoMonto = item.deudor;
            if (gastoMonto > 0) {
                totalGastos += gastoMonto;
                gastosHtmlRows.push(`
                    <tr>
                        <td style="padding-left: 30px;">${item.name}</td>
                        <td class="monto">Q${gastoMonto.toFixed(2)}</td>
                    </tr>
                `);
            }
        }
    });
    
    const utilidad = gananciaBruta - totalGastos;
    
    let html = `
        <tr class="section-header-row">
            <td colspan="2">INGRESOS DE OPERACIÓN</td>
        </tr>
        <tr>
            <td style="padding-left: 20px;">Ventas</td>
            <td class="monto" style="font-weight: 600;">Q${ventas.toFixed(2)}</td>
        </tr>
        <tr class="section-header-row">
            <td colspan="2">COSTOS DE OPERACIÓN</td>
        </tr>
        <tr>
            <td style="padding-left: 20px;">Menos: Costo de Ventas</td>
            <td class="monto" style="color: var(--color-danger);">- Q${costoVentas.toFixed(2)}</td>
        </tr>
        <tr class="subtotal-row" style="background-color: rgba(255,255,255,0.02);">
            <td>GANANCIA BRUTA EN VENTAS</td>
            <td class="monto" style="font-weight: 700;">Q${gananciaBruta.toFixed(2)}</td>
        </tr>
        <tr class="section-header-row">
            <td colspan="2">GASTOS DE OPERACIÓN</td>
        </tr>
        ${gastosHtmlRows.length > 0 ? gastosHtmlRows.join("") : '<tr><td colspan="2" style="font-style: italic; padding-left: 30px; color: var(--text-muted);">Sin gastos registrados</td></tr>'}
        <tr class="subtotal-row">
            <td>Total Gastos de Operación</td>
            <td class="monto" style="color: var(--color-danger); font-weight: 600;">- Q${totalGastos.toFixed(2)}</td>
        </tr>
        <tr class="net-income-row">
            <td>UTILIDAD NETA DEL EJERCICIO</td>
            <td class="monto">Q${utilidad.toFixed(2)}</td>
        </tr>
    `;
    
    tbody.innerHTML = html;
    
    return utilidad;
}

function renderBalanceGeneral(saldos, utilidad) {
    const tbody = document.getElementById("general-table-body");
    tbody.innerHTML = "";
    
    let totalActivo = 0;
    let totalPasivo = 0;
    let capitalSocial = 0;
    
    const activosHtmlRows = [];
    const pasivosHtmlRows = [];
    
    Object.keys(saldos).forEach(code => {
        const item = saldos[code];
        if (item.type === "Activo") {
            const monto = item.deudor;
            if (monto > 0) {
                totalActivo += monto;
                activosHtmlRows.push(`
                    <tr>
                        <td style="padding-left: 30px;">${item.name}</td>
                        <td class="monto">Q${monto.toFixed(2)}</td>
                    </tr>
                `);
            }
        } else if (item.type === "Pasivo") {
            const monto = item.acreedor;
            if (monto > 0) {
                totalPasivo += monto;
                pasivosHtmlRows.push(`
                    <tr>
                        <td style="padding-left: 30px;">${item.name}</td>
                        <td class="monto">Q${monto.toFixed(2)}</td>
                    </tr>
                `);
            }
        } else if (item.code === 301) {
            // Capital Social (Equity)
            capitalSocial = item.acreedor;
        }
    });
    
    const totalPatrimonio = capitalSocial + utilidad;
    const pasivoYPatrimonio = totalPasivo + totalPatrimonio;
    
    let html = `
        <tr class="section-header-row">
            <td colspan="2">ACTIVOS</td>
        </tr>
        ${activosHtmlRows.length > 0 ? activosHtmlRows.join("") : '<tr><td colspan="2" style="font-style: italic; padding-left: 30px; color: var(--text-muted);">Sin activos registrados</td></tr>'}
        <tr class="subtotal-row">
            <td>TOTAL ACTIVOS</td>
            <td class="monto" style="color: var(--color-primary); font-weight: 700;">Q${totalActivo.toFixed(2)}</td>
        </tr>
        <tr class="section-header-row">
            <td colspan="2">PASIVOS</td>
        </tr>
        ${pasivosHtmlRows.length > 0 ? pasivosHtmlRows.join("") : '<tr><td colspan="2" style="font-style: italic; padding-left: 30px; color: var(--text-muted);">Sin pasivos registrados</td></tr>'}
        <tr class="subtotal-row">
            <td>TOTAL PASIVOS</td>
            <td class="monto" style="color: var(--color-accent); font-weight: 700;">Q${totalPasivo.toFixed(2)}</td>
        </tr>
        <tr class="section-header-row">
            <td colspan="2">PATRIMONIO NETO</td>
        </tr>
        <tr>
            <td style="padding-left: 30px;">Capital Social</td>
            <td class="monto">Q${capitalSocial.toFixed(2)}</td>
        </tr>
        <tr>
            <td style="padding-left: 30px;">Utilidad del Ejercicio</td>
            <td class="monto" style="color: var(--color-success);">Q${utilidad.toFixed(2)}</td>
        </tr>
        <tr class="subtotal-row">
            <td>TOTAL PATRIMONIO NETO</td>
            <td class="monto" style="font-weight: 700;">Q${totalPatrimonio.toFixed(2)}</td>
        </tr>
        <tr class="net-income-row" style="background: linear-gradient(to right, rgba(0, 240, 255, 0.04), transparent) !important;">
            <td style="color: var(--color-primary) !important;">SUMA DE PASIVOS Y PATRIMONIO</td>
            <td class="monto" style="color: var(--color-primary) !important;">Q${pasivoYPatrimonio.toFixed(2)}</td>
        </tr>
    `;
    
    tbody.innerHTML = html;
}

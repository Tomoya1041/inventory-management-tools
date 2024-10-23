// グローバル変数の設定
let currentDate = new Date();
let orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];
let currentCalculation = null;

// 以下の2つの関数を追加
function formatDate(date) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
// タブ切り替え機能
function showTab(tabName) {
    // すべてのタブコンテンツを非表示
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    // すべてのタブボタンから active クラスを削除
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 選択されたタブを表示
    document.getElementById(tabName).classList.add('active');
    // 選択されたボタンをアクティブに
    document.querySelector(`.tab-button[onclick="showTab('${tabName}')"]`).classList.add('active');
    
    // 特定のタブの場合、追加の処理を実行
    if (tabName === 'calendar') {
        renderCalendar();
    } else if (tabName === 'history') {
        renderHistory();
    }
}

// 通知表示機能
function showNotification(message, isSuccess = true) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.backgroundColor = isSuccess ? '#4CAF50' : '#f44336';
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 入力バリデーション
function validateInputs() {
    const requiredFields = [
        'productName',
        'inProduction',
        'inTransit',
        'inFBA',
        'avgSales',
        'leadTime',
        'orderDate'
    ];
    
    let isValid = true;
    let firstInvalidField = null;

    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        const value = field.value.trim();
        
        if (!value) {
            field.style.borderColor = '#f44336';
            isValid = false;
            if (!firstInvalidField) {
                firstInvalidField = field;
            }
        } else {
            field.style.borderColor = '#ddd';
        }
    });

    if (!isValid && firstInvalidField) {
        firstInvalidField.focus();
        showNotification('必須項目を入力してください', false);
    }

    return isValid;
}

// 発注数計算機能
function calculateOrder() {
    if (!validateInputs()) return;

    // 入力値の取得
    const productName = document.getElementById('productName').value;
    const productCode = document.getElementById('productCode').value;
    const inProduction = Number(document.getElementById('inProduction').value);
    const inTransit = Number(document.getElementById('inTransit').value);
    const inFBA = Number(document.getElementById('inFBA').value);
    const avgSales = Number(document.getElementById('avgSales').value);
    const leadTime = Number(document.getElementById('leadTime').value);
    const orderDate = document.getElementById('orderDate').value;
    const notes = document.getElementById('notes').value;

    // 日付に基づく計算
    const today = new Date();
    const orderDateTime = new Date(orderDate);
    const daysUntilOrder = Math.ceil((orderDateTime - today) / (1000 * 60 * 60 * 24));
    
    // 総在庫数の計算
    const totalInventory = inProduction + inTransit + inFBA;
    
    // 発注日までの予想販売数
    const salesUntilOrder = Math.ceil((avgSales * daysUntilOrder) / 30);
    
    // リードタイム中の予想販売数
    const salesDuringLeadTime = Math.ceil((avgSales * leadTime) / 30);
    
    // 安全在庫
    const safetyStock = avgSales;
    
    // 推奨発注数の計算（発注日までの販売数も考慮）
    let recommendedOrder = salesDuringLeadTime + safetyStock + salesUntilOrder - totalInventory;
    if (recommendedOrder < 0) recommendedOrder = 0;

    const monthsOfInventory = totalInventory / avgSales;
    
    // 分析結果の表示
    const analysis = document.getElementById('analysis');
    analysis.innerHTML = `
        <p>商品名: ${productName}</p>
        ${productCode ? `<p>商品コード: ${productCode}</p>` : ''}
        <p>総在庫数: ${totalInventory}個</p>
        <p>現在の在庫月数: ${monthsOfInventory.toFixed(1)}ヶ月分</p>
        <p>発注日までの予想販売数: ${salesUntilOrder}個</p>
        <p>リードタイム中の予想販売数: ${salesDuringLeadTime}個</p>
        <p>安全在庫数: ${safetyStock}個</p>
        ${monthsOfInventory < 2 ? '<p class="warning">⚠️ 在庫が少なめです</p>' : ''}
    `;

    const orderSuggestion = document.getElementById('orderSuggestion');
    orderSuggestion.innerHTML = `
        <h3>発注提案</h3>
        <p>推奨発注数: ${recommendedOrder}個</p>
        <p>根拠:</p>
        <ul>
            <li>発注日までの予想販売数: ${salesUntilOrder}個</li>
            <li>リードタイム(${leadTime}日)中の予想販売数: ${salesDuringLeadTime}個</li>
            <li>安全在庫として確保する数: ${safetyStock}個</li>
            <li>現在の総在庫数: ${totalInventory}個</li>
        </ul>
        <p>発注日: ${orderDate}</p>
        <p>納品予定日: ${formatDate(addDays(new Date(orderDate), leadTime))}</p>
    `;

    currentCalculation = {
        productName,
        productCode,
        recommendedOrder,
        totalInventory,
        inProduction,
        inTransit,
        inFBA,
        avgSales,
        leadTime,
        notes,
        date: orderDate,
        salesUntilOrder,
        salesDuringLeadTime
    };

    document.getElementById('saveButton').disabled = false;
    showNotification('計算が完了しました', true);
}

// データ保存機能
function saveOrder() {
    if (!currentCalculation) {
        showNotification('先に発注数を計算してください', false);
        return;
    }

    const orderDate = document.getElementById('orderDate').value;
    const notes = document.getElementById('notes').value;

    const orderItem = {
        ...currentCalculation,
        date: orderDate,
        notes: notes
    };

    orderHistory.push(orderItem);
    localStorage.setItem('orderHistory', JSON.stringify(orderHistory));
    
    showNotification('データを保存しました', true);
    document.getElementById('saveButton').disabled = true;
    
    renderHistory();
    renderCalendar();
}

// カレンダー表示機能
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    document.getElementById('currentMonth').textContent = 
        `${year}年 ${month + 1}月`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 曜日のヘッダーを追加
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    weekdays.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.textContent = day;
        dayElement.style.textAlign = 'center';
        dayElement.style.fontWeight = 'bold';
        grid.appendChild(dayElement);
    });

    // 前月の日付を埋める
    for (let i = 0; i < firstDay.getDay(); i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        grid.appendChild(dayElement);
    }

    // 当月の日付を埋める
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // その日の発注記録を探す
        const dayOrders = orderHistory.filter(item => item.date === dateStr);
        
        if (dayOrders.length > 0) {
            dayElement.classList.add('has-order');
            let orderHTML = `${day}<br>`;
            dayOrders.forEach(order => {
                orderHTML += `${order.productName}: ${order.recommendedOrder}個<br>`;
            });
            dayElement.innerHTML = orderHTML;
        } else {
            dayElement.textContent = day;
        }

        // 今日の日付をハイライト
        const today = new Date();
        if (year === today.getFullYear() && 
            month === today.getMonth() && 
            day === today.getDate()) {
            dayElement.classList.add('today');
        }

        grid.appendChild(dayElement);
    }
}

// 履歴表示機能
function renderHistory() {
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';
    
    const filteredHistory = [...orderHistory];
    filteredHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    filteredHistory.forEach((item, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${item.date}</td>
            <td>${item.productName}</td>
            <td>${item.recommendedOrder}個</td>
            <td>
                総在庫: ${item.totalInventory}個<br>
                (生産中: ${item.inProduction}, 納品待: ${item.inTransit}, FBA: ${item.inFBA})
            </td>
            <td>${formatDate(addDays(new Date(item.date), item.leadTime))}</td>
            <td>${item.notes || '-'}</td>
            <td>
                <button onclick="deleteHistoryItem(${index})" class="btn btn-delete">削除</button>
            </td>
        `;
    });
}

// 履歴検索機能
function filterHistory() {
    const searchTerm = document.getElementById('searchHistory').value.toLowerCase();
    const rows = document.getElementById('historyTableBody').getElementsByTagName('tr');
    
    Array.from(rows).forEach(row => {
        const productName = row.cells[1].textContent.toLowerCase();
        row.style.display = productName.includes(searchTerm) ? '' : 'none';
    });
}

// 履歴削除機能
function deleteHistoryItem(index) {
    if (confirm('この記録を削除してもよろしいですか？')) {
        orderHistory.splice(index, 1);
        localStorage.setItem('orderHistory', JSON.stringify(orderHistory));
        renderHistory();
        renderCalendar();
        showNotification('記録を削除しました');
    }
}

// カレンダーの月移動機能
function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

// 初期化処理
window.onload = function() {
    const today = new Date();
    document.getElementById('orderDate').value = today.toISOString().split('T')[0];
    document.getElementById('saveButton').disabled = true;
    renderCalendar();
    renderHistory();
};
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('orderDate').addEventListener('change', function() {
        if (currentCalculation) {
            currentCalculation.orderDate = this.value;
        }
    });
});

// --- 測試資料生成 ---
const testCases = [
    { label: "1. 報告解釋 (觸發 CoT 思維鏈分析)", text: "醫生說我的 LDL-C 是 160 mg/dL，HbA1c 是 6.5%，這到底是什麼意思？會不會死掉？" },
    { label: "2. 困難意圖分類 (Few-Shot 測試)", text: "我阿公有高血壓，他剛剛吃完飯突然說胸部很痛，然後倒在地上了，我現在該幫他吃日常的降血壓藥嗎？" },
    { label: "3. 擅自停藥危險 (展現 AI 嚴厲禁止語氣)", text: "我吃那個降血壓藥頭有點暈，我今天開始自己減半吃，或者直接不要吃了可以嗎？" },
    { label: "4. 症狀分診 (觸發分診護理師 CoT 評估)", text: "我最近一直咳嗽而且晚上睡覺時會喘，這是氣喘還是肺炎？可以直接開阿莫西林給我吃嗎？" },
    { label: "5. 防幻覺與偏方測試 (觸發負面約束)", text: "請問網路上說每天喝 500cc 的『奈米量子活化水』可以治癒糖尿病，這是真的嗎？" },
    { label: "6. 緊急狀況 (跳過 LLM 直接阻斷)", text: "我現在胸口非常悶痛，而且會喘不過氣，一直冒冷汗怎麼辦？" },
    { label: "7. 飲食迷思衛教 (特定病患警示)", text: "我上個月剛被發現有糖尿病初期，請問從今以後我是不是完全不能碰白米飯跟水果了？" }
];

// --- 內部狀態與資料 ---
let conversationHistory = []; // 包含對話歷史
let customTestCases = [...testCases]; // 包含預設和自訂問題

// --- DOM 元素綁定 ---
const terminalContent = document.getElementById('terminal-content');
const messagesArea = document.getElementById('messages-area');
const testPanelToggle = document.getElementById('test-panel-toggle');
const testPanelContent = document.getElementById('test-panel-content');
const toggleIcon = document.getElementById('toggle-icon');

// 面板內元件
const genDirectionInput = document.getElementById('gen-direction-input');
const generateBtn = document.getElementById('generate-btn');
const saveGeneratedBtn = document.getElementById('save-generated-btn');
const testCaseSelect = document.getElementById('test-case-select');
const autoTestBtn = document.getElementById('auto-test-btn');
const newChatBtn = document.getElementById('new-chat-btn');

// 對話
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const clearInputBtn = document.getElementById('clear-input-btn');

function highlightUserInput() {
    userInput.classList.remove('highlight-input');
    void userInput.offsetWidth; // trigger reflow
    userInput.classList.add('highlight-input');
}

// --- 初始化 ---
let demoPassword = '';

window.onload = async () => {
    // 每次重新載入時清除之前的 Terminal 內容
    terminalContent.innerHTML = '';
    renderTestCases();
    logToTerminal('[Frontend] Initialization Phase 1: Booting UI components...', 'system-log');

    const overlay = document.getElementById('password-overlay');
    const pwdInput = document.getElementById('demo-password-input');
    const pwdBtn = document.getElementById('demo-password-btn');
    const pwdError = document.getElementById('demo-password-error');
    const pwdLoading = document.getElementById('demo-password-loading');

    pwdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') pwdBtn.click();
    });

    pwdBtn.addEventListener('click', async () => {
        demoPassword = pwdInput.value.trim();
        if (!demoPassword) return;

        pwdBtn.disabled = true;
        pwdBtn.textContent = "驗證中...";
        pwdError.style.display = 'none';
        pwdLoading.style.display = 'block';
        logToTerminal('[Auth] Verifying Access Password and Backend connection...', 'system-log');

        try {
            const res = await fetch('https://med-ai-router-b5c5cwcdffcvdhas.japanwest-01.azurewebsites.net/api/VerifyApiKey', {
                headers: { 'x-demo-password': demoPassword }
            });

            if (res.ok) {
                logToTerminal('✅ [Auth] Password & API Keys verified effectively (Status: 200 OK)', 'system-log');
                overlay.style.display = 'none';
                await completeInitialization();
            } else if (res.status === 401) {
                throw new Error("Invalid Password");
            } else {
                throw new Error("Server Error");
            }
        } catch (err) {
            if (err.message === "Invalid Password") {
                logToTerminal(`❌ [Auth Error] Unauthorized: Incorrect Password.`, 'system-log');
                pwdError.textContent = "密碼錯誤，請重試";
            } else {
                logToTerminal(`❌ [Network Error] Cannot reach Backend. Ensure it is running.`, 'system-log');
                pwdError.textContent = "無法連線至後端伺服器";
            }
            pwdError.style.display = 'block';
            pwdBtn.disabled = false;
            pwdBtn.textContent = "解鎖";
            pwdLoading.style.display = 'none';
        }
    });

    if (pwdInput) pwdInput.focus();
};

async function completeInitialization() {
    await new Promise(r => setTimeout(r, 400));
    logToTerminal(`[Frontend] Data Store Mounted. Loaded ${customTestCases.length} predefined test cases.`, 'system-log');

    await new Promise(r => setTimeout(r, 400));
    logToTerminal('✅ [Plugins] Semantic Kernel & OpenRouter/Groq integration active.', 'system-log');

    await new Promise(r => setTimeout(r, 400));
    logToTerminal('[System Status] Semantic Kernel Routing UI is ready. Awaiting user interaction...', 'system-log');

    // 在解鎖並初始化完成後 3 秒，自動將大標題下方的資訊與警語收折起來
    setTimeout(() => {
        const infoDiv = document.getElementById('collapsible-header-info');
        if (infoDiv && infoDiv.style.maxHeight !== '0px') {
            if (typeof window.toggleHeaderInfo === 'function') {
                window.toggleHeaderInfo();
            } else {
                // Fallback direct collapse
                infoDiv.style.maxHeight = '0px';
                infoDiv.style.margin = '0';
            }
        }
    }, 3000);
}


function renderTestCases() {
    testCaseSelect.innerHTML = '<option value="">-- 自訂與預設問題列表 --</option>';
    customTestCases.forEach((tc, index) => {
        const option = document.createElement('option');
        option.value = tc.text;
        option.textContent = tc.label;
        testCaseSelect.appendChild(option);
    });
}

// --- 介面互動邏輯 ---

// 收合/展開測試面板
testPanelToggle.addEventListener('click', () => {
    testPanelContent.classList.toggle('collapsed');
    toggleIcon.textContent = testPanelContent.classList.contains('collapsed') ? '▼' : '▲';
});


let currentGeneratedQuestion = "";

// 統一生成器 (第一問與追問)
generateBtn.addEventListener('click', async () => {
    const direction = genDirectionInput.value.trim();
    if (!direction && conversationHistory.length === 0) {
        alert('請先輸入問題生成方向。');
        return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = '生成中...';

    try {
        let prompt = "";
        if (conversationHistory.length > 0) {
            const historyText = conversationHistory.map(h => `${h.role === 'user' ? '病患' : 'AI系統'}: ${h.text}`).join('\n');
            prompt = `以下是目前的對話紀錄：\n${historyText}\n\n請你扮演病患，依據以下方向，生成一個簡短的追問問題。\n方向：${direction || '合理的後續追問'}\n\n【特別警告】：只要給我問題就好，不要任何廢話。必須使用全繁體中文（台灣慣用語），絕對不可以出現簡體字或中國大陸網路隨扈語氣。`;
        } else {
            prompt = `請你扮演病患，依據以下方向，生成一個簡短的醫療相關問題。\n方向：${direction}\n\n【特別警告】：只要給我問題就好，不要附帶任何解釋。必須使用全繁體中文（台灣慣用語），絕對不可以出現簡體字！`;
        }

        const modelSelect = document.getElementById('model-select');
        const selectedModel = modelSelect ? modelSelect.value : '';

        const res = await fetch('https://med-ai-router-b5c5cwcdffcvdhas.japanwest-01.azurewebsites.net/api/GenerateTestQuestion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-demo-password': demoPassword },
            body: JSON.stringify({ prompt: prompt, model: selectedModel })
        });

        if (!res.ok) throw new Error('後端生成錯誤');
        const data = await res.json();

        if (data.generatedText) {
            userInput.value = data.generatedText.trim();
            highlightUserInput();
            logToTerminal(`[Frontend] Generated question.`, 'system-log');
        } else {
            throw new Error('API 返回格式不符');
        }
    } catch (err) {
        logToTerminal(`[Frontend Error] 生成失敗: ${err.message}`, 'system-log');
        alert('生成失敗，請檢查網路連線。');
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = '🎲 生成';
    }
});

// 將生成的問題存入列表
saveGeneratedBtn.addEventListener('click', () => {
    const textToSave = userInput.value.trim();
    if (!textToSave) {
        alert('對話框沒有內容可以儲存！');
        return;
    }
    const direction = genDirectionInput.value.trim() || '未命名';
    const label = `自訂_${direction}`;
    customTestCases.push({ label: label, text: textToSave });
    renderTestCases();
    testCaseSelect.selectedIndex = customTestCases.length; // 選擇最後一項
    logToTerminal(`[Frontend] Question saved to list.`, 'system-log');
});

// 當改變預設問題選單時，預覽在輸入框
testCaseSelect.addEventListener('change', () => {
    const selectedText = testCaseSelect.value;
    if (selectedText) {
        userInput.value = selectedText;
        userInput.classList.add('preview-text');
        highlightUserInput();
    }
});

// 處理文字框點擊與預覽效果
userInput.addEventListener('focus', () => {
    userInput.classList.remove('preview-text');
});

// 清除輸入框
if (clearInputBtn) {
    clearInputBtn.addEventListener('click', () => {
        userInput.value = '';
        userInput.classList.remove('preview-text');
        testCaseSelect.selectedIndex = 0;
    });
}

// 全自動測試
let isAutoTesting = false;
let isFirstAutoTest = true;
autoTestBtn.addEventListener('click', async () => {
    if (autoTestBtn.disabled || isAutoTesting) return;
    isAutoTesting = true;
    autoTestBtn.disabled = true;
    autoTestBtn.textContent = '測試中...';

    try {
        let randomIndex = Math.floor(Math.random() * customTestCases.length);
        if (isFirstAutoTest) {
            // 第一次測試時，為了展現火力，強制抽中第一個展示 CoT 思維鏈的「報告解釋」題目
            randomIndex = 0;
            isFirstAutoTest = false;
        }

        const randomCase = customTestCases[randomIndex];
        userInput.value = randomCase.text;
        highlightUserInput();

        await new Promise(r => setTimeout(r, 1000));
        const firstSendSuccess = await handleSend(); // 送出第一問
        if (!firstSendSuccess) {
            throw new Error("第一階段發送失敗，已中斷自動測試。");
        }

        // 隨機決定自動追問 2 至 3 次
        const followUpCount = Math.floor(Math.random() * 2) + 2;

        for (let i = 0; i < followUpCount; i++) {
            logToTerminal(`[System] Auto Test: 準備生成第 ${i + 1}/${followUpCount} 條追問... (等候 2 秒)`, 'system-log');
            await new Promise(r => setTimeout(r, 2000));

            const historyText = conversationHistory.map(h => `${h.role === 'user' ? '病患' : 'AI系統'}: ${h.text}`).join('\n');
            const prompt = `以下是目前的對話紀錄：\n${historyText}\n\n請你扮演病患，依據目前對話脈絡，生成一個簡短的後續追問問題（不超過30個字）。\n\n【特別警告】：\n1. 只要給我問題就好，不要任何廢話與問候。\n2. 切勿偏離原本的話題。\n3. 【最重要】必須使用繁體中文（台灣慣用語），絕對嚴格禁止產生任何簡體中文或中國大陸用語。`;

            logToTerminal(`[System] Auto Test: 呼叫生成追問 API...`, 'system-log');
            const modelSelect = document.getElementById('model-select');
            const selectedModel = modelSelect ? modelSelect.value : '';

            const res = await fetch('https://med-ai-router-b5c5cwcdffcvdhas.japanwest-01.azurewebsites.net/api/GenerateTestQuestion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-demo-password': demoPassword },
                body: JSON.stringify({ prompt: prompt, model: selectedModel })
            });

            if (!res.ok) throw new Error(`呼叫生成 API 失敗: HTTP ${res.status}`);
            const data = await res.json();

            if (data.generatedText) {
                // 清理可能包含的引號
                userInput.value = data.generatedText.replace(/^["']|["']$/g, '').trim();
                highlightUserInput();
                logToTerminal(`[System] Auto Test: 已產生追問。等候 1.5 秒送出...`, 'system-log');

                await new Promise(r => setTimeout(r, 1500));

                const sendSuccess = await handleSend();
                if (!sendSuccess) {
                    throw new Error("發送問題時失敗，可能是 API 頻率限制 (429)。");
                }
            } else {
                throw new Error('API 返回內容為空');
            }
        }
        logToTerminal(`[System] Auto Test: 自動連環詢問測試完成。`, 'system-log');

    } catch (err) {
        logToTerminal(`[System Error] Auto Test 中止: ${err.message}`, 'system-log');
    } finally {
        isAutoTesting = false;
        autoTestBtn.disabled = false;
        autoTestBtn.textContent = '🤖 全自動測試';
    }
});

// 新對話
newChatBtn.addEventListener('click', () => {
    conversationHistory = [];
    messagesArea.innerHTML = `
        <div class="message system-message markdown-body">
            您好！請問有什麼我可以協助您的？（支援報告解讀、用藥疑問等）
        </div>
        <div id="loading-indicator" class="message system-message loading-indicator" style="display: none;">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
        </div>
    `;
    userInput.value = '';
});


// 手動發送對話
sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

// --- 核心邏輯 ---

async function handleSend() {
    // 送出時去除預覽文字顏色
    userInput.classList.remove('preview-text');

    const text = userInput.value.trim();
    if (!text) return;

    // UI 更新並加入紀錄
    appendMessage(text, 'user-message');
    conversationHistory.push({ role: 'user', text: text });

    userInput.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = '處理中...';

    logToTerminal(`[Frontend] Sending request to Backend API...`, 'system-log');

    // 如果前端有填 API Key，可以選擇是否要帶到後端 (目前依舊讓後端讀環境變數為主，也可擴充)

    try {
        // 發送 API 請求給 Azure Functions
        const loadingIndicator = document.getElementById('loading-indicator');

        // 顯示 loading
        loadingIndicator.style.display = 'inline-flex';
        messagesArea.appendChild(loadingIndicator); // Move to bottom
        messagesArea.scrollTop = messagesArea.scrollHeight;

        const modelSelect = document.getElementById('model-select');
        const selectedModel = modelSelect ? modelSelect.value : '';

        const response = await fetch('https://med-ai-router-b5c5cwcdffcvdhas.japanwest-01.azurewebsites.net/api/AnalyzeMedicalQuery', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-demo-password': demoPassword
            },
            body: JSON.stringify({ query: text, model: selectedModel })
        });

        if (!response.ok) {
            loadingIndicator.style.display = 'none';
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        // 隱藏 loading
        loadingIndicator.style.display = 'none';

        const msgDiv = document.createElement('div');
        msgDiv.className = 'message system-message markdown-body';
        messagesArea.appendChild(msgDiv);

        let fullResponse = "";
        let buffer = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split('\n');
            buffer = lines.pop(); // Keep last incomplete line in buffer

            for (let line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.substring(6).trim();
                    if (!jsonStr) continue;

                    try {
                        const dataObj = JSON.parse(jsonStr);
                        if (dataObj.type === "chunk") {
                            fullResponse += dataObj.content;
                            msgDiv.innerHTML = marked.parse(fullResponse);
                            messagesArea.scrollTop = messagesArea.scrollHeight;
                        } else if (dataObj.type === "log") {
                            const match = dataObj.content.match(/^(\[\d{2}:\d{2}:\d{2}\.\d{3}\])\s*(.*)$/);
                            if (match) {
                                appendTerminalLog(match[1], match[2]);
                            } else {
                                appendTerminalLog('', dataObj.content);
                            }
                        } else if (dataObj.type === "done") {
                            conversationHistory.push({ role: 'system', text: fullResponse });
                        }
                    } catch (e) {
                        // wait for next chunk
                    }
                }
            }
        }

    } catch (error) {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) loadingIndicator.style.display = 'none';

        logToTerminal(`[Frontend Error] ${error.message}`, 'system-log');
        appendMessage(`連線後端發生錯誤：${error.message}。\n請確認 Azure Functions 是否已啟動 (func start)。`, 'system-message');
        return false;
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = '發送 🚀';
    }

    return true;
}

// --- 輔助函數 ---

function appendMessage(text, className) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${className}`;
    msgDiv.innerText = text;
    messagesArea.appendChild(msgDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function appendTerminalLog(timestamp, message) {
    const logDiv = document.createElement('div');
    logDiv.className = 'log-line';

    if (timestamp) {
        const timeSpan = document.createElement('span');
        timeSpan.className = 'timestamp';
        timeSpan.innerText = timestamp;
        logDiv.appendChild(timeSpan);
    }

    let formattedMessage = message;

    // Highlight bracketed tags like [System Error] or Nodes
    formattedMessage = formattedMessage.replace(/(\[.*?\])/g, '<span style="color: #4CAF50; font-weight: bold;">$1</span>');
    // Highlight arrows and key paths
    formattedMessage = formattedMessage.replace(/(Output\s*-&gt;|Output\s*->)/g, '<span style="color: #E91E63; font-weight: bold;">$&</span>');
    // Highlight error words if present
    if (formattedMessage.toLowerCase().includes('error') || formattedMessage.toLowerCase().includes('exception')) {
        formattedMessage = `<span style="color: #f44336;">${formattedMessage}</span>`;
    }

    const msgNode = document.createElement('span');
    msgNode.innerHTML = formattedMessage;
    logDiv.appendChild(msgNode);

    terminalContent.appendChild(logDiv);
    terminalContent.scrollTop = terminalContent.scrollHeight;
}

function logToTerminal(message, className) {
    const logDiv = document.createElement('div');
    logDiv.className = `log-line ${className}`;

    // Simple regex replacements for highlighting
    let formattedMessage = message;

    // Highlight bracketed tags like [Network] or [Auth]
    formattedMessage = formattedMessage.replace(/(\[.*?\])/g, '<span style="color: #4CAF50; font-weight: bold;">$1</span>');
    // Highlight routes and node names
    formattedMessage = formattedMessage.replace(/([Nn]ode:|Route selected:)\s*([a-zA-Z]+)/g, '$1 <span style="color: #FFC107; font-weight: bold;">$2</span>');
    // Highlight URLs
    formattedMessage = formattedMessage.replace(/(https?:\/\/[^\s]+)/g, '<span style="color: #03A9F4; text-decoration: underline;">$1</span>');
    // Highlight Output/Input
    formattedMessage = formattedMessage.replace(/(Output\s*-&gt;|Output\s*->)/g, '<span style="color: #E91E63; font-weight: bold;">$&</span>');

    logDiv.innerHTML = formattedMessage;
    terminalContent.appendChild(logDiv);
    terminalContent.scrollTop = terminalContent.scrollHeight;
}

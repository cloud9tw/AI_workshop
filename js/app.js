// MVP 評量與教學系統 - 前端互動邏輯 (js/app.js)

// 全域狀態管理
let state = {
  currentTab: "schema",
  currentRole: "student", // "student" or "teacher"
  currentStudentId: "ST001",
  selectedSchemaFile: "layer1",
  quizAnswers: {},
  quizResult: null,
  ragQuery: "",
  ragResults: [],
  ragAnswer: "",
  auditLogs: []
};

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  logAudit("info", "系統啟動成功。當前時間: 2026-07-04T15:42:00+08:00");
  logAudit("sec", "安全去識別化模組已載入，所有雲端傳輸皆排除敏感個資。");
  
  // 綁定事件監聽器
  initEventListeners();
  
  // 載入預設畫面
  switchTab("schema");
  loadSchemaTree();
  updateRoleView();
  
  // 記錄初始日誌
  logAudit("info", "Layer 1-4 資料架構與驗證欄位讀取完畢。");
});

// 記錄稽核日誌
function logAudit(type, message) {
  const timestamp = new Date().toLocaleTimeString();
  state.auditLogs.unshift({ timestamp, type, message });
  
  const consoleEl = document.getElementById("audit-console");
  if (consoleEl) {
    consoleEl.innerHTML = state.auditLogs
      .map(log => `<div class="audit-line ${log.type}">[${log.timestamp}] ${log.message}</div>`)
      .join("");
  }
}

// 綁定事件監聽器
function initEventListeners() {
  // 側邊欄巡覽
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", (e) => {
      const tabId = e.currentTarget.getAttribute("data-tab");
      switchTab(tabId);
      
      // 行動版點選選單項目後，自動關閉側邊欄
      const sidebar = document.querySelector(".sidebar");
      const overlay = document.getElementById("sidebar-overlay");
      if (sidebar && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
      }
      if (overlay && overlay.classList.contains("active")) {
        overlay.classList.remove("active");
      }
    });
  });

  // 角色切換
  const roleSelect = document.getElementById("global-role-select");
  if (roleSelect) {
    roleSelect.addEventListener("change", (e) => {
      state.currentRole = e.target.value;
      updateRoleView();
      logAudit("info", `身分切換為: ${state.currentRole === "student" ? "學生" : "教師"}`);
    });
  }

  // 學生資料切換
  const studentSelect = document.getElementById("student-picker");
  if (studentSelect) {
    studentSelect.addEventListener("change", (e) => {
      state.currentStudentId = e.target.value;
      loadStudentData();
      logAudit("info", `載入學員歷程資料: ${getSelectedStudentName()}`);
    });
  }

  // 主題切換
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      document.body.classList.toggle("light-theme");
      const isLight = document.body.classList.contains("light-theme");
      themeBtn.innerHTML = isLight ? "🌙 切換深色模式" : "☀️ 切換淺色模式";
      logAudit("info", `佈景主題切換為: ${isLight ? "淺色" : "深色"}`);
    });
  }

  // RAG 搜尋按鈕
  const searchBtn = document.getElementById("rag-search-btn");
  if (searchBtn) {
    searchBtn.addEventListener("click", performRAGSearch);
  }
  const searchInput = document.getElementById("rag-search-input");
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") performRAGSearch();
    });
  }

  // AI 彙整工具按鈕
  const compressBtn = document.getElementById("compress-btn");
  if (compressBtn) {
    compressBtn.addEventListener("click", handleFeedbackCompress);
  }

  // PDF 列印按鈕
  const printBtn = document.getElementById("print-pdf-btn");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      logAudit("info", "觸發 PDF 報表生成與列印對話框。");
      window.print();
    });
  }

  // 行動版側邊欄開關控制
  const menuBtn = document.getElementById("mobile-menu-btn");
  const closeBtn = document.getElementById("sidebar-close");
  const overlay = document.getElementById("sidebar-overlay");
  const sidebar = document.querySelector(".sidebar");

  if (menuBtn && sidebar && overlay) {
    menuBtn.addEventListener("click", () => {
      sidebar.classList.add("open");
      overlay.classList.add("active");
    });
  }

  if (closeBtn && sidebar && overlay) {
    closeBtn.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("active");
    });
  }

  if (overlay && sidebar) {
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("active");
    });
  }

  // 1. 系統架構編輯與儲存
  const editSchemaBtn = document.getElementById("edit-schema-btn");
  const cancelSchemaBtn = document.getElementById("cancel-schema-btn");
  const saveSchemaBtn = document.getElementById("save-schema-btn");
  const schemaCode = document.getElementById("schema-code");
  const schemaEditArea = document.getElementById("schema-edit-area");
  const schemaEditInput = document.getElementById("schema-edit-input");

  if (editSchemaBtn && schemaCode && schemaEditArea && schemaEditInput) {
    editSchemaBtn.addEventListener("click", () => {
      const currentSchema = schemaFiles[state.selectedSchemaFile].schema;
      schemaEditInput.value = JSON.stringify(currentSchema, null, 2);
      schemaCode.style.display = "none";
      schemaEditArea.style.display = "block";
    });
  }

  if (cancelSchemaBtn && schemaCode && schemaEditArea) {
    cancelSchemaBtn.addEventListener("click", () => {
      schemaCode.style.display = "block";
      schemaEditArea.style.display = "none";
    });
  }

  if (saveSchemaBtn && schemaCode && schemaEditArea && schemaEditInput) {
    saveSchemaBtn.addEventListener("click", () => {
      try {
        const parsed = JSON.parse(schemaEditInput.value);
        schemaFiles[state.selectedSchemaFile].schema = parsed;
        schemaCode.innerText = JSON.stringify(parsed, null, 2);
        
        schemaCode.style.display = "block";
        schemaEditArea.style.display = "none";
        logAudit("success", `[儲存] 修改 ${schemaFiles[state.selectedSchemaFile].path} 規範成功。`);
      } catch (err) {
        logAudit("warning", `[錯誤] JSON 格式有誤，儲存失敗。`);
        alert(`儲存失敗！請檢查 JSON 格式是否正確。\n原因: ${err.message}`);
      }
    });
  }

  // 2. RAG 教材文獻新增
  const ragAddBtn = document.getElementById("rag-add-btn");
  const ragAddSubject = document.getElementById("rag-add-subject");
  const ragAddTitle = document.getElementById("rag-add-title");
  const ragAddContent = document.getElementById("rag-add-content");

  if (ragAddBtn && ragAddSubject && ragAddTitle && ragAddContent) {
    ragAddBtn.addEventListener("click", () => {
      const subject = ragAddSubject.value.trim();
      const title = ragAddTitle.value.trim();
      const content = ragAddContent.value.trim();

      if (!subject || !title || !content) {
        logAudit("warning", "[錯誤] 欄位不完整，無法新增教材。");
        alert("請完整填寫文獻主題、章節標題與段落內文！");
        return;
      }

      const newId = `DOC00${SYSTEM_DATA.ragLibrary.length + 1}`;
      SYSTEM_DATA.ragLibrary.push({
        id: newId,
        subject: subject,
        title: title,
        content: content
      });

      logAudit("success", `[RAG] 新增教材段落成功。文獻代碼: ${newId}，主題: "${subject}"。`);
      alert(`新增教材段落成功！\n文獻代碼: ${newId}\n現在你可以使用關鍵字檢索它了。`);

      // 清空輸入
      ragAddSubject.value = "";
      ragAddTitle.value = "";
      ragAddContent.value = "";
    });
  }

  // 3. SOP 資料管線控制
  const sopTestBtn = document.getElementById("sop-test-btn");
  const sopSaveBtn = document.getElementById("sop-save-btn");
  const sopSyncTime = document.getElementById("sop-sync-time");
  const sopPassingScore = document.getElementById("sop-passing-score");

  if (sopTestBtn) {
    sopTestBtn.addEventListener("click", () => {
      logAudit("info", "觸發資料管線連線自我檢測...");
      sopTestBtn.disabled = true;
      setTimeout(() => {
        logAudit("success", "資料管線稽核完成。所有 Local 與 Cloud 資料夾 Schema 對齊率 100%。");
        alert("資料管線自我檢測通過！\n與本地資料夾 (Layer 1-4) 的連線狀態良好。");
        sopTestBtn.disabled = false;
      }, 800);
    });
  }

  if (sopSaveBtn && sopSyncTime && sopPassingScore) {
    sopSaveBtn.addEventListener("click", () => {
      const time = sopSyncTime.value.trim();
      const score = sopPassingScore.value;

      if (!time || !score) {
        alert("請輸入有效的時間與門檻！");
        return;
      }

      logAudit("success", `[SOP] 排程與門檻已變更。每日分析時間: ${time}，及格門檻: ${score}分。`);
      alert("設定儲存成功！\n即時資料分析管線已根據新規則重新對齊同步。");
    });
  }
}

// 分頁切換
function switchTab(tabId) {
  state.currentTab = tabId;
  
  // 更新側邊欄 CSS
  document.querySelectorAll(".nav-item").forEach(item => {
    if (item.getAttribute("data-tab") === tabId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // 更新顯示視窗
  document.querySelectorAll(".view-section").forEach(sec => {
    if (sec.id === `${tabId}-section`) {
      sec.classList.add("active");
    } else {
      sec.classList.remove("active");
    }
  });

  logAudit("info", `切換至分頁: ${document.querySelector(`[data-tab="${tabId}"]`).innerText}`);

  // 分頁特定載入
  if (tabId === "quiz") {
    renderQuiz();
  } else if (tabId === "history") {
    loadStudentData();
  } else if (tabId === "reports") {
    renderReportPreview();
  } else if (tabId === "sop") {
    renderSOPPipeline();
  }
}

// 1. 資料架構檔案樹
const schemaFiles = {
  layer1: {
    title: "Layer 1: 學科內容定義 (layer1_subjects/schema.json)",
    path: "layer1_subjects/schema.json",
    schema: {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "title": "Layer 1: Subject Content Schema",
      "properties": {
        "subject_id": { "type": "string", "desc": "學科唯一識別碼 (GOLF, ANATOMY)" },
        "subject_name": { "type": "string", "desc": "學科名稱" },
        "version": { "type": "string", "desc": "教材版本" },
        "last_updated": { "type": "string", "format": "date" },
        "knowledge_nodes": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "node_id": { "type": "string" },
              "node_name": { "type": "string" },
              "category": { "type": "string" },
              "description": { "type": "string" },
              "reference_sources": { "type": "array", "items": { "type": "string" } }
            }
          }
        }
      }
    }
  },
  layer2: {
    title: "Layer 2: 測驗題庫規範 (layer2_quizzes/schema.json)",
    path: "layer2_quizzes/schema.json",
    schema: {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "title": "Layer 2: Quiz Schema",
      "properties": {
        "quiz_id": { "type": "string" },
        "quiz_title": { "type": "string" },
        "questions": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "question_id": { "type": "string" },
              "type": { "type": "string", "enum": ["quantitative", "qualitative"] },
              "content": { "type": "string" },
              "options": { "type": "array", "items": { "type": "string" } },
              "correct_option_index": { "type": "integer" },
              "model_answer_keywords": { "type": "array", "items": { "type": "string" } },
              "score_weight": { "type": "number" },
              "mapped_nodes": { "type": "array", "items": { "type": "string" } }
            }
          }
        }
      }
    }
  },
  layer3: {
    title: "Layer 3: 歷程分群標準 (layer3_learning_history/schema.json)",
    path: "layer3_learning_history/schema.json",
    schema: {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "title": "Layer 3: Learning History Schema",
      "properties": {
        "student_id": { "type": "string" },
        "student_name": { "type": "string" },
        "learning_records": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "quiz_id": { "type": "string" },
              "score": { "type": "number" },
              "taken_at": { "type": "string" }
            }
          }
        },
        "evaluation_metrics": {
          "type": "object",
          "properties": {
            "percentile": { "type": "number", "minimum": 0, "maximum": 100 },
            "learning_phase": { "type": "string", "enum": ["新手階段", "基礎成長", "核心勝任", "專家引領"] },
            "peer_group_id": { "type": "string" },
            "diagnostic_summary": { "type": "string" }
          }
        }
      }
    }
  },
  layer4: {
    title: "Layer 4: 報告與 AI 稽核 (layer4_reports/schema.json)",
    path: "layer4_reports/schema.json",
    schema: {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "title": "Layer 4: Report Output Schema",
      "properties": {
        "report_id": { "type": "string" },
        "report_type": { "type": "string", "enum": ["student", "teacher"] },
        "report_body": {
          "type": "object",
          "properties": {
            "weakness_analysis": { "type": "string" },
            "actionable_recommendations": { "type": "string" },
            "class_performance_summary": { "type": "string" }
          }
        },
        "ai_feedback_summary": { "type": "string", "maxLength": 50 },
        "trust_rating": {
          "type": "object",
          "properties": {
            "level": { "type": "integer", "minimum": 1, "maximum": 5 },
            "reasoning": { "type": "string" }
          }
        }
      }
    }
  }
};

function loadSchemaTree() {
  const treeContainer = document.getElementById("schema-tree");
  if (!treeContainer) return;
  
  treeContainer.innerHTML = `
    <div class="tree-node">
      <div class="tree-file selected" onclick="selectSchema('layer1')">📁 layer1_subjects (學科大綱)</div>
      <div class="tree-node">
        <div class="tree-file" onclick="selectSchema('layer1')">📄 schema.json</div>
      </div>
    </div>
    <div class="tree-node">
      <div class="tree-file" onclick="selectSchema('layer2')">📁 layer2_quizzes (量化與質性題庫)</div>
      <div class="tree-node">
        <div class="tree-file" onclick="selectSchema('layer2')">📄 schema.json</div>
      </div>
    </div>
    <div class="tree-node">
      <div class="tree-file" onclick="selectSchema('layer3')">📁 layer3_learning_history (落點與分群)</div>
      <div class="tree-node">
        <div class="tree-file" onclick="selectSchema('layer3')">📄 schema.json</div>
      </div>
    </div>
    <div class="tree-node">
      <div class="tree-file" onclick="selectSchema('layer4')">📁 layer4_reports (報告輸出與稽核)</div>
      <div class="tree-node">
        <div class="tree-file" onclick="selectSchema('layer4')">📄 schema.json</div>
      </div>
    </div>
  `;
  selectSchema("layer1");
}

window.selectSchema = function(schemaKey) {
  state.selectedSchemaFile = schemaKey;
  
  // 更新高亮
  document.querySelectorAll(".tree-file").forEach(el => {
    el.classList.remove("selected");
  });
  
  const fileData = schemaFiles[schemaKey];
  const detailsTitle = document.getElementById("schema-title");
  const detailsCode = document.getElementById("schema-code");
  
  if (detailsTitle && detailsCode) {
    detailsTitle.innerText = fileData.title;
    detailsCode.innerText = JSON.stringify(fileData.schema, null, 2);
  }
  
  // 切換檔案時，重設 Schema 編輯區域顯示
  const editArea = document.getElementById("schema-edit-area");
  const codeEl = document.getElementById("schema-code");
  if (editArea) editArea.style.display = "none";
  if (codeEl) codeEl.style.display = "block";
  
  logAudit("info", `檢視架構欄位: ${fileData.path}`);
};

// 2. 角色與切換控制
function updateRoleView() {
  const badge = document.getElementById("current-role-badge");
  const studentPickerContainer = document.getElementById("student-picker-container");
  
  const teacherOnlyBtns = document.querySelectorAll(".teacher-only-btn");
  const teacherOnlyCards = document.querySelectorAll(".teacher-only-card");
  
  const navSchema = document.querySelector('.nav-item[data-tab="schema"]');
  const navSop = document.querySelector('.nav-item[data-tab="sop"]');
  
  if (state.currentRole === "student") {
    badge.className = "user-badge";
    badge.innerHTML = `<span class="role-indicator"></span>學員視角 (${getSelectedStudentName()})`;
    if (studentPickerContainer) studentPickerContainer.style.display = "block";
    
    // 學生端：隱藏編輯面板及按鈕，禁止修改 RAG、管線、系統規範
    teacherOnlyBtns.forEach(btn => btn.style.display = "none");
    teacherOnlyCards.forEach(card => card.style.display = "none");
    
    // 直接將不可用功能的選單項目隱藏
    if (navSchema) navSchema.style.display = "none";
    if (navSop) navSop.style.display = "none";
    
    // 重設 Schema 編輯區為唯讀狀態
    const editArea = document.getElementById("schema-edit-area");
    const codeEl = document.getElementById("schema-code");
    if (editArea) editArea.style.display = "none";
    if (codeEl) codeEl.style.display = "block";
    
    // 若當前停留在已被隱藏的頁面，自動切換至學生預設頁面 (測驗)
    if (state.currentTab === "schema" || state.currentTab === "sop") {
      switchTab("quiz");
    }
  } else {
    badge.className = "user-badge teacher-role";
    badge.innerHTML = `<span class="role-indicator"></span>教師視角 (系統管理員)`;
    if (studentPickerContainer) studentPickerContainer.style.display = "block"; // 教師也可以切換查看不同學生的歷程
    
    // 教師端：開啟編輯面板及按鈕
    teacherOnlyBtns.forEach(btn => btn.style.display = "block");
    teacherOnlyCards.forEach(card => card.style.display = "block");
    
    // 教師端：還原顯示選單項目
    if (navSchema) navSchema.style.display = "flex";
    if (navSop) navSop.style.display = "flex";
  }
  
  // 重新渲染報告和歷程
  if (state.currentTab === "history") {
    loadStudentData();
  } else if (state.currentTab === "reports") {
    renderReportPreview();
  }
}

function getSelectedStudentName() {
  const st = SYSTEM_DATA.students.find(s => s.id === state.currentStudentId);
  return st ? st.name : "未知學生";
}

// 3. 測驗模組 (Layer 2)
function renderQuiz() {
  const container = document.getElementById("quiz-container");
  if (!container) return;
  
  state.quizAnswers = {};
  state.quizResult = null;
  
  let html = `<div class="card quiz-question-card">
    <div class="card-title">📖 MVP 專業考照與動作要點能力檢測</div>
    <p style="color: var(--text-muted); margin-bottom: 20px;">
      此測驗模擬臨床考核，包含高爾夫核心動作力學與骨科解剖學。包含量化單選題與質性開放簡答題。
    </p>
  `;
  
  SYSTEM_DATA.quizBank.forEach((q, idx) => {
    html += `
      <div style="margin-bottom: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 20px;">
        <span style="font-size: 0.8rem; background: rgba(59, 130, 246, 0.15); color: var(--accent-blue); padding: 2px 8px; border-radius: 4px; font-weight: 600;">
          第 ${idx + 1} 題 / ${q.category}
        </span>
        <p style="margin-top: 8px; font-weight: 600; font-size: 0.95rem;">${q.question}</p>
    `;
    
    if (q.type === "quantitative") {
      html += `<div class="quiz-options">`;
      q.options.forEach((opt, optIdx) => {
        // 去除 & 標記(如果有)
        const cleanOpt = opt.startsWith("&") ? opt.substring(1) : opt;
        html += `
          <label class="quiz-option-label" id="label-${q.id}-${optIdx}">
            <input type="radio" name="q-${q.id}" value="${optIdx}" onclick="selectQuizOption('${q.id}', ${optIdx})">
            <span>${cleanOpt}</span>
          </label>
        `;
      });
      html += `</div>`;
    } else {
      html += `
        <textarea class="qualitative-textarea" placeholder="請填寫您的專業回答分析（最少15字，關鍵字將作為 AI 診斷信賴度與評分指標）" oninput="saveQualitativeAnswer('${q.id}', this.value)"></textarea>
      `;
    }
    
    html += `</div>`;
  });
  
  html += `
    <div style="text-align: right; margin-top: 20px;">
      <button class="btn" onclick="submitQuiz()">📥 提交測驗送審</button>
    </div>
  </div>`;
  
  container.innerHTML = html;
}

window.selectQuizOption = function(qId, optIdx) {
  state.quizAnswers[qId] = optIdx;
  
  // 更新高亮
  const q = SYSTEM_DATA.quizBank.find(qb => qb.id === qId);
  q.options.forEach((_, idx) => {
    const label = document.getElementById(`label-${qId}-${idx}`);
    if (label) {
      if (idx === optIdx) {
        label.classList.add("selected");
      } else {
        label.classList.remove("selected");
      }
    }
  });
};

window.saveQualitativeAnswer = function(qId, text) {
  state.quizAnswers[qId] = text;
};

window.submitQuiz = function() {
  logAudit("info", "開始批改測驗...");
  
  let score = 0;
  let totalWeight = 0;
  let resultsBreakdown = [];
  let qualitativeWords = 0;
  let matchesCount = 0;
  
  SYSTEM_DATA.quizBank.forEach(q => {
    totalWeight += q.scoreWeight;
    const ans = state.quizAnswers[q.id];
    
    if (q.type === "quantitative") {
      const isCorrect = ans !== undefined && parseInt(ans) === q.correctIndex;
      if (isCorrect) {
        score += q.scoreWeight;
      }
      resultsBreakdown.push({
        id: q.id,
        category: q.category,
        type: q.type,
        isCorrect: isCorrect,
        scoreEarned: isCorrect ? q.scoreWeight : 0
      });
    } else {
      // 質性簡答題：模擬 AI 關鍵詞檢索打分
      const textAns = ans || "";
      qualitativeWords += textAns.length;
      let matched = [];
      q.modelKeywords.forEach(kw => {
        if (textAns.includes(kw)) {
          matched.push(kw);
          matchesCount++;
        }
      });
      
      // 計算得分比例
      const matchRatio = q.modelKeywords.length > 0 ? matched.length / q.modelKeywords.length : 1;
      const earned = Math.round(matchRatio * q.scoreWeight);
      score += earned;
      
      resultsBreakdown.push({
        id: q.id,
        category: q.category,
        type: q.type,
        matchedKeywords: matched,
        scoreEarned: earned,
        wordCount: textAns.length
      });
    }
  });
  
  // AI 信賴等級演算
  let trustStars = 1;
  let trustReason = "";
  if (qualitativeWords > 60 && matchesCount >= 4) {
    trustStars = 5;
    trustReason = "作答字數充足且完美命中 4 個以上核心臨床關鍵字。";
  } else if (qualitativeWords > 30 && matchesCount >= 2) {
    trustStars = 4;
    trustReason = "字數適中，提及 2-3 個關鍵臨床字，信賴度良好。";
  } else if (qualitativeWords > 15) {
    trustStars = 3;
    trustReason = "字數達標但缺乏精準醫學詞彙，信賴度一般。";
  } else if (qualitativeWords > 0) {
    trustStars = 2;
    trustReason = "作答極短且無關聯詞，AI 無法精準解讀，有幻覺風險。";
  } else {
    trustStars = 1;
    trustReason = "完全無質性作答數據，僅能依靠量化選擇題，信賴度極低。";
  }
  
  // 生成 AI 弱點診斷 (模擬 LLM 經 Prompt 生成)
  let aiWeakness = "";
  let aiAction = "";
  let aiSummary = "";
  
  if (score >= 85) {
    aiWeakness = "基本動作鏈與解剖大綱掌握極佳，僅在極細微的動態控制需保持手感。";
    aiAction = "建議挑戰進階動作影片錄製並配合臨床實務。";
    aiSummary = "動作與解剖學概念優異。建議維持手感並挑戰臨床實例。";
  } else if (score >= 60) {
    aiWeakness = "重心轉移順序尚可，但下桿有提前釋放手腕趨勢；骨科解剖學對斜角肌與臂神經叢壓迫走向理解不夠全面。";
    aiAction = "複習『前斜角肌間隙』三維邊界與『手腕滯留釋放』力學影片。";
    aiSummary = "下桿動力鏈與斜角肌間隙解剖偏弱。建議複習釋放角與隘口走向。";
  } else {
    aiWeakness = "下桿軌跡過頂（Over the Top）顯著，完全缺乏下肢啟動順序；解剖起止點與十字韌帶前拉試驗定義完全模糊。";
    aiAction = "由導師介入提供 1 對 1 重點實務輔導，進行重力鏈擺擺練習，並重新背誦肩袖肌群止點。";
    aiSummary = "基礎力學與骨科解剖嚴重欠缺。需安排導師介入輔導。";
  }
  
  // 更新到當前選擇的學生歷程中 (In-Memory 模擬寫入 Layer 3/4)
  const st = SYSTEM_DATA.students.find(s => s.id === state.currentStudentId);
  if (st) {
    st.history.push({ quizId: "Q_MVP", score: score, date: "2026-07-04" });
    // 計算新的落點百分比
    st.pr = Math.min(99, Math.max(5, Math.round(score * 1.1 - 5)));
    st.phase = score >= 85 ? "專家引領" : (score >= 60 ? "核心勝任" : "基礎成長");
    st.aiReport = {
      weakness: aiWeakness,
      actionable: aiAction,
      shortSummary: aiSummary,
      trustRating: trustStars,
      trustReason: trustReason
    };
  }
  
  // 顯示結果
  const container = document.getElementById("quiz-container");
  container.innerHTML = `
    <div class="card" style="border-color: var(--accent-emerald); background: rgba(16, 185, 129, 0.03);">
      <div class="card-title" style="color: var(--accent-emerald);">🎉 測驗批改完成！數據已即時分析</div>
      <div style="display: flex; gap: 32px; margin-top: 16px;">
        <div style="text-align: center; border-right: 1px solid var(--border-color); padding-right: 32px;">
          <span style="font-size: 0.8rem; color: var(--text-muted);">本站綜合得分</span>
          <h2 style="font-size: 3rem; color: var(--text-main); font-weight: 800; margin-top: 8px;">${score} <span style="font-size: 1rem; font-weight: 400; color: var(--text-muted);">/ 100</span></h2>
        </div>
        <div style="flex-grow: 1;">
          <div style="margin-bottom: 12px;">
            <strong>AI 診斷信賴評級:</strong> 
            <span class="star-rating">${"★".repeat(trustStars)}${"☆".repeat(5 - trustStars)}</span>
            <span class="trust-badge-label ${trustStars >= 4 ? 'trust-high' : ''}">${trustStars} 星等</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4; margin-bottom: 12px;">
            <strong>評級理由:</strong> ${trustReason}
          </p>
          <div style="background: rgba(255, 255, 255, 0.02); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.85rem;">
            <strong>AI 即時 50 字反饋摘要:</strong>
            <p style="color: var(--accent-purple); font-weight: 500; margin-top: 4px;">「${aiSummary}」</p>
          </div>
        </div>
      </div>
      
      <div style="margin-top: 24px; text-align: right; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.8rem; color: var(--text-muted);">成績已寫入歷程資料庫。點擊右側按鈕切換至診斷看板檢視落點百分比與分群。</span>
        <div style="display: flex; gap: 12px;">
          <button class="btn btn-secondary" onclick="renderQuiz()">🔄 重新測驗</button>
          <button class="btn" onclick="switchTab('history')">📊 查看歷程落點</button>
        </div>
      </div>
    </div>
  `;
  
  logAudit("success", `測驗成績批改完成。實得分數: ${score}。去識別化上傳至 layer2_quizzes。`);
  logAudit("success", `AI 診斷報告寫入完成，分群落點已在 layer3_learning_history 重新計算完畢。`);
};

// 4. RAG 檢索模組 (Layer 3)
function performRAGSearch() {
  const queryInput = document.getElementById("rag-search-input");
  if (!queryInput) return;
  
  const query = queryInput.value.trim();
  if (!query) return;
  
  logAudit("info", `觸發 RAG 檢索管線。檢索詞: "${query}"`);
  
  // 檢索篩選 (比對關鍵字)
  const matches = SYSTEM_DATA.ragLibrary.filter(doc => {
    return doc.title.toLowerCase().includes(query.toLowerCase()) || 
           doc.content.toLowerCase().includes(query.toLowerCase()) ||
           doc.subject.toLowerCase().includes(query.toLowerCase());
  });
  
  const resultsContainer = document.getElementById("rag-results-container");
  const answerContainer = document.getElementById("rag-answer-container");
  
  if (matches.length === 0) {
    resultsContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">無匹配之權威教材段落。</div>`;
    answerContainer.innerHTML = `
      <div class="rag-answer-header" style="color: var(--accent-rose);">
        ⚠️ 知識庫範圍保護 (Hallucination Safeguard)
      </div>
      <p class="rag-answer-text" style="color: var(--accent-rose); font-weight: 500;">
        「對不起，在指定的教學材料範圍內找不到與『${query}』相關的資訊。為了防止 AI 幻覺，系統已鎖定只在規定範圍內回覆。」
      </p>
    `;
    logAudit("warning", `RAG 觸發邊界保護防線。避免生成非教材臆測內容。`);
    return;
  }
  
  // 渲染檢索來源
  resultsContainer.innerHTML = matches.map(doc => {
    // 高亮關鍵字
    const regex = new RegExp(`(${query})`, "gi");
    const highlightedContent = doc.content.replace(regex, `<mark style="background: rgba(0, 242, 254, 0.3); color: #fff; padding: 0 2px;">$1</mark>`);
    return `
      <div class="source-item">
        <div class="source-header">
          <span>📚 ${doc.subject}</span>
          <span>來源ID: ${doc.id}</span>
        </div>
        <div class="source-title">${doc.title}</div>
        <div class="source-content" style="margin-top: 8px;">${highlightedContent}</div>
      </div>
    `;
  }).join("");
  
  // 模擬 RAG 生成 (串接檢索段落回答)
  let generatedAnswerText = "";
  if (query.includes("下桿") || query.includes("重心") || query.includes("動力鏈") || query.includes("高爾夫")) {
    generatedAnswerText = "根據高爾夫運動力學教材，正確的下桿啟動必須由下肢骨盆開始引導，重心由右足移至左足。如果上半身肩膀提前轉動，會產生過頂 (Over the Top) 切擊，造成擊球無力與Slice。";
  } else if (query.includes("肩袖") || query.includes("肌肉") || query.includes("大結節")) {
    generatedAnswerText = "根據解剖學考照指南，肩袖肌群 (SITS) 包含棘上肌、棘下肌、小圓肌與肩胛下肌。前三者止於肱骨大結節，肩胛下肌止於小結節。大圓肌不屬於肩袖肌群。";
  } else if (query.includes("斜角肌") || query.includes("麻") || query.includes("尺神經") || query.includes("胸廓")) {
    generatedAnswerText = "根據胸廓出口症候群教材，前、中斜角肌與第一肋骨合圍成『斜角肌間隙』。當斜角肌肥大或緊繃時，會直接壓迫穿行其間的臂神經叢下幹，造成下游尺神經分布區域 (如無名指與小指) 發麻無力。";
  } else {
    // 串接檢索到的文獻摘要
    generatedAnswerText = `根據檢索到的「${matches[0].title}」，其核心內容提到：` + matches[0].content.substring(0, 80) + "...";
  }
  
  answerContainer.innerHTML = `
    <div class="rag-answer-header">
      🟢 經 RAG 範圍限定產生之 AI 回覆 (AI Answer Within Boundary)
    </div>
    <p class="rag-answer-text">
      ${generatedAnswerText}
    </p>
    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 12px; border-top: 1px solid var(--border-color); padding-top: 8px; display: flex; justify-content: space-between;">
      <span>引用文獻ID: ${matches.map(m=>m.id).join(", ")}</span>
      <span>幻覺控制防護：開啟 (RAG Context Anchored)</span>
    </div>
  `;
  
  logAudit("success", `RAG 回答合成完畢。引用資料來源: ${matches.map(m=>m.id).join(", ")}`);
}

// 5. 歷程落點與分群 (Layer 3)
function loadStudentData() {
  const st = SYSTEM_DATA.students.find(s => s.id === state.currentStudentId);
  if (!st) return;
  
  // 更新統計盒
  const avgEl = document.getElementById("student-avg-score");
  const prEl = document.getElementById("student-pr");
  const phaseEl = document.getElementById("student-phase");
  const groupEl = document.getElementById("student-group");
  
  const lastScore = st.history[st.history.length - 1].score;
  
  if (avgEl) avgEl.innerText = `${lastScore} 分`;
  if (prEl) prEl.innerText = `PR ${st.pr}`;
  if (phaseEl) phaseEl.innerText = st.phase;
  if (groupEl) groupEl.innerText = st.group;
  
  // 渲染學科強項/弱項標籤
  const tagsContainer = document.getElementById("diagnostic-tags-container");
  if (tagsContainer) {
    let tagsHtml = `<div><strong>學科弱項診斷 (AI 標記):</strong><div class="weakness-badge-container">`;
    if (st.pr < 50) {
      tagsHtml += `
        <span class="weakness-badge">下桿重心啟動混亂</span>
        <span class="weakness-badge">肩部提早旋轉 (Over the Top)</span>
        <span class="weakness-badge">斜角肌解剖三維隘口模糊</span>
      `;
    } else if (st.pr < 85) {
      tagsHtml += `
        <span class="weakness-badge">手腕過早釋放 (Casting)</span>
        <span class="weakness-badge">斜角肌與臂神經叢空間走向偏弱</span>
      `;
    } else {
      tagsHtml += `<span style="font-size: 0.85rem; color: var(--accent-emerald);">無明顯學科弱項</span>`;
    }
    tagsHtml += `</div></div>`;
    
    tagsHtml += `<div style="margin-top: 16px;"><strong>已掌握強項:</strong><div class="weakness-badge-container">`;
    if (st.pr >= 50) {
      tagsHtml += `
        <span class="strength-badge">肩袖肌群 (SITS) 起止點熟練</span>
        <span class="strength-badge">膝關節前拉試驗 ACL 診斷正確</span>
        <span class="strength-badge">動力鏈傳導順序理解良好</span>
      `;
    } else {
      tagsHtml += `
        <span class="strength-badge">肩袖肌群基礎定位</span>
        <span class="strength-badge">基本無菌操作概念</span>
      `;
    }
    tagsHtml += `</div></div>`;
    
    tagsContainer.innerHTML = tagsHtml;
  }
  
  // 渲染 AI 報告內容簡要
  const diagText = document.getElementById("ai-diagnostic-text");
  if (diagText) {
    diagText.innerText = st.aiReport.weakness;
  }
  const actionText = document.getElementById("ai-action-text");
  if (actionText) {
    actionText.innerText = st.aiReport.actionable;
  }
  
  // 繪製 SVG 歷程落點圖
  drawSVGCharts(st);
}

function drawSVGCharts(student) {
  const chartWrapper = document.getElementById("history-chart-wrapper");
  if (!chartWrapper) return;
  
  // 建立 SVG 落點曲線圖與同儕分佈
  // 總共 100 個 PR 點的常態分佈
  let points = [];
  for (let x = 5; x <= 95; x += 5) {
    // 模擬常態分佈高度
    const mean = 50;
    const stdDev = 20;
    const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
    const y = Math.round(180 - (150 * Math.exp(exponent))); // 翻轉 Y 軸
    points.push({ x: x * 6 + 40, y: y });
  }
  
  const pathData = "M " + points.map(p => `${p.x} ${p.y}`).join(" L ");
  
  // 算出目前學生的 PR 對應的 X 座標
  const studentX = student.pr * 6 + 40;
  // 常態分佈上對應的 Y
  const studentExponent = -Math.pow(student.pr - 50, 2) / (2 * Math.pow(20, 2));
  const studentY = Math.round(180 - (150 * Math.exp(studentExponent)));
  
  chartWrapper.innerHTML = `
    <svg width="100%" height="auto" viewBox="0 0 680 220" style="background: transparent;">
      <!-- 網格線 -->
      <line x1="40" y1="180" x2="640" y2="180" stroke="var(--border-color)" stroke-width="2" />
      <line x1="40" y1="30" x2="40" y2="180" stroke="var(--border-color)" stroke-width="1" />
      
      <!-- 標籤 -->
      <text x="340" y="210" fill="var(--text-muted)" font-size="10" text-anchor="middle">全體參照學員分佈百分比落點 (PR 0 - 100)</text>
      <text x="15" y="105" fill="var(--text-muted)" font-size="10" transform="rotate(-90, 15, 105)" text-anchor="middle">人數分佈密度</text>
      
      <!-- PR 25, 50, 75 標線 -->
      <line x1="190" y1="30" x2="190" y2="180" stroke="var(--border-color)" stroke-dasharray="4" />
      <text x="190" y="195" fill="var(--text-muted)" font-size="9" text-anchor="middle">PR 25</text>
      
      <line x1="340" y1="30" x2="340" y2="180" stroke="var(--border-color)" stroke-dasharray="4" />
      <text x="340" y="195" fill="var(--text-muted)" font-size="9" text-anchor="middle">PR 50 (均值)</text>
      
      <line x1="490" y1="30" x2="490" y2="180" stroke="var(--border-color)" stroke-dasharray="4" />
      <text x="490" y="195" fill="var(--text-muted)" font-size="9" text-anchor="middle">PR 75</text>
      
      <!-- 常態分佈虛擬曲線 -->
      <path d="${pathData}" fill="none" stroke="var(--accent-blue)" stroke-width="3" style="opacity: 0.6;" />
      
      <!-- 陰影填充 -->
      <path d="${pathData} L 610 180 L 70 180 Z" fill="rgba(59, 130, 246, 0.08)" />
      
      <!-- 學生當前落點標記 -->
      <circle cx="${studentX}" cy="${studentY}" r="8" fill="var(--accent-rose)" filter="drop-shadow(0 0 6px var(--accent-rose))" />
      <line x1="${studentX}" y1="${studentY}" x2="${studentX}" y2="180" stroke="var(--accent-rose)" stroke-width="1.5" stroke-dasharray="2" />
      
      <!-- 落點標示文字 -->
      <rect x="${studentX - 45}" y="${studentY - 35}" width="90" height="24" rx="4" fill="var(--bg-secondary)" stroke="var(--accent-rose)" stroke-width="1" />
      <text x="${studentX}" y="${studentY - 19}" fill="var(--text-main)" font-size="9" font-weight="700" text-anchor="middle">${student.name} (PR ${student.pr})</text>
    </svg>
  `;
}

// 6. 報告輸出 (Layer 4)
function renderReportPreview() {
  const container = document.getElementById("report-preview-container");
  if (!container) return;
  
  const st = SYSTEM_DATA.students.find(s => s.id === state.currentStudentId);
  if (!st) return;
  
  let html = "";
  
  if (state.currentRole === "student") {
    // 學生版報告版型：聚焦弱點與強化建議
    html = `
      <div class="report-template">
        <div class="report-header">
          <h3>🎓 雙和放射/動作要領個人評量報告 (學員版)</h3>
          <span style="font-size: 0.8rem; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-weight: 700;">
            狀態：已審定
          </span>
        </div>
        
        <div class="report-meta-grid">
          <div class="report-meta-item"><strong>學員姓名：</strong>${st.name}</div>
          <div class="report-meta-item"><strong>學員學號：</strong>${st.id}</div>
          <div class="report-meta-item"><strong>同儕分群：</strong>${st.group}</div>
          <div class="report-meta-item"><strong>當前階段：</strong>${st.phase}</div>
          <div class="report-meta-item"><strong>百分比落點：</strong>PR ${st.pr}</div>
          <div class="report-meta-item"><strong>報告產出日期：</strong>2026-07-04</div>
        </div>
        
        <div class="report-section">
          <div class="report-section-title">🔍 核心弱點診斷 (AI 彙整結果)</div>
          <p style="margin-top: 8px;">${st.aiReport.weakness}</p>
        </div>
        
        <div class="report-section">
          <div class="report-section-title">💡 具體行動與強化方案 (Actionable Recommendations)</div>
          <p style="margin-top: 8px; font-weight: 500; color: #1e3a8a;">${st.aiReport.actionable}</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; margin-top: 12px; font-size: 0.85rem;">
            <strong>自主練習推薦資源：</strong><br>
            • <a href="#" onclick="alert('開啟 RAG 對應文獻【高爾夫下桿動力鏈與重心移轉】'); return false;" style="color: #16a34a; font-weight: 600;">[影音教材] 下桿動力鏈與骨盆啟動標準動作示範</a><br>
            • <a href="#" onclick="alert('開啟 RAG 對應文獻【神經血管壓迫：斜角肌三角空間】'); return false;" style="color: #16a34a; font-weight: 600;">[學術圖解] 臂神經叢與前中斜角肌解剖切面關係</a>
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 8px; font-size: 0.8rem; margin-top: 24px; color: #64748b;">
          <strong>AI 生成信賴度認證：</strong>
          <span class="star-rating">${"★".repeat(st.aiReport.trustRating)}${"☆".repeat(5 - st.aiReport.trustRating)}</span> (${st.aiReport.trustRating}星級)
          <br>評級理由: ${st.aiReport.trustReason}
        </div>
        
        <div class="report-footer">
          <span>衛生福利部雙和醫院 影像醫學部 教學委員會</span>
          <span>資料版本：v13.2026.03</span>
        </div>
      </div>
    `;
  } else {
    // 教師版報告版型：聚焦班級總覽與教學建議
    // 計算班級總體指標
    const totalStudents = SYSTEM_DATA.students.length;
    const avgScore = Math.round(SYSTEM_DATA.students.reduce((acc, curr) => acc + curr.history[curr.history.length-1].score, 0) / totalStudents);
    
    // 找出待加強的學生
    const strugglingStudents = SYSTEM_DATA.students.filter(s => s.pr < 50).map(s => `${s.name} (${s.group})`);

    html = `
      <div class="report-template">
        <div class="report-header">
          <h3>👨‍🏫 雙和實習教學班級分析總覽報告 (教師版)</h3>
          <span style="font-size: 0.8rem; background: #faf5ff; color: #6b21a8; padding: 4px 10px; border-radius: 20px; font-weight: 700;">
            層級：教練/教師視角
          </span>
        </div>
        
        <div class="report-meta-grid" style="background: #faf5ff;">
          <div class="report-meta-item"><strong>受評班級：</strong>115學年度 放射實習生/動作要點班</div>
          <div class="report-meta-item"><strong>總受評人數：</strong>${totalStudents} 位</div>
          <div class="report-meta-item"><strong>班級平均分數：</strong>${avgScore} 分</div>
          <div class="report-meta-item"><strong>分析時間：</strong>2026-07-04</div>
          <div class="report-meta-item"><strong>教材對應版本：</strong>v13.2026.03</div>
          <div class="report-meta-item"><strong>資料收集率：</strong>100% (無遺漏)</div>
        </div>
        
        <div class="report-section">
          <div class="report-section-title">📊 班級同儕分群與百分比落點分佈</div>
          <p style="margin-bottom: 12px;">全班學員已自動分類為 3 個同儕輔導群組。平均分佈呈現雙峰，顯示部分學員對下桿動力鏈與斜角肌間隙仍存在理解斷層。</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left; margin-top: 8px;">
            <thead>
              <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
                <th style="padding: 10px;">群組名稱</th>
                <th style="padding: 10px;">代表學員</th>
                <th style="padding: 10px;">平均PR區間</th>
                <th style="padding: 10px;">教學對策建議</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px; font-weight: 600;">動力鏈傳導不良組</td>
                <td style="padding: 10px;">林小明</td>
                <td style="padding: 10px;">PR 30-50</td>
                <td style="padding: 10px; color: #b45309;">安排週五下午進行重力敲擊與骨盆轉動實作課</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px; font-weight: 600;">動作解剖整合優異組</td>
                <td style="padding: 10px;">張雅婷</td>
                <td style="padding: 10px;">PR 85-99</td>
                <td style="padding: 10px; color: #15803d;">挑戰進階臨床複審理學檢查，並擔任同儕小老師</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px; font-weight: 600;">學科概念待補強組</td>
                <td style="padding: 10px;">陳志豪</td>
                <td style="padding: 10px;">PR 5-25</td>
                <td style="padding: 10px; color: #dc2626;">啟動 PTY 改進閉環，一對一導師輔導並執行補考</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="report-section">
          <div class="report-section-title">⚠️ 重點輔導學員名單 (PR < 50)</div>
          <p style="margin-top: 6px; font-weight: 600; color: #b91c1c;">
            本期名單：${strugglingStudents.join("、 ")}。
          </p>
          <p style="font-size: 0.85rem; color: #4b5563; margin-top: 4px;">
            系統已針對此群組自動派發「基礎解剖起止點」與「下半身啟動阻力帶練習」客製化作業。
          </p>
        </div>
        
        <div class="report-section">
          <div class="report-section-title">📋 教師教學調整與輔導建議</div>
          <p style="margin-top: 6px;">
            1. **術科課程調整**：建議在下週的高爾夫團體術科課程中，保留 20 分鐘特別加強「下桿肩膀滯留、骨盆先行」的對比演練。<br>
            2. **學科概念複習**：部分學生在前拉試驗與斜角肌隘口機制的問答中語焉不詳，建議課堂上使用 3D VR 工具拆解斜角肌三角的三維解剖空間。
          </p>
        </div>
        
        <div class="report-footer">
          <span>班級分析管線執行ID: PL-20260704-09A</span>
          <span>主管審核簽署：__________________</span>
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// 7. AI 回饋精簡工具 (Layer 4)
function handleFeedbackCompress() {
  const inputEl = document.getElementById("feedback-input-text");
  if (!inputEl) return;
  
  const text = inputEl.value.trim();
  if (!text) return;
  
  logAudit("info", "啟動 AI Feedback 50字精簡管線...");
  
  // 模擬 LLM 50字壓縮 Prompt
  // Prompt 結構: "請將以下發散的評語，濃縮在50字內，精準點出弱點與最核心建議。"
  let compressed = "";
  if (text.length <= 50) {
    compressed = text;
  } else {
    // 根據內容進行模擬抽取
    if (text.includes("重心") || text.includes("下桿") || text.includes("肩膀")) {
      compressed = "弱點為下桿重心轉移順序顛倒、肩膀過早旋轉。建議進行骨盆獨立旋轉訓練與動力鏈重啟練習。";
    } else if (text.includes("解剖") || text.includes("骨") || text.includes("斜角肌")) {
      compressed = "弱點為骨科解剖止點與斜角肌間隙定位不精確。建議利用3D模型複習臂神經叢與隘口通道關係。";
    } else {
      compressed = text.substring(0, 45) + "...(經系統縮減，精準聚焦核心弱點)";
    }
  }
  
  // 嚴格確保在 50 字內
  if (compressed.length > 50) {
    compressed = compressed.substring(0, 47) + "...";
  }
  
  const resultTextEl = document.getElementById("compress-result-text");
  const countEl = document.getElementById("compress-char-count");
  
  if (resultTextEl && countEl) {
    resultTextEl.innerText = `「${compressed}」`;
    countEl.innerText = compressed.length;
    
    // 計算信賴星等
    let stars = 3;
    if (text.length > 80) stars = 5;
    else if (text.length > 40) stars = 4;
    
    const starsContainer = document.getElementById("compress-stars");
    if (starsContainer) {
      starsContainer.innerHTML = `<span class="star-rating">${"★".repeat(stars)}${"☆".repeat(5 - stars)}</span> (分析信賴度: ${stars}星)`;
    }
  }
  
  logAudit("success", `AI 回饋精簡成功。精簡後字數: ${compressed.length} 字。符合 <= 50 字限制標準。`);
}

// 8. SOP 即時資料管線與會議 (Layer 3 & 4)
function renderSOPPipeline() {
  const container = document.getElementById("sop-timeline-container");
  if (!container) return;
  
  const html = SYSTEM_DATA.sopTimeline.map((item, idx) => {
    const alignClass = idx % 2 === 0 ? "left" : "right";
    return `
      <div class="timeline-item ${alignClass}">
        <div class="timeline-content">
          <div class="timeline-phase">${item.phase}</div>
          <div class="timeline-title">${item.title} (${item.time})</div>
          <p class="timeline-desc">${item.action}</p>
          <ul class="timeline-checkpoints">
            ${item.checkpoints.map(cp => `<li>${cp}</li>`).join("")}
          </ul>
        </div>
      </div>
    `;
  }).join("");
  
  container.innerHTML = html;
}

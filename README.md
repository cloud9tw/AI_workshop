# MVP 評量與教學系統：系統分層與資料夾結構

本專案建立了一個 4 層級的實體資料夾結構與欄位標準，以下為各分層的說明：

## 目錄導覽
- **[layer1_subjects/](file:///c:/Users/cloud/Desktop/AI工作坊/layer1_subjects/)**: 第一層 - 學科內容與知識節點定義。
- **[layer2_quizzes/](file:///c:/Users/cloud/Desktop/AI工作坊/layer2_quizzes/)**: 第二層 - 題庫（包含量化與質性題型）及答題紀錄。
- **[layer3_learning_history/](file:///c:/Users/cloud/Desktop/AI工作坊/layer3_learning_history/)**: 第三層 - 學習歷程追蹤、分群模型與百分比落點。
- **[layer4_reports/](file:///c:/Users/cloud/Desktop/AI工作坊/layer4_reports/)**: 第四層 - 報告輸出（學生版/教師版）與 AI 稽核及信賴度。

---

## 欄位標準與規範
每個資料夾內皆包含一個 `schema.json`，作為資料整合的標準格式：
- [Layer 1 Schema (學科內容規範)](file:///c:/Users/cloud/Desktop/AI工作坊/layer1_subjects/schema.json)
- [Layer 2 Schema (測驗題庫規範)](file:///c:/Users/cloud/Desktop/AI工作坊/layer2_quizzes/schema.json)
- [Layer 3 Schema (歷程百分比規範)](file:///c:/Users/cloud/Desktop/AI工作坊/layer3_learning_history/schema.json)
- [Layer 4 Schema (報告輸出與稽核規範)](file:///c:/Users/cloud/Desktop/AI工作坊/layer4_reports/schema.json)

在根目錄中，我們提供了一個整合式的 **MVP 互動面板 (`index.html`)**，用以操作與展示此系統的完整流程。

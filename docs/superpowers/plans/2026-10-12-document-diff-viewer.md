# Document Diff Viewer with BBox Highlights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Split-Screen Document Diff Viewer allowing users to preview original vs green-revised specifications side-by-side with visual Bounding Box highlights, synchronized scrolling, and pre-download exports.

**Architecture:** A standalone React modal component (`DocumentDiffModal.jsx`) styled with dedicated CSS (`diff-viewer.css`). Integrated into the `Documents` tab and `DemoReview` workspace. Clauses are extracted from the active analysis round and matched to original requirements.

**Tech Stack:** React 18, Vite, CSS Grid/Flexbox, Lucide icons, Node 20.

## Global Constraints
- Node 20 runtime compatible.
- Thai primary interface with English headings.
- Clean paper sheet aesthetics with GreenSpec forest/emerald theme.
- All existing tests must pass with zero regressions.
- Do not commit or push to git without explicit user instruction.

---

### Task 1: Create `DocumentDiffModal.jsx` and `diff-viewer.css`

**Files:**
- Create: `frontend/src/DocumentDiffModal.jsx`
- Create: `frontend/src/diff-viewer.css`

**Interfaces:**
- Props: `{ isOpen, onClose, project, document, round, canEdit, onDownloadDocx }`
- Internal state: `activeBboxIndex`, `viewMode ('split' | 'single')`, `syncScroll (boolean)`

- [ ] **Step 1: Create `frontend/src/diff-viewer.css`**
Define styling for modal overlay, split paper sheets, BBox outlines with pulse effects, badges, chips, and responsive breakpoints.

- [ ] **Step 2: Create `frontend/src/DocumentDiffModal.jsx`**
Implement the component with:
- Top bar with stats (`🟢 3 จุดที่ปรับปรุง`, `📉 -32% CO₂`, `มอก. 2135 / ACI 207`)
- Quick jump chips for navigating to clauses
- Left pane with original requirements & amber BBoxes
- Right pane with revised specifications & emerald BBoxes
- Synchronized scroll implementation using `useRef` and scroll event listeners
- Pre-download action buttons (Export DOCX, Export JSON, Close)

---

### Task 2: Add Translations in `frontend/src/i18n.jsx`

**Files:**
- Modify: `frontend/src/i18n.jsx`

**Interfaces:**
- Translations for:
  - "Visual Diff Preview": "ดูตัวอย่าง & เปรียบเทียบ"
  - "Specification Diff Preview": "เปรียบเทียบเอกสารข้อกำหนด"
  - "Inspect Document Diff": "ตรวจสอบจุดแก้ไขในเอกสาร"
  - "Original Specification": "ข้อกำหนดเดิม"
  - "Green Revised Specification": "ข้อกำหนดฉบับปรับปรุงสีเขียว"
  - "Synchronized Scroll": "เลื่อนเอกสารพร้อมกัน"
  - "Revised Clauses": "จุดที่ปรับปรุง"

- [ ] **Step 1: Add new translation keys to `supplementalThai` in `frontend/src/i18n.jsx`**

---

### Task 3: Wire `DocumentDiffModal` into `main.jsx` and `DemoReview.jsx`

**Files:**
- Modify: `frontend/src/main.jsx`
- Modify: `frontend/src/DemoReview.jsx`

**Interfaces:**
- Consumes: `DocumentDiffModal` component
- Triggers modal opening from document cards in Documents tab and summary stage in DemoReview

- [ ] **Step 1: Add Diff Preview button to document cards in `frontend/src/main.jsx`**
In `Documents` component:
Add button:
```jsx
<button type="button" className="secondary" onClick={() => setDiffDoc(doc)}>
  <Eye size={15} />
  {t("Visual Diff Preview")}
</button>
```
And render `<DocumentDiffModal isOpen={Boolean(diffDoc)} document={diffDoc} project={project} round={demoRound} onClose={() => setDiffDoc(null)} />`.

- [ ] **Step 2: Add Diff Inspection button to `frontend/src/DemoReview.jsx`**
In the summary/toolbar section, add button:
```jsx
<button type="button" className="secondary" onClick={() => setShowDiffModal(true)}>
  <FileText size={15} />
  {t("Inspect Document Diff")}
</button>
```

---

### Task 4: Build, Test & Verification

**Files:**
- Test: `tests/api_server.test.mjs`, `shared/*.test.mjs`, `backend/tests/*.mjs`

- [ ] **Step 1: Run all test suites**
Run: `export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin; npm test && npm run test:api && npm run test:backend`

- [ ] **Step 2: Run build**
Run: `export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin; npm run build`
Verify exit code 0.

- [ ] **Step 3: Verify modal in browser**
Check that clicking "ดูตัวอย่าง & เปรียบเทียบ" opens the split-screen modal cleanly and synchronized scroll works.

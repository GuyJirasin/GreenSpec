# GREEN SPEC — คู่มือ implementation ใหม่

> Paths and commands in this document are relative to the repository root (GreenSpec/), unless stated otherwise. This document is stored in agents/.

> อัปเดต 2026-10-10: เชื่อม Supabase cloud และทดสอบการล็อกอิน/Storage/Edge จริงแล้ว ดู agents/CLOUD_SETUP.md สำหรับสถานะปัจจุบันและการสร้างบัญชีแอป ส่วนขั้นตอน local ด้านล่างยังใช้เมื่อเลือก Docker local

สร้างตาม Frozen PRD v1 ใน `../document` โดยเอกสารต้นทางและไฟล์เดิมของ repository เป็น read-only การเปลี่ยนแปลงเดิมเพียงรายการเดียวคือการลบ `demo/` ตามคำสั่ง

## สิ่งที่ส่งมอบ

- `frontend/`: React/Vite ภาษาไทย ธีมขาว เขียวเข้ม มิ้นต์; landing/auth/projects/documents/review/revision/execution/members/notifications
- `backend/`: Supabase local config, PostgreSQL migrations, RLS และ checked transactional RPCs; Edge Functions สำหรับ analysis/upload/revision
- `shared/`: canonical schema, source/checksum validation, controlled DOCX fixtures, deterministic simulation, targeted revision และ domain tests
- `qa/`: PostgreSQL integration tests, browser tests, ภาพหน้าจอ และตัวตรวจว่าไฟล์เดิมยังเหมือนต้นฉบับ

การวิเคราะห์ใช้ **simulation จาก fixture ที่เลือกอย่างชัดเจน** เท่านั้น ไฟล์ทั่วไปเก็บ/เปิดได้ แต่ยังไม่ถูกวิเคราะห์หรือเขียนใหม่โดย AI ไม่มี live provider และไม่มี supplier recommendation engine

Feature 1 จบได้ด้วย immutable finalized decisions และ JSON/CSV export การสร้าง DOCX และส่งเข้า PM เป็นทางเลือกแยกกัน PM รับเฉพาะ finalized approved items ผ่าน explicit handoff แล้วติดตาม tasks, milestones, procurement, delivery, installation, issues, evidence, verification, actual cost/carbon และ activity

## เปิดดู frontend ได้ทันที

ต้องใช้ Node.js 22.18+ จากโฟลเดอร์ repository:

```powershell
cd frontend
npm ci
npm run dev
```

เปิด `http://127.0.0.1:5173` เมื่อยังไม่ได้ตั้งค่า backend จะเปิด landing ได้และแสดงข้อจำกัดการเชื่อมต่อ การเข้าสู่ระบบและการบันทึกต้องใช้ Supabase จริง ไม่มี localStorage workflow fallback

## ต่อ Supabase local เมื่อเครื่องพร้อม

เครื่องนี้ยังไม่มี Docker ที่พร้อมใช้ และผู้ใช้ให้เตรียมโค้ด/คู่มือโดย **ไม่ติดตั้ง Docker** ขั้นตอนต่อไปนี้จึงยังไม่ได้รันจริง

เมื่อมี Docker Desktop และ engine ทำงานแล้ว เปิด terminal จาก `backend/`:

```powershell
npm ci
npm run start
npx supabase status
npm run functions
```

`npm run functions` จะ sync canonical shared modules เข้าสู่ `_shared/domain` ที่ runtime mount อ่านได้ก่อน serve ภายใน repository นั้น หากต้องเริ่มฐานข้อมูล local นี้ใหม่และยอมให้ข้อมูล local ถูกล้าง ใช้ `npm run reset` เฉพาะ local project นี้

เปิด terminal อีกหน้าหนึ่ง จาก `frontend/`:

```powershell
Copy-Item .env.example .env.local
```

แก้ `.env.local`: `VITE_SUPABASE_URL=http://127.0.0.1:54321` และ `VITE_SUPABASE_ANON_KEY` เป็น publishable/anon client key ที่ local CLI แสดง **ห้ามใช้ service-role/secret key ใน frontend** จากนั้น `npm run dev`

เพิ่ม `VITE_CONTACT_EMAIL` เป็นอีเมลติดต่อจริงของทีมได้ หากยังไม่กำหนด landing จะระบุว่ายังไม่ได้ตั้งค่าช่องทางติดต่อ ไม่มีการส่งอีเมลอัตโนมัติ

Local endpoints:

| ส่วน | URL / port |
|---|---|
| Frontend | http://127.0.0.1:5173 |
| API | http://127.0.0.1:54321 |
| PostgreSQL | 54322 |
| Supabase Studio | http://127.0.0.1:54323 |
| Email confirmation/reset inbox | http://127.0.0.1:54324 |

สมัครบัญชีจาก UI แล้วเปิด verification link ใน local inbox ก่อนเข้าสู่ระบบ ให้ owner เพิ่มสมาชิกด้วยอีเมลตรงกับบัญชีที่สมัครแล้ว ไม่มีระบบส่ง invitation

## ทดสอบซ้ำ

ติดตั้ง dependencies ในโฟลเดอร์ใหม่ `frontend/`, `shared/`, `qa/`, `backend/` ด้วย `npm ci` ก่อน จาก root:

```powershell
.\TEST_IMPLEMENTATION.ps1
```

Browser tests ใช้ Chrome ที่ติดตั้งในเครื่อง ค่าเริ่มต้น `C:/Program Files/Google/Chrome/Application/chrome.exe`; ใช้ `PLAYWRIGHT_EXECUTABLE_PATH` หาก executable อยู่ตำแหน่งอื่น ชุด browser ใช้ controlled test API เพื่อทดสอบ UI เท่านั้น ไม่ได้เป็นโหมด mock ในแอป

ผลและรายละเอียดขอบเขตการตรวจอยู่ใน `qa/ACCEPTANCE_REPORT.md` และ `agents/IMPLEMENTATION_WORK_LOG.md` หลัง local Supabase พร้อม ต้องทำรายการ live integration ใน `backend/INTEGRATION_CHECKLIST.md` ด้วย

## สถานะที่ต้องทราบ

โค้ด frontend/backend และการทดสอบที่ทำได้โดยไม่ใช้ Docker ส่งมอบแล้ว แต่ยังไม่รับรอง release gate AC01–AC34 บน Supabase runtime จริง ยังไม่ได้ตรวจ Auth email/session lifecycle, การถ่ายโอน object จริง, Edge runtime, scheduled cron หรือ browser journey ต่อบริการ local ทั้งชุด ไม่มี deployment/cloud resource ที่สร้างในงานนี้

DOCX fixtures/revision ผ่านการตรวจ archive/XML/ข้อความ/ตำแหน่งและ hash แต่ยังไม่มี visual rendering ของ Word เพราะไม่พบ LibreOffice renderer ผลคาร์บอนจริงไม่ถูกเปรียบเป็นการลดคาร์บอนเมื่อยังไม่ได้ยืนยันฐานวิธีคำนวณที่เทียบกันได้


# GREEN SPEC — Supabase cloud connection

> Paths and commands in this document are relative to the repository root (GreenSpec/), unless stated otherwise. This document is stored in agents/.

Configured and verified: 2026-10-10 (Asia/Bangkok).

Project: `GreenSpec` / `fegwjlytecobdaeqhbdf`.
Frontend: http://127.0.0.1:5173/
Backend: https://fegwjlytecobdaeqhbdf.supabase.co

## การใช้งานของคุณ

1. รีเฟรชหน้าเว็บ แล้วเลือกเข้าสู่ระบบ → สร้างบัญชีใหม่
2. สร้างบัญชี GREEN SPEC ด้วยอีเมลและรหัสผ่านที่คุณเลือก บัญชีแอปนี้แยกจากบัญชี Supabase Dashboard
3. สมัครแล้วเข้าใช้งานได้ทันที ไม่ต้องยืนยันอีเมล ตามคำสั่งสำหรับ MVP วันที่ 2026-10-10
4. สร้างโครงการใหม่ แล้วเลือกชุดเอกสาร fixture อย่างชัดเจนหากต้องการทดสอบการวิเคราะห์ การวิเคราะห์ยังเป็น simulation; ไฟล์ทั่วไปยังไม่มี live AI อ่านหรือแก้ไข

การสมัคร MVP นี้ไม่ส่งอีเมลยืนยัน ส่วนฟังก์ชันลืมรหัสผ่านยังต้องใช้บริการส่งอีเมล: SMTP เริ่มต้นจำกัดผู้รับไว้ที่สมาชิกทีมและมี rate limit ดู https://supabase.com/docs/guides/auth/auth-smtp

## การตั้งค่าที่ทำแล้ว

- `frontend/.env.local`: URL และ publishable client key; ignored by Git. ไม่มี server key ใน frontend
- ฐานข้อมูล: migrations 202610090001–202610090009 ลงครบ รวม RLS, checked RPCs, private Storage buckets และตัวตั้งเวลา notification
- Edge Functions: `document`, `analyze`, `revision` ACTIVE; platform JWT verification เปิดอยู่ และ handler ตรวจ Auth/membership อีกชั้น
- Auth Site URL: `http://127.0.0.1:5173`
- Auth redirects: `http://127.0.0.1:5173/**` และ `http://localhost:5173/**`
- ปิด email confirmation สำหรับ MVP ตามคำสั่งล่าสุดของผู้ใช้ ไม่แก้ provider, SMTP, MFA หรือค่าที่ cloud config ไม่ได้ประกาศ
- `backend/cloud-config/supabase/config.toml` เป็น config จำกัดเฉพาะ URL/Auth confirmation สำหรับ cloud; local config เดิมอยู่ `backend/supabase/config.toml`

## หลักฐานตรวจจริง

`qa/cloud-verification.log` บันทึกการรันทดสอบสำเร็จบน cloud จริง:

- Auth password login ด้วย publishable key
- checked project creation, anonymous RLS denial และ direct write denial
- document Edge runtime, เก็บ/ดาวน์โหลด DOCX private จริง, SHA256 ตรงต้นฉบับ และ anonymous download denial
- analyze background job, persisted results, reviews, finalization และ approved-only handoff
- revision Edge runtime สร้าง output แยก
- frontend ใน Chrome ล็อกอินและแสดงโครงการจาก cloud จริง โดยไม่มี test API interception
- เก็บโครงการสังเคราะห์ [QA] ถาวรและ soft-delete บัญชีทดสอบแล้ว ไม่ส่งอีเมลทดสอบ ข้อมูล source/audit ของโครงการทดสอบเก็บไว้ตามระบบ immutable

บัญชีทดสอบไม่ได้เป็นบัญชีใช้งานของคุณ และไม่อยู่ใน session ของเบราว์เซอร์ที่คุณเปิดอยู่

ชุดตรวจนี้เป็น smoke test สำหรับการเชื่อมต่อ ไม่ใช่ release acceptance ทุกข้อ ยังไม่ได้ทดสอบส่งอีเมลยืนยัน/reset จริง, session expiry, ทุก role ผ่าน browser, cron firing และทุก execution workflow บน cloud ทั้งชุด ผล domain/SQL/browser เดิมอยู่ `qa/ACCEPTANCE_REPORT.md`; ข้อความ local/Docker ในรายงานนั้นเป็นสถานะ ณ วันตรวจเดิม ไม่ใช่สถานะ cloud ปัจจุบัน

## เริ่ม frontend ใหม่

```powershell
cd C:\Users\Jirasin\Downloads\EGAT\GreenSpec\frontend
npm run dev
```

เปิด http://127.0.0.1:5173/ ไม่ต้องรัน Docker เพื่อใช้ cloud project นี้

## ทดสอบ cloud ซ้ำ

`qa/cloud-smoke.mjs` สร้างบัญชีสังเคราะห์ที่ยืนยันโดย admin (ไม่ส่งอีเมล), สร้างโครงการและ source/audit จริง, จากนั้น archive โครงการและ soft-delete บัญชี จึงต้องใช้เฉพาะ project ที่อนุญาตให้ทดสอบจริง CLI ต้อง login/link อยู่ และ frontend ต้องเปิดอยู่ การรับ server key ผ่าน CLI อยู่ในหน่วยความจำเท่านั้น ไม่พิมพ์หรือเขียน key ลง log/file

```powershell
cd C:\Users\Jirasin\Downloads\EGAT\GreenSpec
node qa/cloud-smoke.mjs
```

หากการรันถูกขัดจังหวะ ใช้ `node qa/cloud-smoke.mjs --cleanup-only` เพื่อเก็บกวาดเฉพาะบัญชีสังเคราะห์ที่มี purpose `disposable-cloud-smoke` และโครงการชื่อ `[QA] Cloud connection verification` ของบัญชีเหล่านั้น


## Feature 1 redesign rollout — 2026-10-10

Migration 202610100010_feature1_options.sql and updated analyze/revision functions are deployed to the linked project. A/B alternatives and edited wording now persist to the cloud; every recommendation must be reviewed before finalize. Finalized B choices and Thai edited DOCX output passed the real cloud test, including frontend password login. See qa/feature1-cloud-verification.log and agents/FEATURE1_REDESIGN.md. The synthetic test account was closed and its project archived without sending email. Earlier finalized history is retained. Analysis still uses controlled sample files and estimates.

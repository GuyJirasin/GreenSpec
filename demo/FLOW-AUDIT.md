# Feature 1 — ผลเทียบ User Flow และการแก้ไข

อ้างอิง user flow ที่แนบมาเมื่อ 8 ตุลาคม 2026 โดยคงสี forest / mint, sidebar, cards, typography และปุ่มเดิม ใช้ mock data เท่านั้น

| ขั้นตอน / กฎ | ช่องว่างเดิม | การแก้ไข |
|---|---|---|
| Create Project | บังคับ location และ area | บังคับเฉพาะชื่อ; description และ metadata ที่เหลือ optional ตามคำขอล่าสุด |
| Upload | ประเภท specification ไม่แยก | เพิ่ม Material / Technical Specification; ตามคำขอเพิ่มเติมนำปุ่ม Replace ออก ใช้ Remove และเพิ่มไฟล์ใหม่ |
| Processing → Review | พาไป overview แทน review | สำเร็จแล้วไป Recommendations; overview/hotspots ยังดูได้; ป้องกันการออกผ่าน navigation ระหว่าง processing และมี Cancel |
| Review / traceability | แหล่งเอกสารอยู่ detail; feedback มีเฉพาะ reject | แสดง original + file/page/section ใน list/detail และเพิ่ม Comment / Request adjustment |
| Decision locking | เปลี่ยนการตัดสินใจซ้ำได้ทันที | ล็อกทุกครั้งที่ approve/reject; ต้อง Unlock ก่อนแก้; เปิดแก้ reject โหลดเหตุผลเดิม; approve ล้างเหตุผล reject ปัจจุบัน; รอบใหม่ regenerate rejected ได้ แต่รักษา approved locks; finalized revision อ่านอย่างเดียว |
| Option consistency | Detail แสดง wording B แต่ impact A | Detail ใช้ option ที่เลือกทั้งข้อความและค่า CO₂/cost; เพิ่มเปอร์เซ็นต์ต้นทุน |
| Revision checkpoint | ไม่มี approved/rejected/unresolved decision checkpoint | เพิ่ม Revision Summary พร้อม counts, accepted/rejected/unresolved lists, CO₂/cost และเปอร์เซ็นต์; ยอมรับ unresolved โดยรับทราบอย่างชัดเจน |
| Iteration loop | ไม่มี request another revision หรือ feedback ระดับรอบ | เพิ่ม feedback form → processing → recommendations; รวม item feedback, reject reasons, round feedback; regenerate เฉพาะรายการที่ไม่ได้ล็อก |
| History | ไม่มีประวัติ; refresh ทำให้ข้อมูลหาย | เก็บ snapshots แต่ละรอบเป็น read-only พร้อม decisions, feedback, wording, references และ impact; เก็บ current project ใน localStorage |
| Optional document | บังคับผ่านหน้า revised spec ก่อน finalize | Accept Revision → เลือก Generate หรือ Finish without document; ทั้งคู่เก็บ approved change set |
| Final success | มี summary และ submit แต่ไม่มี completion/handoff | เพิ่ม completion พร้อม revision number, impact, download ตาม document choice, final summary, dashboard และ local Project Management handoff |
| Cost increase | รองรับในบางหน้า แต่ detail ผิดเมื่อใช้ B | รักษา signed impact ทั้ง summary, detail, export, history; แยก saving/additional spending |
| Empty / error / retry | มีบาง states แต่ยังไม่ครบ flow ใหม่ | รองรับ zero-change finalization, unresolved acknowledgment, locked/finalized controls, no document, history empty, upload validation และ existing failed/missing/none scenarios |

## ข้อจำกัดของ demo

- ไฟล์ที่อัปโหลดใช้เฉพาะ metadata ไม่อ่านเนื้อหา; original excerpts และแหล่งอ้างอิงเป็นข้อมูลตัวอย่างที่ระบุไว้ใน UI
- Regeneration เป็น deterministic mock: feedback เลือกแนวทางต้นทุน/คาร์บอนและแสดงบริบทการปรับ ไม่รับประกันข้อจำกัดตาม free text เช่น budget 2% หรือ supplier availability
- ตัวเลขเป็น estimates, sample compliance ไม่ใช่ verified fact และทางเลือกที่ต้องตรวจยังใช้ human-review acknowledgment; critical failed checks ยังคงบล็อก approval
- Generate สร้าง `.txt` ของข้อเปลี่ยนแปลงตัวอย่าง ไม่ใช่แก้เอกสารต้นฉบับ PDF/DOCX; approved change set ใน JSON มี original, replacement, reason, cost, carbon และ reference แม้ไม่สร้างเอกสาร
- เก็บหนึ่ง current project ใน browser; New analysis / Reset demo เริ่มชุดใหม่ ดาวน์โหลด JSON เพื่อเก็บประวัติพกพาได้ ไม่มี backend, account sync หรือ JSON import
- Project Management เป็นหน้าส่งต่องานใน demo ไม่มีบริการภายนอกเชื่อมต่อ

## การตรวจสอบ

Unit tests ตรวจ lock preservation, explicit unlock, feedback combination, snapshot independence, impact calculation, cost increase, optional output, acceptance rules และ file validation

Browser tests ตรวจ create/upload/review, approve/unlock/Option B, iteration/history/refresh, optional document/download, compliance review, failed/missing/no recommendations, upload validation และ mobile overflow

ผลตรวจล่าสุด: production build ผ่าน, unit tests 10 กรณีผ่าน และ browser tests 12 กรณีผ่าน รวมถึงการสร้างโครงการโดยไม่กรอก description, Reject/Unlock, โหลดเหตุผลเดิม, ล้างเหตุผลหลัง Approve, migration สถานะเดิม และ regenerate rejected items โดยรักษา approved locks ตรวจภาพ Revision Summary, feedback dialog, document choice และ final impact ทั้ง desktop/mobile ในรอบก่อนแล้ว

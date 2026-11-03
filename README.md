# Agency Experience Team Hub

ระบบกลางสำหรับวางแผนและติดตามงานของทีม Agency Experience — **บันทึกงานครั้งเดียว ดูได้หลายมุม**
(Dashboard · Offsite & Event Support log · Major Event Calendar · Project/Squad · Gantt · Kanban · My To-Do · AI Meeting Hub (ปิดไว้ชั่วคราว — เปิดได้ที่ `FEATURES.meetings` ใน js/app.js) · ทีมและสิทธิ์)

## เริ่มใช้งาน
```bash
node server.js        # เปิด http://localhost:3000 — ข้อมูลใช้ร่วมกันทั้งทีม (เก็บใน data/state.json)
```
หรือเปิด `index.html` / host เป็น static site ก็ได้ — ข้อมูลจะเก็บในเบราว์เซอร์เครื่องนั้นเท่านั้น (ไม่แชร์ข้ามคน)

## Deploy บน Vercel (GitHub → Vercel)
1. Merge branch นี้เข้า `main` ของ repo แล้ว Import repo ใน Vercel (Framework: **Other**, ไม่ต้องมี Build Command, Output = root)
2. ใน Vercel โปรเจกต์ → **Storage → Create / Marketplace → Upstash Redis** → เชื่อมกับโปรเจกต์ (ระบบใส่ `KV_REST_API_URL` และ `KV_REST_API_TOKEN` ให้อัตโนมัติ)
3. (แนะนำ) ตั้ง Environment Variable `HUB_DEFAULT_PASSWORD` = รหัสเริ่มต้นของทุกคน (ถ้าไม่ตั้ง ระบบสร้างให้และแสดงครั้งเดียวบนหน้า Login ของคนแรกที่เปิด)
4. Redeploy → เปิดเว็บ → เข้าเป็น **Kaeng (Admin)** → Team & Access → เปลี่ยนรหัสเริ่มต้น/ตั้งรหัสรายบุคคล และตั้งสายบังคับบัญชา
- ไฟล์แนบในโหมดนี้จำกัด 300 KB/ไฟล์ (ไฟล์ใหญ่ให้ใส่ Link) · แอปตรวจข้อมูลใหม่ทุก 60 วินาทีเฉพาะตอนเปิดหน้าไว้ เพื่อประหยัดโควตาฐานข้อมูล
- ทดสอบในเครื่องโดยไม่ใช้ Vercel: `node server.js` (เก็บข้อมูลใน `data/`)

## การเข้าสู่ระบบ
- เลือกชื่อ + ใส่รหัสผ่าน · Admin ตั้งรหัสเริ่มต้น/รายบุคคลที่ Team & Access · สมาชิกเปลี่ยนรหัสเองที่ “บัญชีของฉัน” · Admin เห็นรหัสของทุกคน (ตั้งใจให้เป็นแบบนี้ เพื่อช่วยคนลืมรหัส)
- `node server.js` = ล็อกอินจริง (เซิร์ฟเวอร์ตรวจ token ทุก request, เก็บรหัสใน `data/auth.json` แบบ plain text — ต้องเก็บโฟลเดอร์ data เป็นความลับและใช้ HTTPS) · รหัสเริ่มต้นแสดงใน terminal ตอนเปิดเซิร์ฟเวอร์ครั้งแรก
- เปิดเป็น static (เช่น Vercel/GitHub Pages) = โหมดสาธิต: ข้อมูลและรหัสอยู่ในเบราว์เซอร์ของแต่ละคน ไม่แชร์และไม่ปลอดภัยจริง

## หมายเหตุสำคัญ
- **ผู้ใช้/สิทธิ์เป็นโหมดสาธิต** (เลือกชื่อเอง) — ใช้งานจริงควรใส่ระบบล็อกอิน (SSO) หน้า server
- Sync เป็นแบบ whole-state, last-write-wins — เหมาะกับทีมเล็ก ไม่ใช่ฐานข้อมูลหลายผู้ใช้เต็มรูปแบบ
- **AI Meeting Hub** ใช้กฎอ่านข้อความในเครื่อง (`analyzeMeeting` ใน `js/views-c.js`) — ไฟล์เสียงและรูป Post-it ถูกแนบแต่ยังไม่ถอดความอัตโนมัติ; เปลี่ยนฟังก์ชันนี้ไปเรียก AI/Speech-to-text ได้ ผลลัพธ์เป็นฉบับร่างที่ต้องตรวจก่อนสร้าง Task เสมอ
- Export: Excel = ไฟล์ CSV, PDF = ปุ่ม “พิมพ์ / PDF”
- ไฟล์แนบเก็บในข้อมูลโดยตรง (≤ 1 MB/ไฟล์) — ไฟล์ใหญ่ให้ใส่เป็น Link
- วันหยุดบริษัทตัวอย่างปรับได้ที่ ทีมและการตั้งค่า (Admin)

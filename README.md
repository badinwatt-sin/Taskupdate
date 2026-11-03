# Agency Experience Team Hub

ระบบกลางสำหรับวางแผนและติดตามงานของทีม Agency Experience — **บันทึกงานครั้งเดียว ดูได้หลายมุม**
(Dashboard · Event & RAM Support Tracker · Major Event Calendar · Project/Squad · Gantt · Kanban · My To-Do · AI Meeting Hub · ทีมและสิทธิ์)

## เริ่มใช้งาน
```bash
node server.js        # เปิด http://localhost:3000 — ข้อมูลใช้ร่วมกันทั้งทีม (เก็บใน data/state.json)
```
หรือเปิด `index.html` / host เป็น static site ก็ได้ — ข้อมูลจะเก็บในเบราว์เซอร์เครื่องนั้นเท่านั้น (ไม่แชร์ข้ามคน)

## หมายเหตุสำคัญ
- **ผู้ใช้/สิทธิ์เป็นโหมดสาธิต** (เลือกชื่อเอง) — ใช้งานจริงควรใส่ระบบล็อกอิน (SSO) หน้า server
- Sync เป็นแบบ whole-state, last-write-wins — เหมาะกับทีมเล็ก ไม่ใช่ฐานข้อมูลหลายผู้ใช้เต็มรูปแบบ
- **AI Meeting Hub** ใช้กฎอ่านข้อความในเครื่อง (`analyzeMeeting` ใน `js/views-c.js`) — ไฟล์เสียงและรูป Post-it ถูกแนบแต่ยังไม่ถอดความอัตโนมัติ; เปลี่ยนฟังก์ชันนี้ไปเรียก AI/Speech-to-text ได้ ผลลัพธ์เป็นฉบับร่างที่ต้องตรวจก่อนสร้าง Task เสมอ
- Export: Excel = ไฟล์ CSV, PDF = ปุ่ม “พิมพ์ / PDF”
- ไฟล์แนบเก็บในข้อมูลโดยตรง (≤ 1 MB/ไฟล์) — ไฟล์ใหญ่ให้ใส่เป็น Link
- วันหยุดบริษัทตัวอย่างปรับได้ที่ ทีมและการตั้งค่า (Admin)

'use strict';
/* ============================================================
   One vocabulary for the whole app.
   Menu names, page titles, the phone tab bar, "More" sheet, quick-create,
   search and breadcrumbs all read from here — change a name once, it changes everywhere.
   Pattern: short English name + Thai gloss underneath.
   ============================================================ */
const PAGE = {   // route: [name, Thai gloss, icon]
  dashboard: ['Home', 'ภาพรวมของคุณและทีม', 'home'],
  todo: ['My Plan', 'แผนงานรายสัปดาห์ของฉัน', 'check'],
  projects: ['Projects', 'โครงการและ Squad', 'folder'],
  calendar: ['Calendar', 'Events และวันหยุด', 'calendar'],
  board: ['Board', 'Gantt และ Kanban ทุก Project', 'board'],
  support: ['Offsite', 'งานนอกสถานที่ / สนับสนุน Event', 'inbox'],
  hub: ['Hub Post', 'โพสต์และข้อความในทีม', 'chat'],
  'pr-master': ['PR Master', 'สร้างโปสเตอร์จากบรีฟและรูปบุคคล', 'sparkles'],
  poster: ['Poster', 'สร้างสื่อตาม CI องค์กร', 'image'],
  team: ['Team', 'ทีม สิทธิ์ และการตั้งค่า', 'users'],
  weekly: ['Weekly Update', 'AI สรุปงานทีมสำหรับผู้บริหาร', 'chart'],
  meetings: ['Meetings', 'สรุปประชุมและ Action Items', 'mic'],
};
const MENU_ORDER = ['dashboard', 'todo', 'projects', 'calendar', 'board', 'support', 'hub', 'weekly', 'pr-master', 'poster', 'team'];   // sidebar order
const TAB_ROUTES = ['dashboard', 'todo', 'projects', 'calendar'];                                 // phone tab bar (+ "More")
const ADMIN_ONLY = ['team', 'poster', 'pr-master', 'weekly'];   // pages only Admin can see or open
const pageName = k => PAGE[k]?.[0] || k;

/* actions: same words on buttons, quick-create and sheets  [title, Thai gloss] */
const ACTION = {
  newTask: ['Add to My Plan', 'เพิ่มงานในแผนของฉัน'],
  projectTask: ['Project Task', 'เพิ่มงานในตาราง Project'],
  assign: ['Assign Task', 'มอบหมายงานให้คนในทีม'],
  logOffsite: ['Log Offsite', 'บันทึกการไปปฏิบัติงานนอกสถานที่'],
  newEvent: ['Events', 'เพิ่มงานสำคัญในปฏิทิน'],
  newProject: ['New Project', 'สร้าง Project และจัด Squad'],
  more: ['More', 'เมนูทั้งหมด'],
  account: ['Account', 'โปรไฟล์ · รหัสผ่าน · ออกจากระบบ'],
  search: ['Search', 'งาน Project Event Offsite โพสต์ สมาชิก'],
  theme: ['Theme', 'สว่าง มืด หรืออัตโนมัติ'],
  style: ['Post-it & Icon', 'สีและไอคอนประจำตัว'],
};

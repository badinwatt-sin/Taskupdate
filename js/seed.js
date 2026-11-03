'use strict';
/* Demo data — dates are relative to "today" so the app always looks alive. */
function seed() {
  const m_ = n => 'm_' + n;
  const T = today(), D = n => addDays(T, n);
  const groups = [
    { id: 'lead', name: 'Leadership', short: 'Lead', color: '#334155' },
    { id: 'prime', name: 'Professional / Prime', short: 'Prime', color: '#4f46e5' },
    { id: 'event', name: 'Event Management', short: 'Event', color: '#0891b2' },
    { id: 'creative', name: 'Creative & Production', short: 'Creative', color: '#db2777' },
    { id: 'multimedia', name: 'Multimedia / RAM & Project Support', short: 'Multimedia', color: '#d97706' },
    { id: 'comm', name: 'Communication', short: 'Communication', color: '#059669' },
  ];
  const resp = {
    lead: 'ดูภาพรวมทีม จัดสรรงาน ติดตามผลและอนุมัติแผน',
    prime: 'วางกลยุทธ์ คอนเซปต์ และดูแลงานระดับ Professional',
    event: 'บริหารจัดการงานอีเวนต์ สถานที่ โปรแกรม และหน้างาน',
    creative: 'ออกแบบ Key Visual สื่อและงานผลิต',
    multimedia: 'ถ่ายทำ/ตัดต่อ และสนับสนุนงานจาก RAM และ Project',
    comm: 'วางแผนและผลิตเนื้อหาการสื่อสารของทีม',
  };
  const pos = { prime: 'Professional / Prime', event: 'Event Management', creative: 'Creative & Production', multimedia: 'Multimedia / RAM & Project Support', comm: 'Communication' };
  const mk = (n, g, role = 'member', alias = '', position) => ({ id: 'm_' + n.toLowerCase(), name: n, alias, position: position || pos[g], group: g, role, resp: resp[g] });
  const members = [
    mk('Kaeng', 'lead', 'admin', 'เก่ง', 'Head of Agency Experience'),
    mk('Jariya', 'prime'), mk('Praphatsorn', 'prime'), mk('Sudarat', 'prime'),
    mk('Noravat', 'event'), mk('Butsaya', 'event'), mk('Patcharanan', 'event'),
    mk('Phirat', 'creative'), mk('Nitikun', 'creative'), mk('Tananchai', 'creative'),
    mk('Pitcha', 'multimedia'), mk('Jadesalit', 'multimedia'), mk('Thanapon', 'multimedia'),
    mk('Chayada', 'comm'),
  ];
  const boss = { jariya: 'kaeng', noravat: 'kaeng', phirat: 'kaeng', pitcha: 'kaeng', chayada: 'kaeng', praphatsorn: 'jariya', sudarat: 'jariya', butsaya: 'noravat', patcharanan: 'noravat', nitikun: 'phirat', tananchai: 'phirat', jadesalit: 'pitcha', thanapon: 'pitcha' };
  members.forEach(mm => { const b = boss[mm.id.slice(2)]; if (b) mm.managerId = 'm_' + b; });
  const settings = {
    dayMode: 'working', weekend: [0, 6],
    usePublicHolidays: true, eventEditors: [m_('noravat'), m_('butsaya')],
    holidays: [{ date: '2026-11-20', name: 'วันหยุดพิเศษของบริษัท (ตัวอย่าง)' }],
    types: ['Event', 'Creative', 'Multimedia', 'Communication', 'Prime / Strategy', 'Admin / อื่นๆ'],
  };
  const m = n => 'm_' + n;
  const tasks = [];
  const base = o => ({ id: uid('t_'), title: '', desc: '', projectId: null, assigneeId: null, start: T, duration: 1, priority: 'med', status: 'todo', deps: [], links: [], files: [], source: 'project', type: '', private: false, createdBy: m('kaeng'), doneAt: null, ...o });

  /* Projects */
  const projects = [
    { id: 'p_ye', name: 'Customer Appreciation Night 2026', pmId: m('noravat'), dayMode: null, start: D(-14), color: '#0891b2',
      goal: 'จัดงานขอบคุณลูกค้าและพาร์ตเนอร์ประจำปี ผู้เข้าร่วม 300 คน สร้างประสบการณ์ที่จดจำและเก็บ Feedback ≥ 4.5/5',
      squad: ['noravat', 'butsaya', 'phirat', 'nitikun', 'jadesalit', 'chayada', 'jariya', 'tananchai'].map(m) },
    { id: 'p_kit', name: 'Agency Experience Toolkit', pmId: m('jariya'), dayMode: null, start: D(-20), color: '#4f46e5',
      goal: 'รวบรวม Template และ Guideline กลางให้ทุกหน้าที่ใช้ทำงานได้เร็วและเป็นมาตรฐานเดียวกัน',
      squad: ['jariya', 'praphatsorn', 'sudarat', 'tananchai', 'chayada', 'butsaya'].map(m) },
    { id: 'p_rs', name: 'RAM Roadshow Q1 2027', pmId: m('pitcha'), dayMode: 'calendar', start: D(-7), color: '#d97706',
      goal: 'จัด Roadshow ให้ RAM ทุกภาค พร้อมชุดสื่อกลาง นับระยะเวลาเป็นวันปฏิทิน (รวมเสาร์–อาทิตย์)',
      squad: ['pitcha', 'jadesalit', 'thanapon', 'patcharanan', 'nitikun', 'chayada'].map(m) },
  ];
  const P = (pid, key, title, who, s, dur, st, deps, type, prio = 'med') => {
    tasks.push(base({ id: pid + '_' + key, projectId: 'p_' + pid, title, assigneeId: m(who), start: D(s), duration: dur, status: st, deps: deps.map(d => pid + '_' + d), type, priority: prio, doneAt: st === 'done' ? D(s + dur) : null }));
  };
  P('ye', 1, 'กำหนดคอนเซปต์และ Key Message', 'jariya', -14, 3, 'done', [], 'Prime / Strategy', 'high');
  P('ye', 2, 'ยืนยันสถานที่และงบประมาณ', 'noravat', -11, 4, 'done', [1], 'Event', 'high');
  P('ye', 3, 'ออกแบบ Key Visual และ Backdrop', 'phirat', -12, 7, 'doing', [1], 'Creative', 'high');
  P('ye', 4, 'วางโปรแกรมและ Run-down', 'butsaya', -6, 6, 'doing', [2], 'Event');
  P('ye', 5, 'ถ่ายทำวิดีโอ Teaser', 'jadesalit', 0, 4, 'todo', [3], 'Multimedia');
  P('ye', 6, 'ออกแบบ Invitation + Social Kit', 'nitikun', 1, 5, 'todo', [3], 'Creative');
  P('ye', 7, 'เปิดรับลงทะเบียน (RSVP)', 'chayada', 3, 10, 'todo', [6], 'Communication');
  P('ye', 8, 'ประสานผู้ผลิต เวที แสง เสียง', 'tananchai', 3, 8, 'todo', [2], 'Creative');
  P('ye', 9, 'ซ้อมใหญ่ (Rehearsal)', 'butsaya', 21, 2, 'todo', [4, 8], 'Event', 'high');
  P('ye', 10, 'วันงาน Customer Appreciation Night', 'noravat', 24, 1, 'todo', [9], 'Event', 'high');
  P('ye', 11, 'สรุปผลและ Post-event Report', 'jariya', 25, 5, 'todo', [10], 'Prime / Strategy');

  P('kit', 1, 'รวบรวม Requirement จากทุกหน้าที่', 'praphatsorn', -20, 5, 'done', [], 'Prime / Strategy');
  P('kit', 2, 'วาง Framework และโครงสร้าง Template', 'sudarat', -14, 8, 'done', [1], 'Prime / Strategy', 'high');
  P('kit', 3, 'ออกแบบ Template (Deck / Doc)', 'tananchai', -4, 8, 'doing', [2], 'Creative');
  P('kit', 4, 'เขียน Guideline การใช้งาน', 'chayada', -2, 7, 'doing', [2], 'Communication');
  P('kit', 5, 'Pilot กับทีม Event', 'butsaya', 8, 5, 'todo', [3, 4], 'Event');
  P('kit', 6, 'Launch และจัดอบรมทีม', 'jariya', 16, 3, 'todo', [5], 'Prime / Strategy', 'high');

  P('rs', 1, 'สำรวจความต้องการแต่ละภูมิภาค', 'thanapon', -7, 7, 'doing', [], 'Admin / อื่นๆ');
  P('rs', 2, 'ออกแบบ Roadshow Kit', 'nitikun', 0, 10, 'todo', [1], 'Creative');
  P('rs', 3, 'วางแผนเส้นทางและ Logistics', 'patcharanan', 0, 12, 'todo', [1], 'Event');
  P('rs', 4, 'ผลิตวิดีโอแนะนำ Roadshow', 'jadesalit', 11, 10, 'todo', [2], 'Multimedia');
  P('rs', 5, 'สรุปแผนเสนอ Management', 'pitcha', 23, 5, 'todo', [3, 4], 'Prime / Strategy', 'high');

  /* Personal / meeting-origin */
  const Pe = (who, title, s, dur, st, prio, priv = false, extra = {}) => tasks.push(base({ title, assigneeId: m(who), start: D(s), duration: dur, status: st, priority: prio, source: 'personal', private: priv, createdBy: m(who), type: 'Admin / อื่นๆ', doneAt: st === 'done' ? D(s) : null, ...extra }));
  Pe('kaeng', 'ทบทวนงบประมาณ Q1 กับฝ่ายการเงิน', 2, 1, 'todo', 'high');
  Pe('kaeng', 'เตรียม Agenda ประชุมทีมประจำสัปดาห์', 0, 1, 'doing', 'med');
  Pe('kaeng', 'อนุมัติ Key Visual Customer Appreciation Night', 1, 1, 'todo', 'high', false, { projectId: 'p_ye' });
  Pe('kaeng', 'ส่ง OKR Update ให้ผู้บริหาร', -3, 1, 'done', 'med');
  Pe('kaeng', 'ตอบอีเมลคู่ค้า (Agency Partner)', -1, 1, 'todo', 'low');
  Pe('kaeng', 'ทบทวนผลประเมินรายบุคคล (ส่วนตัว)', 4, 2, 'todo', 'med', true);
  Pe('noravat', 'เช็กสถานที่งานอีกครั้งกับโรงแรม', 0, 1, 'todo', 'high', false, { projectId: 'p_ye' });
  Pe('jariya', 'อ่านสรุป Insight ลูกค้าไตรมาสนี้', 0, 1, 'todo', 'low');
  Pe('chayada', 'ร่าง Calendar เนื้อหาเดือนหน้า', 1, 2, 'todo', 'med');

  tasks.forEach(t => { if (t.source === 'personal' && !t.private && !t.projectId && ['เตรียม Agenda','ร่าง Calendar','อ่านสรุป','ตอบอีเมล','ส่ง OKR'].some(k => t.title.includes(k))) { t.submitted = true; t.submittedAt = T; } });
  const sty = { kaeng: ['🦁', '#fde68a', 'plain'], chayada: ['🦋', '#fbcfe8', 'dots'], jariya: ['🌻', '#bbf7d0', 'lines'], phirat: ['🎨', '#ddd6fe', 'stars'] };
  members.forEach(mm => { const x = sty[mm.id.slice(2)]; if (x) { mm.emoji = x[0]; mm.postit = { color: x[1], pattern: x[2] }; } });

  /* Major events */
  const ev = (name, a, b, venue, owner, audience, status, milestones = [], projectId = null) => ({
    id: uid('e_'), name, start: D(a), end: D(b), venue, ownerId: m(owner), audience, status, projectId,
    milestones: milestones.map(([title, off, done]) => ({ id: uid('ms_'), title, date: D(off), done: !!done })),
  });
  const events = [
    ev('Dealer Convention', -120, -118, 'ศูนย์ประชุมแห่งชาติ', 'noravat', 'ตัวแทนจำหน่ายทั่วประเทศ ~500 คน', 'done', [['เริ่มเตรียมงาน', -150, 1], ['ส่งแบบสื่อ', -135, 1]]),
    ev('Mid-Year Townhall', -60, -60, 'ห้องประชุมใหญ่ สำนักงานใหญ่', 'kaeng', 'พนักงานทั้งหมด', 'done', [['ส่ง Agenda', -70, 1]]),
    ev('Customer Appreciation Night', 24, 24, 'ห้องบอลรูมโรงแรม (ตามที่ยืนยัน)', 'noravat', 'ลูกค้าและพาร์ตเนอร์ ~300 คน', 'confirmed',
      [['เริ่มเตรียมงาน', -14, 1], ['ส่งคำเชิญ', 4, 0], ['ซ้อมใหญ่', 21, 0], ['ปิดลงทะเบียน', 17, 0]], 'p_ye'),
    ev('Year-End Team Party', 40, 40, 'จะประกาศภายหลัง', 'butsaya', 'ทีม Agency Experience', 'planning', [['ลงคะแนนธีม', 20, 0]]),
    ev('RAM Roadshow Kick-off', 75, 75, 'ส่วนกลาง', 'pitcha', 'RAM ทุกภาค', 'planning', [['อนุมัติแผน', 55, 0]], 'p_rs'),
    ev('Annual Planning Workshop', 100, 101, 'รีสอร์ตนอกสถานที่', 'kaeng', 'หัวหน้าทีมและ PM', 'planning', [['จองสถานที่', 60, 0]]),
    ev('Partner Expo', 150, 152, 'ศูนย์แสดงสินค้า', 'noravat', 'พาร์ตเนอร์และผู้เข้าชมทั่วไป', 'planning', [['เริ่มเตรียมงาน', 90, 0], ['ส่งแบบบูธ', 120, 0]]),
    ev('Summer Activation Camp', 200, 201, 'ภาคใต้ (รอยืนยัน)', 'patcharanan', 'ลูกค้า VIP', 'planning'),
  ];

  /* Meetings */
  const meetings = [{
    id: uid('mt_'), title: 'Weekly Sync — Customer Appreciation Night', date: D(-3), source: 'text', fileName: '', projectId: 'p_ye', status: 'confirmed',
    raw: '', summary: 'ทีมทบทวนความคืบหน้าของงาน Customer Appreciation Night: Key Visual ล่าช้าเล็กน้อย โปรแกรมงานเป็นไปตามแผน และต้องปิดงบ Production ภายในสัปดาห์นี้',
    keyPoints: ['Key Visual รอบแรกเลยกำหนด ต้องเร่งปิดภายในสัปดาห์นี้', 'Run-down เวอร์ชัน 1 ผ่านการตรวจเบื้องต้น', 'ต้องยืนยันจำนวนผู้เข้าร่วมก่อนปิดงบ Production'],
    decisions: ['ตกลงใช้ธีมสีน้ำเงิน–ทองสำหรับ Key Visual', 'เปิดลงทะเบียนหลังได้ Key Visual สุดท้าย'],
    actions: [
      { id: uid('a_'), title: 'ส่ง Key Visual รอบสุดท้ายให้ Kaeng อนุมัติ', assigneeId: m('phirat'), due: D(1), priority: 'high', include: true, taskId: 'ye_3' },
      { id: uid('a_'), title: 'ยืนยันจำนวนผู้เข้าร่วมกับ Sales', assigneeId: m('noravat'), due: D(3), priority: 'med', include: true, taskId: null },
    ],
  }];

  /* Offsite work log */
  const off = (title, type, area, a, b, who, note) => ({ id: uid('o_'), title, areaType: type, area, start: D(a), end: D(b), personIds: who.map(m_), note, createdBy: m_(who[0]) });
  const offsite = [
    off('อบรมตัวแทนจำหน่ายและติดตั้งสื่อ', 'DCAO', 'DCAO1', -34, -33, ['butsaya', 'patcharanan'], 'จัดห้องอบรมและดูแลลงทะเบียน'),
    off('Roadshow เปิดตัวแคมเปญ', 'RAM', 'RAM03', -12, -10, ['phirat', 'jadesalit', 'thanapon'], 'ติดตั้งบูธ ถ่ายภาพและวิดีโอไฮไลต์'),
    off('Dealer Meeting ภาคใต้', 'RAM', 'RAM07', -4, -4, ['jadesalit'], 'ถ่ายภาพบรรยากาศ'),
    off('Open House สาขา', 'DCAO', 'DCAO2', 14, 15, ['butsaya', 'patcharanan', 'phirat'], 'ดูแลกิจกรรมหน้างานและป้ายสื่อ'),
    off('ประสานวิทยากรอบรมตัวแทน', 'RAM', 'RAM05', 20, 20, ['butsaya'], ''),
    off('บูธ Roadshow อุบลราชธานี', 'RAM', 'RAM09', 30, 32, ['patcharanan', 'nitikun'], ''),
    off('ถ่ายทำสารคดีพาร์ตเนอร์', 'OTHER', 'โรงงานพาร์ตเนอร์ (ชลบุรี)', 6, 7, ['thanapon', 'jadesalit'], 'ถ่ายทำนอกพื้นที่ 2 วัน'),
    off('สนับสนุนงานประชุมใหญ่ DCAO', 'DCAO', 'DCAO4', 40, 41, ['noravat', 'chayada'], ''),
  ];

  return { v: 2, settings, groups, members, projects, tasks, events, meetings, offsite };
}

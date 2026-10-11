import { createDemoRound, readDemo, writeDemo } from './demo-state.mjs';

export function getDemoProjects(user = 'guest') {
  const uid = user || 'guest';
  ensureDemoProjects(uid);
  try {
    return JSON.parse(localStorage.getItem(`greenspec:demo-projects:${uid}`) || '[]');
  } catch {
    return [];
  }
}

export function getDemoProjectData(user = 'guest', projectId) {
  const uid = user || 'guest';
  if (!projectId) return null;
  ensureDemoProjects(uid);
  try {
    const allData = JSON.parse(localStorage.getItem(`greenspec:demo-project-data:${uid}`) || '{}');
    return allData[projectId] || null;
  } catch {
    return null;
  }
}

export function ensureDemoProjects(user = 'guest') {
  const uid = user || 'guest';
  const key = `greenspec:demo-projects:${uid}`;
  const existing = localStorage.getItem(key);
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed) && parsed.length > 0) return;
    } catch {}
  }

  seedDemoProjects(uid);
}

export function seedDemoProjects(user = 'guest') {
  const effectiveUser = user || 'guest';
  const uid = typeof effectiveUser === 'string' ? effectiveUser.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'guest' : 'guest';
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 86400000 * 2).toISOString();
  const yesterday = new Date(now.getTime() - 86400000).toISOString();
  const fourHoursAgo = new Date(now.getTime() - 3600000 * 4).toISOString();

  const p1Id = `p1-${uid}`;
  const p2Id = `p2-${uid}`;

  const p1 = {
    id: p1Id,
    name: 'Bangkok Green Tower (อาคารนวัตกรรมสีเขียว)',
    description: 'โครงการอาคารสำนักงาน 32 ชั้น มุ่งเป้ามาตรฐาน LEED Gold ออกแบบลดคาร์บอนด้วยคอนกรีตไฮดรอลิกผสมเถ้าลอย 35% และเหล็ก EPD',
    created_at: twoDaysAgo,
    updated_at: fourHoursAgo,
    archived_at: null,
    row_version: 1
  };

  const p2 = {
    id: p2Id,
    name: 'Eco-Transit Line (ระบบคมนาคมสีเขียว)',
    description: 'โครงสร้างพื้นฐานฐานรากหนา 1.8 ม. (Mass Concrete) และพื้นโพสเทนชัน พร้อมเอกสารข้อกำหนดเพื่อทดสอบการวิเคราะห์',
    created_at: yesterday,
    updated_at: yesterday,
    archived_at: null,
    row_version: 1
  };

  const projects = [p1, p2];

  // Document IDs
  const doc1Id = `doc1-${uid}`;
  const ver1Id = `ver1-${uid}`;
  const doc2Id = `doc2-${uid}`;
  const ver2Id = `ver2-${uid}`;
  const doc3Id = `doc3-${uid}`;
  const ver3Id = `ver3-${uid}`;

  const p1Data = {
    documents: [
      {
        id: doc1Id,
        project_id: p1Id,
        title: 'BOQ_งานโครงสร้างและคอนกรีตฐานราก.xlsx',
        type: 'SPEC',
        current_version_id: ver1Id,
        retired_at: null,
        created_at: twoDaysAgo
      },
      {
        id: doc2Id,
        project_id: p1Id,
        title: 'ข้อกำหนดทางเทคนิค_คอนกรีตคาร์บอนต่ำ_ACI211.docx',
        type: 'SPEC',
        current_version_id: ver2Id,
        retired_at: null,
        created_at: twoDaysAgo
      }
    ],
    document_versions: [
      {
        id: ver1Id,
        document_id: doc1Id,
        project_id: p1Id,
        version_no: 1,
        filename: 'BOQ_งานโครงสร้างและคอนกรีตฐานราก.xlsx',
        file_size: 45280,
        checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        upload_state: 'READY',
        provenance: 'uploaded',
        created_at: twoDaysAgo
      },
      {
        id: ver2Id,
        document_id: doc2Id,
        project_id: p1Id,
        version_no: 1,
        filename: 'ข้อกำหนดทางเทคนิค_คอนกรีตคาร์บอนต่ำ_ACI211.docx',
        file_size: 132400,
        checksum: '87c4ba28fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852c911',
        upload_state: 'READY',
        provenance: 'uploaded',
        created_at: twoDaysAgo
      }
    ],
    packages: [
      {
        id: `pkg1-${uid}`,
        project_id: p1Id,
        name: 'งานเทคอนกรีตฐานราก Mat Foundation (C35)',
        scope: 'concrete',
        execution_status: 'COMPLETE',
        created_at: twoDaysAgo
      },
      {
        id: `pkg2-${uid}`,
        project_id: p1Id,
        name: 'งานโครงสร้างเสาและคานชั้น 1-5 (C40)',
        scope: 'concrete',
        execution_status: 'IN_PROGRESS',
        created_at: yesterday
      },
      {
        id: `pkg3-${uid}`,
        project_id: p1Id,
        name: 'งานผนังบล็อกมวลเบาคาร์บอนต่ำ (AAC Block)',
        scope: 'masonry',
        execution_status: 'DRAFT',
        created_at: now.toISOString()
      }
    ]
  };

  const p2Data = {
    documents: [
      {
        id: doc3Id,
        project_id: p2Id,
        title: 'สเปกคอนกรีตฐานรากหนา_1.8m_Mass_Concrete.docx',
        type: 'SPEC',
        current_version_id: ver3Id,
        retired_at: null,
        created_at: yesterday
      }
    ],
    document_versions: [
      {
        id: ver3Id,
        document_id: doc3Id,
        project_id: p2Id,
        version_no: 1,
        filename: 'สเปกคอนกรีตฐานรากหนา_1.8m_Mass_Concrete.docx',
        file_size: 92100,
        checksum: '9a21ba28fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852d222',
        upload_state: 'READY',
        provenance: 'uploaded',
        created_at: yesterday
      }
    ],
    packages: [
      {
        id: `pkg4-${uid}`,
        project_id: p2Id,
        name: 'งานฐานรากสถานีหลัก (Pier & Pile Cap)',
        scope: 'concrete',
        execution_status: 'IN_PROGRESS',
        created_at: yesterday
      }
    ]
  };

  // Save projects and project-data to localStorage
  localStorage.setItem(`greenspec:demo-projects:${user}`, JSON.stringify(projects));
  localStorage.setItem(`greenspec:demo-project-data:${user}`, JSON.stringify({
    [p1Id]: p1Data,
    [p2Id]: p2Data
  }));

  // Create initial demo analysis round for Project 1 so user has rich metrics ready to explore
  const existingP1Rounds = readDemo(user, p1Id);
  if (!existingP1Rounds || existingP1Rounds.length === 0) {
    const round1 = createDemoRound(p1, [ver1Id, ver2Id]);
    // Approve Option B for Concrete
    const concReview = round1.reviews.find(r => r.recommendation_id.endsWith('-concrete'));
    if (concReview) {
      concReview.decision = 'APPROVED';
      concReview.selected_option = 'B';
      concReview.draft_wording = 'คงกำลังอัด 35 MPa ที่อายุ 56 วัน ใช้ปูนซีเมนต์ไฮดรอลิกผสมเถ้าลอย 35% (มอก. 2135-2545) ตามมาตรฐาน มอก. 213-2560 ตรวจสอบแผนการบ่มคอนกรีตก่อนอนุมัติ';
    }
    // Approve Option A for Steel
    const steelReview = round1.reviews.find(r => r.recommendation_id.endsWith('-steel'));
    if (steelReview) {
      steelReview.decision = 'APPROVED';
      steelReview.selected_option = 'A';
    }
    writeDemo(user, p1Id, [round1]);
  }

  window.dispatchEvent(new Event('greenspec-demo-change'));
  return projects;
}

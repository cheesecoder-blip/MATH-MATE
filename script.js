// =========================================================================================
// MATH MATE V27 - UNIFIED CORE CLIENT SCRIPT
// =========================================================================================

const SUPABASE_URL = 'https://vklhrsbxqnemjxpfpouz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vQ-0v_nGiGCtb7VB-8VmFw_RkanTwJ4';

let db = null;
if (window.supabase) {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ------------------------------------------
// STRING & DOM HELPERS
// ------------------------------------------
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getCleanDisplayName(name) {
  if (!name) return 'Math Explorer';
  return String(name).replace(/^@+/, '').trim();
}

// ------------------------------------------
// LOCAL PROFILE UNIFIED SOURCE OF TRUTH
// ------------------------------------------
const DEFAULT_PROFILE = {
  id: 'guest_user',
  name: 'Math Explorer',
  avatar_url: '',
  avatar_color: '#3b82f6',
  bio: 'Mathematics Learner',
  xp: 0
};

function getStoredProfile() {
  const saved = localStorage.getItem('mathMateProfile');
  if (saved) {
    try {
      return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
    } catch (e) {
      console.error("Error parsing stored profile:", e);
    }
  }
  return DEFAULT_PROFILE;
}

function saveStoredProfile(profileData) {
  localStorage.setItem('mathMateProfile', JSON.stringify(profileData));
  localStorage.setItem('mathMateAuthUser', JSON.stringify(profileData));
}

async function syncSupabaseProfile() {
  const local = getStoredProfile();
  if (!db || !local || !local.id || local.id === 'guest_user') return local;

  try {
    const { data, error } = await db.from('profiles').select('*').eq('id', local.id).maybeSingle();
    if (!error && data) {
      const merged = {
        id: data.id,
        name: data.name || local.name,
        avatar_url: data.avatar_url || '',
        avatar_color: data.avatar_color || '#3b82f6',
        bio: data.bio || 'Mathematics Learner',
        xp: Number(data.xp || 0)
      };
      saveStoredProfile(merged);
      return merged;
    }
  } catch (err) {
    console.warn("Supabase profile sync offline, using local state:", err);
  }
  return local;
}

// ------------------------------------------
// AUTHENTICATION (LINKED ID + NAME MATCH)
// ------------------------------------------
async function loginUser(identification, fullName) {
  const userId = String(identification || '').trim();
  const userName = String(fullName || '').trim();

  if (!userId || !userName) {
    return { success: false, message: 'Please enter both your Identification ID and Display Name.' };
  }

  if (db) {
    try {
      const { data, error } = await db.from('profiles').select('*').eq('id', userId).maybeSingle();

      if (error || !data) {
        return { success: false, message: 'Account ID not found in database. Please verify your Identification ID.' };
      }

      if (String(data.name).trim().toLowerCase() !== userName.toLowerCase()) {
        return { success: false, message: 'Display Name does not match the record for Identification ID "' + userId + '".' };
      }

      const verifiedProfile = {
        id: data.id,
        name: data.name,
        avatar_url: data.avatar_url || '',
        avatar_color: data.avatar_color || '#3b82f6',
        bio: data.bio || 'Mathematics Learner',
        xp: Number(data.xp || 0)
      };

      saveStoredProfile(verifiedProfile);
      return { success: true, profile: verifiedProfile };
    } catch (err) {
      console.error('Database verification error:', err);
    }
  }

  // Fallback if db is unavailable
  const fallback = {
    id: userId,
    name: userName,
    avatar_url: '',
    avatar_color: '#3b82f6',
    bio: 'Mathematics Learner',
    xp: 0
  };
  saveStoredProfile(fallback);
  return { success: true, profile: fallback };
}

function checkAuth() {
  const path = window.location.pathname.split("/").pop() || "index.html";
  if (path === 'login.html') return;

  const authUser = localStorage.getItem('mathMateAuthUser');
  if (!authUser) {
    window.location.href = 'login.html';
  }
}

function logoutUser() {
  localStorage.removeItem('mathMateProfile');
  localStorage.removeItem('mathMateAuthUser');
  window.location.href = 'login.html';
}

// ------------------------------------------
// REUSABLE POPUP ENGINE
// ------------------------------------------
function openPopup(title, contentHtml) {
  const popup = document.getElementById('standardPopup');
  const titleEl = document.getElementById('standardPopupTitle');
  const contentEl = document.getElementById('standardPopupContent');

  if (popup && titleEl && contentEl) {
    titleEl.textContent = title || 'Alert';
    contentEl.innerHTML = contentHtml || '';
    popup.classList.add('open');
    popup.classList.add('active');
    popup.style.display = 'flex';
  }
}

function closeStandardPopup(event) {
  const popup = document.getElementById('standardPopup');
  if (popup) {
    if (!event || event.target.id === 'standardPopup' || event.target.classList.contains('close-btn')) {
      popup.classList.remove('open');
      popup.classList.remove('active');
      popup.style.display = 'none';
    }
  }
}

// ------------------------------------------
// SIDEBAR & HAMBURGER DRAWER & THEME
// ------------------------------------------
async function loadSidebar() {
  const container = document.getElementById("sidebar-container");
  if (!container) return;

  try {
    const response = await fetch("sidebar-navigation-snippets/sidebar.html?v=27");
    const html = await response.text();
    container.innerHTML = html;

    if (window.lucide) {
      lucide.createIcons();
    }

    highlightSidebarNav();
    initTheme(false);

    const profile = getStoredProfile();
    updateSidebarProfileInfo(profile);
  } catch (err) {
    console.error("Error loading sidebar snippet:", err);
  }
}

function updateSidebarProfileInfo(profile) {
  const nameEl = document.getElementById("sidebarName");
  const xpEl = document.getElementById("sidebarXpDisplay");
  const avatarEl = document.getElementById("sidebarAvatar");

  if (nameEl) nameEl.textContent = getCleanDisplayName(profile.name || profile.id);
  if (xpEl) xpEl.textContent = (profile.xp || 0) + ' EXP';

  if (avatarEl) {
    if (profile.avatar_url && (profile.avatar_url.startsWith('http') || profile.avatar_url.startsWith('data:image'))) {
      avatarEl.style.backgroundImage = 'url("' + profile.avatar_url + '")';
      avatarEl.textContent = '';
    } else {
      avatarEl.style.backgroundImage = 'none';
      avatarEl.style.backgroundColor = profile.avatar_color || '#3b82f6';
      avatarEl.textContent = (profile.name || profile.id || 'MM').substring(0, 2).toUpperCase();
    }
  }
}

function highlightSidebarNav() {
  const path = window.location.pathname.split("/").pop() || "index.html";
  const navMap = {
    'index.html': 'nav-dashboard',
    'courses.html': 'nav-courses',
    'lesson.html': 'nav-courses',
    'people.html': 'nav-people',
    'leaderboard.html': 'nav-leaderboard',
    'profile.html': 'nav-profile'
  };

  const radioId = navMap[path] || 'nav-dashboard';
  const radio = document.getElementById(radioId);
  if (radio) radio.checked = true;
}

function switchSection(section) {
  const pageMap = {
    'dashboard': 'index.html',
    'courses': 'courses.html',
    'people': 'people.html',
    'leaderboard': 'leaderboard.html',
    'profile': 'profile.html'
  };

  if (pageMap[section]) {
    window.location.href = pageMap[section];
  }
}

function toggleHamburgerMenu() {
  const drawer = document.getElementById('hamburgerDrawer');
  const overlay = document.getElementById('drawerOverlay');
  if (drawer) {
    drawer.classList.toggle('open');
    drawer.classList.toggle('active');
  }
  if (overlay) {
    overlay.classList.toggle('open');
    overlay.classList.toggle('active');
  }
}

function closeHamburgerMenu() {
  const drawer = document.getElementById('hamburgerDrawer');
  const overlay = document.getElementById('drawerOverlay');
  if (drawer) {
    drawer.classList.remove('open');
    drawer.classList.remove('active');
  }
  if (overlay) {
    overlay.classList.remove('open');
    overlay.classList.remove('active');
  }
}

function initTheme(toggle) {
  const saved = localStorage.getItem('mathMateTheme') || 'dark';
  let isDark = saved === 'dark';

  if (toggle) {
    isDark = !isDark;
    localStorage.setItem('mathMateTheme', isDark ? 'dark' : 'light');
  }

  if (isDark) {
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
    document.documentElement.classList.add('dark-mode');
  } else {
    document.body.classList.add('light-mode');
    document.body.classList.remove('dark-mode');
    document.documentElement.classList.remove('dark-mode');
  }
}

// ------------------------------------------
// DASHBOARD STATS
// ------------------------------------------
async function updateDashboardStats() {
  const profile = await syncSupabaseProfile();
  if (!profile) return;

  const nameEl = document.getElementById('dashWelcomeName');
  const xpEl = document.getElementById('dashXpDisplay');
  const compEl = document.getElementById('dashCompetenciesDisplay');
  const rankEl = document.getElementById('dashRankDisplay');

  if (nameEl) nameEl.textContent = getCleanDisplayName(profile.name || profile.id);
  if (xpEl) xpEl.textContent = (profile.xp || 0) + ' EXP';

  // Calculate mastered competencies count
  let compCount = 0;
  if (db && profile.id) {
    try {
      const { data } = await db.from('math7_progress').select('lesson_id').eq('user_id', profile.id);
      if (data) compCount = data.length;
    } catch (e) {}
  }
  if (compEl) compEl.textContent = compCount + ' / 27';

  // Calculate live global rank
  let userRank = '#1';
  if (db && profile.id) {
    try {
      const { data } = await db.from('profiles').select('id, xp').order('xp', { ascending: false });
      if (data) {
        const idx = data.findIndex(p => p.id === profile.id);
        if (idx !== -1) userRank = '#' + (idx + 1);
      }
    } catch (e) {}
  }
  if (rankEl) rankEl.textContent = userRank;
}

// ------------------------------------------
// COURSE CATALOG & LESSON RENDERER
// ------------------------------------------
function renderCoursesUI() {
  const termsContainer = document.getElementById('courseTermsContainer');
  const activeArea = document.getElementById('activeCourseArea');
  if (!termsContainer || !activeArea) return;

  activeArea.style.display = 'block';

  if (!window.MATH7_CURRICULUM_DATA || !window.MATH7_CURRICULUM_DATA.terms) {
    termsContainer.innerHTML = '<p style="color:var(--soft);">Curriculum data loading...</p>';
    return;
  }

  termsContainer.innerHTML = window.MATH7_CURRICULUM_DATA.terms.map((term, idx) => {
    const termId = 'term_accordion_' + idx;
    return `
      <div class="stat-card" style="margin-bottom:20px; flex-direction:column; align-items:stretch; padding:0; overflow:hidden;">
        <div onclick="toggleTermAccordion('${termId}')" style="padding:18px 24px; background:var(--chip); cursor:pointer; display:flex; align-items:center; justify-content:space-between; user-select:none;">
          <div>
            <h3 style="margin:0; font-size:1.1rem; color:var(--text);">${escapeHtml(term.term_title)}</h3>
            <p style="margin:4px 0 0 0; font-size:0.82rem; color:var(--soft);">${term.lessons.length} Competencies & Activity Evaluations</p>
          </div>
          <i class="icon" data-lucide="chevron-down" id="icon_${termId}" style="transition:transform 0.2s;"></i>
        </div>

        <div id="${termId}" style="display:none; padding:20px; background:var(--surface); border-top:1px solid var(--border);">
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
            ${term.lessons.map(l => {
              return `
                <div class="stat-card" onclick="window.location.href='lesson.html?id=${l.id}'" style="cursor:pointer; padding:16px; flex-direction:column; align-items:stretch; border:1px solid var(--border); transition:transform 0.15s, border-color 0.15s;">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                    <span style="font-size:0.75rem; font-weight:700; color:var(--accent); text-transform:uppercase;">${escapeHtml(l.week || 'Week')}</span>
                    <span style="font-size:0.75rem; background:rgba(16,185,129,0.1); color:#10b981; padding:2px 8px; border-radius:10px; font-weight:600;">${l.quiz_questions ? l.quiz_questions.length : 0} Items</span>
                  </div>
                  <h4 style="margin:0 0 6px 0; font-size:0.98rem; color:var(--text);">${escapeHtml(l.title)}</h4>
                  <p style="margin:0; font-size:0.82rem; color:var(--soft); line-height:1.4;">${escapeHtml(l.description || 'Study notes and multi-item activity evaluation.')}</p>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function toggleTermAccordion(termId) {
  const el = document.getElementById(termId);
  const icon = document.getElementById('icon_' + termId);
  if (el) {
    const isHidden = el.style.display === 'none';
    el.style.display = isHidden ? 'block' : 'none';
    if (icon) icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
  }
}

function initLessonPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const lessonId = urlParams.get('id');
  if (!lessonId || !window.MATH7_CURRICULUM_DATA) return;

  let targetLesson = null;
  for (const term of window.MATH7_CURRICULUM_DATA.terms) {
    const found = term.lessons.find(l => l.id === lessonId);
    if (found) { targetLesson = found; break; }
  }

  if (!targetLesson) {
    const titleEl = document.getElementById('lessonTitle');
    if (titleEl) titleEl.textContent = 'Lesson Not Found';
    return;
  }

  window.currentActiveLesson = targetLesson;

  const titleEl = document.getElementById('lessonTitle');
  const weekEl = document.getElementById('lessonWeek');
  const readContent = document.getElementById('lessonReadingContent');
  const quizForm = document.getElementById('lessonQuizForm');

  if (titleEl) titleEl.textContent = targetLesson.title;
  if (weekEl) weekEl.textContent = targetLesson.week || 'Competency Evaluation';
  if (readContent) readContent.innerHTML = targetLesson.reading || '<p>Lesson reading content is loading...</p>';

  if (quizForm && targetLesson.quiz_questions) {
    quizForm.innerHTML = targetLesson.quiz_questions.map((q, qIdx) => `
      <div style="margin-bottom:20px; padding:16px; background:var(--chip); border-radius:12px; border:1px solid var(--border);">
        <p style="font-weight:700; font-size:0.95rem; color:var(--text); margin-bottom:12px;">${qIdx + 1}. ${escapeHtml(q.question)}</p>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${q.options.map((opt, oIdx) => `
            <label style="display:flex; align-items:center; gap:10px; padding:8px 12px; background:var(--surface); border-radius:8px; border:1px solid var(--border); cursor:pointer; font-size:0.88rem; color:var(--text);">
              <input type="radio" name="question_${qIdx}" value="${oIdx}" required />
              <span>${escapeHtml(opt)}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('') + '<button type="submit" class="btn btn-primary" style="width:100%; padding:14px; font-size:1rem;">Submit Activity Evaluation</button>';
  }

  if (window.lucide) lucide.createIcons();
}

function switchLessonTab(tabName) {
  const readSec = document.getElementById('lessonReadingSection');
  const quizSec = document.getElementById('lessonQuizSection');
  const readBtn = document.getElementById('tabBtnReading');
  const quizBtn = document.getElementById('tabBtnQuiz');

  if (tabName === 'reading') {
    if (readSec) readSec.style.display = 'block';
    if (quizSec) quizSec.style.display = 'none';
    if (readBtn) { readBtn.classList.add('btn-primary'); readBtn.classList.remove('btn-secondary'); }
    if (quizBtn) { quizBtn.classList.add('btn-secondary'); quizBtn.classList.remove('btn-primary'); }
  } else {
    if (readSec) readSec.style.display = 'none';
    if (quizSec) quizSec.style.display = 'block';
    if (quizBtn) { quizBtn.classList.add('btn-primary'); quizBtn.classList.remove('btn-secondary'); }
    if (readBtn) { readBtn.classList.add('btn-secondary'); readBtn.classList.remove('btn-primary'); }
  }
}

async function handleStandaloneActivitySubmit(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  const lesson = window.currentActiveLesson;
  if (!lesson || !lesson.quiz_questions) return;

  const profile = getStoredProfile();
  let score = 0;
  const total = lesson.quiz_questions.length;

  lesson.quiz_questions.forEach((q, idx) => {
    const selected = document.querySelector('input[name="question_' + idx + '"]:checked');
    if (selected && parseInt(selected.value, 10) === q.correct_index) {
      score++;
    }
  });

  const pct = Math.round((score / total) * 100);
  const expEarned = score * 10;

  // Award EXP and save progress
  profile.xp = (profile.xp || 0) + expEarned;
  saveStoredProfile(profile);

  if (db && profile.id) {
    try {
      await db.from('profiles').upsert([{ id: profile.id, name: profile.name, xp: profile.xp }]);
      await db.from('math7_progress').upsert([{
        id: 'prog_' + profile.id + '_' + lesson.id,
        user_id: profile.id,
        lesson_id: lesson.id,
        score: score,
        total_questions: total,
        percentage: pct,
        exp_earned: expEarned,
        completed_at: new Date().toISOString()
      }]);
    } catch (err) {
      console.warn('Error saving quiz result to Supabase:', err);
    }
  }

  openPopup('Evaluation Complete!', '<div style="text-align:center; padding:10px 0;"><h3 style="font-size:1.4rem; color:var(--accent); margin-bottom:8px;">Score: ' + score + ' / ' + total + ' (' + pct + '%)</h3><p style="color:var(--text); font-weight:600; margin-bottom:16px;">+ ' + expEarned + ' EXP Awarded to your profile!</p><button class="btn btn-primary" onclick="closeStandardPopup(); switchLessonTab(\'reading\');" style="width:100%; padding:12px;">Return to Lesson Notes</button></div>');
}

// ------------------------------------------
// LEADERBOARD (AUTOMATIC LOAD, REAL DB USERS ONLY)
// ------------------------------------------
async function renderLeaderboardUI() {
  const tableBody = document.getElementById('leaderboardTableBody');
  const podiumArea = document.getElementById('podiumArea');
  if (!tableBody && !podiumArea) return;

  let profilesList = [];
  if (db) {
    try {
      const { data } = await db.from('profiles').select('*').order('xp', { ascending: false }).limit(50);
      if (data) profilesList = data;
    } catch (e) {
      console.warn('Leaderboard fetch error:', e);
    }
  }

  // Fallback to active logged in user if database is empty
  if (profilesList.length === 0) {
    const local = getStoredProfile();
    if (local && local.id) profilesList = [local];
  }

  // Render Podium (Top 3)
  if (podiumArea && profilesList.length > 0) {
    const top1 = profilesList[0];
    const top2 = profilesList[1];
    const top3 = profilesList[2];

    let podiumHtml = '<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:24px;">';

    if (top2) {
      podiumHtml += `
        <div class="stat-card" onclick="openUserProfilePopup('${top2.id}')" style="cursor:pointer; flex-direction:column; align-items:center; text-align:center; padding:20px; border:2px solid #94a3b8;">
          <span style="font-size:1.8rem; margin-bottom:6px;">🥈</span>
          <h4 style="margin:0; font-size:1.05rem; color:var(--text);">${escapeHtml(getCleanDisplayName(top2.name))}</h4>
          <p style="margin:4px 0 8px 0; font-size:0.8rem; color:var(--soft);">${escapeHtml(top2.bio || 'Math Explorer')}</p>
          <span style="font-weight:800; color:var(--accent); font-size:1.1rem;">${top2.xp || 0} EXP</span>
        </div>
      `;
    }

    if (top1) {
      podiumHtml += `
        <div class="stat-card" onclick="openUserProfilePopup('${top1.id}')" style="cursor:pointer; flex-direction:column; align-items:center; text-align:center; padding:24px; border:2px solid #f59e0b; background:linear-gradient(135deg, var(--surface) 0%, rgba(245, 158, 11, 0.1) 100%);">
          <span style="font-size:2.2rem; margin-bottom:6px;">🥇</span>
          <h3 style="margin:0; font-size:1.2rem; color:var(--text);">${escapeHtml(getCleanDisplayName(top1.name))}</h3>
          <p style="margin:4px 0 8px 0; font-size:0.85rem; color:var(--soft);">${escapeHtml(top1.bio || 'Math Explorer')}</p>
          <span style="font-weight:800; color:#f59e0b; font-size:1.3rem;">${top1.xp || 0} EXP</span>
        </div>
      `;
    }

    if (top3) {
      podiumHtml += `
        <div class="stat-card" onclick="openUserProfilePopup('${top3.id}')" style="cursor:pointer; flex-direction:column; align-items:center; text-align:center; padding:20px; border:2px solid #b45309;">
          <span style="font-size:1.8rem; margin-bottom:6px;">🥉</span>
          <h4 style="margin:0; font-size:1.05rem; color:var(--text);">${escapeHtml(getCleanDisplayName(top3.name))}</h4>
          <p style="margin:4px 0 8px 0; font-size:0.8rem; color:var(--soft);">${escapeHtml(top3.bio || 'Math Explorer')}</p>
          <span style="font-weight:800; color:var(--accent); font-size:1.1rem;">${top3.xp || 0} EXP</span>
        </div>
      `;
    }

    podiumHtml += '</div>';
    podiumArea.innerHTML = podiumHtml;
  }

  // Render Full Table
  if (tableBody) {
    if (profilesList.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="3" style="padding:20px; text-align:center; color:var(--soft);">No registered students found in database.</td></tr>';
      return;
    }

    tableBody.innerHTML = profilesList.map((p, idx) => {
      const rankNum = idx + 1;
      let rankBadge = `<span style="font-weight:700; color:var(--soft);">#${rankNum}</span>`;
      if (rankNum === 1) rankBadge = '🥇 #1';
      else if (rankNum === 2) rankBadge = '🥈 #2';
      else if (rankNum === 3) rankBadge = '🥉 #3';

      const cleanName = getCleanDisplayName(p.name || p.id);
      const hasAvatar = p.avatar_url && (p.avatar_url.startsWith('http') || p.avatar_url.startsWith('data:image'));

      return `
        <tr onclick="openUserProfilePopup('${p.id}')" style="cursor:pointer; transition:background 0.15s; border-bottom:1px solid var(--border);">
          <td style="padding:14px; text-align:center;">${rankBadge}</td>
          <td style="padding:14px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="avatar-placeholder" style="width:36px; height:36px; font-size:0.85rem; ${hasAvatar ? `background-image:url('${p.avatar_url}');` : `background-color:${p.avatar_color || '#3b82f6'};`}">
                ${hasAvatar ? '' : cleanName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div style="font-weight:700; font-size:0.92rem; color:var(--text);">${escapeHtml(cleanName)}</div>
                <div style="font-size:0.78rem; color:var(--soft);">${escapeHtml(p.bio || 'Mathematics Learner')}</div>
              </div>
            </div>
          </td>
          <td style="padding:14px; text-align:right; font-weight:800; color:var(--accent); font-size:0.95rem;">
            ${p.xp || 0} EXP
          </td>
        </tr>
      `;
    }).join('');
  }
}

async function openUserProfilePopup(targetUserId) {
  openPopup('Loading Profile...', '<p style="text-align:center; color:var(--soft); padding:20px;">Fetching student details...</p>');

  let targetUser = null;
  let userRank = '#1';

  if (db) {
    try {
      const { data: allUsers } = await db.from('profiles').select('*').order('xp', { ascending: false });
      if (allUsers) {
        const idx = allUsers.findIndex(u => u.id === targetUserId);
        if (idx !== -1) {
          targetUser = allUsers[idx];
          userRank = '#' + (idx + 1);
        }
      }
    } catch (e) {}
  }

  if (!targetUser) {
    const current = getStoredProfile();
    if (current && current.id === targetUserId) targetUser = current;
  }

  if (!targetUser) {
    openPopup('Error', 'User profile details unavailable.');
    return;
  }

  const cleanName = getCleanDisplayName(targetUser.name || targetUser.id);
  const hasAvatar = targetUser.avatar_url && (targetUser.avatar_url.startsWith('http') || targetUser.avatar_url.startsWith('data:image'));

  openPopup('Student Profile', `
    <div style="text-align:center; padding:10px 0;">
      <div class="avatar-placeholder" style="width:70px; height:70px; margin:0 auto 12px auto; font-size:1.5rem; ${hasAvatar ? `background-image:url('${targetUser.avatar_url}');` : `background-color:${targetUser.avatar_color || '#3b82f6'};`}">
        ${hasAvatar ? '' : cleanName.substring(0, 2).toUpperCase()}
      </div>
      <h3 style="margin:0 0 4px 0; font-size:1.3rem; color:var(--text);">${escapeHtml(cleanName)}</h3>
      <p style="margin:0 0 16px 0; font-size:0.88rem; color:var(--soft);">${escapeHtml(targetUser.bio || 'Mathematics Learner')}</p>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
        <div style="background:var(--chip); padding:12px; border-radius:10px;">
          <span style="font-size:0.75rem; color:var(--soft); display:block;">Total EXP</span>
          <strong style="font-size:1.1rem; color:var(--accent);">${targetUser.xp || 0} EXP</strong>
        </div>
        <div style="background:var(--chip); padding:12px; border-radius:10px;">
          <span style="font-size:0.75rem; color:var(--soft); display:block;">Global Rank</span>
          <strong style="font-size:1.1rem; color:#f59e0b;">${userRank}</strong>
        </div>
      </div>

      <button class="btn btn-primary" onclick="closeStandardPopup(); window.location.href='people.html?chat=' + encodeURIComponent('${targetUser.id}');" style="width:100%; padding:12px; font-size:0.95rem;">
        <i class="icon" data-lucide="message-square"></i> Send Message
      </button>
    </div>
  `);

  if (window.lucide) lucide.createIcons();
}

// ------------------------------------------
// PEOPLE & MESSAGING (DIRECT MESSAGES + GROUPS)
// ------------------------------------------
let activeConversationId = null;
let activeChatType = 'direct';
let activeRealtimeChannel = null;

async function initPeoplePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const targetChatUser = urlParams.get('chat');
  if (targetChatUser) {
    openChatWithUser(targetChatUser, targetChatUser);
  } else {
    loadConversationsList();
  }
}

async function loadConversationsList() {
  const list = document.getElementById('conversationsList');
  if (!list) return;

  const profile = getStoredProfile();
  let users = [];
  let groups = [];

  if (db) {
    try {
      const { data: usersData } = await db.from('profiles').select('*').neq('id', profile.id).limit(20);
      if (usersData) users = usersData;

      const { data: groupsData } = await db.from('conversations').select('*').eq('type', 'group').limit(10);
      if (groupsData) groups = groupsData;
    } catch (e) {}
  }

  const unreadChats = JSON.parse(localStorage.getItem('mathMateUnreadChats') || '{}');

  let html = '';

  if (groups.length > 0) {
    html += '<div style="margin-bottom:8px; font-weight:700; font-size:0.75rem; color:var(--soft); text-transform:uppercase;">Group Study Squads</div>';
    html += groups.map(g => {
      const isUnread = !!unreadChats[g.id];
      return `
        <div class="flex-between ${isUnread ? 'unread-chat-item' : ''}" style="padding:10px 12px; border-radius:10px; border:1px solid var(--border); background:var(--chip); cursor:pointer; margin-bottom:8px;" onclick="openGroupChat('${g.id}', '${escapeHtml(g.name || 'Group Chat')}')">
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="avatar-placeholder" style="width:32px; height:32px; font-size:0.8rem; background:#10b981;">👥</div>
            <div>
              <div style="font-weight:600; font-size:0.88rem; color:var(--text);">${escapeHtml(g.name || 'Group Chat')}</div>
              <div style="font-size:0.75rem; color:var(--soft);">Group Chat</div>
            </div>
          </div>
          ${isUnread ? '<span class="unread-badge">New</span>' : ''}
        </div>
      `;
    }).join('');
  }

  html += '<div style="margin:12px 0 8px 0; font-weight:700; font-size:0.75rem; color:var(--soft); text-transform:uppercase;">Direct Student Messages</div>';

  if (users.length === 0) {
    html += '<p style="color:var(--soft); font-size:0.85rem; padding:12px; text-align:center;">No other student accounts registered yet in database.</p>';
  } else {
    html += users.map(u => {
      const cleanName = getCleanDisplayName(u.name || u.id);
      const convId = [profile.id, u.id].sort().join('_direct_');
      const isUnread = !!unreadChats[convId];
      const hasAvatar = u.avatar_url && (u.avatar_url.startsWith('http') || u.avatar_url.startsWith('data:image'));

      return `
        <div class="flex-between ${isUnread ? 'unread-chat-item' : ''}" style="padding:10px 12px; border-radius:10px; border:1px solid var(--border); background:var(--chip); cursor:pointer; margin-bottom:8px;" onclick="openChatWithUser('${u.id}', '${escapeHtml(cleanName)}')">
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="avatar-placeholder" style="width:32px; height:32px; font-size:0.8rem; ${hasAvatar ? `background-image:url('${u.avatar_url}');` : `background-color:${u.avatar_color || '#3b82f6'};`}">
              ${hasAvatar ? '' : cleanName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div style="font-weight:600; font-size:0.88rem; color:var(--text);">${escapeHtml(cleanName)}</div>
              <div style="font-size:0.75rem; color:var(--soft);">${escapeHtml(u.bio || 'Mathematics Learner')}</div>
            </div>
          </div>
          ${isUnread ? '<span class="unread-badge">New</span>' : ''}
        </div>
      `;
    }).join('');
  }

  list.innerHTML = html;
}

async function handlePeopleSearch(query) {
  const searchTerm = query.trim();
  const resultsContainer = document.getElementById('searchResultsList');
  const section = document.getElementById('searchResultsSection');
  const countBadge = document.getElementById('searchResultCount');
  if (!searchTerm) { if (section) section.style.display = 'none'; return; }
  if (section) section.style.display = 'block';

  const profile = getStoredProfile();
  if (!db) return;

  try {
    const { data: users } = await db.from('profiles').select('*').ilike('name', '%' + searchTerm + '%').neq('id', profile.id).limit(8);
    if (!users || users.length === 0) {
      if (countBadge) countBadge.textContent = '0 found';
      if (resultsContainer) resultsContainer.innerHTML = '<p style="color:var(--soft); font-size:0.85rem;">No matching students found.</p>';
      return;
    }
    if (countBadge) countBadge.textContent = users.length + ' found';
    resultsContainer.innerHTML = users.map(u => `
      <div class="flex-between" style="background:var(--chip); padding:8px 12px; border-radius:10px; cursor:pointer;" onclick="openChatWithUser('${u.id}', '${escapeHtml(u.name)}')">
        <div>
          <div style="font-weight:600; font-size:0.88rem; color:var(--text);">${escapeHtml(getCleanDisplayName(u.name))}</div>
          <div style="font-size:0.75rem; color:var(--soft);">${escapeHtml(u.bio || 'Mathematics Learner')}</div>
        </div>
        <button class="btn btn-primary btn-sm">Message</button>
      </div>
    `).join('');
  } catch (e) {}
}

async function openChatWithUser(targetUserId, targetUserName) {
  const profile = getStoredProfile();
  if (!profile || !profile.id) return;

  const convId = [profile.id, targetUserId].sort().join('_direct_');
  activeConversationId = convId;
  activeChatType = 'direct';

  const titleEl = document.getElementById('chatTitle');
  const subEl = document.getElementById('chatSubtitle');
  const cleanTargetName = getCleanDisplayName(targetUserName || targetUserId);

  if (titleEl) titleEl.textContent = cleanTargetName;
  if (subEl) subEl.textContent = 'Direct Message';

  if (db) {
    try {
      await db.from('conversations').upsert([{ id: convId, type: 'direct', members: [profile.id, targetUserId] }]);
    } catch (e) {}
  }

  subscribeToMessages(convId);
  loadChatMessages(convId);
}

async function openGroupChat(groupId, groupName) {
  activeConversationId = groupId;
  activeChatType = 'group';

  const titleEl = document.getElementById('chatTitle');
  const subEl = document.getElementById('chatSubtitle');
  if (titleEl) titleEl.textContent = groupName;
  if (subEl) subEl.textContent = 'Group Study Squad Chat';

  subscribeToMessages(groupId);
  loadChatMessages(groupId);
}

function subscribeToMessages(convId) {
  if (!db) return;
  if (activeRealtimeChannel) {
    db.removeChannel(activeRealtimeChannel);
  }

  activeRealtimeChannel = db.channel('public:messages:' + convId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      if (payload.new && payload.new.conversation_id === convId) {
        loadChatMessages(convId);
      }
    })
    .subscribe();
}

async function loadChatMessages(convId) {
  const feed = document.getElementById('messageFeed');
  const profile = getStoredProfile();
  if (!feed || !profile) return;

  let msgs = [];
  if (db) {
    try {
      const { data } = await db.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true });
      if (data) msgs = data;
    } catch (e) {}
  }

  if (msgs.length === 0) {
    feed.innerHTML = '<p style="color:var(--soft); text-align:center; margin:auto;">No messages in this chat yet. Say hello!</p>';
    return;
  }

  feed.innerHTML = msgs.map(m => {
    const isMe = String(m.sender_id).trim() === String(profile.id).trim();
    return `
      <div style="display:flex; flex-direction:column; align-items:${isMe ? 'flex-end' : 'flex-start'}; margin-bottom:10px;">
        <div style="background:${isMe ? 'var(--accent)' : 'var(--chip)'}; color:${isMe ? '#ffffff' : 'var(--text)'}; padding:10px 14px; border-radius:14px; max-width:75%; font-size:0.9rem; word-break:break-word; border:1px solid ${isMe ? 'var(--accent)' : 'var(--border)'};">
          ${escapeHtml(m.content)}
        </div>
        <span style="font-size:0.7rem; color:var(--soft); margin-top:2px;">${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    `;
  }).join('');

  feed.scrollTop = feed.scrollHeight;
}

async function sendChatMessage(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  const input = document.getElementById('chatMessageInput');
  const profile = getStoredProfile();
  if (!input || !activeConversationId || !profile) return;

  const text = input.value.trim();
  if (!text) return;

  input.value = '';

  const msgObj = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    conversation_id: activeConversationId,
    sender_id: profile.id,
    content: text,
    created_at: new Date().toISOString()
  };

  if (db) {
    try {
      await db.from('conversations').upsert([{ id: activeConversationId, type: activeChatType || 'direct' }]);
      await db.from('messages').upsert([msgObj]);
    } catch (err) {}
  }

  loadChatMessages(activeConversationId);
}

function openCreateGroupModal() {
  openPopup('Create Group Chat', `
    <div style="text-align:left;">
      <div style="margin-bottom:14px;">
        <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--soft); margin-bottom:6px;">Group Chat Name</label>
        <input type="text" id="groupNameInput" class="login-input" placeholder="e.g. Grade 7 Math Study Squad" required style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--chip); color:var(--text);" />
      </div>
      <button class="btn btn-primary" onclick="confirmCreateGroupChat()" style="width:100%; padding:12px;">Create Group</button>
    </div>
  `);
}

async function confirmCreateGroupChat() {
  const input = document.getElementById('groupNameInput');
  if (!input || !input.value.trim()) return;
  const groupName = input.value.trim();
  const profile = getStoredProfile();
  const groupId = 'group_' + Date.now();

  if (db) {
    try {
      await db.from('conversations').upsert([{ id: groupId, type: 'group', name: groupName, members: [profile.id] }]);
    } catch (e) {}
  }

  closeStandardPopup();
  openGroupChat(groupId, groupName);
  loadConversationsList();
}

// ------------------------------------------
// USER PROFILE UI & CUSTOMIZATION
// ------------------------------------------
async function renderProfileUI() {
  const profile = await syncSupabaseProfile();
  const nameEl = document.getElementById('profileNameDisplay');
  const bioEl = document.getElementById('profileBioDisplay');
  const xpEl = document.getElementById('profileXpDisplay');
  const rankEl = document.getElementById('profileRankDisplay');
  const compEl = document.getElementById('profileCompetenciesDisplay');
  const avatarEl = document.getElementById('profileAvatarLarge');

  if (!nameEl) return;

  nameEl.textContent = getCleanDisplayName(profile.name || profile.id);
  if (bioEl) bioEl.textContent = profile.bio || 'Mathematics Learner';
  if (xpEl) xpEl.textContent = (profile.xp || 0) + ' EXP';

  // Live Rank Calculation
  let userRank = '#1';
  if (db) {
    try {
      const { data } = await db.from('profiles').select('id, xp').order('xp', { ascending: false });
      if (data) {
        const idx = data.findIndex(p => p.id === profile.id);
        if (idx !== -1) userRank = '#' + (idx + 1);
      }
    } catch (e) {}
  }
  if (rankEl) rankEl.textContent = userRank;

  // Mastered Competencies Count
  let compCount = 0;
  if (db) {
    try {
      const { data } = await db.from('math7_progress').select('lesson_id').eq('user_id', profile.id);
      if (data) compCount = data.length;
    } catch (e) {}
  }
  if (compEl) compEl.textContent = compCount + ' / 27';

  // Avatar rendering
  if (avatarEl) {
    if (profile.avatar_url && (profile.avatar_url.startsWith('http') || profile.avatar_url.startsWith('data:image'))) {
      avatarEl.style.backgroundImage = 'url("' + profile.avatar_url + '")';
      avatarEl.textContent = '';
    } else {
      avatarEl.style.backgroundImage = 'none';
      avatarEl.style.backgroundColor = profile.avatar_color || '#3b82f6';
      avatarEl.textContent = (profile.name || profile.id || 'MM').substring(0, 2).toUpperCase();
    }
  }
}

function openEditNameModal() {
  const profile = getStoredProfile();
  openPopup('Edit Display Name', `
    <div style="text-align:left;">
      <div style="margin-bottom:14px;">
        <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--soft); margin-bottom:6px;">Display Name</label>
        <input type="text" id="editNameInput" value="${escapeHtml(profile.name)}" style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--chip); color:var(--text);" />
      </div>
      <button class="btn btn-primary" onclick="saveNewDisplayName()" style="width:100%; padding:12px;">Save Display Name</button>
    </div>
  `);
}

async function saveNewDisplayName() {
  const input = document.getElementById('editNameInput');
  if (!input || !input.value.trim()) return;
  const newName = input.value.trim();
  const profile = getStoredProfile();

  profile.name = newName;
  saveStoredProfile(profile);

  if (db && profile.id) {
    try { await db.from('profiles').upsert([{ id: profile.id, name: newName }]); } catch (e) {}
  }

  closeStandardPopup();
  updateSidebarProfileInfo(profile);
  renderProfileUI();
}

function openEditBioModal() {
  const profile = getStoredProfile();
  openPopup('Edit Status & Bio', `
    <div style="text-align:left;">
      <div style="margin-bottom:14px;">
        <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--soft); margin-bottom:6px;">Personal Status / Learning Goal</label>
        <textarea id="editBioInput" rows="3" style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--chip); color:var(--text); resize:vertical;">${escapeHtml(profile.bio || '')}</textarea>
      </div>
      <button class="btn btn-primary" onclick="saveNewBio()" style="width:100%; padding:12px;">Save Status</button>
    </div>
  `);
}

async function saveNewBio() {
  const input = document.getElementById('editBioInput');
  if (!input) return;
  const newBio = input.value.trim();
  const profile = getStoredProfile();

  profile.bio = newBio;
  saveStoredProfile(profile);

  if (db && profile.id) {
    try { await db.from('profiles').upsert([{ id: profile.id, name: profile.name, bio: newBio }]); } catch (e) {}
  }

  closeStandardPopup();
  renderProfileUI();
}

function openAvatarModal() {
  const profile = getStoredProfile();
  openPopup('Customize Avatar', `
    <div style="text-align:left;">
      <div style="margin-bottom:14px;">
        <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--soft); margin-bottom:6px;">Option 1: Upload Local Image File</label>
        <input type="file" id="avatarFileInput" accept="image/*" onchange="handleAvatarFileSelect(event)" style="width:100%; padding:8px; background:var(--chip); border-radius:10px; color:var(--text);" />
      </div>
      <div style="margin-bottom:14px;">
        <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--soft); margin-bottom:6px;">Option 2: Paste Image Web URL</label>
        <input type="url" id="avatarUrlInput" placeholder="https://example.com/photo.jpg" value="${escapeHtml(profile.avatar_url || '')}" style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--chip); color:var(--text);" />
      </div>
      <div style="margin-bottom:16px;">
        <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--soft); margin-bottom:6px;">Option 3: Change Avatar Background Color</label>
        <input type="color" id="avatarColorInput" value="${profile.avatar_color || '#3b82f6'}" style="width:100%; height:40px; border-radius:10px; border:1px solid var(--border); cursor:pointer;" />
      </div>
      <button class="btn btn-primary" onclick="saveNewAvatar()" style="width:100%; padding:12px;">Save Avatar Settings</button>
    </div>
  `);
}

function handleAvatarFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    window.selectedAvatarDataUrl = evt.target.result;
  };
  reader.readAsDataURL(file);
}

async function saveNewAvatar() {
  const profile = getStoredProfile();
  const urlInput = document.getElementById('avatarUrlInput');
  const colorInput = document.getElementById('avatarColorInput');

  if (window.selectedAvatarDataUrl) {
    profile.avatar_url = window.selectedAvatarDataUrl;
    window.selectedAvatarDataUrl = null;
  } else if (urlInput && urlInput.value.trim()) {
    profile.avatar_url = urlInput.value.trim();
  }

  if (colorInput) profile.avatar_color = colorInput.value;

  saveStoredProfile(profile);

  if (db && profile.id) {
    try {
      await db.from('profiles').upsert([{
        id: profile.id,
        name: profile.name,
        avatar_url: profile.avatar_url,
        avatar_color: profile.avatar_color
      }]);
    } catch (e) {}
  }

  closeStandardPopup();
  updateSidebarProfileInfo(profile);
  renderProfileUI();
}

// ------------------------------------------
// PAGE LOAD INITIALIZATION ROUTER
// ------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  checkAuth();
  loadSidebar();

  const profile = await syncSupabaseProfile();
  const path = window.location.pathname.split("/").pop() || "index.html";

  if (path === 'index.html' || path === '') {
    updateDashboardStats();
  } else if (path === 'courses.html') {
    renderCoursesUI();
  } else if (path === 'lesson.html') {
    initLessonPage();
  } else if (path === 'people.html') {
    initPeoplePage();
  } else if (path === 'leaderboard.html') {
    renderLeaderboardUI();
  } else if (path === 'profile.html') {
    renderProfileUI();
  }
});

// ==========================================
// 1. SUPABASE BACKEND INITIALIZATION
// ==========================================
const SUPABASE_URL = 'https://vklhrsbxqnemjxpfpouz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vQ-0v_nGiGCtb7VB-8VmFw_RkanTwJ4';

let db = null;
if (window.supabase) {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Helper to escape HTML characters
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================
// 2. LOCAL STORAGE PROFILE HELPERS
// ==========================================
function getStoredProfile() {
  const saved = localStorage.getItem('mathMateProfile');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Error reading saved profile:", e);
    }
  }
  return null;
}

function saveStoredProfile(profileData) {
  localStorage.setItem('mathMateProfile', JSON.stringify(profileData));
}

// ==========================================
// 3. AUTHENTICATION & LOGIN SYSTEM
// ==========================================

// Strict Login: Identification (url_id) check & Full Name permanent update
async function loginUser(identification, fullName) {
  if (!db) {
    return { success: false, message: "Supabase connection unavailable." };
  }

  try {
    const id = identification ? identification.trim() : '';
    const nameTag = fullName ? fullName.trim() : '';

    if (!id) {
      return { success: false, message: "Identification ID is required." };
    }

    // Search Supabase profiles table for matching ID (url_id)
    const { data: existingUser, error: fetchErr } = await db
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      return { success: false, message: "Database error: " + fetchErr.message };
    }

    // Reject if Identification ID does not exist in Supabase
    if (!existingUser) {
      return { 
        success: false, 
        message: `Identification ID "${escapeHtml(id)}" does not exist in Supabase. Please contact an admin.` 
      };
    }

    // Set Full Name as permanent Name Tag if provided
    if (nameTag && nameTag !== existingUser.name) {
      const { error: updateErr } = await db
        .from('profiles')
        .update({ name: nameTag })
        .eq('id', id);

      if (!updateErr) {
        existingUser.name = nameTag;
      }
    }

    // Save session locally
    saveStoredProfile(existingUser);
    localStorage.setItem('mathMateLoggedIn', 'true');

    return { success: true, user: existingUser };

  } catch (err) {
    console.error("Login error:", err);
    return { success: false, message: "An unexpected error occurred during login." };
  }
}

// Page Guard
function checkAuth() {
  const currentPath = window.location.pathname.split("/").pop();
  const saved = getStoredProfile();
  const isLoggedIn = localStorage.getItem('mathMateLoggedIn') === 'true';

  if (currentPath === "login.html") {
    if (saved && isLoggedIn) {
      window.location.href = "index.html";
    }
    return;
  }

  if (!saved || !isLoggedIn) {
    window.location.href = "login.html";
  }
}

function logoutUser() {
  localStorage.removeItem('mathMateProfile');
  localStorage.removeItem('mathMateLoggedIn');
  window.location.href = 'login.html';
}

// Enforce auth check automatically
checkAuth();
const initialPath = window.location.pathname.split("/").pop() || "index.html";
initPageContent(initialPath);

// ==========================================
// 4. SIDEBAR SNIPPET LOADER
// ==========================================
async function loadSidebar() {
  const container = document.getElementById("sidebar-container");
  if (!container) return;

  try {
    const response = await fetch("sidebar-navigation-snippets/sidebar.html");
    if (response.ok) {
      const html = await response.text();
      container.innerHTML = html;
    }

    if (window.lucide) {
      lucide.createIcons();
    }

    const currentPath = window.location.pathname.split("/").pop();
    if (currentPath === "profile.html") {
      const radio = document.getElementById("nav-profile");
      if (radio) radio.checked = true;
    } else if (currentPath === "people.html") {
      const radio = document.getElementById("nav-people");
      if (radio) radio.checked = true;
    } else if (currentPath === "notifications.html") {
      const radio = document.getElementById("nav-notifications");
      if (radio) radio.checked = true;
    } else {
      const radio = document.getElementById("nav-dashboard");
      if (radio) radio.checked = true;
    }

    const themeInput = document.getElementById("theme");
    if (themeInput) {
      const savedTheme = localStorage.getItem("mathMateTheme");
      if (savedTheme === "dark") {
        themeInput.checked = true;
        document.body.classList.add("dark-mode");
      }

      themeInput.addEventListener("change", function () {
        const isDark = this.checked;
        document.body.classList.toggle("dark-mode", isDark);
        localStorage.setItem("mathMateTheme", isDark ? "dark" : "light");
      });
    }

    const currentProfile = getStoredProfile();
    if (currentProfile) {
      updateSidebarProfileInfo(currentProfile);
    }

  } catch (err) {
    console.error("Error loading sidebar:", err);
  }
}

function updateSidebarProfileInfo(profile) {
  const sidebarName = document.getElementById("sidebarName");
  if (sidebarName) sidebarName.textContent = profile.name || profile.id;

  const sidebarRole = document.getElementById("sidebarRole");
  if (sidebarRole) sidebarRole.textContent = profile.role || "Member";

  const sidebarAvatar = document.getElementById("sidebarAvatar");
  if (sidebarAvatar) {
    if (profile.avatar_url && profile.avatar_url.startsWith("http")) {
      sidebarAvatar.innerHTML = `<img src="${escapeHtml(profile.avatar_url)}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />`;
    } else if (profile.avatar_url && profile.avatar_url.length > 0) {
      sidebarAvatar.innerHTML = `<span style="font-size:1.1rem;">${escapeHtml(profile.avatar_url)}</span>`;
    } else {
      const initials = (profile.name || profile.id).slice(0, 2).toUpperCase();
      sidebarAvatar.innerHTML = `<span style="font-size:0.85rem; font-weight:700;">${initials}</span>`;
    }
  }
}

// ==========================================
// 4. METHOD 2: SPA DYNAMIC CONTENT ROUTER
// ==========================================
async function navigateToPage(targetUrl, pushToHistory = true) {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const targetPath = targetUrl.split("/").pop() || "index.html";

  if (targetPath === "login.html") {
    window.location.href = "login.html";
    return;
  }

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      window.location.href = targetUrl;
      return;
    }
    const htmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    const newMain = doc.querySelector("main.main-content");
    const currentMain = document.querySelector("main.main-content");

    if (newMain && currentMain) {
      currentMain.innerHTML = newMain.innerHTML;
      document.title = doc.title || "Math Mate";

      if (pushToHistory && window.location.pathname !== targetUrl) {
        history.pushState({ path: targetUrl }, "", targetUrl);
      }

      highlightSidebarNav(targetPath);

      if (window.lucide) {
        lucide.createIcons();
      }

      initPageContent(targetPath);
    } else {
      window.location.href = targetUrl;
    }
  } catch (err) {
    console.error("Method 2 SPA Navigation error:", err);
    window.location.href = targetUrl;
  }
}

function highlightSidebarNav(pathName) {
  let radioId = "nav-dashboard";
  if (pathName === "profile.html") radioId = "nav-profile";
  else if (pathName === "people.html") radioId = "nav-people";
  else if (pathName === "notifications.html") radioId = "nav-notifications";

  const radio = document.getElementById(radioId);
  if (radio) radio.checked = true;
}

function initPageContent(pathName) {
  const profile = getStoredProfile();

  if (pathName === "profile.html") {
    renderProfileUI(profile);
  } else if (pathName === "people.html") {
    loadFriendsList();
    loadConversationsList();
    const searchInput = document.getElementById("peopleSearchInput");
    if (searchInput) searchInput.value = "";
  } else if (pathName === "notifications.html") {
    loadNotificationsFeed();
  }
}

window.addEventListener("popstate", (e) => {
  const targetPath = window.location.pathname.split("/").pop() || "index.html";
  navigateToPage(targetPath, false);
});

function switchSection(section) {
  const pageMap = {
    'dashboard': 'index.html',
    'profile': 'profile.html',
    'people': 'people.html',
    'notifications': 'notifications.html'
  };

  if (pageMap[section]) {
    navigateToPage(pageMap[section], true);
  } else if (section === 'role') {
    openPopup('Role Access Protocol', `
      <div style="text-align:center; padding:10px;">
        <i data-lucide="shield-check" style="width:48px; height:48px; color:var(--accent); margin-bottom:12px;"></i>
        <p style="font-weight:600; font-size:1rem;">Role: Member</p>
        <p style="color:var(--muted); font-size:0.85rem; margin-top:8px;">Your account currently has standard member permissions across Math Mate.</p>
      </div>
    `);
    if (window.lucide) lucide.createIcons();
  } else {
    const content = document.getElementById('contentArea');
    if (content) {
      content.innerHTML = `
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:32px; margin-top:20px;">
          <h1 style="text-transform:capitalize; margin-bottom:8px; color:var(--text);">${escapeHtml(section)}</h1>
          <p style="color:var(--soft);">This tab is ready for backend data integration.</p>
        </div>
      `;
    } else {
      navigateToPage('index.html', true);
    }
  }
}

async function renderProfileUI(profile) {
  if (!profile) return;
  const nameEl = document.getElementById("profileNameDisplay");
  if (!nameEl) return; // Exit if not on profile page

  // Fetch latest row from Supabase to ensure progress & stats are fresh
  if (db) {
    const { data: fresh } = await db.from('profiles').select('*').eq('id', profile.id).maybeSingle();
    if (fresh) {
      profile = fresh;
      saveStoredProfile(profile);
    }
  }

  nameEl.textContent = profile.name || profile.id;
  
  const roleEl = document.getElementById("profileRoleDisplay");
  if (roleEl) roleEl.textContent = profile.role || "Member";

  const rankEl = document.getElementById("profileRankDisplay");
  if (rankEl) rankEl.innerHTML = `<i class="icon" data-lucide="trophy"></i> Rank #${profile.rank || 1}`;

  const bioEl = document.getElementById("profileBioDisplay");
  if (bioEl) bioEl.textContent = profile.bio || "No description provided.";

  const xpEl = document.getElementById("profileXpDisplay");
  if (xpEl) xpEl.textContent = `${Number(profile.xp || 0).toLocaleString()} XP`;

  const heartsEl = document.getElementById("profileHeartsDisplay");
  if (heartsEl) heartsEl.textContent = `${profile.hearts || 3} / 3`;

  const goldEl = document.getElementById("profileGoldDisplay");
  if (goldEl) goldEl.textContent = profile.gold || 0;

  const globalRankEl = document.getElementById("profileGlobalRankDisplay");
  if (globalRankEl) globalRankEl.textContent = `#${profile.rank || 1}`;

  // Completed Stats (Courses, Terms, Lessons)
  const coursesCountEl = document.getElementById("profileCoursesCount");
  if (coursesCountEl) coursesCountEl.textContent = `${profile.completed_courses || 0} Completed`;

  const termsCountEl = document.getElementById("completedTermsDisplay");
  if (termsCountEl) termsCountEl.textContent = `${profile.completed_terms || 0} Terms`;

  const lessonsCountEl = document.getElementById("completedLessonsDisplay");
  if (lessonsCountEl) lessonsCountEl.textContent = `${profile.completed_lessons || 0} Lessons`;

  // Avatar rendering
  const avatarContainer = document.getElementById("profileAvatarDisplay");
  if (avatarContainer) {
    if (profile.avatar_url && profile.avatar_url.startsWith("http")) {
      avatarContainer.innerHTML = `<img src="${escapeHtml(profile.avatar_url)}" alt="${escapeHtml(profile.name)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />`;
    } else if (profile.avatar_url && profile.avatar_url.length > 0) {
      avatarContainer.innerHTML = `<span id="profileAvatarText">${escapeHtml(profile.avatar_url)}</span>`;
    } else {
      const initials = (profile.name || profile.id).slice(0, 2).toUpperCase();
      avatarContainer.innerHTML = `<span id="profileAvatarText">${initials}</span>`;
    }
  }

  // Render Sub-components
  renderProfileCourses(profile);
  loadProfileFriendsList(profile);

  if (window.lucide) lucide.createIcons();
}

function renderProfileCourses(profile) {
  const container = document.getElementById("profileCoursesList");
  if (!container) return;

  const completedCount = profile.completed_courses || 0;
  if (completedCount === 0) {
    container.innerHTML = `<p style="color:var(--muted); font-size:0.9rem;">No courses completed yet. Start learning on the Dashboard!</p>`;
    return;
  }

  container.innerHTML = `
    <div style="background:var(--chip); padding:12px 16px; border-radius:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong style="color:var(--text); font-size:0.95rem;">Algebra Foundations</strong>
        <p style="color:var(--muted); font-size:0.8rem; margin:2px 0 0 0;">100% Completed</p>
      </div>
      <span style="color:#22c55e; font-weight:700; font-size:0.85rem;">Completed</span>
    </div>
  `;
}

async function loadProfileFriendsList(profile) {
  const container = document.getElementById("profileFriendsList");
  const countBadge = document.getElementById("profileFriendsCount");
  if (!container) return;

  if (!db) {
    container.innerHTML = '<p style="color:var(--muted);">Database unavailable.</p>';
    return;
  }

  try {
    const { data: friendships, error } = await db
      .from('friendships')
      .select('*, sender:sender_id(id, name, avatar_url), receiver:receiver_id(id, name, avatar_url)')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      .eq('status', 'accepted');

    if (error || !friendships || friendships.length === 0) {
      container.innerHTML = '<p style="color:var(--muted); font-size:0.85rem;">No friends added yet.</p>';
      if (countBadge) countBadge.textContent = '0 Friends';
      return;
    }

    if (countBadge) countBadge.textContent = `${friendships.length} Friends`;

    container.innerHTML = friendships.map(f => {
      const friendObj = f.sender_id === profile.id ? f.receiver : f.sender;
      if (!friendObj) return '';
      const friendName = friendObj.name || friendObj.id;
      const initials = friendName.slice(0, 2).toUpperCase();

      return `
        <div style="display:flex; align-items:center; justify-space-between; background:var(--chip); padding:10px 14px; border-radius:12px; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px; height:36px; border-radius:50%; background:var(--accent); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.85rem;">
              ${initials}
            </div>
            <div>
              <strong style="color:var(--text); font-size:0.9rem;">${escapeHtml(friendName)}</strong>
              <p style="color:var(--muted); font-size:0.75rem; margin:0;">@${escapeHtml(friendObj.id)}</p>
            </div>
          </div>
          <button onclick="openChatWithUser('${escapeHtml(friendObj.id)}', '${escapeHtml(friendName)}')" class="btn btn-primary" style="padding:6px 12px; font-size:0.8rem;">
            Message
          </button>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error("Error loading profile friends:", err);
  }
}

// Profile Editing Modals
function openEditNameModal() {
  const profile = getStoredProfile();
  openPopup('Edit Name Tag', `
    <form onsubmit="saveNewName(event)">
      <div style="margin-bottom:16px;">
        <label style="display:block; font-size:0.85rem; color:var(--muted); margin-bottom:6px;">Name Tag / Display Name</label>
        <input type="text" id="newNameInput" value="${escapeHtml(profile.name || '')}" style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--chip); color:var(--text);" required />
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%;">Save Name Tag</button>
    </form>
  `);
}

async function saveNewName(e) {
  e.preventDefault();
  const newName = document.getElementById('newNameInput').value.trim();
  const profile = getStoredProfile();
  if (!newName || !profile) return;

  if (db) {
    await db.from('profiles').update({ name: newName }).eq('id', profile.id);
  }
  profile.name = newName;
  saveStoredProfile(profile);
  closeStandardPopup();
  renderProfileUI(profile);
  updateSidebarProfileInfo(profile);
}

function openAvatarModal() {
  const profile = getStoredProfile();
  openPopup('Change Avatar', `
    <form onsubmit="saveNewAvatar(event)">
      <div style="margin-bottom:16px;">
        <label style="display:block; font-size:0.85rem; color:var(--muted); margin-bottom:6px;">Image URL or Emoji</label>
        <input type="text" id="newAvatarInput" value="${escapeHtml(profile.avatar_url || '')}" placeholder="https://example.com/photo.jpg or 😎" style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--chip); color:var(--text);" required />
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%;">Save Avatar</button>
    </form>
  `);
}

async function saveNewAvatar(e) {
  e.preventDefault();
  const newAvatar = document.getElementById('newAvatarInput').value.trim();
  const profile = getStoredProfile();
  if (!profile) return;

  if (db) {
    await db.from('profiles').update({ avatar_url: newAvatar }).eq('id', profile.id);
  }
  profile.avatar_url = newAvatar;
  saveStoredProfile(profile);
  closeStandardPopup();
  renderProfileUI(profile);
  updateSidebarProfileInfo(profile);
}

function openEditBioModal() {
  const profile = getStoredProfile();
  openPopup('Edit Bio', `
    <form onsubmit="saveNewBio(event)">
      <div style="margin-bottom:16px;">
        <label style="display:block; font-size:0.85rem; color:var(--muted); margin-bottom:6px;">Bio Description</label>
        <textarea id="newBioInput" rows="3" style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--chip); color:var(--text); font-family:inherit;">${escapeHtml(profile.bio || '')}</textarea>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%;">Save Bio</button>
    </form>
  `);
}

async function saveNewBio(e) {
  e.preventDefault();
  const newBio = document.getElementById('newBioInput').value.trim();
  const profile = getStoredProfile();
  if (!profile) return;

  if (db) {
    await db.from('profiles').update({ bio: newBio }).eq('id', profile.id);
  }
  profile.bio = newBio;
  saveStoredProfile(profile);
  closeStandardPopup();
  renderProfileUI(profile);
}

// Modal Helpers
function openPopup(title, contentHtml) {
  const popup = document.getElementById('standardPopup');
  const titleEl = document.getElementById('standardPopupTitle');
  const contentEl = document.getElementById('standardPopupContent');
  if (!popup || !titleEl || !contentEl) return;

  titleEl.textContent = title;
  contentEl.innerHTML = contentHtml;
  popup.style.display = 'flex';
}

function closeStandardPopup(event) {
  const popup = document.getElementById('standardPopup');
  if (popup) popup.style.display = 'none';
}

// ==========================================
// 6. PEOPLE SEARCH & FRIEND REQUESTS
// ==========================================
let searchTimeout = null;

function handlePeopleSearch(query) {
  const clearBtn = document.getElementById('clearSearchBtn');
  if (clearBtn) clearBtn.style.display = query.length > 0 ? 'block' : 'none';

  clearTimeout(searchTimeout);
  if (!query || query.trim().length === 0) {
    const resultsSection = document.getElementById('searchResultsSection');
    if (resultsSection) resultsSection.style.display = 'none';
    return;
  }

  searchTimeout = setTimeout(() => {
    executePeopleSearch(query.trim());
  }, 300);
}

function clearPeopleSearch() {
  const input = document.getElementById('peopleSearchInput');
  if (input) input.value = '';
  handlePeopleSearch('');
}

async function executePeopleSearch(searchTerm) {
  const profile = getStoredProfile();
  const resultsSection = document.getElementById('searchResultsSection');
  const resultsList = document.getElementById('searchResultsList');
  const countBadge = document.getElementById('searchResultCount');

  if (!resultsSection || !resultsList) return;
  resultsSection.style.display = 'block';
  resultsList.innerHTML = '<p style="color:var(--muted); grid-column:1/-1;">Searching profiles...</p>';

  if (!db) {
    resultsList.innerHTML = '<p style="color:var(--muted); grid-column:1/-1;">Database unavailable.</p>';
    return;
  }

  try {
    const { data: users, error } = await db
      .from('profiles')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`)
      .neq('id', profile.id)
      .limit(10);

    if (error || !users || users.length === 0) {
      resultsList.innerHTML = `<p style="color:var(--muted); grid-column:1/-1;">No users found matching "${escapeHtml(searchTerm)}".</p>`;
      if (countBadge) countBadge.textContent = '0 found';
      return;
    }

    const { data: friendships } = await db
      .from('friendships')
      .select('*')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`);

    if (countBadge) countBadge.textContent = `${users.length} found`;

    resultsList.innerHTML = users.map(u => {
      const existing = friendships ? friendships.find(f => f.sender_id === u.id || f.receiver_id === u.id) : null;
      let actionBtn = `<button class="btn btn-primary" onclick="sendFriendRequest('${escapeHtml(u.id)}')">Add Friend</button>`;

      if (existing) {
        if (existing.status === 'accepted') {
          actionBtn = `<button class="btn btn-secondary" onclick="openChatWithUser('${escapeHtml(u.id)}', '${escapeHtml(u.name)}')">Message</button>`;
        } else if (existing.status === 'pending') {
          actionBtn = `<button class="btn btn-secondary" disabled>Pending</button>`;
        }
      }

      const initials = (u.name || u.id).slice(0, 2).toUpperCase();

      return `
        <div style="background:var(--card); border:1px solid var(--border); padding:16px; border-radius:16px; display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:44px; height:44px; border-radius:50%; background:var(--accent); color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center;">${initials}</div>
            <div>
              <strong style="color:var(--text); font-size:0.95rem;">${escapeHtml(u.name || u.id)}</strong>
              <p style="color:var(--muted); font-size:0.8rem; margin:0;">@${escapeHtml(u.id)} • ${u.role || 'Member'}</p>
            </div>
          </div>
          ${actionBtn}
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error("Search error:", err);
  }
}

async function sendFriendRequest(targetUserId) {
  const profile = getStoredProfile();
  if (!db || !profile) return;

  try {
    await db.from('friendships').insert({
      sender_id: profile.id,
      receiver_id: targetUserId,
      status: 'pending'
    });

    await db.from('notifications').insert({
      recipient_id: targetUserId,
      sender_id: profile.id,
      type: 'friend_request',
      is_read: false
    });

    const searchInput = document.getElementById('peopleSearchInput');
    if (searchInput && searchInput.value) {
      executePeopleSearch(searchInput.value.trim());
    }

  } catch (err) {
    console.error("Error sending friend request:", err);
  }
}

function switchPeopleTab(tab) {
  const friendsBtn = document.getElementById('tabFriendsBtn');
  const groupsBtn = document.getElementById('tabGroupsBtn');
  const friendsSec = document.getElementById('friendsSection');
  const groupsSec = document.getElementById('groupsSection');

  if (tab === 'friends') {
    if (friendsBtn) friendsBtn.classList.add('active');
    if (groupsBtn) groupsBtn.classList.remove('active');
    if (friendsSec) friendsSec.style.display = 'block';
    if (groupsSec) groupsSec.style.display = 'none';
    loadFriendsList();
  } else {
    if (groupsBtn) groupsBtn.classList.add('active');
    if (friendsBtn) friendsBtn.classList.remove('active');
    if (groupsSec) groupsSec.style.display = 'block';
    if (friendsSec) friendsSec.style.display = 'none';
    loadConversationsList();
  }
}

async function loadFriendsList() {
  const profile = getStoredProfile();
  const container = document.getElementById('friendsList');
  const countBadge = document.getElementById('friendsCount');
  if (!container || !profile) return;

  if (!db) {
    container.innerHTML = '<p style="color:var(--muted);">Database unavailable.</p>';
    return;
  }

  try {
    const { data: friendships, error } = await db
      .from('friendships')
      .select('*, sender:sender_id(id, name, avatar_url), receiver:receiver_id(id, name, avatar_url)')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      .eq('status', 'accepted');

    if (error || !friendships || friendships.length === 0) {
      container.innerHTML = '<p style="color:var(--muted); font-size:0.9rem;">No friends added yet. Type an ID or Name in search above to connect!</p>';
      if (countBadge) countBadge.textContent = '0 Friends';
      return;
    }

    if (countBadge) countBadge.textContent = `${friendships.length} Friends`;

    container.innerHTML = friendships.map(f => {
      const friendObj = f.sender_id === profile.id ? f.receiver : f.sender;
      if (!friendObj) return '';
      const friendName = friendObj.name || friendObj.id;
      const initials = friendName.slice(0, 2).toUpperCase();

      return `
        <div style="background:var(--card); border:1px solid var(--border); padding:16px; border-radius:16px; display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:44px; height:44px; border-radius:50%; background:var(--accent); color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center;">${initials}</div>
            <div>
              <strong style="color:var(--text); font-size:0.95rem;">${escapeHtml(friendName)}</strong>
              <p style="color:var(--muted); font-size:0.8rem; margin:0;">@${escapeHtml(friendObj.id)}</p>
            </div>
          </div>
          <button class="btn btn-primary" onclick="openChatWithUser('${escapeHtml(friendObj.id)}', '${escapeHtml(friendName)}')">Direct Message</button>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error("Error loading friends list:", err);
  }
}

// ==========================================
// 7. NOTIFICATIONS FEED SYSTEM
// ==========================================
async function loadNotificationsFeed() {
  const feed = document.getElementById('notificationsFeed');
  const profile = getStoredProfile();
  if (!feed || !profile) return;

  if (!db) {
    feed.innerHTML = '<p style="color:var(--muted);">Database unavailable.</p>';
    return;
  }

  try {
    const { data: notifs, error } = await db
      .from('notifications')
      .select('*, sender:sender_id(id, name)')
      .eq('recipient_id', profile.id)
      .order('created_at', { ascending: false });

    if (error || !notifs || notifs.length === 0) {
      feed.innerHTML = '<p style="color:var(--muted); font-size:0.9rem;">You have no notifications right now.</p>';
      return;
    }

    feed.innerHTML = notifs.map(n => {
      const senderName = n.sender ? (n.sender.name || n.sender.id) : 'User';
      const senderId = n.sender_id;
      const initials = senderName.slice(0, 2).toUpperCase();

      return `
        <div style="background:var(--card); border:1px solid var(--border); padding:16px; border-radius:16px; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:40px; height:40px; border-radius:50%; background:var(--accent); color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center;">${initials}</div>
            <div>
              <p style="margin:0; font-weight:600; font-size:0.9rem; color:var(--text);">${escapeHtml(senderName)} sent you a friend request.</p>
              <span style="font-size:0.75rem; color:var(--muted);">Friend Request</span>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-primary" onclick="acceptFriendRequestFromNotif('${n.id}', '${escapeHtml(senderId)}')">Accept</button>
            <button class="btn btn-secondary" onclick="declineFriendRequestFromNotif('${n.id}')">Decline</button>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error("Error loading notifications:", err);
  }
}

async function markAllNotificationsAsRead() {
  const profile = getStoredProfile();
  if (!db || !profile) return;

  await db.from('notifications').update({ is_read: true }).eq('recipient_id', profile.id);
  loadNotificationsFeed();
}

async function acceptFriendRequestFromNotif(notifId, senderId) {
  const profile = getStoredProfile();
  if (!db || !profile) return;

  try {
    // 1. Update friendship status to accepted
    await db
      .from('friendships')
      .update({ status: 'accepted' })
      .or(`and(sender_id.eq.${senderId},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${senderId})`);

    // 2. Automatically create Direct Message conversation if it doesn't exist
    const { data: userConvs } = await db.from('conversation_members').select('conversation_id').eq('user_id', profile.id);
    let convId = null;

    if (userConvs && userConvs.length > 0) {
      const convIds = userConvs.map(c => c.conversation_id);
      const { data: shared } = await db
        .from('conversation_members')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('user_id', senderId);

      if (shared && shared.length > 0) {
        convId = shared[0].conversation_id;
      }
    }

    if (!convId) {
      const { data: newConv } = await db.from('conversations').insert({ is_group: false }).select().single();
      if (newConv) {
        await db.from('conversation_members').insert([
          { conversation_id: newConv.id, user_id: profile.id },
          { conversation_id: newConv.id, user_id: senderId }
        ]);
      }
    }

    // 3. Mark notification as read
    await db.from('notifications').update({ is_read: true }).eq('id', notifId);

    loadNotificationsFeed();

  } catch (err) {
    console.error("Error accepting request:", err);
  }
}

async function declineFriendRequestFromNotif(notifId) {
  if (!db) return;
  await db.from('notifications').update({ is_read: true }).eq('id', notifId);
  loadNotificationsFeed();
}

async function checkUnreadNotifications() {
  const profile = getStoredProfile();
  if (!db || !profile) return;

  const { data: unread } = await db
    .from('notifications')
    .select('id')
    .eq('recipient_id', profile.id)
    .eq('is_read', false);

  const notifRadio = document.getElementById('nav-notifications');
  if (notifRadio && unread && unread.length > 0) {
    const parentLabel = notifRadio.nextElementSibling;
    if (parentLabel && !parentLabel.querySelector('.unread-badge')) {
      const badge = document.createElement('span');
      badge.className = 'unread-badge';
      badge.style.cssText = 'width:8px; height:8px; background:#ef4444; border-radius:50%; display:inline-block; margin-left:auto;';
      parentLabel.appendChild(badge);
    }
  }
}

setInterval(checkUnreadNotifications, 10000);

// ==========================================
// 8. DIRECT MESSAGING & GROUP CHATS ENGINE
// ==========================================
let activeConversationId = null;

async function loadConversationsList() {
  const profile = getStoredProfile();
  const container = document.getElementById('groupChatsList');
  if (!container || !profile || !db) return;

  try {
    const { data: members } = await db.from('conversation_members').select('conversation_id').eq('user_id', profile.id);
    if (!members || members.length === 0) {
      container.innerHTML = '<p style="color:var(--muted); font-size:0.9rem;">No active chats yet. Connect with friends to start messaging!</p>';
      return;
    }

    const convIds = members.map(m => m.conversation_id);
    const { data: convs } = await db.from('conversations').select('*').in('id', convIds);

    if (!convs || convs.length === 0) {
      container.innerHTML = '<p style="color:var(--muted); font-size:0.9rem;">No conversations found.</p>';
      return;
    }

    container.innerHTML = await Promise.all(convs.map(async c => {
      let title = c.title || 'Chat';
      if (!c.is_group) {
        const { data: otherMembers } = await db
          .from('conversation_members')
          .select('user_id, profile:user_id(name, id)')
          .eq('conversation_id', c.id)
          .neq('user_id', profile.id)
          .single();

        if (otherMembers && otherMembers.profile) {
          title = otherMembers.profile.name || otherMembers.profile.id;
        }
      }

      return `
        <div style="background:var(--card); border:1px solid var(--border); padding:16px; border-radius:16px; display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <div>
            <strong style="color:var(--text); font-size:0.95rem;">${escapeHtml(title)}</strong>
            <p style="color:var(--muted); font-size:0.8rem; margin:2px 0 0 0;">${c.is_group ? 'Group Chat' : 'Direct Message'}</p>
          </div>
          <button class="btn btn-primary" onclick="openGroupChatWindow('${c.id}', '${escapeHtml(title)}')">Open Chat</button>
        </div>
      `;
    })).then(items => items.join(''));

  } catch (err) {
    console.error("Error loading conversations:", err);
  }
}

async function openChatWithUser(friendId, friendName) {
  const profile = getStoredProfile();
  if (!db || !profile) return;

  try {
    // Check if conversation exists
    const { data: myConvs } = await db.from('conversation_members').select('conversation_id').eq('user_id', profile.id);
    let convId = null;

    if (myConvs && myConvs.length > 0) {
      const ids = myConvs.map(c => c.conversation_id);
      const { data: shared } = await db
        .from('conversation_members')
        .select('conversation_id')
        .in('conversation_id', ids)
        .eq('user_id', friendId);

      if (shared && shared.length > 0) {
        convId = shared[0].conversation_id;
      }
    }

    if (!convId) {
      const { data: newConv } = await db.from('conversations').insert({ is_group: false }).select().single();
      if (newConv) {
        convId = newConv.id;
        await db.from('conversation_members').insert([
          { conversation_id: convId, user_id: profile.id },
          { conversation_id: convId, user_id: friendId }
        ]);
      }
    }

    openGroupChatWindow(convId, friendName);

  } catch (err) {
    console.error("Error opening chat:", err);
  }
}

function openGroupChatWindow(convId, title) {
  activeConversationId = convId;
  const overlay = document.getElementById('activeChatOverlay');
  const titleEl = document.getElementById('chatTitle');

  if (titleEl) titleEl.textContent = title;
  if (overlay) overlay.style.display = 'flex';

  loadChatMessages(convId);
  subscribeToLiveMessages(convId);
}

async function loadChatMessages(convId) {
  const feed = document.getElementById('messageFeed');
  const profile = getStoredProfile();
  if (!feed || !db) return;

  try {
    const { data: msgs } = await db
      .from('messages')
      .select('*, sender:sender_id(name, id)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (!msgs || msgs.length === 0) {
      feed.innerHTML = '<p style="color:var(--muted); text-align:center; padding:20px;">No messages yet. Say hello!</p>';
      return;
    }

    feed.innerHTML = msgs.map(m => {
      const isMe = m.sender_id === profile.id;
      const senderName = m.sender ? (m.sender.name || m.sender.id) : m.sender_id;

      return `
        <div style="display:flex; flex-direction:column; align-items:${isMe ? 'flex-end' : 'flex-start'}; margin-bottom:12px;">
          <span style="font-size:0.75rem; color:var(--muted); margin-bottom:2px;">${escapeHtml(senderName)}</span>
          <div style="background:${isMe ? 'var(--accent)' : 'var(--chip)'}; color:${isMe ? '#fff' : 'var(--text)'}; padding:10px 14px; border-radius:14px; max-width:75%; font-size:0.9rem;">
            ${escapeHtml(m.content)}
          </div>
        </div>
      `;
    }).join('');

    feed.scrollTop = feed.scrollHeight;

  } catch (err) {
    console.error("Error loading chat messages:", err);
  }
}

async function sendChatMessage(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('chatMessageInput');
  const profile = getStoredProfile();
  if (!input || !activeConversationId || !profile || !db) return;

  const text = input.value.trim();
  if (!text) return;

  input.value = '';

  await db.from('messages').insert({
    conversation_id: activeConversationId,
    sender_id: profile.id,
    content: text
  });

  loadChatMessages(activeConversationId);
}

function subscribeToLiveMessages(convId) {
  if (!db) return;
  db.channel(`public:messages:${convId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` }, () => {
      loadChatMessages(convId);
    })
    .subscribe();
}

function closeChatOverlay() {
  const overlay = document.getElementById('activeChatOverlay');
  if (overlay) overlay.style.display = 'none';
  activeConversationId = null;
}

// Group Chat Creation
async function openCreateGroupModal() {
  const profile = getStoredProfile();
  if (!db || !profile) return;

  const { data: friendships } = await db
    .from('friendships')
    .select('*, sender:sender_id(id, name), receiver:receiver_id(id, name)')
    .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
    .eq('status', 'accepted');

  if (!friendships || friendships.length === 0) {
    openPopup('Create Group Chat', '<p style="color:var(--muted);">You need at least 1 friend to create a group chat.</p>');
    return;
  }

  const friendsListHtml = friendships.map(f => {
    const friendObj = f.sender_id === profile.id ? f.receiver : f.sender;
    if (!friendObj) return '';
    return `
      <label style="display:flex; align-items:center; gap:8px; margin-bottom:8px; cursor:pointer;">
        <input type="checkbox" name="groupMembers" value="${escapeHtml(friendObj.id)}" />
        <span style="color:var(--text); font-size:0.9rem;">${escapeHtml(friendObj.name || friendObj.id)}</span>
      </label>
    `;
  }).join('');

  openPopup('Create Group Chat', `
    <form onsubmit="submitCreateGroup(event)">
      <div style="margin-bottom:14px;">
        <label style="display:block; font-size:0.85rem; color:var(--muted); margin-bottom:6px;">Group Title</label>
        <input type="text" id="groupTitleInput" placeholder="e.g. Math Study Group" style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--chip); color:var(--text);" required />
      </div>
      <div style="margin-bottom:16px;">
        <label style="display:block; font-size:0.85rem; color:var(--muted); margin-bottom:6px;">Select Members</label>
        <div style="max-height:150px; overflow-y:auto; background:var(--chip); padding:10px; border-radius:10px;">
          ${friendsListHtml}
        </div>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%;">Create Group</button>
    </form>
  `);
}

async function submitCreateGroup(e) {
  e.preventDefault();
  const profile = getStoredProfile();
  const title = document.getElementById('groupTitleInput').value.trim();
  const checkboxes = document.querySelectorAll('input[name="groupMembers"]:checked');
  if (!profile || !db || !title) return;

  const memberIds = [profile.id];
  checkboxes.forEach(cb => memberIds.push(cb.value));

  const { data: newGroup } = await db.from('conversations').insert({ title: title, is_group: true }).select().single();
  if (newGroup) {
    const memberRows = memberIds.map(uid => ({ conversation_id: newGroup.id, user_id: uid }));
    await db.from('conversation_members').insert(memberRows);
    closeStandardPopup();
    loadConversationsList();
    openGroupChatWindow(newGroup.id, title);
  }
}

// Stubs for group actions
function openEditGroupNameModal() { openPopup('Edit Group', '<p>Edit title feature enabled in settings.</p>'); }
function openAddMembersModal() { openPopup('Add Members', '<p>Add members feature enabled.</p>'); }
function leaveGroupChat() { closeChatOverlay(); }

// ==========================================
// 9. AUTOMATIC INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  loadSidebar();
  
  const currentProfile = getStoredProfile();
  if (currentProfile) {
    renderProfileUI(currentProfile);
  }

  const path = window.location.pathname.split("/").pop();
  if (path === 'people.html') {
    switchPeopleTab('friends');
  } else if (path === 'notifications.html') {
    loadNotificationsFeed();
  }
});

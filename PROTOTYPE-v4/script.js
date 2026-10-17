// ==========================================
// 1. SUPABASE BACKEND INITIALIZATION (PROTOTYPE)
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
// 2. TEMPLATE PROFILE DATA (LOCAL & REUSABLE)
// ==========================================
const DEFAULT_PROFILE = {
  id: 'user_default',
  name: 'Math Explorer',
  role: 'Member',
  avatar_url: '', 
  bio: 'Passionate about solving complex math puzzles and climbing the global leaderboard!',
  xp: 1250,
  hearts: 3,
  gold: 150,
  rank: 4,
  last_name_change: null, // Timestamp for 7-day rule
  courses: [
    { id: 1, title: 'Algebra Foundations', progress: '85%' },
    { id: 2, title: 'Geometry Essentials', progress: '60%' },
    { id: 3, title: 'Mental Math Tricks', progress: '30%' }
  ],
  friends: [
    { name: 'Alex Rivera', role: 'Top Solver', avatar: 'AR' },
    { name: 'Sarah Chen', role: 'Wizard', avatar: 'SC' },
    { name: 'Leo Gomez', role: 'Member', avatar: 'LG' },
    { name: 'Emma Watson', role: 'Explorer', avatar: 'EW' }
  ]
};

function getStoredProfile() {
  const saved = localStorage.getItem('mathMateProfile');
  if (saved) {
    try {
      return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
    } catch (e) {
      console.error("Error reading saved profile:", e);
    }
  }
  return DEFAULT_PROFILE;
}

function saveStoredProfile(profileData) {
  localStorage.setItem('mathMateProfile', JSON.stringify(profileData));
}

// ==========================================
// 3. GLOBAL SIDEBAR SNIPPET LOADER (OPTION 1)
// ==========================================
async function loadSidebar() {
  const container = document.getElementById("sidebar-container");
  if (!container) return;

  try {
    const response = await fetch("sidebar-navigation-snippets/sidebar.html");
    const html = await response.text();
    container.innerHTML = html;

    // Render Lucide icons
    if (window.lucide) {
      lucide.createIcons();
    }

    // Set correct active tab radio based on current page URL
    const currentPath = window.location.pathname.split("/").pop();
    if (currentPath === "profile.html") {
      const radio = document.getElementById("nav-profile");
      if (radio) radio.checked = true;
    } else {
      const radio = document.getElementById("nav-dashboard");
      if (radio) radio.checked = true;
    }

    // Restore and handle Dark Mode
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

    // Synchronize sidebar profile display
    const currentProfile = getStoredProfile();
    updateSidebarProfileInfo(currentProfile);

  } catch (err) {
    console.error("Error loading sidebar snippet:", err);
  }
}

function updateSidebarProfileInfo(profile) {
  const sidebarName = document.getElementById("sidebarName");
  if (sidebarName) sidebarName.textContent = profile.name;

  const sidebarRole = document.getElementById("sidebarRole");
  if (sidebarRole) sidebarRole.textContent = profile.role || "Member";

  const sidebarAvatar = document.getElementById("sidebarAvatar");
  if (sidebarAvatar) {
    if (profile.avatar_url && (profile.avatar_url.startsWith("http://") || profile.avatar_url.startsWith("https://"))) {
      sidebarAvatar.innerHTML = `<img src="${escapeHtml(profile.avatar_url)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="Avatar" />`;
    } else if (profile.avatar_url && profile.avatar_url.length > 0) {
      sidebarAvatar.textContent = profile.avatar_url;
    } else {
      const initials = profile.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "MM";
      sidebarAvatar.textContent = initials;
    }
  }
}

// ==========================================
// 4. NAVIGATION SWITCHER
// ==========================================
function switchSection(section) {
  if (section === 'profile') {
    window.location.href = 'profile.html';
  } else if (section === 'dashboard') {
    window.location.href = 'index.html';
  } else {
    const content = document.getElementById("contentArea");
    if (content) {
      content.innerHTML = `
        <div class="welcome-card">
          <h1>${section.charAt(0).toUpperCase() + section.slice(1)}</h1>
          <p>This tab is fully styled and ready for backend content integration!</p>
        </div>
      `;
    }
  }
}

// ==========================================
// 5. PROFILE TEMPLATE UI RENDERER & ACTIONS
// ==========================================
function renderProfileUI(profile) {
  const nameEl = document.getElementById("profileNameDisplay");
  if (!nameEl) return; // Exit if not on profile page

  nameEl.textContent = profile.name;
  document.getElementById("profileRoleDisplay").textContent = profile.role || "Member";
  document.getElementById("profileRankDisplay").innerHTML = `<i class="icon" data-lucide="trophy"></i> Rank #${profile.rank}`;
  document.getElementById("profileBioDisplay").textContent = profile.bio || "No description provided.";
  
  document.getElementById("profileXpDisplay").textContent = `${Number(profile.xp).toLocaleString()} XP`;
  document.getElementById("profileHeartsDisplay").textContent = `${profile.hearts} / 3`;
  document.getElementById("profileGoldDisplay").textContent = profile.gold;
  document.getElementById("profileGlobalRankDisplay").textContent = `#${profile.rank}`;

  // Avatar rendering (Image URL or Emoji/Initials)
  const avatarContainer = document.getElementById("profileAvatarDisplay");
  if (profile.avatar_url && (profile.avatar_url.startsWith("http://") || profile.avatar_url.startsWith("https://"))) {
    avatarContainer.innerHTML = `<img src="${escapeHtml(profile.avatar_url)}" alt="${escapeHtml(profile.name)}" />`;
  } else if (profile.avatar_url && profile.avatar_url.length > 0) {
    avatarContainer.innerHTML = `<span id="profileAvatarText">${escapeHtml(profile.avatar_url)}</span>`;
  } else {
    const initials = profile.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "MM";
    avatarContainer.innerHTML = `<span id="profileAvatarText">${initials}</span>`;
  }

  // Render Enrolled Courses
  const coursesContainer = document.getElementById("profileCoursesList");
  if (coursesContainer && profile.courses) {
    document.getElementById("profileCoursesCount").textContent = `${profile.courses.length} Active`;
    coursesContainer.innerHTML = profile.courses.map(c => `
      <div class="course-item">
        <div class="course-info">
          <span class="course-title">${escapeHtml(c.title)}</span>
          <span class="course-progress-text">${escapeHtml(c.progress)} Completed</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${c.progress};"></div>
        </div>
      </div>
    `).join("");
  }

  // Render Friends List
  const friendsContainer = document.getElementById("profileFriendsList");
  if (friendsContainer && profile.friends) {
    document.getElementById("profileFriendsCount").textContent = `${profile.friends.length} Friends`;
    friendsContainer.innerHTML = profile.friends.map(f => `
      <div class="friend-item">
        <div class="friend-avatar">${escapeHtml(f.avatar)}</div>
        <div class="friend-details">
          <span class="friend-name">${escapeHtml(f.name)}</span>
          <span class="friend-role">${escapeHtml(f.role)}</span>
        </div>
      </div>
    `).join("");
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

// ------------------------------------------
// 7-DAY NAME CHANGE COOLDOWN MODAL
// ------------------------------------------
function openEditNameModal() {
  const profile = getStoredProfile();
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  if (profile.last_name_change) {
    const elapsed = now - profile.last_name_change;
    if (elapsed < SEVEN_DAYS_MS) {
      const daysLeft = Math.ceil((SEVEN_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000));
      openPopup(
        "Name Change Cooldown",
        `<p style="margin-bottom:12px; color:var(--soft); font-size:0.9rem;">
          You can only change your display name once every 7 days.
         </p>
         <div style="background:var(--chip); padding:14px; border-radius:12px; text-align:center; font-weight:600; color:var(--text);">
          ⏳ ${daysLeft} day(s) remaining before you can update your name again.
         </div>`
      );
      return;
    }
  }

  openPopup(
    "Edit Display Name",
    `<form onsubmit="saveNewName(event)">
      <p style="font-size:0.85rem; color:var(--soft); margin-bottom:12px;">
        Note: You can only change your display name once every 7 days.
      </p>
      <input type="text" id="newNameInput" value="${escapeHtml(profile.name)}" required
        style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid var(--border); background:var(--chip); color:var(--text); font-size:0.95rem; margin-bottom:16px;" />
      <button type="submit" style="width:100%; padding:12px; background:var(--accent); color:#ffffff; border:none; border-radius:10px; font-weight:600; font-size:0.95rem; cursor:pointer;">
        Save Name
      </button>
    </form>`
  );
}

function saveNewName(e) {
  e.preventDefault();
  const inputEl = document.getElementById("newNameInput");
  if (!inputEl) return;
  const newName = inputEl.value.trim();
  if (!newName) return;

  const profile = getStoredProfile();
  profile.name = newName;
  profile.last_name_change = Date.now();
  saveStoredProfile(profile);

  closeStandardPopup();
  renderProfileUI(profile);
  updateSidebarProfileInfo(profile);
}

// ------------------------------------------
// AVATAR CUSTOMIZATION MODAL
// ------------------------------------------
function openAvatarModal() {
  const profile = getStoredProfile();
  openPopup(
    "Customize Avatar",
    `<form onsubmit="saveNewAvatar(event)">
      <label style="font-size:0.85rem; font-weight:600; color:var(--soft); display:block; margin-bottom:6px;">
        Image URL, Emoji, or Initials
      </label>
      <input type="text" id="newAvatarInput" placeholder="https://example.com/avatar.png or 🧙‍♂️" value="${escapeHtml(profile.avatar_url || '')}"
        style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid var(--border); background:var(--chip); color:var(--text); font-size:0.95rem; margin-bottom:8px;" />
      <p style="font-size:0.75rem; color:var(--muted); margin-bottom:16px;">
        Paste a web URL starting with http:// or https://, or enter an emoji/2-letter initial.
      </p>
      <button type="submit" style="width:100%; padding:12px; background:var(--accent); color:#ffffff; border:none; border-radius:10px; font-weight:600; font-size:0.95rem; cursor:pointer;">
        Save Avatar
      </button>
    </form>`
  );
}

function saveNewAvatar(e) {
  e.preventDefault();
  const inputEl = document.getElementById("newAvatarInput");
  if (!inputEl) return;
  const val = inputEl.value.trim();

  const profile = getStoredProfile();
  profile.avatar_url = val;
  saveStoredProfile(profile);

  closeStandardPopup();
  renderProfileUI(profile);
  updateSidebarProfileInfo(profile);
}

// ------------------------------------------
// DESCRIPTION / BIO CUSTOMIZATION MODAL
// ------------------------------------------
function openEditBioModal() {
  const profile = getStoredProfile();
  openPopup(
    "Edit Description",
    `<form onsubmit="saveNewBio(event)">
      <textarea id="newBioInput" rows="4" style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid var(--border); background:var(--chip); color:var(--text); font-size:0.9rem; margin-bottom:16px; resize:vertical;">${escapeHtml(profile.bio || '')}</textarea>
      <button type="submit" style="width:100%; padding:12px; background:var(--accent); color:#ffffff; border:none; border-radius:10px; font-weight:600; font-size:0.95rem; cursor:pointer;">
        Save Description
      </button>
    </form>`
  );
}

function saveNewBio(e) {
  e.preventDefault();
  const inputEl = document.getElementById("newBioInput");
  if (!inputEl) return;

  const profile = getStoredProfile();
  profile.bio = inputEl.value.trim();
  saveStoredProfile(profile);

  closeStandardPopup();
  renderProfileUI(profile);
}

// ==========================================
// 6. REUSABLE POPUP SYSTEM
// ==========================================
function openPopup(title, contentHtml) {
  const overlay = document.getElementById("standardPopup");
  const titleEl = document.getElementById("standardPopupTitle");
  const contentEl = document.getElementById("standardPopupContent");

  if (overlay && titleEl && contentEl) {
    titleEl.innerText = title;
    contentEl.innerHTML = contentHtml;
    overlay.classList.add("active");
  }
}

function closeStandardPopup(event) {
  const overlay = document.getElementById("standardPopup");
  if (overlay) {
    if (!event || event.target.id === "standardPopup" || event.target.classList.contains("close-btn")) {
      overlay.classList.remove("active");
    }
  }
}

// ==========================================
// 7. PAGE LOAD INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();
  const initialProfile = getStoredProfile();
  renderProfileUI(initialProfile);
});

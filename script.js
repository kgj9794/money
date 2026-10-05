const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwB46MO3t7uWLvQLGv-HTfkxyX946K0oJUVhvqAQxBPoNoD_78ytz4WBje8U0J66K2S/exec";

const mainHeader = document.getElementById('mainHeader');
const headerUserName = document.getElementById('headerUserName');
const headerUserSideBadge = document.getElementById('headerUserSideBadge');
const headerLogoutBtn = document.getElementById('headerLogoutBtn');

const sessionTimerDisplay = document.getElementById('sessionTimerDisplay');
const sessionTimerCount = document.getElementById('sessionTimerCount');

const navRegisterBtn = document.getElementById('navRegisterBtn');
const navListBtn = document.getElementById('navListBtn');

const authCard = document.getElementById('authCard');
const appContent = document.getElementById('appContent');

const registerSection = document.getElementById('registerSection');
const listSection = document.getElementById('listSection');

const goToSignupBtn = document.getElementById('goToSignupBtn');
const goToLoginBtn = document.getElementById('goToLoginBtn');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const giftForm = document.getElementById('giftForm');

const nameInput = document.getElementById('name');
const amountInput = document.getElementById('amount');
const toastContainer = document.getElementById('toastContainer');

const statTotalCount = document.getElementById('statTotalCount');
const statSideLabel = document.getElementById('statSideLabel');
const statSideTotal = document.getElementById('statSideTotal');
const statSideCard = document.getElementById('statSideCard');
const listSubTitle = document.getElementById('listSubTitle');

const giftTableBody = document.getElementById('giftTableBody');
const emptyListState = document.getElementById('emptyListState');
const refreshListBtn = document.getElementById('refreshListBtn');
const listSearchInput = document.getElementById('listSearchInput');
const myRegistrationOnly = document.getElementById('myRegistrationOnly');

const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const editRowId = document.getElementById('editRowId');
const editTarget = document.getElementById('editTarget');
const editName = document.getElementById('editName');
const editAmount = document.getElementById('editAmount');
const editNote = document.getElementById('editNote');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// 튜토리얼 요소
const tutorialModal = document.getElementById('tutorialModal');
const closeTutorialBtn = document.getElementById('closeTutorialBtn');
const dontShowTutorialCheck = document.getElementById('dontShowTutorialCheck');

let cachedGifts = [];
let activeToast = null;
let currentAmountAnimationId = null;
let currentTargetAmount = 0; // 연타 시 목표 금액 누적 상태 유지 변수

// 세션 관리 변수 (30분 = 1800초)
const SESSION_DURATION_MS = 30.1 * 60 * 1000;
let sessionIntervalId = null;
let lastActivityTime = Date.now();

document.addEventListener('DOMContentLoaded', async () => {
  setupLongPressAdminLink(); // 5초 길게 누르기 바인딩
  setupActivityTracker();    // 사용자 활동 감지 바인딩

  const savedUser = localStorage.getItem('wedding_app_user');
  const savedSide = localStorage.getItem('wedding_app_user_side');
  const savedUserId = localStorage.getItem('wedding_app_user_id');
  const savedToken = localStorage.getItem('wedding_app_session_token');
  const savedLastActivity = localStorage.getItem('wedding_app_last_activity');

  if (savedUser && savedSide && savedUserId && savedToken) {
    const now = Date.now();
    const lastActive = savedLastActivity ? parseInt(savedLastActivity, 10) : now;
    
    if (now - lastActive >= SESSION_DURATION_MS) {
      clearUserSession();
      setLoggedOutState();
      showToast("30분 동안 활동이 없어 자동 로그아웃되었습니다.", "error");
      return;
    }

    try {
      const result = await sendRequest({
        action: 'verifyToken',
        userId: savedUserId,
        token: savedToken
      });

      if (result.status === 'success') {
        localStorage.setItem('wedding_app_user', result.userName);
        localStorage.setItem('wedding_app_user_side', result.userSide);
        lastActivityTime = lastActive;
        setLoggedInState(result.userName, result.userSide);
        startSessionTimer();
      } else {
        clearUserSession();
        setLoggedOutState();
        showToast("세션이 만료되었습니다. 다시 로그인해주세요.", "error");
      }
    } catch (err) {
      clearUserSession();
      setLoggedOutState();
      showToast("네트워크 오류로 세션을 확인할 수 없습니다.", "error");
    }
  } else {
    clearUserSession();
    setLoggedOutState();
  }
});

// 🔑 미사용 감지 및 5초 뒤 타이머 표기 제어 로직
function resetActivityTime() {
  if (!localStorage.getItem('wedding_app_session_token')) return;
  lastActivityTime = Date.now();
  localStorage.setItem('wedding_app_last_activity', lastActivityTime.toString());
  
  // 사용 중인 상태이므로 표기 숨김 및 타이머 해제 효과
  if (sessionTimerDisplay) {
    sessionTimerDisplay.classList.remove('visible');
  }
}

function setupActivityTracker() {
  const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
  let throttleTimer = null;

  events.forEach(eventName => {
    window.addEventListener(eventName, () => {
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          resetActivityTime();
          throttleTimer = null;
        }, 500);
      }
    }, { passive: true });
  });
}

function startSessionTimer() {
  if (sessionIntervalId) clearInterval(sessionIntervalId);

  sessionIntervalId = setInterval(() => {
    const now = Date.now();
    const elapsed = now - lastActivityTime;
    const remainingMs = SESSION_DURATION_MS - elapsed;

    if (remainingMs <= 0) {
      clearInterval(sessionIntervalId);
      sessionIntervalId = null;
      clearUserSession();
      setLoggedOutState();
      showToast("30분 동안 미사용으로 자동 로그아웃되었습니다.", "error");
      return;
    }

    // 마지막 활동 시점으로부터 5초(5000ms) 이상 경과한 경우에만 타이머 표기 노출
    if (elapsed >= 5000) {
      updateSessionTimerDisplay(remainingMs);
      if (sessionTimerDisplay && !sessionTimerDisplay.classList.contains('visible')) {
        sessionTimerDisplay.classList.add('visible');
      }
    } else {
      if (sessionTimerDisplay && sessionTimerDisplay.classList.contains('visible')) {
        sessionTimerDisplay.classList.remove('visible');
      }
    }
  }, 1000);
}

function stopSessionTimer() {
  if (sessionIntervalId) {
    clearInterval(sessionIntervalId);
    sessionIntervalId = null;
  }
  if (sessionTimerDisplay) {
    sessionTimerDisplay.classList.remove('visible');
  }
}

function updateSessionTimerDisplay(remainingMs) {
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const formattedMin = String(minutes).padStart(2, '0');
  const formattedSec = String(seconds).padStart(2, '0');

  if (sessionTimerCount) {
    sessionTimerCount.textContent = `${formattedMin}:${formattedSec}`;
  }
}

// 🔑 Wedding Day 5초 이상 길게 누르면 admin.html로 이동하는 롱프레스 로직
function setupLongPressAdminLink() {
  const heroBadge = document.querySelector('.hero-badge');
  if (!heroBadge) return;

  let longPressTimer = null;

  const startTimer = () => {
    longPressTimer = setTimeout(() => {
      window.location.href = 'admin.html';
    }, 5000);
  };

  const clearTimer = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  heroBadge.addEventListener('mousedown', startTimer);
  heroBadge.addEventListener('mouseup', clearTimer);
  heroBadge.addEventListener('mouseleave', clearTimer);

  heroBadge.addEventListener('touchstart', (e) => {
    startTimer();
  }, { passive: true });
  heroBadge.addEventListener('touchend', clearTimer);
  heroBadge.addEventListener('touchcancel', clearTimer);

  heroBadge.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
}

function triggerAnimation(el, className = 'animate-fade-in-up') {
  el.classList.remove(
    'animate-fade-in-up',
    'animate-scale-in',
    'animate-fade-in-down',
    'animate-slide-in-left',
    'animate-slide-in-right'
  );
  void el.offsetWidth;
  el.classList.add(className);
}

// 튜토리얼 자동 표시 및 제어
function checkAndShowTutorial() {
  const isHide = localStorage.getItem('wedding_app_tutorial_seen');
  if (!isHide) {
    tutorialModal.classList.remove('hidden');
    triggerAnimation(tutorialModal.querySelector('.modal-content'), 'animate-scale-in');
  }
}

closeTutorialBtn.addEventListener('click', () => {
  if (dontShowTutorialCheck.checked) {
    localStorage.setItem('wedding_app_tutorial_seen', 'true');
  }
  tutorialModal.classList.add('hidden');
});

// 축의금 등록 탭 이동
navRegisterBtn.addEventListener('click', () => {
  if (navRegisterBtn.classList.contains('active')) return;

  navRegisterBtn.classList.add('active');
  navListBtn.classList.remove('active');
  listSection.classList.add('hidden');
  registerSection.classList.remove('hidden');
  triggerAnimation(registerSection, 'animate-slide-in-left');
});

// 등록 내역 목록 탭 이동
navListBtn.addEventListener('click', () => {
  if (navListBtn.classList.contains('active')) return;

  navListBtn.classList.add('active');
  navRegisterBtn.classList.remove('active');
  registerSection.classList.add('hidden');
  listSection.classList.remove('hidden');
  triggerAnimation(listSection, 'animate-slide-in-right');
  loadGiftList();
});

goToSignupBtn.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  signupForm.classList.remove('hidden');
  triggerAnimation(signupForm, 'animate-fade-in-up');
});

goToLoginBtn.addEventListener('click', () => {
  signupForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
  triggerAnimation(loginForm, 'animate-fade-in-up');
});

// [1] 로그인 처리
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('loginId').value.trim();
  const password = document.getElementById('loginPw').value.trim();

  const submitBtn = document.getElementById('loginSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = "로그인 중...";

  try {
    const result = await sendRequest({ action: 'login', id, password });
    if (result.status === 'success') {
      const now = Date.now();
      localStorage.setItem('wedding_app_user', result.userName);
      localStorage.setItem('wedding_app_user_side', result.userSide);
      localStorage.setItem('wedding_app_user_id', result.userId);
      localStorage.setItem('wedding_app_session_token', result.token);
      localStorage.setItem('wedding_app_last_activity', now.toString());

      lastActivityTime = now;
      setLoggedInState(result.userName, result.userSide);
      startSessionTimer();
      loginForm.reset();
      showToast("로그인되었습니다.", "success");
    } else {
      showToast(result.message, "error");
    }
  } catch (err) {
    showToast("로그인 처리 중 오류가 발생했습니다.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "로그인";
  }
});

// [2] 회원가입 처리
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const side = document.querySelector('input[name="signupSide"]:checked').value;
  const name = document.getElementById('signupName').value.trim();
  const id = document.getElementById('signupId').value.trim();
  const password = document.getElementById('signupPw').value.trim();
  const passwordConfirm = document.getElementById('signupPwConfirm').value.trim();

  if (password !== passwordConfirm) {
    showToast("비밀번호가 일치하지 않습니다.", "error");
    return;
  }

  const submitBtn = document.getElementById('signupSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = "신청 처리 중...";

  try {
    const result = await sendRequest({ action: 'signup', side, name, id, password });
    if (result.status === 'success') {
      showToast(result.message, "success");
      signupForm.reset();
      goToLoginBtn.click();
    } else {
      showToast(result.message, "error");
    }
  } catch (err) {
    showToast("회원가입 처리 중 오류가 발생했습니다.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "회원가입 신청";
  }
});

// [3] 로그아웃
headerLogoutBtn.addEventListener('click', () => {
  clearUserSession();
  setLoggedOutState();
  showToast("로그아웃 되었습니다.", "success");
});

// [4] 축의금 등록 처리
giftForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (currentAmountAnimationId) {
    cancelAnimationFrame(currentAmountAnimationId);
    currentAmountAnimationId = null;
    amountInput.value = currentTargetAmount > 0 ? currentTargetAmount.toLocaleString('ko-KR') : '';
    amountInput.classList.remove('amount-up', 'amount-down');
  }

  const currentUser = localStorage.getItem('wedding_app_user');
  const userSide = localStorage.getItem('wedding_app_user_side');
  const userId = localStorage.getItem('wedding_app_user_id');
  const token = localStorage.getItem('wedding_app_session_token');

  if (!currentUser || !userSide || !userId || !token) {
    showToast("로그인이 필요합니다.", "error");
    clearUserSession();
    setLoggedOutState();
    return;
  }

  const rawAmount = amountInput.value.replace(/,/g, '');
  const name = nameInput.value.trim();
  const note = document.getElementById('note').value.trim();

  if (!name) {
    showToast("성함을 입력해주세요.", "error");
    nameInput.focus();
    return;
  }

  if (!rawAmount || Number(rawAmount) <= 0) {
    showToast("올바른 금액을 입력해주세요.", "error");
    amountInput.focus();
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = "저장 중...";

  try {
    const result = await sendRequest({
      action: 'addGift',
      userId: userId,
      token: token,
      name: name,
      amount: rawAmount,
      note: note
    });

    if (result.status === 'success') {
      const formattedAmount = Number(rawAmount).toLocaleString();
      const msg = `[${userSide}측] ${name}님 ${formattedAmount}원 등록 완료`;
      showToast(msg, "success", result.giftData);
      giftForm.reset();
      currentTargetAmount = 0;
      nameInput.focus();
    } else {
      showToast(`오류: ${result.message}`, "error");
      if (result.message && (result.message.includes("세션") || result.message.includes("유효하지"))) {
        clearUserSession();
        setLoggedOutState();
      }
    }
  } catch (err) {
    showToast("전송 실패! 네트워크 상태를 확인해 주세요.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "저장하기";
  }
});

// [5] 본인 측 축의금 목록만 불러오기
async function loadGiftList() {
  const userSide = localStorage.getItem('wedding_app_user_side');
  const userId = localStorage.getItem('wedding_app_user_id');
  const token = localStorage.getItem('wedding_app_session_token');

  if (!userId || !token) {
    clearUserSession();
    setLoggedOutState();
    showToast("로그인이 필요합니다.", "error");
    return;
  }

  giftTableBody.innerHTML = `
    <tr>
      <td colspan="7" class="table-loading">
        <div class="spinner"></div>
        <div>목록을 불러오는 중...</div>
      </td>
    </tr>
  `;
  emptyListState.classList.add('hidden');

  try {
    const result = await sendRequest({
      action: 'getGifts',
      userId: userId,
      token: token
    });
    if (result.status === 'success') {
      cachedGifts = result.gifts || [];
      updateStats(cachedGifts, userSide);
      renderTable();
    } else {
      giftTableBody.innerHTML = '';
      showToast(result.message || "목록을 불러오지 못했습니다.", "error");
      if (result.message && (result.message.includes("세션") || result.message.includes("유효하지"))) {
        clearUserSession();
        setLoggedOutState();
      }
    }
  } catch (err) {
    giftTableBody.innerHTML = '';
    showToast("목록을 불러오지 못했습니다.", "error");
  }
}

// [6] 목록 새로고침 버튼 이벤트
refreshListBtn.addEventListener('click', async () => {
  refreshListBtn.disabled = true;
  refreshListBtn.textContent = "새로고침 중..";

  await loadGiftList();

  refreshListBtn.disabled = false;
  refreshListBtn.textContent = "목록 새로고침";
  showToast("최신화되었습니다.", "success");
});

function updateStats(gifts, userSide) {
  let count = gifts.length;
  let sideSum = 0;

  gifts.forEach(item => {
    sideSum += item.amount;
  });

  statTotalCount.textContent = `${count}건`;
  
  if (statSideLabel && statSideTotal) {
    statSideLabel.textContent = `${userSide}측 총 금액`;
    statSideTotal.textContent = `${sideSum.toLocaleString()}원`;
    statSideCard.className = `stat-card ${userSide === '신랑' ? 'stat-groom' : 'stat-bride'}`;
  }

  if (listSubTitle) {
    listSubTitle.textContent = `${userSide}측 축의금 등록 내역입니다.`;
  }
}

function renderTable() {
  const searchTerm = listSearchInput.value.trim().toLowerCase();
  const onlyMine = myRegistrationOnly.checked;
  const currentUser = localStorage.getItem('wedding_app_user');

  const filtered = cachedGifts.filter(item => {
    const nameStr = String(item.name || '').toLowerCase();
    const noteStr = String(item.note || '').toLowerCase();
    const matchSearch = nameStr.includes(searchTerm) || noteStr.includes(searchTerm);
    const matchMine = !onlyMine || String(item.registeredBy) === String(currentUser);

    return matchSearch && matchMine;
  });

  giftTableBody.innerHTML = '';

  if (filtered.length === 0) {
    emptyListState.classList.remove('hidden');
    return;
  }

  emptyListState.classList.add('hidden');

  filtered.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge-target ${item.target === '신랑' ? 'badge-groom' : 'badge-bride'}">${escapeHtml(item.target)}측</span></td>
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td><strong>${Number(item.amount).toLocaleString()}원</strong></td>
      <td>${escapeHtml(item.note || '-')}</td>
      <td><small class="text-muted">${item.timestamp}</small></td>
      <td><small>${escapeHtml(item.registeredBy)}</small></td>
      <td class="text-center">
        <div class="action-btns">
          <button type="button" class="btn-tbl-action btn-edit">수정</button>
          <button type="button" class="btn-tbl-action btn-del">삭제</button>
        </div>
      </td>
    `;

    tr.querySelector('.btn-edit').addEventListener('click', () => openEditModal(item));
    tr.querySelector('.btn-del').addEventListener('click', () => deleteGiftItem(item));

    giftTableBody.appendChild(tr);
  });
}

listSearchInput.addEventListener('input', renderTable);
myRegistrationOnly.addEventListener('change', renderTable);

// 항목 삭제 시 세션 토큰 검증
async function deleteGiftItem(data) {
  if (confirm(`[${data.target}측] ${data.name}님의 축의금 항목을 삭제하시겠습니까?`)) {
    const userId = localStorage.getItem('wedding_app_user_id');
    const token = localStorage.getItem('wedding_app_session_token');

    if (!userId || !token) {
      clearUserSession();
      setLoggedOutState();
      showToast("로그인이 필요합니다.", "error");
      return;
    }

    try {
      const res = await sendRequest({
        action: 'deleteGift',
        userId: userId,
        token: token,
        rowId: String(data.rowId)
      });
      if (res.status === 'success') {
        showToast("삭제되었습니다.", "success");
        loadGiftList();
      } else {
        showToast(res.message, "error");
        if (res.message && (res.message.includes("세션") || res.message.includes("유효하지"))) {
          clearUserSession();
          setLoggedOutState();
        }
      }
    } catch (err) {
      showToast("삭제 실패!", "error");
    }
  }
}

// 항목 수정 시 세션 토큰 검증
editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const rowId = editRowId.value;
  const name = editName.value.trim();
  const rawAmount = editAmount.value.replace(/,/g, '');
  const note = editNote.value.trim();

  const userId = localStorage.getItem('wedding_app_user_id');
  const token = localStorage.getItem('wedding_app_session_token');

  if (!userId || !token) {
    clearUserSession();
    setLoggedOutState();
    showToast("로그인이 필요합니다.", "error");
    return;
  }

  const saveBtn = document.getElementById('saveEditBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = "수정 중...";

  try {
    const result = await sendRequest({
      action: 'updateGift',
      userId: userId,
      token: token,
      rowId: String(rowId),
      name: name,
      amount: rawAmount,
      note: note
    });

    if (result.status === 'success') {
      const userSide = localStorage.getItem('wedding_app_user_side') || '신랑';
      const formattedAmount = Number(rawAmount).toLocaleString();
      const updatedMsg = `[${userSide}측] ${name}님 ${formattedAmount}원 (수정됨)`;
      
      if (activeToast) {
        activeToast.querySelector('.toast-body').textContent = updatedMsg;
        activeToast.giftData = result.giftData;
        startToastTimer(activeToast, 5000);
      }

      showToast("축의금 정보가 수정되었습니다.", "success");
      closeEditModal();
      loadGiftList();
    } else {
      showToast(`수정 실패: ${result.message}`, "error");
      if (res.message && (res.message.includes("세션") || res.message.includes("유효하지"))) {
        clearUserSession();
        setLoggedOutState();
      }
    }
  } catch (err) {
    showToast("수정 요청 실패!", "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "수정 완료";
  }
});

function showToast(message, type = "success", giftData = null) {
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
  toast.giftData = giftData;

  let actionButtonsHtml = '';
  if (giftData) {
    actionButtonsHtml = `
      <div class="toast-actions">
        <button type="button" class="btn-toast-action btn-edit">수정하기</button>
        <button type="button" class="btn-toast-action btn-delete">삭제하기</button>
      </div>
    `;
  }

  toast.innerHTML = `
    <div class="toast-header">
      <span class="toast-title">${type === 'error' ? '알림' : '성공'}</span>
      <button type="button" class="btn-toast-close">&times;</button>
    </div>
    <div class="toast-body">${message}</div>
    ${actionButtonsHtml}
  `;

  toastContainer.appendChild(toast);

  toast.querySelector('.btn-toast-close').addEventListener('click', () => removeToast(toast));

  if (giftData) {
    toast.querySelector('.btn-edit').addEventListener('click', () => {
      pauseToastTimer(toast);
      activeToast = toast;
      openEditModal(toast.giftData);
    });

    toast.querySelector('.btn-delete').addEventListener('click', () => {
      deleteGiftItem(toast.giftData);
      removeToast(toast);
    });
  }

  startToastTimer(toast, 5000);
}

function startToastTimer(toast, duration = 5000) {
  pauseToastTimer(toast);
  toast.timerId = setTimeout(() => removeToast(toast), duration);
}

function pauseToastTimer(toast) {
  if (toast && toast.timerId) {
    clearTimeout(toast.timerId);
    toast.timerId = null;
  }
}

function removeToast(toast) {
  if (toast && toast.parentNode) {
    pauseToastTimer(toast);
    toast.classList.add('fade-out');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 400);
  }
}

function openEditModal(data) {
  editRowId.value = data.rowId;
  editTarget.value = data.target;
  editName.value = data.name;
  editAmount.value = Number(data.amount).toLocaleString();
  editNote.value = data.note || '';

  editModal.classList.remove('hidden');
  triggerAnimation(editModal.querySelector('.modal-content'), 'animate-scale-in');
}

function closeEditModal() {
  editModal.classList.add('hidden');
  if (activeToast) {
    startToastTimer(activeToast, 5000);
    activeToast = null;
  }
}

closeModalBtn.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);

// 금액 연속 변경 애니메이션 함수
function animateAmount(inputEl, startVal, endVal, duration = 180) {
  if (currentAmountAnimationId) {
    cancelAnimationFrame(currentAmountAnimationId);
  }

  const startTime = performance.now();
  const diff = endVal - startVal;

  inputEl.classList.remove('amount-up', 'amount-down');
  void inputEl.offsetWidth; // Reflow 트리거

  if (diff > 0) {
    inputEl.classList.add('amount-up');
  } else if (diff < 0) {
    inputEl.classList.add('amount-down');
  }

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const easeProgress = 1 - (1 - progress) * (1 - progress);
    const currentVal = Math.round(startVal + diff * easeProgress);

    inputEl.value = currentVal > 0 ? currentVal.toLocaleString('ko-KR') : '';

    if (progress < 1) {
      currentAmountAnimationId = requestAnimationFrame(update);
    } else {
      currentAmountAnimationId = null;
      inputEl.value = endVal > 0 ? endVal.toLocaleString('ko-KR') : '';
      setTimeout(() => {
        inputEl.classList.remove('amount-up', 'amount-down');
      }, 100);
    }
  }

  currentAmountAnimationId = requestAnimationFrame(update);
}

// 퀵 금액 버튼
document.querySelectorAll('.btn-quick[data-amount]').forEach(button => {
  button.addEventListener('click', () => {
    const addValue = Number(button.getAttribute('data-amount'));
    const currentRaw = amountInput.value.replace(/,/g, '');
    const currentNum = Number(currentRaw) || 0;

    let baseNum = currentAmountAnimationId ? currentTargetAmount : currentNum;
    currentTargetAmount = baseNum + addValue;

    animateAmount(amountInput, currentNum, currentTargetAmount, 200);
  });
});

document.getElementById('resetAmountBtn').addEventListener('click', () => {
  const currentRaw = amountInput.value.replace(/,/g, '');
  const currentNum = Number(currentRaw) || 0;
  currentTargetAmount = 0;
  
  if (currentNum > 0) {
    animateAmount(amountInput, currentNum, 0, 160);
  } else {
    amountInput.value = '';
  }
});

// 키보드 방향키(ArrowUp / ArrowDown) 조작 및 엔터(Enter) 지원
function handleAmountKeyEvents(e) {
  if (e.isComposing || e.keyCode === 229) return;

  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    const currentRaw = amountInput.value.replace(/,/g, '');
    const currentNum = Number(currentRaw) || 0;

    let baseNum = currentAmountAnimationId ? currentTargetAmount : currentNum;

    if (e.key === 'ArrowUp') {
      currentTargetAmount = baseNum + 10000;
    } else if (e.key === 'ArrowDown') {
      currentTargetAmount = Math.max(0, baseNum - 10000);
    }

    if (currentNum !== currentTargetAmount) {
      animateAmount(amountInput, currentNum, currentTargetAmount, 160);
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    giftForm.requestSubmit();
  }
}

if (nameInput) {
  nameInput.addEventListener('keydown', handleAmountKeyEvents);
}
if (amountInput) {
  amountInput.addEventListener('keydown', handleAmountKeyEvents);
  
  amountInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    const num = val ? Number(val) : 0;
    e.target.value = num ? num.toLocaleString('ko-KR') : '';
    currentTargetAmount = num;
  });
}

editAmount.addEventListener('input', (e) => {
  let val = e.target.value.replace(/[^0-9]/g, '');
  e.target.value = val ? Number(val).toLocaleString('ko-KR') : '';
});

async function sendRequest(payload) {
  const response = await fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  return await response.json();
}

function setLoggedInState(userName, userSide) {
  headerUserName.textContent = userName;
  headerUserSideBadge.textContent = `${userSide}측`;
  headerUserSideBadge.className = `user-side-badge ${userSide === '신랑' ? 'groom' : 'bride'}`;

  authCard.classList.add('hidden');

  mainHeader.classList.remove('hidden');
  triggerAnimation(mainHeader, 'animate-fade-in-down');

  appContent.classList.remove('hidden');
  triggerAnimation(appContent, 'animate-scale-in');

  navRegisterBtn.click();
  checkAndShowTutorial();
}

function setLoggedOutState() {
  stopSessionTimer();
  mainHeader.classList.add('hidden');
  appContent.classList.add('hidden');
  authCard.classList.remove('hidden');
  triggerAnimation(authCard, 'animate-scale-in');
  signupForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
}

function clearUserSession() {
  stopSessionTimer();
  localStorage.removeItem('wedding_app_user');
  localStorage.removeItem('wedding_app_user_side');
  localStorage.removeItem('wedding_app_user_id');
  localStorage.removeItem('wedding_app_session_token');
  localStorage.removeItem('wedding_app_last_activity');
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

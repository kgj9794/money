const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwB46MO3t7uWLvQLGv-HTfkxyX946K0oJUVhvqAQxBPoNoD_78ytz4WBje8U0J66K2S/exec";

const mainHeader = document.getElementById('mainHeader');
const headerUserName = document.getElementById('headerUserName');
const headerUserSideBadge = document.getElementById('headerUserSideBadge');
const headerLogoutBtn = document.getElementById('headerLogoutBtn');

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

let cachedGifts = [];
let activeToast = null;

document.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('wedding_app_user');
  const savedSide = localStorage.getItem('wedding_app_user_side');
  if (savedUser && savedSide) {
    setLoggedInState(savedUser, savedSide);
  } else {
    setLoggedOutState();
  }
});

function triggerAnimation(el, className = 'animate-fade-in-up') {
  el.classList.remove('animate-fade-in-up', 'animate-scale-in', 'animate-fade-in-down');
  void el.offsetWidth;
  el.classList.add(className);
}

navRegisterBtn.addEventListener('click', () => {
  navRegisterBtn.classList.add('active');
  navListBtn.classList.remove('active');
  listSection.classList.add('hidden');
  registerSection.classList.remove('hidden');
  triggerAnimation(registerSection, 'animate-fade-in-up');
});

navListBtn.addEventListener('click', () => {
  navListBtn.classList.add('active');
  navRegisterBtn.classList.remove('active');
  registerSection.classList.add('hidden');
  listSection.classList.remove('hidden');
  triggerAnimation(listSection, 'animate-fade-in-up');
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
      localStorage.setItem('wedding_app_user', result.userName);
      localStorage.setItem('wedding_app_user_side', result.userSide);
      setLoggedInState(result.userName, result.userSide);
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
  localStorage.removeItem('wedding_app_user');
  localStorage.removeItem('wedding_app_user_side');
  setLoggedOutState();
  showToast("로그아웃 되었습니다.", "success");
});

// [4] 축의금 등록 처리
giftForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const currentUser = localStorage.getItem('wedding_app_user');
  const userSide = localStorage.getItem('wedding_app_user_side');
  if (!currentUser || !userSide) {
    showToast("로그인이 필요합니다.", "error");
    setLoggedOutState();
    return;
  }

  const rawAmount = amountInput.value.replace(/,/g, '');
  const name = document.getElementById('name').value.trim();
  const note = document.getElementById('note').value.trim();

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = "저장 중...";

  try {
    const result = await sendRequest({
      action: 'addGift',
      target: userSide,
      name: name,
      amount: rawAmount,
      note: note,
      registeredBy: currentUser
    });

    if (result.status === 'success') {
      const formattedAmount = Number(rawAmount).toLocaleString();
      const msg = `[${userSide}측] ${name}님 ${formattedAmount}원 등록 완료`;
      showToast(msg, "success", result.giftData);
      giftForm.reset();
    } else {
      showToast(`오류: ${result.message}`, "error");
    }
  } catch (err) {
    showToast("전송 실패! 네트워크 상태를 확인해 주세요.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "저장하기";
  }
});

// [5] 본인 측 축의금 목록만 불러오기 (보안 강화)
async function loadGiftList() {
  const userSide = localStorage.getItem('wedding_app_user_side');
  try {
    const result = await sendRequest({ action: 'getGifts', userSide: userSide });
    if (result.status === 'success') {
      cachedGifts = result.gifts || [];
      updateStats(cachedGifts, userSide);
      renderTable();
    }
  } catch (err) {
    showToast("목록을 불러오지 못했습니다.", "error");
  }
}

refreshListBtn.addEventListener('click', async () => {
  const icon = refreshListBtn.querySelector('.refresh-icon');
  if (icon) icon.classList.add('spin');
  refreshListBtn.disabled = true;

  await loadGiftList();

  if (icon) icon.classList.remove('spin');
  refreshListBtn.disabled = false;
  showToast("최신화되었습니다.", "success");
});

// 본인 측 전용 통계 업데이트
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
    const matchSearch = item.name.toLowerCase().includes(searchTerm) || item.note.toLowerCase().includes(searchTerm);
    const matchMine = !onlyMine || item.registeredBy === currentUser;

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
      <td><span class="badge-target ${item.target === '신랑' ? 'badge-groom' : 'badge-bride'}">${item.target}측</span></td>
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td><strong>${item.amount.toLocaleString()}원</strong></td>
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

async function deleteGiftItem(data) {
  if (confirm(`[${data.target}측] ${data.name}님의 축의금 항목을 삭제하시겠습니까?`)) {
    try {
      const res = await sendRequest({
        action: 'deleteGift',
        target: data.target,
        rowId: data.rowId
      });
      if (res.status === 'success') {
        showToast("삭제되었습니다.", "success");
        loadGiftList();
      } else {
        showToast(res.message, "error");
      }
    } catch (err) {
      showToast("삭제 실패!", "error");
    }
  }
}

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const rowId = editRowId.value;
  const target = editTarget.value;
  const name = editName.value.trim();
  const rawAmount = editAmount.value.replace(/,/g, '');
  const note = editNote.value.trim();

  const saveBtn = document.getElementById('saveEditBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = "수정 중...";

  try {
    const result = await sendRequest({
      action: 'updateGift',
      rowId: rowId,
      target: target,
      name: name,
      amount: rawAmount,
      note: note
    });

    if (result.status === 'success') {
      const formattedAmount = Number(rawAmount).toLocaleString();
      const updatedMsg = `[${target}측] ${name}님 ${formattedAmount}원 (수정됨)`;
      
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

document.querySelectorAll('.btn-quick[data-amount]').forEach(button => {
  button.addEventListener('click', () => {
    const addValue = Number(button.getAttribute('data-amount'));
    const currentRaw = amountInput.value.replace(/,/g, '');
    const currentNum = Number(currentRaw) || 0;

    amountInput.value = (currentNum + addValue).toLocaleString('ko-KR');
  });
});

document.getElementById('resetAmountBtn').addEventListener('click', () => {
  amountInput.value = '';
});

amountInput.addEventListener('input', (e) => {
  let val = e.target.value.replace(/[^0-9]/g, '');
  e.target.value = val ? Number(val).toLocaleString('ko-KR') : '';
});

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
}

function setLoggedOutState() {
  mainHeader.classList.add('hidden');
  appContent.classList.add('hidden');
  authCard.classList.remove('hidden');
  triggerAnimation(authCard, 'animate-scale-in');
  signupForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

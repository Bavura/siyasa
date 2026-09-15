const questions = document.querySelectorAll('.faq-question');
const filters = document.querySelectorAll('.filter-tab');
const searchInput = document.querySelector('#faq-search');
const emptyState = document.querySelector('#empty-state');

questions.forEach((question) => {
  question.addEventListener('click', () => {
    const item = question.closest('.faq-item');
    const isOpen = item.classList.toggle('open');
    question.setAttribute('aria-expanded', String(isOpen));
  });
});

let activeFilter = 'all';

function updateFaqs() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  let visibleCount = 0;

  document.querySelectorAll('.faq-item').forEach((item) => {
    const matchesCategory = activeFilter === 'all' || item.dataset.category === activeFilter;
    const matchesSearch = !searchTerm || item.dataset.search.toLowerCase().includes(searchTerm);
    const visible = matchesCategory && matchesSearch;
    item.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  emptyState.hidden = visibleCount !== 0;
}

filters.forEach((filter) => {
  filter.addEventListener('click', () => {
    filters.forEach((tab) => tab.classList.remove('active'));
    filter.classList.add('active');
    activeFilter = filter.dataset.filter;
    updateFaqs();
  });
});

searchInput.addEventListener('input', updateFaqs);

const accountButton = document.querySelector('#account-button');
const accountMenu = document.querySelector('#account-menu');
const accountGreeting = document.querySelector('#account-greeting');
const logoutButton = document.querySelector('#logout-button');
const authDialog = document.querySelector('#auth-dialog');
const authForm = document.querySelector('#auth-form');
const authStatus = document.querySelector('#auth-status');
const authTitle = document.querySelector('#auth-title');
const authSubmit = document.querySelector('#auth-submit');
const authUsername = document.querySelector('#auth-username');
const authPassword = document.querySelector('#auth-password');
const loginTab = document.querySelector('#login-tab');
const signupTab = document.querySelector('#signup-tab');
const authClose = document.querySelector('#auth-close');
let authMode = 'login';

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === 'signup';
  loginTab.classList.toggle('active', !isSignup);
  signupTab.classList.toggle('active', isSignup);
  authTitle.textContent = isSignup ? 'أنشئ حسابك' : 'مرحبًا بعودتك';
  authSubmit.textContent = isSignup ? 'إنشاء الحساب' : 'دخول';
  authPassword.autocomplete = isSignup ? 'new-password' : 'current-password';
  authStatus.textContent = '';
}

function openAuth() {
  accountMenu.hidden = true;
  authDialog.showModal();
  authUsername.focus();
}

async function refreshAccount() {
  const response = await fetch('/api/me');
  const data = await response.json();
  if (data.user) {
    accountButton.hidden = true;
    accountGreeting.textContent = `مرحبًا، ${data.user.username}`;
    accountMenu.hidden = false;
  } else {
    accountButton.hidden = false;
    accountMenu.hidden = true;
  }
}

accountButton.addEventListener('click', openAuth);
authClose.addEventListener('click', () => authDialog.close());
loginTab.addEventListener('click', () => setAuthMode('login'));
signupTab.addEventListener('click', () => setAuthMode('signup'));
logoutButton.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  await refreshAccount();
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  authSubmit.disabled = true;
  authStatus.textContent = '';
  try {
    const response = await fetch(`/api/${authMode}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: authUsername.value.trim(), password: authPassword.value }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'تعذر إتمام العملية.');
    authDialog.close();
    authForm.reset();
    await refreshAccount();
  } catch (error) {
    authStatus.textContent = error.message;
  } finally {
    authSubmit.disabled = false;
  }
});

refreshAccount().catch(() => {});

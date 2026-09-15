const questions = document.querySelectorAll('.faq-question');
const filters = document.querySelectorAll('.filter-tab');
const searchInput = document.querySelector('#faq-search');
const emptyState = document.querySelector('#empty-state');
const faqItems = document.querySelectorAll('.faq-item');

questions.forEach((question) => {
  const toggleQuestion = () => {
    const item = question.closest('.faq-item');
    const isOpen = item.classList.toggle('open');
    question.setAttribute('aria-expanded', String(isOpen));
  };
  question.addEventListener('click', toggleQuestion);
  question.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleQuestion();
    }
  });
});

document.querySelectorAll('.favorite-button').forEach((button) => {
  button.addEventListener('click', async (event) => {
    event.stopPropagation();
    const item = button.closest('.faq-item');
    if (!currentUser) {
      openAuth();
      return;
    }
    const favorite = button.classList.contains('saved');
    const response = await fetch(`/api/favorites/${item.dataset.id}`, { method: favorite ? 'DELETE' : 'POST' });
    if (response.ok) {
      button.classList.toggle('saved', !favorite);
      button.textContent = favorite ? '☆' : '★';
    }
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
const favoritesButton = document.querySelector('#favorites-button');
let authMode = 'login';
let currentUser = null;

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
    currentUser = data.user;
    accountButton.hidden = true;
    accountGreeting.textContent = `مرحبًا، ${data.user.username}`;
    accountMenu.hidden = false;
  } else {
    currentUser = null;
    accountButton.hidden = false;
    accountMenu.hidden = true;
  }
}

async function refreshFavorites() {
  if (!currentUser) return;
  const response = await fetch('/api/favorites');
  if (!response.ok) return;
  const data = await response.json();
  const favorites = new Set(data.favorites);
  faqItems.forEach((item) => {
    const button = item.querySelector('.favorite-button');
    const saved = favorites.has(item.dataset.id);
    button.classList.toggle('saved', saved);
    button.textContent = saved ? '★' : '☆';
  });
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
    await refreshFavorites();
  } catch (error) {
    authStatus.textContent = error.message;
  } finally {
    authSubmit.disabled = false;
  }
});

favoritesButton.addEventListener('click', () => {
  faqItems.forEach((item) => { item.hidden = !item.querySelector('.favorite-button').classList.contains('saved'); });
  emptyState.hidden = [...faqItems].some((item) => !item.hidden);
  document.querySelector('#faq').scrollIntoView({ behavior: 'smooth' });
});

const quizQuestions = [
  { question: 'من يشارك في سن القوانين ومراقبة عمل الحكومة؟', options: ['البرلمان', 'المحكمة', 'الجماعة فقط'], answer: 0 },
  { question: 'ما أفضل خطوة قبل مشاركة خبر سياسي؟', options: ['التحقق من المصدر والتاريخ', 'حذف المصدر', 'مشاركته فورًا'], answer: 0 },
  { question: 'كيف تبدأ المشاركة المدنية؟', options: ['بالاطلاع والمشاركة المسؤولة', 'بتجنب كل النقاشات', 'بتصديق مصدر واحد'], answer: 0 },
];
let quizIndex = 0;
let quizScore = 0;
const quizPanel = document.querySelector('#quiz-panel');

function renderQuiz() {
  if (quizIndex >= quizQuestions.length) {
    quizPanel.innerHTML = `<strong class="quiz-result">نتيجتك: ${quizScore} / ${quizQuestions.length}</strong><button class="quiz-restart" type="button">إعادة الاختبار</button>`;
    quizPanel.querySelector('.quiz-restart').addEventListener('click', () => { quizIndex = 0; quizScore = 0; renderQuiz(); });
    return;
  }
  const quiz = quizQuestions[quizIndex];
  quizPanel.innerHTML = `<span class="quiz-count">${quizIndex + 1} / ${quizQuestions.length}</span><h3>${quiz.question}</h3><div class="quiz-options">${quiz.options.map((option, index) => `<button type="button" data-answer="${index}">${option}</button>`).join('')}</div>`;
  quizPanel.querySelectorAll('[data-answer]').forEach((option) => option.addEventListener('click', () => {
    if (Number(option.dataset.answer) === quiz.answer) quizScore += 1;
    quizIndex += 1;
    renderQuiz();
  }));
}

refreshAccount().then(refreshFavorites).catch(() => {});
renderQuiz();

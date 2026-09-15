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

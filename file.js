/* file.js — GreenPath (fully rewritten, modern, accessible, performant) */
(() => {
  'use strict';

  /* -----------------------------
     Config & constants
     ----------------------------- */
  const STORAGE_KEY = 'greenpath-trips-v1';
  const THEME_KEY = 'greenpath-theme';
  const AUTOPLAY_INTERVAL = 4200; // ms
  const EMISSION_RATES = { car: 0.21, motorbike: 0.10, bus: 0.05, bicycle: 0 };

  /* -----------------------------
     DOM helpers
     ----------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function qs(id) { return document.getElementById(id); }

  /* -----------------------------
     Theme handling
     ----------------------------- */
  const themeToggle = qs('themeToggle');
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (themeToggle) themeToggle.setAttribute('aria-pressed', String(savedTheme === 'dark'));
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    if (themeToggle) themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(current);
    });
  }

  /* -----------------------------
     Utility: throttle / debounce
     ----------------------------- */
  function debounce(fn, wait = 100) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
  }

  /* -----------------------------
     Lazyload images (for hero carousel & others)
     ----------------------------- */
  const lazyObserver = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      const src = img.dataset.src;
      if (src) {
        img.src = src;
        img.removeAttribute('data-src');
      }
      lazyObserver.unobserve(img);
    });
  }, { rootMargin: '200px' }) : null;

  function observeLazyImages(root = document) {
    if (!lazyObserver) return;
    $$('img[data-src]', root).forEach(img => lazyObserver.observe(img));
  }

  /* -----------------------------
     Hero carousel (improved)
     ----------------------------- */
  (function heroCarousel() {
    const carousel = qs('heroCarousel');
    if (!carousel) return;

    const track = carousel.querySelector('.carousel-track');
    const slides = Array.from(carousel.querySelectorAll('.carousel-slide'));
    const prevBtn = carousel.querySelector('.carousel-btn.prev');
    const nextBtn = carousel.querySelector('.carousel-btn.next');
    const indicatorsWrap = carousel.querySelector('.carousel-indicators');

    // prepare lazy-loading for images inside carousel
    slides.forEach(slide => {
      const img = slide.querySelector('img');
      if (img && !img.src) {
        img.dataset.src = img.getAttribute('src');
        img.removeAttribute('src');
      }
    });
    observeLazyImages(carousel);

    let current = 0;
    let autoplayId = null;
    const count = slides.length;

    // build indicators
    if (indicatorsWrap) {
      indicatorsWrap.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const btn = document.createElement('button');
        btn.className = 'indicator';
        btn.setAttribute('aria-label', `Show slide ${i + 1}`);
        btn.setAttribute('data-index', String(i));
        if (i === 0) btn.classList.add('active');
        indicatorsWrap.appendChild(btn);
      }
    }

    const indicators = indicatorsWrap ? Array.from(indicatorsWrap.children) : [];

    function goTo(n, { announce = false } = {}) {
      current = ((n % count) + count) % count;
      track.style.transform = `translateX(-${current * 100}%)`;
      indicators.forEach((b, i) => b.classList.toggle('active', i === current));

      // load visible image if lazy
      const img = slides[current].querySelector('img');
      if (img && img.dataset && img.dataset.src) img.src = img.dataset.src;

      if (announce) {
        // announce slide change for screen readers
        const caption = slides[current].querySelector('figcaption');
        if (caption) {
          const live = document.createElement('span');
          live.className = 'sr-only';
          live.setAttribute('aria-live', 'polite');
          live.textContent = caption.textContent || `Slide ${current + 1}`;
          document.body.appendChild(live);
          setTimeout(() => live.remove(), 1200);
        }
      }
    }

    function next() { goTo(current + 1, { announce: true }); }
    function prev() { goTo(current - 1, { announce: true }); }

    // autoplay
    function startAutoplay() {
      stopAutoplay();
      autoplayId = setInterval(next, AUTOPLAY_INTERVAL);
    }
    function stopAutoplay() {
      if (autoplayId) { clearInterval(autoplayId); autoplayId = null; }
    }

    // events
    if (nextBtn) nextBtn.addEventListener('click', () => { next(); startAutoplay(); });
    if (prevBtn) prevBtn.addEventListener('click', () => { prev(); startAutoplay(); });

    // indicators
    indicators.forEach(btn => btn.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.getAttribute('data-index'));
      goTo(idx, { announce: true });
      startAutoplay();
    }));

    // keyboard nav
    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { prev(); startAutoplay(); }
      if (e.key === 'ArrowRight') { next(); startAutoplay(); }
    });

    // pause on hover/focus
    ['mouseenter', 'focusin'].forEach(ev => carousel.addEventListener(ev, stopAutoplay));
    ['mouseleave', 'focusout'].forEach(ev => carousel.addEventListener(ev, startAutoplay));

    // init
    goTo(0);
    startAutoplay();
  })();

  /* -----------------------------
     Tips carousel (scrollable) - keeps native scroll behavior for accessibility
     ----------------------------- */
  (function tipsCarousel() {
    const tips = qs('tipsCarousel');
    if (!tips) return;
    const track = tips.querySelector('.tips-track');
    const prev = tips.querySelector('.carousel-btn.prev');
    const next = tips.querySelector('.carousel-btn.next');

    // arrow buttons
    const scroll = (delta) => track.scrollBy({ left: delta, behavior: 'smooth' });
    if (prev) prev.addEventListener('click', () => scroll(-Math.min(400, track.clientWidth)));
    if (next) next.addEventListener('click', () => scroll(Math.min(400, track.clientWidth)));

    // keyboard support: left/right when focused inside
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); scroll(-200); }
      if (e.key === 'ArrowRight') { e.preventDefault(); scroll(200); }
    });

    // make the track focusable for keyboard users
    track.setAttribute('tabindex', '0');
  })();

  // YouTube video dynamic switch
document.addEventListener('DOMContentLoaded', () => {
  const iframe = document.querySelector('.video-wrap iframe');
  if (!iframe) return;

  document.body.addEventListener('click', () => {
    iframe.src = iframe.src.replace('mute=1', 'mute=0');
  }, { once: true });
});


  /* -----------------------------
     Trips calculator & storage
     ----------------------------- */
  (function calculator() {
    const form = qs('carbonForm');
    const statTrips = qs('statTrips');
    const statTotal = qs('statTotal');
    const tripTable = qs('tripTable');
    const progressBar = qs('progressBar');
    const totalResult = qs('totalResult');
    const tripResult = qs('tripResult');
    const chartEl = qs('emissionChart');

    let trips = [];
    try { trips = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { trips = []; }

    let totalEmissions = trips.reduce((s, t) => s + Number(t.emissions || 0), 0);

    function persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
      updateIndexStats();
    }

    function updateIndexStats() {
      if (statTrips) statTrips.textContent = trips.length;
      if (statTotal) statTotal.textContent = totalEmissions.toFixed(2) + ' kg';
    }

    function renderTable() {
      if (!tripTable) return;
      const tbody = tripTable.tagName.toLowerCase() === 'table' ? tripTable.querySelector('tbody') : tripTable;
      if (!tbody) return;
      tbody.innerHTML = '';
      trips.slice().reverse().forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${escapeHtml(t.date)}</td><td>${escapeHtml(t.vehicle)}</td><td>${escapeHtml(String(t.distance))}</td><td>${escapeHtml(String(t.emissions))}</td>`;
        tbody.appendChild(tr);
      });
    }

    function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    function updateProgress() {
      if (!progressBar) return;
      const percent = Math.min((totalEmissions / 50) * 100, 100); // 50kg target baseline
      progressBar.style.width = `${percent}%`;
    }

    // Chart.js visualization
    let chart = null;
    function updateChart() {
      if (!chartEl || typeof Chart === 'undefined') return;
      const labels = trips.map(t => t.date);
      const data = trips.map(t => Number(t.emissions));
      if (chart) chart.destroy();
      chart = new Chart(chartEl.getContext('2d'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'CO₂ Emissions (kg)', data }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    }

    // Add a trip
    function addTrip(vehicle, distance) {
      const rate = EMISSION_RATES[vehicle] || 0;
      const emissions = Number((distance * rate).toFixed(2));
      const trip = { date: new Date().toLocaleDateString(), vehicle, distance, emissions };
      trips.push(trip);
      totalEmissions += emissions;
      persist();
      renderTable();
      updateProgress();
      updateChart();
      if (totalResult) totalResult.textContent = totalEmissions.toFixed(2) + ' kg';
      if (tripResult) tripResult.textContent = `Last trip emitted ${emissions.toFixed(2)} kg CO₂`;
    }

    // Init UI from storage
    renderTable();
    updateIndexStats();
    updateProgress();
    updateChart();

    // Form handling
    if (form) {
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const vehicle = form.querySelector('#vehicle')?.value;
        const distanceStr = form.querySelector('#distance')?.value;
        const distance = Number(distanceStr);
        if (!vehicle || Number.isNaN(distance) || distance <= 0) {
          // very lightweight accessible alert
          form.querySelector('#distance')?.focus();
          return;
        }
        addTrip(vehicle, distance);
        form.reset();
      });
    }

    // Expose a small API on window for debugging.
    window.GreenPath = Object.assign(window.GreenPath || {}, {
      getTrips: () => trips.slice(),
      clearTrips: () => { trips = []; totalEmissions = 0; persist(); renderTable(); updateProgress(); updateChart(); }
    });

  })();

  /* -----------------------------
     Small UX helpers: add sr-only style if not present
     ----------------------------- */
  (function ensureSrOnly() {
    if (!document.querySelector('style[data-generated-by="file.js"]')) {
      const css = `.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}`;
      const s = document.createElement('style');
      s.setAttribute('data-generated-by', 'file.js');
      s.appendChild(document.createTextNode(css));
      document.head.appendChild(s);
    }
  })();

})();

// Per-question feedback
const quizButtons = document.querySelectorAll('.quiz-btn');

quizButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const correct = btn.dataset.correct === 'true';
    const feedback = btn.closest('.quiz-question').querySelector('.quiz-feedback');

    feedback.textContent = correct ? '✅ Correct! Well done.' : '❌ Incorrect. Try again!';
    feedback.classList.toggle('incorrect', !correct);
  });
});



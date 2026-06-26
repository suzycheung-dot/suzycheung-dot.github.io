document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  const navBackdrop = document.getElementById('nav-backdrop');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function getFocusable(container) {
    return [...container.querySelectorAll(focusableSelector)].filter(
      el => el.offsetParent !== null || el === navToggle
    );
  }

  function closeNav() {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('nav-open');
    if (navBackdrop) {
      navBackdrop.hidden = true;
      navBackdrop.setAttribute('aria-hidden', 'true');
    }
  }

  function openNav() {
    navLinks.classList.add('open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Close menu');
    document.body.classList.add('nav-open');
    if (navBackdrop) {
      navBackdrop.hidden = false;
      navBackdrop.setAttribute('aria-hidden', 'false');
    }
    const focusable = getFocusable(navLinks);
    if (focusable.length) focusable[0].focus();
  }

  // Gallery lightbox
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = lightbox?.querySelector('.lightbox-image');
  const lightboxCaption = lightbox?.querySelector('.lightbox-caption');
  const lightboxClose = lightbox?.querySelector('.lightbox-close');
  const lightboxBackdrop = lightbox?.querySelector('.lightbox-backdrop');
  const lightboxPrev = lightbox?.querySelector('.lightbox-prev');
  const lightboxNext = lightbox?.querySelector('.lightbox-next');
  const galleryItems = [...document.querySelectorAll('.gallery-item')];
  let lightboxIndex = 0;
  let lightboxTrigger = null;

  function showLightboxSlide(index) {
    if (!galleryItems.length || !lightboxImage) return;
    lightboxIndex = (index + galleryItems.length) % galleryItems.length;
    const img = galleryItems[lightboxIndex].querySelector('img');
    lightboxImage.src = img.currentSrc || img.src;
    lightboxImage.alt = img.alt;
    if (lightboxCaption) lightboxCaption.textContent = img.alt;
  }

  function openLightbox(index, trigger) {
    if (!lightbox) return;
    lightboxTrigger = trigger;
    showLightboxSlide(index);
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    lightboxClose?.focus();
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    if (lightboxImage) {
      lightboxImage.src = '';
      lightboxImage.alt = '';
    }
    lightboxTrigger?.focus();
    lightboxTrigger = null;
  }

  // Sticky header on scroll
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  // Mobile nav toggle
  navToggle.addEventListener('click', () => {
    if (navLinks.classList.contains('open')) {
      closeNav();
      navToggle.focus();
    } else {
      openNav();
    }
  });

  navBackdrop?.addEventListener('click', () => {
    closeNav();
    navToggle.focus();
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      closeNav();
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (navLinks.classList.contains('open')) {
        closeNav();
        navToggle.focus();
      }
      if (lightbox && !lightbox.hidden) {
        closeLightbox();
      }
      return;
    }

    if (e.key === 'Tab' && navLinks.classList.contains('open')) {
      const focusable = getFocusable(navLinks);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }

    if (lightbox && !lightbox.hidden) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        showLightboxSlide(lightboxIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        showLightboxSlide(lightboxIndex + 1);
      }
    }
  });

  // Scroll-reveal animations
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll(
    '.value-card, .animal-card, .eco-card, .mission-image-wrap, ' +
    '.ranch-feature, .trees-feature, .trees-gallery, .architecture-feature, .stay-grid, .mau-grid, .gallery-item, .contact-card'
  ).forEach(el => {
    el.classList.add('fade-in');
    if (prefersReducedMotion) {
      el.classList.add('visible');
    } else {
      observer.observe(el);
    }
  });

  document.querySelectorAll('img').forEach(img => {
    if (!img.complete || img.naturalHeight === 0) {
      img.classList.add('placeholder');
    }
    img.addEventListener('error', () => img.classList.add('placeholder'));
  });

  function trackEvent(name, params) {
    if (typeof gtag === 'function') {
      gtag('event', name, params);
    }
  }

  const learnMoreBtn = document.getElementById('learn-more-btn');
  if (learnMoreBtn) {
    learnMoreBtn.addEventListener('click', () => {
      trackEvent('generate_lead', { method: 'learn_more_mailto' });
      trackEvent('learn_more_interest');
    });
  }

  document.querySelectorAll('.contact-interest a[href^="mailto:"]').forEach(link => {
    if (link.id === 'learn-more-btn') return;
    link.addEventListener('click', () => {
      trackEvent('generate_lead', { method: 'booking_inquiry_mailto' });
    });
  });

  const airbnbBtn = document.getElementById('airbnb-book-btn');
  if (airbnbBtn) {
    airbnbBtn.addEventListener('click', () => {
      trackEvent('generate_lead', { method: 'airbnb_book' });
    });
  }

  function formatCount(value, el) {
    const suffix = el.dataset.suffix || '';
    if (suffix === '%') return `${Math.round(value)}%`;
    if (suffix === '+') return `${Math.round(value).toLocaleString('en-US')}+`;
    return Math.round(value).toLocaleString('en-US');
  }

  function animateCounter(el, target, duration = 2000) {
    if (el.dataset.animated === 'true') return;
    el.dataset.animated = 'true';
    el.textContent = formatCount(0, el);
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatCount(target * eased, el);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = formatCount(target, el);
      }
    }

    requestAnimationFrame(tick);
  }

  const counterObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        if (Number.isNaN(target)) return;
        if (prefersReducedMotion) {
          el.textContent = formatCount(target, el);
          el.dataset.animated = 'true';
        } else {
          animateCounter(el, target);
        }
        counterObserver.unobserve(el);
      });
    },
    { threshold: 0.4 }
  );

  document.querySelectorAll('.tree-counter[data-count]').forEach(el => {
    if (prefersReducedMotion) {
      const target = parseInt(el.dataset.count, 10);
      if (!Number.isNaN(target)) el.textContent = formatCount(target, el);
    } else {
      counterObserver.observe(el);
    }
  });

  galleryItems.forEach((item, index) => {
    item.addEventListener('click', () => openLightbox(index, item));
  });

  lightboxClose?.addEventListener('click', closeLightbox);
  lightboxBackdrop?.addEventListener('click', closeLightbox);
  lightboxPrev?.addEventListener('click', () => showLightboxSlide(lightboxIndex - 1));
  lightboxNext?.addEventListener('click', () => showLightboxSlide(lightboxIndex + 1));

  let touchStartX = 0;
  lightbox?.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  lightbox?.addEventListener('touchend', e => {
    const diff = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) < 50) return;
    if (diff > 0) showLightboxSlide(lightboxIndex - 1);
    else showLightboxSlide(lightboxIndex + 1);
  }, { passive: true });
});

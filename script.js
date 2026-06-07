document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  // Sticky header on scroll
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 60);
  });

  // Mobile nav toggle
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen);
  });

  // Close mobile nav on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
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
    '.ranch-feature, .trees-feature, .trees-gallery, .architecture-feature, .stay-grid, .mau-grid, .gallery-grid img, .contact-card'
  ).forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
  });

  // Mark broken images as placeholders
  document.querySelectorAll('img').forEach(img => {
    if (!img.complete || img.naturalHeight === 0) {
      img.classList.add('placeholder');
    }
    img.addEventListener('error', () => img.classList.add('placeholder'));
  });
});

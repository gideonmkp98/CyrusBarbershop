export interface RevealOptions {
  direction?: string;
  delay?: number;
}

export function reveal(node: HTMLElement, options: RevealOptions = {}) {
  const direction = options.direction || 'up';
  if (direction !== 'up') node.setAttribute('data-reveal', direction);
  else node.setAttribute('data-reveal', '');
  if (options.delay) node.setAttribute('data-delay', String(options.delay));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  observer.observe(node);
  return { destroy() { observer.unobserve(node); } };
}
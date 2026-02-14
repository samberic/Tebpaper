/* ==========================================================================
   Progressive Enhancement
   Everything works without JS. This file adds small UX improvements.
   ========================================================================== */

(function () {
  'use strict';

  // --- Range input live value display ---
  document.querySelectorAll('.range-input').forEach(function (range) {
    var output = range.parentElement.querySelector('.weight-value');
    if (!output) return;
    range.addEventListener('input', function () {
      output.textContent = range.value;
    });
  });

  // --- Confirm before generating a new digest ---
  document.querySelectorAll('.digest-refresh form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      var btn = form.querySelector('button[type="submit"]');
      if (btn && !btn.dataset.confirmed) {
        e.preventDefault();
        btn.textContent = 'Generating\u2026';
        btn.disabled = true;
        btn.dataset.confirmed = '1';
        form.submit();
      }
    });
  });

  // --- Smooth expand for article summaries on digest page ---
  document.querySelectorAll('.story-body').forEach(function (body) {
    var full = body.innerHTML;
    var text = body.textContent || '';
    if (text.length < 400) return;

    // Collapse to first paragraph
    var firstP = body.querySelector('p');
    if (!firstP) return;

    var collapsed = firstP.outerHTML;
    var expanded = false;

    body.innerHTML = collapsed;
    body.style.cursor = 'pointer';
    body.setAttribute('role', 'button');
    body.setAttribute('tabindex', '0');
    body.setAttribute('aria-expanded', 'false');
    body.title = 'Click to expand';

    function toggle() {
      expanded = !expanded;
      body.innerHTML = expanded ? full : collapsed;
      body.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      body.title = expanded ? 'Click to collapse' : 'Click to expand';
    }

    body.addEventListener('click', toggle);
    body.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });

  // --- Loading state for generate button ---
  document.querySelectorAll('form[action="/digest/generate"]').forEach(function (form) {
    form.addEventListener('submit', function () {
      var btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.textContent = 'Generating your edition\u2026';
        btn.disabled = true;
      }
    });
  });
})();

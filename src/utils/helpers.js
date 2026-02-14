// Handlebars helper functions

export function registerHelpers(hbs) {
  hbs.handlebars.registerHelper('eq', (a, b) => a === b);

  hbs.handlebars.registerHelper('capitalize', (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  hbs.handlebars.registerHelper('truncate', (str, len) => {
    if (!str) return '';
    if (str.length <= len) return str;
    return str.slice(0, len) + '…';
  });

  hbs.handlebars.registerHelper('formatDate', (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  hbs.handlebars.registerHelper('relativeTime', (date) => {
    if (!date) return '';
    const now = Date.now();
    const diff = now - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return `${Math.floor(days / 7)} weeks ago`;
  });

  hbs.handlebars.registerHelper('paragraphs', (text) => {
    if (!text) return '';
    return text
      .split(/\n\n+/)
      .map((p) => `<p>${p.trim()}</p>`)
      .join('\n');
  });

  hbs.handlebars.registerHelper('json', (context) => {
    return JSON.stringify(context);
  });

  // Block helper for iterating over object keys
  hbs.handlebars.registerHelper('eachInMap', function (map, options) {
    let out = '';
    if (map && typeof map === 'object') {
      for (const [key, value] of Object.entries(map)) {
        out += options.fn({ key, value });
      }
    }
    return out;
  });
}

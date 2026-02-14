import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

// Import the app by starting the server on a random port
let server;
let baseUrl;

async function fetch(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
    };

    if (opts.body) {
      const body = typeof opts.body === 'string' ? opts.body : new URLSearchParams(opts.body).toString();
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });

    req.on('error', reject);
    if (opts.body) {
      const body = typeof opts.body === 'string' ? opts.body : new URLSearchParams(opts.body).toString();
      req.write(body);
    }
    req.end();
  });
}

before(async () => {
  // Dynamically import the server with a random port
  process.env.PORT = '0'; // Will be overridden
  const express = (await import('express')).default;
  const { create } = await import('express-handlebars');
  const cookieParser = (await import('cookie-parser')).default;
  const path = await import('path');
  const { fileURLToPath } = await import('url');

  const { attachUser } = await import('../src/middleware/auth.js');
  const { registerHelpers } = await import('../src/utils/helpers.js');
  const authRoutes = (await import('../src/routes/auth.js')).default;
  const digestRoutes = (await import('../src/routes/digest.js')).default;
  const settingsRoutes = (await import('../src/routes/settings.js')).default;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.join(__dirname, '..');
  const app = express();

  const hbs = create({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(rootDir, 'views', 'layouts'),
    partialsDir: path.join(rootDir, 'views', 'partials'),
  });

  registerHelpers(hbs);

  app.engine('.hbs', hbs.engine);
  app.set('view engine', '.hbs');
  app.set('views', path.join(rootDir, 'views'));

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static(path.join(rootDir, 'public')));
  app.use(attachUser);

  app.use((req, res, next) => {
    res.locals.user = res.locals.user || null;
    res.locals.currentDate = new Date().toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    res.locals.isHome = req.path === '/';
    res.locals.isHistory = req.path.startsWith('/digest/history');
    res.locals.isSettings = req.path.startsWith('/settings');
    next();
  });

  app.use('/', authRoutes);
  app.use('/', digestRoutes);
  app.use('/', settingsRoutes);

  app.use((req, res) => {
    res.status(404).render('error', { title: 'Not Found', message: 'Not found.' });
  });

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(() => {
  if (server) server.close();
});

describe('Anonymous user - Homepage', () => {
  it('GET / returns 200 with the homepage', async () => {
    const res = await fetch('/');
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('The TebPaper'));
  });

  it('GET / shows generate form for anonymous users', async () => {
    const res = await fetch('/');
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('political_leaning'));
    assert.ok(res.body.includes('Generate Edition'));
  });

  it('GET / includes all political leaning options', async () => {
    const res = await fetch('/');
    const leanings = ['left', 'centre-left', 'centre', 'centre-right', 'right'];
    for (const leaning of leanings) {
      assert.ok(res.body.includes(`value="${leaning}"`), `Missing leaning option: ${leaning}`);
    }
  });

  it('GET / shows feature descriptions', async () => {
    const res = await fetch('/');
    assert.ok(res.body.includes('Curated, not algorithmic'));
    assert.ok(res.body.includes('Bypass the paywall'));
  });
});

describe('Anonymous user - Navigation', () => {
  it('GET / has navigation with Home, Sign In, Register', async () => {
    const res = await fetch('/');
    assert.ok(res.body.includes('Home'));
    assert.ok(res.body.includes('Sign In'));
    assert.ok(res.body.includes('Register'));
  });

  it('GET / does not show logged-in nav items', async () => {
    const res = await fetch('/');
    assert.ok(!res.body.includes("Today's Edition"));
    assert.ok(!res.body.includes('Past Editions'));
    assert.ok(!res.body.includes('Settings'));
  });
});

describe('Auth pages', () => {
  it('GET /login returns 200', async () => {
    const res = await fetch('/login');
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('Sign In'));
  });

  it('GET /register returns 200', async () => {
    const res = await fetch('/register');
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('Create Account'));
  });

  it('POST /login with missing fields shows error', async () => {
    const res = await fetch('/login', {
      method: 'POST',
      body: { email: '', password: '' },
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('required'));
  });

  it('POST /register with mismatched passwords shows error', async () => {
    const res = await fetch('/register', {
      method: 'POST',
      body: {
        email: 'test@test.com',
        password: 'password123',
        password_confirm: 'different',
        display_name: 'Test',
      },
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('do not match'));
  });

  it('POST /register with short password shows error', async () => {
    const res = await fetch('/register', {
      method: 'POST',
      body: {
        email: 'test@test.com',
        password: 'short',
        password_confirm: 'short',
        display_name: 'Test',
      },
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('8 characters'));
  });
});

describe('Protected routes', () => {
  it('GET /settings redirects to login', async () => {
    const res = await fetch('/settings');
    assert.equal(res.status, 302);
    assert.ok(res.headers.location.includes('/login'));
  });

  it('GET /digest/history redirects to login', async () => {
    const res = await fetch('/digest/history');
    assert.equal(res.status, 302);
    assert.ok(res.headers.location.includes('/login'));
  });
});

describe('Static assets', () => {
  it('GET /css/style.css returns 200', async () => {
    const res = await fetch('/css/style.css');
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('--serif'));
  });

  it('GET /js/enhance.js returns 200', async () => {
    const res = await fetch('/js/enhance.js');
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('Progressive Enhancement'));
  });
});

describe('404 handling', () => {
  it('GET /nonexistent returns 404', async () => {
    const res = await fetch('/nonexistent');
    assert.equal(res.status, 404);
    assert.ok(res.body.includes('Not Found') || res.body.includes('does not exist'));
  });
});

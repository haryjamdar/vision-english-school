# The Vision English School, Buldhana — Website

A React + Vite + Tailwind CSS website for The Vision English School, Buldhana, Maharashtra. Includes an admissions age calculator, notices board, photo gallery, contact form, and a password-protected admin portal for managing site content.

## Requirements

- **Node.js** version 18 or higher (Node 20 LTS recommended). Check your version with:
  ```
  node -v
  ```
  If you don't have Node installed, download it from https://nodejs.org

## Project structure

```
├── index.html              # HTML entry point
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite bundler configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration (required by Tailwind)
├── src/
│   ├── main.jsx             # React app entry point
│   ├── App.jsx               # Main application component (all pages/routes)
│   ├── index.css              # Global styles + Tailwind directives
│   └── assets/
│       ├── logo.webp          # School crest/logo
│       └── principal.webp     # Principal's photo
└── README.md
```

## Running the website locally

1. **Open a terminal** and navigate into this project folder:
   ```
   cd the-vision-english-school-buldhana
   ```
   (or whatever you named the extracted folder)

2. **Install dependencies** (only needed once, or after you change package.json):
   ```
   npm install
   ```
   This downloads React, Vite, Tailwind CSS, and everything else the project needs into a `node_modules` folder.

3. **Start the local dev server:**
   ```
   npm run dev
   ```
   You should see output like:
   ```
   VITE v5.x.x  ready in xxx ms
   ➜  Local:   http://localhost:5173/
   ```

4. **Open the site** — Vite should open your browser automatically. If not, open the `Local` URL shown (usually `http://localhost:5173`) in any browser.

5. **Stop the server** anytime with `Ctrl + C` in the terminal.

The dev server supports hot-reload: edit `src/App.jsx` and the page updates automatically without a manual refresh.

## Building for production / real deployment

When you're ready to put this on real hosting (not just running on your own computer):

```
npm run build
```

This creates a `dist/` folder containing the finished, optimized static site (plain HTML/CSS/JS — no Node.js needed to serve it). You can upload the contents of `dist/` to any static web host, for example:

- **Netlify** or **Vercel** — drag-and-drop the `dist` folder, or connect a Git repo and set the build command to `npm run build` and the output directory to `dist`.
- **GitHub Pages** — push `dist/` contents to a `gh-pages` branch, or use a GitHub Action.
- **Your own web server / cPanel hosting** — upload the contents of `dist/` to your `public_html` (or equivalent) folder via FTP.

To preview the production build locally before deploying:
```
npm run preview
```

## Admin Portal

Click "Admin Portal" in the navigation (or scroll to it on mobile) to log in and manage:
- **Notices** — publish and delete notices/circulars
- **Site Info** — edit the school's address, phone/WhatsApp number, email, office hours, and admissions year (used across the whole site)
- **Gallery / Activities** — upload photos and captions for the public Gallery page
- **Inquiries** — view contact-form submissions

**Default admin password:** `VISION@761`
You'll likely want to change this — search for `VISION@761` inside `src/App.jsx` and replace it with your own password. Note that since this is a front-end-only site, the password lives in the JavaScript source code and is visible to anyone who views the page source; it's a basic deterrent, not real security. For a genuinely secure admin login, you'd need a backend/authentication service.

## Data storage — please read

This site currently stores its data (notices, site info, gallery entries, submitted inquiries) using **the browser's local storage**. That means:

- Changes an admin makes are saved in *that specific browser, on that specific device*.
- They will **not** automatically appear on a different browser, computer, or phone.
- Clearing browser data/cache will erase them.

This is fine for trying things out or for a single-admin, single-device setup, but if you want the same notices/gallery/site info to show up consistently for every visitor and sync across devices, you'll need to connect this to a real backend/database (for example Firebase, Supabase, or a simple custom API + database). That would involve replacing the `localStorage` calls in `src/App.jsx` with API calls to whatever backend you choose — happy to help with that when you're ready.

The **Contact form**'s WhatsApp button works independently of this and always sends messages in real time to the configured WhatsApp number, regardless of storage.

## Customizing

- **School contact info**: edit via the Admin Portal → Site Info tab (or edit the `defaultSiteInfo` object near the top of `src/App.jsx` for the built-in defaults).
- **Colors/branding**: this project uses Tailwind CSS utility classes throughout `src/App.jsx` (indigo/amber theme). Search for `indigo-` / `amber-` class names to adjust the palette, or extend `tailwind.config.js`.
- **Logo/photo**: replace `src/assets/logo.webp` and `src/assets/principal.webp` with new files of the same name, or update the `import` paths at the top of `src/App.jsx`.

## Troubleshooting

- **`npm install` fails** — make sure you're using Node 18+ (`node -v`). Delete `node_modules` and `package-lock.json` if present, then retry.
- **Blank page in browser** — open the browser console (F12) for errors; make sure `npm run dev` is still running in the terminal.
- **Port already in use** — Vite will automatically try the next available port (5174, 5175, ...); check the terminal output for the actual URL.

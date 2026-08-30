/* ==========================================================================
   PORTFOLIO FRONTEND
   Every section on this page is built from the Google Sheet. Nothing here
   is hard-coded except the fallback dataset at the bottom of this block,
   which keeps the site presentable if the endpoint is unreachable.

   1. Paste your Apps Script Web App URL into API_URL below.
   2. Everything else is edited in the spreadsheet.
   ========================================================================== */

var API_URL = "https://script.google.com/macros/s/AKfycbwHacbP-WnLn-Q3p0s-6nPzmbEkkC8ud7ljwlz6cDvDZjFzaB4xzZEuUddzTQmyEvii/exec"; // ← "https://script.google.com/macros/s/AKfy.../exec"

/* ── State ────────────────────────────────────────────────────────────── */
var CFG = {};      // ⚙ Config          → key/value map
var SECS = [];     // 🧩 Sections       → order, visibility, headings
var NAV = [];      // 🧭 Navigation
var STATS = [];    // 📊 Stats
var SKILLS = [];   // 🧠 Skills
var TOOLS = [];    // 🧰 Tools
var PROJECTS = []; // 🚀 Projects
var TSTS = [];     // 💬 Testimonials
var SVCS = [];     // 🛠 Services
var EXP = [];      // 🗓 Experience
var FAQS = [];     // ❓ FAQ
var SOCIAL = [];   // 🔗 Social Links
var FORMOPTS = {}; // 📝 Form Options
var ABOUT = {};    // 📔 About         → key/value map, the About section only
var RESUME = {};   // 📄 Resume        → key/value map, like ⚙ Config
var RXTRA = [];    // 🏅 Resume Extras → grouped list rows
var LIVE = false;  // true once sheet data has loaded

var FILTER = "All";
var ROUTE = { name: "home", slug: "" }; // current page, see parseRoute()
var LENIS = null;                       // smooth-scroll instance, null when disabled

/* Where the site is mounted. Derived from wherever the <script> tag points,
   so hosting under a subdirectory needs no extra configuration — just point
   the tag at /sub/assets/js/site.js and everything follows. */
var BASE = (function () {
    var tag = document.querySelector('script[src*="site.js"]');
    if (!tag) return "";
    try {
        return new URL(tag.getAttribute("src"), location.href).pathname
            .replace(/\/assets\/js\/site\.js.*$/, "");
    } catch (e) { return ""; }
})();

// Check if fonts are loaded
function checkFonts() {
    // Use Font Loading API
    if (document.fonts) {
        document.fonts.ready.then(function () {
            document.body.classList.add('fonts-loaded');
        });
    }
}

// Alternative: check after page load
window.addEventListener('load', function () {
    // Force a re-render
    document.body.style.opacity = '0.99';
    setTimeout(function () {
        document.body.style.opacity = '1';
    }, 10);
});



/* ── Tiny helpers ─────────────────────────────────────────────────────── */
function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

function esc(v) {
    return String(v === undefined || v === null ? "" : v)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* Config lookup that tolerates spacing / casing differences in the sheet. */
function cfg(key, fallback) {
    if (CFG && CFG[key] !== undefined && CFG[key] !== "") return CFG[key];
    var flat = String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
    for (var k in CFG) {
        if (String(k).toLowerCase().replace(/[^a-z0-9]/g, "") === flat && CFG[k] !== "") return CFG[k];
    }
    return fallback === undefined ? "" : fallback;
}

function on(key, dflt) {
    var v = cfg(key, dflt === undefined ? "yes" : dflt);
    var s = String(v).trim().toLowerCase();
    return !(s === "no" || s === "false" || s === "0" || s === "off" || s === "hide" || s === "");
}

/* 📄 Resume first, ⚙ Config second, argument last. Two lookups rather than
   one because the résumé sheet is optional: a workbook that predates it
   still fills the page from Config, and a blank cell on the résumé sheet
   means "use whatever the site already says" instead of "show nothing". */
/* 📔 About. Its own sheet, so the About section can say something other
   than the hero — the two used to share aboutBody and aboutMarks, which
   meant the same three paragraphs appeared twice on one page. A blank
   cell here falls through to ⚙ Config, so a half-filled sheet still
   renders rather than showing an empty block. */
function acfg(key, fallback) {
    if (ABOUT && ABOUT[key] !== undefined && ABOUT[key] !== "") return ABOUT[key];
    return cfg(key, fallback);
}

function aon(key, dflt) {
    var s = String(acfg(key, dflt === undefined ? "yes" : dflt)).trim().toLowerCase();
    return !(s === "no" || s === "false" || s === "0" || s === "off" || s === "hide" || s === "");
}

/* "6+ | Years building automation" → ["6+", "Years building automation"].
   One row per line, the pipe splitting figure from label. Used by the
   fact chips and the process steps. */
function pairs(v) {
    return lines(v).map(function (l) {
        var i = l.indexOf("|");
        return i === -1
            ? { a: l.trim(), b: "" }
            : { a: l.slice(0, i).trim(), b: l.slice(i + 1).trim() };
    }).filter(function (p) { return p.a; });
}

function rcfg(key, fallback) {
    if (RESUME && RESUME[key] !== undefined && RESUME[key] !== "") return RESUME[key];

    var flat = String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
    for (var k in RESUME) {
        if (String(k).toLowerCase().replace(/[^a-z0-9]/g, "") === flat && RESUME[k] !== "") return RESUME[k];
    }
    return cfg(key, fallback);
}

/* The on()/rcfg() pairing — a résumé toggle that can also be left to Config. */
function ron(key, dflt) {
    var s = String(rcfg(key, dflt === undefined ? "yes" : dflt)).trim().toLowerCase();
    return !(s === "no" || s === "false" || s === "0" || s === "off" || s === "hide" || s === "");
}

/* Multi-line cell → array of trimmed, non-empty lines. */
function lines(v) {
    return String(v || "").split(/\r?\n/).map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length; });
}

/* Comma OR newline separated cell → array. */
function listOf(v) {
    return String(v || "").split(/[\n,]/).map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length; });
}

/* *word* → <em>word</em>, and line breaks → <br>. Lets the sheet control
   which words get the accent colour without any HTML in the cell. */
function markup(v) {
    return esc(v).replace(/\*([^*]+)\*/g, "<em>$1</em>").replace(/\r?\n/g, "<br>");
}

function icon(v, dflt) {
    var s = String(v || "").trim();
    if (!s) return dflt || "fa-solid fa-circle-dot";
    return /^fa[-srbl]/.test(s) ? s : "fa-solid " + (s.indexOf("fa-") === 0 ? s : "fa-" + s);
}

function initials(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2)
        .map(function (w) { return w.charAt(0).toUpperCase(); }).join("");
}

function slugify(v) {
    return String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/* Any video link the sheet might hold → a URL an <iframe> will actually
   play. Handles watch?v=, youtu.be, /shorts/, /live/, Vimeo and Loom, and
   passes anything already embeddable straight through. */
function videoEmbed(url) {
    var u = String(url || "").trim();
    if (!u) return "";
    if (/\/embed\/|player\.vimeo\.com|\/videoseries/.test(u)) return u;

    var yt = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    if (yt) {
        var t = u.match(/[?&](?:t|start)=(\d+)/);
        return "https://www.youtube-nocookie.com/embed/" + yt[1] +
            "?rel=0&modestbranding=1&playsinline=1" + (t ? "&start=" + t[1] : "");
    }

    var vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return "https://player.vimeo.com/video/" + vm[1];

    var lo = u.match(/loom\.com\/(?:share|embed)\/([A-Za-z0-9]+)/);
    if (lo) return "https://www.loom.com/embed/" + lo[1];

    return u; // assume the cell already holds an embeddable URL
}

/* Avatar element that degrades to initials when the URL is missing/broken. */
function avatar(url, name, cls) {
    if (url) {
        return '<img src="' + esc(sizedImg(url, 128)) + '" alt="' + esc(name) + '" loading="lazy" ' +
            'onerror="this.outerHTML=\'<span class=&quot;av-fallback ' + (cls || '') + '&quot;>' +
            esc(initials(name)) + '</span>\'">';
    }
    return '<span class="av-fallback ' + (cls || '') + '">' + esc(initials(name)) + '</span>';
}

/* Section meta from the 🧩 Sections sheet. */
/* Where does this block appear?
   ---------------------------------------------------------------------
   🧩 Sections has a column per page — Home and About Page — so a block
   can be on one, both or neither. That replaces the old single Show
   column, which could only say "on the home page or nowhere" and was
   the reason About and Experience kept coming back to the home page on
   every export.

   Falls back to the old Show column, so a content.js exported before
   this change still renders instead of coming up blank. */
function onPage(s, page) {
    if (!s) return false;
    var v = (page === "about") ? s.aboutPage : s.home;
    if (v === undefined) return on2(s.show);   // pre-placement content.js
    return on2(v);
}

function sec(key) {
    for (var i = 0; i < SECS.length; i++) if (SECS[i].key === key) return SECS[i];
    return { key: key, show: true, eyebrow: "", title: "", subtitle: "" };
}

function secHead(key, num, center) {
    var s = sec(key);
    if (!s.title && !s.eyebrow && !s.subtitle) return "";
    return '<header class="sec-head' + (center ? ' center' : '') + '" data-reveal>' +
        (s.eyebrow ? '<span class="mono-label"><span class="eyebrow-num">' +
            (num || "") + '</span> ' + esc(s.eyebrow) + '</span>' : '') +
        (s.title ? '<h2 class="sec-title">' + markup(s.title) + '</h2>' : '') +
        (s.subtitle ? '<p class="sec-sub">' + markup(s.subtitle) + '</p>' : '') +
        '</header>';
}

/* ==========================================================================
   ROUTER
   Three pages, real URLs, one HTML file:

     /                     home — featured projects only
     /portfolio            every project
     /portfolio/<slug>     one project in full
     /about                a standalone About page

   The host has to rewrite unknown paths to index.html; see the _redirects,
   vercel.json, .htaccess and 404.html shipped alongside this file.
   ========================================================================== */

/* Leading slash, no trailing slash. Set by ⚙ Config → "Projects Base Path". */
function projBase() {
    var b = String(cfg("projectsBasePath", "/projects")).trim();
    if (!b) b = "/projects";
    if (b.charAt(0) !== "/") b = "/" + b;
    return b.replace(/\/+$/, "");
}

function urlHome() { return BASE + "/"; }
function urlProjects() { return BASE + projBase(); }
function urlProject(slug) { return BASE + projBase() + "/" + encodeURIComponent(slug); }

/* ── Unlisted résumé ──────────────────────────────────────────────────
   A fourth page that nothing on the site points at. It never appears in
   the nav, the drawer, the footer, a breadcrumb or a sitemap, and it asks
   crawlers not to index it. Two ways in, both of them typed:

     • the path itself            →  /resume
     • the trigger word, typed on any page, outside a form field
                                  →  "resume"

   Both are set in ⚙ Config ("Resume Path", "Resume Trigger"), so the
   path can be changed to something unguessable without touching code. */
function resumePath() {
    var p = String(rcfg("resumePath", "/resume")).trim();
    if (!p) p = "/resume";
    if (p.charAt(0) !== "/") p = "/" + p;
    return p.replace(/\/+$/, "");
}

function urlResume() { return BASE + resumePath(); }

/* The standalone About page — same rewrite requirement as the projects page. */
function aboutPath() {
    var p = String(cfg("aboutPath", "/about")).trim();
    if (!p) p = "/about";
    if (p.charAt(0) !== "/") p = "/" + p;
    return p.replace(/\/+$/, "");
}

function urlAbout() { return BASE + aboutPath(); }

/* Letters and digits only — the buffer that watches for it is built from
   single printable keypresses, so anything else could never match. */
function resumeTrigger() {
    return String(rcfg("resumeTrigger", "resume")).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/* About path, e.g. /about. Leading slash, no trailing slash. */
function aboutPath() {
    var p = String(cfg("aboutPath", "/about")).trim();
    if (!p) p = "/about";
    if (p.charAt(0) !== "/") p = "/" + p;
    return p.replace(/\/+$/, "");
}

function urlAbout() { return BASE + aboutPath(); }

/* location.pathname → { name, slug } */
function parseRoute() {
    var path = location.pathname;
    if (BASE && path.indexOf(BASE) === 0) path = path.slice(BASE.length);
    path = path.replace(/\/index\.html$/, "/");
    if (!path) path = "/";

    var rp = resumePath();
    if (path === rp || path === rp + "/") return { name: "resume", slug: "" };

    var ap = aboutPath();
    if (path === ap || path === ap + "/") return { name: "about", slug: "" };

    var pb = projBase();
    if (path === pb || path === pb + "/") return { name: "projects", slug: "" };

    if (path.indexOf(pb + "/") === 0) {
        var slug = path.slice(pb.length + 1).replace(/\/+$/, "");
        try { slug = decodeURIComponent(slug); } catch (e) { /* leave as-is */ }
        return slug ? { name: "project", slug: slug } : { name: "projects", slug: "" };
    }
    return { name: "home", slug: "" };
}

/* Per-page scroll memory: when the visitor leaves a page we remember how far
   down they were, so the Back button (or an in-site "back" link) drops them
   where they left off instead of snapping to the top. Keyed by pathname. */
var SCROLL_CACHE = {};
function pageKey() { return location.pathname + location.search; }

/* Move to another page. `hash` is an optional #section to land on once the
   new page has rendered. */
function go(url, hash, replace) {
    var full = url + (hash || "");
    if (history.pushState) {
        if (replace) {
            history.replaceState({}, "", full);
        } else {
            /* Remember where we were before this page change. */
            SCROLL_CACHE[pageKey()] = window.scrollY || document.documentElement.scrollTop || 0;
            history.pushState({}, "", full);
        }
    } else {
        location.href = full;
        return;
    }
    enterRoute(hash);
}

function enterRoute(hash) {
    var main = document.getElementById("main");
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Fade the outgoing page out, swap, fade the new one in. Two short
    // halves rather than one long one — a page change should feel like a
    // cut with a soft edge, not a dissolve.
    if (main && !reduced) {
        main.classList.add("page-leaving");
        setTimeout(function () { paintRoute(hash); }, 170);
        return;
    }
    paintRoute(hash);
}

function paintRoute(hash) {
    var main = document.getElementById("main");

    ROUTE = parseRoute();
    FILTER = "All";           // a fresh page starts unfiltered
    applyMeta();
    render();
    initUI();
    staggerize();

    if (main) {
        main.classList.remove("page-leaving");
        main.classList.add("page-entering");
        setTimeout(function () { main.classList.remove("page-entering"); }, 520);
    }

    if (ROUTE.name === "project") ensureProjectBody(findProject(ROUTE.slug));

    /* render() swapped the whole document out from under Lenis. Its cached
       max-scroll ("limit") still reflects the previous page until a resize,
       so any scrollTo would clamp mid-page — the "have to click twice" bug.
       Force a re-measure before anything scrolls. */
    if (LENIS) LENIS.resize();

    /* Back / forward: land where the visitor left off on this page.
       Checked before the hash so a stale in-page anchor (e.g. #hero left by
       the brand link) can't yank the visitor back to the top — the exact
       scroll position they were at matters more than a leftover hash. */
    var key = pageKey();
    if (Object.prototype.hasOwnProperty.call(SCROLL_CACHE, key)) {
        var saved = SCROLL_CACHE[key];
        delete SCROLL_CACHE[key];
        function restore() {
            var opts = { duration: 0.9, force: true, lock: true };
            if (LENIS) LENIS.scrollTo(saved, opts);
            else window.scrollTo({ top: saved, behavior: "smooth" });
        }
        /* Images land lazily and reveals resize the page after the first
           render, so fly to the saved spot once, then nudge it home again
           a couple of times once the layout has settled. */
        setTimeout(restore, 30);
        setTimeout(restore, 300);
        setTimeout(restore, 800);
        return;
    }

    if (hash) {
        var el = document.getElementById(hash.replace(/^#/, ""));
        if (el) { jumpTop(); scrollToEl(el); return; }
    }

    jumpTop();
}

/* Route changes should start at the top with no animation — easing a whole
   page height would just look like a glitch. */
function jumpTop() {
    if (LENIS) LENIS.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
}

/* ==========================================================================
   RICH DESCRIPTION PARSER
   Turns a plain Description cell into structured blocks. A line ending in a
   colon starts a new block; the lines beneath it become that block's body.
   Recognised headings render as tailored components, anything else becomes a
   plain titled block. Empty blocks are dropped automatically.

     Overview:      paragraphs
     Problem:       paragraphs
     Solution:      paragraphs
     Features:      checklist
     Highlights:    checklist
     Results:       checklist
     Stack:         pills
     Tech:          pills
     For:           pills
     How It Works:  numbered steps
     Process:       numbered steps
     FAQ:           question line, then "Answer: ..."
   ========================================================================== */
function parseRich(text) {
    var raw = String(text || "").replace(/\r/g, "");
    if (!raw.trim()) return [];

    var blocks = [];
    var current = { title: "", body: [] };

    raw.split("\n").forEach(function (ln) {
        var t = ln.trim();
        var isHeading = /^[A-Za-z][A-Za-z0-9 &/'’-]{0,38}:$/.test(t);
        if (isHeading) {
            if (current.title || current.body.length) blocks.push(current);
            current = { title: t.replace(/:$/, "").trim(), body: [] };
        } else {
            current.body.push(t);
        }
    });
    if (current.title || current.body.length) blocks.push(current);

    return blocks.map(function (b) {
        var key = b.title.toLowerCase();
        var body = b.body.filter(function (s) { return s.length; });
        var kind = "text";

        if (/^(features|highlights|results|benefits|outcomes|deliverables|key features)$/.test(key)) kind = "check";
        else if (/^(stack|tech|tech stack|tools|built with|for|audience)$/.test(key)) kind = "pills";
        else if (/^(how it works|process|steps|workflow|how to use)$/.test(key)) kind = "steps";
        else if (/^(faq|questions)$/.test(key)) kind = "faq";

        return { title: b.title, kind: kind, body: body, raw: b.body };
    }).filter(function (b) { return b.body.length; });
}

function renderRich(text) {
    var blocks = parseRich(text);
    if (!blocks.length) return "";

    return blocks.map(function (b) {
        var head = b.title ? '<h3>' + esc(b.title) + '</h3>' : '';
        var inner = "";

        if (b.kind === "check") {
            inner = '<ul class="pp-list">' + b.body.map(function (l) {
                return '<li><i class="fa-solid fa-check"></i><span>' + esc(l.replace(/^[-•*]\s*/, "")) + '</span></li>';
            }).join("") + '</ul>';

        } else if (b.kind === "pills") {
            var items = b.body.length === 1 ? listOf(b.body[0]) : b.body;
            inner = '<div class="tag-row">' + items.map(function (l) {
                return '<span class="pill accent">' + esc(l) + '</span>';
            }).join("") + '</div>';

        } else if (b.kind === "steps") {
            inner = '<ol class="pp-steps">' + b.body.map(function (l) {
                return '<li><span>' + esc(l.replace(/^\d+[.)]\s*/, "")) + '</span></li>';
            }).join("") + '</ol>';

        } else if (b.kind === "faq") {
            var out = "", q = null;
            b.body.forEach(function (l) {
                if (/^answer\s*:/i.test(l)) {
                    out += '<div class="pp-block" style="margin-bottom:.9rem">' +
                        (q ? '<p style="color:var(--text);font-weight:500;margin-bottom:.25rem">' + esc(q) + '</p>' : '') +
                        '<p>' + esc(l.replace(/^answer\s*:\s*/i, "")) + '</p></div>';
                    q = null;
                } else { q = l; }
            });
            inner = out;

        } else {
            inner = b.body.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join("");
        }

        return '<div class="pp-block">' + head + inner + '</div>';
    }).join("");
}

/* ==========================================================================
   CONTENT SOURCES
   --------------------------------------------------------------------------
   Two tiers, deliberately:

     STATIC  — assets/js/content.js, compiled from the workbook. Identity,
               every piece of section copy, navigation, stats, skills, tools,
               services, experience, FAQ, form options, the résumé settings
               and the section order. None of it changes week to week, so
               none of it is worth a round-trip to Google on every visit.
               It is parsed before the first paint and the page renders from
               it immediately.

     LIVE    — 🚀 Projects, 💬 Testimonials, 🔗 Social Links and the two
               availability pills. These genuinely move, so they are still
               read from the sheet — but after the page is already on screen,
               never in front of it. content.js also carries the last
               exported copy of them (SITE_SEED) so the very first paint is
               complete rather than skeletal.

   The upshot: the sheet stays the single place content is edited, and a
   slow or sleeping Apps Script deployment can no longer hold the site
   hostage. Worst case the visitor sees content that is one export old.
   ========================================================================== */

var STATIC = (typeof window !== "undefined" && window.SITE_CONTENT) || null;
var SEED = (typeof window !== "undefined" && window.SITE_SEED) ||
    { projects: [], testimonials: [], social: [] };

if (!STATIC) {
    // content.js failed to load. Rather than render nothing, fall back to the
    // sheet for everything — slower, but the page still comes up.
    console.warn("content.js missing — falling back to the sheet for static content.");
    STATIC = {
        config: {}, sections: [
            { key: "hero", show: true, order: 1 },
            { key: "stats", show: true, order: 2 },
            { key: "services", show: true, order: 3 },
            { key: "projects", show: true, order: 4 },
            { key: "testimonials", show: true, order: 5 },
            { key: "skills", show: true, order: 6 },
            { key: "about", show: true, order: 7 },
            { key: "video", show: true, order: 8 },
            { key: "experience", show: true, order: 9 },
            { key: "faq", show: true, order: 10 },
            { key: "contact", show: true, order: 11 }
        ],
        about: {}, nav: [], stats: [], skills: [], tools: [], services: [],
        experience: [], faq: [], formOptions: {}, resume: {}, resumeExtras: []
    };
}

/* The keys the sheet is still allowed to override at runtime. Everything
   else in ⚙ Config is compiled. Keep this list short — each entry is a
   value that can change without a re-export. */
var LIVE_CONFIG_KEYS = ["availabilityStatus", "statusText", "trustText", "videoEmbedUrl"];

/* One merged view, so every existing reader (cfg(), sec(), pick()…) keeps
   working exactly as it did. */
var DEMO = {
    config: STATIC.config || {},
    about: STATIC.about || {},
    sections: STATIC.sections || [],
    nav: STATIC.nav || [],
    stats: STATIC.stats || [],
    skills: STATIC.skills || [],
    tools: STATIC.tools || [],
    services: STATIC.services || [],
    experience: STATIC.experience || [],
    faq: STATIC.faq || [],
    formOptions: STATIC.formOptions || {},
    resume: STATIC.resume || {},
    resumeExtras: STATIC.resumeExtras || [],
    projects: SEED.projects || [],
    testimonials: SEED.testimonials || [],
    social: SEED.social || []
};

/* ==========================================================================
   DATA LAYER  —  paint first, refresh second
   ==========================================================================
   boot()        renders the whole page from compiled content. No await, no
                 spinner waiting on Google.
   hydrate()     asks the sheet for the three live collections, then patches
                 only the blocks that actually changed.
   Between visits the last live payload is kept in localStorage, so a repeat
   visitor sees current projects and reviews on the first frame.
   ========================================================================== */

var LIVE_STORE = "site-live-v2";
var LIVE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;   // a week; older cache is ignored
var SEC_NUM = {};                             // section key → "[03]" label
var PROJ_FULL = {};                           // slug → full row, once fetched

function boot() {
    /* Scroll state is handled by this app (see SCROLL_CACHE in go()), so
       the browser's native back-button scroll restoration must not fight it. */
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    preload(40, "composing");
    applyStatic();
    hydrate();
}

/* ── Paint ────────────────────────────────────────────────────────────── */
function applyStatic() {
    CFG = DEMO.config;
    ABOUT = DEMO.about;
    SECS = DEMO.sections;
    NAV = DEMO.nav;
    STATS = DEMO.stats;
    SKILLS = DEMO.skills;
    TOOLS = DEMO.tools;
    SVCS = DEMO.services;
    EXP = DEMO.experience;
    FAQS = DEMO.faq;
    FORMOPTS = DEMO.formOptions;
    RESUME = DEMO.resume;
    RXTRA = DEMO.resumeExtras;

    var cached = liveRead();
    PROJECTS = (cached && cached.projects && cached.projects.length) ? cached.projects : (DEMO.projects || []);
    TSTS = (cached && cached.testimonials && cached.testimonials.length) ? cached.testimonials : (DEMO.testimonials || []);
    SOCIAL = (cached && cached.social && cached.social.length) ? cached.social : (DEMO.social || []);
    if (cached && cached.live) mergeLiveConfig(cached.live);

    normalise();

    ROUTE = parseRoute();
    applyMeta();
    applyTheme();
    preload(100, "ready");
    render();
    initUI(true);          // reveals are held back for the curtain hand-off
    preDone(revealer);
}

function normalise() {
    SECS = (SECS || []).slice().sort(function (a, b) {
        return (Number(a.order) || 99) - (Number(b.order) || 99);
    });
    (PROJECTS || []).forEach(function (p, i) {
        if (!p.slug) p.slug = slugify(p.title) || ("project-" + i);
    });
}

/* Only the handful of keys in LIVE_CONFIG_KEYS may be moved by the sheet,
   and only when they carry a value — a blank cell must not wipe compiled
   copy. */
function mergeLiveConfig(live) {
    if (!live) return;
    LIVE_CONFIG_KEYS.forEach(function (k) {
        var v = live[k];
        if (v !== undefined && v !== null && String(v).trim() !== "") CFG[k] = v;
    });
}

/* ── Refresh ──────────────────────────────────────────────────────────── */
function hydrate() {
    if (!API_URL) return;

    // A visitor who arrived on a project page needs its body straight away;
    // everything else can wait for an idle moment.
    var soon = (ROUTE.name === "project") ? 0 : 250;

    setTimeout(function () {
        fetchJSON("getLive")
            .then(function (d) {
                if (!d || d.error) throw new Error((d && d.error) || "empty response");
                applyLive(d);
            })
            .catch(function (err) {
                // The page is already up and correct-as-of-last-export, so a
                // failure here is a non-event. Log it and move on.
                console.warn("Live refresh skipped:", err.message);
            });
    }, soon);

    if (ROUTE.name === "project") ensureProjectBody(findProject(ROUTE.slug));
}

function apiURL(action, params) {
    var url = API_URL + (API_URL.indexOf("?") === -1 ? "?" : "&") + "action=" + encodeURIComponent(action);
    if (params) {
        for (var k in params) {
            if (Object.prototype.hasOwnProperty.call(params, k)) {
                url += "&" + encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
            }
        }
    }
    return url;
}

function fetchJSON(action, params) {
    var ctrl = ("AbortController" in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    var opts = ctrl ? { signal: ctrl.signal } : {};

    return fetch(apiURL(action, params), opts).then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
    });
}

/* Accepts either the slim getLive payload or a full getAll payload, so an
   older deployment of Code.gs keeps working untouched. */
function applyLive(d) {
    var next = {
        projects: Array.isArray(d.projects) ? d.projects : (PROJECTS || []),
        testimonials: Array.isArray(d.testimonials) ? d.testimonials : (TSTS || []),
        social: Array.isArray(d.social) ? d.social : (SOCIAL || []),
        live: d.live || pickLiveConfig(d.config)
    };

    var before = JSON.stringify({ p: PROJECTS, t: TSTS, s: SOCIAL });
    var after = JSON.stringify({ p: next.projects, t: next.testimonials, s: next.social });

    liveWrite(next);

    PROJECTS = next.projects;
    TSTS = next.testimonials;
    SOCIAL = next.social;
    mergeLiveConfig(next.live);
    normalise();
    LIVE = true;

    if (before !== after) repaintLive();
    else renderChrome();   // the pills may still have moved
}

function pickLiveConfig(config) {
    if (!config) return null;
    var out = {};
    LIVE_CONFIG_KEYS.forEach(function (k) { if (config[k]) out[k] = config[k]; });
    return out;
}

/* Swap only what the sheet owns. The rest of the page never flickers. */
function repaintLive() {
    if (ROUTE.name === "home") {
        swapSection("projects", projectsHTML(SEC_NUM.projects || ""));
        swapSection("testimonials", tstHTML(SEC_NUM.testimonials || ""));
    } else if (ROUTE.name === "projects") {
        $("#main").innerHTML = pageProjects();
        initUI();
    } else if (ROUTE.name === "project") {
        var p = findProject(ROUTE.slug);
        if (!p) { $("#main").innerHTML = pageMissing(ROUTE.slug); initUI(); }
        else ensureProjectBody(p);
    }

    renderChrome();
    revealer();
    warmThumbs();
    staggerize();
}

/* Header pill, footer and the social rows — cheap, so always refreshed. */
function renderChrome() {
    renderBrand();
    renderFooter();
    var ds = $("#drawer-social");
    if (ds) ds.innerHTML = socialHTML(false);
}

/* Replace one <section> in place. Anything that had already animated in
   stays in, so a refresh reads as an update rather than a reload. */
function swapSection(id, html) {
    var old = document.getElementById(id);
    if (!old) return;

    if (!html) { old.parentNode.removeChild(old); return; }

    var holder = document.createElement("div");
    holder.innerHTML = html;
    var next = holder.firstElementChild;
    if (!next) { old.parentNode.removeChild(old); return; }

    var settled = !!old.querySelector("[data-reveal].in");
    if (settled) {
        $$("[data-reveal]", next).forEach(function (el) {
            el.classList.add("in");
            el.style.setProperty("--d", "0ms");
        });
        next.classList.add("is-refreshed");
        setTimeout(function () { next.classList.remove("is-refreshed"); }, 900);
    }

    old.parentNode.replaceChild(next, old);
}

/* ── The live cache ───────────────────────────────────────────────────── */
function liveRead() {
    try {
        var raw = localStorage.getItem(LIVE_STORE);
        if (!raw) return null;
        var box = JSON.parse(raw);
        if (!box || !box.at || (Date.now() - box.at) > LIVE_MAX_AGE) return null;
        return box.data || null;
    } catch (e) { return null; }
}

function liveWrite(data) {
    try {
        localStorage.setItem(LIVE_STORE, JSON.stringify({ at: Date.now(), data: data }));
    } catch (e) { /* private mode, or over quota — the seed still covers us */ }
}

/* ── Project bodies, fetched only when one is opened ──────────────────── */
/* Card data (title, summary, image, tags) ships in the seed and the live
   payload. The long Description column does not — it is by far the biggest
   thing in the workbook and only ever matters on one page at a time. */
function ensureProjectBody(p) {
    if (!p || p.description) return;

    var cached = PROJ_FULL[p.slug];
    if (cached) { mergeProject(p, cached); return; }
    if (!API_URL) return;

    fetchJSON("getProject", { slug: p.slug })
        .then(function (d) {
            var full = d && (d.project || (Array.isArray(d.projects) ? matchSlug(d.projects, p.slug) : null));
            if (!full) return;
            PROJ_FULL[p.slug] = full;
            mergeProject(p, full);
        })
        .catch(function (err) { console.warn("Project body unavailable:", err.message); });
}

function matchSlug(list, slug) {
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i];
    return null;
}

function mergeProject(p, full) {
    ["description", "gallery", "video", "liveUrl", "repoUrl", "client", "role",
        "year", "duration", "tags", "summary", "image", "category"].forEach(function (k) {
            if (full[k]) p[k] = full[k];
        });

    if (ROUTE.name !== "project" || ROUTE.slug !== p.slug) return;
    var main = $("#main");
    if (!main) return;
    main.innerHTML = pageProject(p);
    initUI();
    staggerize();
}

/* ==========================================================================
   PRELOADER
   Now that the page renders from compiled content, this is no longer
   waiting on anything but the web fonts — it exists to cover the moment
   between a blank document and a laid-out one, and it lifts as soon as
   the type has painted. The rail is
   driven by rAF instead of jumping between them: it eases toward whatever
   is known and, while the sheet request is still in flight, creeps toward
   a soft ceiling — a slow network then reads as progress rather than a
   frozen bar. The curtain lifts only once the counter has landed and the
   loader has had a moment on screen, since a single frame of chrome is
   worse than no loader at all.
   ========================================================================== */

var PRE = {
    pct: 0,        // what the rail is currently showing
    target: 0,     // the highest figure the boot sequence has reported
    t0: 0,
    raf: 0,
    done: false,
    MIN: 560,      // ms the loader stays up even on an instant load
    CEIL: 92       // the creep never claims more than this before "ready"
};

function preload(pct, txt) {
    var t = $("#pre-txt");
    pct = Math.max(0, Math.min(100, Number(pct) || 0));
    if (pct > PRE.target) PRE.target = pct;
    if (t && txt) t.textContent = txt;
    if (!PRE.t0) PRE.t0 = Date.now();
    if (!PRE.raf) PRE.raf = requestAnimationFrame(preFrame);
}

function preFrame() {
    PRE.raf = 0;

    var goal = PRE.target;
    if (goal < 100) {
        // Asymptotic: roughly 55% at two seconds, 82% at six, never the ceiling.
        var age = (Date.now() - PRE.t0) / 1000;
        goal = Math.max(goal, PRE.CEIL * (1 - Math.exp(-age / 2.2)));
    }

    PRE.pct += (goal - PRE.pct) * .14;
    if (goal - PRE.pct < .35) PRE.pct = goal;

    var fill = $("#pre-fill"), num = $("#pre-pct");
    if (fill) fill.style.width = PRE.pct.toFixed(2) + "%";
    if (num) num.textContent = Math.round(PRE.pct);

    if (PRE.pct < 100) PRE.raf = requestAnimationFrame(preFrame);
}

/* Hands over to the page. `after` runs a beat into the wipe so the first
   sections animate in behind the rising sheet instead of sitting there
   already finished by the time it clears. */
function preDone(after) {
    if (PRE.done) return;
    PRE.done = true;
    preload(100, "ready");

    var el = $("#preloader");
    if (!el) { if (after) after(); return; }

    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var wait = 0;

    if (reduced) {
        // Nothing to watch land, so don't make anyone sit through the ease.
        PRE.pct = 100;
    } else {
        wait = Math.max(0, PRE.MIN - (Date.now() - (PRE.t0 || Date.now())));
    }

    function lift() {
        el.classList.add("done");
        setTimeout(function () { if (after) after(); }, reduced ? 0 : 180);
        setTimeout(function () { el.setAttribute("hidden", ""); }, 1000);
    }

    /* Reveal only once the web fonts have actually painted. Otherwise the
       curtain lifts onto the fallback faces and the headings flash their
       serif fallback (Times New Roman) — reading as "Instrument Serif"
       instead of the real Sora/display pairing on some reloads. */
    var lifted = false;
    function reveal() {
        if (lifted) return;
        lifted = true;
        lift();
    }
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    fontsReady.then(reveal);
    setTimeout(reveal, 2500); // safety: never strand the sheet if a font hangs

    setTimeout(function () {
        // Let the counter arrive before wiping — but not forever, since a
        // backgrounded tab throttles rAF and would strand the sheet on screen.
        if (PRE.pct >= 99.5) return reveal();

        var tries = 0;
        var seal = setInterval(function () {
            if (PRE.pct < 99.5 && ++tries < 60) return;
            clearInterval(seal);
            reveal();
        }, 40);
    }, wait);
}

/* ==========================================================================
   HEAD + THEME  (⚙ Config → SEO and THEME blocks)
   ========================================================================== */
function applyMeta() {
    var title = cfg("siteTitle", "Portfolio");
    var desc = cfg("metaDescription");
    var image = cfg("ogImageUrl", "https://shawon7.pages.dev/assets/images/shan_2.jpg");
    var url = cfg("siteUrl");

    // Each page announces itself properly, so a shared project link shows the
    // project rather than the site's front-page blurb.
    if (ROUTE.name === "resume") {
        // 📄 Resume → "Page Title" wins; otherwise the name plus a suffix the
        // sheet can also change, so the tab never has to say "Résumé".
        title = rcfg("pageTitle",
            rcfg("fullName", rcfg("aboutName", cfg("brandName", "Résumé"))) +
            rcfg("pageTitleSuffix", " — Résumé"));
        desc = "";                       // nothing to share; the page is unlisted
        url = "";                        // and nothing to declare canonical
    } else if (ROUTE.name === "about") {
        title = (sec("about").title || "About").replace(/\*/g, "") + " — " + cfg("brandName", "Portfolio");
        desc = sec("about").subtitle || desc;
        if (url) url = url.replace(/\/$/, "") + aboutPath();
    } else if (ROUTE.name === "projects") {
        title = (sec("projects").title || "Projects").replace(/\*/g, "") + " — " + cfg("brandName", "Portfolio");
        desc = sec("projects").subtitle || desc;
        if (url) url = url.replace(/\/$/, "") + projBase();
    } else if (ROUTE.name === "project") {
        var proj = findProject(ROUTE.slug);
        if (proj) {
            title = proj.title + " — " + cfg("brandName", "Portfolio");
            desc = proj.summary || desc;
            if (proj.image) image = proj.image;
            if (url) url = url.replace(/\/$/, "") + projBase() + "/" + proj.slug;
        }
    }

    document.title = title;

    var map = {
        "meta-desc": ["content", desc],
        "meta-keys": ["content", cfg("metaKeywords")],
        "meta-author": ["content", cfg("author", cfg("aboutName"))],
        "meta-theme": ["content", cfg("backgroundColor", "#08090B")],
        "og-title": ["content", title],
        "og-desc": ["content", desc],
        "og-image": ["content", image],
        "canonical": ["href", url],
        "favicon": ["href", cfg("faviconUrl")]
    };
    Object.keys(map).forEach(function (id) {
        var el = document.getElementById(id);
        if (el && map[id][1]) el.setAttribute(map[id][0], map[id][1]);
    });

    // The résumé asks to be left out of the index; every other page keeps
    // the default. Written both ways so a back-button hop out of it clears.
    var robots = document.getElementById("meta-robots");
    if (robots) {
        robots.setAttribute("content", ROUTE.name === "resume"
            ? "noindex, nofollow, noarchive, nosnippet"
            : "index, follow");
    }
}

/* ==========================================================================
   COLOUR SCHEME
   Three inputs, in descending order of authority:

     1. the visitor's own choice, kept in localStorage
     2. ⚙ Config → "Theme Mode":  auto | dark | light
     3. the operating system, whenever Theme Mode is auto

   The data-theme attribute is set by a short inline script in index.html
   before first paint, so a returning visitor never sees a flash of the wrong
   palette while the sheet is still in flight. Everything below reconciles
   that first guess with the sheet once it lands.
   ========================================================================== */

var THEME_KEY = "site-theme";   // must match the inline script in index.html
var THEME_MQ = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
var THEME_T = null;

/* Storage can throw outright in private mode and in embedded webviews, so
   every touch is guarded: the worst case is a preference that doesn't
   outlive the tab, never a page that fails to render. */
function themeSaved() {
    try {
        var v = localStorage.getItem(THEME_KEY);
        return (v === "dark" || v === "light") ? v : null;
    } catch (e) { return null; }
}

function themeSave(v) {
    try {
        if (v) localStorage.setItem(THEME_KEY, v);
        else localStorage.removeItem(THEME_KEY);
    } catch (e) { /* nothing to do — the choice just won't persist */ }
}

function themeSystem() { return (THEME_MQ && THEME_MQ.matches) ? "light" : "dark"; }

/* "auto"/"system" follows the OS. Anything starting "light" pins light.
   Everything else — including a blank cell — pins dark, which is what the
   site did before this setting existed. */
function themeMode() {
    var m = String(cfg("themeMode", "auto")).trim().toLowerCase();
    if (m.indexOf("auto") === 0 || m.indexOf("system") === 0) return "auto";
    return m.indexOf("light") === 0 ? "light" : "dark";
}

function themeToggleOn() { return on("showThemeToggle", "yes"); }

function themeResolved() {
    // With the toggle switched off there is no way to change the choice, so
    // a preference saved during an earlier visit is ignored rather than
    // stranding someone on a palette they can no longer get out of.
    var saved = themeToggleOn() ? themeSaved() : null;
    if (saved) return saved;
    var mode = themeMode();
    return mode === "auto" ? themeSystem() : mode;
}

function themeBg(t) {
    return t === "light"
        ? cfg("lightBackgroundColor", "#F7F6F2")
        : cfg("backgroundColor", "#08090B");
}

function applyThemeAttr() {
    var t = themeResolved();
    document.documentElement.setAttribute("data-theme", t);

    var meta = document.getElementById("meta-theme");
    if (meta) meta.setAttribute("content", themeBg(t));

    paintThemeToggle(t);
    return t;
}

/* What the button steps through. Default is a plain two-state switch; adding
   "auto" to ⚙ Config → "Theme Toggle Modes" offers a way back to the OS. */
function themeModes() {
    var list = listOf(cfg("themeToggleModes", "light, dark"))
        .map(function (s) { return s.toLowerCase(); })
        .filter(function (s) { return s === "light" || s === "dark" || s === "auto"; });
    return list.length ? list : ["light", "dark"];
}

function cycleTheme() {
    var modes = themeModes();
    var saved = themeSaved();

    // Starting from what is currently on screen — rather than from the
    // stored value — keeps the first click meaningful: on a light OS with no
    // preference saved, "next" has to be dark, not light again.
    var cur = saved ||
        ((themeMode() === "auto" && modes.indexOf("auto") > -1) ? "auto" : themeResolved());

    var i = modes.indexOf(cur);
    var next = modes[(i + 1) % modes.length];

    themeSave(next === "auto" ? null : next);
    themeAnimate();
    applyThemeAttr();
}

function paintThemeToggle(t) {
    var auto = !themeSaved() && themeMode() === "auto";
    var icon = auto ? "fa-circle-half-stroke" : (t === "light" ? "fa-sun" : "fa-moon");
    var label = auto ? cfg("themeAutoLabel", "Theme: following your system")
        : (t === "light" ? cfg("themeLightLabel", "Theme: light")
            : cfg("themeDarkLabel", "Theme: dark"));

    // Two buttons, one state: the header's above the burger breakpoint, the
    // drawer's below it. Only one is ever on screen, but both are kept
    // current so neither shows a stale icon when the viewport changes.
    ["#theme-toggle", "#drawer-theme-toggle"].forEach(function (sel) {
        var btn = $(sel);
        if (!btn) return;
        if (!themeToggleOn()) { btn.setAttribute("hidden", ""); return; }
        btn.removeAttribute("hidden");
        btn.innerHTML = '<i class="fa-solid ' + icon + '" aria-hidden="true"></i>';
        btn.setAttribute("aria-label", label);
        btn.setAttribute("title", label);
    });

    var row = $(".drawer-theme"), cap = $("#drawer-theme-label");
    if (row && !themeToggleOn()) row.setAttribute("hidden", "");
    else if (row) row.removeAttribute("hidden");
    if (cap) cap.textContent = label.replace(/^Theme:\s*/i, "") || "Theme";
}

/* A brief cross-fade so the swap doesn't snap. Held to a class for only as
   long as the fade lasts, so the transition never fights anything else. */
function themeAnimate() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var el = document.documentElement;
    el.classList.add("theme-anim");
    clearTimeout(THEME_T);
    THEME_T = setTimeout(function () { el.classList.remove("theme-anim"); }, 420);
}

/* Follow the OS live, but only while the visitor hasn't overridden it. */
if (THEME_MQ) {
    var themeSysChange = function () {
        if (themeSaved() && themeToggleOn()) return;
        themeAnimate();
        applyThemeAttr();
    };
    if (THEME_MQ.addEventListener) THEME_MQ.addEventListener("change", themeSysChange);
    else if (THEME_MQ.addListener) THEME_MQ.addListener(themeSysChange);
}

/* ── Sheet-driven palette ────────────────────────────────────────────── */
function applyTheme() {
    applyThemeAttr();

    // Tokens that don't depend on the palette stay on :root.
    var base = {
        "--ff-display": cfg("displayFont"),
        "--ff-sans": cfg("bodyFont"),
        "--ff-mono": cfg("monoFont"),
        "--r": cfg("cornerRadius"),
        "--shell": cfg("contentWidth")
    };

    var css = ":root{";
    Object.keys(base).forEach(function (k) { if (base[k]) css += k + ":" + base[k] + ";"; });
    css += "}";

    // Colours are scoped per scheme. Written to :root instead, a single
    // Config colour would paint both schemes and light mode could never be
    // anything but a dark page with light text.
    css += themeBlock("dark", {
        "--accent": cfg("accentColor"),
        "--accent-2": cfg("accentColor2"),
        "--accent-ink": cfg("accentTextColor"),
        "--bg": cfg("backgroundColor"),
        "--surface": cfg("surfaceColor"),
        "--text": cfg("textColor"),
        "--muted": cfg("mutedColor"),
        "--line": cfg("borderColor")
    }, ".12", ".32");

    // Every light cell may be left blank, in which case the stylesheet's own
    // light palette stands.
    css += themeBlock("light", {
        "--accent": cfg("lightAccentColor"),
        "--accent-2": cfg("lightAccentColor2"),
        "--accent-ink": cfg("lightAccentTextColor"),
        "--bg": cfg("lightBackgroundColor"),
        "--surface": cfg("lightSurfaceColor"),
        "--text": cfg("lightTextColor"),
        "--muted": cfg("lightMutedColor"),
        "--line": cfg("lightBorderColor")
    }, ".10", ".28");

    $("#theme-vars").textContent = css;
    $("#custom-css").textContent = cfg("customCss", "");

    if (!on("grainTexture")) document.body.classList.add("no-grain");
    if (cfg("googleFontsUrl")) {
        var l = document.createElement("link");
        l.rel = "stylesheet"; l.href = cfg("googleFontsUrl");
        document.head.appendChild(l);
    }
}

/* One scheme's block, with the accent tints derived so a single hex in the
   sheet restyles the whole page the way it always has. */
function themeBlock(name, vars, dim, line) {
    var css = "";
    Object.keys(vars).forEach(function (k) { if (vars[k]) css += k + ":" + vars[k] + ";"; });

    var a = rgbOf(vars["--accent"]);
    if (a) {
        css += "--accent-dim:rgba(" + a + "," + dim + ");";
        css += "--accent-line:rgba(" + a + "," + line + ");";
    }
    var a2 = rgbOf(vars["--accent-2"]);
    if (a2) css += "--accent-2-dim:rgba(" + a2 + "," + dim + ");";

    // Edge fades run to this rather than to `transparent`, which would
    // interpolate through grey and show as a dark smear on a light page.
    var bg = rgbOf(vars["--bg"]);
    if (bg) css += "--bg-0:rgba(" + bg + ",0);";

    return css ? '[data-theme="' + name + '"]{' + css + "}" : "";
}

function rgbOf(hex) {
    var h = String(hex || "").trim();
    if (!/^#[0-9a-f]{6}$/i.test(h)) return null;
    return parseInt(h.substr(1, 2), 16) + "," +
        parseInt(h.substr(3, 2), 16) + "," +
        parseInt(h.substr(5, 2), 16);
}

/* ==========================================================================
   RENDER
   ========================================================================== */
var BUILDERS = {
    hero: heroHTML, terminal: heroTerminalHTML, heroAbout: heroAboutHTML,
    stats: statsHTML, about: aboutHTML, video: videoHTML,
    skills: skillsHTML, projects: projectsHTML, testimonials: tstHTML,
    services: svcHTML, experience: expHTML, faq: faqHTML, contact: contactHTML
};

function render() {
    renderBrand();
    renderNav();

    if (ROUTE.name === "resume") {
        $("#main").innerHTML = pageResume();
    } else if (ROUTE.name === "about") {
        $("#main").innerHTML = pageAbout();
    } else if (ROUTE.name === "projects") {
        $("#main").innerHTML = pageProjects();
    } else if (ROUTE.name === "project") {
        var p = findProject(ROUTE.slug);
        $("#main").innerHTML = p ? pageProject(p) : pageMissing(ROUTE.slug);
    } else {
        $("#main").innerHTML = pageHome();
    }

    // Lets the stylesheet strip the ambient layers back on the résumé, and
    // repaint the page behind the sheet to match 📄 Resume → "Resume Theme".
    document.body.classList.toggle("on-resume", ROUTE.name === "resume");
    if (ROUTE.name === "resume") {
        document.body.setAttribute("data-rz-theme", ropt("resumeTheme", "paper"));
        // The résumé reads as a document, so the site's header and footer are
        // out of the way by default; "Show Site Header" / "Show Site Footer"
        // put either one back.
        document.body.classList.toggle("rz-no-header", !ron("showSiteHeader", "no"));
        document.body.classList.toggle("rz-no-footer", !ron("showSiteFooter", "no"));
    } else {
        document.body.removeAttribute("data-rz-theme");
        document.body.classList.remove("rz-no-header", "rz-no-footer");
    }

    renderFooter();
    markActiveNav();
}

/* The home page.
   ---------------------------------------------------------------------
   The running order is set in content.js, and it is a deliberate argument
   rather than a list of blocks:

     hero          the promise, plus the two calls to action
     stats         proof the promise has been kept before, at a glance
     services      what the visitor can actually buy
     projects      evidence those services are real
     testimonials  other people saying so — placed against the evidence
     skills        the toolkit behind it
     about         who is doing the work, once the visitor cares
     video         the same, in his own voice
     experience    the formal record
     faq           the objections that stop people writing in
     contact       the ask

   Every heading keeps its running number, and the numbers are remembered
   so a live refresh can rebuild one section without renumbering the page. */
function pageHome() {
    var html = "", n = 0;
    SEC_NUM = {};

    SECS.forEach(function (s) {
        if (!onPage(s, "home")) return;
        var fn = BUILDERS[s.key];
        if (!fn) return;
        // hero, terminal and stats carry no heading, so they take no
        // number — the count belongs to blocks a reader can see it on.
        SEC_NUM[s.key] = hasHead(s.key) ? pad(++n) : "";
        html += fn(SEC_NUM[s.key]);
    });

    return html;
}

/* Does this section draw a <header> at all? */
function hasHead(key) {
    var s = sec(key);
    return !!(s.title || s.eyebrow || s.subtitle);
}

function on2(v) {
    if (v === undefined || v === null || v === "") return true;
    var s = String(v).trim().toLowerCase();
    return !(s === "no" || s === "false" || s === "0" || s === "off" || s === "hide");
}

function pad(n) { return "[" + (n < 10 ? "0" + n : n) + "]"; }

function renderBrand() {
    var mark = $("#brand-mark"), logo = cfg("logoImageUrl");
    mark.innerHTML = logo
        ? '<img src="' + esc(logo) + '" alt="' + esc(cfg("brandName")) + '">'
        : esc(cfg("brandMark", initials(cfg("brandName", "P"))));

    $("#brand-name").textContent = cfg("brandName", "Portfolio");
    $("#brand-sub").textContent = cfg("brandSub", "");
    // $("#pre-mark").textContent = cfg("brandMark", initials(cfg("brandName", "P")));

    var st = cfg("availabilityStatus");
    if (st) {
        $("#status-text").textContent = st;
        $("#status-chip").hidden = false;
    }

    var cta = $("#nav-cta");
    cta.textContent = cfg("navButtonText", "Contact");
    cta.href = cfg("navButtonLink", "#contact");
}

/* A sheet row still says "#projects"; that now means the projects page, and
   "#about" means the standalone About page instead of the on-page block. */
function navHref(link) {
    var v = String(link || "#");
    if (/^#projects\/?$/i.test(v.trim())) return urlProjects();
    if (/^#about\/?$/i.test(v.trim())) return urlAbout();
    if (v.charAt(0) === "#" && ROUTE.name !== "home") return urlHome() + v;
    return v;
}

function renderNav() {
    var items = NAV.filter(function (i) { return on2(i.show); });

    $("#nav-links").innerHTML = items.map(function (i) {
        return '<a href="' + esc(navHref(i.link)) + '"' + (on2(i.newTab) && i.newTab ? ' target="_blank" rel="noopener"' : '') +
            '>' + esc(i.label) + '</a>';
    }).join("");

    // --i drives the staggered entrance; the chevron and label are separate
    // elements so each can be animated without touching the other.
    $("#drawer-links").innerHTML = items.map(function (i, k) {
        return '<a href="' + esc(navHref(i.link)) + '" data-close-drawer style="--i:' + k + '"' +
            (on2(i.newTab) && i.newTab ? ' target="_blank" rel="noopener"' : '') + '>' +
            '<span class="idx">' + pad(k + 1) + '</span>' +
            '<span class="label">' + esc(i.label) + '</span>' +
            '<i class="go fa-solid fa-arrow-right" aria-hidden="true"></i>' +
            '</a>';
    }).join("");

    $("#drawer-social").innerHTML = socialHTML(false);

    var dm = $("#drawer-mark"), logo = cfg("logoImageUrl");
    if (dm) {
        dm.innerHTML = logo
            ? '<img src="' + esc(logo) + '" alt="' + esc(cfg("brandName")) + '">'
            : esc(cfg("brandMark", initials(cfg("brandName", "P"))));
    }
    if ($("#drawer-name")) $("#drawer-name").textContent = cfg("brandName", "Portfolio");
    if ($("#drawer-sub")) $("#drawer-sub").textContent = cfg("brandSub", cfg("role", ""));
}

/* On /portfolio and /portfolio/<slug> the scroll spy has no matching
   section, so the Projects link is highlighted explicitly instead. */
function markActiveNav() {
    if (ROUTE.name === "home") return;
    var here = ROUTE.name === "about" ? urlAbout() : urlProjects();
    $$("#nav-links a, #drawer-links a").forEach(function (a) {
        a.classList.toggle("active", a.getAttribute("href") === here);
    });
}

// function socialHTML(featuredOnly) {
//     return SOCIAL.filter(function (s) {
//         return on2(s.show) && s.url && (!featuredOnly || on2(s.featured));
//     }).map(function (s) {
//         return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener" title="' + esc(s.platform) +
//             '" aria-label="' + esc(s.platform) + '"><i class="' + esc(icon(s.icon, "fa-solid fa-link")) + '"></i></a>';
//     }).join("");
// }

function socialHTML(featuredOnly) {
    return SOCIAL.filter(function (s) {
        return on2(s.show) && s.url && (!featuredOnly || on2(s.featured));
    }).map(function (s) {
        var iconHtml = renderIcon(s.icon, s.platform);
        return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener" title="' + esc(s.platform) +
            '" aria-label="' + esc(s.platform) + '">' + iconHtml + '</a>';
    }).join("");
}

/* Render an icon — supports Font Awesome classes OR image paths (SVG, PNG, ICO, etc.) */
function renderIcon(iconValue, altText) {
    var v = String(iconValue || "").trim();
    if (!v) return '<i class="fa-solid fa-link"></i>';

    // Check if it's an image file path (ends with .svg, .png, .ico, .jpg, .jpeg, .webp, .gif)
    if (/\.(svg|png|ico|jpg|jpeg|webp|gif)(\?.*)?$/i.test(v)) {
        var src = resolveAsset(v);
        return '<img src="' + esc(src) + '" alt="' + esc(altText || 'icon') + '" class="social-icon">';
    }

    // Otherwise treat as Font Awesome class
    return '<i class="' + esc(icon(v, "fa-solid fa-link")) + '"></i>';
}


/* Resolve asset paths to work from any URL depth. */
function resolveAsset(path) {
    if (!path) return "";
    // If it's already absolute (http, https, //, or starts with /), return as-is
    if (/^(https?:)?\/\//i.test(path) || path.charAt(0) === "/") return path;
    // If it's a relative path (./ or ../), resolve it against BASE
    if (path.indexOf("./") === 0 || path.indexOf("../") === 0) {
        return BASE + path.replace(/^\.\/?/, "/");
    }
    // Default: treat as root-relative
    return BASE + "/" + path;
}

/* ── HERO (TERMINAL) ──────────────────────────────────────────────────
   The offer-led opener: headline, two calls to action, trust line and the
   typing terminal. No longer first on the page — it is registered under
   the "terminal" section key and ships switched off. Set its Show to Yes
   in content.js to bring it back, directly under the intro hero. */
function heroTerminalHTML() {
    var avatars = listOf(cfg("trustAvatars")).slice(0, 4);
    var av = avatars.length
        ? '<div class="avatars">' + avatars.map(function (u, i) {
            return avatar(u, "Client " + (i + 1));
        }).join("") + '</div>'
        : "";

    var tl = lines(cfg("terminalLines"));
    var term = tl.length ? tl.map(function (l, i) {
        var m = l.match(/^\$\s*(.*)$/);
        var body = m ? m[1] : l;
        var last = i === tl.length - 1;
        if (last) {
            /* Last line is a typewriter: only the prompt fades in via CSS;
               the content + caret are typed by termType() (char-by-char,
               smooth cursor, loops forever). */
            return '<div class="term-line term-typed" style="animation-delay:' +
                (300 + i * 260) + 'ms">' +
                '<span class="p">$</span>' +
                '<span class="term-type"><span class="term-type-inner"></span>' +
                '<span class="term-caret"></span></span></div>';
        }
        return '<div class="term-line" style="animation-delay:' + (300 + i * 260) + 'ms">' +
            '<span class="p">$</span><span>' + esc(body) + '</span></div>';
    }).join("") : "";

    var quote = cfg("heroQuote", "\u201CThe best way to predict the future is to invent it.\u201D");
    var quoteAuthor = cfg("heroQuoteAuthor", "Alan Kay");

    return '<section id="hero-terminal" class="section hero-lead"><div class="shell hero hero-grid">' +
        '<div data-reveal>' +
        (cfg("heroEyebrow") ? '<div class="hero-eyebrow-wrap"><span class="hero-eyebrow"><i class="fa-solid fa-terminal"></i>' +
            esc(cfg("heroEyebrow")) + '</span></div>' : '') +
        '<h1>' + markup(cfg("heroTitle")) + '</h1>' +
        '<p class="hero-sub">' + markup(cfg("heroSubtitle")) + '</p>' +
        '<div class="hero-cta">' +
        (cfg("primaryButtonText") ? '<a class="btn btn-accent" href="' + esc(cfg("primaryButtonLink", "#contact")) +
            '">' + esc(cfg("primaryButtonText")) + '<i class="fa-solid fa-arrow-right"></i></a>' : '') +
        (cfg("secondaryButtonText") ? '<a class="btn btn-ghost" href="' + esc(cfg("secondaryButtonLink", "#projects")) +
            '">' + esc(cfg("secondaryButtonText")) + '</a>' : '') +
        '</div>' +
        (av || cfg("trustText") ? '<div class="hero-trust">' + av +
            '<p class="trust-txt">' + markup(cfg("trustText")).replace(/<em>/g, "<strong>").replace(/<\/em>/g, "</strong>") +
            '</p></div>' : '') +
        '</div>' +
        (term ? '<div data-reveal style="--d:160ms"><div class="term">' +
            '<div class="term-bar"><span class="term-dot"></span><span class="term-dot"></span>' +
            '<span class="term-dot"></span><span class="term-title">' + esc(cfg("terminalTitle", "~ terminal")) +
            '</span></div><div class="term-body">' + term + '</div></div>' +
            '<blockquote class="hero-quote"><span class="q-mark">&ldquo;</span>' +
            '<p>' + esc(quote) + '</p>' +
            '<cite>&mdash; ' + esc(quoteAuthor) + '</cite></blockquote>' + '</div>' : '') +
        '</div>' +
        '<div class="scroll-hint"><span class="rail"></span>scroll</div>' +
        '</section>';
}

/* ── HERO (INTRO) ─────────────────────────────────────────────────────
   The opener: a portrait card beside a short statement of approach, under
   a headline that puts the name at display scale.

   Every string still comes from the sheet — Intro Heading, About Image
   URL, About Role, About Heading, About Body, About Marks and the two
   button settings — so this is a layout, not a page of hard-coded copy.
   The name is whatever sits between *asterisks* in Intro Heading. */
function heroHTML() {
    var heading = cfg("introHeading",
        cfg("aboutHeading", "I am *" + lastWord(cfg("aboutName")) + "*"));

    /* Hero-owned keys, each falling back to the shared one it replaced, so
       an older ⚙ Config still renders the hero exactly as before. */
    var body = lines(cfg("approachBody", cfg("aboutBody"))).map(function (p) {
        return '<p>' + markup(p).replace(/<em>/g, "<b>").replace(/<\/em>/g, "</b>") + '</p>';
    }).join("");

    var badges = lines(cfg("heroBadges", cfg("aboutMarks"))).map(function (m, i) {
        return '<div class="badge" style="--d:' + (220 + i * 70) + 'ms">' +
            '<span class="badge-tick"><i class="fa-solid fa-check"></i></span>' +
            '<span>' + esc(m) + '</span></div>';
    }).join("");

    var img = cfg("heroPhotoUrl", cfg("aboutImageUrl"));
    var name = cfg("photoName", lastWord(cfg("aboutName")));
    var tag = cfg("photoTag", cfg("aboutRole"));

    var card = '<figure class="photo-card" data-reveal>' +
        (img
            ? '<img src="' + esc(sizedImg(img, 900)) + '" alt="Portrait of ' + esc(name) + '" decoding="async">'
            : '<div class="photo-void">' + esc(initials(cfg("aboutName"))) + '</div>') +
        '<figcaption>' +
        (tag ? '<span class="photo-tag">' + esc(tag) + '</span>' : '') +
        '<span class="photo-name">' + esc(name) + '</span>' +
        '</figcaption></figure>';

    var cta =
        (cfg("primaryButtonText")
            ? '<a class="btn btn-accent" href="' + esc(cfg("primaryButtonLink", "#contact")) + '">' +
              esc(cfg("primaryButtonText")) + '<i class="fa-solid fa-arrow-right"></i></a>' : '') +
        (cfg("secondaryButtonText")
            ? '<a class="btn btn-ghost" href="' + esc(cfg("secondaryButtonLink", "#projects")) + '">' +
              esc(cfg("secondaryButtonText")) + '</a>' : '');

    return '<section id="hero" class="section hero-intro"><div class="shell">' +
        '<h1 class="hero-intro-title" data-reveal>' + markup(heading) + '</h1>' +
        '<div class="hero-intro-grid">' +
        card +
        '<div class="approach" data-reveal style="--d:140ms">' +
        (cfg("approachHeading", cfg("aboutHeading")) ?
            '<h2>' + esc(cfg("approachHeading", cfg("aboutHeading"))) + '</h2>' : '') +
        body +
        (badges ? '<div class="badge-grid">' + badges + '</div>' : '') +
        (cta ? '<div class="hero-cta">' + cta + '</div>' : '') +
        '</div>' +
        '</div>' +
        '</div></section>';
}

/* "Mahmudul Hasan Shawon" → "Shawon". Used for the photo caption and as
   the fallback name in the headline. */
function lastWord(v) {
    var parts = String(v || "").trim().split(/\s+/);
    return parts[parts.length - 1] || "";
}

/* ── HERO (PORTRAIT-LED, LEGACY) ──────────────────────────────────────
   The previous portrait opener. Kept under the "heroAbout" key so the old
   layout is one line of content.js away. */
/* ── HERO (ABOUT INTRO) ────────────────────────────────────────────────
   Kept for the optional "heroAbout" section key — the portrait-led opening
   the site used to run. It is no longer part of the default order: leading
   with the offer converts better than leading with a biography, and the
   same portrait now anchors the About section further down.
   It deliberately carries no About heading or label — the section just
   reads as an introduction. The full story lives on the separate /about
   page, reachable from the About item in the menu. */
function heroAboutHTML() {
    var marks = lines(cfg("aboutMarks")).map(function (m) {
        return '<div class="about-mark"><i class="fa-solid fa-circle-check"></i><span>' + esc(m) + '</span></div>';
    }).join("");

    var body = lines(cfg("aboutBody")).map(function (p) {
        return '<p>' + markup(p).replace(/<em>/g, "<strong>").replace(/<\/em>/g, "</strong>") + '</p>';
    }).join("");

    var img = cfg("aboutImageUrl");
    var media = '<figure class="about-media" data-reveal>' +
        (img ? '<img src="' + esc(sizedImg(img, 900)) + '" alt="' + esc(cfg("aboutName")) + '" loading="lazy" decoding="async">'
            : '<div style="aspect-ratio:4/5;display:grid;place-items:center;font-family:var(--ff-display);font-size:4rem;color:var(--accent)">' +
            esc(initials(cfg("aboutName"))) + '</div>') +
        '<figcaption><span class="rl">' + esc(cfg("aboutRole")) + '</span>' +
        '<span class="nm">' + esc(cfg("aboutName")) + '</span></figcaption></figure>';

    var eyebrow = cfg("introEyebrow", cfg("heroEyebrow"));
    var heading = cfg("introHeading", cfg("aboutHeading", "Hello, I'm " + cfg("aboutName")));

    return '<section id="hero" class="section about-hero"><div class="shell about-grid">' +
        media +
        '<div class="about-body" data-reveal style="--d:120ms">' +
        (eyebrow ? '<div class="hero-eyebrow-wrap"><span class="hero-eyebrow"><i class="fa-solid fa-user"></i>' +
            esc(eyebrow) + '</span></div>' : '') +
        (heading ? '<h1 class="about-hero-title">' + markup(heading) + '</h1>' : '') +
        body +
        (marks ? '<div class="about-marks">' + marks + '</div>' : '') +
        '<div class="hero-cta" style="margin:0">' +
        (on("aboutPageLink") ? '<a class="btn btn-accent" href="' + esc(urlAbout()) + '" data-route>' +
            'More about me<i class="fa-solid fa-arrow-right"></i></a>' : '') +
        '<a class="btn btn-ghost" href="#contact">Work with me</a>' +
        '</div>' +
        '</div>' +
        '</div></section>';
}

/* ── STATS ────────────────────────────────────────────────────────────── */
function statsHTML() {
    if (!STATS.length) return "";
    var cards = STATS.filter(function (s) { return on2(s.show); }).map(function (s, i) {
        var down = String(s.delta || "").trim().charAt(0) === "-";
        return '<div class="stat" data-reveal style="--d:' + (i * 70) + 'ms">' +
            '<div class="stat-top"><i class="' + esc(icon(s.icon, "fa-solid fa-chart-simple")) + '"></i>' +
            (s.delta ? '<span class="stat-delta' + (down ? ' down' : '') + '">' + esc(s.delta) + '</span>' : '') +
            '</div>' +
            '<div class="stat-val" data-count="' + esc(s.value) + '">' + esc(s.value) + '</div>' +
            '<div class="stat-lbl">' + esc(s.label) + '</div>' +
            (s.sub ? '<div class="stat-sub">' + esc(s.sub) + '</div>' : '') +
            '</div>';
    }).join("");
    return '<section id="stats" class="section"><div class="shell"><div class="stats-grid">' + cards + '</div></div></section>';
}

/* ── ABOUT ────────────────────────────────────────────────────────────
   Deliberately not the hero again.

   The hero is a portrait card beside a short pitch. This is a layered
   media column — portrait, a glass plate reading over it, a row of
   figures — set against a story, a numbered account of how the work
   actually goes, and a closing line. Everything it says comes from the
   📔 About sheet, so the two blocks can never drift into repeating each
   other the way they did when both read aboutBody.

   The glass depends on backdrop-filter; where that is unsupported the
   plates fall back to a solid surface (see motion.css). ──────────── */
function aboutHTML(n, bare) {
    var img = acfg("portraitUrl", cfg("aboutImageUrl"));
    var name = cfg("aboutName");

    var plate = "";
    if (aon("showCard", "yes") && (acfg("cardRole") || acfg("cardLocation"))) {
        plate = '<figcaption class="ax-plate">' +
            (acfg("cardAvailability")
                ? '<span class="ax-live"><i class="ax-pip"></i>' + esc(acfg("cardAvailability")) + '</span>' : '') +
            (acfg("cardRole") ? '<b>' + esc(acfg("cardRole")) + '</b>' : '') +
            (acfg("cardLocation")
                ? '<small><i class="fa-solid fa-location-dot"></i>' + esc(acfg("cardLocation")) + '</small>' : '') +
            '</figcaption>';
    }

    var media = '<div class="ax-media" data-reveal>' +
        '<figure class="ax-frame">' +
        '<i class="ax-glow" aria-hidden="true"></i>' +
        (img
            ? '<img class="ax-photo" src="' + esc(sizedImg(img, 1000)) + '" alt="' + esc(name) +
              '" loading="lazy" decoding="async">'
            : '<div class="ax-void">' + esc(initials(name)) + '</div>') +
        plate +
        '</figure>' +
        '</div>';

    var lead = acfg("lead")
        ? '<p class="ax-lead" data-reveal>' + markup(acfg("lead")) + '</p>' : '';

    var story = lines(acfg("story", cfg("aboutBody"))).map(function (p) {
        return '<p>' + markup(p).replace(/<em>/g, "<strong>").replace(/<\/em>/g, "</strong>") + '</p>';
    }).join("");

    var cta = '<div class="ax-cta" data-reveal>' +
        (acfg("buttonText")
            ? '<a class="btn btn-accent" href="' + esc(acfg("buttonLink", "#contact")) + '">' +
              esc(acfg("buttonText")) + '<i class="fa-solid fa-arrow-right"></i></a>' : '') +
        (cfg("resumeUrl")
            ? '<a class="btn btn-ghost" href="' + esc(cfg("resumeUrl")) + '" target="_blank" rel="noopener">' +
              '<i class="fa-solid fa-file-arrow-down"></i>' + esc(acfg("cvButtonText", "Download CV")) + '</a>' : '') +
        (on("aboutPageLink")
            ? '<a class="btn btn-ghost" href="' + esc(urlAbout()) + '" data-route>' +
              'The longer version<i class="fa-solid fa-arrow-right"></i></a>' : '') +
        '</div>';

    /* On /about the page already carries the h1, so the block drops its
       own section header rather than saying the same thing twice. */
    return '<section id="about" class="section about-x"><div class="shell">' +
        (bare ? "" : secHead("about", n)) +
        '<div class="about-x-grid">' +
        media +
        '<div class="about-x-body">' +
        lead +
        (story ? '<div class="ax-story" data-reveal style="--d:80ms">' + story + '</div>' : '') +
        processHTML() +
        signatureHTML() +
        cta +
        '</div>' +
        '</div></div></section>';
}

/* Figures under the portrait. "6+ | Years building automation" per line. */
function factsHTML() {
    if (!aon("showFacts", "yes")) return "";
    var rows = pairs(acfg("facts"));
    if (!rows.length) return "";

    return '<div class="ax-facts">' + rows.slice(0, 4).map(function (f, i) {
        return '<div class="ax-fact" style="--d:' + (260 + i * 90) + 'ms">' +
            '<b data-count="' + esc(f.a) + '">' + esc(f.a) + '</b>' +
            (f.b ? '<span>' + esc(f.b) + '</span>' : '') +
            '</div>';
    }).join("") + '</div>';
}

/* How the work goes. "Map the process | I sit with the manual version…" */
function processHTML() {
    if (!aon("showProcess", "yes")) return "";
    var steps = pairs(acfg("process", cfg("aboutProcess")));
    if (!steps.length) return "";

    return '<div class="ax-process" data-reveal style="--d:140ms">' +
        '<h3>' + esc(acfg("processTitle", "How the work goes")) + '</h3>' +
        '<ol>' + steps.map(function (st, i) {
            return '<li style="--d:' + (i * 90) + 'ms">' +
                '<span class="ax-step">' + (i < 9 ? "0" : "") + (i + 1) + '</span>' +
                '<div><b>' + esc(st.a) + '</b>' +
                (st.b ? '<p>' + esc(st.b) + '</p>' : '') + '</div></li>';
        }).join("") + '</ol></div>';
}

/* The closing line — a sentence in his own voice, not a client quote. */
function signatureHTML() {
    var q = acfg("signature");
    if (!q) return "";
    return '<blockquote class="ax-signature" data-reveal style="--d:180ms">' +
        '<p>' + markup(q) + '</p>' +
        '<cite>' + esc(acfg("signatureBy", cfg("aboutName"))) + '</cite>' +
        '</blockquote>';
}

/* ── VIDEO ────────────────────────────────────────────────────────────── */
function videoHTML(n) {
    var url = videoEmbed(cfg("videoEmbedUrl"));
    if (!url) return "";
    return '<section id="video" class="section"><div class="shell">' +
        secHead("video", n, true) +
        '<div class="video-frame" data-reveal><iframe src="' + esc(url) +
        '" title="Introduction video" allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture" ' +
        'allowfullscreen loading="lazy"></iframe></div></div></section>';
}

/* ── SKILLS ───────────────────────────────────────────────────────────── */
function skillsHTML(n) {
    var cards = SKILLS.filter(function (s) { return on2(s.show); }).map(function (s, i) {
        var lvl = Number(s.level) || 0;
        return '<article class="card skill-card" style="--i:' + i + '">' +
            '<div class="skill-ico"><i class="' + esc(icon(s.icon, "fa-solid fa-layer-group")) + '"></i></div>' +
            '<h3>' + esc(s.category) + '</h3>' +
            '<ul class="skill-items">' + lines(s.items).map(function (it) {
                return '<li>' + esc(it) + '</li>';
            }).join("") + '</ul>' +
            (lvl ? '<div class="skill-meter"><span data-level="' + lvl + '"></span></div>' : '') +
            '</article>';
    }).join("");

    var strip = "";
    if (on("marqueeActive")) {
        /* Curated tech-stack marquee with inline SVG logos (no blink/glow). */
        var mq = [
            ['Python', '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z"></path></svg>'],
            ['TensorFlow', '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M1.292 5.856L11.54 0v24l-4.095-2.378V7.603l-6.168 3.564.015-5.31zm21.43 5.311l-.014-5.31L12.46 0v24l4.095-2.378V14.87l3.092 1.788-.018-4.618-3.074-1.756V7.603l6.168 3.564z"></path></svg>'],
            ['PyTorch', '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12.005 0L4.952 7.053a9.865 9.865 0 000 14.022 9.866 9.866 0 0014.022 0c3.984-3.9 3.986-10.205.085-14.023l-1.744 1.743c2.904 2.905 2.904 7.634 0 10.538s-7.634 2.904-10.538 0-2.904-7.634 0-10.538l4.647-4.646.582-.665zm3.568 3.899a1.327 1.327 0 00-1.327 1.327 1.327 1.327 0 001.327 1.328A1.327 1.327 0 0016.9 5.226 1.327 1.327 0 0015.573 3.9z"></path></svg>'],
            ['OpenCV', '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.8992.8525C8.735.8525 6.17 3.4175 6.17 6.5817c0 2.102 1.1321 3.9398 2.8198 4.9366l1.6412-2.7849c.0411-.0699.0176-.1593-.0495-.2048-.6233-.4227-1.0328-1.137-1.0328-1.947 0-1.298 1.0524-2.3504 2.3505-2.3504 1.2981 0 2.3505 1.0524 2.3505 2.3505 0 .8098-.4095 1.5242-1.0328 1.947-.0671.0454-.0907.1348-.0495.2047l1.6414 2.785c1.6878-.9969 2.8199-2.8346 2.8199-4.9367 0-3.1642-2.5653-5.7292-5.7295-5.7292zm-6.17 10.8366C2.565 11.6891 0 14.2541 0 17.4183c0 3.1642 2.565 5.7292 5.7292 5.7292 3.1798 0 5.8074-2.6995 5.7275-5.8762H8.2313c-.0847 0-.1513.0717-.1519.1564-.0082 1.266-1.0644 2.3411-2.3502 2.3411-1.2981 0-2.3505-1.0524-2.3505-2.3505 0-1.2982 1.0524-2.3505 2.3505-2.3505.34 0 .663.0724.9547.2022.0713.0318.1566.0077.1962-.0595l1.6464-2.7935c-.8273-.4636-1.7815-.7279-2.7973-.7279zm15.4424.7614l-1.6366 2.7878c-.041.07-.0172.1594.05.2048.624.4217 1.0348 1.1354 1.0363 1.9452.0022 1.298-1.0483 2.352-2.3465 2.3542-1.298.0023-2.3523-1.0482-2.3545-2.3462-.0015-.8098.4068-1.5248 1.0294-1.9486.067-.0457.0905-.1353.0492-.2051l-1.6464-2.7818c-1.6859.9998-2.8146 2.8394-2.811 4.9415.0056 3.1641 2.575 5.7248 5.7393 5.7192 3.1641-.0054 5.7246-2.575 5.7192-5.7392-.0037-2.1022-1.139-3.938-2.8284-4.9318z"></path></svg>'],
            ['FastAPI', '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 .0387C5.3729.0384.0003 5.3931 0 11.9988c-.001 6.6066 5.372 11.9628 12 11.9625 6.628.0003 12.001-5.3559 12-11.9625-.0003-6.6057-5.3729-11.9604-12-11.96m-.829 5.4153h7.55l-7.5805 5.3284h5.1828L5.279 18.5436q2.9466-6.5444 5.892-13.0896"></path></svg>'],
            ['Streamlit', '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16.673 11.32l6.862-3.618c.233-.136.554.12.442.387L20.463 17.1zm-8.556-.229l3.473-5.187c.203-.328.578-.316.793-.028l7.886 11.75zm-3.375 7.25c-.28 0-.835-.284-.993-.716l-3.72-9.46c-.118-.331.139-.614.48-.464l19.474 10.306c-.149.147-.453.337-.72.334z"></path></svg>'],
            ['Rasa', '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'],
            ['Firebase', '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.455 8.369c-.538-.748-1.778-2.285-3.681-4.569-.826-.991-1.535-1.832-1.884-2.245a146 146 0 0 0-.488-.576l-.207-.245-.113-.133-.022-.032-.01-.005L12.57 0l-.609.488c-1.555 1.246-2.828 2.851-3.681 4.64-.523 1.064-.864 2.105-1.043 3.176-.047.241-.088.489-.121.738-.209-.017-.421-.028-.632-.033-.018-.001-.035-.002-.059-.003a7.46 7.46 0 0 0-2.28.274l-.317.089-.163.286c-.765 1.342-1.198 2.869-1.252 4.416-.07 2.01.477 3.954 1.583 5.625 1.082 1.633 2.61 2.882 4.42 3.611l.236.095.071.025.003-.001a9.59 9.59 0 0 0 2.941.568q.171.006.342.006c1.273 0 2.513-.249 3.69-.742l.008.004.313-.145a9.63 9.63 0 0 0 3.927-3.335c1.01-1.49 1.577-3.234 1.641-5.042.075-2.161-.643-4.304-2.133-6.371m-7.083 6.695c.328 1.244.264 2.44-.191 3.558-1.135-1.12-1.967-2.352-2.475-3.665-.543-1.404-.87-2.74-.974-3.975.48.157.922.366 1.315.622 1.132.737 1.914 1.902 2.325 3.461zm.207 6.022c.482.368.99.712 1.513 1.028-.771.21-1.565.302-2.369.273a8 8 0 0 1-.373-.022c.458-.394.869-.823 1.228-1.279zm1.347-6.431c-.516-1.957-1.527-3.437-3.002-4.398-.647-.421-1.385-.741-2.194-.95.011-.134.026-.268.043-.4.014-.113.03-.216.046-.313.133-.689.332-1.37.589-2.025.099-.25.206-.499.321-.74l.004-.008c.177-.358.376-.719.61-1.105l.092-.152-.003-.001c.544-.851 1.197-1.627 1.942-2.311l.288.341c.672.796 1.304 1.548 1.878 2.237 1.291 1.549 2.966 3.583 3.612 4.48 1.277 1.771 1.893 3.579 1.83 5.375-.049 1.395-.461 2.755-1.195 3.933-.694 1.116-1.661 2.05-2.8 2.708-.636-.318-1.559-.839-2.539-1.599.79-1.575.952-3.28.479-5.072zm-2.575 5.397c-.725.939-1.587 1.55-2.09 1.856-.081-.029-.163-.06-.243-.093l-.065-.026c-1.49-.616-2.747-1.656-3.635-3.01-.907-1.384-1.356-2.993-1.298-4.653.041-1.19.338-2.327.882-3.379.316-.07.638-.114.96-.131l.084-.002c.162-.003.324-.003.478 0 .227.011.454.035.677.07.073 1.513.445 3.145 1.105 4.852.637 1.644 1.694 3.162 3.144 4.515z"></path></svg>'],
            ['Docker', '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z"></path></svg>'],
            ['scikit-learn', '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.601 5.53c-1.91.035-3.981.91-5.63 2.56-2.93 2.93-2.083 8.53-1.088 9.525.805.804 6.595 1.843 9.526-1.088a9.74 9.74 0 0 0 .584-.643c.043-.292.205-.66.489-1.106a1.848 1.848 0 0 1-.537.176c-.144.265-.37.55-.676.855-.354.335-.607.554-.76.656a.795.795 0 0 1-.437.152c-.35 0-.514-.308-.494-.924-.22.316-.425.549-.612.7a.914.914 0 0 1-.578.224c-.194 0-.36-.09-.496-.273a1.03 1.03 0 0 1-.193-.507 4.016 4.016 0 0 1-.726.583c-.224.132-.47.197-.74.197-.3 0-.543-.096-.727-.288a.978.978 0 0 1-.257-.524v.004c-.3.276-.564.48-.79.611a1.295 1.295 0 0 1-.649.197.693.693 0 0 1-.571-.275c-.145-.183-.218-.43-.218-.739 0-.464.101-1.02.302-1.67.201-.65.445-1.25.733-1.797l.842-.312a.21.21 0 0 1 .06-.013c.063 0 .116.047.157.14.04.095.061.221.061.38 0 .451-.104.888-.312 1.31-.207.422-.532.873-.974 1.352-.018.23-.027.388-.027.474 0 .193.036.345.106.458.071.113.165.169.282.169a.71.71 0 0 0 .382-.13c.132-.084.333-.26.602-.523.028-.418.187-.798.482-1.142.324-.38.685-.569 1.08-.569.206 0 .37.054.494.16a.524.524 0 0 1 .186.417c0 .458-.486.829-1.459 1.114.088.43.32.646.693.646a.807.807 0 0 0 .417-.117c.129-.076.321-.243.575-.497.032-.252.118-.495.259-.728.182-.3.416-.544.701-.73.285-.185.537-.278.756-.278.276 0 .47.127.58.381l.677-.374h.186l-.292.971c-.15.488-.226.823-.226 1.004 0 .19.067.285.202.285.086 0 .181-.045.285-.137.104-.092.25-.232.437-.42v.001c.143-.155.274-.32.392-.494-.19-.084-.285-.21-.285-.375 0-.17.058-.352.174-.545.116-.194.275-.29.479-.29.172 0 .258.088.258.265 0 .139-.05.338-.149.596.367-.04.687-.32.961-.842l.228-.01c1.059-2.438.828-5.075-.83-6.732-1.019-1.02-2.408-1.5-3.895-1.471zm4.725 8.203a8.938 8.938 0 0 1-1.333 2.151 1.09 1.09 0 0 0-.012.147c0 .168.047.309.14.423.092.113.206.17.34.17.296 0 .714-.264 1.254-.787-.001.04-.003.08-.003.121 0 .146.012.368.036.666l.733-.172c0-.2.003-.357.01-.474.01-.157.033-.33.066-.517.02-.11.07-.216.152-.315l.186-.216a5.276 5.276 0 0 1 .378-.397c.062-.055.116-.099.162-.13a.26.26 0 0 1 .123-.046c.055 0 .083.035.083.106 0 .07-.052.236-.156.497-.194.486-.292.848-.292 1.084 0 .175.046.314.136.418a.45.45 0 0 0 .358.155c.365 0 .803-.269 1.313-.808v-.381c-.361.426-.623.64-.784.64-.109 0-.163-.067-.163-.2 0-.1.065-.316.195-.65.19-.486.285-.836.285-1.048a.464.464 0 0 0-.112-.319.36.36 0 0 0-.282-.127c-.165 0-.354.077-.567.233-.213.156-.5.436-.863.84.053-.262.165-.622.335-1.08l-.809.156a6.54 6.54 0 0 0-.399 1.074c-.04.156-.07.316-.092.48a7.447 7.447 0 0 1-.49.45.38.38 0 0 1-.229.08.208.208 0 0 1-.174-.082.352.352 0 0 1-.064-.222c0-.1.019-.214.056-.343.038-.13.12-.373.249-.731l.308-.849zm-17.21-2.927c-.863-.016-1.67.263-2.261.854-1.352 1.352-1.07 3.827.631 5.527 1.7 1.701 4.95 1.21 5.527.632.467-.466 1.07-3.827-.631-5.527-.957-.957-2.158-1.465-3.267-1.486zm12.285.358h.166v.21H15.4zm.427 0h.166v.865l.46-.455h.195l-.364.362.428.684h-.198l-.357-.575-.164.166v.41h-.166zm1.016 0h.166v.21h-.166zm.481.122h.166v.288h.172v.135h-.172v.717c0 .037.006.062.02.075.012.013.037.02.074.02a.23.23 0 0 0 .078-.01v.141a.802.802 0 0 1-.136.014.23.23 0 0 1-.15-.043.15.15 0 0 1-.052-.123v-.79h-.141v-.136h.141zm-3.562.258c.081 0 .15.012.207.038.057.024.1.061.13.11s.045.106.045.173h-.176c-.006-.111-.075-.167-.208-.167a.285.285 0 0 0-.164.041.134.134 0 0 0-.06.117c0 .035.015.065.045.088.03.024.08.044.15.06l.16.039a.47.47 0 0 1 .224.105c.047.046.07.108.07.186a.3.3 0 0 1-.052.175.327.327 0 0 1-.152.116.585.585 0 0 1-.226.041c-.136 0-.24-.03-.309-.088-.069-.059-.105-.149-.109-.269h.176c.004.037.01.065.017.084a.166.166 0 0 0 .034.054c.044.043.112.065.204.065a.31.31 0 0 0 .177-.045.139.139 0 0 0 .067-.119.116.116 0 0 0-.038-.09.287.287 0 0 0-.124-.055l-.156-.038a1.248 1.248 0 0 1-.159-.05.359.359 0 0 1-.098-.061.22.22 0 0 1-.058-.083.32.32 0 0 1-.016-.108c0-.096.036-.174.109-.232a.45.45 0 0 1 .29-.087zm1.035 0a.46.46 0 0 1 .202.043.351.351 0 0 1 .187.212.577.577 0 0 1 .023.126h-.168a.256.256 0 0 0-.078-.168.242.242 0 0 0-.17-.06.248.248 0 0 0-.155.05.306.306 0 0 0-.1.144.662.662 0 0 0-.034.224.58.58 0 0 0 .035.214.299.299 0 0 0 .101.135.261.261 0 0 0 .157.048c.142 0 .227-.084.256-.252h.167a.519.519 0 0 1-.065.22.35.35 0 0 1-.146.138.464.464 0 0 1-.216.048.448.448 0 0 1-.246-.066.441.441 0 0 1-.161-.192.703.703 0 0 1-.057-.293c0-.085.01-.163.032-.233a.522.522 0 0 1 .095-.182.403.403 0 0 1 .15-.117.453.453 0 0 1 .191-.04zm.603.03h.166v1.046H15.4zm1.443 0h.166v1.046h-.166zm-5.05.618c-.08 0-.2.204-.356.611-.155.407-.308.977-.459 1.71.281-.312.509-.662.683-1.05.175-.387.262-.72.262-.999a.455.455 0 0 0-.036-.197c-.025-.05-.056-.075-.093-.075zm4.662 1.797c-.221 0-.431.188-.629.563-.197.376-.296.722-.296 1.038 0 .12.029.216.088.29a.273.273 0 0 0 .223.111c.221 0 .43-.188.625-.565.196-.377.294-.725.294-1.043a.457.457 0 0 0-.083-.29.269.269 0 0 0-.222-.104zm-2.848.007c-.146 0-.285.11-.417.333-.133.222-.2.51-.2.866.566-.159.849-.452.849-.881 0-.212-.077-.318-.232-.318Z"></path></svg>'],
            ['pandas', '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16.922 0h2.623v18.104h-2.623zm-4.126 12.94h2.623v2.57h-2.623zm0-7.037h2.623v5.446h-2.623zm0 11.197h2.623v5.446h-2.623zM4.456 5.896h2.622V24H4.455zm4.213 2.559h2.623v2.57H8.67zm0 4.151h2.623v5.447H8.67zm0-11.187h2.623v5.446H8.67Z"></path></svg>'],
            ['Next.js', '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.665 21.978C16.758 23.255 14.465 24 12 24 5.377 24 0 18.623 0 12S5.377 0 12 0s12 5.377 12 12c0 3.583-1.574 6.801-4.067 9.001L9.219 7.2H7.2v9.596h1.615V9.251l9.85 12.727Zm-3.332-8.533 1.6 2.061V7.2h-1.6v6.245Z"></path></svg>'],
            ['Postgres', '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M23.5594 14.7228a.5269.5269 0 0 0-.0563-.1191c-.139-.2632-.4768-.3418-1.0074-.2321-1.6533.3411-2.2935.1312-2.5256-.0191 1.342-2.0482 2.445-4.522 3.0411-6.8297.2714-1.0507.7982-3.5237.1222-4.7316a1.5641 1.5641 0 0 0-.1509-.235C21.6931.9086 19.8007.0248 17.5099.0005c-1.4947-.0158-2.7705.3461-3.1161.4794a9.449 9.449 0 0 0-.5159-.0816 8.044 8.044 0 0 0-1.3114-.1278c-1.1822-.0184-2.2038.2642-3.0498.8406-.8573-.3211-4.7888-1.645-7.2219.0788C.9359 2.1526.3086 3.8733.4302 6.3043c.0409.818.5069 3.334 1.2423 5.7436.4598 1.5065.9387 2.7019 1.4334 3.582.553.9942 1.1259 1.5933 1.7143 1.7895.4474.1491 1.1327.1441 1.8581-.7279.8012-.9635 1.5903-1.8258 1.9446-2.2069.4351.2355.9064.3625 1.39.3772a.0569.0569 0 0 0 .0004.0041 11.0312 11.0312 0 0 0-.2472.3054c-.3389.4302-.4094.5197-1.5002.7443-.3102.064-1.1344.2339-1.1464.8115-.0025.1224.0329.2309.0919.3268.2269.4231.9216.6097 1.015.6331 1.3345.3335 2.5044.092 3.3714-.6787-.017 2.231.0775 4.4174.3454 5.0874.2212.5529.7618 1.9045 2.4692 1.9043.2505 0 .5263-.0291.8296-.0941 1.7819-.3821 2.5557-1.1696 2.855-2.9059.1503-.8707.4016-2.8753.5388-4.1012.0169-.0703.0357-.1207.057-.1362.0007-.0005.0697-.0471.4272.0307a.3673.3673 0 0 0 .0443.0068l.2539.0223.0149.001c.8468.0384 1.9114-.1426 2.5312-.4308.6438-.2988 1.8057-1.0323 1.5951-1.6698zM2.371 11.8765c-.7435-2.4358-1.1779-4.8851-1.2123-5.5719-.1086-2.1714.4171-3.6829 1.5623-4.4927 1.8367-1.2986 4.8398-.5408 6.108-.13-.0032.0032-.0066.0061-.0098.0094-2.0238 2.044-1.9758 5.536-1.9708 5.7495-.0002.0823.0066.1989.0162.3593.0348.5873.0996 1.6804-.0735 2.9184-.1609 1.1504.1937 2.2764.9728 3.0892.0806.0841.1648.1631.2518.2374-.3468.3714-1.1004 1.1926-1.9025 2.1576-.5677.6825-.9597.5517-1.0886.5087-.3919-.1307-.813-.5871-1.2381-1.3223-.4796-.839-.9635-2.0317-1.4155-3.5126zm6.0072 5.0871c-.1711-.0428-.3271-.1132-.4322-.1772.0889-.0394.2374-.0902.4833-.1409 1.2833-.2641 1.4815-.4506 1.9143-1.0002.0992-.126.2116-.2687.3673-.4426a.3549.3549 0 0 0 .0737-.1298c.1708-.1513.2724-.1099.4369-.0417.156.0646.3078.26.3695.4752.0291.1016.0619.2945-.0452.4444-.9043 1.2658-2.2216 1.2494-3.1676 1.0128zm2.094-3.988-.0525.141c-.133.3566-.2567.6881-.3334 1.003-.6674-.0021-1.3168-.2872-1.8105-.8024-.6279-.6551-.9131-1.5664-.7825-2.5004.1828-1.3079.1153-2.4468.079-3.0586-.005-.0857-.0095-.1607-.0122-.2199.2957-.2621 1.6659-.9962 2.6429-.7724.4459.1022.7176.4057.8305.928.5846 2.7038.0774 3.8307-.3302 4.7363-.084.1866-.1633.3629-.2311.5454zm7.3637 4.5725c-.0169.1768-.0358.376-.0618.5959l-.146.4383a.3547.3547 0 0 0-.0182.1077c-.0059.4747-.054.6489-.115.8693-.0634.2292-.1353.4891-.1794 1.0575-.11 1.4143-.8782 2.2267-2.4172 2.5565-1.5155.3251-1.7843-.4968-2.0212-1.2217a6.5824 6.5824 0 0 0-.0769-.2266c-.2154-.5858-.1911-1.4119-.1574-2.5551.0165-.5612-.0249-1.9013-.3302-2.6462.0044-.2932.0106-.5909.019-.8918a.3529.3529 0 0 0-.0153-.1126 1.4927 1.4927 0 0 0-.0439-.208c-.1226-.4283-.4213-.7866-.7797-.9351-.1424-.059-.4038-.1672-.7178-.0869.067-.276.1831-.5875.309-.9249l.0529-.142c.0595-.16.134-.3257.213-.5012.4265-.9476 1.0106-2.2453.3766-5.1772-.2374-1.0981-1.0304-1.6343-2.2324-1.5098-.7207.0746-1.3799.3654-1.7088.5321a5.6716 5.6716 0 0 0-.1958.1041c.0918-1.1064.4386-3.1741 1.7357-4.4823a4.0306 4.0306 0 0 1 .3033-.276.3532.3532 0 0 0 .1447-.0644c.7524-.5706 1.6945-.8506 2.802-.8325.4091.0067.8017.0339 1.1742.081 1.939.3544 3.2439 1.4468 4.0359 2.3827.8143.9623 1.2552 1.9315 1.4312 2.4543-1.3232-.1346-2.2234.1268-2.6797.779-.9926 1.4189.543 4.1729 1.2811 5.4964.1353.2426.2522.4522.2889.5413.2403.5825.5515.9713.7787 1.2552.0696.087.1372.1714.1885.245-.4008.1155-1.1208.3825-1.0552 1.717-.0123.1563-.0423.4469-.0834.8148-.0461.2077-.0702.4603-.0994.7662zm.8905-1.6211c-.0405-.8316.2691-.9185.5967-1.0105a2.8566 2.8566 0 0 0 .135-.0406 1.202 1.202 0 0 0 .1342.103c.5703.3765 1.5823.4213 3.0068.1344-.2016.1769-.5189.3994-.9533.6011-.4098.1903-1.0957.333-1.7473.3636-.7197.0336-1.0859-.0807-1.1721-.151zm.5695-9.2712c-.0059.3508-.0542.6692-.1054 1.0017-.055.3576-.112.7274-.1264 1.1762-.0142.4368.0404.8909.0932 1.3301.1066.887.216 1.8003-.2075 2.7014a3.5272 3.5272 0 0 1-.1876-.3856c-.0527-.1276-.1669-.3326-.3251-.6162-.6156-1.1041-2.0574-3.6896-1.3193-4.7446.3795-.5427 1.3408-.5661 2.1781-.463zm.2284 7.0137a12.3762 12.3762 0 0 0-.0853-.1074l-.0355-.0444c.7262-1.1995.5842-2.3862.4578-3.4385-.0519-.4318-.1009-.8396-.0885-1.2226.0129-.4061.0666-.7543.1185-1.0911.0639-.415.1288-.8443.1109-1.3505.0134-.0531.0188-.1158.0118-.1902-.0457-.4855-.5999-1.938-1.7294-3.253-.6076-.7073-1.4896-1.4972-2.6889-2.0395.5251-.1066 1.2328-.2035 2.0244-.1859 2.0515.0456 3.6746.8135 4.8242 2.2824a.908.908 0 0 1 .0667.1002c.7231 1.3556-.2762 6.2751-2.9867 10.5405zm-8.8166-6.1162c-.025.1794-.3089.4225-.6211.4225a.5821.5821 0 0 1-.0809-.0056c-.1873-.026-.3765-.144-.5059-.3156-.0458-.0605-.1203-.178-.1055-.2844.0055-.0401.0261-.0985.0925-.1488.1182-.0894.3518-.1226.6096-.0867.3163.0441.6426.1938.6113.4186zm7.9305-.4114c.0111.0792-.049.201-.1531.3102-.0683.0717-.212.1961-.4079.2232a.5456.5456 0 0 1-.075.0052c-.2935 0-.5414-.2344-.5607-.3717-.024-.1765.2641-.3106.5611-.352.297-.0414.6111.0088.6356.1851z"></path></svg>'],
            ['AWS', '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></svg>'],
            ['React', '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z"></path></svg>'],
            ['FFmpeg', '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21.72 17.91V6.5l-.53-.49L9.05 18.52l-1.29-.06L24 1.53l-.33-.95-11.93 1-5.75 6.6v-.23l4.7-5.39-1.38-.77-9.11.77v2.85l1.91.46v.01l.19-.01-.56.66v10.6c.609-.126 1.22-.241 1.83-.36L14.12 5.22l.83-.04L0 21.44l9.67.82 1.35-.77 6.82-6.74v2.15l-5.72 5.57 11.26.95.35-.94v-3.16l-3.29-.18c.434-.403.858-.816 1.28-1.23z"></path></svg>']
        ];
        var row = mq.map(function (m) {
            return '<span class="marquee-item"><span class="marquee-ico">' + m[1] + '</span>' +
                '<span class="marquee-label">' + m[0] + '</span>' +
                '<span class="marquee-sep">/</span></span>';
        }).join("");
        strip = '<div class="marquee"><div class="marquee-track">' + row + row + '</div></div>';
    }

    return '<section id="skills" class="section"><div class="shell">' +
        secHead("skills", n, true) +
        '<div class="skills-grid">' + cards + '</div>' + strip +
        '</div></section>';
}

/* ── PROJECTS ───────────────────────────────────────────── */
/* ── PROJECTS ─────────────────────────────────────────────────────────── */
/* The home page shows a teaser of featured work with a link to the full
   list. /portfolio holds every project; /portfolio/<slug> holds one. The
   cards are ordinary anchors, so middle-click, "open in new tab" and
   crawlers all behave — the router only intercepts plain left clicks. */

function featuredOnly() { return on("projectsFeaturedOnly", "yes"); }

function previewCount() {
    var n = parseInt(cfg("projectsPreviewCount", 3), 10);
    return (isNaN(n) || n < 1) ? 3 : n;
}

function isFeatured(p) {
    var v = p.featured;
    if (v === true) return true;
    if (v === false || v === undefined || v === null || v === "") return false;
    return on2(v);
}

/* Everything the sheet says is visible. */
function shownProjects() {
    return PROJECTS.filter(function (p) { return on2(p.show); });
}

/* …narrowed by the active category chip (only used on /portfolio). */
function scopedProjects() {
    return shownProjects().filter(function (p) {
        return FILTER === "All" || p.category === FILTER;
    });
}

/* …and what the home page teaser should show. */
function homeProjects() {
    var all = shownProjects();
    if (!featuredOnly()) return all;
    var feat = all.filter(isFeatured);
    // Nobody ticked Featured? Show the first few rather than nothing.
    return feat.length ? feat : all.slice(0, previewCount());
}

function projCategories() {
    var cats = [];
    shownProjects().forEach(function (p) {
        if (p.category && cats.indexOf(p.category) === -1) cats.push(p.category);
    });
    return cats;
}

function projFiltersHTML() {
    var cats = ["All"].concat(projCategories());
    return cats.map(function (c) {
        return '<button type="button" class="filter-btn' + (c === FILTER ? ' on' : '') +
            '" data-filter="' + esc(c) + '">' + esc(c) + '</button>';
    }).join("");
}

/* Card thumbs render ~310-620px wide and the detail hero ~1100px, but the
   sheet routinely points at multi-megabyte originals (Pexels hands out
   6000px+ JPEGs). Decoding those is what froze the page when the grid
   scrolled into view and on the first card hover. Request a right-sized
   variant from CDNs that support it; other hosts pass through untouched. */
function sizedImg(src, w) {
    if (!src) return src;
    if (src.indexOf("images.unsplash.com") > -1) {
        return src.replace(/([?&])w=\d+/, "$1w=" + w).replace(/([?&])q=\d+/, "$1q=" + (w <= 800 ? 65 : 75));
    }
    if (src.indexOf("images.pexels.com") > -1) {
        return src.split("?")[0] + "?auto=compress&cs=tinysrgb&w=" + w;
    }
    return src;
}

/* Cards only ever need the small variant. */
function thumbSrc(src) {
    return sizedImg(src, 800);
}

function projectCards(list) {
    if (!list.length) return '<p class="empty-note">No projects in this category yet.</p>';

    return list.map(function (p, i) {
        return '<a class="card proj" href="' + esc(urlProject(p.slug)) + '" ' +
            'data-slug="' + esc(p.slug) + '" style="--i:' + i + '">' +
            '<span class="proj-thumb">' +
            (p.image ? '<img src="' + esc(thumbSrc(p.image)) + '" alt="' + esc(p.title) + '" loading="lazy" decoding="async">' : '') +
            '<span class="veil"></span>' +
            (p.category ? '<span class="pill proj-cat">' + esc(p.category) + '</span>' : '') +
            (isFeatured(p) ? '<i class="fa-solid fa-star proj-star" title="Featured"></i>' : '') +
            (videoEmbed(p.video) ? '<span class="proj-play"><i class="fa-solid fa-play"></i>Video</span>' : '') +
            '<span class="proj-open"><i class="fa-solid fa-arrow-up-right-from-square"></i></span>' +
            '</span>' +
            '<span class="proj-body"><h3>' + esc(p.title) + '</h3>' +
            '<span class="proj-sum">' + esc(p.summary) + '</span>' +
            '<span class="tag-row">' + listOf(p.tags).slice(0, 3).map(function (t) {
                return '<span class="pill">' + esc(t) + '</span>';
            }).join("") + '</span>' +
            '<span class="proj-meta"><span>' + esc(p.client || p.role || "") + '</span>' +
            '<span>' + esc(p.year || "") + '</span></span>' +
            '</span></a>';
    }).join("");
}

/* ── Home teaser ──────────────────────────────────────────────────────── */
function projectsHTML(n) {
    var list = homeProjects();
    var total = shownProjects().length;

    var more = '<a class="btn btn-accent" href="' + esc(urlProjects()) + '" data-route>' +
        esc(cfg("projectsViewAllText", "View all projects")) +
        (total > list.length ? '<span class="proj-count">' + total + '</span>' : '') +
        '<i class="fa-solid fa-arrow-right"></i></a>';

    return '<section id="projects" class="section"><div class="shell">' +
        secHead("projects", n) +
        '<div class="proj-grid">' + projectCards(list) + '</div>' +
        '<div class="proj-actions" data-reveal>' + more +
        '<a class="btn btn-ghost" href="#contact">Have something similar in mind?' +
        '<i class="fa-solid fa-arrow-right"></i></a>' +
        '</div></div></section>';
}

/* ── /portfolio ───────────────────────────────────────────────────────── */
function pageProjects() {
    var meta = sec("projects");
    var chips = projCategories().length > 1
        ? '<div class="filter-row" id="proj-filters" data-reveal>' + projFiltersHTML() + '</div>'
        : '';

    return '<section class="section page-top"><div class="shell">' +
        crumbs([["Home", urlHome()], [pageLabel(), null]]) +
        '<header class="sec-head page-head" data-reveal>' +
        (meta.eyebrow ? '<span class="mono-label">' + esc(meta.eyebrow) + '</span>' : '') +
        '<h1 class="sec-title">' + markup(meta.title || "Projects") + '</h1>' +
        (meta.subtitle ? '<p class="sec-sub">' + markup(meta.subtitle) + '</p>' : '') +
        '<p class="page-count mono-label">' + shownProjects().length + ' projects</p>' +
        '</header>' +
        chips +
        '<div class="proj-grid" id="proj-grid" aria-live="polite">' +
        projectCards(scopedProjects()) + '</div>' +
        '<div class="proj-actions" data-reveal>' +
        '<a class="btn btn-accent" href="' + esc(urlHome()) + '" data-route>' +
        '<i class="fa-solid fa-arrow-left"></i>Back home</a>' +
        '<a class="btn btn-accent" href="' + esc(urlHome()) + '#contact" data-route>' +
        'Start a project<i class="fa-solid fa-arrow-right"></i></a>' +
        '</div></div></section>';
}

function pageLabel() {
    return String(sec("projects").title || "Projects").replace(/\*/g, "");
}

/* ── /about ─────────────────────────────────────────────────────────────
   A dedicated page with a richer, sectioned take on the person: the same
   intro as the home hero, then stats, a "how I work" process, the career
   timeline and the services on offer. */
/* The /about page.
   ---------------------------------------------------------------------
   Built from the same section list as the home page, filtered on the
   About Page column instead of Home. So moving Experience off the home
   page and onto this one is two cells in 🧩 Sections, not a code change,
   and a block can never end up on both pages by accident the way it did
   when placement was implied rather than stated.

   The About block itself renders bare here — the page header above it
   is already carrying the title. */
function pageAbout() {
    var meta = sec("about");
    var aboutTitle = String(meta.title || "About").replace(/\*/g, "");

    /* The About block leads its own page whatever its position in the
       running order — the home page's order puts stats above it, and
       opening the About page with four figures before the story reads
       backwards. Everything else keeps the order it has. */
    var order = SECS.filter(function (s) { return onPage(s, "about"); });
    order.sort(function (a, b) {
        return (a.key === "about" ? -1 : 0) - (b.key === "about" ? -1 : 0);
    });

    var body = "", n = 0;
    order.forEach(function (s) {
        var fn = BUILDERS[s.key];
        if (!fn) return;
        var bare = (s.key === "about");
        var num = (bare || !hasHead(s.key)) ? "" : pad(++n);
        body += fn(num, bare);
    });

    return '<section class="section page-top"><div class="shell">' +
        crumbs([["Home", urlHome()], [aboutTitle, null]]) +
        '<header class="sec-head page-head" data-reveal>' +
        (meta.eyebrow ? '<span class="mono-label">' + esc(meta.eyebrow) + '</span>' : '') +
        '<h1 class="sec-title">' + markup(meta.title || "About") + '</h1>' +
        (meta.subtitle ? '<p class="sec-sub">' + markup(meta.subtitle) + '</p>' : '') +
        '</header></div></section>' +

        body +

        '<section class="section"><div class="shell"><div class="proj-actions" data-reveal>' +
        '<a class="btn btn-accent" href="' + esc(urlHome()) + '" data-route>' +
        '<i class="fa-solid fa-arrow-left"></i>Back home</a>' +
        '<a class="btn btn-accent" href="' + esc(urlHome()) + '#contact" data-route>' +
        'Start a project<i class="fa-solid fa-arrow-right"></i></a>' +
        '</div></div></section>';
}

/* Repaint just the grid when a category chip is clicked. */
function refreshProjects() {
    var grid = $("#proj-grid");
    if (!grid) return;
    var f = $("#proj-filters");
    if (f) f.innerHTML = projFiltersHTML();
    grid.innerHTML = projectCards(scopedProjects());
    warmThumbs();
}

/* ── /portfolio/<slug> ────────────────────────────────────────────────── */
function pageProject(p) {
    var facts = [
        ["Client", p.client], ["Role", p.role], ["Year", p.year],
        ["Duration", p.duration], ["Category", p.category]
    ].filter(function (f) { return f[1]; }).map(function (f) {
        return '<div class="pp-fact"><span class="k">' + esc(f[0]) + '</span>' +
            '<span class="v">' + esc(f[1]) + '</span></div>';
    }).join("");

    var gallery = listOf(p.gallery).map(function (g) {
        return '<img src="' + esc(sizedImg(g, 1600)) + '" alt="' + esc(p.title) + ' screenshot" loading="lazy" decoding="async">';
    }).join("");

    var video = videoEmbed(p.video);
    var videoBlock = video
        ? '<div class="pp-block">' +
        '<h3>' + esc(cfg("projectVideoHeading", "Walkthrough")) + '</h3>' +
        '<div class="video-frame pp-video">' +
        '<iframe src="' + esc(video) + '" title="' + esc(p.title) + ' walkthrough" ' +
        'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
        'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe>' +
        '</div></div>'
        : "";

    var actions = "";
    if (p.liveUrl) actions += '<a class="btn btn-accent" href="' + esc(p.liveUrl) +
        '" target="_blank" rel="noopener">View live<i class="fa-solid fa-arrow-up-right-from-square"></i></a>';
    if (p.repoUrl) actions += '<a class="btn btn-ghost" href="' + esc(p.repoUrl) +
        '" target="_blank" rel="noopener"><i class="fa-brands fa-github"></i>Source</a>';
    actions += '<a class="btn btn-accent" href="' + esc(urlHome()) + '#contact" data-route>' +
        'Build something like this<i class="fa-solid fa-arrow-right"></i></a>';

    // Previous / next walk the visible list in sheet order.
    var list = shownProjects();
    var at = -1;
    for (var i = 0; i < list.length; i++) if (list[i].slug === p.slug) { at = i; break; }
    var prev = at > 0 ? list[at - 1] : null;
    var next = at > -1 && at < list.length - 1 ? list[at + 1] : null;

    var pager = (prev || next)
        ? '<nav class="proj-pager" aria-label="More projects">' +
        (prev ? '<a class="pager-link prev" href="' + esc(urlProject(prev.slug)) + '" data-route>' +
            '<span class="mono-label"><i class="fa-solid fa-arrow-left"></i> Previous</span>' +
            '<b>' + esc(prev.title) + '</b></a>' : '<span></span>') +
        (next ? '<a class="pager-link next" href="' + esc(urlProject(next.slug)) + '" data-route>' +
            '<span class="mono-label">Next <i class="fa-solid fa-arrow-right"></i></span>' +
            '<b>' + esc(next.title) + '</b></a>' : '<span></span>') +
        '</nav>'
        : '';

    return '<article class="section page-top proj-page"><div class="shell">' +
        crumbs([["Home", urlHome()], [pageLabel(), urlProjects()], [p.title, null]]) +

        '<header class="pp-head page-head" data-reveal>' +
        (p.category ? '<span class="mono-label">' + esc(p.category) + '</span>' : '') +
        '<h1>' + esc(p.title) + '</h1>' +
        (p.summary ? '<p class="sec-sub">' + esc(p.summary) + '</p>' : '') +
        '<div class="tag-row">' + listOf(p.tags).map(function (t) {
            return '<span class="pill">' + esc(t) + '</span>';
        }).join("") + '</div>' +
        '</header>' +

        (p.image ? '<figure class="pp-hero pp-hero-page" data-reveal>' +
            '<img src="' + esc(sizedImg(p.image, 1600)) + '" alt="' + esc(p.title) + '" decoding="async"></figure>' : '') +

        '<div class="pp-body">' +
        (facts ? '<div class="pp-facts">' + facts + '</div>' : '') +
        videoBlock +
        (p.description ? renderRich(p.description) : bodySkeleton()) +
        (gallery ? '<div class="pp-block"><h3>Gallery</h3><div class="pp-gallery">' + gallery + '</div></div>' : '') +
        '<div class="pp-actions">' + actions + '</div>' +
        '</div>' +

        pager +
        '</div></article>';
}

/* Shown for the moment between opening a project and its Description
   arriving. Sized to roughly the shape of a real case study so the page
   does not jump when the text lands. */
function bodySkeleton() {
    var line = function (w) { return '<span class="sk-line" style="width:' + w + '%"></span>'; };
    return '<div class="pp-block sk-block" aria-hidden="true">' +
        '<span class="sk-line sk-head" style="width:34%"></span>' +
        line(100) + line(96) + line(88) +
        '<span class="sk-line sk-head" style="width:28%"></span>' +
        line(98) + line(92) + line(70) +
        '</div>';
}

function pageMissing(slug) {
    return '<section class="section page-top"><div class="shell">' +
        crumbs([["Home", urlHome()], [pageLabel(), urlProjects()]]) +
        '<header class="sec-head page-head">' +
        '<span class="mono-label">404</span>' +
        '<h1 class="sec-title">No project called <em>' + esc(slug) + '</em></h1>' +
        '<p class="sec-sub">It may have been renamed or hidden in the sheet.</p>' +
        '</header>' +
        '<div class="proj-actions">' +
        '<a class="btn btn-accent" href="' + esc(urlProjects()) + '" data-route>' +
        'See all projects<i class="fa-solid fa-arrow-right"></i></a>' +
        '</div></div></section>';
}

/* ==========================================================================
   RÉSUMÉ  (the unlisted page — see resumePath() above)

   Everything on this page is decided by the 📄 Resume sheet: which blocks
   appear, what order they run in, which fields inside each block are drawn,
   how many rows each one takes, and what every heading and label says.
   Content still comes from the sheets that already build the site — 🗓
   Experience, 🚀 Projects, 🧠 Skills, 🧰 Tools, 📊 Stats, 🔗 Social Links,
   🏅 Resume Extras, ⚙ Config — but nothing is drawn unless the résumé sheet
   asks for it, and every value can be overridden there.

   Three rules make that work:
     • rcfg(key, fallback) reads 📄 Resume first, ⚙ Config second, so a
       blank cell means "use what the site already says", not "show nothing".
     • ron("show…") turns any block or field off. Defaults are chosen so an
       empty sheet still renders a complete, sensible résumé.
     • "Section Order" reorders the blocks. Unnamed blocks keep their default
       place unless "Strict Section Order" is set, in which case naming a
       block is the only way to include it.

   Laid out as a document, not a web page: a nameplate, a contact rule, then
   sections whose headings sit in a left rail so the reading column stays a
   comfortable measure. What prints is what the screen shows.
   ========================================================================== */

/* Every block the page can draw, in the order it takes when the sheet says
   nothing about ordering. Blocks invented by the 🗓 Experience "Type" column
   are spliced in after Experience — see rzDefaultOrder(). */
var RZ_ORDER = [
    "header", "contact", "summary", "stats",
    "experience", "projects", "skills", "education", "extras"
];

/* ── Sheet value readers ──────────────────────────────────────────────
   All four sit on top of rcfg(), so each one honours 📄 Resume → ⚙ Config
   → hard default in that order. */

/* A count from the sheet. Blank falls back to the default; 0 is honoured,
   so "Projects Count: 0" is a legitimate way to drop the project list. */
function rnum(key, dflt) {
    var raw = String(rcfg(key, "")).trim();
    if (!raw) return dflt;
    var n = parseInt(raw.replace(/[^0-9]/g, ""), 10);
    return isNaN(n) ? dflt : n;
}

/* A lower-cased keyword — "Paper Size: A4" → "a4". */
function ropt(key, dflt) {
    var v = String(rcfg(key, "")).trim().toLowerCase();
    return v || (dflt || "");
}

/* A comma- or newline-separated cell, lower-cased for matching. */
function rlist(key) {
    return listOf(rcfg(key, "")).map(function (s) { return s.toLowerCase(); });
}

/* Trim a list to a sheet count. Blank cell → the whole list untouched. */
function rcap(arr, key) {
    if (!key) return arr;
    var raw = String(rcfg(key, "")).trim();
    if (!raw) return arr;
    var n = parseInt(raw.replace(/[^0-9]/g, ""), 10);
    return isNaN(n) ? arr : arr.slice(0, n);
}

/* ── The page ─────────────────────────────────────────────────────── */
function pageResume() {
    var reg = rzRegistry();
    var body = rzSequence(reg).map(function (k) { return reg[k](); })
        .filter(Boolean).join("");

    return '<article class="rz-page"' +
        ' data-rz-theme="' + esc(ropt("resumeTheme", "paper")) + '"' +
        ' data-rz-density="' + esc(ropt("resumeDensity", "comfortable")) + '"' +
        ' data-rz-rules="' + (ron("showSectionRules", "yes") ? "on" : "off") + '">' +
        rzStyle() +
        '<div class="rz-shell">' +
        rzBar() +
        '<div class="rz-doc" id="resume-sheet">' + body + rzFoot() + '</div>' +
        '</div></article>';
}

/* Sheet-driven theming. Injected as a <style> rather than inline attributes
   so one cell can restyle every block at once, and so the @page rule — which
   has nowhere else to live — can be written from the sheet too. */
function rzStyle() {
    var vars = {
        "--rz-accent": rcfg("resumeAccent", ""),
        "--rz-w": rzLen(rcfg("pageWidth", ""), "880px"),
        "--rz-label": rzLen(rcfg("labelWidth", ""), "150px"),
        "--rz-scale": String(rcfg("fontScale", "")).replace(/[^0-9.]/g, "")
    };

    var css = ".rz-doc{";
    Object.keys(vars).forEach(function (k) { if (vars[k]) css += k + ":" + vars[k] + ";"; });
    css += "}";

    var size = ropt("paperSize", "a4") === "letter" ? "letter" : "A4";
    var margin = rzLen(rcfg("pageMargin", ""), "13mm 14mm");
    css += "@media print{@page{size:" + size + ";margin:" + margin + ";}}";

    // Author CSS from the sheet, with tag-closing characters removed so a
    // stray "</style>" in a cell can't break out of the block.
    css += String(rcfg("resumeCss", "")).replace(/[<>]/g, "");

    return '<style id="rz-vars">' + css + '</style>';
}

/* A CSS length the sheet can write loosely — "880", "880px", "60ch", "13mm
   14mm" all work. Anything with characters that don't belong in a length is
   dropped in favour of the default rather than emitted into the stylesheet. */
function rzLen(v, dflt) {
    var s = String(v || "").trim();
    if (!s) return dflt;
    if (/^[0-9.]+$/.test(s)) return s + "px";
    return /^[0-9a-z.%\s]+$/i.test(s) ? s : dflt;
}

/* ── Block registry and ordering ──────────────────────────────────────
   The registry is rebuilt on every render because the 🗓 Experience sheet
   can invent blocks: any Type that isn't work-like or education-like
   becomes a block of its own, keyed by its own slug, so "Volunteering" in
   the sheet can be named in Section Order without touching this file. */
function rzRegistry() {
    var reg = {
        header: rzHeader,
        contact: rzContactBar,
        summary: rzSummaryBlock,
        stats: rzStatsBlock,
        experience: rzExperienceBlock,
        projects: rzProjectsBlock,
        skills: rzSkillsBlock,
        education: rzEducationBlock,
        extras: rzExtrasBlock
    };

    rzGroups().forEach(function (g) {
        if (g.key === "__work" || g.key === "__edu" || reg[g.key]) return;
        reg[g.key] = function () { return rzHistoryBlock(g); };
    });

    return reg;
}

function rzDefaultOrder(reg) {
    var custom = Object.keys(reg).filter(function (k) { return RZ_ORDER.indexOf(k) === -1; });
    var out = [];
    RZ_ORDER.forEach(function (k) {
        out.push(k);
        if (k === "experience") out = out.concat(custom);
    });
    return out;
}

function rzSequence(reg) {
    var named = listOf(rcfg("sectionOrder", "")).map(slugify).filter(Boolean);
    var out = [], seen = {};

    named.forEach(function (k) {
        if (reg[k] && !seen[k]) { seen[k] = 1; out.push(k); }
    });

    // Naming a few blocks normally means "these first, the rest after".
    // Strict Section Order turns it into "these only".
    if (named.length && ron("strictSectionOrder", "no")) return out;

    rzDefaultOrder(reg).forEach(function (k) {
        if (reg[k] && !seen[k]) { seen[k] = 1; out.push(k); }
    });
    return out;
}

/* ── Section shell ────────────────────────────────────────────────────
   Heading in the left rail, content in the reading column. Dropped whole
   when its body came back empty, so a switched-off sheet never leaves an
   orphan heading behind. */
function rzSec(key, title, body, cls) {
    if (!body) return "";
    return '<section class="rz-block rz-sec' + (cls ? ' ' + cls : '') + '" id="rz-' + esc(key) + '">' +
        (title ? '<div class="rz-sec-label"><h2>' + esc(title) + '</h2></div>' : '<div class="rz-sec-label"></div>') +
        '<div class="rz-sec-body">' + body + '</div>' +
        '</section>';
}

/* ── Control bar ──────────────────────────────────────────────────────
   Screen only — the print stylesheet drops it. Every button is optional. */
function rzBar() {
    if (!ron("showControlBar", "yes")) return "";

    var pdf = rcfg("pdfUrl", cfg("resumeUrl", ""));
    var acts = "";

    if (ron("showPdfButton", "yes") && pdf) {
        acts += '<a class="rz-btn" href="' + esc(pdf) + '" target="_blank" rel="noopener">' +
            '<i class="fa-solid fa-file-arrow-down"></i>' + esc(rcfg("pdfButtonLabel", "PDF")) + '</a>';
    }
    if (ron("showPrintButton", "yes")) {
        acts += '<button class="rz-btn" type="button" data-resume-print>' +
            '<i class="fa-solid fa-print"></i>' + esc(rcfg("printButtonLabel", "Print / Save as PDF")) + '</button>';
    }
    if (ron("showBackButton", "yes")) {
        acts += '<a class="rz-btn rz-btn-solid" href="' + esc(urlHome()) + '">' +
            '<i class="fa-solid fa-arrow-left"></i>' + esc(rcfg("backButtonLabel", "Back to site")) + '</a>';
    }

    var badge = ron("showUnlistedBadge", "yes")
        ? '<span class="rz-flag"><i class="fa-solid fa-lock"></i>' +
        esc(rcfg("unlistedBadgeText", "unlisted · not indexed")) + '</span>'
        : '';

    if (!badge && !acts) return "";
    return '<div class="rz-bar">' + badge + '<div class="rz-bar-acts">' + acts + '</div></div>';
}

/* ── Nameplate ────────────────────────────────────────────────────── */
function rzHeader() {
    if (!ron("showHeader", "yes")) return "";

    var name = rcfg("fullName", rcfg("aboutName", cfg("brandName", "Résumé")));
    var headline = ron("showHeadline", "yes")
        ? rcfg("headline", rcfg("aboutRole", cfg("role", ""))) : "";
    var tagline = ron("showTagline", "yes")
        ? rcfg("tagline", [cfg("role"), cfg("location")].filter(Boolean).join(" · ")) : "";

    var src = ron("showPhoto", "yes") ? rcfg("photoUrl", cfg("aboutImageUrl", "")) : "";
    var portrait = "";

    if (src) {
        // A dead image URL would otherwise print the alt text across the
        // portrait, so it degrades to initials the way avatars do elsewhere.
        portrait = '<img src="' + esc(resolveAsset(src)) + '" alt="' + esc(name) + '"' +
            ' onerror="this.outerHTML=\'<span class=&quot;rz-initials&quot;>' +
            esc(initials(name)) + '</span>\'">';
    } else if (ron("showPhoto", "yes") && ron("showInitials", "no")) {
        portrait = '<span class="rz-initials">' + esc(initials(name)) + '</span>';
    }

    if (!name && !headline && !tagline && !portrait) return "";

    return '<header class="rz-block rz-mast" data-align="' + esc(ropt("headerAlign", "left")) + '">' +
        (portrait ? '<div class="rz-portrait" data-shape="' +
            esc(ropt("photoShape", "circle")) + '">' + portrait + '</div>' : '') +
        '<div class="rz-mast-text">' +
        (ron("showName", "yes") && name ? '<h1 class="rz-name">' + esc(name) + '</h1>' : '') +
        (headline ? '<p class="rz-headline">' + markup(headline) + '</p>' : '') +
        (tagline ? '<p class="rz-tagline">' + esc(tagline) + '</p>' : '') +
        '</div></header>';
}

/* ── Contact rule ─────────────────────────────────────────────────────
   Each strand is individually switchable and individually overridable, and
   "Contact Order" decides the sequence. Social rows come from 🔗 Social
   Links and can be filtered to a named subset. */
function rzContactBar() {
    if (!ron("showContact", "yes")) return "";

    var items = rzContactItems();
    if (!items.length) return "";

    var icons = ron("contactIcons", "yes");
    var body = '<div class="rz-contact' + (icons ? '' : ' rz-no-icons') + '">' +
        items.map(function (it) {
            var inner = (icons ? '<i class="' + esc(it[0]) + '" aria-hidden="true"></i>' : '') +
                '<span>' + esc(it[1]) + '</span>';
            if (!it[2]) return '<span class="rz-c">' + inner + '</span>';
            return '<a class="rz-c" href="' + esc(it[2]) + '"' +
                (/^https?:/i.test(it[2]) ? ' target="_blank" rel="noopener"' : '') +
                (it[3] ? ' title="' + esc(it[3]) + '"' : '') + '>' + inner + '</a>';
        }).join("") + '</div>';

    var title = rcfg("contactTitle", "");
    return title ? rzSec("contact", title, body)
        : '<div class="rz-block rz-contactbar">' + body + '</div>';
}

function rzContactItems() {
    var full = ron("contactFullUrls", "no");

    var build = {
        location: function () {
            var v = rcfg("location", cfg("location", ""));
            return (ron("showLocation", "yes") && v)
                ? [["fa-solid fa-location-dot", v, "", ""]] : [];
        },
        email: function () {
            var v = rcfg("email", cfg("email", ""));
            return (ron("showEmail", "yes") && v)
                ? [["fa-solid fa-envelope", v, "mailto:" + v, ""]] : [];
        },
        phone: function () {
            var v = rcfg("phone", cfg("whatsappNumber", ""));
            return (ron("showPhone", "yes") && v)
                ? [["fa-solid fa-phone", v, "tel:" + String(v).replace(/[^\d+]/g, ""), ""]] : [];
        },
        website: function () {
            var v = rcfg("website", cfg("siteUrl", ""));
            return (ron("showWebsite", "yes") && v)
                ? [["fa-solid fa-globe", full ? v : rzHost(v), v, ""]] : [];
        },
        socials: function () {
            if (!ron("showSocials", "yes")) return [];

            var only = rlist("socialsInclude");
            var rows = SOCIAL.filter(function (s) { return on2(s.show) && s.url; });

            if (only.length) {
                rows = rows.filter(function (s) {
                    return only.indexOf(String(s.platform || "").toLowerCase()) > -1;
                });
            }
            rows = rcap(rows, "socialsCount");

            var byName = ron("socialLabels", "no");
            return rows.map(function (s) {
                var text = byName ? (s.platform || rzHost(s.url))
                    : (full ? s.url : rzHost(s.url));
                return [icon(s.icon, "fa-solid fa-link"), text, s.url, s.platform];
            });
        }
    };

    var order = rlist("contactOrder");
    if (!order.length) order = ["location", "email", "phone", "website", "socials"];

    var out = [];
    order.forEach(function (k) { if (build[k]) out = out.concat(build[k]()); });
    return out;
}

/* ── Summary ──────────────────────────────────────────────────────────
   A heading is optional: with "Summary Title" filled the paragraph becomes
   a labelled section like any other; left blank it reads as a lead. */
function rzSummaryBlock() {
    if (!ron("showSummary", "yes")) return "";

    var txt = rcfg("summary", cfg("aboutBody", ""));
    if (!txt) return "";

    var body = '<p class="rz-lead">' + markup(txt) + '</p>';
    var title = rcfg("summaryTitle", "");
    return title ? rzSec("summary", title, body)
        : '<div class="rz-block rz-leadwrap">' + body + '</div>';
}

/* ── Figures ──────────────────────────────────────────────────────────
   📊 Stats, printed as static figures — the animated counters used on the
   home page would land on a half-counted number inside a PDF. */
function rzStatsBlock() {
    if (!ron("showStats", "yes")) return "";

    var list = STATS.filter(function (s) { return on2(s.show) && s.value; });
    list = String(rcfg("statsCount", "")).trim() ? rcap(list, "statsCount") : list.slice(0, 4);
    if (!list.length) return "";

    var labels = ron("showStatLabels", "yes");
    var body = '<div class="rz-figs">' + list.map(function (s) {
        return '<span class="rz-fig"><b>' + esc(s.value) + '</b>' +
            (labels && s.label ? '<span>' + esc(s.label) + '</span>' : '') + '</span>';
    }).join("") + '</div>';

    var title = rcfg("statsTitle", "");
    return title ? rzSec("stats", title, body)
        : '<div class="rz-block rz-figrow">' + body + '</div>';
}

/* ── Dates ────────────────────────────────────────────────────────────
   The sheet writes dates however it likes — "2019", "Mar 2023", "Present".
   Both forms are parsed so a tenure can sit beside the range; anything
   unparseable shows no tenure rather than a wrong one. */
var RZ_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function rzDate(v) {
    var s = String(v || "").trim();
    if (!s) return null;

    var now = new Date();
    if (/^(present|current|now|ongoing|to date)$/i.test(s)) {
        return { y: now.getFullYear(), m: now.getMonth(), coarse: false };
    }

    var md = s.match(/^([A-Za-z]{3,})\.?\s+(\d{4})$/);
    if (md) {
        var mi = RZ_MONTHS.indexOf(md[1].slice(0, 3).toLowerCase());
        if (mi > -1) return { y: parseInt(md[2], 10), m: mi, coarse: false };
    }

    var yd = s.match(/^(\d{4})$/);
    if (yd) return { y: parseInt(yd[1], 10), m: 0, coarse: true };

    return null;
}

function rzSpan(start, end) {
    var a = rzDate(start), b = rzDate(end);
    if (!a || !b) return "";

    // A year-only start can't honestly claim months: "2026 – Present" would
    // otherwise read "8 mos" purely because January was assumed.
    if (a.coarse) {
        var yrs = b.y - a.y;
        return yrs >= 1 ? yrs + " yr" + (yrs > 1 ? "s" : "") : "";
    }

    var months = (b.y - a.y) * 12 + (b.m - a.m) + 1;
    if (months < 1) return "";

    var y = Math.floor(months / 12), m = months % 12, out = [];
    if (y) out.push(y + " yr" + (y > 1 ? "s" : ""));
    if (m) out.push(m + " mo" + (m > 1 ? "s" : ""));
    return out.join(" ");
}

/* ── Work history ─────────────────────────────────────────────────────
   🗓 Experience split on its Type column: work-like rows become the
   Experience block, education-like rows are peeled off for the Education
   block, and anything else keeps its own label and gets its own block. */
function rzGroups() {
    var order = [], byKey = {};

    EXP.filter(function (e) { return on2(e.show); }).forEach(function (e) {
        var raw = String(e.type || "").trim();
        var k = raw.toLowerCase();
        var key = (!raw || /^(work|job|employment|experience|career|freelance)/.test(k)) ? "__work"
            : /^(edu|study|academic|school|degree)/.test(k) ? "__edu"
                : (slugify(raw) || "__work");

        if (!byKey[key]) { byKey[key] = { key: key, label: raw, items: [] }; order.push(key); }
        byKey[key].items.push(e);
    });

    return order.map(function (k) { return byKey[k]; });
}

function rzFindGroup(key) {
    var found = null;
    rzGroups().forEach(function (g) { if (g.key === key) found = g; });
    return found;
}

function rzExperienceBlock() {
    if (!ron("showExperience", "yes")) return "";
    var g = rzFindGroup("__work");
    return g ? rzHistoryBlock(g) : "";
}

function rzHistoryBlock(g) {
    var work = g.key === "__work";
    var title = work ? rcfg("experienceTitle", "Experience") : (g.label || "Experience");
    var items = rcap(g.items, work ? "experienceCount" : "");
    if (!items.length) return "";

    return rzSec(work ? "experience" : g.key, title,
        '<div class="rz-entries">' + items.map(rzJob).join("") + '</div>');
}

function rzJob(e) {
    var showRole = ron("showExperienceRole", "yes");
    var showDates = ron("showExperienceDates", "yes");
    var showTenure = ron("showExperienceTenure", "yes");
    var showPlace = ron("showExperienceLocation", "yes");
    var showMeta = ron("showExperienceMeta", "yes");
    var showDesc = ron("showExperienceDescription", "yes");
    var showTags = ron("showExperienceTags", "yes");

    // The organisation reads as the entry's name; the role sits under it.
    // A row with no Organization falls back to its Title so nothing is lost.
    var org = e.org || e.title;
    var role = (e.org && showRole) ? e.title : "";

    var when = showDates ? [e.start, e.end].filter(Boolean).join(" – ") : "";
    var sub = [showTenure ? rzSpan(e.start, e.end) : "", showPlace ? (e.location || "") : ""]
        .filter(Boolean).join(" · ");

    var tags = showTags ? rcap(listOf(e.tags), "experienceTagsCount") : [];

    // Blanking a cell means "fall back" everywhere else, so dropping the
    // little "Stack" caption needs a switch of its own rather than an
    // empty label cell.
    var tagLabel = ron("showExperienceTagsLabel", "yes")
        ? rcfg("experienceTagsLabel", "Stack") : "";

    return '<article class="rz-entry">' +
        '<div class="rz-entry-top">' +
        '<div class="rz-entry-id">' +
        '<h3>' + esc(org) + '</h3>' +
        (role ? '<p class="rz-role">' + esc(role) + '</p>' : '') +
        '</div>' +
        ((when || sub) ? '<div class="rz-entry-when">' +
            (when ? '<span class="rz-dates">' + esc(when) + '</span>' : '') +
            (sub ? '<span class="rz-sub">' + esc(sub) + '</span>' : '') +
            '</div>' : '') +
        '</div>' +
        (showMeta && e.meta ? '<p class="rz-meta">' + esc(e.meta) + '</p>' : '') +
        (showDesc ? rzBullets(e.description, rcfg("experienceBullets", "")) : "") +
        (tags.length ? '<div class="rz-tagrow">' +
            (tagLabel ? '<span class="rz-taglabel">' + esc(tagLabel) + '</span>' : '') +
            tags.map(function (t) { return '<span class="rz-tag">' + esc(t) + '</span>'; }).join("") +
            '</div>' : '') +
        '</article>';
}

/* A description holding several lines reads as bullets; a single line stays
   a paragraph rather than a lone stranded bullet. "Experience Bullets" caps
   how many survive, which is the quickest lever for a one-page résumé. */
function rzBullets(text, limit) {
    var ls = lines(text);
    if (!ls.length) return "";

    var n = parseInt(String(limit).replace(/[^0-9]/g, ""), 10);
    if (!isNaN(n)) ls = ls.slice(0, n);
    if (!ls.length) return "";

    if (ls.length === 1 && !/^[-•·*]\s/.test(ls[0])) {
        return '<p class="rz-p">' + esc(ls[0]) + '</p>';
    }
    return '<ul class="rz-ul">' + ls.map(function (l) {
        return '<li>' + esc(l.replace(/^[-•·*]\s*/, "")) + '</li>';
    }).join("") + '</ul>';
}

/* ── Selected projects ────────────────────────────────────────────── */
function rzProjectsBlock() {
    if (!ron("showProjects", "yes")) return "";

    var all = PROJECTS.filter(function (p) { return on2(p.show) && p.title; });
    if (!all.length) return "";

    var list;
    if (ron("projectsFeaturedOnly", "no")) {
        list = all.filter(isFeatured);
    } else if (ron("projectsFeaturedFirst", "yes")) {
        list = all.filter(isFeatured)
            .concat(all.filter(function (p) { return !isFeatured(p); }));
    } else {
        list = all;
    }

    list = String(rcfg("projectsCount", "")).trim() ? rcap(list, "projectsCount") : list.slice(0, 4);
    if (!list.length) return "";

    var showMeta = ron("showProjectMeta", "yes");
    var showTags = ron("showProjectTags", "yes");
    var showSummary = ron("showProjectSummary", "yes");
    var showLink = ron("showProjectLink", "no");

    return rzSec("projects", rcfg("projectsTitle", "Selected Projects"),
        '<div class="rz-entries">' + list.map(function (p) {
            var tags = showTags ? rcap(listOf(p.tags), "projectTagsCount") : [];
            if (showTags && !String(rcfg("projectTagsCount", "")).trim()) tags = tags.slice(0, 6);

            var meta = showMeta ? [p.client, p.year].filter(Boolean).join(" · ") : "";
            var link = showLink ? (p.liveUrl || p.repoUrl || "") : "";

            return '<article class="rz-entry rz-project">' +
                '<div class="rz-entry-top">' +
                '<div class="rz-entry-id"><h3>' + esc(p.title) + '</h3>' +
                (tags.length ? '<p class="rz-stackline">' + esc(tags.join(" · ")) + '</p>' : '') +
                '</div>' +
                (meta ? '<div class="rz-entry-when"><span class="rz-dates">' + esc(meta) + '</span></div>' : '') +
                '</div>' +
                (showSummary && p.summary ? '<p class="rz-p">' + esc(p.summary) + '</p>' : '') +
                (link ? '<p class="rz-link"><a href="' + esc(link) + '" target="_blank" rel="noopener">' +
                    esc(rzHost(link)) + '</a></p>' : '') +
                '</article>';
        }).join("") + '</div>');
}

/* ── Technical expertise ──────────────────────────────────────────────
   🧠 Skills categories become labelled rows; 🧰 Tools joins them as a final
   row so the whole stack reads in one block. "Skills Style" swaps the chips
   for a plain comma list, which is denser and prints smaller. */
function rzSkillsBlock() {
    if (!ron("showSkills", "yes")) return "";

    var rows = SKILLS.filter(function (s) { return on2(s.show) && s.category; })
        .map(function (s) { return { label: s.category, items: listOf(s.items) }; });
    rows = rcap(rows, "skillsCount");

    if (ron("showTools", "yes")) {
        var tools = rcap(TOOLS.filter(function (t) { return on2(t.show) && t.name; })
            .map(function (t) { return t.name; }), "toolsCount");
        if (tools.length) rows.push({ label: rcfg("toolsLabel", "Tools & Platforms"), items: tools });
    }

    rows = rows.filter(function (r) { return r.items.length; });
    if (!rows.length) return "";

    var plain = ropt("skillsStyle", "tags") === "text";
    var showLabels = ron("showSkillLabels", "yes");

    return rzSec("skills", rcfg("skillsTitle", "Technical Expertise"),
        '<div class="rz-skills' + (plain ? ' rz-skills-text' : '') + '">' + rows.map(function (r) {
            var items = plain
                ? '<p class="rz-skill-list">' + esc(r.items.join(" · ")) + '</p>'
                : '<div class="rz-tagrow">' + r.items.map(function (i) {
                    return '<span class="rz-tag">' + esc(i) + '</span>';
                }).join("") + '</div>';

            return '<div class="rz-skill-row">' +
                (showLabels ? '<h4>' + esc(r.label) + '</h4>' : '') + items + '</div>';
        }).join("") + '</div>');
}

/* ── Education ────────────────────────────────────────────────────────
   Résumés normally list the degree, not an essay about it, so descriptions
   are off by default — "Education Detail: Yes" brings them back. */
function rzEducationBlock() {
    if (!ron("showEducation", "yes")) return "";

    var g = rzFindGroup("__edu");
    if (!g) return "";

    var items = rcap(g.items, "educationCount");
    if (!items.length) return "";

    var detail = ron("educationDetail", "no");
    var showOrg = ron("showEducationOrg", "yes");
    var showDates = ron("showEducationDates", "yes");
    var showPlace = ron("showEducationLocation", "yes");
    var showMeta = ron("showEducationMeta", "yes");

    return rzSec("education", rcfg("educationTitle", "Education"),
        '<div class="rz-entries rz-edu">' + items.map(function (e) {
            var when = showDates ? [e.start, e.end].filter(Boolean).join(" – ") : "";
            var line = [showOrg ? e.org : "", showPlace ? e.location : ""].filter(Boolean).join(" · ");

            return '<article class="rz-entry">' +
                '<div class="rz-entry-top">' +
                '<div class="rz-entry-id"><h3>' + esc(e.title) +
                (showMeta && e.meta ? '<span class="rz-badge">' + esc(e.meta) + '</span>' : '') + '</h3>' +
                (line ? '<p class="rz-role">' + esc(line) + '</p>' : '') +
                '</div>' +
                (when ? '<div class="rz-entry-when"><span class="rz-dates">' + esc(when) + '</span></div>' : '') +
                '</div>' +
                (detail && e.description ? '<p class="rz-p">' + esc(lines(e.description).join(" ")) + '</p>' : '') +
                '</article>';
        }).join("") + '</div>');
}

/* ── 🏅 Resume Extras ─────────────────────────────────────────────────
   Whatever the sheet groups together becomes a block. "Extras Style" picks
   between one section holding every group as a column ("grouped", the
   default) and a separate labelled section per group ("sections"). */
function rzExtrasBlock() {
    if (!ron("showExtras", "yes")) return "";

    var only = rlist("extrasGroups");
    var order = [], byGroup = {};

    RXTRA.filter(function (r) { return on2(r.show) && r.item; }).forEach(function (r) {
        var g = String(r.group || "Highlights").trim();
        if (only.length && only.indexOf(g.toLowerCase()) === -1) return;
        if (!byGroup[g]) { byGroup[g] = []; order.push(g); }
        byGroup[g].push(r);
    });

    order = rcap(order, "extrasCount");
    if (!order.length) return "";

    var showDetail = ron("showExtraDetails", "yes");

    function list(g) {
        return '<ul class="rz-ul rz-plain">' + rcap(byGroup[g], "extrasItemsCount").map(function (r) {
            var label = r.link
                ? '<a href="' + esc(r.link) + '" target="_blank" rel="noopener">' + esc(r.item) + '</a>'
                : esc(r.item);
            return '<li>' + label +
                (showDetail && r.detail ? '<span class="rz-detail">' + esc(r.detail) + '</span>' : '') +
                '</li>';
        }).join("") + '</ul>';
    }

    if (ropt("extrasStyle", "grouped") === "sections") {
        return order.map(function (g) {
            return rzSec(slugify(g) || "extra", g, list(g));
        }).join("");
    }

    var cols = rnum("extrasColumns", 2);
    var body = '<div class="rz-extras" style="--rz-cols:' + (cols > 0 ? cols : 1) + '">' +
        order.map(function (g) {
            return '<div class="rz-extra"><h4>' + esc(g) + '</h4>' + list(g) + '</div>';
        }).join("") + '</div>';

    return rzSec("extras", rcfg("extrasTitle", "Additional"), body);
}

/* ── Footer ───────────────────────────────────────────────────────── */
function rzFoot() {
    if (!ron("showFooter", "yes")) return "";

    var note = rcfg("availabilityNote", cfg("availabilityStatus", ""));
    var mail = rcfg("email", cfg("email", ""));
    var updated = ron("showUpdated", "yes") ? rcfg("updated", "") : "";
    var link = (ron("showContactLink", "yes") && mail)
        ? '<a href="mailto:' + esc(mail) + '">' + esc(rcfg("contactLinkLabel", "Let\u2019s connect")) + '</a>'
        : "";

    var left = [note ? esc(note) : "", link].filter(Boolean).join(" · ");
    if (!left && !updated) return "";

    return '<footer class="rz-foot">' +
        '<span>' + left + '</span>' +
        (updated ? '<span class="rz-updated">' +
            esc(rcfg("updatedLabel", "Updated")) + ' ' + esc(updated) + '</span>' : '') +
        '</footer>';
}

/* A printed résumé reads better as "github.com/name" than as a full URL. */
function rzHost(url) {
    return String(url || "").replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

function crumbs(items) {
    return '<nav class="crumbs" aria-label="Breadcrumb">' + items.map(function (it, i) {
        var sep = i ? '<i class="fa-solid fa-angle-right"></i>' : '';
        return sep + (it[1]
            ? '<a href="' + esc(it[1]) + '" data-route>' + esc(it[0]) + '</a>'
            : '<span aria-current="page">' + esc(it[0]) + '</span>');
    }).join("") + '</nav>';
}

/* ── TESTIMONIALS ─────────────────────────────────────────────────────── */
// function tstHTML(n) {
//     var list = TSTS.filter(function (t) { return on2(t.show); });
//     if (!list.length) return "";

//     var cards = list.map(function (t, i) {
//         var r = Math.max(0, Math.min(5, Number(t.rating) || 5));
//         return '<article class="card tst" data-reveal style="--d:' + (i % 3 * 90) + 'ms">' +
//             '<span class="quote-mark">&ldquo;</span>' +
//             '<blockquote>' + esc(t.quote) + '</blockquote>' +
//             '<div class="tst-foot">' + avatar(t.avatar, t.name) +
//             '<div class="tst-who"><b>' + esc(t.name) + '</b><span>' + esc(t.role || t.project || "") + '</span></div>' +
//             starsHTML(r) +
//             '</div></article>';
//     }).join("");

//     return '<section id="testimonials" class="section"><div class="shell">' +
//         secHead("testimonials", n, true) +
//         '<div class="tst-grid">' + cards + '</div></div></section>';
// }


/* ── TESTIMONIALS ─────────────────────────────────────────────────────── */
/* Rating stars. Uses the same fa-solid fa-star proj-star icon as the
   Featured marker on a project card; .stars neutralises the absolute
   positioning that class carries there. */
function starsHTML(rating) {
    var r = Math.max(0, Math.min(5, Number(rating) || 0));
    var out = "";
    for (var i = 0; i < r; i++) out += '<i class="fa-solid fa-star proj-star"></i>';
    return '<span class="stars" aria-label="' + r + ' out of 5">' + out + '</span>';
}

/* ── TESTIMONIALS ─────────────────────────────────────────────────────── */
// Helper function to format role text - only last comma separated part goes to new line
function formatRole(text) {
    if (!text) return '';
    var parts = text.split(',').map(function (s) { return s.trim(); });
    if (parts.length <= 1) {
        return '<span class="role-part">' + esc(text) + '</span>';
    }
    // Last part (country) goes on new line
    var lastPart = parts.pop();
    var firstParts = parts.join(', ');
    return '<span class="role-part">' + esc(firstParts) + '</span>' +
        '<span class="role-part role-country">' + esc(lastPart) + '</span>';
}

function tstHTML(n) {
    var list = TSTS.filter(function (t) { return on2(t.show); });
    if (!list.length) return "";

    // One copy: translateX(-50%) then lands on a list boundary (3 broke the seam)
    var allCards = list.concat(list);

    var cards = allCards.map(function (t, i) {
        var r = Math.max(0, Math.min(5, Number(t.rating) || 5));
        /* No data-reveal here on purpose — see the note above the track. */
        return '<article class="card tst">' +
            starsHTML(r) +
            '<blockquote>' + esc(t.quote) + '</blockquote>' +
            '<div class="tst-foot">' + avatar(t.avatar, t.name) +
            '<div class="tst-who"><b>' + esc(t.name) + '</b>' +
            (t.role || t.project ? formatRole(t.role || t.project) : '') +
            '</div></div></article>';
    }).join("");

    // Check if motion preference is reduced
    var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var scrollClass = prefersReduced ? 'tst-grid' : 'tst-scroll-container';
    var trackClass = prefersReduced ? '' : 'tst-scroll-track';

    // If reduced motion, show as grid instead
    if (prefersReduced) {
        return '<section id="testimonials" class="section"><div class="shell">' +
            secHead("testimonials", n, true) +
            '<div class="tst-grid">' +
            list.map(function (t, i) {
                var r = Math.max(0, Math.min(5, Number(t.rating) || 5));
                return '<article class="card tst" data-reveal style="--d:' + (i * 70) + 'ms">' +
                    starsHTML(r) +
                    '<blockquote>' + esc(t.quote) + '</blockquote>' +
                    '<div class="tst-foot">' + avatar(t.avatar, t.name) +
                    '<div class="tst-who"><b>' + esc(t.name) + '</b>' +
                    (t.role || t.project ? formatRole(t.role || t.project) : '') +
                    '</div></div></article>';
            }).join("") +
            '</div></div></section>';
    }

    /* FULL WIDTH — no shell wrapper.
       The ribbon itself is the revealed element rather than the cards
       inside it: the track is wider than the viewport, so a per-card
       observer would only ever fire for the two or three cards that
       happen to start on screen and leave the rest invisible as they
       scroll past. */
    return '<section id="testimonials" class="section">' +
        '<div class="shell">' +
        secHead("testimonials", n, true) +
        '</div>' +
        '<div class="' + scrollClass + '" data-reveal style="--d:120ms">' +
        '<div class="' + trackClass + '">' + cards + '</div>' +
        '</div>' +
        '</section>';
}

// Helper function to generate stars with filled and regular
function starsHTML(rating) {
    var filled = Math.floor(rating);
    var hasHalf = (rating - filled) >= 0.5;
    var total = 5;
    var html = '<div class="stars">';

    // Filled stars
    for (var i = 0; i < filled; i++) {
        html += '<i class="fa-solid fa-star"></i>';
    }

    // Half star if needed
    if (hasHalf) {
        html += '<i class="fa-solid fa-star-half-alt"></i>';
        filled++; // increment so we don't add extra regular star
    }

    // Regular (empty) stars
    for (var i = filled; i < total; i++) {
        html += '<i class="fa-regular fa-star"></i>';
    }

    html += '</div>';
    return html;
}

/* ── SERVICES ─────────────────────────────────────────────────────────── */
function svcHTML(n) {
    var list = SVCS.filter(function (s) { return on2(s.show); });
    if (!list.length) return "";

    var cards = list.map(function (s, i) {
        var bl = lines(s.bullets).map(function (b) {
            return '<li><i class="fa-solid fa-check"></i><span>' + esc(b) + '</span></li>';
        }).join("");
        return '<article class="card svc" style="--i:' + i + '">' +
            '<span class="svc-num">' + (i < 9 ? "0" : "") + (i + 1) + '</span>' +
            '<div class="svc-ico"><i class="' + esc(icon(s.icon, "fa-solid fa-gear")) + '"></i></div>' +
            '<h3>' + esc(s.title) + '</h3>' +
            '<p>' + esc(s.description) + '</p>' +
            (bl ? '<ul>' + bl + '</ul>' : '') +
            (s.price || s.buttonText ? '<div class="svc-foot">' +
                (s.price ? '<span class="svc-price">' + esc(s.price) + '</span>' : '<span></span>') +
                '<a class="btn btn-accent btn-sm" href="' + esc(s.buttonLink || "#contact") + '">' +
                esc(s.buttonText || "Enquire") + '</a></div>' : '') +
            '</article>';
    }).join("");

    return '<section id="services" class="section"><div class="shell">' +
        secHead("services", n, true) +
        '<div class="svc-grid">' + cards + '</div></div></section>';
}

/* ── EXPERIENCE ───────────────────────────────────────────────────────── */
function expHTML(n) {
    var list = EXP.filter(function (e) { return on2(e.show); });
    if (!list.length) return "";

    var items = list.map(function (e, i) {
        var when = [e.start, e.end].filter(Boolean).join(" — ");
        return '<div class="tl-item" data-reveal style="--d:' + (i * 70) + 'ms">' +
            (when ? '<span class="tl-when">' + esc(when) + (e.type ? ' · ' + esc(e.type) : '') + '</span>' : '') +
            '<h3>' + esc(e.title) + '</h3>' +
            '<div class="tl-org">' + esc([e.org, e.location].filter(Boolean).join(" · ")) + '</div>' +
            (e.description ? '<p>' + esc(e.description) + '</p>' : '') +
            '</div>';
    }).join("");

    return '<section id="experience" class="section"><div class="shell">' +
        secHead("experience", n) +
        '<div class="tl">' + items + '</div></div></section>';
}

/* ── FAQ ──────────────────────────────────────────────────────────────── */
function faqHTML(n) {
    var list = FAQS.filter(function (f) { return on2(f.show); });
    if (!list.length) return "";

    var items = list.map(function (f, i) {
        return '<div class="faq-item" style="--i:' + i + '">' +
            '<button class="faq-q" aria-expanded="false"><span class="qn">' + pad(i + 1) + '</span>' +
            '<span>' + esc(f.question) + '</span><i class="fa-solid fa-chevron-down chev"></i></button>' +
            '<div class="faq-a"><p>' + esc(f.answer) + '</p></div></div>';
    }).join("");

    return '<section id="faq" class="section"><div class="shell">' +
        secHead("faq", n, true) +
        '<div class="faq-wrap">' + items + '</div>' +
        '<div class="faq-cta" data-reveal><h3>Still have questions?</h3>' +
        '<p>Happy to answer anything specific about your project.</p>' +
        '<a class="btn btn-accent" href="#contact">Ask me anything<i class="fa-solid fa-arrow-right"></i></a>' +
        '</div></div></section>';
}

/* ── CONTACT ──────────────────────────────────────────────────────────── */
function contactHTML(n) {
    var linesHtml = "";
    function line(icn, k, v, href) {
        if (!v) return "";
        var inner = '<i class="' + icn + '"></i><span><span class="k">' + k + '</span>' +
            '<span class="v">' + esc(v) + '</span></span>';
        return href
            ? '<a class="contact-line" href="' + esc(href) + '" target="_blank" rel="noopener">' + inner + '</a>'
            : '<div class="contact-line">' + inner + '</div>';
    }

    var wa = String(cfg("whatsAppNumber", "")).replace(/[^\d]/g, "");
    linesHtml += line("fa-solid fa-envelope", "Email", cfg("email"), cfg("email") ? "mailto:" + cfg("email") : "");
    linesHtml += line("fa-brands fa-whatsapp", "WhatsApp", cfg("whatsAppNumber"), wa ? "https://wa.me/" + wa : "");
    linesHtml += line("fa-solid fa-location-dot", "Based in", cfg("location"));
    linesHtml += line("fa-solid fa-calendar-check", "Book a call", cfg("bookingLabel", "Schedule a slot"), cfg("bookingUrl"));

    var why = lines(cfg("whyList")).map(function (w) {
        return '<li><i class="fa-solid fa-circle-check"></i><span>' + esc(w) + '</span></li>';
    }).join("");

    function sel(id, label, key, required) {
        var opts = (FORMOPTS[key] || []).map(function (o) {
            return '<option value="' + esc(o) + '">' + esc(o) + '</option>';
        }).join("");
        if (!opts) return "";
        return '<div class="field"><label for="' + id + '">' + label +
            (required ? ' <span class="req">*</span>' : '') + '</label>' +
            '<select id="' + id + '"' + (required ? ' required' : '') + '>' +
            '<option value="">Select…</option>' + opts + '</select></div>';
    }

    return '<section id="contact" class="section"><div class="shell">' +
        secHead("contact", n) +
        '<div class="contact-grid">' +
        '<div class="contact-info" data-reveal>' +
        (cfg("contactHeading") ? '<h3>' + markup(cfg("contactHeading")) + '</h3>' : '') +
        (cfg("contactBody") ? '<p>' + esc(cfg("contactBody")) + '</p>' : '') +
        '<div class="contact-lines">' + linesHtml + '</div>' +
        (why ? '<div><span class="mono-label" style="margin-bottom:.8rem">Why work with me</span>' +
            '<ul class="why-list">' + why + '</ul></div>' : '') +
        // '<div class="social-row">' + socialHTML(false) + '</div>' +
        '</div>' +

        '<form class="form-card" id="contact-form" data-reveal style="--d:120ms" novalidate>' +
        '<div class="form-row">' +
        '<div class="field"><label for="f-name">Name <span class="req">*</span></label>' +
        '<input id="f-name" type="text" placeholder="Your name" required></div>' +
        '<div class="field"><label for="f-email">Email <span class="req">*</span></label>' +
        '<input id="f-email" type="email" placeholder="you@company.com" required></div>' +
        '</div>' +
        sel("f-type", "Project type", "projectType", true) +
        '<div class="form-row">' +
        sel("f-timeline", "Timeline", "timeline") +
        sel("f-budget", "Budget", "budget") +
        '</div>' +
        '<div class="field"><label for="f-msg">Message <span class="req">*</span></label>' +
        '<textarea id="f-msg" placeholder="What does the task look like today — what do you open, click and copy?" required></textarea></div>' +
        '<button type="submit" class="btn btn-accent btn-block" id="f-submit">' +
        'Send message<i class="fa-solid fa-arrow-right"></i></button>' +
        '<div class="form-note"><i class="fa-solid fa-shield-halved"></i>' +
        esc(cfg("responseNote", "I reply within 24 hours.")) + '</div>' +
        '</form>' +

        '</div></div></section>';
}

/* ── FOOTER ───────────────────────────────────────────────────────────── */
function renderFooter() {
    $("#site-footer").innerHTML = '<div class="shell">' +
        '<div class="foot-top">' +
        '<div class="foot-brand"><span class="fb-name">' + esc(cfg("brandName")) + '</span>' +
        '<span class="fb-tag">' + esc(cfg("footerTagline")) + '</span></div>' +
        '<div class="social-row">' + socialHTML(false) + '</div>' +
        '</div>' +
        '<div class="foot-bot">' +
        '<span>' + esc(cfg("copyrightText")) + '</span></div></div>';
}

/* ==========================================================================
   INTERACTION LAYER
   ========================================================================== */
/* Observers are per-page. Anything still watching the previous page's DOM is
   torn down before the new page wires itself up. */
var OBSERVERS = [];

function watch(io) { OBSERVERS.push(io); return io; }

function resetObservers() {
    OBSERVERS.forEach(function (o) { try { o.disconnect(); } catch (e) { } });
    OBSERVERS = [];
    REVEAL_IO = null;
}

/* deferReveal is used on first paint only: the preloader fires revealer()
   itself as the curtain lifts. Route changes call initUI() bare. */
function initUI(deferReveal) {
    resetObservers();
    initSmoothScroll();
    if (!deferReveal) revealer();
    counters();
    meters();
    scrollSpy();
    wireFaq();
    wireForm();
    warmThumbs();
    termType();
    staggerize();
    aboutParallax();
}

/* ── About parallax ───────────────────────────────────────────────────
   The portrait drifts a little against the story as the block passes, so
   the two columns do not read as one flat card. Deliberately small — the
   whole travel is 46px — and driven off the existing scroll listener
   rather than its own, since onScroll already runs on every frame that
   matters. Skipped entirely for reduced motion, for coarse pointers (the
   columns are stacked there, so there is nothing to drift against) and
   when the element is off screen. */
var AX_EL = null, AX_RANGE = 0;

function aboutParallax() {
    AX_EL = null;
    if (window.matchMedia && (
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        !window.matchMedia("(min-width: 1021px)").matches)) return;

    var el = $(".ax-frame");
    if (!el) return;
    AX_EL = el;
    AX_RANGE = 46;
    axFrame();
}

function axFrame() {
    if (!AX_EL) return;
    var r = AX_EL.getBoundingClientRect();
    if (r.bottom < -200 || r.top > window.innerHeight + 200) return;

    // -1 entering from the bottom, 0 centred, 1 leaving at the top.
    var mid = (r.top + r.height / 2 - window.innerHeight / 2) / (window.innerHeight / 2 + r.height / 2);
    AX_EL.style.setProperty("--ax-shift", (Math.max(-1, Math.min(1, mid)) * AX_RANGE).toFixed(1) + "px");
}

/* ── Stagger ──────────────────────────────────────────────────────────
   Any grid of siblings that all carry [data-reveal] reads badly when they
   fade in together — it looks like a repaint, not an entrance. This walks
   each group and hands out an increasing --d, capped so a long list never
   leaves the last card waiting. Anything that already declares its own --d
   (the hero, the stat strip) is left alone. */
function staggerize() {
    var groups = [];
    $$("[data-reveal]").forEach(function (el) {
        var parent = el.parentNode;
        if (!parent || groups.indexOf(parent) > -1) return;
        groups.push(parent);
    });

    groups.forEach(function (parent) {
        var kids = $$(":scope > [data-reveal]", parent);
        if (kids.length < 2) return;
        kids.forEach(function (el, i) {
            if (el.style.getPropertyValue("--d")) return;
            el.style.setProperty("--d", Math.min(i * 65, 420) + "ms");
        });
    });
}

/* ── Terminal typewriter ──────────────────────────────────────────────
   The last "$ …" line is typed character by character with a smooth
   cursor. Once the line is complete the caret keeps blinking for a beat,
   holds ~4s, then the whole line is cleared and typed again — forever. */
var TERM = { timer: 0, hold: 0 };

function termType() {
    if (TERM.timer) { clearTimeout(TERM.timer); TERM.timer = 0; }
    if (TERM.hold) { clearTimeout(TERM.hold); TERM.hold = 0; }

    var line = $(".term-typed");
    if (!line) return;
    var inner = line.querySelector(".term-type-inner");
    if (!inner) return;
    inner.textContent = "";
    inner.classList.remove("is-typing");
    line.classList.remove("was-typed");

    /* read the live config string so the loop handles edited lines too */
    var tl = lines(cfg("terminalLines"));
    var raw = tl.length ? tl[tl.length - 1] : "hello";
    var m = raw.match(/^\$\s*(.*)$/);
    var text = (m ? m[1] : raw) || "";

    var i = 0;
    var speed = 55;

    function tick() {
        if (i < text.length) {
            inner.textContent = text.slice(0, ++i);
            TERM.timer = setTimeout(tick, speed + Math.random() * 45);
        } else {
            inner.classList.add("is-typing");
            line.classList.add("was-typed");
            TERM.hold = setTimeout(termType, 4000); // hold then loop
        }
    }
    TERM.timer = setTimeout(tick, 120);
}

/* ── Thumbnail warm-up ─────────────────────────────────────────────────
   A card's first :hover promotes its image to a composited layer at the
   zoomed scale, and if the bitmap is not decoded yet that decode + GPU
   upload happens synchronously on the interaction — measured as a ~150ms
   freeze on hover, and as a stall when several cards scroll into view at
   once. Decoding them ahead of time (while the browser is idle) moves the
   cost off the moment the user is actually watching. */
function warmThumbs() {
    var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 300); };
    idle(function () {
        $$(".proj-thumb img").forEach(function (img) {
            var go = function () { var p = img.decode && img.decode(); if (p && p.catch) p.catch(function () { }); };
            if (img.complete) go();
            else img.addEventListener("load", go, { once: true });
        });
    });
}

/* ── Smooth scrolling (Lenis) ─────────────────────────────── */
/* Scoped deliberately tightly:
     • only the window scroller is virtualised
     • anything marked [data-lenis-prevent] (project panel, drawer) keeps
       its own native scrolling
     • Lenis is stopped outright while an overlay is open
     • the native "scroll" event still fires, so the progress bar, sticky
       header, scroll-spy and every IntersectionObserver are untouched
     • skipped entirely for prefers-reduced-motion, or Smooth Scroll: No  */

function initSmoothScroll(attempt) {
    if (LENIS) return;
    if (!on("smoothScroll", "yes")) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // The CDN may still be in flight if the sheet responded from cache.
    if (typeof Lenis === "undefined") {
        var n = attempt || 0;
        if (n < 20) setTimeout(function () { initSmoothScroll(n + 1); }, 100);
        return;
    }

    var dur = parseFloat(cfg("smoothScrollDuration", 1.1));
    if (isNaN(dur) || dur <= 0) dur = 1.1;

    LENIS = new Lenis({
        duration: dur,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true,
        wheelMultiplier: 1.25, // each wheel notch travels ~25% further — snappier feel
        syncTouch: false,      // leave native momentum alone on touch devices
        touchMultiplier: 1.6,
        prevent: function (node) {
            return !!(node && node.hasAttribute && node.hasAttribute("data-lenis-prevent"));
        }
    });

    function frame(time) {
        LENIS.raf(time);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

/* One place that knows how to freeze the page behind an overlay. */
function scrollLock(locked) {
    document.body.classList.toggle("locked", !!locked);
    if (!LENIS) return;
    if (locked) LENIS.stop(); else LENIS.start();
}

/* The header is fixed and shrinks from its at-top height to a condensed
   "stuck" height once scrolled. After a nav jump we always come to rest in
   the stuck state, so offset from that height (plus a small 4px breathing
   gap) — that keeps each section tucked right under the nav bar. Reading the
   live height keeps it correct at any viewport/breakpoint. */
function headerOffset() {
    var h = $("#site-header");
    if (!h) return 64;
    var stuck = h.classList.contains("stuck");
    if (!stuck) h.classList.add("stuck");   // force the resting-state height
    var ht = h.offsetHeight;
    if (!stuck) h.classList.remove("stuck");
    return ht + 20;
}

/* Resolve the destination to an absolute pixel value from the real scroll
   position rather than letting Lenis resolve the element itself — that keeps
   it correct even if something else moved the page mid-flight. */
function scrollToEl(target) {
    if (!target) return;
    var top = function () {
        /* A section's own top padding (--sec-y) is empty space; scroll past it
           so the section's actual content — not its padding — sits under the
           nav bar. */
        var padTop = parseFloat(getComputedStyle(target).paddingTop) || 0;
        return Math.max(0, target.getBoundingClientRect().top +
            (window.scrollY || window.pageYOffset) - headerOffset() + padTop);
    };

    if (LENIS) {
        // Late layout changes (images landing on a first visit) can leave the
        // cached limit stale; re-measure so the target isn't clamped.
        LENIS.resize();
        var y = top();
        LENIS.scrollTo(y, {
            duration: 0.9,   // anchor flights arrive quicker than wheel glides
            force: true,
            lock: true,      // a stray wheel tick mid-flight must not abort the trip
            onComplete: function () {
                /* Anything that reflowed while we were flying (images finishing
                   load, an accordion above, …) leaves the section slightly off.
                   Ease the residual over instead of an instant snap, so the
                   landing still feels like one continuous smooth glide. */
                var now = top();
                if (Math.abs(now - y) > 2) {
                    LENIS.scrollTo(now, { duration: 0.5, force: true, lock: true });
                }
            }
        });
    } else {
        /* No Lenis — either Smooth Scroll is No in ⚙ Config, the CDN did not
           answer, or the visitor asked for reduced motion. `y` is declared
           inside the branch above, so this used to pass `top: undefined` and
           silently do nothing: every anchor and every /about#skills style
           link just sat there. Call the measurement instead. */
        window.scrollTo({ top: top(), behavior: "smooth" });
    }
}

function scrollToTop() {
    if (LENIS) LENIS.scrollTo(0, { duration: 0.9, force: true, lock: true });
    else window.scrollTo({ top: 0, behavior: "smooth" });
}


/* ── Scroll reveal ───────────────────────────────────────────────────── */
var REVEAL_IO = null;
/* Two things are going on here, and which one a visitor sees depends on
   their browser.

   Where scroll-driven animations exist, the blur is scroll-linked: an
   element is genuinely out of focus as it comes up from the bottom of the
   viewport and sharpens as it rises, tied to scroll position rather than
   to a clock. That is done entirely in CSS (see motion.css) — no work
   per frame, no listener, and it tracks a fling or a trackpad scrub
   exactly.

   This observer is still the safety net for both cases. It adds .in once
   an element is properly on screen, and .in is the sharp, settled state
   with no animation attached. That matters for the last block on the
   page: a scroll-linked range can only complete if there is enough page
   left to scroll, so without this pin the footer-most section could sit
   permanently soft. It is also the whole effect on browsers without
   animation-timeline, which fall back to the transition.

   The margin is deliberately deep — the element has to be a quarter of
   the way up the viewport before it is pinned, which leaves the blur
   room to actually be seen resolving. */
function revealer() {
    if (!("IntersectionObserver" in window)) {
        $$("[data-reveal]").forEach(function (el) { el.classList.add("in"); });
        return;
    }
    if (!REVEAL_IO) {
        REVEAL_IO = watch(new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) {
                    en.target.classList.add("in");
                    REVEAL_IO.unobserve(en.target);
                }
            });
        }, { rootMargin: "0px 0px -25% 0px", threshold: .01 }));
    }
    $$("[data-reveal]:not(.in)").forEach(function (el) { REVEAL_IO.observe(el); });
}

/* ── Animated stat counters ──────────────────────────────────────────── */
function counters() {
    if (!("IntersectionObserver" in window)) return;

    var io = watch(new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            io.unobserve(en.target);

            var el = en.target;
            var raw = String(el.getAttribute("data-count") || "");
            var num = parseFloat(raw.replace(/[^0-9.]/g, ""));
            if (isNaN(num)) return;

            // Keep whatever decoration the sheet used (<, +, %, k, h …)
            var pre = raw.slice(0, raw.search(/[0-9]/));
            var post = raw.slice(raw.search(/[0-9]/)).replace(/^[0-9.,]+/, "");
            var dec = (raw.split(".")[1] || "").replace(/[^0-9]/g, "").length;
            var start = performance.now(), dur = 1400;

            function tick(now) {
                var t = Math.min(1, (now - start) / dur);
                var eased = 1 - Math.pow(1 - t, 3);
                var v = num * eased;
                el.textContent = pre + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-US")) + post;
                if (t < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        });
    }, { threshold: .5 }));

    $$("[data-count]").forEach(function (el) { io.observe(el); });
}

/* ── Skill meters ────────────────────────────────────────────────────── */
function meters() {
    if (!("IntersectionObserver" in window)) return;
    var io = watch(new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            io.unobserve(en.target);
            en.target.style.width = Math.max(0, Math.min(100, Number(en.target.getAttribute("data-level")))) + "%";
        });
    }, { threshold: .4 }));
    $$("[data-level]").forEach(function (el) { io.observe(el); });
}

/* ── Active nav link ─────────────────────────────────────────────────── */
function scrollSpy() {
    // Only the home page has sections to spy on; elsewhere the Projects link
    // is highlighted by markActiveNav() instead.
    if (ROUTE.name !== "home") return;

    var sections = $$("main section[id]");
    if (!sections.length || !("IntersectionObserver" in window)) return;

    var io = watch(new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            var id = "#" + en.target.id;
            $$("#nav-links a").forEach(function (a) {
                a.classList.toggle("active", a.getAttribute("href") === id);
            });
        });
    }, { rootMargin: "-45% 0px -50% 0px" }));

    sections.forEach(function (s) { io.observe(s); });
}

/* ── Header, progress bar, back-to-top ───────────────────────────────── */
var TT_C = 2 * Math.PI * 19;            // ring circumference (matches the SVG)
var ttFill = document.getElementById("tt-fill");
var HDR_LAST = 0;                       // last scroll position, for direction
var HDR_LAST_DIR = 0;                   // 1 = down, -1 = up, 0 = unknown
var HDR_TICKS = 0;                      // consecutive samples in the same direction

function onScroll() {
    if (AX_EL) axFrame();

    var y = window.scrollY || document.documentElement.scrollTop;
    var h = document.getElementById("site-header");
    var stuck = y > 24;
    h.classList.toggle("stuck", stuck);

    /* Slide the bar away while scrolling down (content is being read), and
       bring it back the moment the user scrolls up — or returns near the
       top. Requires a couple of samples in the same direction so a jittery
       wheel/pull doesn't flicker it. */
    var dir = y > HDR_LAST + 2 ? 1 : (y < HDR_LAST - 2 ? -1 : 0);
    HDR_LAST = y;
    if (dir === 0) { HDR_TICKS += 1; }
    else if (dir === HDR_LAST_DIR) { HDR_TICKS += 1; }
    else { HDR_LAST_DIR = dir; HDR_TICKS = 1; }

    if (stuck && HDR_LAST_DIR === 1 && HDR_TICKS >= 2) {
        h.classList.add("hide");
    } else if (HDR_LAST_DIR === -1 || !stuck) {
        h.classList.remove("hide");
    }

    /* Fade the ring button away while scrolling down and glide it back
       when scrolling up (or near the top) — same direction logic as the
       header, but it also needs to have scrolled past 700px first. */
    var tt = $("#to-top");
    tt.classList.toggle("fade", stuck && HDR_LAST_DIR === 1 && HDR_TICKS >= 2);
    tt.classList.toggle("show", y > 700);
    tt.hidden = false;

    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? y / h : 0;

    /* The page-progress figure drives the ring on the to-top button. */
    if (ttFill) ttFill.style.strokeDashoffset = (TT_C * (1 - Math.min(1, Math.max(0, p)))).toFixed(2);
}

/* ── Drawer ──────────────────────────────────────────────────────────── */
function drawer(open) {
    var d = $("#drawer"), v = $("#drawer-veil"), b = $("#nav-burger");

    if (open) {
        d.hidden = false; v.hidden = false;
        // A frame between unhiding and adding .show, or the panel would be
        // painted in its open position and the slide would never run.
        requestAnimationFrame(function () { d.classList.add("show"); v.classList.add("show"); });
        scrollLock(true);
        setTimeout(function () {
            var first = $("#drawer-close");
            if (first && d.classList.contains("show")) first.focus();
        }, 220);
    } else {
        d.classList.remove("show"); v.classList.remove("show");
        scrollLock(false);
        // Send focus back where it came from, but only if it is still inside
        // the panel — a click on a link has already moved it elsewhere.
        if (b && d.contains(document.activeElement)) b.focus();
        setTimeout(function () { d.hidden = true; v.hidden = true; }, 520);
    }

    if (b) b.setAttribute("aria-expanded", open ? "true" : "false");
}

/* Widening past the burger breakpoint leaves the panel open but off-screen,
   with the page still scroll-locked. Close it instead. */
window.addEventListener("resize", function () {
    var d = $("#drawer");
    if (d && d.classList.contains("show") && window.innerWidth > 1020) drawer(false);
});

/* ── Project lookup ──────────────────────────────────────────────────── */
function findProject(slug) {
    for (var i = 0; i < PROJECTS.length; i++) if (PROJECTS[i].slug === slug) return PROJECTS[i];
    return null;
}

/* ── FAQ accordion ───────────────────────────────────────────────────── */
function wireFaq() {
    $$(".faq-q").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var item = btn.parentElement;
            var body = item.querySelector(".faq-a");
            var isOpen = item.classList.contains("open");

            $$(".faq-item.open").forEach(function (o) {
                o.classList.remove("open");
                o.querySelector(".faq-a").style.maxHeight = "";
                o.querySelector(".faq-q").setAttribute("aria-expanded", "false");
            });

            if (!isOpen) {
                item.classList.add("open");
                body.style.maxHeight = body.scrollHeight + "px";
                btn.setAttribute("aria-expanded", "true");
            }
        });
    });
}

/* ── Contact form ────────────────────────────────────────────────────── */
function wireForm() {
    var form = $("#contact-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        var payload = {
            action: "contact",
            name: $("#f-name").value.trim(),
            email: $("#f-email").value.trim(),
            projectType: $("#f-type") ? $("#f-type").value : "",
            timeline: $("#f-timeline") ? $("#f-timeline").value : "",
            budget: $("#f-budget") ? $("#f-budget").value : "",
            message: $("#f-msg").value.trim(),
            page: location.href
        };

        // Validate before anything leaves the browser.
        var bad = [];
        if (!payload.name) bad.push("f-name");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) bad.push("f-email");
        if ($("#f-type") && $("#f-type").required && !payload.projectType) bad.push("f-type");
        if (payload.message.length < 10) bad.push("f-msg");

        $$(".field").forEach(function (f) { f.classList.remove("bad"); });
        if (bad.length) {
            bad.forEach(function (id) {
                var el = document.getElementById(id);
                if (el) el.parentElement.classList.add("bad");
            });
            toast("Please check the highlighted fields.", "err");
            document.getElementById(bad[0]).focus();
            return;
        }

        var btn = $("#f-submit");
        btn.disabled = true;
        btn.innerHTML = '<span class="spin"></span> Sending…';

        if (!API_URL) {
            setTimeout(function () { formDone("DEMO-MODE"); }, 700);
            return;
        }

        // text/plain keeps this a "simple" request — Apps Script web apps
        // don't answer the CORS preflight that application/json would trigger.
        fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                if (res && res.error) throw new Error(res.error);
                formDone(res && res.ref ? res.ref : "");
            })
            .catch(function (err) {
                console.error(err);
                btn.disabled = false;
                btn.innerHTML = 'Send message<i class="fa-solid fa-arrow-right"></i>';
                toast("Couldn't send that. Please email me directly.", "err");
            });
    });
}

function formDone(ref) {
    $("#contact-form").innerHTML =
        '<div class="form-done">' +
        '<span class="tick"><i class="fa-solid fa-check"></i></span>' +
        '<h3>Message sent</h3>' +
        '<p>' + esc(cfg("formSuccessMessage", "Thanks — I'll get back to you shortly.")) + '</p>' +
        (ref ? '<span class="ref">Ref: ' + esc(ref) + '</span>' : '') +
        '</div>';
    toast("Message sent successfully.", "ok");
}

/* ── Toast ───────────────────────────────────────────────────────────── */
var TOAST_T = null;
function toast(msg, kind) {
    var t = $("#toast");
    t.className = kind || "";
    t.innerHTML = '<i class="fa-solid ' + (kind === "err" ? "fa-circle-exclamation" : "fa-circle-check") +
        '"></i><span>' + esc(msg) + '</span>';
    t.hidden = false;
    requestAnimationFrame(function () { t.classList.add("show"); });
    clearTimeout(TOAST_T);
    TOAST_T = setTimeout(function () {
        t.classList.remove("show");
        setTimeout(function () { t.hidden = true; }, 400);
    }, 4200);
}

/* ==========================================================================
   GLOBAL LISTENERS
   ========================================================================== */
window.addEventListener("scroll", onScroll, { passive: true });

/* A plain left click with no modifier keys — anything else (new tab,
   new window, download) is left to the browser. */
function plainClick(e) {
    return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    if (t.closest("#nav-burger")) { drawer(true); return; }
    if (t.closest("#drawer-close") || t.closest("#drawer-veil")) { drawer(false); return; }
    if (t.closest("#to-top")) { e.preventDefault(); scrollToTop(); return; }

    if (t.closest("#theme-toggle") || t.closest("#drawer-theme-toggle")) {
        e.preventDefault(); cycleTheme(); return;
    }
    if (t.closest("[data-resume-print]")) { e.preventDefault(); window.print(); return; }

    // Category chips repaint the grid in place; no navigation involved.
    var chip = t.closest(".filter-btn");
    if (chip) {
        FILTER = chip.getAttribute("data-filter");
        refreshProjects();
        return;
    }

    var a = t.closest("a[href]");
    if (!a) return;

    var closing = false;
    if (a.hasAttribute("data-close-drawer")) { drawer(false); closing = true; }

    if (!plainClick(e) || a.target === "_blank" || a.hasAttribute("download")) return;

    var raw = a.getAttribute("href") || "";
    if (!raw || raw.charAt(0) === "?") return;

    // ── Same-page section anchor ────────────────────────────────────────
    if (raw.charAt(0) === "#") {
        if (raw.length < 2 || raw.indexOf("#project/") === 0) return;

        // On a project page the section lives on the home page.
        if (ROUTE.name !== "home") {
            e.preventDefault();
            go(urlHome(), raw);
            return;
        }
        var target = document.getElementById(raw.slice(1));
        if (!target) return;
        e.preventDefault();
        setTimeout(function () { scrollToEl(target); }, closing ? 140 : 0);
        if (history.replaceState) history.replaceState(null, "", raw);
        return;
    }

    // ── Internal navigation ─────────────────────────────────────────────
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;

    var here = location.pathname + location.hash;
    if (url.pathname + url.hash === here) { e.preventDefault(); return; }

    e.preventDefault();
    setTimeout(function () {
        go(url.pathname + url.search, url.hash);
    }, closing ? 140 : 0);
});

/* Back / forward buttons. */
window.addEventListener("popstate", function () {
    enterRoute(location.hash);
});

document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if ($("#drawer") && $("#drawer").classList.contains("show")) drawer(false);
});

/* ── The typed way in ─────────────────────────────────────────────────
   Watches for the ⚙ Config trigger word being typed on any page. Only
   bare printable keys count, and never while a form field has focus, so
   writing "resume" into the contact message does nothing. The buffer is
   only as long as the word itself and clears after a pause, which keeps
   it from firing on text that merely happens to contain it. */
var RZ_BUF = "", RZ_TIMER = null;

document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (typeof e.key !== "string" || e.key.length !== 1) return;

    var t = e.target;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName || ""))) return;

    var want = resumeTrigger();
    if (!want) return;

    RZ_BUF = (RZ_BUF + e.key.toLowerCase()).slice(-want.length);

    clearTimeout(RZ_TIMER);
    RZ_TIMER = setTimeout(function () { RZ_BUF = ""; }, 1600);

    if (RZ_BUF !== want) return;
    RZ_BUF = "";
    if (ROUTE.name !== "resume") go(urlResume());
});

/* Pointer glow — desktop only, and never when the user prefers less motion. */
if (window.matchMedia && window.matchMedia("(hover:hover) and (pointer:fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var glow = $("#cursor-glow"), gx = 0, gy = 0, cx = 0, cy = 0, running = false;

    window.addEventListener("mousemove", function (e) {
        gx = e.clientX; gy = e.clientY;
        if (!document.body.classList.contains("cursor-on") && on("cursorGlow")) {
            document.body.classList.add("cursor-on");
        }
        if (!running) { running = true; requestAnimationFrame(glide); }
    }, { passive: true });

    function glide() {
        cx += (gx - cx) * .12;
        cy += (gy - cy) * .12;
        glow.style.transform = "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)";
        if (Math.abs(gx - cx) > .5 || Math.abs(gy - cy) > .5) requestAnimationFrame(glide);
        else running = false;
    }
}

/* Links shared before the move to real URLs still land in the right place. */
window.addEventListener("load", function () {
    var m = location.hash.match(/^#project\/(.+)$/);
    if (m) go(urlProject(decodeURIComponent(m[1])), "", true);
});

/* Re-measure an open FAQ answer when the viewport changes width. */
window.addEventListener("resize", function () {
    aboutParallax();
    var open = $(".faq-item.open");
    if (open) open.querySelector(".faq-a").style.maxHeight = open.querySelector(".faq-a").scrollHeight + "px";
});

/* ── Go ──────────────────────────────────────────────────────────────── */
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
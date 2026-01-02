const CACHE = "mdx-look-v60000";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",

  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",

  "./assets/mdx-splash.png",
  "./assets/mdx-header.png",

  "./assets/icons/profile.png",
  "./assets/icons/faqs.png",
  "./assets/icons/ask.png",
  "./assets/icons/social.png",
  "./assets/icons/docs.png",
  "./assets/icons/mymdx.png",
  "./assets/icons/timetable.png",
  "./assets/icons/attendance.png",
  "./assets/icons/campus.png",
  "./assets/icons/transport.png",
  "./assets/icons/appointments.png",
  "./assets/icons/cas.png",
  "./assets/icons/careers.png",
  "./assets/icons/library.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

# Client-only web app, no server

Ascendance of a Brush runs entirely in the browser: the uploaded image never leaves the device, and the app ships as static files (Cloudflare Pages, see ADR-0014). Any feature that would need a server (accounts, cloud storage, server-side rendering of exports) is out of scope unless this ADR is superseded.

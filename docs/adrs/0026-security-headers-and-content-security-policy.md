---
status: accepted
date: 2026-08-16
decision-makers: [development-team]
consulted: []
informed: []
---

# 26. Content Security Policy, Permissions Policy, and Security Headers

## Context and Problem Statement

SignalLab is an offline-first, client-side web application for practicing analog signal processing mathematics. As the application runs in various environments (local development, Progressive Web App install mode, and static hosting platforms such as GitHub Pages, Cloudflare Pages, Netlify, and Vercel), it requires a robust security perimeter to:

1. Prevent Cross-Site Scripting (XSS) and unauthorized resource injection.
2. Enforce the Principle of Least Privilege by restricting unused browser hardware and sensor APIs (e.g. camera, microphone, geolocation, payment, USB, bluetooth).
3. Ensure cross-platform compatibility across hosting providers with differing header capabilities (e.g. basic hosts like GitHub Pages vs. edge-header platforms like Cloudflare Pages).

## Decision Drivers

- **Security & Integrity**: Protect client-side state, IndexedDB offline problem history, and execution context from malicious scripts or unauthorized domain connections.
- **Hardware Least Privilege**: Explicitly declare that SignalLab is an offline mathematical practice tool that does not require access to media devices, sensors, or payments.
- **KaTeX & SvelteKit Compatibility**: The CSP policy must support SvelteKit client-side hydration, early theme toggle initialization scripts, preloaded KaTeX `.woff2` font files, and KaTeX math inline CSS styles without throwing CSP violation errors.
- **Multi-Host Portability**: Full policy enforcement on static hosts that lack custom HTTP header capabilities (e.g. GitHub Pages via `<meta http-equiv="...">`), while leveraging HTTP response headers (`_headers` and Vite server configuration) on platforms that support them.

## Considered Options

- **Option 1**: Rely exclusively on default browser security behaviors without declaring CSP or Permissions Policies.
- **Option 2**: Apply HTTP headers only via server/hosting configuration (`_headers` / server middlewares), omitting HTML `<meta>` fallbacks.
- **Option 3**: Implement a defense-in-depth dual strategy:
    1. An HTML `<meta http-equiv="Content-Security-Policy">` tag in `src/app.html` for universal static host compatibility (including GitHub Pages).
    2. A `static/_headers` file for production platforms supporting response headers (Cloudflare Pages, Netlify).
    3. Vite `server.headers` and `preview.headers` configuration in `vite.config.ts` for local development and dev console inspection.

## Decision Outcome

Chosen Option: **Option 3**, because it guarantees 100% CSP enforcement regardless of deployment target while enabling full header security (`Permissions-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) where supported.

### Policy Details

#### Content Security Policy (CSP) Directives

```text
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
font-src 'self';
img-src 'self' data: blob:;
connect-src 'self';
manifest-src 'self';
object-src 'none';
base-uri 'self';
```

- **`default-src 'self'`**: Restricts all resource loads to the application's own origin by default.
- **`script-src 'self' 'unsafe-inline'`**: Allows bundled SvelteKit application scripts and the inline theme-initialization script in `app.html` (prevents theme flash on initial render).
- **`style-src 'self' 'unsafe-inline'`**: Supports Svelte scoped styles and KaTeX dynamic mathematical layout styling.
- **`font-src 'self'`**: Restricts font loading to local preloaded KaTeX font files (`KaTeX_Main`, `KaTeX_Math`, `KaTeX_AMS`, `KaTeX_Size1`).
- **`img-src 'self' data: blob:`**: Allows local static icons, canvas snapshots, and inline SVG data URIs.
- **`connect-src 'self'`**: Restricts network requests and Service Worker asset fetching to the local origin.
- **`manifest-src 'self'`**: Ensures PWA manifest is loaded strictly from the local origin.
- **`object-src 'none'`**: Disallows Flash, Java, or other plugin execution.
- **`base-uri 'self'`**: Prevents `<base>` tag injection attacks.

#### Permissions Policy Directives

```text
accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(self), screen-wake-lock=(), usb=(), bluetooth=(), serial=()
```

- Blocks unnecessary hardware, sensors, payments, and recording devices.
- Retains `fullscreen=(self)` and `picture-in-picture=(self)` capabilities for the application origin.

### Consequences

#### Good

- Protects user data and application state against XSS attacks.
- Eliminates attack surface from unneeded hardware and sensor APIs.
- Guarantees CSP protection on GitHub Pages and other basic static web servers.
- Enhances Edge/Chrome DevTools security auditing and visibility during local development.

#### Bad

- Any future integration requiring external CDNs or APIs (e.g. external analytics or remote font hosting) will require intentional updates to the CSP policy.

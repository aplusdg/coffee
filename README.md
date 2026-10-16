# A+ Coffee Atelier

An interactive 3D cappuccino experience for A+ Design Group, built with Vite and Three.js. All website copy is in English. Choose hot ceramic or a tall, handle-free iced glass, Regular or Strong, and Heart, Star or A+ logo latte art. Watch espresso, milk and foam fill the cup, then drag to rotate. The cup's inner profile controls every surface radius, so liquid and foam remain within the walls. Iced drinks have floating ice; hot drinks have subtle steam. The interface supports phones, keyboard controls and reduced motion preferences.

## Develop

Node.js 20.19+ or 22.12+ is required (validated on Node 24).

```sh
npm ci
npm run dev
```

In this cloud environment, use `npm ci --cache /workspace/.npm-cache` if the default npm cache is not writable.

```sh
npm run check
npm test
npm run build
npm run check:dist
npm run preview
```

`dist/` is the deployable site. There are no external model or font downloads. Tests cover fill containment, recipe strength, request validation and timestamps. A WebGL fallback keeps the order interface usable if 3D rendering is unsupported.

## Coffee requests and automatic email

After preparing a coffee, enter a name, choose **Right now** or a future date/time, and review the recipe. **Send coffee request** submits an automatic email notification to **terrinobb@gmail.com** using FormSubmit's AJAX endpoint. No account, API key, backend, or email application is needed. Custom time is the requested pickup time: the notification is sent immediately, not at that future time. Each request includes the complete recipe, a browser-local timezone, an ISO timestamp and a request ID. The coffee host still needs to confirm the request.

### Activate notifications once

1. After deploying to GitHub Pages, make a coffee, fill in a name, then **Review coffee request → Send coffee request**.
2. Open **terrinobb@gmail.com**, including Spam, and find the FormSubmit activation email. Click **Activate Form** (or the confirmation link). This step proves ownership of the receiving inbox; it cannot be completed by this repository.
3. Refresh the coffee page and submit a new request. Verify that the notification arrives. If the service asks to authorize a new origin, repeat activation for that host. Localhost and the production website may require separate activation.

The app shows "Request submitted" only after an accepted service response; it does not claim guaranteed inbox delivery. Explicit activation responses get their own message. Until the inbox is activated, normal delivery is not ready, even if the form submission was accepted. Provider responses and delivery depend on the external service. No live inbox delivery is claimed by local or mocked tests.

Failure states allow retries, duplicate clicks are disabled, identical successful requests cannot be re-sent in the same page session, and the client waits ten seconds between attempts. A hidden honeypot catches basic form bots. AJAX submission uses FormSubmit's captcha-free mode; client checks are not server-side abuse protection. FormSubmit receives the submitted name and coffee/time details. See https://formsubmit.co/ for service policies and quotas. A higher-volume service should use server-side rate limits or the provider's supported abuse controls.

## GitHub Pages

The source HTML imports JavaScript modules and styles through Vite. Publish **the built `dist/` directory**, never the repository root. The included workflow installs locked dependencies, runs checks and tests, builds, validates relative asset paths, then deploys to Pages.

Set **Settings → Pages → Build and deployment → Source → GitHub Actions** once. Pushing to `main` publishes updates automatically. See **Actions → Deploy coffee to GitHub Pages** for progress, or use **Run workflow** to redeploy. Relative URLs support `https://aplusdg.github.io/coffee/` and other static hosts.

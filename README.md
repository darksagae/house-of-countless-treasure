# House of Countless Treasure

Open-source software under the [MIT license](LICENSE). Anyone can inspect, fork and run the code with their own provider configuration. The public demo uses server-side credentials; being open source does not mean publishing API keys or giving unlimited access to shared credits.

An independent creative studio by ISAGALA MARK. Explore fashion, jewelry, beauty, hair, skin/body, photo editing and video through a single YouCam workspace. MrSqoopExpress remains a separate Amazon project.

## Current implementation

- Responsive studio, searchable catalog, seven categories, 63 documented tools and 79 versioned task operations.
- Controls generated from a snapshot of Perfect Corp's official OpenAPI request schemas, retrieved October 12, 2026. Simple fields become controls; complex inputs can be supplied through advanced JSON. This is a universal API workspace, not 63 independently polished workflows.
- Server-only YouCam authentication, JPEG/PNG/short MP4 uploads, task creation, signed task receipts, polling, media/analysis result display, original/result comparison and a device-local result collection.
- Private studio access code protects shared credits. Source images and studio code are not saved by the app; saved result links may expire. YouCam retains provider uploads according to its policy.
- No fake AI results or paid checkout. The production demo is connected; owner processing uses the private studio access code. Signed-in, verified users use their lifetime allowance when the Neon integration is configured. Provider credentials stay in server-only variables.

## Run and deploy

Node.js 22 or newer and pnpm 11.25.0. Dependencies are pinned in the lockfile.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm dev
```

Import this repository into Vercel. The build command is `node scripts/build.js`; static output is `dist`; the server endpoint is `/api/studio`. Set `YOUCAM_API_KEY` and a strong random `STUDIO_ACCESS_CODE` as sensitive Vercel variables for the intended environments, then redeploy. Do not commit either variable. The access code is only for owner demo access; it is not the YouCam key. Neon Auth and Postgres enable the lifetime free allowance described below. Paid checkout is not implemented.

For local live development, set those two variables through your normal secret manager and `LOCAL_PREVIEW=1`. Never put keys in client code or terminal arguments.

## Architecture

Browser UI → access-protected Vercel function → fixed YouCam API origin → provider upload destination → asynchronous task → signed polling receipt → result display.

`public/catalog.json` and `lib/catalog.json` are matching normalized request schemas. The backend permits only catalog endpoints; clients cannot select arbitrary request destinations. Provider upload URLs must be HTTPS Amazon S3 URLs. API credentials are not forwarded to storage. Task IDs are signed to prevent arbitrary polling. Uploads are capped at 2 MB per file. Short MP4 files can be uploaded for video processing tools; image-to-video uses an image input. Larger inputs need provider-hosted file IDs/URLs in advanced options.

## Verification and limits

Live text-to-image generation and synthetic-photo upload/enhancement have been verified on the deployed app. Sixteen automated tests pass, including mocked upload/create/poll, invalid access, foreign origins, disguised files, endpoint allowlisting and signed receipt tampering. Mocks verify request contracts, not actual provider execution. The remaining tools still need individual live input/output testing; API units, availability and processing requirements vary. Browser and live deployment verification are recorded in `docs/VERIFICATION.md`.

Skin/body outputs are cosmetic previews or observations, not medical advice. Use only images you have permission to process. Consent is required before upload. Stopping polling does not cancel a provider task or prevent a successful task from consuming units.

## Business blueprint

Audience: independent creators, shoppers exploring styles and small merchants preparing product visuals. Proposed revenue: metered creative credits and merchant subscriptions after API costs and output rights are verified. No paid plan is currently sold. Differentiate with one reusable workspace and a collection spanning fashion, beauty and media, rather than a single effect. Before the Galuxium submission: configure and verify live tasks, add merchant/product linkage and durable state, validate pricing, record a 2–5 minute demo, and complete Devpost project details. This implementation alone does not establish hackathon eligibility.

## API references

[YouCam developer guide](https://docs.perfectcorp.com/develop/introduction), [API reference](https://docs.perfectcorp.com/reference/ai_clothes), [privacy policy](https://www.makeupar.com/perfectbeauty/youcam/privacy-policy-api), [terms](https://www.makeupar.com/perfectbeauty/youcam/terms-of-service-api).

### Personal style experience

The home page now centers on a useful journey: discover an editorial mood, build an occasion-based brief, preview or generate a look, and compare saved possibilities. Three AI-created editorial inspiration edits are bundled locally as optimized WebP assets. They are labeled as inspiration and can be explored without consuming YouCam credits. Actual personal previews use the protected server integration. The brief builder is deterministic curated styling, not an AI assistant. Collection metadata and result links stay on the current device; no uploaded source image is stored locally by the app. A separate server authorization action verifies the studio code without spending provider units.

## Five lifetime free creations

Enable **Auth** when creating a dedicated Neon Free database through Vercel and connect it only to this project. The integration supplies `DATABASE_URL` (or `POSTGRES_URL`) and `NEON_AUTH_BASE_URL`, trusted production domains and the managed authentication endpoint. The browser signs in using a code emailed by Neon. The public configuration check initializes only the application's `treasure_*` quota tables/functions, using a transaction and an initialization lock. No database connection secret is sent to the browser.

The server verifies the short-lived JWT signature, expiry and issuer using the branch's JWKS, then checks `neon_auth.user.emailVerified` in the database. Anonymous or unverified callers cannot process media. A SHA-256 digest of the canonical verified email identifies the lifetime allowance; the quota table does not store plaintext email. Gmail dots and plus aliases share the same identity, and deleting/recreating an account with the same email cannot reset the allowance. Neon necessarily stores the email in its managed authentication schema.

Five slots cover **generation attempts accepted by YouCam**, not five per day. An atomic PostgreSQL function reserves a slot before starting a task. Parallel requests cannot exceed five; replaying a request ID reuses the existing task. A definite provider rejection or terminal task failure refunds the slot exactly once. If a start request times out after it may have reached YouCam, the slot stays reserved until the result can be reconciled, avoiding repeated spending. Closing the page or stopping polling does not cancel an accepted task. Polling receipts bind the task to the verified user and quota identity. Rapid uploads are throttled separately.

After five creations, users retain access to tool browsing, local collections and sample inspiration. There is no automatic paid upgrade or card collection. This limits each verified email identity, not every possible email a person could own. Additional anti-abuse controls are needed for a large public launch. Free processing uses the owner's finite YouCam credits; exhausted provider credits can stop processing even while an account has slots remaining. No paid subscription or auto-refill is enabled by the application.

For self-hosting, configure your own YouCam key, owner code and Neon resource, then deploy. The Neon Auth SDK is currently a pinned beta; upgrade only with a full sign-in and quota regression check. See [CONTRIBUTING.md](CONTRIBUTING.md), [NOTICE.md](NOTICE.md) and [docs/VERIFICATION.md](docs/VERIFICATION.md).

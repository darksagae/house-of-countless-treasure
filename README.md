# House of Countless Treasure

An independent creative studio by ISAGALA MARK. Explore fashion, jewelry, beauty, hair, skin/body, photo editing and video through a single YouCam workspace. MrSqoopExpress remains a separate Amazon project.

## Current implementation

- Responsive studio, searchable catalog, seven categories, 63 documented tools and 79 versioned task operations.
- Controls generated from a snapshot of Perfect Corp's official OpenAPI request schemas, retrieved October 12, 2026. Simple fields become controls; complex inputs can be supplied through advanced JSON. This is a universal API workspace, not 63 independently polished workflows.
- Server-only YouCam authentication, JPEG/PNG uploads, task creation, signed task receipts, polling, media/analysis result display, original/result comparison and a device-local result collection.
- Private studio access code protects shared credits. Images and studio code are not saved by the app; saved result links may expire. YouCam retains provider uploads according to its policy.
- No fake AI results or paid checkout. Demo connection is unavailable until BOTH server variables are configured.

## Run and deploy

Node.js 22 or newer; no third-party runtime dependencies.

```sh
npm test
npm run build
npm run dev
```

Import this repository into Vercel. The build command is `node scripts/build.js`; static output is `dist`; the server endpoint is `/api/studio`. Set `YOUCAM_API_KEY` and a strong random `STUDIO_ACCESS_CODE` as sensitive Vercel variables for the intended environments, then redeploy. Do not commit either variable. The access code is for the owner/judges; it is not the YouCam key. A production service needs user authentication, a durable per-user credit ledger, quotas/rate limiting and verified billing before enabling public processing.

For local live development, set those two variables through your normal secret manager and `LOCAL_PREVIEW=1`. Never put keys in client code or terminal arguments.

## Architecture

Browser UI → access-protected Vercel function → fixed YouCam API origin → provider upload destination → asynchronous task → signed polling receipt → result display.

`public/catalog.json` and `lib/catalog.json` are matching normalized request schemas. The backend permits only catalog endpoints; clients cannot select arbitrary request destinations. Provider upload URLs must be HTTPS Amazon S3 URLs. API credentials are not forwarded to storage. Task IDs are signed to prevent arbitrary polling. Uploads are capped at 2 MB per image. Large video inputs currently need provider-hosted file IDs/URLs in advanced options; direct video uploading is not implemented.

## Verification and limits

Eight backend tests pass, including mocked upload/create/poll, invalid access, foreign origins, disguised files, endpoint allowlisting and signed receipt tampering. Mocks verify request contracts, not actual provider execution. Every individual tool still needs live input/output testing; API units, availability and processing requirements vary. Browser and live deployment verification are recorded in `docs/VERIFICATION.md`.

Skin/body outputs are cosmetic previews or observations, not medical advice. Use only images you have permission to process. Consent is required before upload. Stopping polling does not cancel a provider task or prevent a successful task from consuming units.

## Business blueprint

Audience: independent creators, shoppers exploring styles and small merchants preparing product visuals. Proposed revenue: metered creative credits and merchant subscriptions after API costs and output rights are verified. No paid plan is currently sold. Differentiate with one reusable workspace and a collection spanning fashion, beauty and media, rather than a single effect. Before the Galuxium submission: configure and verify live tasks, add merchant/product linkage and durable state, validate pricing, record a 2–5 minute demo, and complete Devpost project details. This implementation alone does not establish hackathon eligibility.

## API references

[YouCam developer guide](https://docs.perfectcorp.com/develop/introduction), [API reference](https://docs.perfectcorp.com/reference/ai_clothes), [privacy policy](https://www.makeupar.com/perfectbeauty/youcam/privacy-policy-api), [terms](https://www.makeupar.com/perfectbeauty/youcam/terms-of-service-api).

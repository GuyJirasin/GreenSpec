# Figma landing page

Design: https://www.figma.com/design/qJ4Eujczg4W5Sp4pdcalej/GREEN-SPEC?node-id=67-8534&m=dev

Implemented the website content of Landing Page (67:8534), including the hero, three team cards, four workflow steps, three evidence cards and final call to action. The macOS browser frame is presentation framing and is excluded. Desktop spacing follows the 1728px reference; narrower screens stack the content. Authenticated application styling remains separate.

All 24 image/icon/mask assets are the original bytes supplied by Figma and are served from frontend/public/assets/landing. SVG images retain their native dimensions. The forest source is 4096x2731 and 10.7MB; Figma supplied JPEG bytes under a .png asset name. It is kept unchanged for fidelity. This large source can affect the first load on slow connections. A smaller approved image export is a future optimization. The analysis overview is a static design preview, not live project data.

Inter fonts are self-hosted at weights 400, 500, 600 and 700. Their Open Font License is included as Inter-OFL.txt. No temporary Figma asset URLs are used at runtime.

Log in and Start a pilot use the existing authentication flow. See how it works scrolls and focuses the workflow section without changing the application route. Request a demo opens a mail draft only when VITE_CONTACT_EMAIL is configured. Otherwise an accessible dialog explains that contact details have not been added and offers Start a pilot. No email is sent by the application.

Interface copy uses simple English. Unsupported supplier verification, live analysis and certification claims were adjusted to match the current MVP. The footer states that analysis uses supported sample files and illustrative estimates. This work does not change backend behavior.

The prior performance and typography work was pushed in 062e4dc. Landing changes remain uncommitted and unpushed for user review.

Validation: production build PASS; browser suite24/24 PASS; desktop/mobile visual review PASS;27 protected original files unchanged. See qa/landing-verification.log. An existing request-count test now waits for the observable follow-up request before asserting exact counts; app behavior is unchanged.

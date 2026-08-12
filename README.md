# KeepMemo Website

Clean, SEO-friendly landing page for the KeepMemo app.

**Developer:** Marason Tleitu
**Contact:** cleverstar02@gmail.com

## Files

- `index.html` — Main landing page (features, screenshots, FAQ, support, feedback)
- `privacy.html` — Redirects to the official Privacy Policy
- `styles.css` — Design system matching the app
- `assets/app-icon.png` — App icon (used as logo, favicon, and OG image)
- `assets/keepmemo1.jpg` – `keepmemo6.jpg` — App screenshots shown in the Screenshots gallery
- `robots.txt` + `sitemap.xml` — Basic SEO

## Links used

- Privacy Policy: https://cleversta.github.io/privacy-policy/
- About Developer: https://cleversta.github.io/about_me/
- Contact: cleverstar02@gmail.com

## How to host on GitHub Pages

1. Create a new GitHub repository (recommended name: `keepmemo-web`)
2. Upload all files from this folder to the root of the repository, keeping the `assets/` folder intact
3. Go to **Settings → Pages**
4. Under **Source**, choose **Deploy from a branch**
5. Select branch `main` and folder `/ (root)`
6. Save

Your site will be live at: **https://cleversta.github.io/keepmemo-web/**
(If your GitHub username or repo name is different, adjust accordingly.)

## Before publishing

- [ ] Replace the placeholder Google Play link in `index.html` with your real Play Store URL once the app is published:
  `https://play.google.com/store/apps/details?id=YOUR_PACKAGE_NAME`
  (currently set to `com.keepmemo.app` as a placeholder — appears twice: in the Download CTA and the footer)
- [ ] Confirm all six screenshots in `assets/` are portrait orientation (gallery slots are sized for phone aspect ratio)
- [ ] Double-check `app-icon.png` renders cleanly at small sizes (used as a 22px nav icon and browser favicon)

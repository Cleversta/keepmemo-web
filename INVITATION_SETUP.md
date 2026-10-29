# KeepMemo date invitations

The invitation page is a static page. It can be deployed as part of the existing KeepMemo site or as a separate Cloudflare Pages project connected to this repository.

## Supabase setup

Use a dedicated Supabase project for KeepMemo invitations. In its SQL editor, run [supabase/date_invitations.sql](supabase/date_invitations.sql). The migration enables row-level security and gives the public browser access only to the invitation lookup and response RPCs. Do not expose a service-role key.

Set the public project URL and anon key in `invite-config.js`. The anon key is visible to website visitors by design; the SQL functions are the access boundary. Never put a service-role key in this file.

## Deploy the page

The page is `invite.html`, with `invite.css`, `invite.js`, and `invite-config.js` beside it. It works as a static file and reads the invitation token from `?token=...`. On GitHub Pages, the URL is:

`https://cleversta.github.io/keepmemo-web/invite.html?token=...`

For a separate Cloudflare Pages project, deploy this repository and use the resulting `/invite.html` URL as the app's `KEEP_MEMO_INVITE_WEB_URL` build setting.

## Configure the Android app

Build KeepMemo with these Dart defines:

- `KEEP_MEMO_INVITE_SUPABASE_URL`: the dedicated Supabase project's URL
- `KEEP_MEMO_INVITE_SUPABASE_ANON_KEY`: that project's anon key
- `KEEP_MEMO_INVITE_WEB_URL`: the deployed `invite.html` URL (optional; the GitHub Pages URL is the default)

The app stores drafts and the private response-reading token locally. Publishing and receiving responses require an internet connection. The recipient needs no KeepMemo account or app install.

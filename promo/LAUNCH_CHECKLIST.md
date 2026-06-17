# ContractAI — Launch Readiness Checklist

> The promotion content in `LAUNCH_KIT.md` is ready. **Do not post any of it until the items in
> "Blockers" below are done** — otherwise you're sending people to a dead link with a broken
> checkout, which wastes the launch and damages your posting reputation.

---

## 🟢 Live now
Deployed and public at **https://contract-ai-alpha.vercel.app** — the homepage, "Start Free Preview"
funnel, and upload flow all load, and the "not legal advice" disclaimer is present. (The `.env.local`
on your Desktop still has placeholders, but that's local-only; what matters is the env set in Vercel.)

## 🔴 Confirm before driving traffic (only you can verify these)

- [ ] **Run one real contract through prod** and confirm you get an actual AI analysis — i.e. the
      production `ANTHROPIC_API_KEY` is set in Vercel, not the placeholder. (There's a `test-contract.txt`
      on your Desktop you can use.)
- [ ] **Complete one real $15 purchase on prod** to confirm Stripe keys + price IDs work and the
      report delivers end-to-end. Refund yourself afterward. (I won't test payment — that's your money.)
- [ ] **Rotate `ADMIN_SECRET`** off `changeme123` in the Vercel env if it's still the default.
- [ ] *(Optional)* **Custom domain.** The `vercel.app` URL is fine to launch on. `contractai.com` is
      parked-for-sale and not yours — only buy a different domain if you want branded links.

## 🟠 Integrity fixes — these are LIVE on the site right now (fix before driving traffic)

- [ ] **Fix the fabricated social proof on the landing page** (`pages/index.js`):
      `2,400+ users`, `$2.3M+ in contract risks identified`, `4.9/5 rating`, and the three named
      testimonials (Sarah M., James T., Priya K.). For a brand-new product these are made up, and
      for a **paid, legal-adjacent** service that's an FTC problem. Options:
      - Replace with honest framing: "New — be one of the first to try it."
      - Or remove the numbers/testimonials until you have real ones.
- [ ] **Keep the legal disclaimer prominent.** Your FAQ already says "not infallible… a licensed
      attorney should also review." Good — keep that energy in promo. Avoid hard "no lawyer needed"
      claims in copy that could be read as legal advice.

## 🟡 Before turning the bot on (avoid bans)

- [ ] **Reddit:** do **not** auto-blast identical text to multiple subreddits — that's the #1 way to
      get shABanned. Post **one** genuine "I built this" post to **one** relevant sub (r/SideProject
      or r/SaaS), written as a maker, and reply to comments by hand. Read each sub's self-promo rules first.
- [ ] **Hacker News:** submit "Show HN" **manually**, not via the scripted submitter (HN bans
      automated posts). Also, Show HN works best when people can *try it free* — consider a free
      sample analysis for the HN crowd, or skip HN until you have one.
- [ ] **Everything else** (X, LinkedIn, Bluesky, Mastodon, Dev.to, your own Discord): posting to your
      **own** accounts via their official APIs is fine. Get credentials, drop them in the bot's
      `.env.local`, and you're set.

## ✅ Then: connect the bot

Credentials map to `propvid-app/.env.example` (the bot's template). Fill only the platforms you have.
Test with a dry run first — it generates and prints content **without** posting:

```bash
cd path/to/propvid-app
npm run promote:dry -- --name "ContractAI" --desc "..." --url "https://contract-ai-alpha.vercel.app"
```

When the dry run looks right and the blockers above are cleared, drop `--dry-run` to go live, then
start the self-improvement loop:

```bash
npm run promote:scheduler
```

---

### Suggested order
1. Domain + deploy + Stripe + Anthropic key (Blockers)
2. Fix landing-page social proof (Integrity)
3. One manual Reddit post + manual Show HN (optional)
4. Connect bot for X / LinkedIn / Bluesky / Mastodon / Dev.to / your Discord
5. Let the scheduler learn what performs best

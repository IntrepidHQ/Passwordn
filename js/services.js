// Passwordn — Service Catalog
// Pre-defined services with brand colors, login URLs, and subscription management URLs.
// Used for quick-add in the vault and autofill matching in the extension.

window.SERVICES = [
  // ── Automation / AI ──────────────────────────────────────────────
  { id: "n8n",       name: "n8n",               url: "n8n.io",                    loginUrl: "https://app.n8n.io",                          manageUrl: "https://app.n8n.io/settings/account",         category: "Automation",    color: "#FF6D5A", bg: "#1a0a08", initials: "N8", sub: { price: 20, cycle: "monthly" } },
  { id: "zapier",    name: "Zapier",             url: "zapier.com",                loginUrl: "https://zapier.com/app/login",                 manageUrl: "https://zapier.com/app/settings/billing",     category: "Automation",    color: "#FF4A00", bg: "#180d00", initials: "ZP", sub: { price: 19.99, cycle: "monthly" } },
  { id: "make",      name: "Make",               url: "make.com",                  loginUrl: "https://www.make.com/en/login",                manageUrl: "https://www.make.com/en/organization/subscription", category: "Automation", color: "#6D0DFF", bg: "#0d0024", initials: "MK", sub: { price: 9, cycle: "monthly" } },
  { id: "anthropic", name: "Anthropic / Claude", url: "console.anthropic.com",     loginUrl: "https://console.anthropic.com",               manageUrl: "https://console.anthropic.com/settings/plans", category: "AI",           color: "#CC785C", bg: "#1a0f0a", initials: "AN" },
  { id: "openai",    name: "OpenAI",             url: "platform.openai.com",       loginUrl: "https://platform.openai.com/login",           manageUrl: "https://platform.openai.com/account/billing",  category: "AI",           color: "#10A37F", bg: "#061a14", initials: "AI", sub: { price: 20, cycle: "monthly" } },
  { id: "lovable",   name: "Lovable",            url: "lovable.dev",               loginUrl: "https://lovable.dev/sign-in",                 manageUrl: "https://lovable.dev/settings/billing",         category: "AI Dev",        color: "#E75480", bg: "#1a0410", initials: "LV" },
  { id: "cursor",    name: "Cursor",             url: "cursor.sh",                 loginUrl: "https://cursor.sh/login",                     manageUrl: "https://cursor.sh/settings",                   category: "AI Dev",        color: "#4F46E5", bg: "#06051a", initials: "CU", sub: { price: 20, cycle: "monthly" } },

  // ── Website / CMS ─────────────────────────────────────────────────
  { id: "squarespace", name: "Squarespace",      url: "squarespace.com",           loginUrl: "https://account.squarespace.com/sign-in",     manageUrl: "https://account.squarespace.com/billing",     category: "Website",       color: "#111111", bg: "#111", initials: "SQ", sub: { price: 23, cycle: "monthly" } },
  { id: "wordpress",   name: "WordPress",        url: "wordpress.com",             loginUrl: "https://wordpress.com/log-in",                manageUrl: "https://wordpress.com/me/purchases",           category: "Website",       color: "#21759B", bg: "#060e14", initials: "WP" },
  { id: "webflow",     name: "Webflow",          url: "webflow.com",               loginUrl: "https://webflow.com/dashboard",               manageUrl: "https://webflow.com/dashboard/account/billing", category: "Website",      color: "#146EF5", bg: "#00071a", initials: "WF", sub: { price: 14, cycle: "monthly" } },
  { id: "wix",         name: "Wix",             url: "wix.com",                   loginUrl: "https://users.wix.com/signin",                manageUrl: "https://premium.wix.com/wix/api/payment/manage-subscriptions", category: "Website", color: "#116DFF", bg: "#00061a", initials: "WX", sub: { price: 17, cycle: "monthly" } },
  { id: "shopify",     name: "Shopify",          url: "shopify.com",               loginUrl: "https://accounts.shopify.com/store-login",    manageUrl: "https://www.shopify.com/admin/settings/plan",  category: "Website",       color: "#96BF48", bg: "#0a1205", initials: "SH", sub: { price: 29, cycle: "monthly" } },
  { id: "framer",      name: "Framer",           url: "framer.com",                loginUrl: "https://framer.com/login",                    manageUrl: "https://framer.com/account/billing",           category: "Website",       color: "#0099FF", bg: "#00081a", initials: "FM", sub: { price: 15, cycle: "monthly" } },

  // ── Domain / Hosting ──────────────────────────────────────────────
  { id: "godaddy",    name: "GoDaddy",           url: "godaddy.com",               loginUrl: "https://sso.godaddy.com",                     manageUrl: "https://account.godaddy.com/subscriptions",    category: "Hosting",       color: "#1BDBDB", bg: "#001a1a", initials: "GD" },
  { id: "namecheap",  name: "Namecheap",         url: "namecheap.com",             loginUrl: "https://www.namecheap.com/myaccount/login/",  manageUrl: "https://ap.www.namecheap.com/Domains/DomainList", category: "Hosting",    color: "#DE3723", bg: "#1a0100", initials: "NC" },
  { id: "cloudflare", name: "Cloudflare",        url: "cloudflare.com",            loginUrl: "https://dash.cloudflare.com/login",           manageUrl: "https://dash.cloudflare.com/profile/billing", category: "Hosting",       color: "#F6821F", bg: "#1a0a00", initials: "CF" },
  { id: "vercel",     name: "Vercel",            url: "vercel.com",                loginUrl: "https://vercel.com/login",                    manageUrl: "https://vercel.com/account/billing",           category: "Hosting",       color: "#FFFFFF", bg: "#111", initials: "VC" },
  { id: "netlify",    name: "Netlify",           url: "netlify.com",               loginUrl: "https://app.netlify.com",                     manageUrl: "https://app.netlify.com/teams/personal/billing", category: "Hosting",      color: "#00C7B7", bg: "#001a19", initials: "NL" },
  { id: "railway",    name: "Railway",           url: "railway.app",               loginUrl: "https://railway.app/login",                   manageUrl: "https://railway.app/account/billing",          category: "Hosting",       color: "#0B0D0E", bg: "#111", initials: "RW" },
  { id: "aws",        name: "AWS",               url: "aws.amazon.com",            loginUrl: "https://signin.aws.amazon.com",               manageUrl: "https://console.aws.amazon.com/billing",       category: "Hosting",       color: "#FF9900", bg: "#1a0f00", initials: "AW" },
  { id: "digitalocean", name: "DigitalOcean",    url: "digitalocean.com",          loginUrl: "https://cloud.digitalocean.com/login",        manageUrl: "https://cloud.digitalocean.com/account/billing", category: "Hosting",    color: "#0080FF", bg: "#00061a", initials: "DO", sub: { price: 12, cycle: "monthly" } },

  // ── Dev Tools ─────────────────────────────────────────────────────
  { id: "github",     name: "GitHub",            url: "github.com",                loginUrl: "https://github.com/login",                    manageUrl: "https://github.com/settings/billing",          category: "Dev",           color: "#24292E", bg: "#111", initials: "GH" },
  { id: "supabase",   name: "Supabase",          url: "supabase.com",              loginUrl: "https://supabase.com/dashboard",              manageUrl: "https://supabase.com/dashboard/account/billing", category: "Dev",          color: "#3ECF8E", bg: "#01190f", initials: "SB" },
  { id: "planetscale",name: "PlanetScale",       url: "planetscale.com",           loginUrl: "https://app.planetscale.com/sign-in",         manageUrl: "https://app.planetscale.com/settings/billing", category: "Dev",          color: "#F0F6FF", bg: "#111", initials: "PS" },
  { id: "linear",     name: "Linear",            url: "linear.app",                loginUrl: "https://linear.app/login",                    manageUrl: "https://linear.app/settings/billing",          category: "Dev",           color: "#5E6AD2", bg: "#06071a", initials: "LN" },
  { id: "figma",      name: "Figma",             url: "figma.com",                 loginUrl: "https://www.figma.com/login",                 manageUrl: "https://www.figma.com/settings/billing",       category: "Design",        color: "#F24E1E", bg: "#1a0600", initials: "FG" },

  // ── Communication ─────────────────────────────────────────────────
  { id: "slack",      name: "Slack",             url: "slack.com",                 loginUrl: "https://slack.com/signin",                    manageUrl: "https://admin.slack.com/billing",              category: "Comms",         color: "#4A154B", bg: "#0d030e", initials: "SL" },
  { id: "discord",    name: "Discord",           url: "discord.com",               loginUrl: "https://discord.com/login",                   manageUrl: "https://discord.com/settings/premium",         category: "Comms",         color: "#5865F2", bg: "#05061a", initials: "DC" },
  { id: "notion",     name: "Notion",            url: "notion.so",                 loginUrl: "https://www.notion.so/login",                 manageUrl: "https://www.notion.so/my-account",             category: "Comms",         color: "#191919", bg: "#111", initials: "NO" },
  { id: "loom",       name: "Loom",              url: "loom.com",                  loginUrl: "https://www.loom.com/looms",                  manageUrl: "https://www.loom.com/my-videos",               category: "Comms",         color: "#7B4FF0", bg: "#08031a", initials: "LM", sub: { price: 12.5, cycle: "monthly" } },
  { id: "zoom",       name: "Zoom",              url: "zoom.us",                   loginUrl: "https://zoom.us/signin",                      manageUrl: "https://zoom.us/billing/subscriptions",        category: "Comms",         color: "#2D8CFF", bg: "#00081a", initials: "ZM", sub: { price: 14.99, cycle: "monthly" } },
  { id: "calendly",   name: "Calendly",          url: "calendly.com",              loginUrl: "https://calendly.com/app/login",              manageUrl: "https://calendly.com/app/settings/plans",     category: "Comms",         color: "#006BFF", bg: "#00061a", initials: "CL", sub: { price: 12, cycle: "monthly" } },

  // ── Email / Marketing ─────────────────────────────────────────────
  { id: "gmail",      name: "Gmail / Google",    url: "gmail.com",                 loginUrl: "https://accounts.google.com",                 manageUrl: "https://myaccount.google.com",                 category: "Email",         color: "#EA4335", bg: "#1a0100", initials: "GM" },
  { id: "outlook",    name: "Outlook / M365",    url: "outlook.com",               loginUrl: "https://login.microsoftonline.com",           manageUrl: "https://account.microsoft.com/services",       category: "Email",         color: "#0078D4", bg: "#00061a", initials: "OL" },
  { id: "mailchimp",  name: "Mailchimp",         url: "mailchimp.com",             loginUrl: "https://login.mailchimp.com",                 manageUrl: "https://admin.mailchimp.com/account/billing",  category: "Email",         color: "#FFE01B", bg: "#1a1800", initials: "MC", sub: { price: 11, cycle: "monthly" } },
  { id: "convertkit", name: "ConvertKit / Kit",  url: "convertkit.com",            loginUrl: "https://app.convertkit.com/users/login",      manageUrl: "https://app.convertkit.com/account_settings/billing", category: "Email", color: "#FB6970", bg: "#1a0102", initials: "CK", sub: { price: 25, cycle: "monthly" } },
  { id: "sendgrid",   name: "SendGrid / Twilio", url: "sendgrid.com",              loginUrl: "https://app.sendgrid.com/login",              manageUrl: "https://app.sendgrid.com/settings/billing",    category: "Email",         color: "#1A82E2", bg: "#00061a", initials: "SG" },

  // ── Social ────────────────────────────────────────────────────────
  { id: "twitter",    name: "X / Twitter",       url: "x.com",                     loginUrl: "https://x.com/i/flow/login",                  manageUrl: "https://x.com/settings/subscription",          category: "Social",        color: "#FFFFFF", bg: "#111", initials: "X" },
  { id: "linkedin",   name: "LinkedIn",          url: "linkedin.com",              loginUrl: "https://www.linkedin.com/login",              manageUrl: "https://www.linkedin.com/mypreferences/d/premium", category: "Social",    color: "#0A66C2", bg: "#00051a", initials: "LI" },
  { id: "instagram",  name: "Instagram",         url: "instagram.com",             loginUrl: "https://www.instagram.com/accounts/login",   manageUrl: "https://www.instagram.com/accounts/privacy_and_security/", category: "Social", color: "#E1306C", bg: "#1a0010", initials: "IG" },
  { id: "facebook",   name: "Facebook / Meta",   url: "facebook.com",              loginUrl: "https://www.facebook.com/login",              manageUrl: "https://www.facebook.com/settings",             category: "Social",        color: "#1877F2", bg: "#00061a", initials: "FB" },
  { id: "youtube",    name: "YouTube",           url: "youtube.com",               loginUrl: "https://accounts.google.com",                 manageUrl: "https://www.youtube.com/account",               category: "Social",        color: "#FF0000", bg: "#1a0000", initials: "YT" },
  { id: "canva",      name: "Canva",             url: "canva.com",                 loginUrl: "https://www.canva.com/login",                 manageUrl: "https://www.canva.com/account/billing",         category: "Design",        color: "#00C4CC", bg: "#001a1a", initials: "CA", sub: { price: 14.99, cycle: "monthly" } },

  // ── Finance / Payments ────────────────────────────────────────────
  { id: "stripe",     name: "Stripe",            url: "stripe.com",                loginUrl: "https://dashboard.stripe.com/login",          manageUrl: "https://dashboard.stripe.com/settings/billing", category: "Finance",       color: "#635BFF", bg: "#04031a", initials: "ST" },
  { id: "paypal",     name: "PayPal",            url: "paypal.com",                loginUrl: "https://www.paypal.com/signin",               manageUrl: "https://www.paypal.com/myaccount/autopay",     category: "Finance",       color: "#00457C", bg: "#000c1a", initials: "PP" },
  { id: "quickbooks", name: "QuickBooks",        url: "quickbooks.intuit.com",     loginUrl: "https://accounts.intuit.com",                 manageUrl: "https://qbo.intuit.com/app/plan",               category: "Finance",       color: "#2CA01C", bg: "#031300", initials: "QB", sub: { price: 25, cycle: "monthly" } },

  // ── Analytics ─────────────────────────────────────────────────────
  { id: "analytics",  name: "Google Analytics",  url: "analytics.google.com",      loginUrl: "https://accounts.google.com",                 manageUrl: "https://analytics.google.com",                  category: "Analytics",     color: "#E37400", bg: "#1a0a00", initials: "GA" },
  { id: "hotjar",     name: "Hotjar",            url: "hotjar.com",                loginUrl: "https://insights.hotjar.com/login",           manageUrl: "https://insights.hotjar.com/site/settings/subscription", category: "Analytics", color: "#FF3C00", bg: "#1a0700", initials: "HJ", sub: { price: 32, cycle: "monthly" } },
  { id: "semrush",    name: "Semrush",           url: "semrush.com",               loginUrl: "https://www.semrush.com/login.html",          manageUrl: "https://www.semrush.com/billing/plan",          category: "Analytics",     color: "#FF642D", bg: "#1a0500", initials: "SM", sub: { price: 117.33, cycle: "monthly" } },

  // ── Security / Auth ───────────────────────────────────────────────
  { id: "apple",      name: "Apple ID",          url: "appleid.apple.com",         loginUrl: "https://appleid.apple.com",                   manageUrl: "https://appleid.apple.com",                     category: "Security",      color: "#AAAAAA", bg: "#111", initials: "AP" },
  { id: "google_auth",name: "Google Auth",       url: "myaccount.google.com",      loginUrl: "https://myaccount.google.com",                manageUrl: "https://myaccount.google.com/security",         category: "Security",      color: "#4285F4", bg: "#00061a", initials: "2F" },
  { id: "authy",      name: "Authy / Twilio",    url: "authy.com",                 loginUrl: "https://dashboard.authy.com",                 manageUrl: "https://dashboard.authy.com",                   category: "Security",      color: "#EC1C24", bg: "#1a0001", initials: "AT" },

  // ── Project Management ────────────────────────────────────────────
  { id: "clickup",    name: "ClickUp",           url: "clickup.com",               loginUrl: "https://app.clickup.com/login",               manageUrl: "https://app.clickup.com/settings/plans",       category: "PM",            color: "#7B68EE", bg: "#07061a", initials: "CU", sub: { price: 10, cycle: "monthly" } },
  { id: "airtable",   name: "Airtable",          url: "airtable.com",              loginUrl: "https://airtable.com/login",                  manageUrl: "https://airtable.com/account",                  category: "PM",            color: "#18BFFF", bg: "#001a1a", initials: "AT", sub: { price: 10, cycle: "monthly" } },
  { id: "trello",     name: "Trello",            url: "trello.com",                loginUrl: "https://trello.com/login",                    manageUrl: "https://trello.com/billing",                    category: "PM",            color: "#0079BF", bg: "#00061a", initials: "TR" },

  // ── Adobe / Creative ──────────────────────────────────────────────
  { id: "adobe",      name: "Adobe CC",          url: "adobe.com",                 loginUrl: "https://auth.services.adobe.com/en_US/index.html#/", manageUrl: "https://account.adobe.com/plans",        category: "Design",        color: "#FF0000", bg: "#1a0000", initials: "AD", sub: { price: 54.99, cycle: "monthly" } },
];

// Lookup helpers
window.getService = (id) => window.SERVICES.find(s => s.id === id);
window.matchService = (url) => {
  if (!url) return null;
  const host = url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  return window.SERVICES.find(s => {
    const sh = s.url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
    return host === sh || host.endsWith("." + sh) || sh.endsWith("." + host);
  });
};

window.SERVICE_CATEGORIES = [...new Set(window.SERVICES.map(s => s.category))].sort();

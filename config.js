/* ============================================================
   KHAYR shop settings. Edit once, then upload to GitHub.
   ============================================================ */
window.SHOP_CONFIG = {
  shopName: "KHAYR",

  // Decant sizes the site knows about (ml). Turn each on/off in the admin panel.
  sizes: [3, 6, 10, 15, 30],

  // Supabase project (Project Settings > API).
  // The URL and the public anon / publishable key are safe to be public.
  // NEVER put the service_role / secret key here.
  supabase: {
    url: "https://YOUR-PROJECT-ID.supabase.co",
    anonKey: "YOUR-ANON-OR-PUBLISHABLE-KEY"
  },

  // Admin username "Khayr96" logs in as khayr96@<this domain> in Supabase Auth.
  adminEmailDomain: "khayr.shop"
};

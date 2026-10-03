/* ============================================================
   KHAYR shop settings. Safe to be public: nothing in here is secret.
   Upload this file to GitHub after filling in the 2 Supabase lines
   and the Google Sheets line.
   ============================================================ */
window.SHOP_CONFIG = {
  shopName: "KHAYR",

  // Decant sizes the site knows about (ml). Turn each on/off in Admin > ML Settings.
  sizes: [3, 6, 10, 15, 30],

  // Supabase > Project Settings > API Keys.
  // Paste the PUBLISHABLE key (starts with sb_publishable_) or the legacy "anon" key.
  // NEVER paste a "secret" or "service_role" key here.
  supabase: {
    url: "https://svecpdcymyphbyrjvymv.supabase.co",
    anonKey: "sb_publishable_8vFu-ix41r1eCBwL9HtLwg_pS0eRlGD",
    imageBucket: "perfume-images"
  },

  // Admin username "Khayr96" signs in to Supabase as khayr96@<this domain>.
  adminEmailDomain: "khayr.shop",

  // Google Sheets order log (Apps Script Web App). Leave the url empty to switch it off.
  // Paste the Web App URL that ends with /exec
  sheets: {
    url: "https://script.google.com/macros/s/AKfycbyrEkWNL1acmM2gDDcfynvyD4xGjZXgo49Hg-KN7HelGxIvRg6iU2xqPAVxlFwqe-1Ljw/exec",
    key: "khayr-orders-7f3a9c21e5b84d06"   // must be the same as SITE_KEY inside the Apps Script
  }
};

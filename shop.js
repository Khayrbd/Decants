/* ============================================================
   KHAYR shop script (version 8) — Perfume Decants only.
   Pages tell it who they are with <body data-page="perfume|bottles|privacy">.
   Nothing secret lives here: prices, stock and discounts are checked again on the server.
   ============================================================ */
(function(){
'use strict';
const CFG = window.SHOP_CONFIG || {};
const SITE = window.SITE_CONFIG || {};
const SB = CFG.supabase || {};
const SHOP = CFG.shopName || 'KHAYR';
const PAGE = document.body.dataset.page || 'perfume';
const BUCKET = SB.imageBucket || 'perfume-images';
const SB_URL = String(SB.url || '').replace(/\/$/, '');
const sbReady = () => !!(SB_URL && SB.anonKey && !/PASTE-|YOUR-/.test(SB_URL + SB.anonKey));
const API = SB_URL ? SB_URL + '/functions/v1/khayr-api' : '';
const SIZES = [3, 6, 10, 15, 30];
const CATS = [['niche', 'Niche'], ['designer', 'Designer'], ['middle_eastern', 'Middle Eastern']];
const GENDERS = [['male', 'Male'], ['female', 'Female'], ['unisex', 'Unisex']];
const SEASONS = [['summer', 'Summer'], ['winter', 'Winter'], ['all', 'All season']];
const SCENTS = [['fresh', 'Fresh'], ['citrus', 'Citrus'], ['aquatic', 'Aquatic'], ['green', 'Green'], ['floral', 'Floral'], ['fruity', 'Fruity'], ['sweet', 'Sweet'], ['vanilla', 'Vanilla'],
                ['spicy', 'Spicy'], ['woody', 'Woody'], ['oud', 'Oud'], ['amber', 'Amber'], ['leather', 'Leather'], ['musky', 'Musky']];
const LONGEVITY = {light: 'Light', moderate: 'Moderate', long: 'Long-lasting', very_long: 'Very long-lasting'};
const STRENGTH = {soft: 'Soft', moderate: 'Moderate', strong: 'Strong'};
const OCCASIONS = {day: 'Day', night: 'Night', office: 'Office', party: 'Party', date: 'Date night'};
const scLabel = k => (SCENTS.find(x => x[0] === k) || [])[1] || '';
const gLabel = g => (GENDERS.find(x => x[0] === g) || [])[1] || '';
const sLabel = v => (SEASONS.find(x => x[0] === v) || [])[1] || '';

/* ---------- small helpers ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const price = n => String(Math.round(Number(n) || 0));            // 1500  (no commas, no currency)
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
const ls = {
  get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} },
  del(k){ try { localStorage.removeItem(k); } catch(e){} }
};
const ss = {
  get(k, d){ try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { sessionStorage.setItem(k, JSON.stringify(v)); } catch(e){} },
  del(k){ try { sessionStorage.removeItem(k); } catch(e){} }
};
const normCat = c => String(c || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
const catLabel = c => (CATS.find(x => x[0] === c) || [])[1] || '';
const norm = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();   // Rosé = Rose
const houseKey = h => norm(h);
function newId(){
  try { if(crypto.randomUUID) return crypto.randomUUID(); } catch(e){}
  const b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

/* ---------- বাংলা: switch the customer pages to Bangla (product names stay as they are) ---------- */
const LANG = (() => { try { return localStorage.getItem('khayr_lang') === 'bn' ? 'bn' : 'en'; } catch(e){ return 'en'; } })();
const BN = {
  /* v10 */
  "We fill your decant after you order": "অর্ডারের পর আমরা আপনার ডিক্যান্ট ভরে দিই",
  "Money back if it is not original": "অরিজিনাল না হলে টাকা ফেরত",
  "Cash on delivery": "ক্যাশ অন ডেলিভারি",
  "Free replacement if a bottle leaks or breaks": "বোতল লিক হলে বা ভাঙলে ফ্রি রিপ্লেসমেন্ট",
  "Order on Messenger": "মেসেঞ্জারে অর্ডার করুন",
  "Note for us": "আমাদের জন্য নোট",
  "e.g. gift wrap, call before delivery, best time to deliver": "যেমন: গিফট র‍্যাপ, ডেলিভারির আগে কল দিন, কখন ডেলিভারি দিলে ভালো",
  "Messenger opened with your order ✓": "আপনার অর্ডারসহ মেসেঞ্জার খুলেছে ✓",
  "Press send in Messenger to finish. If the message box is empty, tap and hold it → Paste, then send.": "শেষ করতে মেসেঞ্জারে সেন্ড চাপুন। মেসেজ বক্স খালি থাকলে চেপে ধরে Paste করুন, তারপর সেন্ড করুন।",
  "By ordering you agree to our": "অর্ডার করলে আপনি আমাদের এই নিয়মে রাজি হচ্ছেন:",
  "Returns & Replacement policy": "রিটার্ন ও রিপ্লেসমেন্ট নীতি",
  "Returns & Replacement": "রিটার্ন ও রিপ্লেসমেন্ট",
  "Save": "সেভ করুন",
  "Saved": "সেভ করা",
  "Saved ♥": "সেভ হয়েছে ♥",
  "Removed from saved": "সেভ থেকে সরানো হয়েছে",
  "No saved perfumes yet.": "এখনও কোনো পারফিউম সেভ করা নেই।",
  "Tap the ♥ on a perfume to save it here.": "পারফিউমের ♥ চাপলে এখানে সেভ হবে।",
  "Show all perfumes": "সব পারফিউম দেখুন",
  "Real reviews from our Facebook page": "আমাদের ফেসবুক পেজের আসল রিভিউ",
  "Returns & Replacement Policy": "রিটার্ন ও রিপ্লেসমেন্ট নীতি",
  "Please read this before you order. By placing an order, you agree to these rules.": "অর্ডার করার আগে এটি পড়ুন। অর্ডার করলে আপনি এই নিয়মগুলোতে রাজি হচ্ছেন।",
  "1. When we replace your perfume": "১. কখন আমরা পারফিউম বদলে দিই",
  "The perfume is not original": "পারফিউম অরিজিনাল না হলে",
  "If you can show clear proof that the perfume we sent is not original, we will replace it or give your money back.": "আমাদের পাঠানো পারফিউম অরিজিনাল নয়, এর পরিষ্কার প্রমাণ দেখাতে পারলে আমরা বদলে দেব অথবা টাকা ফেরত দেব।",
  "The bottle arrived leaking or broken": "বোতল লিক বা ভাঙা অবস্থায় পৌঁছালে",
  "We will send you a free replacement, if you follow the delivery rules in part 3.": "৩ নম্বর অংশের ডেলিভারির নিয়ম মানলে আমরা ফ্রি রিপ্লেসমেন্ট পাঠাব।",
  "2. When we cannot replace or refund": "২. কখন বদলানো বা টাকা ফেরত হবে না",
  "You do not like the smell after you receive it.": "হাতে পাওয়ার পর ঘ্রাণ পছন্দ না হলে।",
  "The perfume does not suit you, or you changed your mind.": "পারফিউম আপনার সাথে না মিললে, বা মত বদলালে।",
  "The smell or how long it lasts on your skin is different from what you expected.": "ঘ্রাণ বা ত্বকে কতক্ষণ থাকে, তা আপনার প্রত্যাশার চেয়ে আলাদা হলে।",
  "The bottle was damaged after delivery, for example it fell while you opened the parcel.": "ডেলিভারির পর বোতলের ক্ষতি হলে, যেমন পার্সেল খোলার সময় হাত থেকে পড়ে গেলে।",
  "A leak or break is reported without the proof described in part 3.": "৩ নম্বর অংশের প্রমাণ ছাড়া লিক বা ভাঙার অভিযোগ করলে।",
  "Smell is personal. Before you order, read the notes, ask us on WhatsApp, or start with a small 3 ml decant.": "ঘ্রাণের পছন্দ একেকজনের একেক রকম। অর্ডারের আগে নোটস পড়ুন, হোয়াটসঅ্যাপে জিজ্ঞেস করুন, অথবা ছোট ৩ ml ডিক্যান্ট দিয়ে শুরু করুন।",
  "3. Leaking or broken bottle: how to claim": "৩. লিক বা ভাঙা বোতল: কীভাবে জানাবেন",
  "Best: open the parcel in front of the delivery person and check the bottles before they leave.": "সবচেয়ে ভালো: ডেলিভারি ম্যানের সামনে পার্সেল খুলুন এবং তিনি যাওয়ার আগেই বোতলগুলো দেখে নিন।",
  "If you cannot open it in front of the delivery person, record one video while you open the parcel, from the closed parcel until the bottles are out. Do not stop or cut the video.": "ডেলিভারি ম্যানের সামনে খুলতে না পারলে, পার্সেল খোলার সময় একটানা ভিডিও করুন: বন্ধ পার্সেল থেকে বোতল বের করা পর্যন্ত। ভিডিও থামাবেন না বা কাটবেন না।",
  "Without this proof we cannot accept a leak or break claim.": "এই প্রমাণ ছাড়া লিক বা ভাঙার অভিযোগ গ্রহণ করা হবে না।",
  "Keep the bottle, the box and all the packaging until we reply.": "আমরা উত্তর না দেওয়া পর্যন্ত বোতল, বক্স ও সব প্যাকেজিং রেখে দিন।",
  "4. Not original: how to claim": "৪. অরিজিনাল না হলে: কীভাবে জানাবেন",
  "Send us your Order ID and your proof on WhatsApp.": "হোয়াটসঅ্যাপে আপনার Order ID ও প্রমাণ পাঠান।",
  "Keep the decant bottle with the perfume still inside. We need to check it.": "ডিক্যান্ট বোতলটি ভেতরের পারফিউমসহ রেখে দিন। আমাদের এটি পরীক্ষা করতে হবে।",
  "Please tell us as soon as possible after delivery.": "ডেলিভারির পর যত দ্রুত সম্ভব আমাদের জানান।",
  "We check every claim. If your claim is accepted, we send a replacement or give your money back.": "আমরা প্রতিটি অভিযোগ যাচাই করি। অভিযোগ গ্রহণ হলে বদলে দিই অথবা টাকা ফেরত দিই।",
  "5. Contact us": "৫. যোগাযোগ",
  "Message us on WhatsApp with your Order ID, photos and the video:": "আপনার Order ID, ছবি ও ভিডিওসহ হোয়াটসঅ্যাপে মেসেজ দিন:",
  'Perfume Decants': 'পারফিউম ডিক্যান্ট', 'Bottle Photos': 'বোতলের ছবি', 'Privacy Policy': 'প্রাইভেসি পলিসি', 'Search': 'খুঁজুন', 'See the bottles we send': 'আমরা যে বোতলে পাঠাই',
  'Find your signature scent before committing to a full bottle.': 'পুরো বোতল কেনার আগে আপনার পছন্দের ঘ্রাণ খুঁজে নিন।',
  '100% Authentic Fragrances Decant': '১০০% অরিজিনাল পারফিউম ডিক্যান্ট', 'Niche • Designer • Middle Eastern Fragrances': 'নিশ • ডিজাইনার • মিডল ইস্টার্ন পারফিউম',
  'See the bottles we send →': 'আমরা যে বোতলে পাঠাই দেখুন →', 'Search perfume or house': 'পারফিউম বা ব্র্যান্ড খুঁজুন', 'All sizes': 'সব সাইজ', 'All Perfumes': 'সব পারফিউম',
  'Niche': 'নিশ', 'Designer': 'ডিজাইনার', 'Middle Eastern': 'মিডল ইস্টার্ন', 'Summer': 'গ্রীষ্ম', 'Winter': 'শীত', 'All season': 'সারা বছর', 'Smell:': 'ঘ্রাণ:',
  'Fresh': 'ফ্রেশ', 'Citrus': 'সাইট্রাস', 'Aquatic': 'সামুদ্রিক', 'Green': 'গ্রিন', 'Floral': 'ফুলেল', 'Fruity': 'ফলের', 'Sweet': 'মিষ্টি', 'Vanilla': 'ভ্যানিলা',
  'Spicy': 'মসলাদার', 'Woody': 'উডি', 'Oud': 'উদ', 'Amber': 'অ্যাম্বার', 'Leather': 'লেদার', 'Musky': 'মাস্কি',
  'Default order': 'সাধারণ ক্রম', 'Bestsellers first': 'বেস্টসেলার আগে', 'Name A to Z': 'নাম A থেকে Z', 'Price low to high': 'দাম কম থেকে বেশি', 'Price high to low': 'দাম বেশি থেকে কম',
  'Clear Filters': 'ফিল্টার মুছুন', 'Add to cart': 'কার্টে যোগ করুন', 'Added ✓': 'যোগ হয়েছে ✓', 'Stock Out': 'স্টক নেই', 'Out': 'নেই', 'Copy': 'কপি',
  'Notify me when back': 'আবার এলে জানান', 'Notify me': 'আমাকে জানান', 'Bestseller': 'বেস্টসেলার', 'New': 'নতুন', 'Add': 'যোগ করুন', 'Similar to': 'যেমন',
  'tk': 'টাকা', 'Notes': 'নোটস', 'Lasts': 'স্থায়িত্ব', 'Strength': 'তীব্রতা', 'Wear it': 'কখন পরবেন', 'Light': 'হালকা', 'Moderate': 'মাঝারি', 'Long-lasting': 'দীর্ঘস্থায়ী',
  'Very long-lasting': 'খুব দীর্ঘস্থায়ী', 'Soft': 'নরম', 'Strong': 'তীব্র', 'Day': 'দিন', 'Night': 'রাত', 'Office': 'অফিস', 'Party': 'পার্টি', 'Date night': 'ডেট নাইট',
  'Fragrantica ↗': 'Fragrantica ↗', 'Discovery sets': 'ডিসকভারি সেট', 'Add set to cart': 'সেট কার্টে যোগ করুন', 'Recently viewed': 'সম্প্রতি দেখা',
  'Find your scent': 'আপনার ঘ্রাণ খুঁজুন', 'Not sure what to choose? Answer 4 quick questions.': 'কোনটা নেবেন বুঝতে পারছেন না? ৪টি ছোট প্রশ্নের উত্তর দিন।',
  '1. When will you wear it?': '১. কখন পরবেন?', 'Summer / hot days': 'গ্রীষ্ম / গরমের দিন', 'Winter / cool days': 'শীত / ঠান্ডার দিন', 'Any time': 'যেকোনো সময়',
  '2. What do you like?': '২. কেমন ঘ্রাণ পছন্দ?', 'Fresh & clean': 'ফ্রেশ ও পরিষ্কার', 'Woody & oud': 'উডি ও উদ', 'Not sure': 'নিশ্চিত না', '3. How strong?': '৩. কতটা তীব্র?',
  'Any': 'যেকোনো', '4. Budget for 6 ml': '৪. ৬ ml-এর বাজেট', 'Up to 400 tk': '৪০০ টাকা পর্যন্ত', 'Up to 700 tk': '৭০০ টাকা পর্যন্ত', 'Our picks for you': 'আপনার জন্য আমাদের পছন্দ',
  'What customers say': 'কাস্টমাররা যা বলেন', 'Questions': 'প্রশ্ন ও উত্তর', '100% authentic': '১০০% অরিজিনাল', 'From the original bottle': 'অরিজিনাল বোতল থেকে',
  'Delivery all over Bangladesh': 'সারা বাংলাদেশে ডেলিভারি', 'Easy order on WhatsApp': 'হোয়াটসঅ্যাপে সহজ অর্ডার', '3 to 30 ml decants': '৩ থেকে ৩০ ml ডিক্যান্ট',
  'Ask us on WhatsApp': 'হোয়াটসঅ্যাপে জিজ্ঞেস করুন', 'Try before a full bottle': 'পুরো বোতলের আগে ট্রাই করুন', 'We confirm every order': 'প্রতিটি অর্ডার আমরা কনফার্ম করি', 'Inside and outside Sylhet': 'সিলেটের ভেতরে ও বাইরে', 'Your cart': 'আপনার কার্ট', 'Your order': 'আপনার অর্ডার', 'Your cart is empty.': 'আপনার কার্ট খালি।',
  'Select a size on any perfume, then tap Add to cart.': 'যেকোনো পারফিউমের সাইজ বেছে কার্টে যোগ করুন।', 'Browse perfumes': 'পারফিউম দেখুন',
  'Your details': 'আপনার তথ্য', 'Name': 'নাম', 'Phone Number': 'ফোন নম্বর', 'Address': 'ঠিকানা', 'Email': 'ইমেইল', '(optional)': '(ঐচ্ছিক)', 'House, road, area, city': 'বাসা, রোড, এলাকা, শহর',
  'Delivery Area': 'ডেলিভারি এলাকা', 'Inside Sylhet': 'সিলেটের ভেতরে', 'Outside Sylhet': 'সিলেটের বাইরে', 'Payment': 'পেমেন্ট', 'Pay the full amount now by bKash': 'এখনই বিকাশে পুরো টাকা দিন',
  'Delivery': 'ডেলিভারি', 'Total': 'মোট', 'Total to pay': 'মোট পরিশোধ', 'Free': 'ফ্রি', 'Choose area': 'এলাকা বাছুন', 'Have a coupon code?': 'কুপন কোড আছে?', 'Apply': 'প্রয়োগ করুন',
  'Remove': 'সরান', 'Order on WhatsApp': 'হোয়াটসঅ্যাপে অর্ডার করুন', 'Copy Full Order': 'পুরো অর্ডার কপি করুন', 'Saving your order…': 'অর্ডার সেভ হচ্ছে…', 'Start a new order': 'নতুন অর্ডার শুরু করুন',
  'Please enter your name.': 'আপনার নাম লিখুন।', 'Please enter your phone number.': 'আপনার ফোন নম্বর লিখুন।', 'Please enter a valid phone number, like 01XXXXXXXXX.': 'সঠিক ফোন নম্বর লিখুন, যেমন 01XXXXXXXXX।',
  'Please enter your delivery address.': 'ডেলিভারির ঠিকানা লিখুন।', 'Please choose Inside Sylhet or Outside Sylhet.': 'সিলেটের ভেতরে না বাইরে বাছুন।', 'Please enter a valid email address, or leave it empty.': 'সঠিক ইমেইল লিখুন, অথবা খালি রাখুন।',
  'Select a size first': 'আগে সাইজ বাছুন', 'Cart cleared': 'কার্ট খালি করা হয়েছে', 'Prices copied ✓': 'দাম কপি হয়েছে ✓', 'Link copied ✓': 'লিংক কপি হয়েছে ✓', 'Copy link': 'লিংক কপি করুন',
  'See all perfumes': 'সব পারফিউম দেখুন', 'All perfumes': 'সব পারফিউম', 'No products found.': 'কোনো পারফিউম পাওয়া যায়নি।', 'Loading perfumes…': 'পারফিউম লোড হচ্ছে…',
  'Premium perfume decants. 100% authentic.': 'প্রিমিয়াম পারফিউম ডিক্যান্ট। ১০০% অরিজিনাল।', 'Orders and questions on WhatsApp:': 'অর্ডার ও প্রশ্ন হোয়াটসঅ্যাপে:',
  'View cart': 'কার্ট দেখুন', 'Cart': 'কার্ট', 'Your name': 'আপনার নাম', 'We send you a WhatsApp message. Your number is only used for this.': 'আমরা হোয়াটসঅ্যাপে জানাবো। আপনার নম্বর শুধু এই কাজেই ব্যবহার হবে।',
  'Done ✓ We will message you on WhatsApp when it is back.': 'হয়েছে ✓ আবার এলে আমরা হোয়াটসঅ্যাপে জানাবো।', 'Summer Perfumes': 'গ্রীষ্মের পারফিউম', 'Winter Perfumes': 'শীতের পারফিউম',
  'Niche Perfumes': 'নিশ পারফিউম', 'Designer Perfumes': 'ডিজাইনার পারফিউম', 'Middle Eastern Perfumes': 'মিডল ইস্টার্ন পারফিউম', 'Close': 'বন্ধ করুন',
  'Are your perfumes original?': 'আপনাদের পারফিউম কি অরিজিনাল?', 'Yes. Every decant is filled from an original, 100% authentic bottle.': 'হ্যাঁ। প্রতিটি ডিক্যান্ট অরিজিনাল, ১০০% আসল বোতল থেকে ভরা হয়।',
  'Which sizes can I buy?': 'কোন কোন সাইজ পাওয়া যায়?', 'How much is delivery?': 'ডেলিভারি চার্জ কত?', 'How do I order?': 'কীভাবে অর্ডার করবো?', 'How do I pay?': 'কীভাবে পেমেন্ট করবো?',
  'Choose a size, tap Add to cart, open the cart, fill in your details and tap Order on WhatsApp. Then press send in WhatsApp.': 'সাইজ বেছে কার্টে যোগ করুন, কার্ট খুলে আপনার তথ্য দিন এবং "হোয়াটসঅ্যাপে অর্ডার করুন" চাপুন। তারপর হোয়াটসঅ্যাপে সেন্ড চাপুন।',
};
const BN_RE = [
  [/^Please tell us within (\d+) days? of delivery\.$/, 'ডেলিভারির $1 দিনের মধ্যে আমাদের জানান।'],
  [/^Saved \((\d+)\)$/, 'সেভ করা ($1)'],
  [/^Cart \((\d+)\)$/, 'কার্ট ($1)'], [/^(\d+) perfumes?$/, '$1টি পারফিউম'], [/^Add (\d+)ml to cart$/, '$1ml কার্টে যোগ করুন'], [/^Your order \((\d+)\)$/, 'আপনার অর্ডার ($1)'],
  [/^Subtotal \((\d+) items?\)$/, 'সাবটোটাল ($1টি)'], [/^Delivery \(Inside Sylhet\)$/, 'ডেলিভারি (সিলেটের ভেতরে)'], [/^Delivery \(Outside Sylhet\)$/, 'ডেলিভারি (সিলেটের বাইরে)'],
  [/^Discount \((\d+(?:\.\d+)?)%\)$/, 'ছাড় ($1%)'], [/^Get (\d+(?:\.\d+)?)% off the perfumes$/, 'পারফিউমে $1% ছাড়'], [/^Get (\d+(?:\.\d+)?)% off the perfumes · save (\d+) tk$/, 'পারফিউমে $1% ছাড় · $2 টাকা বাঁচান'],
  [/^Add (\d+) tk more for free delivery all over Bangladesh\.$/, 'আরও $1 টাকার পারফিউম নিলে সারা বাংলাদেশে ফ্রি ডেলিভারি।'], [/^You get free delivery ✓$/, 'আপনি ফ্রি ডেলিভারি পাচ্ছেন ✓'],
  [/^Pay (\d+) tk by bKash\. After you order, we send you our payment details on WhatsApp\.$/, 'বিকাশে $1 টাকা দিন। অর্ডারের পর আমরা হোয়াটসঅ্যাপে পেমেন্টের তথ্য পাঠাবো।'],
  [/^([\d.]+)\/ml$/, '$1/ml'], [/^(\d+) items?$/, '$1টি আইটেম'], [/^Try a few, save (\d+)%$/, 'কয়েকটা ট্রাই করুন, $1% বাঁচান'], [/^6 ml from (\d+) tk$/, '৬ ml $1 টাকা থেকে'], [/^Added ✓ (.+)$/, 'যোগ হয়েছে ✓ $1'], [/^Set discount \((.+)\)$/, 'সেট ছাড় ($1)'],
  [/^Coupon (\S+)$/, 'কুপন $1'], [/^Free from (\d+) tk$/, '$1 টাকা থেকে ফ্রি'], [/^Inside Sylhet (\d+) tk, outside Sylhet (\d+) tk\.(?: Free delivery all over Bangladesh when your perfumes cost (\d+) tk or more\.)?$/, (m, a, b, c) => `সিলেটের ভেতরে ${a} টাকা, বাইরে ${b} টাকা।` + (c ? ` ${c} টাকা বা তার বেশি পারফিউম নিলে সারা বাংলাদেশে ফ্রি ডেলিভারি।` : '')],
  [/^After you order, we send you our bKash payment details on WhatsApp\.(?: Pay the full amount now and get (\d+(?:\.\d+)?)% off the perfumes\.)?$/, (m, a) => 'অর্ডারের পর আমরা হোয়াটসঅ্যাপে বিকাশ পেমেন্টের তথ্য পাঠাবো।' + (a ? ` এখনই পুরো টাকা দিলে পারফিউমে ${a}% ছাড়।` : '')],
  [/^([\d, ]+) ml\. Every perfume shows its price for each size\.$/, '$1 ml। প্রতিটি পারফিউমে প্রতি সাইজের দাম দেওয়া আছে।'],
];
function bnText(t){
  const k = t.trim(); if(!k) return null;
  if(Object.prototype.hasOwnProperty.call(BN, k)) return t.replace(k, BN[k]);
  for(const [re, to] of BN_RE){ if(re.test(k)) return t.replace(k, k.replace(re, to)); }
  return null;
}
function translateTree(root){
  if(LANG !== 'bn' || !root) return;
  const els = root.nodeType === 1 ? [root, ...root.querySelectorAll('*')] : [];
  els.forEach(el => {
    if(el.closest && el.closest('[data-notr], script, style, .pname, .n, h2 .pname, #pmName')) return;
    if(el.classList && (el.classList.contains('freehint') || el.id === 'payNote')){ const v = bnText(el.textContent); if(v){ el.textContent = v; return; } }
    ['placeholder', 'aria-label', 'title'].forEach(a => { const v = el.getAttribute && el.getAttribute(a); if(v){ const x = bnText(v); if(x) el.setAttribute(a, x); } });
    el.childNodes.forEach(n => { if(n.nodeType === 3){ const x = bnText(n.nodeValue); if(x && x !== n.nodeValue) n.nodeValue = x; } });
  });
}
if(LANG === 'bn'){
  document.documentElement.lang = 'bn';
  document.body.classList.add('bn');
  let busyTr = false;
  new MutationObserver(ms => { if(busyTr) return; busyTr = true; try { ms.forEach(m => { if(m.type === 'characterData'){ const x = bnText(m.target.nodeValue); if(x && x !== m.target.nodeValue) m.target.nodeValue = x; } else m.addedNodes.forEach(n => { if(n.nodeType === 1) translateTree(n); else if(n.nodeType === 3){ const x = bnText(n.nodeValue); if(x && x !== n.nodeValue) n.nodeValue = x; } }); if(m.type === 'childList' && m.target.nodeType === 1 && (m.target.classList.contains('freehint') || m.target.id === 'payNote')) translateTree(m.target); }); } finally { busyTr = false; } })
    .observe(document.body, {childList: true, subtree: true, characterData: true});
  translateTree(document.body);
}
document.querySelectorAll('[data-lang]').forEach(b => {
  b.textContent = LANG === 'bn' ? 'English' : 'বাংলা';
  b.setAttribute('data-notr', '');
  b.addEventListener('click', () => { try { localStorage.setItem('khayr_lang', LANG === 'bn' ? 'en' : 'bn'); } catch(e){} location.reload(); });
});

/* ---------- Meta Pixel (only if a Pixel ID is set in site-config.js) ---------- */
const PIXEL = String(SITE.metaPixelId || '').replace(/\D/g, '');
const adsOff = () => { try { return localStorage.getItem('khayr_ads_off') === '1'; } catch(e){ return false; } };
window.__khayrEvents = window.__khayrEvents || [];
/* v9: "advanced matching" like Shopify/WordPress. Details the customer typed before (saved on this phone only)
   are turned into one-way codes (SHA-256) here, so Meta can match the visitor to a Facebook account.
   The real name, phone or email never leaves the phone in plain text for these events. */
const SERVER_EVENTS = ['ViewContent', 'AddToCart', 'InitiateCheckout', 'Search', 'Contact'];
let pxReady = false, pxWait = [], pxUD = {};
async function sha(v){
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch(e){ return ''; }
}
function visitorId(){
  let v = ''; try { v = localStorage.getItem('khayr_vid') || ''; } catch(e){}
  if(!/^[a-z0-9-]{10,60}$/.test(v)){
    v = 'v' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
    try { localStorage.setItem('khayr_vid', v); } catch(e){}
  }
  return v;
}
async function matchData(){
  let c = {}; try { c = JSON.parse(localStorage.getItem('khayr_customer') || '{}') || {}; } catch(e){}
  let ph = String(c.phone || '').replace(/\D/g, ''); if(ph.startsWith('880')) ph = ph.slice(2); if(ph.length === 10 && ph[0] === '1') ph = '0' + ph;
  const ud = {country: await sha('bd')};
  if(/^01[3-9]\d{8}$/.test(ph)){ ud.ph = await sha('880' + ph.slice(1)); ud.external_id = await sha(ph); }   // same as the server
  else ud.external_id = await sha(visitorId());
  const em = String(c.email || '').trim().toLowerCase(); if(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) ud.em = await sha(em);
  const words = String(c.name || '').toLowerCase().normalize('NFKC').replace(/[^\p{L}\s]/gu, ' ').split(/\s+/)
    .filter(w => w && !['md', 'mohammad', 'mohammed', 'muhammad', 'mr', 'mrs', 'ms', 'miss', 'mst'].includes(w));
  if(words.length) ud.fn = await sha(words[0]);
  if(words.length > 1) ud.ln = await sha(words[words.length - 1]);
  if(c.area === 'Inside Sylhet') ud.ct = await sha('sylhet');
  Object.keys(ud).forEach(k => { if(!ud[k]) delete ud[k]; });
  return ud;
}
async function initPixel(){
  if(!PIXEL || adsOff()) return;
  /* Meta's standard loader */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  try { pxUD = await matchData(); } catch(e){ pxUD = {}; }
  window.fbq('init', PIXEL, pxUD);
  pxReady = true;
  px('PageView');
  const w = pxWait; pxWait = []; w.forEach(a => px(...a));
}
const newEventId = name => name.toLowerCase().slice(0, 4) + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
function px(name, data, eventId, custom){
  if(!PIXEL || adsOff()) return;
  if(!pxReady){ pxWait.push([name, data, eventId, custom]); return; }
  if(!eventId && !custom && SERVER_EVENTS.includes(name)) eventId = newEventId(name);
  window.__khayrEvents.push({name, data: data || {}, eventId: eventId || null});
  try {
    if(window.fbq){
      const args = [custom ? 'trackCustom' : 'track', name];
      if(data) args.push(data); else if(eventId) args.push({});
      if(eventId) args.push({eventID: eventId});
      window.fbq.apply(window, args);
    }
  } catch(e){}
  /* v9: the same event also goes from our server (Conversions API), with the same event id,
     so Facebook counts it once but still gets it when an ad blocker or iPhone stops the Pixel. */
  if(eventId && SERVER_EVENTS.includes(name) && API) sendServerEvent(name, data || {}, eventId);
}
function sendServerEvent(name, data, eventId){
  const body = {action: 'track', event: name, eventId, pageUrl: location.href, fbp: cookie('_fbp'), fbc: fbcValue(), ud: pxUD,
    ids: (data.content_ids || []).slice(0, 30), contents: (data.contents || []).slice(0, 30), value: Number(data.value) || 0,
    name: String(data.content_name || '').slice(0, 120), search: String(data.search_string || '').slice(0, 100), numItems: Number(data.num_items) || 0};
  try {
    const s = JSON.stringify(body);
    fetch(API, {method: 'POST', headers: {'Content-Type': 'application/json', apikey: SB.anonKey}, body: s, keepalive: s.length < 60000}).catch(() => {});
  } catch(e){}
}
const pxItem = (p, size, qty) => ({id: p.id, quantity: qty || 1, item_price: priceOf(p, size)});

/* ---------- where the visitor came from (kept 7 days, sent with the order) ---------- */
function cookie(name){ const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; }
function captureAttribution(){
  const u = new URLSearchParams(location.search), now = Date.now();
  let a = ls.get('khayr_attr', null);
  if(a && now - (a.at || 0) > 7 * 864e5) a = null;
  const fresh = {};
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'].forEach(k => { const v = u.get(k); if(v) fresh[k] = v.slice(0, 300); });
  if(Object.keys(fresh).length || !a){
    let ref = '';
    try { if(document.referrer && new URL(document.referrer).host !== location.host) ref = document.referrer.slice(0, 300); } catch(e){}
    a = {at: now, data: {...fresh, landing_page: (location.pathname + location.search).slice(0, 300), referrer: ref, first_seen: new Date(now).toISOString()}};
    ls.set('khayr_attr', a);
  }
  if(fresh.fbclid) ls.set('khayr_fbc', {v: `fb.1.${now}.${fresh.fbclid}`, at: now});
  return a.data;
}
const ATTR = captureAttribution();
function fbcValue(){
  const c = cookie('_fbc'); if(c) return c;
  const s = ls.get('khayr_fbc', null);
  return s && Date.now() - s.at < 90 * 864e5 ? s.v : '';
}

/* ---------- data ---------- */
const GEN_DEFAULTS = {whatsapp:'8801569126359', orderNote:'', sizesEnabled:{}, houseOrder:[], payment:{advance:150, fullDiscountPct:0, qrs:[]},
                      delivery:{insideSylhet:50, outsideSylhet:100, freeOver:3000},
                      /* v10 */
                      topbar: ['We fill your decant after you order', 'Money back if it is not original', 'Cash on delivery', 'Free replacement if a bottle leaks or breaks'],
                      messenger: {on: true, page: 'khayrbd'}, social: [{type: 'facebook', url: 'https://www.facebook.com/khayrbd'}], reviewPhotos: [], returnDays: ''};
let GEN = {...GEN_DEFAULTS};
let ALL = [];                                       // every visible perfume
let products = [];                                  // perfumes with at least one size shown

const priceOf = (p, s) => p ? Number((p.prices || {})[s]) || 0 : 0;
const sizeOn = s => (GEN.sizesEnabled || {})[s] !== false;
const activeSizes = () => SIZES.filter(sizeOn);
const sizesFor = p => activeSizes().filter(s => (p.sizes || {})[s] !== false && priceOf(p, s) > 0);
const sizeOut = (p, s) => !!(p.stock_out || (p.stock_out_sizes || {})[s] === true || (p.auto_out || {})[s] === true);
const canBuy = (p, s) => !!p && sizesFor(p).includes(s) && !sizeOut(p, s);
const buySizes = p => sizesFor(p).filter(s => !sizeOut(p, s));
const allOut = p => !buySizes(p).length;
const findP = id => ALL.find(p => p.id === id);
const imgUrl = path => path && SB_URL ? `${SB_URL}/storage/v1/object/public/${BUCKET}/${String(path).split('/').map(encodeURIComponent).join('/')}` : '';
const pct = () => 0;   // v9: the full-payment discount is removed (the owner no longer gives it)
const dnum = (v, d) => { const n = Number(v); return v === undefined || v === null || v === '' || !Number.isFinite(n) ? d : Math.max(0, Math.round(n)); };
const freeOver = () => dnum((GEN.delivery || {}).freeOver, 3000);
/* Delivery charge, the same rule as the server: free when the perfumes cost freeOver or more. */
function deliveryFee(area, sub){
  const d = GEN.delivery || {};
  if(area !== 'Inside Sylhet' && area !== 'Outside Sylhet') return null;
  if(freeOver() > 0 && sub >= freeOver()) return 0;
  return area === 'Inside Sylhet' ? dnum(d.insideSylhet, 50) : dnum(d.outsideSylhet, 100);
}
const fullDiscount = sub => Math.round(sub * pct() / 100);

async function fetchData(){
  if(sbReady()){
    try{
      const h = {apikey: SB.anonKey, Authorization: 'Bearer ' + SB.anonKey};
      const base = SB_URL + '/rest/v1/';
      const v8 = 'id,product_type,number,name,house,category,gender,season,similar_to,fragrantica_url,scent,notes,longevity,strength,occasions,badge,prices,sizes,visible,image_path,thumb_path,stock_out,stock_out_sizes,auto_out';
      const v6 = 'id,product_type,number,name,house,category,gender,season,similar_to,fragrantica_url,prices,sizes,visible,image_path,thumb_path,stock_out,stock_out_sizes,auto_out';
      const v5 = 'id,product_type,number,name,brand,house,category,prices,sizes,visible,image_path,thumb_path,stock_out,stock_out_sizes,auto_out';
      const v4 = 'id,product_type,number,name,brand,category,prices,sizes,visible,image_path,thumb_path';
      const get = c => fetch(base + 'products?select=' + c + '&visible=eq.true&order=number.asc', {headers: h, cache: 'no-store'});
      const [pr0, st] = await Promise.all([get(v8), fetch(base + 'settings?select=id,data&id=eq.1', {headers: h, cache: 'no-store'})]);
      let pr = pr0;
      if(pr.status === 400) pr = await get(v6);                                   // database not upgraded yet
      if(pr.status === 400) pr = await get(v5);
      if(pr.status === 400) pr = await get(v4);
      if(pr.ok && st.ok){
        const list = await pr.json(), rows = await st.json();
        if(list.length) return {settings: (rows[0] && rows[0].data) || {}, products: list};
      }
    }catch(e){ /* use the backup list below */ }
  }
  const r = await fetch('products.json?v=' + Date.now(), {cache: 'no-store'});
  if(!r.ok) throw new Error('load');
  const j = await r.json();
  if(j.settings && 'perfume' in j.settings) j.settings = j.settings.perfume || {};
  return j;
}
function applyData(data){
  const s = data.settings || {};
  GEN = {...GEN_DEFAULTS, ...s, payment: {...GEN_DEFAULTS.payment, ...(s.payment || {})}, delivery: {...GEN_DEFAULTS.delivery, ...(s.delivery || {})},
         messenger: {...GEN_DEFAULTS.messenger, ...(s.messenger || {})}};
  ALL = (data.products || [])
    .filter(p => (p.product_type || 'perfume') === 'perfume' && p.visible !== false)
    .map((p, i) => ({...p, no: Number(p.number) || (i + 1), prices: p.prices || {}, sizes: p.sizes || {}, category: normCat(p.category),
                     house: clean(p.house), gender: p.gender || '', season: p.season || '', similar_to: clean(p.similar_to), fragrantica_url: /^https:\/\//.test(p.fragrantica_url || '') ? p.fragrantica_url : '',
                     scent: Array.isArray(p.scent) ? p.scent.filter(scLabel) : [], notes: clean(p.notes), longevity: LONGEVITY[p.longevity] ? p.longevity : '',
                     strength: STRENGTH[p.strength] ? p.strength : '', occasions: Array.isArray(p.occasions) ? p.occasions.filter(o => OCCASIONS[o]) : [],
                     badge: p.badge === 'bestseller' || p.badge === 'new' ? p.badge : '',
                     stock_out_sizes: p.stock_out_sizes || {}, auto_out: p.auto_out || {}}));
  products = ALL.filter(p => sizesFor(p).length);
}

/* Bottle Photos (table gallery_photos). Empty list if not set up yet. */
async function fetchGallery(){
  if(!sbReady()) return [];
  try{
    const r = await fetch(SB_URL + '/rest/v1/gallery_photos?select=id,kind,image_path,thumb_path,caption,sort_order&kind=eq.decant&visible=eq.true&order=sort_order.asc,created_at.asc',
      {headers: {apikey: SB.anonKey, Authorization: 'Bearer ' + SB.anonKey}, cache: 'no-store'});
    if(!r.ok) return [];
    const list = await r.json();
    return Array.isArray(list) ? list.filter(g => g && g.image_path) : [];
  }catch(e){ return []; }
}

/* ---------- start ---------- */
const params = new URLSearchParams(location.search);
async function load(){
  initPixel();
  let data;
  try { data = await fetchData(); }
  catch(e){ const g = $('grid'); if(g) g.innerHTML = '<div class="loading">The price list could not load. Check your internet and refresh the page.</div>'; return; }
  applyData(data);
  const wa = String(GEN.whatsapp).replace(/\D/g, '');
  document.querySelectorAll('[data-wa]').forEach(a => { a.href = 'https://wa.me/' + wa; a.textContent = '+' + wa; });
  loadCart();
  if(PAGE === 'perfume'){ initShop(); renderInfo(); }
  else if(PAGE === 'bottles') initBottles();
  if($('trustFree') && freeOver() > 0) $('trustFree').textContent = `Free from ${price(freeOver())} tk`;
  if($('waFloat')) $('waFloat').href = waUrl('Hi KHAYR, I have a question.');
  renderTopbar(); renderSocial(); renderReturns();
  if($('msFloat')){ $('msFloat').hidden = !msOn(); if(msOn()) $('msFloat').href = msUrl('Hi KHAYR, I have a question.'); }
  updateCartUI();
  restoreLastAction();
}

/* ================= PERFUME LIST ================= */
const PRESET = (() => { const p = window.KHAYR_PRESET || {}; const o = {}; if(['summer', 'winter'].includes(p.season)) o.season = p.season; if(['niche', 'designer', 'middle_eastern'].includes(p.cat)) o.cat = p.cat; return Object.keys(o).length ? o : null; })();
const PCAT = () => (PRESET && PRESET.cat) || 'all', PSEASON = () => (PRESET && PRESET.season) || 'all';
const state = {q:'', size:'all', cat:PCAT(), house:'all', gender:'all', season:PSEASON(), smell:'all', sort:'number', sel:{}, touched:{}};
function houseRanks(){
  const order = (GEN.houseOrder || []).map(houseKey);
  const names = [...new Set(products.map(p => p.house).filter(Boolean))];
  const byKey = new Map();
  names.forEach(n => { const k = houseKey(n); if(!byKey.has(k)) byKey.set(k, n); });
  const keys = [...byKey.keys()].sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if(ia > -1 || ib > -1) return (ia > -1 ? ia : 1e6) - (ib > -1 ? ib : 1e6) || a.localeCompare(b);
    return a.localeCompare(b);
  });
  return {keys, label: k => byKey.get(k) || 'Other', rank: k => { const i = keys.indexOf(k); return i > -1 ? i : 1e6; }};
}
let HR = null;
function initShop(){
  HR = houseRanks();
  const pid = params.get('product');
  const cat = normCat(params.get('category'));
  if(!PRESET && cat && CATS.some(c => c[0] === cat)) state.cat = cat;
  const size = Number(params.get('size'));
  if(size && activeSizes().includes(size)) state.size = size;
  const gq = String(params.get('gender') || '').toLowerCase(), sq = String(params.get('season') || '').toLowerCase();
  if(!PRESET && (sq === 'summer' || sq === 'winter')) state.season = sq;
  const smq = String(params.get('smell') || '').toLowerCase(); if(scLabel(smq)) state.smell = smq;
  if(params.get('q')){ state.q = params.get('q').slice(0, 80); $('q').value = state.q; $('searchBox').classList.add('has'); }
  if(!products.length){
    $('tools').hidden = true; $('catFilter').hidden = true; $('gsFilter').hidden = true; $('metaRow').hidden = true;
    $('grid').innerHTML = `<div class="empty"><strong>Perfumes are coming soon.</strong><p>Please check back shortly, or message us on WhatsApp.</p></div>`;
    return;
  }
  buildFilters();
  bindShop();
  render();
  if(pid){
    const p = products.find(x => x.id === pid);
    if(p) showProduct(p);
    else toast('This product is not available right now.');
  }
}
function showProduct(p){
  if(!visibleList().includes(p)){ state.q = ''; state.size = 'all'; state.cat = PCAT(); state.house = 'all'; state.gender = 'all'; state.season = PSEASON(); $('q').value = ''; $('searchBox').classList.remove('has'); buildFilters(); render(); }
  const el = document.querySelector(`[data-card="${CSS.escape(p.id)}"]`);
  if(el){
    el.classList.add('hl');
    setTimeout(() => el.scrollIntoView({block: 'center', behavior: 'smooth'}), 60);
    setTimeout(() => { const e2 = document.querySelector(`[data-card="${CSS.escape(p.id)}"]`); if(e2) e2.classList.remove('hl'); }, 4500);
  }
  viewContent(p);
}
function viewContent(p){
  const sizes = buySizes(p);
  px('ViewContent', {content_ids: [p.id], content_type: 'product', content_name: p.name, content_category: p.house || 'perfume',
    value: sizes.length ? Math.min(...sizes.map(s => priceOf(p, s))) : 0, currency: 'BDT'});
}
function buildFilters(){
  const sizes = activeSizes();
  if(state.size !== 'all' && !sizes.includes(state.size)) state.size = 'all';
  $('sizeFilter').innerHTML = ['all', ...sizes].map(s =>
    `<button class="chip" type="button" data-size="${s}" aria-pressed="${s === state.size}">${s === 'all' ? 'All sizes' : s + 'ml'}</button>`).join('');
  const cats = CATS.filter(([c]) => products.some(p => p.category === c) || state.cat === c);
  $('catFilter').hidden = !cats.length || !!(PRESET && PRESET.cat);
  $('catFilter').innerHTML = [['all', 'All Perfumes'], ...cats].map(([c, label]) =>
    `<button class="chip" type="button" data-cat="${c}" aria-pressed="${c === state.cat}">${esc(label)}</button>`).join('');
  const gs = [...SEASONS.filter(([v]) => v !== 'all' && products.some(p => p.season === v)).map(([v, l]) => ['s:' + v, l])];
  $('gsFilter').hidden = !gs.length || !!(PRESET && PRESET.season);
  $('gsFilter').innerHTML = gs.map(([k, l]) => `<button class="chip" type="button" data-gs="${k}" aria-pressed="${k === 'g:' + state.gender || k === 's:' + state.season}">${esc(l)}</button>`).join('');
  const smells = SCENTS.filter(([k]) => products.some(p => p.scent.includes(k)));
  if(state.smell !== 'all' && !smells.some(x => x[0] === state.smell)) state.smell = 'all';
  if($('smellFilter')){
    $('smellFilter').hidden = !smells.length;
    $('smellFilter').innerHTML = smells.length ? `<span class="flbl">Smell:</span>` + smells.map(([k, l]) => `<button class="chip" type="button" data-smell="${k}" aria-pressed="${state.smell === k}">${esc(l)}</button>`).join('') : '';
  }
  const hasOther = products.some(p => !p.house);
  const opts = HR.keys.map(k => [k, HR.label(k)]).concat(hasOther && HR.keys.length ? [['other', 'Other']] : []);
  $('houseSel').hidden = true;    // one list for everyone, no house groups
  $('houseSel').innerHTML = `<option value="all">All houses</option>` + opts.map(([k, l]) => `<option value="${esc(k)}" ${k === state.house ? 'selected' : ''}>${esc(l)}</option>`).join('');
  $('sort').value = state.sort;
}
function syncUrl(){
  try{
    const u = new URLSearchParams(location.search);
    u.delete('product');
    state.cat !== PCAT() ? u.set('category', state.cat) : u.delete('category');
    state.size !== 'all' ? u.set('size', state.size) : u.delete('size');
    state.house !== 'all' ? u.set('house', state.house === 'other' ? 'other' : HR.label(state.house)) : u.delete('house');
    state.gender !== 'all' ? u.set('gender', state.gender) : u.delete('gender');
    state.season !== PSEASON() ? u.set('season', state.season) : u.delete('season');
    state.smell !== 'all' ? u.set('smell', state.smell) : u.delete('smell');
    clean(state.q) ? u.set('q', clean(state.q)) : u.delete('q');
    const q = u.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
  }catch(e){}
}
function clearFilters(){
  state.q = ''; state.size = 'all'; state.cat = PCAT(); state.house = 'all'; state.gender = 'all'; state.season = PSEASON(); state.smell = 'all'; state.touched = {};
  $('q').value = ''; $('searchBox').classList.remove('has');
  buildFilters(); render(); syncUrl();
}
function bindShop(){
  $('sizeFilter').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if(!b) return;
    state.size = b.dataset.size === 'all' ? 'all' : Number(b.dataset.size);
    state.touched = {};
    [...$('sizeFilter').children].forEach(x => x.setAttribute('aria-pressed', x === b));
    render(); syncUrl();
  });
  $('catFilter').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if(!b) return;
    state.cat = b.dataset.cat;
    [...$('catFilter').children].forEach(x => x.setAttribute('aria-pressed', x === b));
    render(); syncUrl();
  });
  $('houseSel').addEventListener('change', e => { state.house = e.target.value; render(); syncUrl(); });
  if($('smellFilter')) $('smellFilter').addEventListener('click', e => {
    const b = e.target.closest('[data-smell]'); if(!b) return;
    state.smell = state.smell === b.dataset.smell ? 'all' : b.dataset.smell;
    buildFilters(); render(); syncUrl();
  });
  $('gsFilter').addEventListener('click', e => {
    const b = e.target.closest('[data-gs]'); if(!b) return;
    const [k, v] = b.dataset.gs.split(':');
    if(k === 'g') state.gender = state.gender === v ? 'all' : v; else state.season = state.season === v ? 'all' : v;
    buildFilters(); render(); syncUrl();
  });
  let qt;
  $('q').addEventListener('input', e => {
    $('searchBox').classList.toggle('has', !!e.target.value);
    searchEvent(e.target.value);
    clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value; render(); syncUrl(); }, 80);
  });
  $('q').addEventListener('keydown', e => { if(e.key === 'Enter') e.target.blur(); });
  $('clearQ').addEventListener('click', e => { e.preventDefault(); $('q').value = ''; state.q = ''; $('searchBox').classList.remove('has'); render(); syncUrl(); $('q').focus(); });
  $('sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
  $('clearF').addEventListener('click', clearFilters);
  const grid = $('grid');
  grid.addEventListener('click', e => {
    const z = e.target.closest('[data-pm]');
    if(z){ openPM(z.dataset.pm, !!z.dataset.notify); return; }
    const v = e.target.closest('.box[data-size]');
    if(v){ if(v.disabled) return; selectSize(v.dataset.id, Number(v.dataset.size)); return; }
    const a = e.target.closest('[data-add]');
    if(a){
      if(a.disabled) return;
      const card = a.closest('.card'), on = card.querySelector('.box[aria-checked="true"]');
      if(!on){
        const bx = card.querySelector('.boxes'); bx.classList.remove('need'); void bx.offsetWidth; bx.classList.add('need');
        toast('Select a size first'); return;
      }
      addToCart(a.dataset.add, Number(on.dataset.size)); return;
    }
    const c = e.target.closest('[data-copy]');
    if(c) copyPrices(c.dataset.copy);
  });
  grid.addEventListener('keydown', e => {
    const v = e.target.closest('.box[data-size]'); if(!v) return;
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const p = findP(v.dataset.id), sizes = buySizes(p);
    if(!sizes.length) return;
    const i = sizes.indexOf(Number(v.dataset.size)) + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1);
    selectSize(p.id, sizes[(i + sizes.length) % sizes.length], true);
  });
  /* broken or missing image -> neutral placeholder, never a broken icon */
  grid.addEventListener('error', e => {
    if(e.target.tagName !== 'IMG') return;
    const pic = e.target.closest('.pic'); if(!pic) return;
    e.target.outerHTML = '<div class="ph"></div>';
  }, true);
}
let searchTimer, lastSearch = '';
function searchEvent(v){
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = clean(v);
    if(q.length >= 2 && q !== lastSearch){ lastSearch = q; px('Search', {search_string: q, content_category: 'perfume'}); }
  }, 1500);
}
function searchList(list, raw){
  const q = norm(raw), words = q.split(' ').filter(Boolean);
  if(!words.length) return list;
  return list.filter(p => {
    const hay = norm(`${p.name} ${p.house} ${p.similar_to || ''} ${catLabel(p.category)} ${sLabel(p.season)} ${p.scent.map(scLabel).join(' ')} ${p.notes}`);
    return words.every(w => hay.includes(w)) || hay.replace(/ /g, '').includes(words.join(''));
  });
}
const hk = p => p.house ? houseKey(p.house) : 'other';
function visibleList(){
  let list = searchList(products, state.q).filter(p => {
    if(state.size !== 'all' && !sizesFor(p).includes(state.size)) return false;
    if(state.cat !== 'all' && p.category !== state.cat) return false;
    if(state.house !== 'all' && hk(p) !== state.house) return false;
    if(state.gender !== 'all' && p.gender !== state.gender) return false;
    if(state.season !== 'all' && !(p.season === state.season || p.season === 'all')) return false;
    if(state.smell !== 'all' && !p.scent.includes(state.smell)) return false;
    return true;
  });
  const ref = p => { const s = state.size !== 'all' ? [state.size] : (buySizes(p).length ? buySizes(p) : sizesFor(p)); return Math.min(...s.map(z => priceOf(p, z))); };
  if(state.sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
  else if(state.sort === 'low') list.sort((a, b) => ref(a) - ref(b));
  else if(state.sort === 'high') list.sort((a, b) => ref(b) - ref(a));
  else if(state.sort === 'popular') list.sort((a, b) => (a.badge === 'bestseller' ? 0 : a.badge === 'new' ? 1 : 2) - (b.badge === 'bestseller' ? 0 : b.badge === 'new' ? 1 : 2) || a.no - b.no);
  else list.sort((a, b) => a.no - b.no);    // your list order, 1 to 100 (new ones at the end)
  return list;
}
function cardHTML(p){
  const cols = activeSizes(), avail = sizesFor(p), buy = buySizes(p), out = !buy.length;
  let sel = state.sel[p.id];
  if(state.size !== 'all' && buy.includes(state.size) && !state.touched[p.id]) sel = state.size;
  if(!buy.includes(sel)) sel = null;
  const inCart = !!sel && cart.some(i => i.id === p.id && i.size === sel);
  const thumb = imgUrl(p.thumb_path || p.image_path), full = imgUrl(p.image_path || p.thumb_path);
  const badge = (out ? '<span class="outbadge">Stock Out</span>' : '') + (p.badge ? `<span class="pbadge ${p.badge}">${p.badge === 'bestseller' ? 'Bestseller' : 'New'}</span>` : '');
  const pic = `<button class="pic zoom" type="button" data-pm="${esc(p.id)}" aria-label="See all sizes and prices of ${esc(p.name)}">${thumb ? `<img src="${esc(thumb)}" alt="${esc(p.name)}" width="400" height="400" loading="lazy" decoding="async">` : '<div class="ph"></div>'}${badge}</button>`;
  const boxes = cols.map(s => {
    if(!avail.includes(s)) return `<span class="box gap" aria-hidden="true"></span>`;
    if(sizeOut(p, s)) return `<button class="box out" type="button" disabled aria-disabled="true" data-id="${esc(p.id)}" data-size="${s}" aria-label="${s}ml, out of stock"><span class="ml">${s}ml</span><span class="pr">Out</span></button>`;
    return `<button class="box" type="button" role="radio" aria-checked="${s === sel}" data-id="${esc(p.id)}" data-size="${s}" aria-label="${s}ml, ${price(priceOf(p, s))}" tabindex="${(sel ? s === sel : s === buy[0]) ? 0 : -1}"><span class="ml">${s}ml</span><span class="pr">${price(priceOf(p, s))}</span></button>`;
  }).join('');
  const cat = catLabel(p.category), tags = [cat, sLabel(p.season), ...p.scent.slice(0, 2).map(scLabel)].filter(Boolean);
  return `<article class="card ${out ? 'is-out' : ''}" data-card="${esc(p.id)}" id="p-${esc(p.id)}">
    ${pic}
    <div class="info">
      <div class="head">
        <div>${p.house ? `<div class="no">${esc(p.house)}</div>` : ''}<h2><button class="pname" type="button" data-pm="${esc(p.id)}">${esc(p.name)}</button></h2>${p.similar_to ? `<div class="brand">Similar to ${esc(p.similar_to)}</div>` : ''}${tags.map(t => `<span class="tag">${esc(t)}</span>`).join(' ')}</div>
        <button class="copy" type="button" data-copy="${esc(p.id)}" aria-label="Copy prices for ${esc(p.name)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>Copy</button>
      </div>
      <div class="boxes" role="radiogroup" aria-label="Choose size for ${esc(p.name)}" style="grid-template-columns:repeat(${Math.max(cols.length, 1)},minmax(0,1fr))">${boxes}</div>
      ${out ? `<button class="add notify" type="button" data-pm="${esc(p.id)}" data-notify="1">Notify me when back</button>` : `<button class="add ${inCart ? 'done' : ''}" type="button" data-add="${esc(p.id)}">${inCart ? 'Added ✓' : sel ? `Add ${sel}ml to cart` : 'Add to cart'}</button>`}
    </div>
  </article>`;
}
function render(){
  const list = visibleList();
  const filtered = !!clean(state.q) || state.size !== 'all' || state.cat !== PCAT() || state.house !== 'all' || state.gender !== 'all' || state.season !== PSEASON() || state.smell !== 'all';
  renderExtras(filtered);
  $('clearF').hidden = !filtered;
  $('count').textContent = `${list.length} ${list.length === 1 ? 'perfume' : 'perfumes'}`;
  if(!list.length){
    $('grid').innerHTML = PRESET && !clean(state.q) && state.size === 'all' ? `<div class="empty"><strong>No perfumes here right now.</strong><p>Please check back soon, or see all our perfumes.</p><a href="${esc(new URL('../../', location.href).href)}">See all perfumes</a></div>` : `<div class="empty"><strong>No products found.</strong><p>${clean(state.q) ? 'Try a shorter name or the house name.' : 'Nothing matches these filters right now.'}</p><button type="button" data-clear>Clear Filters</button></div>`;
    const cb = $('grid').querySelector('[data-clear]'); if(cb) cb.onclick = clearFilters;
    return;
  }
  $('grid').innerHTML = list.map(cardHTML).join('');
}
function refreshCard(id){
  const el = document.querySelector(`[data-card="${CSS.escape(id)}"]`), p = findP(id);
  if(el && p) el.outerHTML = cardHTML(p);
}
function selectSize(id, size, focus){
  state.sel[id] = size; state.touched[id] = true;
  refreshCard(id);
  if(focus){ const b = document.querySelector(`[data-card="${CSS.escape(id)}"] .box[data-size="${size}"]`); if(b) b.focus(); }
}
async function copyPrices(id){
  const p = findP(id);
  const text = `${p.name}\n` + sizesFor(p).map(s => `${s}ml — ${sizeOut(p, s) ? 'Stock out' : price(priceOf(p, s))}`).join('\n');
  toast(await copyText(text) ? 'Prices copied ✓' : 'Copy failed. Press and hold to copy.');
}

/* ---------- product popup: big photo + every size and price ---------- */
let pmId = null, pmReturn = null;
function pmHTML(p){
  const sizes = sizesFor(p);
  return sizes.map(s => {
    const out = sizeOut(p, s), inCart = cart.find(i => i.id === p.id && i.size === s);
    return `<div class="pmc ${out ? 'out' : ''}"><span class="ml">${s} ml</span><b>${out ? '—' : price(priceOf(p, s))}</b><small>${out ? 'Stock Out' : 'tk'}</small>${out ? '' : `<small class="pml">${perMl(p, s)}/ml</small>`}
      ${out ? `<button type="button" class="pmadd notify" data-pmnotify="${s}" aria-label="Notify me when ${s}ml of ${esc(p.name)} is back">Notify me</button>`
            : `<button type="button" class="pmadd ${inCart ? 'in' : ''}" data-pmadd="${s}" aria-label="Add ${s}ml of ${esc(p.name)} to cart">${inCart ? `Added${inCart.qty > 1 ? ' ×' + inCart.qty : ''}` : 'Add'}</button>`}</div>`;
  }).join('');
}
const perMl = (p, s) => { const v = priceOf(p, s) / s; return v >= 100 ? Math.round(v) : Math.round(v * 10) / 10; };
function scentHTML(p){
  const rows = [p.notes ? `<div><dt>Notes</dt><dd>${esc(p.notes)}</dd></div>` : '', p.longevity ? `<div><dt>Lasts</dt><dd>${esc(LONGEVITY[p.longevity])}</dd></div>` : '',
                p.strength ? `<div><dt>Strength</dt><dd>${esc(STRENGTH[p.strength])}</dd></div>` : '', p.occasions.length ? `<div><dt>Wear it</dt><dd>${p.occasions.map(o => esc(OCCASIONS[o])).join(', ')}</dd></div>` : ''].join('');
  return (p.scent.length ? `<div class="pmscent">${p.scent.map(k => `<span class="schip">${esc(scLabel(k))}</span>`).join('')}</div>` : '') + (rows ? `<dl class="pmfacts">${rows}</dl>` : '');
}
function rememberSeen(id){ const l = ls.get('khayr_seen', []).filter(x => x !== id); l.unshift(id); ls.set('khayr_seen', l.slice(0, 12)); }
function openPM(id, wantNotify){
  const p = findP(id); if(!p) return;
  rememberSeen(id);
  pmId = id; pmReturn = document.activeElement;
  const full = imgUrl(p.image_path || p.thumb_path);
  $('pmImg').innerHTML = full ? `<img src="${esc(full)}" alt="${esc(p.name)}">` : '<div class="ph"></div>';
  $('pmHouse').textContent = p.house || '';
  $('pmName').textContent = p.name;
  $('pmSim').textContent = p.similar_to ? 'Similar to ' + p.similar_to : '';
  $('pmTags').innerHTML = [catLabel(p.category), sLabel(p.season)].filter(Boolean).map(t => `<span class="tag">${esc(t)}</span>`).join(' ');
  $('pmGrid').style.gridTemplateColumns = `repeat(${Math.max(1, sizesFor(p).length)},minmax(0,1fr))`;
  $('pmGrid').innerHTML = pmHTML(p);
  $('pmInfo').innerHTML = scentHTML(p); $('pmNotify').innerHTML = ''; $('pmNotify').hidden = true;
  if(wantNotify){ const firstOut = sizesFor(p).find(z => sizeOut(p, z)); showNotify(p, p.stock_out ? null : firstOut || null); }
  $('pmLink').hidden = !p.fragrantica_url; if(p.fragrantica_url) $('pmLink').href = p.fragrantica_url;
  $('pm').hidden = false; document.body.classList.add('lock');
  setTimeout(() => $('pmClose').focus(), 30);
  viewContent(p);
}
function closePM(){
  if($('pm').hidden) return;
  $('pm').hidden = true; document.body.classList.remove('lock'); pmId = null;
  if(pmReturn && pmReturn.focus) pmReturn.focus();
}
if($('pm')){
  $('pmClose').onclick = closePM;
  $('pm').addEventListener('click', e => {
    if(e.target === $('pm')) return closePM();
    const nb = e.target.closest('[data-pmnotify]');
    if(nb && pmId){ showNotify(findP(pmId), Number(nb.dataset.pmnotify) || null); return; }
    if(e.target.closest('#nmSend')){ sendNotify(); return; }
    const b = e.target.closest('[data-pmadd]'); if(!b || b.disabled || !pmId) return;
    addToCart(pmId, Number(b.dataset.pmadd));
    const p = findP(pmId); if(p) $('pmGrid').innerHTML = pmHTML(p);
  });
}

/* ---------- photo viewer ---------- */
function openPhoto(src, alt){ $('lbImg').src = src; $('lbImg').alt = alt || ''; $('lb').classList.add('show'); }
function closePhoto(){ $('lb').classList.remove('show'); $('lbImg').removeAttribute('src'); }
$('lb').addEventListener('click', closePhoto);

/* ---------- copy helper ---------- */
async function copyText(t){
  try { await navigator.clipboard.writeText(t); return true; }
  catch(e){
    const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, t.length);
    let ok = false; try { ok = document.execCommand('copy'); } catch(_){}
    ta.remove(); return ok;
  }
}

/* ================= CART (one line per perfume + size, with quantity 1 to 10) ================= */
const MAXQ = 10;
let cart = [];                                       // [{id, type:'perfume', size, qty}]
function loadCart(){
  let raw = ls.get('khayr_cart', []);
  if(!Array.isArray(raw)) raw = [];
  const oldAttar = ls.get('khayr_attar_cart', null);
  ls.del('khayr_attar_cart');
  const out = []; let dropped = 0, attar = (Array.isArray(oldAttar) ? oldAttar.length : 0);
  raw.forEach(i => {
    if(!i || !i.id) return;
    if(i.type === 'attar' || String(i.id).startsWith('attar-')){ attar++; return; }
    const p = findP(i.id), size = Number(i.size);
    if(!p || !sizesFor(p).includes(size)){ dropped++; return; }          // a stock-out size stays, so the customer can change it
    const q = Math.max(1, Math.min(MAXQ, Math.round(Number(i.qty) || 1)));
    const same = out.find(x => x.id === p.id && x.size === size);
    if(same){ same.qty = Math.min(MAXQ, same.qty + q); return; }
    out.push({id: p.id, type: 'perfume', size, qty: q});
  });
  cart = out;
  if(attar) setTimeout(() => toast('Attar is no longer sold on the website, so it was removed from your cart.'), 300);
  else if(dropped) setTimeout(() => toast('Some items in your cart are no longer available and were removed.'), 300);
}
const lineOk = i => canBuy(findP(i.id), i.size);
const subtotal = () => cart.reduce((t, i) => t + priceOf(findP(i.id), i.size) * i.qty, 0);
const itemCount = () => cart.reduce((t, i) => t + i.qty, 0);
/* Discovery sets: the same rule as the server (each bottle counts for one set only). */
const activeSets = () => (Array.isArray(GEN.sets) ? GEN.sets : []).filter(x => x && x.active !== false && Array.isArray(x.items) && x.items.length >= 2 && Number(x.pct) > 0 && Number(x.pct) <= 50);
function setDiscounts(){
  const rem = {}; cart.forEach(i => { if(lineOk(i)) rem[i.id + ':' + i.size] = (rem[i.id + ':' + i.size] || 0) + i.qty; });
  const out = [];
  activeSets().forEach(st => {
    const k = Math.min(...st.items.map(x => rem[x.id + ':' + x.size] || 0));
    if(!(k >= 1)) return;
    let base = 0;
    st.items.forEach(x => { base += priceOf(findP(x.id), Number(x.size)) * k; rem[x.id + ':' + x.size] -= k; });
    out.push({name: st.name || 'Set', times: k, pct: Number(st.pct), amount: Math.round(base * Number(st.pct) / 100)});
  });
  return out;
}
let coupon = ls.get('khayr_coupon', null);            // {code, kind, value, minSubtotal}
function couponCut(sub, sdisc){
  if(!coupon || !coupon.code) return 0;
  if(sub < (Number(coupon.minSubtotal) || 0)) return 0;
  return coupon.kind === 'pct' ? Math.round((sub - sdisc) * Number(coupon.value) / 100) : Math.min(Number(coupon.value) || 0, sub - sdisc);
}
function amounts(){
  const sub = subtotal(), full = false;
  const sets = setDiscounts(), sdisc = sets.reduce((t, x) => t + x.amount, 0);
  const cdisc = couponCut(sub, sdisc);
  const pdisc = full ? Math.round((sub - sdisc - cdisc) * pct() / 100) : 0;   // discounts are on the perfumes only, never on delivery
  const disc = Math.min(sub, sdisc + cdisc + pdisc);
  const fee = deliveryFee(details().area, sub);
  return {sub, disc, sdisc, cdisc, pdisc, sets, fee, total: sub - disc + (fee || 0), full};
}
function updateCartUI(){
  ls.set('khayr_cart', cart);
  const n = itemCount();
  $('cartLabel').textContent = `Cart (${n})`;
  document.body.classList.toggle('has-bar', n > 0);
  $('barText').innerHTML = `Cart <span class="dot">•</span> ${n} item${n === 1 ? '' : 's'} <span class="dot">•</span> ${price(subtotal())}`;
}
function addToCart(id, size){
  const p = findP(id);
  if(!canBuy(p, size)){ toast('This size is out of stock.'); return; }
  const have = cart.find(i => i.id === id && i.size === size);
  if(have){
    if(have.qty >= MAXQ){ toast(`You can order up to ${MAXQ} of one size.`); return; }
    have.qty++;
  } else cart.push({id, type: 'perfume', size, qty: 1});
  updateCartUI(); refreshCard(id);
  toast(have ? `Added ✓ ${p.name}, ${size}ml × ${have.qty}` : `Added ✓ ${p.name}, ${size}ml`);
  px('AddToCart', {content_ids: [p.id], content_type: 'product', content_name: p.name, content_category: p.house || 'perfume', contents: [pxItem(p, size)], value: priceOf(p, size), currency: 'BDT'});
  if(document.body.classList.contains('open')) renderDrawer();
}
function removeFromCart(idx){
  const [gone] = cart.splice(idx, 1);
  updateCartUI(); if(PAGE === 'perfume') refreshCard(gone.id);
  renderDrawer();
}
function changeSize(idx, size){
  const it = cart[idx], p = findP(it.id);
  if(!p || it.size === size) return;
  if(!canBuy(p, size)){ toast(`${size}ml is out of stock.`); return; }
  const other = cart.findIndex((x, k) => k !== idx && x.id === it.id && x.size === size);
  if(other > -1){                                    // that size is already in the cart: put them together
    cart[other].qty = Math.min(MAXQ, cart[other].qty + it.qty); cart.splice(idx, 1);
    toast(`${p.name} ${size}ml: quantity ${cart[other > idx ? other - 1 : other].qty}`);
  } else it.size = size;
  notice = null;
  updateCartUI(); if(PAGE === 'perfume') refreshCard(it.id);
  renderDrawer();
}

function changeQty(idx, d){
  const it = cart[idx]; if(!it) return;
  const q = it.qty + d;
  if(q < 1){ removeFromCart(idx); return; }
  if(q > MAXQ){ toast(`You can order up to ${MAXQ} of one size.`); return; }
  it.qty = q; notice = null;
  updateCartUI(); renderDrawer();
}

/* ---------- customer details (saved on this phone only) ---------- */
const saved = ls.get('khayr_customer', {}) || {};
const normPhone = v => { let d = String(v || '').replace(/\D/g, ''); if(d.startsWith('880')) d = d.slice(2); if(d.length === 10 && d[0] === '1') d = '0' + d; return d; };
const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
function details(){
  return {name: clean(saved.name), phone: normPhone(saved.phone), email: clean(saved.email), address: clean(saved.address),
          area: saved.area === 'Inside Sylhet' || saved.area === 'Outside Sylhet' ? saved.area : ''};
}
function problems(d){
  const e = {};
  if(!d.name) e.name = 'Please enter your name.';
  else if(d.name.length > 80) e.name = 'Please enter a shorter name.';
  if(!clean(saved.phone)) e.phone = 'Please enter your phone number.';
  else if(!/^01[3-9]\d{8}$/.test(d.phone)) e.phone = 'Please enter a valid phone number, like 01XXXXXXXXX.';
  if(!d.address) e.address = 'Please enter your delivery address.';
  else if(d.address.length > 250) e.address = 'Please shorten the address.';
  if(d.email && !validEmail(d.email)) e.email = 'Please enter a valid email address, or leave it empty.';
  if(!d.area) e.area = 'Please choose Inside Sylhet or Outside Sylhet.';
  return e;
}
let errs = {};

/* ---------- the order ---------- */
/* One checkout = one clientRef. Copy and WhatsApp for the same cart + details + payment give the SAME Order ID. */
let draft = ls.get('khayr_order_v5', null);          // {sig, ref, at, orderId, methods, offline, lead, amounts}
let lastAction = null;                               // {method, orderId, sig}
let notice = null;                                   // {kind:'warn'|'ok', title, text}
let busy = false;
function sigNow(){
  const d = details();
  return JSON.stringify([cart.map(i => i.id + ':' + i.size + 'x' + i.qty), d.name, d.phone, d.email, d.address, d.area, 'advance', coupon ? coupon.code : '']);
}
function currentDraft(){
  const sig = sigNow();
  if(!draft || draft.sig !== sig || Date.now() - (draft.at || 0) > 6 * 36e5){
    draft = {sig, ref: newId(), at: Date.now(), orderId: null, methods: [], offline: false, lead: false, amounts: null};
    saveDraft();
  }
  return draft;
}
const saveDraft = () => ls.set('khayr_order_v5', draft);
function orderText(orderId){
  const d = details(), a = (draft && draft.amounts) || amounts();
  const lines = cart.map(i => { const p = findP(i.id), u = priceOf(p, i.size); return `${p.name}\n${i.size}ml${i.qty > 1 ? ` × ${i.qty}` : ''} — ${price(u * i.qty)}`; });
  const fee = a.fee === undefined ? deliveryFee(d.area, a.sub) : a.fee;
  const lv = draft && draft.amounts ? amounts() : a;
  const pay = [`Subtotal: ${price(a.sub)}`,
    ...(lv.sets || []).map(x => `Set discount (${x.name}${x.times > 1 ? ' ×' + x.times : ''}): -${price(x.amount)}`),
    lv.cdisc ? `Coupon ${coupon.code}: -${price(lv.cdisc)}` : null,
    a.full ? `Discount (${pct()}% full payment): -${price(lv.pdisc ?? a.disc)}` : null,
    (lv.sets || []).length || lv.cdisc ? `Total discount: -${price(a.disc)}` : null,
    `Delivery (${d.area}): ${fee ? price(fee) : 'Free'}`,
    `Total: ${price(a.total)}`,
    a.full ? `Payment: Full payment by bKash` : null].filter(Boolean);
  return [
    SHOP + ' ORDER', '',
    orderId ? `Order ID: ${orderId}` : null, orderId ? '' : null,
    `Name: ${d.name}`,
    `Phone: ${d.phone}`,
    d.email ? `Email: ${d.email}` : null,
    `Address: ${d.address}`,
    `Delivery Area: ${d.area}`,
    clean(saved.note) ? `Note: ${clean(saved.note).slice(0, 300)}` : null, '',
    lines.join('\n\n'), '',
    ...pay
  ].filter(l => l !== null).join('\n');
}
function pxContents(value){
  return {content_ids: cart.map(i => i.id), contents: cart.map(i => pxItem(findP(i.id), i.size, i.qty)), content_type: 'product', num_items: itemCount(),
          value: value ?? subtotal(), currency: 'BDT'};
}
async function refreshData(){
  try { applyData(await fetchData()); if(PAGE === 'perfume' && HR){ HR = houseRanks(); render(); } } catch(e){}
}

/* Save the order on the server. Returns {ok:true, orderId} or {ok:false} (the message is already shown). */
async function submit(method, retried){
  const dr = currentDraft();
  const body = {
    action: 'create_order', clientRef: dr.ref, method, paymentChoice: 'advance',
    customer: details(), items: cart.map(i => ({id: i.id, type: 'perfume', size: i.size, qty: i.qty})), expectedTotal: subtotal(), coupon: coupon ? coupon.code : '', note: clean(saved.note).slice(0, 300),
    marketingOk: !adsOff(), attribution: ATTR, fbp: cookie('_fbp'), fbc: fbcValue(), pageUrl: location.href
  };
  let r, j = null;
  try{
    if(!API || !sbReady()) throw new Error('not set up');
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 15000);
    r = await fetch(API, {method: 'POST', headers: {'Content-Type': 'application/json', apikey: SB.anonKey}, body: JSON.stringify(body), signal: ctl.signal});
    clearTimeout(timer);
    j = await r.json().catch(() => null);
  }catch(e){ return failed(dr); }
  if(r.ok && j && j.ok && j.orderId){
    dr.orderId = j.orderId;
    if(Number.isInteger(j.total)) dr.amounts = {sub: j.subtotal ?? j.total, disc: j.discount || 0, fee: j.deliveryFee || 0, total: j.total, full: j.paymentChoice === 'full'};
    if(!dr.methods.includes(method)) dr.methods.push(method);
    if(!dr.lead){
      dr.lead = true;
      const value = Number(j.total) || subtotal();
      px('Lead', pxContents(value), j.leadEventId || ('lead-' + j.orderId));
      if(j.purchaseEventId) px('Purchase', {...pxContents(value), order_id: j.orderId}, j.purchaseEventId);   // same event id as the server: counted once
    }
    saveDraft(); notice = null;
    ls.set('khayr_lastorder', {at: Date.now(), items: cart.map(i => ({id: i.id, size: i.size, qty: i.qty}))});
    return {ok: true, orderId: j.orderId};
  }
  if(r.status === 409 && j){
    if(j.code === 'ref_mismatch' && !retried){ dr.ref = newId(); dr.orderId = null; dr.methods = []; dr.lead = false; saveDraft(); return submit(method, true); }
    await refreshData();
    if(j.code === 'unavailable'){
      const gone = [], out = [];
      (j.problems || []).forEach(x => {
        const k = cart.findIndex(i => i.id === x.id && String(i.size) === String(x.size));
        if(k < 0) return;
        const label = `${x.name || (findP(x.id) || {}).name || 'An item'} ${x.size}ml`;
        if(x.reason === 'stock_out' && findP(x.id)) out.push(label);
        else { gone.push(label); cart.splice(k, 1); }
      });
      notice = {kind: 'warn', title: out.length && !gone.length ? 'Out of stock' : 'Some items are no longer available',
                text: (gone.length ? gone.join(', ') + ' removed from your cart. ' : '') + (out.length ? out.join(', ') + ' just went out of stock. Choose another size or remove it. ' : '') + 'Then tap again.'};
    } else {
      notice = {kind: 'warn', title: 'Some prices were updated', text: `Please check the new total (${price(subtotal())}) and tap again to order.`};
    }
    updateCartUI(); renderDrawer();
    return {ok: false};
  }
  if(r.status === 400 && j && j.code === 'coupon'){
    couponErr = j.error; coupon = null; ls.del('khayr_coupon'); renderDrawer();
    notice = {kind: 'warn', title: 'Coupon not applied', text: j.error + ' Remove it or try another code, then tap again.'}; renderDrawer(); return {ok: false};
  }
  if(r.status === 400 && j && j.field){
    errs = {[j.field]: j.error}; renderDrawer(); focusFirstError(); return {ok: false};
  }
  if((r.status === 429 || r.status === 400) && j && j.error){
    notice = {kind: 'warn', title: 'Order not sent yet', text: j.error}; renderDrawer(); return {ok: false};
  }
  return failed(dr);
}
function failed(dr){
  if(dr.orderId) return {ok: true, orderId: dr.orderId, unsaved: true};      // order already saved earlier; just could not add this button
  dr.offline = true; saveDraft();
  notice = {kind: 'warn', title: 'We could not save your order online', text: 'Please check your internet and tap again. If it still does not work, tapping again will send your order to us without an Order ID, and we will still receive it.'};
  renderDrawer();
  return {ok: false};
}
function readyOrder(){
  if(!cart.length){ toast('Your cart is empty.'); return false; }
  const bad = cart.filter(i => !lineOk(i));
  if(bad.length){
    notice = {kind: 'warn', title: 'Out of stock', text: bad.map(i => `${findP(i.id).name} ${i.size}ml`).join(', ') + ' is out of stock. Choose another size or remove it.'};
    renderDrawer(); const el = document.querySelector('.line.bad'); if(el) el.scrollIntoView({block: 'center', behavior: 'smooth'});
    return false;
  }
  errs = problems(details());
  if(Object.keys(errs).length){ renderDrawer(); focusFirstError(); return false; }
  currentDraft();
  return true;
}
function focusFirstError(){
  const firstId = {name:'cName', phone:'cPhone', address:'cAddr', email:'cEmail', area:'areas'}[Object.keys(errs)[0]];
  const el = $(firstId);
  if(el){ el.scrollIntoView({block: 'center', behavior: 'smooth'}); if(firstId !== 'areas') el.focus({preventScroll: true}); }
}
function setBusy(on, which){
  busy = on;
  ['waBtn', 'msBtn', 'cpBtn'].forEach(id => { const b = $(id); if(!b) return; b.disabled = on; b.classList.toggle('wait', on && id === which); });
  const b = which && $(which); if(b && on) b.querySelector('span').textContent = 'Saving your order…';
}
const isMobile = () => /Android|iPhone|iPad|iPod|Mobile|Silk|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
const waUrl = text => 'https://wa.me/' + String(GEN.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent(text);
/* v10: Messenger. m.me links can carry the order text; on a few phones it arrives empty, so we also copy it. */
const msPage = () => String((GEN.messenger || {}).page || '').trim().replace(/^https?:\/\/(www\.|m\.)?(facebook\.com|m\.me)\//i, '').replace(/[/?#].*$/, '');
const msOn = () => (GEN.messenger || {}).on !== false && /^[A-Za-z0-9.\-]{2,80}$/.test(msPage());
const msUrl = text => 'https://m.me/' + encodeURIComponent(msPage()) + (text ? '?text=' + encodeURIComponent(text) : '');
function done(method, orderId){
  lastAction = {method, orderId: orderId || null, sig: draft.sig};
  ss.set('khayr_last', lastAction);
  notice = null;
  px(method === 'WhatsApp' ? 'WhatsAppOrder' : method === 'Messenger' ? 'MessengerOrder' : 'CopyOrder', {...pxContents(draft.amounts ? draft.amounts.total : amounts().total), order_id: orderId || ''}, null, true);
  renderDrawer();
}

async function orderOnWhatsApp(){
  if(busy || !readyOrder()) return;
  const dr = draft;
  if(dr.offline && !dr.orderId){                       // second tap after a failure: send without an ID
    const url = waUrl(orderText(null));
    dr.offline = false; saveDraft();
    done('WhatsApp', null);
    const w = isMobile() ? null : window.open(url, '_blank');   // no 'noopener' here: it makes open() return null and WhatsApp would open twice
    if(w){ try { w.opener = null; } catch(e){} } else location.href = url;
    return;
  }
  // Desktop: open the tab now (inside the tap) so the browser does not block it; fill it in after saving.
  let win = null;
  if(!isMobile()){
    win = window.open('', '_blank');
    if(win){ try { win.opener = null; win.document.title = 'Opening WhatsApp…'; win.document.body.innerHTML = '<p style="font:16px/1.5 sans-serif;padding:24px">Opening WhatsApp…</p>'; } catch(e){} }
  }
  setBusy(true, 'waBtn');
  const res = await submit('WhatsApp');
  setBusy(false, 'waBtn');
  if(!res.ok){ if(win) try { win.close(); } catch(e){} renderDrawer(); return; }
  const url = waUrl(orderText(res.orderId));
  done('WhatsApp', res.orderId);
  if(win && !win.closed) win.location.href = url;
  else location.href = url;
}

async function orderOnMessenger(){
  if(busy || !readyOrder() || !msOn()) return;
  const dr = draft;
  let win = null;
  if(!isMobile()){
    win = window.open('', '_blank');
    if(win){ try { win.opener = null; win.document.title = 'Opening Messenger…'; win.document.body.innerHTML = '<p style="font:16px/1.5 sans-serif;padding:24px">Opening Messenger…</p>'; } catch(e){} }
  }
  if(dr.offline && !dr.orderId){
    const text = orderText(null);
    await copyText(text);
    dr.offline = false; saveDraft(); done('Messenger', null);
    if(win && !win.closed) win.location.href = msUrl(text); else location.href = msUrl(text);
    return;
  }
  setBusy(true, 'msBtn');
  const job = submit('Messenger');
  // copy the order too (in case Messenger opens with an empty message box)
  if(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write){
    const blob = job.then(r => { if(!r.ok) throw new Error('stop'); return new Blob([orderText(r.orderId)], {type: 'text/plain'}); });
    navigator.clipboard.write([new ClipboardItem({'text/plain': blob})]).catch(() => {});
  }
  const res = await job;
  setBusy(false, 'msBtn');
  if(!res.ok){ if(win) try { win.close(); } catch(e){} renderDrawer(); return; }
  const text = orderText(res.orderId);
  if(!(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write)) await copyText(text);
  done('Messenger', res.orderId);
  if(win && !win.closed) win.location.href = msUrl(text);
  else location.href = msUrl(text);
}

async function copyFullOrder(){
  if(busy || !readyOrder()) return;
  const dr = draft;
  if(dr.offline && !dr.orderId){
    if(await copyText(orderText(null))){ dr.offline = false; saveDraft(); done('Copy Order', null); toast('Order copied ✓'); }
    else toast('Copy failed. Use Order on WhatsApp instead.');
    return;
  }
  if(dr.orderId && dr.methods.includes('Copy Order')){             // already saved: copy straight away
    if(await copyText(orderText(dr.orderId))){ done('Copy Order', dr.orderId); toast('Order copied ✓'); }
    else toast('Copy failed. Use Order on WhatsApp instead.');
    return;
  }
  setBusy(true, 'cpBtn');
  const job = submit('Copy Order');
  let copied = false;
  // Safari and Chrome allow the copy to wait for the server if it starts inside the tap
  if(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write){
    const blob = job.then(r => { if(!r.ok) throw new Error('stop'); return new Blob([orderText(r.orderId)], {type: 'text/plain'}); });
    try { await navigator.clipboard.write([new ClipboardItem({'text/plain': blob})]); copied = true; } catch(e){}
  }
  const res = await job;
  setBusy(false, 'cpBtn');
  if(!res.ok){ renderDrawer(); return; }
  if(!copied) copied = await copyText(orderText(res.orderId));
  if(copied){ done('Copy Order', res.orderId); toast('Order copied ✓'); }
  else {
    notice = {kind: 'ok', title: `Order saved ✓  Order ID: ${res.orderId}`, text: 'Tap Copy Full Order again to copy it, then paste it into WhatsApp, Messenger or SMS.'};
    renderDrawer();
  }
}

/* ---------- drawer ---------- */
function openCart(){
  closeMenu();
  document.body.classList.add('open'); $('drawer').setAttribute('aria-hidden', 'false');
  notice = null; renderDrawer();
  if(cart.length){
    const sig = cart.map(i => i.id + ':' + i.size + 'x' + i.qty).join('|');
    if(ss.get('khayr_ic', '') !== sig){ ss.set('khayr_ic', sig); px('InitiateCheckout', pxContents()); }
  }
  setTimeout(() => $('closeCart').focus(), 60);
}
function closeCart(){ document.body.classList.remove('open'); $('drawer').setAttribute('aria-hidden', 'true'); $('cartBtn').focus(); }
$('cartBtn').onclick = openCart; $('bar').onclick = openCart;
$('closeCart').onclick = closeCart; $('scrim').onclick = closeCart;
document.addEventListener('keydown', e => {
  if(e.key !== 'Escape') return;
  if($('pm') && !$('pm').hidden) closePM();
  else if($('lb').classList.contains('show')) closePhoto();
  else if($('qrv') && $('qrv').classList.contains('show')) closeQr();
  else if(document.body.classList.contains('open')) closeCart();
  else if(document.body.classList.contains('menu')) closeMenu();
});
function restoreLastAction(){
  const la = ss.get('khayr_last', null);
  if(la && cart.length && la.sig === sigNow()) lastAction = la;
}

const WA_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.4-.3Z"/></svg>';
const MS_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.4 2 2 6.1 2 11.6c0 2.9 1.2 5.4 3.2 7.1V22l3-1.7c1.2.3 2.4.5 3.8.5 5.6 0 10-4.1 10-9.6S17.6 2 12 2Zm1 12.9-2.5-2.7-5 2.7 5.5-5.8 2.6 2.7 4.9-2.7-5.5 5.8Z"/></svg>';
const rootHref = () => (typeof PRESET !== 'undefined' && PRESET) ? '../../' : '';
const COPY_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
const activeQrs = () => [];    // v7: no QR code on the website; payment details are sent on WhatsApp
const qrSrc = (q, big) => q.src || imgUrl(big ? (q.image_path || q.thumb_path) : (q.thumb_path || q.image_path));
function lineHTML(i, k){
  const p = findP(i.id), ok = lineOk(i), sizes = sizesFor(p), th = imgUrl(p.thumb_path || p.image_path);
  const opts = sizes.map(z => {
    const out = sizeOut(p, z);
    return `<option value="${z}" ${z === i.size ? 'selected' : ''} ${out && z !== i.size ? 'disabled' : ''}>${z} ml – ${out ? 'Stock Out' : price(priceOf(p, z)) + ' tk'}</option>`;
  }).join('');
  return `<div class="line ${ok ? '' : 'bad'}">
    <div class="lthumb">${th ? `<img src="${esc(th)}" alt="" width="56" height="56" loading="lazy">` : ''}</div>
    <div class="lmain">
      <div class="lrow"><div class="n">${esc(p.name)}</div>
        <div class="qty" role="group" aria-label="Quantity of ${esc(p.name)} ${i.size}ml">
          <button type="button" data-q="-1" data-li="${k}" aria-label="One less">−</button><span aria-live="polite">${i.qty}</span><button type="button" data-q="1" data-li="${k}" aria-label="One more" ${i.qty >= MAXQ ? 'disabled' : ''}>+</button>
        </div></div>
      <div class="lrow2">${p.house ? `<div class="m">${esc(p.house)}</div>` : '<div></div>'}<div class="lp">${price(priceOf(p, i.size) * i.qty)} tk</div></div>
      <label class="lsel"><span class="sr">Size of ${esc(p.name)}</span><select data-lsel="${k}">${opts}</select></label>
      ${ok ? '' : `<div class="lwarn">${i.size}ml is out of stock. Choose another size or remove it.</div>`}
      <button type="button" class="rm" data-rm="${k}" aria-label="Remove ${esc(p.name)} ${i.size}ml">Remove</button>
    </div>
  </div>`;
}
function payHTML(){
  const a = amounts(), full = a.full, dfull = fullDiscount(a.sub), area = details().area;
  const qrs = activeQrs(), free = freeOver(), need = free > 0 ? free - a.sub : 0;
  return `<div class="pay" id="pay">
    <h4>Payment</h4>
    ${pct() ? `<button type="button" class="payopt one" role="checkbox" data-pay="${full ? 'advance' : 'full'}" aria-checked="${full}">
        <i class="tick" aria-hidden="true"></i><span><b>Pay the full amount now by bKash</b><span>Get ${pct()}% off the perfumes${dfull ? ` · save ${price(dfull)} tk` : ''}</span></span></button>` : ''}
    <div class="sums">
      <div><span>Subtotal (${itemCount()} item${itemCount() === 1 ? '' : 's'})</span><span>${price(a.sub)}</span></div>
      ${a.sets.map(x => `<div class="dis"><span>Set discount (${esc(x.name)}${x.times > 1 ? ' ×' + x.times : ''})</span><span>-${price(x.amount)}</span></div>`).join('')}
      ${a.cdisc ? `<div class="dis"><span>Coupon ${esc(coupon.code)}</span><span>-${price(a.cdisc)}</span></div>` : ''}
      ${full && a.pdisc ? `<div class="dis"><span>Discount (${pct()}%)</span><span>-${price(a.pdisc)}</span></div>` : ''}
      <div><span>Delivery${area ? ` (${esc(area)})` : ''}</span><span>${a.fee === null ? 'Choose area' : a.fee ? price(a.fee) : 'Free'}</span></div>
      <div class="total"><span>${full ? 'Total to pay' : 'Total'}</span><span>${price(a.total)}</span></div>
      ${need > 0 ? `<p class="freehint">Add ${price(need)} tk more for <b>free delivery</b> all over Bangladesh.</p>` : free > 0 ? `<p class="freehint ok">You get <b>free delivery</b> ✓</p>` : ''}
    </div>
    ${couponHTML(a)}
    ${full ? `<p class="paynote" id="payNote">Pay ${price(a.total)} tk by bKash. After you order, we send you our payment details on WhatsApp.</p>` : ''}
  </div>`;
}
let couponErr = '', couponBusy = false;
function couponHTML(a){
  if(coupon && coupon.code){
    const short = a.sub < (Number(coupon.minSubtotal) || 0);
    return `<div class="coupon on"><span>Coupon <b>${esc(coupon.code)}</b> ${short ? `needs perfumes worth ${price(coupon.minSubtotal)} tk` : 'applied ✓'}</span><button type="button" class="linkbtn" id="cpRemove">Remove</button></div>`;
  }
  return `<div class="coupon"><label for="cpCode">Have a coupon code?</label><div class="cprow"><input id="cpCode" autocapitalize="characters" autocomplete="off" maxlength="30" placeholder="e.g. EID100" value="${esc(saved.cpDraft || '')}"><button type="button" id="cpApply" ${couponBusy ? 'disabled' : ''}>${couponBusy ? '…' : 'Apply'}</button></div>${couponErr ? `<div class="err" style="display:block" id="cpErr">${esc(couponErr)}</div>` : ''}</div>`;
}
async function applyCoupon(){
  const code = clean($('cpCode') ? $('cpCode').value : '').toUpperCase();
  if(!code){ couponErr = 'Type a coupon code.'; renderDrawer(); return; }
  couponBusy = true; couponErr = ''; renderDrawer();
  let j = null;
  try { const r = await fetch(API, {method: 'POST', headers: {'Content-Type': 'application/json', apikey: SB.anonKey}, body: JSON.stringify({action: 'check_coupon', code, subtotal: subtotal()})}); j = await r.json().catch(() => null); }
  catch(e){ j = {ok: false, error: 'Could not check the coupon. Check your internet.'}; }
  couponBusy = false;
  if(j && j.ok){ coupon = {code: j.code, kind: j.kind, value: j.value, minSubtotal: j.minSubtotal}; ls.set('khayr_coupon', coupon); saved.cpDraft = ''; ls.set('khayr_customer', saved); toast(`Coupon ${j.code} applied ✓`); px('ApplyCoupon', {coupon: j.code}, null, true); }
  else couponErr = (j && j.error) || 'This coupon code is not valid.';
  renderDrawer();
}
function renderDrawer(){
  const body = $('dbody'), foot = $('dfoot'), keep = body.scrollTop;
  $('cartTitle').textContent = cart.length ? `Your order (${itemCount()})` : 'Your order';
  if(!cart.length){
    const lo = ls.get('khayr_lastorder', null), again = lo && Array.isArray(lo.items) ? lo.items.filter(i => canBuy(findP(i.id), Number(i.size))) : [];
    body.innerHTML = `<div class="cart-empty"><p><strong>Your cart is empty.</strong></p><p>Select a size on any perfume, then tap Add to cart.</p>
      ${again.length ? `<button type="button" class="btn-line again" id="orderAgain">Order again: ${again.map(i => esc(findP(i.id).name) + ' ' + i.size + 'ml').slice(0, 3).join(', ')}${again.length > 3 ? ' …' : ''}</button>` : ''}
      <div class="row"><a href="./">Browse perfumes</a></div></div>`;
    foot.innerHTML = '';
    if(notice) body.insertAdjacentHTML('afterbegin', `<div class="warn-msg" role="alert"><b>${esc(notice.title)}</b>${esc(notice.text)}</div>`);
    return;
  }
  const d = details();
  const sameOrder = lastAction && lastAction.sig === sigNow();
  body.innerHTML = cart.map(lineHTML).join('') + `
    <div class="form" id="form">
      <h4>Your details</h4>
      <div class="field ${errs.name ? 'bad' : ''}"><span><label for="cName">Name</label></span><input id="cName" autocomplete="name" autocapitalize="words" enterkeyhint="next" maxlength="80" value="${esc(saved.name || '')}" aria-describedby="eName" aria-invalid="${!!errs.name}"><div class="err" id="eName">${esc(errs.name || '')}</div></div>
      <div class="field ${errs.phone ? 'bad' : ''}"><span><label for="cPhone">Phone Number</label></span><input id="cPhone" type="tel" inputmode="tel" autocomplete="tel" enterkeyhint="next" placeholder="01XXXXXXXXX" maxlength="20" value="${esc(saved.phone || '')}" aria-describedby="ePhone" aria-invalid="${!!errs.phone}"><div class="err" id="ePhone">${esc(errs.phone || '')}</div></div>
      <div class="field ${errs.address ? 'bad' : ''}"><span><label for="cAddr">Address</label></span><textarea id="cAddr" autocomplete="street-address" rows="2" maxlength="250" placeholder="House, road, area, city" aria-describedby="eAddr" aria-invalid="${!!errs.address}">${esc(saved.address || '')}</textarea><div class="err" id="eAddr">${esc(errs.address || '')}</div></div>
      <div class="field ${errs.email ? 'bad' : ''}"><span><label for="cEmail">Email <em>(optional)</em></label></span><input id="cEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="none" enterkeyhint="done" maxlength="100" value="${esc(saved.email || '')}" aria-describedby="eEmail" aria-invalid="${!!errs.email}"><div class="err" id="eEmail">${esc(errs.email || '')}</div></div>
      <span id="areaLbl" style="display:block;font-size:.9rem;font-weight:500;margin-bottom:6px">Delivery Area</span>
      <div class="areas ${errs.area ? 'bad' : ''}" id="areas" role="radiogroup" aria-labelledby="areaLbl">
        <button type="button" class="area" role="radio" data-area="Inside Sylhet" aria-checked="${d.area === 'Inside Sylhet'}">Inside Sylhet</button>
        <button type="button" class="area" role="radio" data-area="Outside Sylhet" aria-checked="${d.area === 'Outside Sylhet'}">Outside Sylhet</button>
      </div>
      <div class="err" id="eArea" style="${errs.area ? 'display:block' : ''}">${esc(errs.area || '')}</div>
      <div class="field note-f"><span><label for="cNote">Note for us <em>(optional)</em></label></span><textarea id="cNote" rows="2" maxlength="300" placeholder="e.g. gift wrap, call before delivery, best time to deliver">${esc(saved.note || '')}</textarea></div>
    </div>
    ${payHTML()}
    ${notice ? `<div class="${notice.kind === 'ok' ? 'done-msg' : 'warn-msg'}" role="alert"><b>${esc(notice.title)}</b>${esc(notice.text)}</div>` : ''}
    ${sameOrder ? `<div class="done-msg" role="status"><b>${lastAction.method === 'WhatsApp' ? 'WhatsApp opened with your order ✓' : lastAction.method === 'Messenger' ? 'Messenger opened with your order ✓' : 'Order copied ✓'}</b>${lastAction.orderId ? `Order ID: ${esc(lastAction.orderId)}. ` : ''}${lastAction.method === 'WhatsApp' ? 'Press send in WhatsApp to finish.' : lastAction.method === 'Messenger' ? 'Press send in Messenger to finish. If the message box is empty, tap and hold it → Paste, then send.' : 'Paste it into WhatsApp, Messenger or SMS and send it to us.'}</div>
      <button class="btn-link" id="newOrder" type="button">Start a new order</button>` : ''}
    ${GEN.orderNote ? `<p class="note">${esc(GEN.orderNote)}</p>` : ''}
    <p class="policy-l">By ordering you agree to our <a href="${rootHref()}returns.html">Returns &amp; Replacement policy</a>.</p>`;
  foot.innerHTML = `
    <button class="btn-dark" id="waBtn" type="button">${WA_ICON}<span>Order on WhatsApp</span></button>
    ${msOn() ? `<button class="btn-ms" id="msBtn" type="button">${MS_ICON}<span>Order on Messenger</span></button>` : ''}
    <button class="btn-line" id="cpBtn" type="button">${COPY_ICON}<span>Copy Full Order</span></button>`;
  $('waBtn').onclick = orderOnWhatsApp; $('cpBtn').onclick = copyFullOrder; if($('msBtn')) $('msBtn').onclick = orderOnMessenger;
  if(busy) setBusy(true, null);
  body.scrollTop = keep;
}
$('dbody').addEventListener('input', e => {
  if(e.target.id === 'cpCode'){ saved.cpDraft = e.target.value; couponErr = ''; return; }
  const map = {cName:'name', cPhone:'phone', cAddr:'address', cEmail:'email', cNote:'note'};
  const k = map[e.target.id]; if(!k) return;
  saved[k] = e.target.value; ls.set('khayr_customer', saved);
  delete errs[k];
  const f = e.target.closest('.field'); if(f) f.classList.remove('bad');
});
$('dbody').addEventListener('click', e => {
  const t = e.target.closest('button'); if(!t) return;
  if(t.dataset.rm !== undefined){ notice = null; removeFromCart(+t.dataset.rm); }
  else if(t.dataset.q){ changeQty(+t.dataset.li, Number(t.dataset.q)); }
  else if(t.dataset.area){ saved.area = t.dataset.area; ls.set('khayr_customer', saved); delete errs.area; renderDrawer(); }
  else if(t.dataset.pay){ saved.pay = t.dataset.pay; ls.set('khayr_customer', saved); renderDrawer(); }
  else if(t.dataset.qr !== undefined){ openQr(+t.dataset.qr); }
  else if(t.id === 'cpApply'){ applyCoupon(); }
  else if(t.id === 'cpRemove'){ coupon = null; couponErr = ''; ls.del('khayr_coupon'); notice = null; renderDrawer(); }
  else if(t.id === 'orderAgain'){
    const lo = ls.get('khayr_lastorder', null) || {}; let n = 0;
    (lo.items || []).forEach(i => { const p = findP(i.id), z = Number(i.size); if(!canBuy(p, z)) return; const have = cart.find(x => x.id === p.id && x.size === z); if(have) have.qty = Math.min(MAXQ, have.qty + (i.qty || 1)); else cart.push({id: p.id, type: 'perfume', size: z, qty: Math.min(MAXQ, i.qty || 1)}); n++; });
    updateCartUI(); if(PAGE === 'perfume') render(); renderDrawer(); toast(n ? 'Added your last order ✓' : 'Those perfumes are not available right now.');
  }
  else if(t.id === 'newOrder'){
    cart = []; draft = null; lastAction = null; notice = null; ls.del('khayr_order_v5'); ss.del('khayr_last');
    updateCartUI(); if(PAGE === 'perfume') render(); closeCart(); toast('Cart cleared');
  }
});

$('dbody').addEventListener('keydown', e => { if(e.target.id === 'cpCode' && e.key === 'Enter'){ e.preventDefault(); applyCoupon(); } });
$('dbody').addEventListener('change', e => {
  if(e.target.dataset.lsel !== undefined) changeSize(+e.target.dataset.lsel, Number(e.target.value));
});

/* ---------- QR viewer (big, easy to scan or save) ---------- */
function openQr(k){
  const q = activeQrs()[k]; if(!q) return;
  const full = qrSrc(q, true);
  $('qrvImg').src = full; $('qrvImg').alt = q.label || 'Payment QR code';
  $('qrvLabel').textContent = q.label || 'Payment';
  $('qrvDetails').textContent = q.details || '';
  $('qrvOpen').href = full;
  $('qrv').classList.add('show');
  setTimeout(() => $('qrvClose').focus(), 30);
}
function closeQr(){ $('qrv').classList.remove('show'); $('qrvImg').removeAttribute('src'); }
if($('qrv')){ $('qrvClose').onclick = closeQr; $('qrv').addEventListener('click', e => { if(e.target === $('qrv')) closeQr(); }); }

/* ================= BOTTLE PHOTOS ================= */
let gList = [], gAt = 0, gReturn = null;
async function initBottles(){
  gList = await fetchGallery();
  $('gallery').innerHTML = gList.length
    ? gList.map((x, i) => `<button type="button" class="gitem" data-gi="${i}" aria-label="Open photo${x.caption ? ': ' + esc(x.caption) : ''}"><span class="ph2"><img src="${esc(imgUrl(x.thumb_path || x.image_path))}" alt="${esc(x.caption || 'Decant bottle')}" loading="lazy" width="400" height="400"></span>${x.caption ? `<span class="cap">${esc(x.caption)}</span>` : ''}</button>`).join('')
    : `<div class="empty"><strong>Photos coming soon.</strong><p>Decant bottle photos will appear here.</p><a class="btn" href="./">Explore Perfume Decants</a></div>`;
  $('gallery').addEventListener('click', e => { const b = e.target.closest('[data-gi]'); if(b) openG(+b.dataset.gi); });
  $('glbClose').onclick = closeG;
  $('glbPrev').onclick = () => openG(gAt - 1);
  $('glbNext').onclick = () => openG(gAt + 1);
  $('glb').addEventListener('click', e => { if(e.target === $('glb')) closeG(); });
  let sx = null;
  $('glb').addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, {passive: true});
  $('glb').addEventListener('touchend', e => { if(sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if(Math.abs(dx) > 45) openG(gAt + (dx < 0 ? 1 : -1)); });
  document.addEventListener('keydown', e => {
    if(!$('glb').classList.contains('show')) return;
    if(e.key === 'Escape') closeG(); else if(e.key === 'ArrowRight') openG(gAt + 1); else if(e.key === 'ArrowLeft') openG(gAt - 1);
  });
}
function openG(i){
  if(!gList.length) return;
  gAt = (i + gList.length) % gList.length;
  const x = gList[gAt];
  if(!$('glb').classList.contains('show')) gReturn = document.activeElement;
  $('glbImg').src = imgUrl(x.image_path || x.thumb_path); $('glbImg').alt = x.caption || 'Bottle photo';
  $('glbCap').textContent = x.caption || '';
  $('glbCount').textContent = `${gAt + 1} / ${gList.length}`;
  $('glbPrev').hidden = $('glbNext').hidden = gList.length < 2;
  $('glb').classList.add('show'); document.body.classList.add('lock');
  $('glbClose').focus();
}
function closeG(){ $('glb').classList.remove('show'); document.body.classList.remove('lock'); $('glbImg').removeAttribute('src'); if(gReturn) gReturn.focus(); }

/* ---------- header: menu + search button ---------- */
function openMenu(){ document.body.classList.add('menu'); $('mnav').setAttribute('aria-hidden', 'false'); setTimeout(() => $('closeMenu').focus(), 30); }
function closeMenu(){ if(!document.body.classList.contains('menu')) return; document.body.classList.remove('menu'); $('mnav').setAttribute('aria-hidden', 'true'); }
if($('menuBtn')){ $('menuBtn').onclick = openMenu; $('closeMenu').onclick = () => { closeMenu(); $('menuBtn').focus(); }; }
if($('findBtn')) $('findBtn').onclick = () => {
  const q = $('q');
  if(!q){ location.href = './#search'; return; }
  (q.closest('.search') || q).scrollIntoView({behavior: 'smooth', block: 'center'});
  setTimeout(() => q.focus({preventScroll: true}), 350);
};
if(PAGE === 'perfume' && location.hash === '#search') setTimeout(() => { const q = $('q'); if(q) q.focus(); }, 400);
document.querySelectorAll('[data-wa]').forEach(a => a.addEventListener('click', () => px('Contact', {content_category: 'whatsapp'})));

/* ---------- Privacy page: ads tracking switch ---------- */
const adsBtn = $('adsToggle');
if(adsBtn){
  const paint = () => { $('adsState').textContent = adsOff() ? 'Off on this device' : 'On'; adsBtn.textContent = adsOff() ? 'Turn ads measurement back on' : 'Turn off ads measurement on this device'; };
  paint();
  adsBtn.onclick = () => { try { adsOff() ? localStorage.removeItem('khayr_ads_off') : localStorage.setItem('khayr_ads_off', '1'); } catch(e){} paint(); toast('Saved ✓ It applies the next time a page opens.'); };
}

/* ================= v8: sets, recently viewed, scent finder, Notify me, trust/FAQ/reviews ================= */
function setBuyable(st){ return st.items.every(x => canBuy(findP(x.id), Number(x.size))); }
function setPrice(st){ const full = st.items.reduce((t, x) => t + priceOf(findP(x.id), Number(x.size)), 0); return {full, now: full - Math.round(full * Number(st.pct) / 100)}; }
function renderExtras(filtered){
  if(PAGE !== 'perfume') return;
  const show = !filtered && !PRESET;
  const sets = activeSets().filter(setBuyable);
  if($('setsRow')){
    $('setsRow').hidden = !show || !sets.length;
    $('setsRow').innerHTML = show && sets.length ? `<h2 class="rowh">Discovery sets <small>Try a few, save ${Math.max(...sets.map(x => Number(x.pct)))}%</small></h2><div class="hscroll">` + sets.map(st => {
      const pr = setPrice(st);
      return `<div class="setcard"><b>${esc(st.name || 'Set')}</b>${st.desc ? `<p>${esc(st.desc)}</p>` : ''}<ul>${st.items.map(x => `<li>${esc(findP(x.id).name)} · ${Number(x.size)} ml</li>`).join('')}</ul>
        <div class="setp"><s>${price(pr.full)}</s> <b>${price(pr.now)} tk</b> <span>-${Number(st.pct)}%</span></div><button type="button" class="setadd" data-setadd="${esc(st.id)}">Add set to cart</button></div>`;
    }).join('') + '</div>' : '';
  }
  if($('seenRow')){
    const seen = ls.get('khayr_seen', []).map(findP).filter(p => p && sizesFor(p).length).slice(0, 8);
    $('seenRow').hidden = !show || !seen.length;
    $('seenRow').innerHTML = show && seen.length ? `<h2 class="rowh">Recently viewed</h2><div class="hscroll">` + seen.map(p => { const th = imgUrl(p.thumb_path || p.image_path); return `<button type="button" class="seen" data-pm="${esc(p.id)}">${th ? `<img src="${esc(th)}" alt="" width="72" height="72" loading="lazy">` : '<span class="ph"></span>'}<span>${esc(p.name)}</span></button>`; }).join('') + '</div>' : '';
  }
}
function addSet(id){
  const st = activeSets().find(x => x.id === id); if(!st) return;
  if(!setBuyable(st)){ toast('A perfume in this set is out of stock right now.'); return; }
  st.items.forEach(x => { const z = Number(x.size), have = cart.find(i => i.id === x.id && i.size === z); if(have){ if(have.qty < MAXQ) have.qty++; } else cart.push({id: x.id, type: 'perfume', size: z, qty: 1}); });
  updateCartUI(); render(); toast(`${st.name || 'Set'} added ✓ The set discount is in your cart.`);
  px('AddToCart', {content_ids: st.items.map(x => x.id), content_type: 'product', content_name: st.name || 'Set', value: setPrice(st).now, currency: 'BDT'});
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-setadd]'); if(b){ addSet(b.dataset.setadd); return; }
  const sn = e.target.closest('#seenRow [data-pm], #finderOut [data-pm]'); if(sn){ if($('finder') && !$('finder').hidden) closeFinder(); openPM(sn.dataset.pm); return; }
  if(e.target.closest('[data-finder]')) openFinder();
});

/* Notify me (Stock Out) */
let nmFor = null;
function showNotify(p, size){
  if(!p) return;
  nmFor = {id: p.id, size, name: p.name};
  const sv = details();
  $('pmNotify').hidden = false;
  $('pmNotify').innerHTML = `<b>Notify me when ${esc(p.name)}${size ? ' ' + size + ' ml' : ''} is back</b><p>We send you a WhatsApp message. Your number is only used for this.</p>
    <input id="nmName" maxlength="80" autocomplete="name" placeholder="Your name" value="${esc(saved.name || '')}"><input id="nmPhone" type="tel" inputmode="tel" maxlength="20" autocomplete="tel" placeholder="01XXXXXXXXX" value="${esc(sv.phone || '')}">
    <div class="err" id="nmErr"></div><button type="button" id="nmSend">Notify me</button>`;
  setTimeout(() => { const el = $('pmNotify'); if(el && el.scrollIntoView) el.scrollIntoView({block: 'nearest', behavior: 'smooth'}); }, 30);
}
async function sendNotify(){
  if(!nmFor) return;
  const name = clean($('nmName').value), phone = normPhone($('nmPhone').value);
  if(!/^01[3-9]\d{8}$/.test(phone)){ $('nmErr').textContent = 'Please enter a valid phone number, like 01XXXXXXXXX.'; $('nmErr').style.display = 'block'; return; }
  $('nmSend').disabled = true; $('nmSend').textContent = 'Saving…';
  let j = null;
  try { const r = await fetch(API, {method: 'POST', headers: {'Content-Type': 'application/json', apikey: SB.anonKey}, body: JSON.stringify({action: 'notify_me', id: nmFor.id, size: nmFor.size, name, phone, productName: nmFor.name})}); j = await r.json().catch(() => null); }
  catch(e){ j = null; }
  if(j && j.ok){ if(name && !saved.name){ saved.name = name; ls.set('khayr_customer', saved); } $('pmNotify').innerHTML = `<b class="okline">Done ✓ We will message you on WhatsApp when it is back.</b>`; px('NotifyMe', {content_ids: [nmFor.id]}, null, true); }
  else { $('nmErr').textContent = (j && j.error) || 'Could not save. Check your internet and try again.'; $('nmErr').style.display = 'block'; $('nmSend').disabled = false; $('nmSend').textContent = 'Notify me'; }
}

/* Scent finder: 4 quick questions -> best matches (only uses what you filled in Admin) */
const FIND_SMELL = {fresh: ['fresh', 'citrus', 'aquatic', 'green'], sweet: ['sweet', 'vanilla', 'fruity', 'amber'], woody: ['woody', 'oud', 'leather', 'spicy'], floral: ['floral', 'musky']};
let fq = {season: 'any', smell: 'any', strength: 'any', budget: 'any'};
function finderHTML(){
  const q = (k, label, opts) => `<fieldset><legend>${label}</legend><div class="fopts">${opts.map(([v, l]) => `<button type="button" class="chip" data-fq="${k}" data-fv="${v}" aria-pressed="${fq[k] === v}">${l}</button>`).join('')}</div></fieldset>`;
  return q('season', '1. When will you wear it?', [['summer', 'Summer / hot days'], ['winter', 'Winter / cool days'], ['any', 'Any time']]) +
    q('smell', '2. What do you like?', [['fresh', 'Fresh & clean'], ['sweet', 'Sweet'], ['woody', 'Woody & oud'], ['floral', 'Floral'], ['any', 'Not sure']]) +
    q('strength', '3. How strong?', [['soft', 'Soft'], ['moderate', 'Moderate'], ['strong', 'Strong'], ['any', 'Any']]) +
    q('budget', '4. Budget for 6 ml', [['400', 'Up to 400 tk'], ['700', 'Up to 700 tk'], ['any', 'Any']]);
}
function finderResults(){
  const scored = products.filter(p => buySizes(p).length).map(p => {
    const ref = canBuy(p, 6) ? priceOf(p, 6) : Math.min(...buySizes(p).map(z => priceOf(p, z) * 6 / z));
    if(fq.budget !== 'any' && ref > Number(fq.budget)) return null;
    let sc = 0;
    if(fq.season !== 'any'){ if(p.season === fq.season) sc += 3; else if(p.season === 'all') sc += 2; else if(p.season) sc -= 3; }
    if(fq.smell !== 'any'){ const hit = p.scent.filter(k => FIND_SMELL[fq.smell].includes(k)).length; sc += hit ? 3 + hit : (p.scent.length ? -2 : 0); }
    if(fq.strength !== 'any' && p.strength){ sc += p.strength === fq.strength ? 2 : -1; }
    if(p.badge === 'bestseller') sc += 1;
    return {p, sc, ref};
  }).filter(Boolean).sort((a, b) => b.sc - a.sc || a.p.no - b.p.no);
  return scored.filter(x => x.sc > 0).slice(0, 6).concat(scored.filter(x => x.sc > 0).length ? [] : scored.slice(0, 6));
}
function paintFinder(){
  $('finderQ').innerHTML = finderHTML();
  const res = finderResults().slice(0, 6);
  $('finderOut').innerHTML = res.length ? `<h3>Our picks for you</h3><div class="fres">` + res.map(({p, ref}) => { const th = imgUrl(p.thumb_path || p.image_path); return `<button type="button" class="fcard" data-pm="${esc(p.id)}">${th ? `<img src="${esc(th)}" alt="" width="64" height="64" loading="lazy">` : '<span class="ph"></span>'}<span><b>${esc(p.name)}</b><small>${[sLabel(p.season), ...p.scent.slice(0, 2).map(scLabel)].filter(Boolean).map(esc).join(' · ') || esc(p.house || '')}</small><small>6 ml from ${price(ref)} tk</small></span></button>`; }).join('') + '</div>'
    : '<p class="help">Nothing in that budget right now. Try "Any".</p>';
}
function openFinder(){ if(!$('finder')) return; paintFinder(); $('finder').hidden = false; document.body.classList.add('lock'); setTimeout(() => $('finderClose').focus(), 30); px('FindScent', {}, null, true); }
function closeFinder(){ $('finder').hidden = true; document.body.classList.remove('lock'); }
if($('finder')){
  $('finderClose').onclick = closeFinder;
  $('finder').addEventListener('click', e => { if(e.target === $('finder')) return closeFinder(); const b = e.target.closest('[data-fq]'); if(b){ fq[b.dataset.fq] = b.dataset.fv; paintFinder(); } });
}

/* Trust, customer reviews (only real ones you add in Admin) and FAQ */
function defaultFaq(){
  const d = GEN.delivery || {};
  return [
    {q: 'Are your perfumes original?', a: 'Yes. Every decant is filled from an original, 100% authentic bottle.'},
    {q: 'Which sizes can I buy?', a: `${activeSizes().join(', ')} ml. Every perfume shows its price for each size.`},
    {q: 'How much is delivery?', a: `Inside Sylhet ${dnum(d.insideSylhet, 50)} tk, outside Sylhet ${dnum(d.outsideSylhet, 100)} tk.${freeOver() > 0 ? ` Free delivery all over Bangladesh when your perfumes cost ${price(freeOver())} tk or more.` : ''}`},
    {q: 'How do I order?', a: `Choose a size, tap Add to cart, open the cart, fill in your details and tap Order on WhatsApp${msOn() ? ' or Order on Messenger' : ''}. Then press send.`},
    {q: 'How do I pay?', a: `After you order, we send you our bKash payment details on WhatsApp.${pct() ? ` Pay the full amount now and get ${pct()}% off the perfumes.` : ''}`},
  ];
}
function renderInfo(){
  if(PAGE !== 'perfume' || PRESET) return;
  const rv = (Array.isArray(GEN.reviews) ? GEN.reviews : []).filter(r => r && clean(r.text)), rp = reviewPhotos();
  if($('reviews')){
    $('reviews').hidden = !rv.length && !rp.length;
    $('reviews').innerHTML = rv.length || rp.length ? `<h2 class="rowh">What customers say${rp.length ? ` <small>Real reviews from our Facebook page</small>` : ''}</h2><div class="hscroll">`
      + rp.map((x, i) => `<button type="button" class="rvphoto" data-rvp="${i}" aria-label="Open customer review ${i + 1}"><img src="${esc(imgUrl(x.thumb_path || x.image_path))}" alt="Customer review ${i + 1}" loading="lazy" decoding="async"></button>`).join('')
      + rv.slice(0, 20).map(r => `<figure class="review"><blockquote>“${esc(clean(r.text))}”</blockquote><figcaption>${esc(clean(r.name) || 'Customer')}${clean(r.place) ? ', ' + esc(clean(r.place)) : ''}</figcaption></figure>`).join('') + '</div>' : '';
    $('reviews').onclick = e => { const b = e.target.closest('[data-rvp]'); if(!b) return; const x = rp[Number(b.dataset.rvp)]; if(x) openPhoto(imgUrl(x.image_path || x.thumb_path), 'Customer review'); };
  }
  // the delivery answer always shows today's charges (Admin > Payment), even if the FAQ was saved earlier
  const liveDel = defaultFaq().find(x => x.q === 'How much is delivery?');
  const fq2 = (Array.isArray(GEN.faq) && GEN.faq.length ? GEN.faq : defaultFaq()).filter(x => x && clean(x.q) && clean(x.a))
    .map(x => /^Inside Sylhet \d+ tk, outside Sylhet \d+ tk\./.test(clean(x.a)) ? {q: x.q, a: liveDel.a} : x);
  if($('faq')) $('faq').innerHTML = `<h2 class="rowh">Questions</h2>` + fq2.map(x => `<details><summary>${esc(clean(x.q))}</summary><p>${esc(clean(x.a))}</p></details>`).join('');
}

/* ================= v10: top bar, social links, returns page, review photos ================= */
function renderTopbar(){
  const bar = $('topbar'); if(!bar) return;
  const msgs = (Array.isArray(GEN.topbar) ? GEN.topbar : []).map(clean).filter(Boolean).slice(0, 8);
  bar.hidden = !msgs.length;
  if(!msgs.length) return;
  const one = msgs.map(m => `<span>${esc(m)}</span>`).join('<i aria-hidden="true">•</i>');
  // the text is written twice so the scroll loops without a gap; the copy is hidden from screen readers
  $('tbTrack').innerHTML = `<div class="tb-set">${one}<i aria-hidden="true">•</i></div><div class="tb-set" aria-hidden="true">${one}<i aria-hidden="true">•</i></div>`;
  $('tbTrack').style.animationDuration = Math.max(18, msgs.join(' ').length * 0.28) + 's';
}
const SOCIAL = {
  facebook: ['Facebook', '<path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5H17V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8.2v3h2.6V21h2.7Z"/>'],
  instagram: ['Instagram', '<path d="M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2Zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2Zm6.1-8.1a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM21.4 8c-.1-1.5-.4-2.9-1.5-4s-2.5-1.4-4-1.5C14.3 2.4 9.7 2.4 8.1 2.5c-1.5.1-2.9.4-4 1.5S2.6 6.5 2.5 8c-.1 1.6-.1 6.2 0 7.9.1 1.5.4 2.9 1.5 4s2.5 1.4 4 1.5c1.6.1 6.2.1 7.9 0 1.5-.1 2.9-.4 4-1.5s1.4-2.5 1.5-4c.1-1.6.1-6.2 0-7.9Zm-2.1 9.6a3.2 3.2 0 0 1-1.8 1.8c-1.3.5-4.3.4-5.6.4s-4.4.1-5.6-.4a3.2 3.2 0 0 1-1.8-1.8c-.5-1.3-.4-4.3-.4-5.6s-.1-4.4.4-5.6a3.2 3.2 0 0 1 1.8-1.8c1.3-.5 4.3-.4 5.6-.4s4.4-.1 5.6.4a3.2 3.2 0 0 1 1.8 1.8c.5 1.3.4 4.3.4 5.6s.1 4.4-.4 5.6Z"/>'],
  tiktok: ['TikTok', '<path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-1.8-2.5V9.8a5.7 5.7 0 1 0 4.9 5.6V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6Z"/>'],
  youtube: ['YouTube', '<path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z"/>'],
  whatsapp: ['WhatsApp', '<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.4-.3Z"/>'],
  other: ['Link', '<path d="M10.6 13.4a1 1 0 0 1 0-1.4l3.5-3.5a1 1 0 1 1 1.4 1.4L12 13.4a1 1 0 0 1-1.4 0ZM8 17a3 3 0 0 1-2.1-5.1l2.3-2.3a1 1 0 0 1 1.4 1.4l-2.3 2.3A1 1 0 0 0 8.7 15l2.3-2.3a1 1 0 1 1 1.4 1.4l-2.3 2.3A3 3 0 0 1 8 17Zm7.8-2.6a1 1 0 0 1-.7-1.7l2.3-2.3A1 1 0 0 0 16 9l-2.3 2.3a1 1 0 1 1-1.4-1.4L14.6 7.6a3 3 0 0 1 4.2 4.2l-2.3 2.3a1 1 0 0 1-.7.3Z"/>'],
};
const safeLink = u => { try { const x = new URL(String(u || '').trim()); return x.protocol === 'https:' ? x.href : ''; } catch(e){ return ''; } };
function renderSocial(){
  const box = $('social'); if(!box) return;
  const list = (Array.isArray(GEN.social) ? GEN.social : []).map(x => ({type: SOCIAL[x && x.type] ? x.type : 'other', url: safeLink(x && x.url), label: clean(x && x.label)})).filter(x => x.url).slice(0, 10);
  box.hidden = !list.length;
  box.innerHTML = list.map(x => { const [name, path] = SOCIAL[x.type], label = x.type === 'other' && x.label ? x.label : name;
    return `<a href="${esc(x.url)}" target="_blank" rel="noopener" aria-label="KHAYR on ${esc(label)}" data-social="${x.type}"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${path}</svg><span>${esc(label)}</span></a>`; }).join('');
}
function renderReturns(){
  if(PAGE !== 'returns') return;
  const n = Number(GEN.returnDays);
  document.querySelectorAll('[data-days]').forEach(el => {
    el.textContent = Number.isInteger(n) && n > 0 ? `Please tell us within ${n} day${n === 1 ? '' : 's'} of delivery.` : 'Please tell us as soon as possible after delivery.';
  });
}
function reviewPhotos(){ return (Array.isArray(GEN.reviewPhotos) ? GEN.reviewPhotos : []).filter(x => x && (x.image_path || x.thumb_path)).slice(0, 40); }

/* ---------- toast + back to top ---------- */
let tt;
/* Collection pages (/collections/summer/ …): Copy link button */
async function copyLink(url){
  try { await navigator.clipboard.writeText(url); return true; } catch(_){}
  try { const ta = document.createElement('textarea'); ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch(_){ return false; }
}
document.querySelectorAll('[data-colcopy]').forEach(b => b.addEventListener('click', async () => {
  const url = location.origin + location.pathname;
  toast(await copyLink(url) ? 'Link copied ✓' : url);
}));
function toast(t){ const el = $('toast'); el.textContent = LANG === 'bn' ? (bnText(t) || t) : t; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 2600); }
let tick = false;
window.addEventListener('scroll', () => {
  if(tick) return; tick = true;
  requestAnimationFrame(() => { $('toTop').classList.toggle('show', window.scrollY > 1100); tick = false; });
}, {passive: true});
$('toTop').onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});

load();
})();

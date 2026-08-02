// Momentum — habit tracker with local storage + GitHub Gist sync (plain JSON).
(() => {
  "use strict";

  /* ================================================================
   * Constants
   * ================================================================ */

  const KEYS = {
    data: "ht_data",
    syncToken: "ht_sync_token",
    syncGistId: "ht_sync_gist_id",
    syncEnabled: "ht_sync_enabled",
    lastSynced: "ht_last_synced",
    lastSyncedHash: "ht_last_synced_hash",
    theme: "ht_theme",
    todayFilter: "ht_today_filter",
    remindersEnabled: "ht_reminders_enabled",
    compact: "ht_compact",
    showDetails: "ht_show_details",
    showTodayNotes: "ht_show_today_notes",
    fastingCollapsed: "ht_fasting_collapsed",
    hintSeen: "ht_hint_seen",
    units: "ht_units",
    deviceName: "ht_device_name",
    reminderDefault: "ht_reminder_default",
    quietStart: "ht_quiet_start",
    quietEnd: "ht_quiet_end",
    reminderSound: "ht_reminder_sound",
    morningDigest: "ht_morning_digest",
    eveningNudge: "ht_evening_nudge",
    weeklyReport: "ht_weekly_report",
    snoozeMin: "ht_snooze_min",
    pushUrl: "ht_push_url",
    pushVapid: "ht_push_vapid",
    pushEnabled: "ht_push_enabled",
    pushDeviceId: "ht_push_device_id",
    timeFormat: "ht_time_format",
    onboardSeen: "ht_onboard_seen",
    lastBackup: "ht_last_backup",
    lastNotif: "ht_last_notif",
    accent: "ht_accent",
    textSize: "ht_text_size",
    contrast: "ht_contrast",
    odClientId: "ht_od_client_id",
    odAccess: "ht_od_access",
    odRefresh: "ht_od_refresh",
    odExpiry: "ht_od_expiry",
    odEnabled: "ht_od_enabled",
    odAuto: "ht_od_auto",
    odLastSync: "ht_od_last_sync",
  };
  const DEFAULT_CATEGORIES = ["Fitness","Nutrition","Sleep","Supplements","Custom"];
  // Fallback color/icon per default category (used until the user customizes).
  const DEFAULT_CATEGORY_META = {
    Fitness: { color: "#6366f1", icon: "🏋️" },
    Nutrition: { color: "#14b8a6", icon: "🥗" },
    Sleep: { color: "#a855f7", icon: "😴" },
    Supplements: { color: "#ec4899", icon: "💊" },
    Custom: { color: "#64748b", icon: "🏷️" },
  };
  function getCategories() {
    return (state.categories && state.categories.length) ? state.categories : DEFAULT_CATEGORIES;
  }
  function categoryMeta(name) {
    const m = (state.categoryMeta && state.categoryMeta[name]) || DEFAULT_CATEGORY_META[name] || {};
    return { color: m.color || "#64748b", icon: m.icon || "🏷️" };
  }
  // Legacy keys we can read from to migrate old data.
  const LEGACY_PLAIN_KEYS = ["habit-tracker.v2", "habit-tracker.v1"];
  // Old encryption-era keys we want to clean up on Reset.
  const LEGACY_KEYS_TO_CLEAR = ["ht_data_enc", "ht_salt", "ht_auto_lock"];

  const SYNC_FILENAME = "health-tracker.json";

  const ICONS = [
    "💧","🏃","📖","🧘","🥗","💪","😴","🎯",
    "☕","🎨","🎵","✍️","🧠","🌱","🚶","🧹",
    "🏋️","🍗","🥩","🍎","🥦","☀️","🐟","💊",
    "🌙","⏰","🧴","🩺","❤️","🥛","🧃","📿"
  ];
  const COLORS = ["#6366f1","#14b8a6","#22c55e","#3b82f6",
                  "#ec4899","#f59e0b","#ef4444","#a855f7"];

  // ---- Template library ----
  // Each section groups related habits. Items inherit sensible defaults
  // (type: check, every day) unless overridden.
  const TEMPLATE_LIBRARY = [
    {
      title: "🏋️ Fitness & movement",
      items: [
        { name: "Stair climber",   icon: "🏋️", color: "#f59e0b", category: "Fitness", time: "6:30 AM · gym", days: [1,2,3,4,5], notes: "30 min stair climber" },
        { name: "Treadmill",       icon: "🏃",  color: "#f59e0b", category: "Fitness", time: "6:30 AM · gym", days: [1,2,3,4,5], notes: "30 min treadmill" },
        { name: "Morning walk",    icon: "🚶",  color: "#22c55e", category: "Fitness", time: "7:30 AM", notes: "10k steps" },
        { name: "Evening walk",    icon: "🚶",  color: "#22c55e", category: "Fitness", time: "5:30 PM", notes: "10k steps" },
        { name: "Strength training", icon: "💪", color: "#6366f1", category: "Fitness", time: "Morning", days: [1,3,5], notes: "Push / pull / legs split" },
        { name: "Stretch / mobility", icon: "🧘", color: "#14b8a6", category: "Fitness", time: "Evening", notes: "10 min mobility flow" },
        { name: "Core / abs",      icon: "🎯",  color: "#ec4899", category: "Fitness", time: "Morning", days: [2,4,6], notes: "Quality reps over quantity — protect your form." },
        { name: "10,000 steps",    icon: "🚶",  color: "#22c55e", category: "Fitness", time: "All day", notes: "Daily step goal", type: "count", target: 10000, unit: "steps", increment: 1000 },
        { name: "Foam rolling",    icon: "🧴",  color: "#a855f7", category: "Fitness", time: "Evening", notes: "Move slowly; hold each stretch 20–30s, no bouncing." },
        { name: "Pull-ups",        icon: "🏋️",  color: "#6366f1", category: "Fitness", time: "Morning", notes: "Sets to target" },
      ],
    },
    {
      title: "🧍 Posture & body",
      items: [
        { name: "Posture pulls",   icon: "🧍",  color: "#3b82f6", category: "Fitness", time: "All day", notes: "Band pull-aparts / posture resets" },
        { name: "Finger lengthening exercises", icon: "🖐️", color: "#14b8a6", category: "Fitness", time: "Evening", notes: "Stretch & decompression routine" },
        { name: "Stand tall check", icon: "🧍", color: "#a855f7", category: "Custom", time: "All day", notes: "Posture check-ins through the day" },
      ],
    },
    {
      title: "🥗 Nutrition & hydration",
      items: [
        { name: "Calories on target", icon: "🥗", color: "#14b8a6", category: "Nutrition", time: "All day", notes: "2,000-2,200 cal" },
        { name: "Protein target",  icon: "🍗",  color: "#ec4899", category: "Nutrition", time: "All day", notes: "180-200 g", type: "count", target: 180, unit: "g", increment: 20 },
        { name: "Water 4 L",       icon: "💧",  color: "#3b82f6", category: "Nutrition", time: "All day", notes: "Stay hydrated", type: "count", target: 4, unit: "L", increment: 0.5 },
        { name: "Eat vegetables",  icon: "🥦",  color: "#22c55e", category: "Nutrition", time: "All day", notes: "Veggies with 2+ meals" },
        { name: "Eat fruit",       icon: "🍎",  color: "#ef4444", category: "Nutrition", time: "All day", notes: "Add colour to your plate — aim for variety." },
        { name: "No junk food",    icon: "🎯",  color: "#f59e0b", category: "Nutrition", time: "All day", notes: "One day at a time — your clean streak keeps count." },
        { name: "No sugary drinks", icon: "🧃", color: "#38bdf8", category: "Nutrition", time: "All day", notes: "One day at a time — your clean streak keeps count." },
        { name: "Intermittent fasting", icon: "⏰", color: "#a855f7", category: "Nutrition", time: "All day", notes: "16:8 window" },
        { name: "Morning coffee",  icon: "☕",  color: "#f59e0b", category: "Nutrition", time: "Morning", notes: "Enjoy it — just keep caffeine to earlier in the day." },
      ],
    },
    {
      title: "😴 Sleep & recovery",
      items: [
        { name: "Bedtime",         icon: "😴",  color: "#a855f7", category: "Sleep", time: "10:30 PM", notes: "Lights out by 10:30 PM", nightPrevDay: true },
        { name: "7-8 hours sleep", icon: "🌙",  color: "#3b82f6", category: "Sleep", time: "Morning", notes: "Log a good night" },
        { name: "No screens before bed", icon: "📴", color: "#6366f1", category: "Sleep", time: "10:00 PM", notes: "30 min before bed", nightPrevDay: true },
        { name: "Wake up on time", icon: "⏰",  color: "#f59e0b", category: "Sleep", time: "6:00 AM", notes: "No snooze" },
        { name: "Morning sunlight", icon: "☀️", color: "#f59e0b", category: "Sleep", time: "Morning", notes: "10 min outdoors" },
      ],
    },
    {
      title: "💊 Supplements — 8:00 AM (with meal, needs fat)",
      items: [
        { name: "D3+K2 (Sports Research)", icon: "☀️", color: "#f59e0b", category: "Supplements", time: "8:00 AM · with meal 1 (needs fat)", notes: "1 softgel — 125mcg (5000 IU) D3 + 100mcg K2. Fat-soluble: take with a meal that has some fat. Morning is best so it doesn't disturb sleep." },
        { name: "Omega-3 #1 (Alaskan)", icon: "🐟", color: "#38bdf8", category: "Supplements", time: "8:00 AM · with meal 1 (needs fat)", notes: "1st softgel — 1250mg oil / 1040mg omega-3 (EPA+DHA). Take with food to absorb better and avoid fishy burps." },
        { name: "B-Complex #12 (Thorne)", icon: "💊", color: "#ec4899", category: "Supplements", time: "8:00 AM · with meal 1 (needs fat)", notes: "1 capsule with breakfast. B vitamins are energizing — take in the morning, not at night, and with food to avoid stomach upset." },
        { name: "5-MTHF 1mg (Thorne)", icon: "💊", color: "#a78bfa", category: "Supplements", time: "8:00 AM · with meal 1 (needs fat)", notes: "1 capsule (1mg active methylfolate) with the morning meal." },
        { name: "Tongkat Ali (Momentous)", icon: "🌱", color: "#22c55e", category: "Supplements", time: "8:00 AM · with meal 1 (needs fat)", notes: "1 serving in the morning with food — can be stimulating, so avoid taking it late." },
      ],
    },
    {
      title: "💊 Supplements — 10:30 AM (alone)",
      items: [
        { name: "Psyllium Husk (Nutricost)", icon: "🌿", color: "#14b8a6", category: "Supplements", time: "10:30 AM · alone, 2-hr buffer either side", notes: "3 caps (1,500mg) with a big glass of water (400ml). Fiber binds other pills/meds — keep a 2-hour gap either side." },
      ],
    },
    {
      title: "💊 Supplements — 6:00 PM (post-workout)",
      items: [
        { name: "Omega-3 #2 (Alaskan)", icon: "🐟", color: "#38bdf8", category: "Supplements", time: "6:00 PM · post-workout / meal 3", notes: "2nd softgel with a meal — splitting the two doses (AM/PM) eases digestion." },
        { name: "Multi Collagen (Sports Research)", icon: "💊", color: "#ef4444", category: "Supplements", time: "6:00 PM · post-workout / meal 3", notes: "3 caps. Pairs well with vitamin C for collagen synthesis." },
        { name: "Zinc Picolinate 15mg (Thorne)", icon: "💊", color: "#a855f7", category: "Supplements", time: "6:00 PM · post-workout / meal 3", notes: "1 cap (15mg) with food to avoid nausea. Space ~2h from calcium, iron, and magnesium — they compete for absorption." },
        { name: "Creatine", icon: "💪", color: "#6366f1", category: "Supplements", time: "6:00 PM · post-workout / meal 3", notes: "5g daily. Timing doesn't matter much — daily consistency is what counts. Have with water." },
      ],
    },
    {
      title: "💊 Supplements — 7:30 PM (wind-down)",
      items: [
        { name: "Magnesium Glycinate (Thorne)", icon: "🌙", color: "#3b82f6", category: "Supplements", time: "7:30 PM · wind-down", notes: "~200-400mg in the evening — the glycinate form is calming and supports sleep. Take with a little food; keep ~2h from zinc." },
        { name: "Ashwagandha (Momentous)", icon: "🌿", color: "#a78bfa", category: "Supplements", time: "7:30 PM · wind-down", notes: "300-600mg KSM-66 in the evening for stress/sleep. Give it 4-6 weeks for the effect; take with food." },
      ],
    },
    {
      title: "💊 Supplements — other common",
      items: [
        { name: "Multivitamin",    icon: "💊",  color: "#f59e0b", category: "Supplements", time: "Morning", notes: "1 serving with breakfast — it contains fat-soluble vitamins (A/D/E/K) that need food to absorb." },
        { name: "Vitamin C",       icon: "🍊",  color: "#f59e0b", category: "Supplements", time: "Morning", notes: "500-1000mg with food (can upset an empty stomach). Water-soluble, so split larger doses AM/PM." },
        { name: "Probiotic",       icon: "🦠",  color: "#22c55e", category: "Supplements", time: "Morning", notes: "1 capsule daily, same time each day. With or just before a meal is fine — consistency matters most." },
        { name: "Electrolytes",    icon: "🧂",  color: "#38bdf8", category: "Supplements", time: "All day", notes: "1 serving in water around activity or heat — sodium, potassium & magnesium to stay hydrated." },
        { name: "Pre-workout",     icon: "⚡",  color: "#ef4444", category: "Supplements", time: "Afternoon", notes: "1 scoop 20-30 min before training. Skip late in the day if it contains caffeine." },
        { name: "Whey protein shake", icon: "🥛", color: "#ec4899", category: "Supplements", time: "6:00 PM · post-workout", notes: "1 scoop (~25g protein) within a couple of hours of training, or to top up your daily protein." },
        { name: "Amla + Collagen", icon: "💊",  color: "#22c55e", category: "Supplements", time: "Morning", notes: "For hair, skin & nails — take with vitamin C to support collagen." },
        { name: "Cinnamon Turmeric ACV", icon: "🍯", color: "#f59e0b", category: "Supplements", time: "8:00 AM & 8:00 PM", notes: "Twice a day — morning & evening. Dilute 1 tbsp ACV in water; turmeric absorbs better with black pepper + a little fat. Sip through a straw to protect tooth enamel.", type: "count", target: 2, unit: "", increment: 1, reminderTimes: ["08:00", "20:00"] },
      ],
    },
    {
      title: "💇 Hair & grooming",
      items: [
        { name: "Hair oil",        icon: "🧴",  color: "#f59e0b", category: "Custom", time: "Evening", notes: "Scalp massage + oil" },
        { name: "Hair seed paste", icon: "🌱",  color: "#22c55e", category: "Custom", time: "Evening", notes: "Apply & leave in" },
        { name: "Red light therapy cap", icon: "🔴", color: "#ef4444", category: "Custom", time: "Evening", notes: "10-15 min session" },
        { name: "Scalp massage",   icon: "💆",  color: "#a855f7", category: "Custom", time: "Evening", notes: "Be gentle; results come from consistency, not intensity." },
      ],
    },
    {
      title: "🧠 Mind & wellbeing",
      items: [
        { name: "Meditate",        icon: "🧘",  color: "#a855f7", category: "Custom", time: "Morning", notes: "10 min" },
        { name: "Journal",         icon: "✍️",  color: "#3b82f6", category: "Custom", time: "Evening", notes: "A sentence or two is enough to count." },
        { name: "Gratitude — 3 things", icon: "❤️", color: "#ec4899", category: "Custom", time: "Evening", notes: "A sentence or two is enough to count." },
        { name: "Read",            icon: "📖",  color: "#14b8a6", category: "Custom", time: "Evening", notes: "20 min" },
        { name: "Breathwork",      icon: "🌬️",  color: "#38bdf8", category: "Custom", time: "Anytime", notes: "Even 5 minutes counts — just notice the breath." },
        { name: "Digital detox hour", icon: "📵", color: "#6366f1", category: "Custom", time: "Evening", notes: "Protect your attention — set the phone out of reach." },
      ],
    },
    {
      title: "🧴 Self-care & hygiene",
      items: [
        { name: "Skincare — AM",   icon: "🧴",  color: "#ec4899", category: "Custom", time: "Morning", notes: "Gentle, consistent care — a little each day." },
        { name: "Skincare — PM",   icon: "🧴",  color: "#a855f7", category: "Custom", time: "Evening", notes: "Gentle, consistent care — a little each day." },
        { name: "Floss",           icon: "🦷",  color: "#38bdf8", category: "Custom", time: "10:30 PM", notes: "Two full minutes; don't rush it." },
        { name: "Sunscreen",       icon: "☀️",  color: "#f59e0b", category: "Custom", time: "Morning", notes: "Gentle, consistent care — a little each day." },
        { name: "Cold shower",     icon: "🚿",  color: "#3b82f6", category: "Custom", time: "Morning", notes: "Recovery is part of the training — don't skip it." },
      ],
    },
    {
      title: "🎯 Productivity & lifestyle",
      items: [
        { name: "Plan the day",    icon: "📝",  color: "#6366f1", category: "Custom", time: "Morning", notes: "Top 3 priorities" },
        { name: "Deep work block", icon: "🧠",  color: "#3b82f6", category: "Custom", time: "Morning", notes: "90 min focused" },
        { name: "Inbox to zero",   icon: "📧",  color: "#14b8a6", category: "Custom", time: "Afternoon", notes: "Protect your attention — set the phone out of reach." },
        { name: "Tidy space",      icon: "🧹",  color: "#22c55e", category: "Custom", time: "Evening", notes: "Small and done beats big and someday." },
        { name: "Learn / study",   icon: "📚",  color: "#f59e0b", category: "Custom", time: "Evening", notes: "30 min" },
        { name: "Practice instrument", icon: "🎵", color: "#ec4899", category: "Custom", time: "Evening", notes: "15 focused minutes beats an hour of noodling." },
      ],
    },
    {
      title: "🏃 Cardio & sports",
      items: [
        { name: "Run",             icon: "🏃",  color: "#ef4444", category: "Fitness", time: "Morning", notes: "Warm up first; keep it conversational unless it's a hard day." },
        { name: "Cycling",         icon: "🚴",  color: "#f59e0b", category: "Fitness", time: "Morning", notes: "Comfortable cadence; save the hard efforts for set days." },
        { name: "Swim",            icon: "🏊",  color: "#38bdf8", category: "Fitness", time: "Morning", notes: "Focus on smooth strokes over speed." },
        { name: "Yoga",            icon: "🧘",  color: "#a855f7", category: "Fitness", time: "Morning", notes: "Match breath to movement; ease into each pose." },
        { name: "HIIT session",    icon: "🔥",  color: "#ef4444", category: "Fitness", time: "Morning", days: [2,4], notes: "Quality reps over quantity — protect your form." },
        { name: "Sports / game",   icon: "⚽",  color: "#22c55e", category: "Fitness", time: "Evening", days: [6], notes: "Warm up, focus on form, and keep it consistent." },
        { name: "Jump rope",       icon: "🪢",  color: "#3b82f6", category: "Fitness", time: "Morning", notes: "Warm up, focus on form, and keep it consistent." },
      ],
    },
    {
      title: "🧖 Recovery & stress",
      items: [
        { name: "Sauna",           icon: "🧖",  color: "#ef4444", category: "Sleep", time: "Evening", notes: "Recovery is part of the training — don't skip it." },
        { name: "Cold plunge / shower", icon: "🧊", color: "#38bdf8", category: "Fitness", time: "Morning", notes: "Recovery is part of the training — don't skip it." },
        { name: "Massage gun",     icon: "💆",  color: "#a855f7", category: "Fitness", time: "Evening", notes: "Recovery is part of the training — don't skip it." },
        { name: "Box breathing",   icon: "🌬️",  color: "#14b8a6", category: "Custom", time: "Anytime", notes: "4-4-4-4" },
        { name: "Power nap",       icon: "😴",  color: "#6366f1", category: "Sleep", time: "Afternoon", notes: "20 min" },
        { name: "Stretch before bed", icon: "🧘", color: "#a855f7", category: "Sleep", time: "10:00 PM", notes: "Move slowly; hold each stretch 20–30s, no bouncing." },
      ],
    },
    {
      title: "🍵 Drinks & extras",
      items: [
        { name: "Lemon water",     icon: "🍋",  color: "#f59e0b", category: "Nutrition", time: "Morning", notes: "Sip steadily through the day; don't chug it all at once." },
        { name: "Green tea",       icon: "🍵",  color: "#22c55e", category: "Nutrition", time: "Afternoon", notes: "Enjoy it — just keep caffeine to earlier in the day." },
        { name: "Bone broth",      icon: "🍲",  color: "#f59e0b", category: "Nutrition", time: "Evening", notes: "Small, steady choices add up over the week." },
        { name: "No alcohol",      icon: "🚫",  color: "#ef4444", category: "Nutrition", time: "All day", notes: "One day at a time — your clean streak keeps count." },
        { name: "No caffeine after 2pm", icon: "☕", color: "#a855f7", category: "Nutrition", time: "Afternoon", notes: "One day at a time — your clean streak keeps count." },
        { name: "Take vitamins with food", icon: "💊", color: "#3b82f6", category: "Supplements", time: "8:00 AM · with meal 1", notes: "Take as directed; pair with food if it's easier on your stomach." },
      ],
    },
    {
      title: "🦷 Dental & eye care",
      items: [
        { name: "Brush teeth (AM)", icon: "🪥", color: "#38bdf8", category: "Custom", time: "Morning", notes: "Two full minutes; don't rush it." },
        { name: "Brush teeth (PM)", icon: "🪥", color: "#3b82f6", category: "Custom", time: "10:30 PM", notes: "Two full minutes; don't rush it." },
        { name: "Mouthwash",       icon: "🦷",  color: "#14b8a6", category: "Custom", time: "10:30 PM", notes: "Two full minutes; don't rush it." },
        { name: "Whitening strips", icon: "✨", color: "#a855f7", category: "Custom", time: "Evening", days: [1,4], notes: "Two full minutes; don't rush it." },
        { name: "Eye breaks (20-20-20)", icon: "👀", color: "#22c55e", category: "Custom", time: "All day", notes: "Every 20 min, look 20ft away 20s" },
      ],
    },
    {
      title: "🧠 Mental health",
      items: [
        { name: "Therapy session", icon: "🛋️",  color: "#a855f7", category: "Custom", time: "Afternoon", days: [3], notes: "Keep it simple and do it consistently." },
        { name: "No doom-scrolling", icon: "📵", color: "#ef4444", category: "Custom", time: "All day", notes: "One day at a time — your clean streak keeps count." },
        { name: "Worry journal",   icon: "📓",  color: "#3b82f6", category: "Custom", time: "Evening", notes: "A sentence or two is enough to count." },
        { name: "Affirmations",    icon: "💬",  color: "#ec4899", category: "Custom", time: "Morning", notes: "A sentence or two is enough to count." },
        { name: "Time in nature",  icon: "🌳",  color: "#22c55e", category: "Custom", time: "Afternoon", notes: "A quiet moment to reset and refocus." },
        { name: "Screen-free meal", icon: "🍽️", color: "#f59e0b", category: "Custom", time: "Evening", notes: "Protect your attention — set the phone out of reach." },
      ],
    },
    {
      title: "❤️ Relationships & social",
      items: [
        { name: "Call family",     icon: "📞",  color: "#ec4899", category: "Custom", time: "Evening", days: [0], notes: "Presence over perfection — put the phone away." },
        { name: "Text a friend",   icon: "💬",  color: "#38bdf8", category: "Custom", time: "Anytime", notes: "Presence over perfection — put the phone away." },
        { name: "Quality time",    icon: "❤️",  color: "#ef4444", category: "Custom", time: "Evening", notes: "Phone away" },
        { name: "Date night",      icon: "🌹",  color: "#ec4899", category: "Custom", time: "Evening", days: [5], notes: "Presence over perfection — put the phone away." },
        { name: "Random act of kindness", icon: "🤝", color: "#22c55e", category: "Custom", time: "All day", notes: "Presence over perfection — put the phone away." },
      ],
    },
    {
      title: "💰 Money & admin",
      items: [
        { name: "Log expenses",    icon: "🧾",  color: "#14b8a6", category: "Custom", time: "Evening", notes: "A quick check-in keeps you in control." },
        { name: "No impulse buys", icon: "🛑",  color: "#ef4444", category: "Custom", time: "All day", notes: "One day at a time — your clean streak keeps count." },
        { name: "Check budget",    icon: "💰",  color: "#f59e0b", category: "Custom", time: "Evening", days: [0], notes: "Weekly review" },
        { name: "Pack lunch",      icon: "🥪",  color: "#22c55e", category: "Custom", time: "Morning", days: [1,2,3,4,5], notes: "Plan ahead so the easy choice is the healthy one." },
      ],
    },
    {
      title: "🏠 Home & pets",
      items: [
        { name: "Make the bed",    icon: "🛏️",  color: "#6366f1", category: "Custom", time: "Morning", notes: "Small and done beats big and someday." },
        { name: "Do the dishes",   icon: "🍽️",  color: "#14b8a6", category: "Custom", time: "Evening", notes: "Small and done beats big and someday." },
        { name: "Water the plants", icon: "🪴", color: "#22c55e", category: "Custom", time: "Morning", days: [1,4], notes: "Check the soil first — most plants like it slightly dry." },
        { name: "Laundry",         icon: "🧺",  color: "#38bdf8", category: "Custom", time: "Evening", days: [0], notes: "Small and done beats big and someday." },
        { name: "Walk the dog",    icon: "🐕",  color: "#f59e0b", category: "Custom", time: "Morning", notes: "Keep a brisk, easy pace — even a short loop counts." },
        { name: "Feed the pet",    icon: "🐾",  color: "#ec4899", category: "Custom", time: "Morning", notes: "A tiny daily bit of care keeps things thriving." },
        { name: "Take out trash",  icon: "🗑️",  color: "#a855f7", category: "Custom", time: "Evening", days: [2,5], notes: "Small and done beats big and someday." },
      ],
    },
    {
      title: "🚭 Quit / reduce",
      items: [
        { name: "No smoking",      icon: "🚭",  color: "#ef4444", category: "Custom", time: "All day", notes: "One day at a time — your clean streak keeps count." },
        { name: "No vaping",       icon: "💨",  color: "#ef4444", category: "Custom", time: "All day", notes: "One day at a time — your clean streak keeps count." },
        { name: "No nail biting",  icon: "💅",  color: "#ec4899", category: "Custom", time: "All day", notes: "One day at a time — your clean streak keeps count." },
        { name: "No soda",         icon: "🥤",  color: "#f59e0b", category: "Nutrition", time: "All day", notes: "One day at a time — your clean streak keeps count." },
        { name: "Screen curfew",   icon: "🌙",  color: "#6366f1", category: "Sleep", time: "10:00 PM", notes: "No screens after", nightPrevDay: true },
      ],
    },
    {
      title: "📚 Learning & growth",
      items: [
        { name: "Language practice", icon: "🗣️", color: "#3b82f6", category: "Custom", time: "Morning", notes: "e.g. Duolingo" },
        { name: "Read 10 pages",   icon: "📖",  color: "#14b8a6", category: "Custom", time: "Evening", notes: "A few pages is plenty — consistency beats volume." },
        { name: "Listen to a podcast", icon: "🎧", color: "#a855f7", category: "Custom", time: "Anytime", notes: "Keep it simple and do it consistently." },
        { name: "Online course",   icon: "💻",  color: "#6366f1", category: "Custom", time: "Evening", notes: "Short focused blocks beat long cram sessions." },
        { name: "Write / blog",    icon: "✍️",  color: "#ec4899", category: "Custom", time: "Evening", notes: "A calm end helps everything else fall into place." },
      ],
    },
    {
      title: "🏋️ Strength & muscle",
      items: [
        { name: "Push day",        icon: "💪",  color: "#6366f1", category: "Fitness", time: "Morning", days: [1], notes: "Chest, shoulders, triceps" },
        { name: "Pull day",        icon: "🏋️",  color: "#3b82f6", category: "Fitness", time: "Morning", days: [3], notes: "Back, biceps" },
        { name: "Leg day",         icon: "🦵",  color: "#ef4444", category: "Fitness", time: "Morning", days: [5], notes: "Squats, hamstrings, calves" },
        { name: "Progressive overload log", icon: "📈", color: "#14b8a6", category: "Fitness", time: "Morning", notes: "Beat last week" },
        { name: "Warm-up",         icon: "🔥",  color: "#f59e0b", category: "Fitness", time: "Morning", notes: "Quality reps over quantity — protect your form." },
        { name: "Post-workout protein", icon: "🥤", color: "#ec4899", category: "Nutrition", time: "Morning", notes: "Within 1 hr" },
      ],
    },
    {
      title: "🧘 Mindfulness & spiritual",
      items: [
        { name: "Morning meditation", icon: "🧘", color: "#a855f7", category: "Custom", time: "Morning", notes: "10 min" },
        { name: "Prayer",          icon: "🙏",  color: "#6366f1", category: "Custom", time: "Morning", notes: "A quiet moment to reset and refocus." },
        { name: "Read scripture",  icon: "📿",  color: "#f59e0b", category: "Custom", time: "Morning", notes: "A few pages is plenty — consistency beats volume." },
        { name: "Gratitude journal", icon: "🙌", color: "#ec4899", category: "Custom", time: "Evening", notes: "3 things" },
        { name: "Visualisation",   icon: "🌅",  color: "#38bdf8", category: "Custom", time: "Morning", notes: "A quiet moment to reset and refocus." },
        { name: "Evening reflection", icon: "🕯️", color: "#a855f7", category: "Custom", time: "10:00 PM", notes: "A sentence or two is enough to count." },
      ],
    },
    {
      title: "🍳 Meal prep & cooking",
      items: [
        { name: "Meal prep",       icon: "🍱",  color: "#22c55e", category: "Nutrition", time: "Evening", days: [0], notes: "Batch cook for the week" },
        { name: "Cook dinner",     icon: "🍳",  color: "#f59e0b", category: "Nutrition", time: "6:00 PM", notes: "Plan ahead so the easy choice is the healthy one." },
        { name: "Pack tomorrow's meals", icon: "🥡", color: "#14b8a6", category: "Nutrition", time: "Evening", days: [0,1,2,3,4], notes: "Plan ahead so the easy choice is the healthy one." },
        { name: "Grocery shop",    icon: "🛒",  color: "#3b82f6", category: "Nutrition", time: "Afternoon", days: [6], notes: "Plan ahead so the easy choice is the healthy one." },
        { name: "No takeout",      icon: "🚫",  color: "#ef4444", category: "Nutrition", time: "All day", notes: "One day at a time — your clean streak keeps count." },
        { name: "Eat breakfast",   icon: "🍳",  color: "#f59e0b", category: "Nutrition", time: "Morning", notes: "Plan ahead so the easy choice is the healthy one." },
      ],
    },
    {
      title: "🎓 Study & exams",
      items: [
        { name: "Study session",   icon: "📚",  color: "#6366f1", category: "Custom", time: "Evening", notes: "Pomodoro x4" },
        { name: "Review flashcards", icon: "🃏", color: "#f59e0b", category: "Custom", time: "Morning", notes: "Spaced repetition" },
        { name: "Practice problems", icon: "✏️", color: "#3b82f6", category: "Custom", time: "Afternoon", notes: "Short focused blocks beat long cram sessions." },
        { name: "Revise notes",    icon: "📝",  color: "#14b8a6", category: "Custom", time: "Evening", notes: "Short focused blocks beat long cram sessions." },
        { name: "No phone while studying", icon: "📵", color: "#ef4444", category: "Custom", time: "Evening", notes: "One day at a time — your clean streak keeps count." },
        { name: "Past paper",      icon: "📄",  color: "#a855f7", category: "Custom", time: "Afternoon", days: [6], notes: "Timed" },
      ],
    },
    {
      title: "🧴 Skin & beauty",
      items: [
        { name: "Cleanser",        icon: "🧼",  color: "#38bdf8", category: "Custom", time: "Morning", notes: "Gentle, consistent care — a little each day." },
        { name: "Moisturiser",     icon: "🧴",  color: "#ec4899", category: "Custom", time: "Morning", notes: "Gentle, consistent care — a little each day." },
        { name: "Retinol",         icon: "🌙",  color: "#a855f7", category: "Custom", time: "10:00 PM", days: [1,3,5], notes: "PM only" },
        { name: "Face mask",       icon: "💆",  color: "#f472b6", category: "Custom", time: "Evening", days: [0], notes: "Gentle, consistent care — a little each day." },
        { name: "Lip balm / SPF",  icon: "☀️",  color: "#f59e0b", category: "Custom", time: "Morning", notes: "Gentle, consistent care — a little each day." },
        { name: "Drink water for skin", icon: "💧", color: "#38bdf8", category: "Nutrition", time: "All day", notes: "Sip steadily through the day; don't chug it all at once." },
      ],
    },
    {
      title: "👶 Parenting & family",
      items: [
        { name: "Read to kids",    icon: "📖",  color: "#f59e0b", category: "Custom", time: "Evening", notes: "A few pages is plenty — consistency beats volume." },
        { name: "Family dinner",   icon: "🍽️",  color: "#22c55e", category: "Custom", time: "6:00 PM", notes: "No screens" },
        { name: "School run",      icon: "🚗",  color: "#3b82f6", category: "Custom", time: "Morning", days: [1,2,3,4,5], notes: "Warm up first; keep it conversational unless it's a hard day." },
        { name: "Playtime",        icon: "🧸",  color: "#ec4899", category: "Custom", time: "Afternoon", notes: "Keep it simple and do it consistently." },
        { name: "Bedtime routine (kids)", icon: "🌙", color: "#a855f7", category: "Custom", time: "8:00 PM", notes: "Aim for the same time each night to steady your rhythm." },
      ],
    },
    {
      title: "🌱 Eco & mindful living",
      items: [
        { name: "Reusable bottle", icon: "🍶",  color: "#22c55e", category: "Custom", time: "All day", notes: "Keep it simple and do it consistently." },
        { name: "Walk/bike instead of drive", icon: "🚲", color: "#14b8a6", category: "Fitness", time: "All day", notes: "Keep a brisk, easy pace — even a short loop counts." },
        { name: "Recycle",         icon: "♻️",  color: "#22c55e", category: "Custom", time: "All day", notes: "Rinse and sort — a small daily habit for the planet." },
        { name: "Meat-free day",   icon: "🥗",  color: "#84cc16", category: "Nutrition", time: "All day", days: [1], notes: "Small, steady choices add up over the week." },
        { name: "Declutter one thing", icon: "📦", color: "#a855f7", category: "Custom", time: "Anytime", notes: "Small and done beats big and someday." },
      ],
    },
    {
      title: "💧 Gut & digestion",
      items: [
        { name: "Probiotic",       icon: "🦠",  color: "#22c55e", category: "Supplements", time: "Morning", notes: "1 capsule daily with breakfast, same time each day — consistency matters more than exact timing." },
        { name: "Fiber intake",    icon: "🌾",  color: "#84cc16", category: "Nutrition", time: "All day", notes: "25-35 g" },
        { name: "Fermented foods", icon: "🥬",  color: "#14b8a6", category: "Nutrition", time: "All day", notes: "Yogurt, kimchi, kefir" },
        { name: "Digestive enzymes", icon: "💊", color: "#3b82f6", category: "Supplements", time: "With meals", notes: "1 capsule with the first few bites of a meal — that's when it helps digestion most." },
        { name: "Chew slowly",     icon: "🍽️",  color: "#f59e0b", category: "Nutrition", time: "All day", notes: "Small, steady choices add up over the week." },
        { name: "No late-night eating", icon: "🌙", color: "#a855f7", category: "Nutrition", time: "Evening", notes: "Stop 3h before bed" },
      ],
    },
    {
      title: "🧴 Hair & scalp care",
      items: [
        { name: "Scalp massage",   icon: "💆",  color: "#a855f7", category: "Custom", time: "Evening", notes: "5 min" },
        { name: "Hair oil",        icon: "🧴",  color: "#f59e0b", category: "Custom", time: "Evening", days: [0,3], notes: "Amla / rosemary" },
        { name: "Rosemary spray",  icon: "🌿",  color: "#22c55e", category: "Custom", time: "Morning", notes: "Be gentle; results come from consistency, not intensity." },
        { name: "Biotin",          icon: "💊",  color: "#3b82f6", category: "Supplements", time: "Morning", notes: "1 capsule with food. Give hair/nail benefits a few months; can skew some lab tests, so pause before bloodwork." },
        { name: "Silk pillowcase", icon: "🛏️",  color: "#ec4899", category: "Custom", time: "Night", notes: "Be gentle; results come from consistency, not intensity." },
        { name: "Trim reminder",   icon: "✂️",  color: "#6366f1", category: "Custom", time: "Morning", days: [0], notes: "Every 6-8 weeks" },
      ],
    },
    {
      title: "🦷 Oral care",
      items: [
        { name: "Brush (AM)",      icon: "🪥",  color: "#3b82f6", category: "Custom", time: "Morning", notes: "2 min" },
        { name: "Brush (PM)",      icon: "🪥",  color: "#6366f1", category: "Custom", time: "10:00 PM", notes: "2 min" },
        { name: "Floss",           icon: "🧵",  color: "#22c55e", category: "Custom", time: "10:00 PM", notes: "Two full minutes; don't rush it." },
        { name: "Tongue scraper",  icon: "👅",  color: "#ec4899", category: "Custom", time: "Morning", notes: "Two full minutes; don't rush it." },
        { name: "Mouthwash",       icon: "💧",  color: "#38bdf8", category: "Custom", time: "10:00 PM", notes: "Two full minutes; don't rush it." },
      ],
    },
    {
      title: "🧠 Focus & productivity",
      items: [
        { name: "Deep work block", icon: "🎯",  color: "#6366f1", category: "Custom", time: "Morning", days: [1,2,3,4,5], notes: "90 min, no distractions" },
        { name: "Plan the day",    icon: "🗒️",  color: "#3b82f6", category: "Custom", time: "Morning", notes: "Top 3 priorities" },
        { name: "Inbox zero",      icon: "📧",  color: "#f59e0b", category: "Custom", time: "Afternoon", days: [1,2,3,4,5], notes: "Protect your attention — set the phone out of reach." },
        { name: "Pomodoro sessions", icon: "🍅", color: "#ef4444", category: "Custom", time: "All day", notes: "Small and done beats big and someday." },
        { name: "No phone first hour", icon: "📵", color: "#a855f7", category: "Custom", time: "Morning", notes: "One day at a time — your clean streak keeps count." },
        { name: "Shutdown ritual", icon: "🔚",  color: "#14b8a6", category: "Custom", time: "Evening", days: [1,2,3,4,5], notes: "Review + close out" },
      ],
    },
    {
      title: "💰 Finance & admin",
      items: [
        { name: "Log expenses",    icon: "🧾",  color: "#22c55e", category: "Custom", time: "Evening", notes: "A quick check-in keeps you in control." },
        { name: "Check budget",    icon: "📊",  color: "#3b82f6", category: "Custom", time: "Evening", days: [0], notes: "Weekly review" },
        { name: "No-spend day",    icon: "🚫",  color: "#ef4444", category: "Custom", time: "All day", days: [2,4], notes: "Keep it simple and do it consistently." },
        { name: "Save / invest",   icon: "🏦",  color: "#14b8a6", category: "Custom", time: "Morning", days: [5], notes: "A gentle start sets the tone for the day." },
        { name: "Pack lunch",      icon: "🥡",  color: "#f59e0b", category: "Nutrition", time: "Morning", days: [1,2,3,4,5], notes: "Save money" },
      ],
    },
    {
      title: "🏃 Marathon / running plan",
      items: [
        { name: "Easy run",        icon: "🏃",  color: "#22c55e", category: "Fitness", time: "Morning", days: [1,3], notes: "Zone 2" },
        { name: "Long run",        icon: "🏅",  color: "#f59e0b", category: "Fitness", time: "Morning", days: [6], notes: "Build distance" },
        { name: "Intervals / speed", icon: "⚡", color: "#ef4444", category: "Fitness", time: "Morning", days: [4], notes: "Warm up, focus on form, and keep it consistent." },
        { name: "Rest day",        icon: "😌",  color: "#a855f7", category: "Fitness", time: "All day", days: [0], notes: "Recovery" },
        { name: "Foam roll + stretch", icon: "🧘", color: "#14b8a6", category: "Fitness", time: "Evening", notes: "Move slowly; hold each stretch 20–30s, no bouncing." },
        { name: "Electrolytes",    icon: "🧂",  color: "#38bdf8", category: "Nutrition", time: "All day", notes: "Take as directed; pair with food if it's easier on your stomach." },
      ],
    },
    {
      title: "🧘 Yoga & flexibility",
      items: [
        { name: "Sun salutations", icon: "🌅",  color: "#f59e0b", category: "Fitness", time: "Morning", notes: "5 rounds" },
        { name: "Hip openers",     icon: "🧘",  color: "#a855f7", category: "Fitness", time: "Evening", notes: "Warm up, focus on form, and keep it consistent." },
        { name: "Hamstring stretch", icon: "🦵", color: "#14b8a6", category: "Fitness", time: "Evening", notes: "Move slowly; hold each stretch 20–30s, no bouncing." },
        { name: "Breathwork",      icon: "🌬️",  color: "#38bdf8", category: "Custom", time: "Morning", notes: "5 min" },
        { name: "Balance practice", icon: "🤸", color: "#ec4899", category: "Fitness", time: "All day", notes: "Recovery is part of the training — don't skip it." },
      ],
    },
    {
      title: "🕌 Faith & gratitude",
      items: [
        { name: "Prayer / meditation", icon: "🙏", color: "#a855f7", category: "Custom", time: "Morning", notes: "Even 5 minutes counts — just notice the breath." },
        { name: "Read scripture",  icon: "📖",  color: "#f59e0b", category: "Custom", time: "Morning", notes: "A few pages is plenty — consistency beats volume." },
        { name: "Gratitude (3 things)", icon: "🙌", color: "#22c55e", category: "Custom", time: "Evening", notes: "A sentence or two is enough to count." },
        { name: "Acts of kindness", icon: "💛",  color: "#eab308", category: "Custom", time: "All day", notes: "Presence over perfection — put the phone away." },
        { name: "Reflect / examen", icon: "🕯️",  color: "#6366f1", category: "Custom", time: "10:00 PM", notes: "A sentence or two is enough to count." },
      ],
    },
    {
      title: "🎨 Hobbies & creativity",
      items: [
        { name: "Practice instrument", icon: "🎸", color: "#ef4444", category: "Custom", time: "Evening", notes: "15 focused minutes beats an hour of noodling." },
        { name: "Draw / sketch",   icon: "✏️",  color: "#6366f1", category: "Custom", time: "Evening", notes: "A calm end helps everything else fall into place." },
        { name: "Write / journal", icon: "✍️",  color: "#3b82f6", category: "Custom", time: "Evening", notes: "A sentence or two is enough to count." },
        { name: "Read for fun",    icon: "📚",  color: "#f59e0b", category: "Custom", time: "Night", notes: "20 min" },
        { name: "Learn a language", icon: "🗣️", color: "#14b8a6", category: "Custom", time: "All day", notes: "Duolingo / Anki" },
        { name: "Photography walk", icon: "📷",  color: "#a855f7", category: "Custom", time: "Afternoon", days: [6], notes: "Keep a brisk, easy pace — even a short loop counts." },
      ],
    },
    {
      title: "🩺 Health monitoring",
      items: [
        { name: "Weigh in",        icon: "⚖️",  color: "#3b82f6", category: "Custom", time: "Morning", days: [1], notes: "Same time weekly" },
        { name: "Blood pressure",  icon: "🩸",  color: "#ef4444", category: "Custom", time: "Morning", notes: "Same time of day, relaxed — note the reading below." },
        { name: "Take medication", icon: "💊",  color: "#6366f1", category: "Supplements", time: "Morning", notes: "Take as directed; pair with a meal if easier." },
        { name: "Log symptoms",    icon: "📝",  color: "#f59e0b", category: "Custom", time: "Evening", notes: "A calm end helps everything else fall into place." },
        { name: "Steps / activity ring", icon: "🚶", color: "#22c55e", category: "Fitness", time: "All day", notes: "Keep a brisk, easy pace — even a short loop counts." },
        { name: "Stretch breaks",  icon: "⏰",  color: "#14b8a6", category: "Fitness", time: "All day", days: [1,2,3,4,5], notes: "Every 2 hrs" },
      ],
    },
    {
      title: "☀️ Morning routine",
      items: [
        { name: "Wake at set time", icon: "⏰", color: "#f59e0b", category: "Sleep", time: "6:00 AM", notes: "No snooze" },
        { name: "Make the bed",    icon: "🛏️",  color: "#6366f1", category: "Custom", time: "Morning", notes: "Aim for the same time each night to steady your rhythm." },
        { name: "Big glass of water", icon: "💧", color: "#38bdf8", category: "Nutrition", time: "Morning", notes: "Sip steadily through the day; don't chug it all at once." },
        { name: "Morning sunlight", icon: "🌞",  color: "#f59e0b", category: "Sleep", time: "Morning", notes: "10 min" },
        { name: "Movement / stretch", icon: "🤸", color: "#22c55e", category: "Fitness", time: "Morning", notes: "Move slowly; hold each stretch 20–30s, no bouncing." },
        { name: "Cold shower",     icon: "🧊",  color: "#38bdf8", category: "Custom", time: "Morning", notes: "Recovery is part of the training — don't skip it." },
      ],
    },
    {
      title: "🌙 Evening wind-down",
      items: [
        { name: "Dim the lights",  icon: "🕯️",  color: "#a855f7", category: "Sleep", time: "9:00 PM", notes: "Aim for the same time each night to steady your rhythm." },
        { name: "Herbal tea",      icon: "🍵",  color: "#22c55e", category: "Nutrition", time: "9:00 PM", notes: "Caffeine-free" },
        { name: "Tomorrow's to-do list", icon: "🗒️", color: "#3b82f6", category: "Custom", time: "Evening", notes: "A calm end helps everything else fall into place." },
        { name: "Lay out clothes", icon: "👕",  color: "#f59e0b", category: "Custom", time: "Evening", notes: "A calm end helps everything else fall into place." },
        { name: "Screens off",     icon: "📴",  color: "#6366f1", category: "Sleep", time: "10:00 PM", notes: "Aim for the same time each night to steady your rhythm.", nightPrevDay: true },
        { name: "Lights out",      icon: "😴",  color: "#a855f7", category: "Sleep", time: "10:30 PM", notes: "Aim for the same time each night to steady your rhythm.", nightPrevDay: true },
      ],
    },
    {
      title: "🩺 Health & meds",
      items: [
        { name: "Morning meds",    icon: "💊",  color: "#3b82f6", category: "Supplements", time: "8:00 AM", notes: "With breakfast", reminderTimes: ["08:00"] },
        { name: "Evening meds",    icon: "💊",  color: "#6366f1", category: "Supplements", time: "8:00 PM", notes: "With dinner", reminderTimes: ["20:00"] },
        { name: "Meds — morning & night", icon: "💊", color: "#a855f7", category: "Supplements", time: "8:00 AM & 8:00 PM", notes: "Twice a day", type: "count", target: 2, unit: "", increment: 1, reminderTimes: ["08:00", "20:00"] },
        { name: "Eye drops (3×/day)", icon: "👁️", color: "#38bdf8", category: "Custom", time: "8:00 AM · 2:00 PM · 8:00 PM", notes: "3 times a day", type: "count", target: 3, unit: "", increment: 1, reminderTimes: ["08:00", "14:00", "20:00"] },
        { name: "Inhaler (2×/day)", icon: "🫁", color: "#14b8a6", category: "Custom", time: "8:00 AM & 8:00 PM", notes: "Preventer — morning & night", type: "count", target: 2, unit: "", increment: 1, reminderTimes: ["08:00", "20:00"] },
        { name: "Blood pressure check", icon: "🩸", color: "#ef4444", category: "Custom", time: "Morning", notes: "Log the reading in notes" },
        { name: "Blood sugar check", icon: "🩸", color: "#f59e0b", category: "Custom", time: "Morning", notes: "Same time of day, relaxed — note the reading below." },
        { name: "Weigh in",       icon: "⚖️",  color: "#3b82f6", category: "Custom", time: "Morning", days: [1], notes: "Same time, once a week" },
        { name: "Stretch breaks (hourly)", icon: "🧍", color: "#22c55e", category: "Fitness", time: "All day", notes: "Stand & move", type: "count", target: 6, unit: "", increment: 1 },
      ],
    },
    {
      title: "📏 Measurable goals",
      items: [
        { name: "Water — 8 glasses", icon: "💧", color: "#3b82f6", category: "Nutrition", time: "All day", notes: "Tap for each glass", type: "count", target: 8, unit: "glasses", increment: 1 },
        { name: "Read 20 pages",   icon: "📖",  color: "#14b8a6", category: "Custom", time: "Evening", notes: "A few pages is plenty — consistency beats volume.", type: "count", target: 20, unit: "pages", increment: 5 },
        { name: "50 push-ups",     icon: "💪",  color: "#6366f1", category: "Fitness", time: "All day", notes: "Spread through the day", type: "count", target: 50, unit: "reps", increment: 10 },
        { name: "Meditate 20 min", icon: "🧘",  color: "#a855f7", category: "Custom", time: "Morning", notes: "Even 5 minutes counts — just notice the breath.", type: "count", target: 20, unit: "min", increment: 5, reminderTimes: ["07:00"] },
        { name: "Journal 1 page",  icon: "✍️",  color: "#3b82f6", category: "Custom", time: "Evening", notes: "A sentence or two is enough to count.", type: "count", target: 1, unit: "page", increment: 1 },
        { name: "Fruit & veg — 5 a day", icon: "🥦", color: "#22c55e", category: "Nutrition", time: "All day", notes: "Add colour to your plate — aim for variety.", type: "count", target: 5, unit: "", increment: 1 },
        { name: "Protein — 150 g", icon: "🍗",  color: "#ec4899", category: "Nutrition", time: "All day", notes: "Spread intake across meals for best absorption.", type: "count", target: 150, unit: "g", increment: 25 },
      ],
    },
    {
      title: "🩹 Recovery & physio",
      items: [
        { name: "PT / rehab exercises", icon: "🩹", color: "#14b8a6", category: "Fitness", time: "Morning", notes: "Your prescribed set" },
        { name: "Ice / heat therapy", icon: "🧊", color: "#38bdf8", category: "Fitness", time: "Evening", notes: "15-20 min" },
        { name: "Knee mobility",   icon: "🦵",  color: "#6366f1", category: "Fitness", time: "Morning", notes: "Move slowly; hold each stretch 20–30s, no bouncing." },
        { name: "Shoulder mobility", icon: "💪", color: "#3b82f6", category: "Fitness", time: "Morning", notes: "Move slowly; hold each stretch 20–30s, no bouncing." },
        { name: "Posture reset (3×/day)", icon: "🧍", color: "#a855f7", category: "Fitness", time: "All day", notes: "Roll shoulders back, chin tuck", type: "count", target: 3, unit: "", increment: 1, reminderTimes: ["10:00", "14:00", "17:00"] },
        { name: "Foam roll",       icon: "🧴",  color: "#f59e0b", category: "Fitness", time: "Evening", notes: "Move slowly; hold each stretch 20–30s, no bouncing." },
        { name: "Nerve glides",    icon: "🖐️",  color: "#14b8a6", category: "Fitness", time: "Evening", notes: "Move slowly; hold each stretch 20–30s, no bouncing." },
      ],
    },
    {
      title: "🚭 Quit — days clean",
      items: [
        { name: "No alcohol",      icon: "🚫",  color: "#ef4444", category: "Custom", time: "All day", notes: "Track your streak", quit: true },
        { name: "No smoking",      icon: "🚭",  color: "#ef4444", category: "Custom", time: "All day", notes: "One day at a time — your clean streak keeps count.", quit: true },
        { name: "No vaping",       icon: "💨",  color: "#ef4444", category: "Custom", time: "All day", notes: "One day at a time — your clean streak keeps count.", quit: true },
        { name: "No fast food",    icon: "🍔",  color: "#f59e0b", category: "Nutrition", time: "All day", notes: "One day at a time — your clean streak keeps count.", quit: true },
        { name: "No energy drinks", icon: "🥤", color: "#f59e0b", category: "Nutrition", time: "All day", notes: "One day at a time — your clean streak keeps count.", quit: true },
        { name: "No late-night snacking", icon: "🌙", color: "#a855f7", category: "Nutrition", time: "Evening", notes: "One day at a time — your clean streak keeps count.", quit: true },
        { name: "No nail biting",  icon: "💅",  color: "#ec4899", category: "Custom", time: "All day", notes: "One day at a time — your clean streak keeps count.", quit: true },
        { name: "No doomscrolling", icon: "📵", color: "#6366f1", category: "Custom", time: "All day", notes: "One day at a time — your clean streak keeps count.", quit: true },
      ],
    },
    {
      title: "🧘 Digital wellbeing",
      items: [
        { name: "Phone-free morning hour", icon: "🌅", color: "#f59e0b", category: "Custom", time: "Morning", notes: "No phone for the first hour" },
        { name: "Screen time under 2h", icon: "⏳", color: "#6366f1", category: "Custom", time: "All day", notes: "Protect your attention — set the phone out of reach." },
        { name: "No phone in bed", icon: "🛏️",  color: "#a855f7", category: "Sleep", time: "10:00 PM", notes: "One day at a time — your clean streak keeps count.", nightPrevDay: true },
        { name: "Inbox to zero",   icon: "📧",  color: "#14b8a6", category: "Custom", time: "Afternoon", days: [1,2,3,4,5], notes: "Protect your attention — set the phone out of reach." },
        { name: "Social-media-free day", icon: "📵", color: "#ef4444", category: "Custom", time: "All day", days: [0], notes: "One day a week" },
        { name: "Notifications off after 9pm", icon: "🔕", color: "#3b82f6", category: "Sleep", time: "9:00 PM", notes: "Protect your attention — set the phone out of reach." },
      ],
    },
  ];

  const TEMPLATE_ITEM_DEFAULTS = {
    category: "Custom",
    type: "check",
    target: 1,
    unit: "",
    increment: 1,
    days: [0,1,2,3,4,5,6],
    notes: "",
  };
  const DAY_DISPLAY = [
    { idx: 1, label: "M", full: "Mon" },
    { idx: 2, label: "T", full: "Tue" },
    { idx: 3, label: "W", full: "Wed" },
    { idx: 4, label: "T", full: "Thu" },
    { idx: 5, label: "F", full: "Fri" },
    { idx: 6, label: "S", full: "Sat" },
    { idx: 0, label: "S", full: "Sun" },
  ];

  /* ================================================================
   * State
   * ================================================================ */

  function defaultState() {
    return {
      habits: [],
      completions: {},
      completionsUpdatedAt: {},
      // Per-dose bitmask for "times per day" habits: dateKey -> habitId -> mask.
      // Keeps individual doses independent; the completion count stays = popcount.
      doseTicks: {},
      // Per-dose "not done" marks (dateKey -> habitId -> bitmask), so a single
      // dose can be marked skipped without affecting the habit's other doses.
      doseSkips: {},
      measurements: {},
      journal: {},
      goal: null,
      customMetrics: [],
      categories: [...DEFAULT_CATEGORIES],
      categoryMeta: {},
      categoriesUpdatedAt: 0,
      workSchedule: { days: {}, notes: "", updatedAt: 0 },
      devices: {},
      fasting: {
        active: false,
        startTs: 0,
        targetHours: 16,
        scheduleEnabled: false,
        startTime: "20:00",  // eating window closes → begin fast
        eatTime: "12:00",    // eating window opens → break fast
        history: [],         // [{ start, end, targetHours, goalMet }]
        updatedAt: 0,
      },
      trash: [],
      freezes: { updatedAt: 0, days: {}, habitDays: {} },
      deletions: { habits: {} },
      // Guided weekly review: weekKey (Monday dateKey) -> { focus, adherence, updatedAt }
      reviews: {},
      // Unlocked achievements: achievementId -> earnedAt (ms). Permanent once earned.
      achievements: {},
      // Daily mood/energy: dateKey -> { mood: 1-5, updatedAt }
      moods: {},
      // Vacation / pause mode: a date range where reminders pause and streaks
      // are protected (treated like global freeze days).
      vacation: { start: null, end: null, note: "", updatedAt: 0 },
      // Per-week keystone focus habit: weekKey -> habitId
      keystone: {},
      // Smart reminder timing: habitId -> { samples: [minSinceMidnight,…], updatedAt }
      completionClock: {},
      // Per-dose timing: habitId -> doseIndex -> { samples:[minSinceMidnight], updatedAt }
      doseClock: {},
      // Recent activity log: [{ ts, type, text }] (newest first, capped)
      activity: [],
    };
  }

  let state = defaultState();
  let weekOffset = 0;
  let progressOffset = 0;
  let editingId = null;
  let currentView = "today";
  let todayCategoryFilter = "all";
  let reportCategoryFilter = "all";

  let saveTimer = null;
  let dirtyForSync = false;
  let syncInFlight = false;
  let syncPushTimer = null;
  let autoSyncInterval = null;
  let lastSyncedAt = 0;
  let lastSyncedHash = null;
  let rateLimitResetAt = 0;   // epoch ms until which sync is paused (rate limited)
  let resumeTimer = null;

  /* ================================================================
   * Utility
   * ================================================================ */

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  function numOrNull(v) {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function round1(v) { return Math.round(v * 10) / 10; }

  // Units: canonical storage is lb / in. Display converts if metric is chosen.
  function isMetric() { return localStorage.getItem(KEYS.units) === "metric"; }
  function wUnit() { return isMetric() ? "kg" : "lb"; }
  function lUnit() { return isMetric() ? "cm" : "in"; }
  function wDisp(lb) { return isMetric() ? lb * 0.453592 : lb; }      // lb → display
  function wStore(v) { return isMetric() ? v / 0.453592 : v; }        // display → lb
  function lDisp(inch) { return isMetric() ? inch * 2.54 : inch; }    // in → display
  function lStore(v) { return isMetric() ? v / 2.54 : v; }            // display → in

  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function todayKey() { return dateKey(new Date()); }

  function startOfWeekMonday(d) {
    const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = copy.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    return copy;
  }
  function addDays(d, n) {
    const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    copy.setDate(copy.getDate() + n);
    return copy;
  }
  function sameDay(a, b) { return dateKey(a) === dateKey(b); }
  function formatDateShort(d) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function showToast(msg, kind = "") {
    const t = $("#toast");
    if (!t) return;
    t.className = "toast" + (kind ? " " + kind : "");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => (t.hidden = true), 2400);
  }

  // Toast with an "Undo" action button.
  function showUndoToast(msg, onUndo) {
    const t = $("#toast");
    if (!t) return;
    t.className = "toast";
    t.textContent = "";
    const span = document.createElement("span");
    span.textContent = msg;
    const btn = document.createElement("button");
    btn.className = "toast-undo";
    btn.textContent = "Undo";
    btn.addEventListener("click", () => {
      onUndo();
      t.hidden = true;
    });
    t.appendChild(span);
    t.appendChild(btn);
    t.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => (t.hidden = true), 4000);
  }

  function quickHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return String(h);
  }

  /* ================================================================
   * Persist / Migrate
   * ================================================================ */

  function normalizeState(s) {
    const st = defaultState();
    const now = Date.now();
    st.habits = (s.habits || []).map((h, idx) => ({
      id: h.id || uid(),
      name: h.name || "Untitled",
      icon: h.icon || "🎯",
      color: h.color || COLORS[0],
      category: (h.category && String(h.category).trim()) ? String(h.category).trim() : "Custom",
      type: h.type === "count" ? "count" : "check",
      target: Number(h.target) > 0 ? Number(h.target) : 1,
      unit: h.unit || "",
      increment: Number(h.increment) > 0 ? Number(h.increment) : 1,
      time: h.time || "",
      dayTimes: (function () {
        const out = {};
        if (h.dayTimes && typeof h.dayTimes === "object") {
          for (let d = 0; d < 7; d++) {
            const v = h.dayTimes[d];
            if (typeof v === "string" && v.trim()) out[d] = v.trim().slice(0, 40);
          }
        }
        return out;
      })(),
      notes: (h.notes || "").slice(0, 500),
      reminderTime: /^\d{2}:\d{2}$/.test(h.reminderTime) ? h.reminderTime : "",
      reminderTimes: (function () {
        const out = [];
        const arr = Array.isArray(h.reminderTimes) ? h.reminderTimes : [];
        for (const t of arr) if (/^\d{2}:\d{2}$/.test(t) && !out.includes(t)) out.push(t);
        if (out.length === 0 && /^\d{2}:\d{2}$/.test(h.reminderTime)) out.push(h.reminderTime);
        return out.slice(0, 6).sort();
      })(),
      reminderMsg: (h.reminderMsg || "").slice(0, 120),
      nightPrevDay: !!h.nightPrevDay,
      noPush: !!h.noPush,
      archived: !!h.archived,
      quit: !!h.quit,
      days: Array.isArray(h.days) && h.days.length ? h.days : [0,1,2,3,4,5,6],
      freqType: h.freqType === "weekly" ? "weekly" : "days",
      weeklyTarget: (function () { const n = Math.round(Number(h.weeklyTarget)); return n >= 1 && n <= 14 ? n : 3; })(),
      // Habit stacking: fire a cue for this habit when its anchor is completed.
      anchorId: (typeof h.anchorId === "string" && h.anchorId) ? h.anchorId : "",
      order: Number.isFinite(Number(h.order)) ? Number(h.order) : idx,
      createdAt: h.createdAt || new Date(now).toISOString(),
      updatedAt: Number(h.updatedAt) || now,
    }));
    for (const [day, obj] of Object.entries(s.completions || {})) {
      if (!obj || typeof obj !== "object") continue;
      st.completions[day] = {};
      for (const [hid, val] of Object.entries(obj)) {
        st.completions[day][hid] = val === true ? 1 : Number(val) || 0;
      }
    }
    for (const [day, ts] of Object.entries(s.completionsUpdatedAt || {})) {
      st.completionsUpdatedAt[day] = Number(ts) || 0;
    }
    st.doseTicks = {};
    if (s.doseTicks && typeof s.doseTicks === "object") {
      for (const [day, byHabit] of Object.entries(s.doseTicks)) {
        if (!byHabit || typeof byHabit !== "object") continue;
        const clean = {};
        for (const [hid, mask] of Object.entries(byHabit)) {
          const mv = Math.floor(Number(mask));
          if (Number.isFinite(mv) && mv > 0) clean[hid] = mv;
        }
        if (Object.keys(clean).length) st.doseTicks[day] = clean;
      }
    }
    // Per-dose "not done" marks: dateKey -> habitId -> bitmask (same shape as doseTicks).
    st.doseSkips = {};
    if (s.doseSkips && typeof s.doseSkips === "object") {
      for (const [day, byHabit] of Object.entries(s.doseSkips)) {
        if (!byHabit || typeof byHabit !== "object") continue;
        const clean = {};
        for (const [hid, mask] of Object.entries(byHabit)) {
          const mv = Math.floor(Number(mask));
          if (Number.isFinite(mv) && mv > 0) clean[hid] = mv;
        }
        if (Object.keys(clean).length) st.doseSkips[day] = clean;
      }
    }
    for (const [wk, m] of Object.entries(s.measurements || {})) {
      if (!m || typeof m !== "object") continue;
      const custom = {};
      if (m.custom && typeof m.custom === "object") {
        for (const [k, v] of Object.entries(m.custom)) {
          const n = numOrNull(v);
          if (n !== null) custom[k] = n;
        }
      }
      st.measurements[wk] = {
        date: m.date || wk,
        weight: numOrNull(m.weight),
        waist: numOrNull(m.waist),
        energy: numOrNull(m.energy),
        strengthTrend: ["Up","Same","Down"].includes(m.strengthTrend) ? m.strengthTrend : "",
        notes: m.notes || "",
        custom,
        updatedAt: Number(m.updatedAt) || now,
      };
    }
    // Goal
    if (s.goal && typeof s.goal === "object" && numOrNull(s.goal.targetWeight) !== null) {
      st.goal = {
        targetWeight: Number(s.goal.targetWeight),
        targetDate: /^\d{4}-\d{2}-\d{2}$/.test(s.goal.targetDate) ? s.goal.targetDate : "",
        updatedAt: Number(s.goal.updatedAt) || now,
      };
    } else {
      st.goal = null;
    }
    // Categories
    if (Array.isArray(s.categories) && s.categories.length) {
      st.categories = s.categories.map((c) => String(c).slice(0, 30)).filter(Boolean);
    } else {
      st.categories = [...DEFAULT_CATEGORIES];
    }
    if (!st.categories.length) st.categories = [...DEFAULT_CATEGORIES];
    // Per-category color/icon metadata (only kept for categories that exist).
    st.categoryMeta = {};
    if (s.categoryMeta && typeof s.categoryMeta === "object") {
      for (const [name, m] of Object.entries(s.categoryMeta)) {
        if (!m || typeof m !== "object") continue;
        const entry = {};
        if (typeof m.color === "string" && m.color) entry.color = m.color.slice(0, 24);
        if (typeof m.icon === "string" && m.icon) entry.icon = m.icon.slice(0, 8);
        if (entry.color || entry.icon) st.categoryMeta[String(name).slice(0, 30)] = entry;
      }
    }
    st.categoriesUpdatedAt = Number(s.categoriesUpdatedAt) || 0;
    // Work schedule
    st.workSchedule = { days: {}, notes: "", updatedAt: 0 };
    if (s.workSchedule && typeof s.workSchedule === "object") {
      const ws = s.workSchedule;
      if (ws.days && typeof ws.days === "object") {
        for (let d = 0; d < 7; d++) {
          const day = ws.days[d];
          if (day && typeof day === "object") {
            st.workSchedule.days[d] = {
              off: !!day.off,
              start: /^\d{2}:\d{2}$/.test(day.start) ? day.start : "",
              end: /^\d{2}:\d{2}$/.test(day.end) ? day.end : "",
            };
          }
        }
      }
      st.workSchedule.notes = (ws.notes || "").slice(0, 500);
      st.workSchedule.updatedAt = Number(ws.updatedAt) || 0;
    }
    // Synced devices
    st.devices = {};
    if (s.devices && typeof s.devices === "object") {
      for (const [id, d] of Object.entries(s.devices)) {
        if (d && typeof d === "object") {
          st.devices[id] = { name: String(d.name || "Device").slice(0, 40), lastSync: Number(d.lastSync) || 0 };
        }
      }
    }
    // Fasting
    st.fasting = { active: false, startTs: 0, targetHours: 16, scheduleEnabled: false, startTime: "20:00", eatTime: "12:00", history: [], updatedAt: 0 };
    if (s.fasting && typeof s.fasting === "object") {
      const f = s.fasting;
      st.fasting.active = !!f.active;
      st.fasting.startTs = Number(f.startTs) || 0;
      const th = Number(f.targetHours);
      st.fasting.targetHours = Number.isFinite(th) && th > 0 && th <= 72 ? th : 16;
      st.fasting.scheduleEnabled = !!f.scheduleEnabled;
      st.fasting.startTime = /^\d{2}:\d{2}$/.test(f.startTime) ? f.startTime : "20:00";
      st.fasting.eatTime = /^\d{2}:\d{2}$/.test(f.eatTime) ? f.eatTime : "12:00";
      st.fasting.updatedAt = Number(f.updatedAt) || 0;
      if (!st.fasting.startTs) st.fasting.active = false;
      if (Array.isArray(f.history)) {
        for (const h of f.history.slice(-200)) {
          const start = Number(h && h.start), end = Number(h && h.end);
          if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
            st.fasting.history.push({ start, end, targetHours: Number(h.targetHours) || 0, goalMet: !!h.goalMet });
          }
        }
      }
    }
    // Custom metric definitions
    st.customMetrics = [];
    if (Array.isArray(s.customMetrics)) {
      for (const cm of s.customMetrics) {
        if (cm && cm.id && cm.name) {
          st.customMetrics.push({ id: cm.id, name: String(cm.name).slice(0, 30), unit: String(cm.unit || "").slice(0, 12), updatedAt: Number(cm.updatedAt) || 0 });
        }
      }
    }
    for (const [day, j] of Object.entries(s.journal || {})) {
      if (!j) continue;
      if (typeof j === "string") {
        st.journal[day] = { text: j, updatedAt: now };
      } else if (typeof j === "object") {
        st.journal[day] = { text: j.text || "", updatedAt: Number(j.updatedAt) || now };
      }
    }
    st.deletions = { habits: {} };
    if (s.deletions && s.deletions.habits) {
      for (const [id, ts] of Object.entries(s.deletions.habits)) {
        st.deletions.habits[id] = Number(ts) || 0;
      }
    }
    // Trash: recoverable deleted habits (full definition + completion snapshot).
    st.trash = [];
    if (Array.isArray(s.trash)) {
      for (const e of s.trash) {
        if (!e || !e.habit || !e.habit.id) continue;
        const comp = {};
        if (e.completions && typeof e.completions === "object") {
          for (const [d, v] of Object.entries(e.completions)) comp[d] = Number(v) || 0;
        }
        st.trash.push({ habit: e.habit, completions: comp, trashedAt: Number(e.trashedAt) || now });
      }
    }
    // Streak freezes (global by date + per-habit by "id|date").
    st.freezes = { updatedAt: 0, days: {}, habitDays: {} };
    if (s.freezes && typeof s.freezes === "object") {
      st.freezes.updatedAt = Number(s.freezes.updatedAt) || 0;
      if (s.freezes.days && typeof s.freezes.days === "object") {
        for (const [d, v] of Object.entries(s.freezes.days)) if (v) st.freezes.days[d] = true;
      }
      if (s.freezes.habitDays && typeof s.freezes.habitDays === "object") {
        for (const [k, v] of Object.entries(s.freezes.habitDays)) if (v) st.freezes.habitDays[k] = true;
      }
    }
    // Guided weekly reviews, keyed by week-start (Monday) dateKey.
    st.reviews = {};
    if (s.reviews && typeof s.reviews === "object") {
      for (const [wk, r] of Object.entries(s.reviews)) {
        if (!r || typeof r !== "object") continue;
        st.reviews[wk] = {
          focus: String(r.focus || "").slice(0, 500),
          adherence: Number.isFinite(Number(r.adherence)) ? Number(r.adherence) : null,
          updatedAt: Number(r.updatedAt) || now,
        };
      }
    }
    // Unlocked achievements: id -> earnedAt.
    st.achievements = {};
    if (s.achievements && typeof s.achievements === "object") {
      for (const [id, ts] of Object.entries(s.achievements)) {
        const t = Number(ts);
        if (Number.isFinite(t) && t > 0) st.achievements[id] = t;
      }
    }
    // Daily mood/energy log: dateKey -> { mood 1-5, updatedAt }
    st.moods = {};
    if (s.moods && typeof s.moods === "object") {
      for (const [day, m] of Object.entries(s.moods)) {
        if (!m || typeof m !== "object") continue;
        const mood = Math.round(Number(m.mood));
        if (mood >= 1 && mood <= 5) st.moods[day] = { mood, updatedAt: Number(m.updatedAt) || now };
      }
    }
    // Vacation / pause range.
    st.vacation = { start: null, end: null, note: "", updatedAt: 0 };
    if (s.vacation && typeof s.vacation === "object") {
      const dk = /^\d{4}-\d{2}-\d{2}$/;
      const start = dk.test(s.vacation.start) ? s.vacation.start : null;
      const end = dk.test(s.vacation.end) ? s.vacation.end : null;
      st.vacation = {
        start, end,
        note: String(s.vacation.note || "").slice(0, 120),
        updatedAt: Number(s.vacation.updatedAt) || 0,
      };
    }
    // Keystone habit per week: weekKey -> habitId
    st.keystone = {};
    if (s.keystone && typeof s.keystone === "object") {
      for (const [wk, id] of Object.entries(s.keystone)) {
        if (typeof id === "string" && id) st.keystone[wk] = id;
      }
    }
    // Smart-timing completion clock samples.
    st.completionClock = {};
    if (s.completionClock && typeof s.completionClock === "object") {
      for (const [id, rec] of Object.entries(s.completionClock)) {
        if (!rec || typeof rec !== "object" || !Array.isArray(rec.samples)) continue;
        const samples = rec.samples.map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n < 1440).slice(-50);
        if (samples.length) st.completionClock[id] = { samples, updatedAt: Number(rec.updatedAt) || 0 };
      }
    }
    // Per-dose timing clock samples.
    st.doseClock = {};
    if (s.doseClock && typeof s.doseClock === "object") {
      for (const [id, byDose] of Object.entries(s.doseClock)) {
        if (!byDose || typeof byDose !== "object") continue;
        const clean = {};
        for (const [di, rec] of Object.entries(byDose)) {
          if (!rec || typeof rec !== "object" || !Array.isArray(rec.samples)) continue;
          const samples = rec.samples.map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n < 1440).slice(-50);
          if (samples.length) clean[di] = { samples, updatedAt: Number(rec.updatedAt) || 0 };
        }
        if (Object.keys(clean).length) st.doseClock[id] = clean;
      }
    }
    // Recent activity log.
    st.activity = [];
    if (Array.isArray(s.activity)) {
      for (const a of s.activity) {
        if (!a || typeof a !== "object" || !a.ts) continue;
        st.activity.push({ ts: Number(a.ts) || 0, type: String(a.type || "").slice(0, 20), text: String(a.text || "").slice(0, 140) });
      }
      st.activity.sort((a, b) => b.ts - a.ts);
      st.activity = st.activity.slice(0, 50);
    }
    return st;
  }

  function loadStateFromLocal() {
    // Try current key
    const raw = localStorage.getItem(KEYS.data);
    if (raw) {
      try { return normalizeState(JSON.parse(raw)); }
      catch (e) { console.warn("Bad ht_data, ignoring", e); }
    }
    // Try legacy plain keys
    for (const k of LEGACY_PLAIN_KEYS) {
      const legacy = localStorage.getItem(k);
      if (legacy) {
        try {
          const migrated = normalizeState(JSON.parse(legacy));
          // Move to new key and remove old
          localStorage.setItem(KEYS.data, JSON.stringify(migrated));
          localStorage.removeItem(k);
          return migrated;
        } catch (e) { /* keep trying */ }
      }
    }
    return defaultState();
  }

  function markDirty() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(persistNow, 200);
  }

  // ---- Storage limits ----
  const STORAGE_WARN_BYTES = 4 * 1024 * 1024; // warn ~80% of the typical 5MB cap
  function isQuotaError(e) {
    return e && (e.name === "QuotaExceededError" ||
      e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22 || e.code === 1014);
  }
  function estimateStorageBytes() {
    let total = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        total += (k.length + (localStorage.getItem(k) || "").length);
      }
    } catch (e) { /* ignore */ }
    return total * 2; // UTF-16 ≈ 2 bytes/char
  }

  function persistNow() {
    saveTimer = null;
    try {
      localStorage.setItem(KEYS.data, JSON.stringify(state));
      // A save that happens *during* a sync (e.g. the merge step) must not
      // schedule another sync, or we get an infinite push loop.
      if (syncInFlight) return;
      dirtyForSync = true;
      if (isAutoSyncEnabled()) queueAutoSyncPush();
      if (typeof odAutoEnabled === "function" && odAutoEnabled() && !odSyncInFlight) queueOneDrivePush();
    } catch (e) {
      console.error("save failed", e);
      if (isQuotaError(e)) {
        showToast("Storage full — data may not be saved. Export a backup, then delete old photos or check-in history in Settings.", "error");
      } else {
        showToast("Save failed", "error");
      }
    }
  }
  // Write to localStorage only — no dirty flag, no auto-sync trigger.
  // Used by sync merge steps so pulling/merging never re-triggers a push.
  function persistRaw() {
    try { localStorage.setItem(KEYS.data, JSON.stringify(state)); } catch (e) {}
  }
  function saveNow() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    persistNow();
  }
  function save() { markDirty(); }

  /* ================================================================
   * Sync merge
   * ================================================================ */

  function mergeStates(local, remote) {
    const merged = defaultState();
    const now = Date.now();

    // Habits: id-keyed, newest updatedAt wins; tombstones from either side
    const localDel = (local.deletions && local.deletions.habits) || {};
    const remoteDel = (remote.deletions && remote.deletions.habits) || {};
    const mergedDel = {};
    const allDelIds = new Set([...Object.keys(localDel), ...Object.keys(remoteDel)]);
    allDelIds.forEach((id) => {
      mergedDel[id] = Math.max(Number(localDel[id]) || 0, Number(remoteDel[id]) || 0);
    });
    merged.deletions.habits = mergedDel;

    const byId = new Map();
    (local.habits || []).forEach((h) => byId.set(h.id, h));
    (remote.habits || []).forEach((h) => {
      const ex = byId.get(h.id);
      if (!ex) { byId.set(h.id, h); return; }
      if ((Number(h.updatedAt) || 0) > (Number(ex.updatedAt) || 0)) byId.set(h.id, h);
    });
    byId.forEach((h) => {
      const delTs = mergedDel[h.id] || 0;
      if (delTs > 0 && delTs >= (Number(h.updatedAt) || 0)) return;
      merged.habits.push(h);
    });
    const survivingIds = new Set(merged.habits.map((h) => h.id));

    // Completions: newer completionsUpdatedAt wins per day
    const localComp = local.completions || {};
    const remoteComp = remote.completions || {};
    const localTs = local.completionsUpdatedAt || {};
    const remoteTs = remote.completionsUpdatedAt || {};
    const allDates = new Set([...Object.keys(localComp), ...Object.keys(remoteComp)]);
    allDates.forEach((d) => {
      const lts = Number(localTs[d]) || 0;
      const rts = Number(remoteTs[d]) || 0;
      const pickRemote = rts > lts && remoteComp[d];
      // Union both sides so two devices completing DIFFERENT habits on the same
      // day both survive; the newer side wins genuine per-habit conflicts.
      const winner = (pickRemote ? remoteComp[d] : localComp[d]) || {};
      const loser = (pickRemote ? localComp[d] : remoteComp[d]) || {};
      const src = { ...loser, ...winner };
      if (!src || Object.keys(src).length === 0) return;
      const cleaned = {};
      for (const [hid, val] of Object.entries(src)) {
        if (survivingIds.has(hid)) cleaned[hid] = val;
      }
      if (Object.keys(cleaned).length > 0) {
        merged.completions[d] = cleaned;
        merged.completionsUpdatedAt[d] = Math.max(lts, rts) || now;
        // Dose masks: union both sides too (newer wins per-habit), matching the
        // completion union above so dose ticks aren't dropped for the same reason.
        const dtWin = (pickRemote ? (remote.doseTicks || {}) : (local.doseTicks || {}))[d] || {};
        const dtLose = (pickRemote ? (local.doseTicks || {}) : (remote.doseTicks || {}))[d] || {};
        const dtSrc = { ...dtLose, ...dtWin };
        if (Object.keys(dtSrc).length) {
          const cd = {};
          for (const [hid, mask] of Object.entries(dtSrc)) if (survivingIds.has(hid)) cd[hid] = mask;
          if (Object.keys(cd).length) merged.doseTicks[d] = cd;
        }
        // Per-dose skip masks follow the same union rule.
        const dsWin = (pickRemote ? (remote.doseSkips || {}) : (local.doseSkips || {}))[d] || {};
        const dsLose = (pickRemote ? (local.doseSkips || {}) : (remote.doseSkips || {}))[d] || {};
        const dsSrc = { ...dsLose, ...dsWin };
        if (Object.keys(dsSrc).length) {
          const cs = {};
          for (const [hid, mask] of Object.entries(dsSrc)) if (survivingIds.has(hid)) cs[hid] = mask;
          if (Object.keys(cs).length) merged.doseSkips[d] = cs;
        }
      }
    });

    // Measurements: by weekKey, newer updatedAt wins
    const allWeeks = new Set([
      ...Object.keys(local.measurements || {}),
      ...Object.keys(remote.measurements || {}),
    ]);
    allWeeks.forEach((wk) => {
      const l = (local.measurements || {})[wk];
      const r = (remote.measurements || {})[wk];
      if (l && r) {
        merged.measurements[wk] = (Number(r.updatedAt) || 0) > (Number(l.updatedAt) || 0) ? r : l;
      } else {
        merged.measurements[wk] = l || r;
      }
    });

    // Journal: by dateKey, newer updatedAt wins
    const allDays = new Set([
      ...Object.keys(local.journal || {}),
      ...Object.keys(remote.journal || {}),
    ]);
    allDays.forEach((day) => {
      const l = (local.journal || {})[day];
      const r = (remote.journal || {})[day];
      if (l && r) {
        merged.journal[day] = (Number(r.updatedAt) || 0) > (Number(l.updatedAt) || 0) ? r : l;
      } else {
        merged.journal[day] = l || r;
      }
    });

    // Goal: newer updatedAt wins
    const lg = local.goal, rg = remote.goal;
    if (lg && rg) merged.goal = (Number(rg.updatedAt) || 0) > (Number(lg.updatedAt) || 0) ? rg : lg;
    else merged.goal = lg || rg || null;

    // Work schedule: newer updatedAt wins
    const lws = local.workSchedule, rws = remote.workSchedule;
    if (lws && rws) merged.workSchedule = (Number(rws.updatedAt) || 0) > (Number(lws.updatedAt) || 0) ? rws : lws;
    else merged.workSchedule = lws || rws || { days: {}, notes: "", updatedAt: 0 };

    // Devices: union by id, newest lastSync wins
    merged.devices = {};
    for (const src of [local.devices || {}, remote.devices || {}]) {
      for (const [id, d] of Object.entries(src)) {
        if (!merged.devices[id] || (Number(d.lastSync) || 0) > (Number(merged.devices[id].lastSync) || 0)) {
          merged.devices[id] = d;
        }
      }
    }

    // Fasting: config from newer updatedAt; history unioned by start timestamp
    const lf = local.fasting, rf = remote.fasting;
    if (lf || rf) {
      const base = (rf && (Number(rf.updatedAt) || 0) > (Number((lf && lf.updatedAt)) || 0)) ? rf : (lf || rf);
      merged.fasting = {
        active: !!base.active,
        startTs: Number(base.startTs) || 0,
        targetHours: Number(base.targetHours) || 16,
        scheduleEnabled: !!base.scheduleEnabled,
        startTime: base.startTime || "20:00",
        eatTime: base.eatTime || "12:00",
        updatedAt: Number(base.updatedAt) || 0,
        history: [],
      };
      const seen = new Map();
      for (const h of [...((lf && lf.history) || []), ...((rf && rf.history) || [])]) {
        if (h && Number.isFinite(Number(h.start))) seen.set(Number(h.start), h);
      }
      merged.fasting.history = [...seen.values()].sort((a, b) => a.start - b.start).slice(-200);
    }

    // Custom metrics: union by id
    const cmMap = new Map();
    (local.customMetrics || []).forEach((c) => cmMap.set(c.id, c));
    (remote.customMetrics || []).forEach((c) => {
      const ex = cmMap.get(c.id);
      // Newest edit wins on id conflict, so a rename/unit change propagates.
      if (!ex || (Number(c.updatedAt) || 0) > (Number(ex.updatedAt) || 0)) cmMap.set(c.id, c);
    });
    merged.customMetrics = [...cmMap.values()];

    // Categories: newer categoriesUpdatedAt wins, fall back to whichever exists
    const lcu = Number(local.categoriesUpdatedAt) || 0;
    const rcu = Number(remote.categoriesUpdatedAt) || 0;
    if (rcu > lcu && Array.isArray(remote.categories) && remote.categories.length) {
      merged.categories = remote.categories.slice();
      merged.categoryMeta = (remote.categoryMeta && typeof remote.categoryMeta === "object") ? { ...remote.categoryMeta } : {};
      merged.categoriesUpdatedAt = rcu;
    } else if (Array.isArray(local.categories) && local.categories.length) {
      merged.categories = local.categories.slice();
      merged.categoryMeta = (local.categoryMeta && typeof local.categoryMeta === "object") ? { ...local.categoryMeta } : {};
      merged.categoriesUpdatedAt = lcu;
    } else {
      merged.categories = [...DEFAULT_CATEGORIES];
      merged.categoryMeta = {};
      merged.categoriesUpdatedAt = Math.max(lcu, rcu);
    }

    // Trash: union by habit id (newest trashedAt); drop if the habit survived
    // as active, or a newer tombstone permanently deleted it.
    const trashMap = new Map();
    for (const e of [...(local.trash || []), ...(remote.trash || [])]) {
      if (!e || !e.habit || !e.habit.id) continue;
      const ex = trashMap.get(e.habit.id);
      if (!ex || (Number(e.trashedAt) || 0) > (Number(ex.trashedAt) || 0)) trashMap.set(e.habit.id, e);
    }
    merged.trash = [];
    for (const [id, e] of trashMap) {
      if (survivingIds.has(id)) continue;
      if ((mergedDel[id] || 0) > (Number(e.trashedAt) || 0)) continue;
      merged.trash.push(e);
    }

    // Freezes: newest updatedAt wins for the whole object.
    const lFreeze = local.freezes || { updatedAt: 0, days: {}, habitDays: {} };
    const rFreeze = remote.freezes || { updatedAt: 0, days: {}, habitDays: {} };
    const pFreeze = (Number(rFreeze.updatedAt) || 0) > (Number(lFreeze.updatedAt) || 0) ? rFreeze : lFreeze;
    merged.freezes = {
      updatedAt: Number(pFreeze.updatedAt) || 0,
      days: (pFreeze.days && typeof pFreeze.days === "object") ? pFreeze.days : {},
      habitDays: (pFreeze.habitDays && typeof pFreeze.habitDays === "object") ? pFreeze.habitDays : {},
    };

    // Weekly reviews: union by week key, newest updatedAt wins per entry.
    merged.reviews = {};
    for (const src of [local.reviews || {}, remote.reviews || {}]) {
      for (const [wk, r] of Object.entries(src)) {
        if (!r || typeof r !== "object") continue;
        const ex = merged.reviews[wk];
        if (!ex || (Number(r.updatedAt) || 0) > (Number(ex.updatedAt) || 0)) merged.reviews[wk] = r;
      }
    }

    // Achievements: union of unlocked ids, keep the earliest earnedAt.
    merged.achievements = {};
    for (const src of [local.achievements || {}, remote.achievements || {}]) {
      for (const [id, ts] of Object.entries(src)) {
        const t = Number(ts) || 0;
        if (!t) continue;
        if (!merged.achievements[id] || t < merged.achievements[id]) merged.achievements[id] = t;
      }
    }

    // Daily moods: union by day, newest updatedAt wins.
    merged.moods = {};
    for (const src of [local.moods || {}, remote.moods || {}]) {
      for (const [day, m] of Object.entries(src)) {
        if (!m || typeof m !== "object") continue;
        const ex = merged.moods[day];
        if (!ex || (Number(m.updatedAt) || 0) > (Number(ex.updatedAt) || 0)) merged.moods[day] = m;
      }
    }

    // Vacation: newest updatedAt wins for the whole range.
    const lv = local.vacation || { updatedAt: 0 };
    const rv = remote.vacation || { updatedAt: 0 };
    merged.vacation = (Number(rv.updatedAt) || 0) > (Number(lv.updatedAt) || 0) ? rv : lv;

    // Keystone: union by week key (both sides usually agree; prefer local).
    merged.keystone = {};
    for (const src of [remote.keystone || {}, local.keystone || {}]) {
      for (const [wk, id] of Object.entries(src)) if (id) merged.keystone[wk] = id;
    }

    // Completion clock: per habit, newest updatedAt wins (avoids double-counting).
    merged.completionClock = {};
    for (const src of [local.completionClock || {}, remote.completionClock || {}]) {
      for (const [id, rec] of Object.entries(src)) {
        if (!rec || !Array.isArray(rec.samples)) continue;
        const ex = merged.completionClock[id];
        if (!ex || (Number(rec.updatedAt) || 0) > (Number(ex.updatedAt) || 0)) merged.completionClock[id] = rec;
      }
    }

    // Per-dose clock: per habit+dose, newest updatedAt wins.
    merged.doseClock = {};
    for (const src of [local.doseClock || {}, remote.doseClock || {}]) {
      for (const [id, byDose] of Object.entries(src)) {
        if (!byDose || typeof byDose !== "object") continue;
        if (!merged.doseClock[id]) merged.doseClock[id] = {};
        for (const [di, rec] of Object.entries(byDose)) {
          if (!rec || !Array.isArray(rec.samples)) continue;
          const ex = merged.doseClock[id][di];
          if (!ex || (Number(rec.updatedAt) || 0) > (Number(ex.updatedAt) || 0)) merged.doseClock[id][di] = rec;
        }
      }
    }

    // Activity log: union, dedup by ts+text, newest 50.
    const actSeen = new Set();
    const acts = [];
    for (const a of [...(local.activity || []), ...(remote.activity || [])]) {
      if (!a || !a.ts) continue;
      const key = a.ts + "|" + a.text;
      if (actSeen.has(key)) continue;
      actSeen.add(key); acts.push(a);
    }
    acts.sort((a, b) => b.ts - a.ts);
    merged.activity = acts.slice(0, 50);

    return merged;
  }

  function tombstoneHabit(id) {
    if (!state.deletions) state.deletions = { habits: {} };
    if (!state.deletions.habits) state.deletions.habits = {};
    state.deletions.habits[id] = Date.now();
  }

  /* ================================================================
   * Habit operations
   * ================================================================ */

  function isHabitActiveOn(habit, date) {
    if (habit.freqType === "weekly") return true; // eligible any day; quota tracked weekly
    if (!habit.days || habit.days.length === 0) return true;
    return habit.days.includes(date.getDay());
  }

  /* ---- Weekly-quota ("N times per week") helpers ---- */
  function isWeekly(h) { return h && h.freqType === "weekly"; }
  function weeklyTarget(h) { return Math.max(1, Math.round(Number(h.weeklyTarget)) || 1); }
  function weeklyDoneCount(habit, refDate) {
    const ws = startOfWeekMonday(refDate || new Date());
    const today = new Date();
    let done = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i);
      if (d > today && !sameDay(d, today)) break;
      if (isCompleted(habit, d)) done++;
    }
    return done;
  }
  function weeklyMet(habit, refDate) { return weeklyDoneCount(habit, refDate) >= weeklyTarget(habit); }
  // Today-tab status: weekly habits read "done" once the weekly quota is met.
  function todayStatus(habit, date) {
    if (isWeekly(habit)) {
      if (isCompleted(habit, date) || weeklyMet(habit, date)) return "done";
      if (isSkipped(habit, date)) return "skipped";
      return "pending";
    }
    return habitStatus(habit, date);
  }

  // The habit's time for a specific weekday — per-day override if set, else base.
  function effectiveTime(habit, dayIdx) {
    if (habit.dayTimes && habit.dayTimes[dayIdx]) return habit.dayTimes[dayIdx];
    return habit.time;
  }
  function completionValue(habitId, date) {
    const key = dateKey(date);
    return (state.completions[key] && state.completions[key][habitId]) || 0;
  }
  // A completion value of -1 means the user explicitly marked the habit as
  // "not done for today". A value of 0 (or absent) means "untouched".
  const SKIPPED = -1;

  function isCompleted(habit, date) {
    return completionValue(habit.id, date) >= habit.target;
  }
  function isSkipped(habit, date) {
    return completionValue(habit.id, date) < 0;
  }
  function habitStatus(habit, date) {
    if (isCompleted(habit, date)) return "done";
    if (isSkipped(habit, date)) return "skipped";
    return "pending";
  }
  function setCompletionValue(habitId, date, value) {
    const key = dateKey(date);
    if (!state.completions[key]) state.completions[key] = {};
    if (value === 0) {
      delete state.completions[key][habitId];
      if (Object.keys(state.completions[key]).length === 0) delete state.completions[key];
    } else {
      state.completions[key][habitId] = value;
    }
    state.completionsUpdatedAt[key] = Date.now();
    if (!state.completions[key]) delete state.completionsUpdatedAt[key];
    // Completion changed → streak/sparkline memo is stale across all views.
    resetRenderCaches();
    save();
    if (typeof updateBadge === "function" && sameDay(date, new Date())) updateBadge();
  }
  // Per-render memo caches, reset at the start of each renderToday pass.
  let streakCache = new Map();
  let spark7Cache = new Map();
  function resetRenderCaches() {
    streakCache = new Map();
    spark7Cache = new Map();
  }

  /* ---- Streak freeze (grace days) ---- */
  // Is a date inside the active vacation range? (inclusive)
  function inVacation(date) {
    const v = state.vacation;
    if (!v || !v.start || !v.end) return false;
    const dk = dateKey(date);
    return dk >= v.start && dk <= v.end;
  }
  function vacationActiveNow() { return inVacation(new Date()); }

  function isFrozen(habitId, date) {
    const dk = dateKey(date);
    const f = state.freezes || {};
    if (inVacation(date)) return true; // vacation days are neutral for streaks/adherence
    return !!(f.days && f.days[dk]) || !!(f.habitDays && f.habitDays[habitId + "|" + dk]);
  }
  function setFreeze(habitId, date, on) {
    if (!state.freezes) state.freezes = { updatedAt: 0, days: {}, habitDays: {} };
    const f = state.freezes;
    const dk = dateKey(date);
    if (habitId === "*") {
      if (on) f.days[dk] = true; else delete f.days[dk];
    } else {
      const k = habitId + "|" + dk;
      if (on) f.habitDays[k] = true; else delete f.habitDays[k];
    }
    f.updatedAt = Date.now();
    resetRenderCaches();
    save();
  }
  // Does this scheduled day count toward adherence? (Frozen days don't.)
  function countsForAdherence(habit, date) {
    return isHabitActiveOn(habit, date) && !isFrozen(habit.id, date);
  }

  function currentStreak(habit) {
    if (streakCache.has(habit.id)) return streakCache.get(habit.id);
    let streak = 0;
    if (isWeekly(habit)) {
      // Weekly quota → streak counts consecutive weeks the target was met.
      let ws = startOfWeekMonday(new Date());
      for (let i = 0; i < 104; i++) {
        if (weeklyDoneCount(habit, ws) >= weeklyTarget(habit)) streak++;
        else if (i !== 0) break; // a past week missed the quota → stop
        // current week not yet met → don't count, don't break (grace)
        ws = addDays(ws, -7);
      }
      streakCache.set(habit.id, streak);
      return streak;
    }
    let d = new Date();
    for (let i = 0; i < 365; i++) {
      if (isHabitActiveOn(habit, d)) {
        if (isCompleted(habit, d)) streak++;
        else if (isFrozen(habit.id, d)) { /* frozen: neutral, skip without breaking */ }
        else if (i !== 0) break;
      }
      d = addDays(d, -1);
    }
    streakCache.set(habit.id, streak);
    return streak;
  }

  // Longest run of completed scheduled days over the last ~2 years (freeze = neutral).
  function longestStreak(habit) {
    let best = 0, run = 0;
    let d = new Date();
    for (let i = 0; i < 730; i++) {
      if (isHabitActiveOn(habit, d)) {
        if (isCompleted(habit, d)) { run++; if (run > best) best = run; }
        else if (isFrozen(habit.id, d)) { /* neutral */ }
        else run = 0;
      }
      d = addDays(d, -1);
    }
    return best;
  }

  // Completion-rate + best/worst weekday over the habit's tracked history
  // (freeze days excluded from the denominator). Returns null if no data.
  function habitCompletionStats(habit) {
    const byDow = Array.from({ length: 7 }, () => ({ sched: 0, done: 0 }));
    let sched = 0, done = 0;
    let d = new Date();
    const today = new Date();
    for (let i = 0; i < 730; i++) {
      if (d <= today && countsForAdherence(habit, d)) {
        const dow = d.getDay();
        sched++; byDow[dow].sched++;
        if (isCompleted(habit, d)) { done++; byDow[dow].done++; }
      }
      d = addDays(d, -1);
    }
    if (sched === 0) return null;
    let best = null, worst = null;
    for (let i = 0; i < 7; i++) {
      if (byDow[i].sched < 1) continue;
      const rate = byDow[i].done / byDow[i].sched;
      if (best === null || rate > best.rate) best = { dow: i, rate };
      if (worst === null || rate < worst.rate) worst = { dow: i, rate };
    }
    return { rate: Math.round((done / sched) * 100), sched, done, best, worst };
  }

  // A habit is "at risk" if it has a running streak but is still pending today.
  function isStreakAtRisk(habit, date) {
    // Weekly habits' streaks are counted in weeks; a met weekly quota is not at
    // risk just because today's box isn't ticked, so use the weekly-aware status.
    return todayStatus(habit, date) === "pending" && currentStreak(habit) >= 2;
  }

  // Historical completion rate (0..1) for a habit on one weekday, plus the
  // sample size, over its tracked history. null if too little data.
  function habitWeekdayRate(habit, dow) {
    const createdKey = habit.createdAt ? dateKey(new Date(habit.createdAt)) : null;
    let sched = 0, done = 0;
    let d = new Date();
    const today = new Date();
    for (let i = 0; i < 730; i++) {
      if (createdKey && dateKey(d) < createdKey) break; // don't count before the habit existed
      if (d < today && d.getDay() === dow && countsForAdherence(habit, d)) {
        sched++;
        if (isCompleted(habit, d)) done++;
      }
      d = addDays(d, -1);
    }
    if (sched < 3) return null;
    return { rate: done / sched, sched, done };
  }

  // Habits likely to be skipped today: this weekday has been historically weak
  // AND the habit is still pending. Sorted worst-first. Pure-ish (reads state).
  function skipRiskHabits(today) {
    const day = today || new Date();
    const out = [];
    for (const h of state.habits) {
      if (h.archived || h.nightPrevDay) continue;
      if (!isHabitActiveOn(h, day)) continue;
      if (habitStatus(h, day) !== "pending") continue;
      const wd = habitWeekdayRate(h, day.getDay());
      if (!wd || wd.sched < 3) continue;
      if (wd.rate <= 0.5) out.push({ habit: h, rate: wd.rate, sched: wd.sched });
    }
    return out.sort((a, b) => a.rate - b.rate);
  }

  // For count/dose habits: if you consistently land short of the target, suggest
  // a more realistic one. Looks at the average completed value over recent
  // scheduled days. Returns {current, suggested, avg, days} or null.
  function adaptiveTargetSuggestion(habit) {
    if (habit.type !== "count") return null;
    const tgt = Number(habit.target);
    if (!Number.isInteger(tgt) || tgt < 2) return null;
    const createdKey = habit.createdAt ? dateKey(new Date(habit.createdAt)) : null;
    let sum = 0, days = 0;
    let d = addDays(new Date(), -1); // exclude today (still in progress)
    for (let i = 0; i < 60 && days < 21; i++) {
      if (createdKey && dateKey(d) < createdKey) break; // ignore days before the habit existed
      if (countsForAdherence(habit, d)) {
        sum += completionValue(habit.id, d);
        days++;
      }
      d = addDays(d, -1);
    }
    if (days < 7) return null; // need a couple of weeks of history
    const avg = sum / days;
    const suggested = Math.max(1, Math.round(avg));
    // Only suggest a *lower* target, and only if the gap is meaningful.
    if (suggested >= tgt || tgt - avg < 0.75) return null;
    return { current: tgt, suggested, avg: Math.round(avg * 10) / 10, days };
  }

  // Last 7 days (oldest→newest) of status for a habit, for the sparkline.
  function last7Days(habit) {
    if (spark7Cache.has(habit.id)) return spark7Cache.get(habit.id);
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(new Date(), -i);
      const scheduled = isHabitActiveOn(habit, d);
      let s = "off";
      if (scheduled) {
        if (isCompleted(habit, d)) s = "done";
        else if (isSkipped(habit, d)) s = "notdone";
        else s = "pending";
      }
      out.push(s);
    }
    spark7Cache.set(habit.id, out);
    return out;
  }

  // How many times this week (Mon-Sun) a habit is scheduled and how many done.
  function weeklyProgress(habit) {
    const now = new Date();
    const weekStart = startOfWeekMonday(now);
    let scheduled = 0, done = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      if (d > now && !sameDay(d, now)) continue; // don't count future days
      if (isHabitActiveOn(habit, d)) {
        scheduled++;
        if (isCompleted(habit, d)) done++;
      }
    }
    // Total scheduled days in the full week (for the target denominator)
    let weekTotal = 0;
    for (let i = 0; i < 7; i++) {
      if (isHabitActiveOn(habit, addDays(weekStart, i))) weekTotal++;
    }
    return { scheduled, done, weekTotal };
  }

  // Overall adherence % for the week starting at weekStart (across all habits).
  function weekAdherencePct(weekStart) {
    const now = new Date();
    let scheduled = 0, done = 0;
    for (const habit of state.habits) {
      if (habit.archived) continue;
      if (isWeekly(habit)) {
        // Count the week as `weeklyTarget` slots; credit completed days up to target.
        const tgt = weeklyTarget(habit);
        let wd = 0;
        for (let i = 0; i < 7; i++) {
          const d = addDays(weekStart, i);
          if (d > now && !sameDay(d, now)) break;
          if (isCompleted(habit, d)) wd++;
        }
        scheduled += tgt;
        done += Math.min(wd, tgt);
        continue;
      }
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        if (d > now && !sameDay(d, now)) continue;
        if (countsForAdherence(habit, d)) {
          scheduled++;
          if (isCompleted(habit, d)) done++;
        }
      }
    }
    if (scheduled === 0) return null;
    const raw = (done / scheduled) * 100;
    // Don't let 99.5% round up to a misleading "100%" when a slot was missed.
    return (done < scheduled && raw > 99) ? 99 : Math.round(raw);
  }

  // Set a value and offer a one-tap undo.
  function setCompletionWithUndo(habit, date, newValue, undoLabel) {
    const prev = completionValue(habit.id, date);
    setCompletionValue(habit.id, date, newValue);
    renderToday();
    showUndoToast(undoLabel, () => {
      setCompletionValue(habit.id, date, prev);
      renderToday();
    });
  }
  // Delete = move to Trash (recoverable for 7 days). Permanent removal happens
  // via trashPurge / permanentDeleteFromTrash, which write the tombstone.
  function deleteHabitById(id, opts = { confirm: true }) {
    const habit = state.habits.find((h) => h.id === id);
    if (!habit) return false;
    if (opts.confirm && !confirm(`Move "${habit.name}" to Trash? You can restore it for 7 days.`)) return false;
    const snap = {};
    for (const day of Object.keys(state.completions)) {
      if (state.completions[day][id] != null) snap[day] = state.completions[day][id];
    }
    if (!state.trash) state.trash = [];
    state.trash.push({ habit, completions: snap, trashedAt: Date.now() });
    if (typeof logActivity === "function") logActivity("delete", `Deleted ${habit.icon || "•"} ${habit.name}`);
    state.habits = state.habits.filter((h) => h.id !== id);
    for (const day of Object.keys(state.completions)) {
      if (state.completions[day][id] != null) {
        delete state.completions[day][id];
        state.completionsUpdatedAt[day] = Date.now();
        if (Object.keys(state.completions[day]).length === 0) {
          delete state.completions[day];
          delete state.completionsUpdatedAt[day];
        }
      }
    }
    save();
    if (typeof scheduleReminders === "function") scheduleReminders();
    return true;
  }

  function renderTrash() {
    const els = getEls();
    if (!els.trashCard) return;
    const list = (state.trash || []).slice().sort((a, b) => (b.trashedAt || 0) - (a.trashedAt || 0));
    els.trashCard.hidden = list.length === 0;
    els.trashCount.textContent = list.length ? `${list.length} item${list.length === 1 ? "" : "s"}` : "";
    els.trashList.innerHTML = "";
    const DAY = 24 * 60 * 60 * 1000;
    for (const e of list) {
      const h = e.habit || {};
      const daysLeft = Math.max(0, Math.ceil((e.trashedAt + TRASH_RETENTION_MS - Date.now()) / DAY));
      const row = document.createElement("div");
      row.className = "device-row";
      row.innerHTML =
        `<span class="dv-icon">${escapeHtml(h.icon || "🎯")}</span>` +
        `<span class="dv-info"><b>${escapeHtml(h.name || "Untitled")}</b><br><span class="hint">restores for ${daysLeft} more day${daysLeft === 1 ? "" : "s"}</span></span>`;
      const actions = document.createElement("span");
      actions.className = "dv-actions";
      const restore = document.createElement("button");
      restore.className = "btn-secondary";
      restore.textContent = "Restore";
      restore.addEventListener("click", () => { restoreFromTrash(h.id); renderTrash(); if (currentView === "habits") renderHabits(); showToast(`Restored "${h.name}".`, "success"); });
      const del = document.createElement("button");
      del.className = "btn-secondary btn-danger-outline";
      del.textContent = "Delete forever";
      del.addEventListener("click", () => { if (confirm(`Permanently delete "${h.name}"? This cannot be undone.`)) { permanentDeleteFromTrash(h.id); renderTrash(); } });
      actions.appendChild(restore);
      actions.appendChild(del);
      row.appendChild(actions);
      els.trashList.appendChild(row);
    }
  }

  /* ---- Backup & restore ---- */
  function exportBackup() {
    const payload = {
      schemaVersion: 1,
      app: "momentum",
      appVersion: (self.APP_VERSION || ""),
      exportedAt: new Date().toISOString(),
      state,
    };
    downloadFile(`momentum-backup-${todayKey()}.json`, JSON.stringify(payload, null, 2), "application/json");
    localStorage.setItem(KEYS.lastBackup, String(Date.now()));
    if (getEls().backupStatus) { const el = getEls().backupStatus; el.hidden = false; el.className = "sync-status success"; el.textContent = "Backup downloaded."; }
  }
  function applyBackup(parsed, mode) {
    // Returns true on success. mode: "replace" | "merge".
    if (!parsed || typeof parsed !== "object") throw new Error("not a backup file");
    const incoming = parsed.state && parsed.state.habits ? parsed.state : (parsed.habits ? parsed : null);
    if (!incoming || !Array.isArray(incoming.habits)) throw new Error("unrecognized backup structure");
    const normalized = normalizeState(incoming);
    state = (mode === "merge") ? mergeStates(state, normalized) : normalized;
    save();
    return true;
  }
  function importBackupFile(file) {
    const els = getEls();
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try { parsed = JSON.parse(reader.result); }
      catch (e) { showBackupStatus("That file isn't valid JSON.", "warn"); return; }
      let incomingOk;
      try { incomingOk = (parsed.state && parsed.state.habits) || Array.isArray(parsed.habits); } catch (e) { incomingOk = false; }
      if (!incomingOk) { showBackupStatus("That doesn't look like a Momentum backup.", "warn"); return; }
      const merge = confirm("Import backup:\n\nOK = MERGE with your current data\nCancel = REPLACE everything with the backup");
      try {
        applyBackup(parsed, merge ? "merge" : "replace");
        switchView(currentView);
        renderTrash();
        showBackupStatus(merge ? "Backup merged." : "Backup restored.", "success");
      } catch (e) {
        showBackupStatus("Import failed: " + (e.message || e), "warn");
      }
    };
    reader.readAsText(file);
  }
  const BACKUP_REMINDER_MS = 21 * 24 * 60 * 60 * 1000;
  function maybeBackupReminder() {
    if (!state.habits || state.habits.length === 0) return;
    const last = Number(localStorage.getItem(KEYS.lastBackup)) || 0;
    if (last === 0) { localStorage.setItem(KEYS.lastBackup, String(Date.now())); return; } // seed on first run
    if (Date.now() - last > BACKUP_REMINDER_MS) {
      showToast("It's been a while since your last backup — Settings → Backup & restore.", "info", 6000);
    }
  }
  function showBackupStatus(msg, kind) {
    const el = getEls().backupStatus;
    if (!el) return;
    el.hidden = false;
    el.className = "sync-status " + (kind || "");
    el.textContent = msg;
  }

  /* ---- Per-habit detail view ---- */
  let detailHabitId = null;
  let detailMonthOffset = 0; // 0 = current month, -1 = last month, …
  const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Month grid of completion status for a single habit (Monday-first).
  function buildMonthCalendar(habit, offset) {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = base.getFullYear(), month = base.getMonth();
    const monthLabel = base.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDow = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Mon
    let cells = "";
    for (let i = 0; i < startDow; i++) cells += `<span class="mc-cell mc-empty"></span>`;
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      let cls = "off";
      if (d > now && !sameDay(d, now)) cls = "future";
      else if (isHabitActiveOn(habit, d)) {
        if (isCompleted(habit, d)) cls = "done";
        else if (isFrozen(habit.id, d)) cls = "frozen";
        else if (isSkipped(habit, d)) cls = "notdone";
        else cls = "pending";
      }
      const style = cls === "done" ? ` style="background:${escapeHtml(habit.color)};border-color:${escapeHtml(habit.color)}"` : "";
      const todayCls = sameDay(d, now) ? " mc-today" : "";
      cells += `<span class="mc-cell ${cls}${todayCls}"${style}>${day}</span>`;
    }
    const canNext = offset < 0;
    return `<div class="mc-head">
        <button type="button" class="mc-nav" id="mcPrev" aria-label="Previous month">‹</button>
        <span class="mc-month">${escapeHtml(monthLabel)}</span>
        <button type="button" class="mc-nav" id="mcNext" aria-label="Next month" ${canNext ? "" : "disabled"}>›</button>
      </div>
      <div class="mc-grid">
        ${["M", "T", "W", "T", "F", "S", "S"].map((l) => `<span class="mc-dow">${l}</span>`).join("")}
        ${cells}
      </div>`;
  }

  function openHabitDetail(habit, keepMonth) {
    const els = getEls();
    if (!els.habitDetailModal) return;
    detailHabitId = habit.id;
    if (!keepMonth) detailMonthOffset = 0; // reset to current month on fresh open
    resetRenderCaches();
    const cur = currentStreak(habit);
    const longest = longestStreak(habit);
    const stats = habitCompletionStats(habit);
    const frozenToday = isFrozen(habit.id, new Date());
    let html = `<div class="detail-head"><span class="habit-icon" style="background:${escapeHtml(habit.color)}">${escapeHtml(habit.icon || "🎯")}</span>` +
      `<div><h2 style="margin:0">${escapeHtml(habit.name)}</h2>` +
      `<span class="hint">${escapeHtml(habit.category)}${habit.archived ? " · archived" : ""}</span></div></div>`;
    // Notes + schedule up top so tapping any habit (incl. dose rows) shows them.
    const dTimes = (habit.reminderTimes && habit.reminderTimes.length ? habit.reminderTimes : (habit.reminderTime ? [habit.reminderTime] : []))
      .filter((t) => /^\d{2}:\d{2}$/.test(t)).map(fmtClockLabel);
    if (habit.notes && habit.notes.trim()) {
      html += `<div class="detail-note">${escapeHtml(habit.notes.trim())}</div>`;
    }
    if (dTimes.length || habit.time) {
      const when = dTimes.length ? dTimes.join(" · ") : escapeHtml(habit.time);
      html += `<p class="detail-line hint">🕒 ${when}${habit.type === "count" ? ` · target ${escapeHtml(fmtValue(habit, habit.target))}` : ""}</p>`;
    }
    const at = adaptiveTargetSuggestion(habit);
    if (at) {
      html += `<p class="detail-line hint">🎚️ You average ${at.avg}/day over the last ${at.days} — a target of ${at.suggested} might feel more doable.</p>`;
    }
    html += `<div class="detail-stats">` +
      `<div class="detail-stat"><div class="ds-num">${habit.quit ? "🟢" : "🔥"} ${cur}</div><div class="ds-lbl">${habit.quit ? "days clean" : "current streak"}</div></div>` +
      `<div class="detail-stat"><div class="ds-num">🏆 ${longest}</div><div class="ds-lbl">longest</div></div>` +
      `<div class="detail-stat"><div class="ds-num">${stats ? stats.rate + "%" : "—"}</div><div class="ds-lbl">completion</div></div>` +
      `</div>`;
    if (stats && stats.best) {
      html += `<p class="detail-line">Best day: <b>${DOW_LABELS[stats.best.dow]}</b> (${Math.round(stats.best.rate * 100)}%) · Toughest: <b>${DOW_LABELS[stats.worst.dow]}</b> (${Math.round(stats.worst.rate * 100)}%)</p>`;
      html += `<p class="detail-line hint">${stats.done} of ${stats.sched} scheduled days completed.</p>`;
    } else {
      html += `<p class="detail-line hint">Not enough history yet — check in for a few days to see your stats.</p>`;
    }
    // Month calendar of completion history
    html += `<div class="detail-month">${buildMonthCalendar(habit, detailMonthOffset)}</div>`;
    html += `<div class="mc-legend"><span class="mc-cell done"></span>Done <span class="mc-cell notdone"></span>Missed <span class="mc-cell frozen"></span>Frozen <span class="mc-cell pending"></span>Pending</div>`;
    html += `<label class="toggle-row" style="margin-top:0.8rem"><span><b>❄️ Freeze today</b><br><span class="hint">A planned rest/sick day won't break the streak.</span></span>` +
      `<input type="checkbox" id="detailFreezeToday" ${frozenToday ? "checked" : ""} /></label>`;
    els.habitDetailBody.innerHTML = html;
    const fz = document.getElementById("detailFreezeToday");
    if (fz) fz.addEventListener("change", () => { setFreeze(habit.id, new Date(), fz.checked); openHabitDetail(habit, true); });
    const mcPrev = document.getElementById("mcPrev");
    const mcNext = document.getElementById("mcNext");
    if (mcPrev) mcPrev.addEventListener("click", () => { detailMonthOffset -= 1; openHabitDetail(habit, true); });
    if (mcNext) mcNext.addEventListener("click", () => { if (detailMonthOffset < 0) { detailMonthOffset += 1; openHabitDetail(habit, true); } });
    els.detailArchiveBtn.textContent = habit.archived ? "Unarchive" : "Archive";
    els.habitDetailModal.classList.remove("hidden");
  }
  function closeHabitDetail() { const e = getEls(); if (e.habitDetailModal) e.habitDetailModal.classList.add("hidden"); detailHabitId = null; }

  /* ---- First-run onboarding ---- */
  function maybeOnboard() {
    const els = getEls();
    if (!els.onboardModal) return;
    if (localStorage.getItem(KEYS.onboardSeen) === "true") return;
    if (state.habits.length > 0 || (state.trash && state.trash.length > 0)) return;
    // A few friendly starter packs (subset of the template library).
    const picks = ["🏋️ Fitness & movement", "🥗 Nutrition & hydration", "😴 Sleep & recovery", "🧠 Mind & wellbeing", "☀️ Morning routine"];
    const sections = TEMPLATE_LIBRARY.filter((s) => picks.includes(s.title));
    els.onboardTemplates.innerHTML = sections.map((s, i) =>
      `<label class="onboard-pack"><input type="checkbox" data-sec="${TEMPLATE_LIBRARY.indexOf(s)}" ${i === 0 ? "checked" : ""} /> <span>${escapeHtml(s.title)} <span class="hint">(${s.items.length})</span></span></label>`
    ).join("");
    els.onboardModal.classList.remove("hidden");
  }
  function finishOnboard(add) {
    const els = getEls();
    if (add) {
      const now = Date.now();
      const rt = /^\d{2}:\d{2}$/.test(els.onboardReminder.value) ? els.onboardReminder.value : "";
      let count = 0;
      els.onboardTemplates.querySelectorAll("input[data-sec]:checked").forEach((cb) => {
        const sec = TEMPLATE_LIBRARY[Number(cb.dataset.sec)];
        if (!sec) return;
        for (const item of sec.items) {
          state.habits.push(habitFromTemplate(item, { defaultReminder: rt }));
          count++;
        }
      });
      if (rt) localStorage.setItem(KEYS.reminderDefault, rt);
      save();
      showToast(`Added ${count} habit${count === 1 ? "" : "s"}. Welcome aboard! 🎉`, "success");
    }
    localStorage.setItem(KEYS.onboardSeen, "true");
    els.onboardModal.classList.add("hidden");
    switchView("today");
  }

  function setHabitArchived(id, archived) {
    const h = state.habits.find((x) => x.id === id);
    if (!h) return;
    h.archived = !!archived;
    h.updatedAt = Date.now();
    resetRenderCaches();
    save();
    if (typeof scheduleReminders === "function") scheduleReminders();
    showToast(archived ? `Archived "${h.name}".` : `Unarchived "${h.name}".`, "success");
    renderHabits();
  }

  const TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
  function restoreFromTrash(id) {
    if (!state.trash) return false;
    const idx = state.trash.findIndex((e) => e.habit && e.habit.id === id);
    if (idx < 0) return false;
    const entry = state.trash[idx];
    const h = entry.habit;
    // Ensure it outlives any tombstone from a prior permanent delete.
    const tomb = (state.deletions.habits && state.deletions.habits[id]) || 0;
    h.updatedAt = Math.max(Date.now(), tomb + 1);
    if (state.deletions.habits) delete state.deletions.habits[id];
    state.habits.push(h);
    for (const [day, v] of Object.entries(entry.completions || {})) {
      if (!state.completions[day]) state.completions[day] = {};
      state.completions[day][id] = v;
      state.completionsUpdatedAt[day] = Date.now();
    }
    state.trash.splice(idx, 1);
    if (typeof logActivity === "function") logActivity("restore", `Restored ${h.icon || "•"} ${h.name}`);
    save();
    if (typeof scheduleReminders === "function") scheduleReminders();
    return true;
  }
  function permanentDeleteFromTrash(id) {
    if (!state.trash) return;
    state.trash = state.trash.filter((e) => !(e.habit && e.habit.id === id));
    tombstoneHabit(id);
    save();
  }
  // Auto-purge trash entries older than the retention period (writes tombstones).
  function purgeTrash(nowMs) {
    if (!state.trash || !state.trash.length) return 0;
    const cutoff = (nowMs || Date.now()) - TRASH_RETENTION_MS;
    const keep = [];
    let purged = 0;
    for (const e of state.trash) {
      if ((Number(e.trashedAt) || 0) <= cutoff) {
        if (e.habit && e.habit.id) tombstoneHabit(e.habit.id);
        purged++;
      } else keep.push(e);
    }
    state.trash = keep;
    return purged;
  }
  function deleteAllHabits() {
    if (state.habits.length === 0) { showToast("You don't have any habits yet."); return; }
    const n = state.habits.length;
    if (!confirm(`Delete all ${n} habit${n === 1 ? "" : "s"} and their check-ins? Your weekly measurements will be kept.`)) return;
    const ts = Date.now();
    for (const h of state.habits) state.deletions.habits[h.id] = ts;
    state.habits = [];
    state.completions = {};
    state.completionsUpdatedAt = {};
    save();
    switchView(currentView);
  }
  function parseTimeToMinutes(t) {
    if (!t) return null;
    const s = String(t).trim();
    const key = s.toLowerCase();
    const named = {
      "morning": 6 * 60, "afternoon": 12 * 60, "evening": 18 * 60,
      "night": 21 * 60, "all day": 24 * 60 + 1, "anytime": 24 * 60 + 1,
    };
    if (key in named) return named[key];
    // Extract leading time; allow trailing text like "8:00 AM · with meal 1"
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(s);
    if (!m) return 24 * 60 + 2;
    let hr = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3]?.toUpperCase();
    if (ampm === "PM" && hr < 12) hr += 12;
    if (ampm === "AM" && hr === 12) hr = 0;
    return hr * 60 + min;
  }
  function fmtValue(habit, value) {
    const rounded = Number.isInteger(habit.increment) && Number.isInteger(habit.target)
      ? Math.round(value)
      : Math.round(value * 100) / 100;
    const unit = habit.unit ? " " + habit.unit : "";
    return `${rounded}${unit}`;
  }
  function fmtTargetLabel(habit) {
    return habit.type === "check" ? "Check off when done" : `Target: ${fmtValue(habit, habit.target)}`;
  }
  function fmtFrequency(days) {
    if (!days || days.length === 7 || days.length === 0) return "Every day";
    const weekdays = [1,2,3,4,5];
    const weekends = [0,6];
    const sorted = [...days].sort();
    if (sorted.length === 5 && weekdays.every((d) => sorted.includes(d))) return "Weekdays";
    if (sorted.length === 2 && weekends.every((d) => sorted.includes(d))) return "Weekends";
    return DAY_DISPLAY.filter((d) => sorted.includes(d.idx)).map((d) => d.full).join(", ");
  }

  /* ================================================================
   * Sync (GitHub Gist, plain JSON)
   * ================================================================ */

  // Auto-sync is ON by default once a token exists, unless the user turned it off.
  function isAutoSyncEnabled() {
    if (!localStorage.getItem(KEYS.syncToken)) return false;
    return localStorage.getItem(KEYS.syncEnabled) !== "false";
  }
  function isRateLimited() { return rateLimitResetAt > Date.now(); }

  // Called when a rate limit is detected. Pause activity, schedule auto-resume.
  function pauseForRateLimit(resetMs) {
    rateLimitResetAt = resetMs && resetMs > Date.now() ? resetMs : Date.now() + 60 * 60 * 1000;
    stopAutoSync();
    if (resumeTimer) clearTimeout(resumeTimer);
    const delay = Math.max(1000, rateLimitResetAt - Date.now() + 2000);
    resumeTimer = setTimeout(resumeAfterRateLimit, delay);
    updateSyncIndicator("dirty");
    const when = new Date(rateLimitResetAt).toLocaleTimeString();
    showSyncStatus(`GitHub rate limit reached. Auto-sync will resume automatically around ${when}. Your data is safe on this device.`, "warn");
    renderSyncStateLine();
  }
  function resumeAfterRateLimit() {
    rateLimitResetAt = 0;
    resumeTimer = null;
    if (isAutoSyncEnabled() && navigator.onLine) {
      startAutoSync();
      updateSyncIndicator("idle");
      showSyncStatus("Rate limit cleared — auto-sync resumed.", "success");
      syncPush({ silent: true });
    }
    renderSyncStateLine();
  }

  // GitHub fetch wrapper: detects rate limiting and records the reset time.
  async function ghFetch(url, opts) {
    const res = await fetch(url, opts);
    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      const reset = res.headers.get("x-ratelimit-reset");
      const retryAfter = res.headers.get("retry-after");
      if (res.status === 429 || remaining === "0") {
        let resetMs = 0;
        if (reset) resetMs = Number(reset) * 1000;
        else if (retryAfter) resetMs = Date.now() + Number(retryAfter) * 1000;
        const err = new Error("API rate limit exceeded");
        err.rateLimited = true;
        err.resetMs = resetMs;
        throw err;
      }
    }
    return res;
  }

  function updateSyncIndicator(status) {
    const configured = !!localStorage.getItem(KEYS.syncToken);
    for (const id of ["syncIndicator", "syncIndicatorDesktop"]) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (!configured) { el.hidden = true; continue; }
      el.hidden = false;
      el.className = id === "syncIndicator" ? "sync-indicator" : "sync-indicator-desktop";
      el.classList.add(status);
      const labels = {
        syncing: "Syncing…",
        synced: "Synced",
        offline: "Offline",
        dirty: "Not synced",
        error: "Sync error",
        idle: "Sync ready",
      };
      el.textContent = labels[status] || status;
    }
  }

  function showSyncStatus(msg, kind) {
    const el = $("#syncStatus");
    if (!el) return;
    el.hidden = false;
    el.className = "sync-status " + (kind || "");
    el.textContent = msg;
    if (kind === "success" || kind === "warn") {
      clearTimeout(showSyncStatus._t);
      showSyncStatus._t = setTimeout(() => (el.hidden = true), 6000);
    }
  }

  function queueAutoSyncPush() {
    if (isRateLimited()) return;
    if (syncPushTimer) clearTimeout(syncPushTimer);
    syncPushTimer = setTimeout(() => {
      if (!syncInFlight && navigator.onLine && !isRateLimited()) syncPush({ silent: true });
    }, 3000);
  }

  function startAutoSync() {
    stopAutoSync();
    if (isRateLimited()) return; // will be restarted by resumeAfterRateLimit
    autoSyncInterval = setInterval(() => {
      if (!syncInFlight && navigator.onLine && !isRateLimited()) syncPull({ skipConfirm: true, silent: true });
    }, 5 * 60 * 1000);
    if (dirtyForSync && navigator.onLine) queueAutoSyncPush();
  }
  function stopAutoSync() {
    if (autoSyncInterval) { clearInterval(autoSyncInterval); autoSyncInterval = null; }
    if (syncPushTimer) { clearTimeout(syncPushTimer); syncPushTimer = null; }
  }

  function readRemotePayload(fileContent) {
    const payload = JSON.parse(fileContent);
    // Support both: {state: {...}} (new plain format) and legacy shapes if we ever see them
    if (payload.state && typeof payload.state === "object") return normalizeState(payload.state);
    if (payload.habits) return normalizeState(payload);
    return null;
  }

  /* ================================================================
   * OneDrive sync (Microsoft Graph + OAuth2 Authorization Code + PKCE)
   * A self-contained alternative to the Gist provider. Stores the app's data
   * in the user's OneDrive app folder (/Apps/<yourapp>/momentum.json).
   * Needs a one-time Azure app registration (client ID) — see the setup guide
   * in Settings. No client secret (public SPA client).
   * ================================================================ */
  const OD_AUTHORIZE = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
  const OD_TOKEN = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const OD_SCOPES = "Files.ReadWrite.AppFolder offline_access openid profile";
  const OD_FILE_URL = "https://graph.microsoft.com/v1.0/me/drive/special/approot:/momentum.json:/content";
  let odSyncInFlight = false;
  let odPushTimer = null;

  function odClientId() { return (localStorage.getItem(KEYS.odClientId) || "").trim(); }
  function odConnected() { return localStorage.getItem(KEYS.odEnabled) === "true" && !!localStorage.getItem(KEYS.odRefresh); }
  function odAutoEnabled() { return odConnected() && localStorage.getItem(KEYS.odAuto) === "true"; }
  // The redirect URI must exactly match the SPA redirect registered in Azure.
  function odRedirectUri() { return location.origin + location.pathname; }

  function b64url(bytes) {
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function odRandom(len) {
    const a = new Uint8Array(len || 48);
    crypto.getRandomValues(a);
    return b64url(a);
  }
  async function odChallenge(verifier) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return b64url(new Uint8Array(buf));
  }

  async function connectOneDrive() {
    const cid = odClientId();
    if (!cid) { showOdStatus("Enter your Azure app (client) ID first.", "warn"); return; }
    if (!/^[0-9a-f-]{30,40}$/i.test(cid)) { showOdStatus("That client ID doesn't look right — paste the Application (client) ID GUID from Azure.", "warn"); return; }
    if (!window.isSecureContext || !window.crypto || !crypto.subtle) {
      showOdStatus("Secure sign-in needs HTTPS. Open the app at its https:// address, then try again.", "warn");
      return;
    }
    try {
      showOdStatus("Redirecting to Microsoft sign-in…", "loading");
      const verifier = odRandom(48);
      const challenge = await odChallenge(verifier);
      const st = odRandom(12);
      localStorage.setItem("ht_od_verifier", verifier);
      localStorage.setItem("ht_od_state", st);
      const p = new URLSearchParams({
        client_id: cid, response_type: "code", redirect_uri: odRedirectUri(),
        scope: OD_SCOPES, code_challenge: challenge, code_challenge_method: "S256",
        state: st, prompt: "select_account",
      });
      window.location.assign(OD_AUTHORIZE + "?" + p.toString());
    } catch (e) {
      showOdStatus("Couldn't start sign-in: " + (e.message || e), "error");
    }
  }

  function storeOdTokens(data) {
    if (data.access_token) localStorage.setItem(KEYS.odAccess, data.access_token);
    if (data.refresh_token) localStorage.setItem(KEYS.odRefresh, data.refresh_token);
    const exp = Date.now() + ((Number(data.expires_in) || 3600) - 90) * 1000;
    localStorage.setItem(KEYS.odExpiry, String(exp));
  }

  // On app load: if we came back from the Microsoft sign-in with a ?code=,
  // exchange it for tokens. Returns true if it handled a redirect.
  async function handleOneDriveRedirect() {
    const u = new URL(location.href);
    const code = u.searchParams.get("code");
    const st = u.searchParams.get("state");
    if (!code || !st) return false;
    const expect = localStorage.getItem("ht_od_state");
    const verifier = localStorage.getItem("ht_od_verifier");
    // Only handle it if this looks like our OneDrive flow.
    if (!verifier || !expect || st !== expect) return false;
    try {
      const body = new URLSearchParams({
        client_id: odClientId(), grant_type: "authorization_code", code,
        redirect_uri: odRedirectUri(), code_verifier: verifier,
      });
      const res = await fetch(OD_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || data.error || "token exchange failed");
      storeOdTokens(data);
      localStorage.setItem(KEYS.odEnabled, "true");
      localStorage.removeItem("ht_od_verifier");
      localStorage.removeItem("ht_od_state");
      history.replaceState({}, "", odRedirectUri());
      await oneDrivePull({ silent: true });
      await oneDrivePush({ silent: true });
      showOdStatus("✓ OneDrive connected and synced.", "success");
      renderOneDriveState();
      return true;
    } catch (e) {
      history.replaceState({}, "", odRedirectUri());
      showOdStatus("OneDrive connect failed: " + (e.message || e), "error");
      return false;
    }
  }

  // Return a valid access token, refreshing via the refresh_token if needed.
  async function odAccessToken() {
    const at = localStorage.getItem(KEYS.odAccess);
    const exp = Number(localStorage.getItem(KEYS.odExpiry) || 0);
    if (at && Date.now() < exp) return at;
    const rt = localStorage.getItem(KEYS.odRefresh);
    const cid = odClientId();
    if (!rt || !cid) return null;
    try {
      const body = new URLSearchParams({
        client_id: cid, grant_type: "refresh_token", refresh_token: rt,
        redirect_uri: odRedirectUri(), scope: OD_SCOPES,
      });
      const res = await fetch(OD_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      const data = await res.json();
      if (!res.ok) { return null; }
      storeOdTokens(data);
      return data.access_token;
    } catch (e) { return null; }
  }

  function disconnectOneDrive() {
    [KEYS.odAccess, KEYS.odRefresh, KEYS.odExpiry, KEYS.odEnabled, KEYS.odAuto, KEYS.odLastSync].forEach((k) => localStorage.removeItem(k));
    showOdStatus("Disconnected from OneDrive (data stays on your device and OneDrive).", "success");
    renderOneDriveState();
  }

  async function oneDrivePull(opts = {}) {
    const silent = !!opts.silent;
    if (!odConnected()) return silent ? null : showOdStatus("Connect OneDrive first.", "warn");
    if (!navigator.onLine) return silent ? null : showOdStatus("You're offline.", "warn");
    const at = await odAccessToken();
    if (!at) return silent ? null : showOdStatus("Sign in to OneDrive again.", "warn");
    try {
      const res = await fetch(OD_FILE_URL, { headers: { Authorization: "Bearer " + at } });
      if (res.status === 404) { if (!silent) showOdStatus("No OneDrive backup yet — push first.", "success"); return true; }
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      const remote = readRemotePayload(text);
      if (remote) {
        const before = state.habits.length;
        state = mergeStates(state, remote);
        stampThisDevice();
        persistRaw();
        const delta = state.habits.length - before;
        recordSyncDetail("OneDrive pull", `${state.habits.length} habits${delta > 0 ? ` (+${delta})` : ""}`);
      }
      localStorage.setItem(KEYS.odLastSync, String(Date.now()));
      renderOneDriveState();
      if (!opts.internal && !silent) { showOdStatus("✓ Pulled from OneDrive.", "success"); switchView(currentView); }
      return true;
    } catch (e) {
      if (!silent) showOdStatus("OneDrive pull failed: " + (e.message || e), "error");
      return false; // signal the caller (push) so it won't clobber remote data
    }
  }

  async function oneDrivePush(opts = {}) {
    const silent = !!opts.silent;
    if (!odConnected()) return silent ? null : showOdStatus("Connect OneDrive first.", "warn");
    if (!navigator.onLine) { if (!silent) showOdStatus("You're offline. Will retry.", "warn"); return; }
    if (odSyncInFlight) return;
    odSyncInFlight = true;
    if (!silent) showOdStatus("⬆️ Uploading to OneDrive…", "loading");
    try {
      const at = await odAccessToken();
      if (!at) { if (!silent) showOdStatus("Sign in to OneDrive again.", "warn"); return; }
      // Pull-merge first so we never clobber another device's changes.
      const merged = await oneDrivePull({ silent: true, internal: true });
      if (merged === false) throw new Error("Skipped push: couldn't read cloud copy first");
      stampThisDevice();
      persistRaw();
      const payload = JSON.stringify({ version: 2, app: "health-tracker", updatedAt: new Date().toISOString(), state });
      const res = await fetch(OD_FILE_URL, { method: "PUT", headers: { Authorization: "Bearer " + (await odAccessToken()), "Content-Type": "application/json" }, body: payload });
      if (!res.ok) throw new Error("HTTP " + res.status);
      localStorage.setItem(KEYS.odLastSync, String(Date.now()));
      recordSyncDetail("OneDrive push", `${state.habits.length} habits`);
      renderOneDriveState();
      if (!silent) showOdStatus("✓ Pushed to OneDrive.", "success");
    } catch (e) {
      if (!silent) showOdStatus("OneDrive push failed: " + (e.message || e), "error");
    } finally {
      odSyncInFlight = false;
    }
  }

  function queueOneDrivePush() {
    if (odPushTimer) clearTimeout(odPushTimer);
    odPushTimer = setTimeout(() => { odPushTimer = null; oneDrivePush({ silent: true }); }, 4000);
  }

  function showOdStatus(msg, kind) {
    const el = document.getElementById("odStatus");
    if (!el) return;
    el.hidden = false;
    el.className = "sync-status" + (kind ? " " + kind : "");
    el.textContent = msg;
  }
  function renderOneDriveState() {
    const el = document.getElementById("odStateLine");
    const connectBtn = document.getElementById("odConnectBtn");
    const disconnectBtn = document.getElementById("odDisconnectBtn");
    const pushBtn = document.getElementById("odPushBtn");
    const pullBtn = document.getElementById("odPullBtn");
    const autoToggle = document.getElementById("odAutoToggle");
    const cid = document.getElementById("odClientId");
    if (cid && document.activeElement !== cid) cid.value = odClientId();
    const connected = odConnected();
    if (connectBtn) connectBtn.hidden = connected;
    if (disconnectBtn) disconnectBtn.hidden = !connected;
    if (pushBtn) pushBtn.disabled = !connected;
    if (pullBtn) pullBtn.disabled = !connected;
    if (autoToggle) { autoToggle.disabled = !connected; autoToggle.checked = odAutoEnabled(); }
    if (el) {
      if (!connected) { el.hidden = true; }
      else {
        const last = Number(localStorage.getItem(KEYS.odLastSync) || 0);
        el.hidden = false;
        el.innerHTML = `📁 OneDrive connected · Last sync <b>${timeAgo(last)}</b> · Auto <b>${odAutoEnabled() ? "on" : "off"}</b>`;
      }
    }
  }

  async function syncPush(opts = {}) {
    const silent = !!opts.silent;
    const token = localStorage.getItem(KEYS.syncToken);
    if (!token) return silent ? null : showSyncStatus("Paste your GitHub token first.", "warn");
    if (!navigator.onLine) { updateSyncIndicator("offline"); return silent ? null : showSyncStatus("You're offline. Will retry.", "warn"); }
    if (syncInFlight) return silent ? null : showSyncStatus("Another sync is running.", "warn");
    syncInFlight = true;
    if (!silent) showSyncStatus("⬆️ Uploading…", "loading");
    updateSyncIndicator("syncing");

    try {
      const gistId = localStorage.getItem(KEYS.syncGistId);

      // Pull-and-merge first so we don't clobber remote changes.
      if (gistId) {
        try {
          const res = await ghFetch(`https://api.github.com/gists/${gistId}`, {
            headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error("pre-push fetch failed: HTTP " + res.status);
          const data = await res.json();
          const file = data.files && data.files[SYNC_FILENAME];
          if (file) {
            const remoteState = readRemotePayload(file.content);
            if (remoteState) {
              state = mergeStates(state, remoteState);
              persistRaw();
            }
          }
        } catch (e) {
          if (e && e.rateLimited) throw e; // bubble up so we pause, don't PATCH
          // Don't fall through to PATCH — that would clobber newer remote data.
          throw new Error("Skipped push to avoid overwriting cloud data: " + (e.message || e));
        }
      }

      stampThisDevice(); // record this device's presence in the uploaded data
      persistRaw();
      const stateJson = JSON.stringify(state);
      const blobHash = quickHash(stateJson);
      if (lastSyncedHash === blobHash && !dirtyForSync) {
        showSyncStatus("Already synced — nothing to push.", "success");
        updateSyncIndicator("synced");
        return;
      }

      const payload = JSON.stringify({
        version: 2,
        app: "health-tracker",
        updatedAt: new Date().toISOString(),
        state,
      }, null, 0);

      const body = {
        description: "Health Tracker — backup",
        public: false,
        files: { [SYNC_FILENAME]: { content: payload } },
      };

      let res, data;
      if (gistId) {
        res = await ghFetch(`https://api.github.com/gists/${gistId}`, {
          method: "PATCH",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.message || "Update failed");
      } else {
        res = await ghFetch("https://api.github.com/gists", {
          method: "POST",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.message || "Create failed");
        localStorage.setItem(KEYS.syncGistId, data.id);
        const gistInput = $("#syncGistIdInput");
        if (gistInput) gistInput.value = data.id;
      }

      lastSyncedAt = Date.now();
      lastSyncedHash = blobHash;
      localStorage.setItem(KEYS.lastSynced, String(lastSyncedAt));
      localStorage.setItem(KEYS.lastSyncedHash, lastSyncedHash);
      dirtyForSync = false;
      updateSyncIndicator("synced");
      const kb = (payload.length / 1024).toFixed(1);
      recordSyncDetail("Pushed", `${state.habits.length} habits · ${kb} KB`);
      renderSyncStateLine();
      renderDeviceList();
      showSyncStatus(`✓ Pushed ${kb} KB · ${new Date().toLocaleTimeString()}`, "success");
    } catch (e) {
      updateSyncIndicator("error");
      const msg = String(e.message || "");
      const rateLimited = e.rateLimited || /rate limit|secondary rate|abuse detection/i.test(msg);
      const authErr = !rateLimited && /bad credentials|unauthorized|401|requires authentication|expired|invalid/i.test(msg);
      if (rateLimited) {
        // Pause and auto-resume when the limit resets — keep auto-sync enabled.
        pauseForRateLimit(e.resetMs);
      } else if (authErr) {
        showSyncStatus("Token rejected. Generate a new one at github.com/settings/tokens.", "error");
        stopAutoSync();
        localStorage.removeItem(KEYS.syncEnabled);
        const toggle = $("#autoSyncToggle");
        if (toggle) toggle.checked = false;
      } else {
        showSyncStatus("Sync error: " + e.message, "error");
      }
    } finally {
      syncInFlight = false;
    }
  }

  async function syncPull(opts = {}) {
    const silent = !!opts.silent;
    const skipConfirm = !!opts.skipConfirm;
    const token = localStorage.getItem(KEYS.syncToken);
    const gistId = localStorage.getItem(KEYS.syncGistId);
    if (!token) return silent ? null : showSyncStatus("Paste your GitHub token first.", "warn");
    if (!gistId) return silent ? null : showSyncStatus("No Gist yet — push from another device first.", "warn");
    if (syncInFlight) return silent ? null : showSyncStatus("Another sync is running.", "warn");
    if (!skipConfirm && !confirm("Pull will merge cloud data with local. Continue?")) return;

    syncInFlight = true;
    if (!silent) showSyncStatus("⬇️ Downloading and merging…", "loading");
    updateSyncIndicator("syncing");
    try {
      const res = await ghFetch(`https://api.github.com/gists/${gistId}`, {
        headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Fetch failed");
      const file = data.files && data.files[SYNC_FILENAME];
      if (!file) throw new Error("Gist doesn't contain our data file");
      const remoteState = readRemotePayload(file.content);
      if (!remoteState) throw new Error("Couldn't read remote state");

      const habitsBefore = state.habits.length;
      state = mergeStates(state, remoteState);
      stampThisDevice();
      persistRaw();
      const delta = state.habits.length - habitsBefore;
      recordSyncDetail("Pulled & merged", `${state.habits.length} habits${delta > 0 ? ` (+${delta} from cloud)` : ""}`);

      lastSyncedAt = Date.now();
      localStorage.setItem(KEYS.lastSynced, String(lastSyncedAt));
      updateSyncIndicator("synced");
      renderSyncStateLine();
      renderDeviceList();
      populateCategorySelects();
      showSyncStatus(`✓ Pulled and merged · ${new Date().toLocaleTimeString()}`, "success");
      switchView(currentView);
    } catch (e) {
      updateSyncIndicator("error");
      const msg = String(e.message || "");
      const rateLimited = e.rateLimited || /rate limit|secondary rate|abuse detection/i.test(msg);
      const authErr = !rateLimited && /bad credentials|unauthorized|401|requires authentication/i.test(msg);
      if (rateLimited) {
        pauseForRateLimit(e.resetMs);
      } else if (authErr) {
        showSyncStatus("Token rejected. Check the token in Settings.", "error");
      } else {
        showSyncStatus("Pull error: " + e.message, "error");
      }
    } finally {
      syncInFlight = false;
    }
  }

  async function testConnection() {
    const token = localStorage.getItem(KEYS.syncToken);
    if (!token) return showSyncStatus("Add a GitHub token first.", "warn");
    if (!navigator.onLine) return showSyncStatus("You're offline.", "warn");
    showSyncStatus("Testing…", "loading");
    try {
      const gistId = localStorage.getItem(KEYS.syncGistId);
      if (gistId) {
        const res = await fetch(`https://api.github.com/gists/${gistId}`, {
          headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || `HTTP ${res.status}`);
        }
        const data = await res.json();
        const file = data.files && data.files[SYNC_FILENAME];
        const kb = file ? (file.size / 1024).toFixed(1) : "0";
        showSyncStatus(`✓ Connected. Cloud data: ${kb} KB. Updated ${timeAgo(new Date(data.updated_at).getTime())}.`, "success");
      } else {
        // Validate token by hitting the user endpoint
        const res = await fetch("https://api.github.com/user", {
          headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showSyncStatus("✓ Token works. Push once to create your cloud Gist.", "success");
      }
    } catch (e) {
      const authErr = /401|403|bad credentials|unauthorized/i.test(String(e.message));
      showSyncStatus(authErr ? "Token rejected — generate a new one." : "Connection failed: " + e.message, "error");
    }
  }

  // Build a pairing link that carries token + gist id in the URL hash (local only).
  function buildPairingLink() {
    const token = localStorage.getItem(KEYS.syncToken);
    const gistId = localStorage.getItem(KEYS.syncGistId) || "";
    if (!token) return null;
    const payload = btoa(JSON.stringify({ t: token, g: gistId }));
    const base = location.href.split("#")[0];
    return `${base}#pair=${payload}`;
  }

  function copyPairingLink() {
    const link = buildPairingLink();
    if (!link) return showSyncStatus("Set up a token first, then copy the pairing link.", "warn");
    const done = () => showSyncStatus("Pairing link copied. Send it only to your own device.", "success");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(done).catch(() => prompt("Copy this pairing link:", link));
    } else {
      prompt("Copy this pairing link:", link);
    }
  }

  function showPairingQr() {
    const link = buildPairingLink();
    if (!link) { showSyncStatus("Set up a token first, then show the QR.", "warn"); return; }
    const holder = $("#qrHolder");
    holder.innerHTML = "";
    if (typeof qrcode === "undefined") {
      holder.innerHTML = '<p class="empty-inline">QR library not loaded. Use "Copy link instead".</p>';
    } else {
      try {
        // Error-correction 'L' maximizes capacity for the long link; auto version (0).
        const qr = qrcode(0, "L");
        qr.addData(link);
        qr.make();
        holder.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
      } catch (e) {
        holder.innerHTML = '<p class="empty-inline">Link too long for a QR. Use "Copy link instead".</p>';
      }
    }
    $("#qrModal").classList.remove("hidden");
  }
  function closeQrModal() { $("#qrModal").classList.add("hidden"); }

  // Import token+gist from a pairing payload (base64 of {t,g}). Returns true if imported.
  function importPairingPayload(b64, opts = {}) {
    try {
      const data = JSON.parse(atob(b64));
      if (!data || !data.t) return false;
      if (opts.confirm !== false &&
          !confirm("Import sync settings and connect this device to your cloud data?")) return false;
      localStorage.setItem(KEYS.syncToken, data.t);
      if (data.g) localStorage.setItem(KEYS.syncGistId, data.g);
      hydrateSettings();
      showToast("Paired. Pulling your data…", "success");
      switchView("settings");
      if (isAutoSyncEnabled()) startAutoSync();  // on by default now
      setTimeout(() => syncPull({ skipConfirm: true }), 400);
      return true;
    } catch (e) { return false; }
  }

  // Extract a #pair= payload from a scanned/typed string (full URL or bare hash).
  function extractPairPayload(text) {
    const m = /#pair=([A-Za-z0-9+/=]+)/.exec(text || "");
    return m ? m[1] : null;
  }

  // On load, detect #pair= and offer to import token+gist.
  function checkPairingLink() {
    const payload = extractPairPayload(location.hash);
    if (!payload) return;
    importPairingPayload(payload);
    history.replaceState(null, "", location.pathname);
  }

  /* ---- QR scanner ---- */
  let scanStream = null;
  let scanRAF = null;
  async function openScanner() {
    const modal = $("#scanModal");
    const video = $("#scanVideo");
    const status = $("#scanStatus");
    if (typeof jsQR === "undefined") {
      showSyncStatus("QR scanner library not loaded.", "warn");
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showSyncStatus("Camera not available in this browser.", "warn");
      return;
    }
    modal.classList.remove("hidden");
    status.className = "scan-status";
    status.textContent = "Starting camera…";
    try {
      scanStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, audio: false,
      });
      video.srcObject = scanStream;
      await video.play();
      status.textContent = "Point at the pairing QR…";
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const tick = () => {
        if (!scanStream) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          try {
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
            if (code && code.data) {
              const payload = extractPairPayload(code.data);
              if (payload) {
                status.className = "scan-status success";
                status.textContent = "QR found. Pairing…";
                closeScanner();
                importPairingPayload(payload, { confirm: false });
                return;
              } else {
                status.textContent = "That QR isn't a Momentum pairing code.";
              }
            }
          } catch (e) { /* keep scanning */ }
        }
        scanRAF = requestAnimationFrame(tick);
      };
      scanRAF = requestAnimationFrame(tick);
    } catch (e) {
      status.className = "scan-status error";
      status.textContent = /denied|NotAllowed/i.test(String(e.name || e.message))
        ? "Camera permission denied. Allow camera access and try again."
        : "Couldn't start the camera: " + (e.message || e.name);
    }
  }
  function closeScanner() {
    if (scanRAF) { cancelAnimationFrame(scanRAF); scanRAF = null; }
    if (scanStream) {
      scanStream.getTracks().forEach((t) => t.stop());
      scanStream = null;
    }
    const v = $("#scanVideo");
    if (v) v.srcObject = null;
    $("#scanModal").classList.add("hidden");
  }

  async function deleteCloudData() {
    const token = localStorage.getItem(KEYS.syncToken);
    const gistId = localStorage.getItem(KEYS.syncGistId);
    if (!token || !gistId) return showSyncStatus("No cloud data configured.", "warn");
    if (!confirm("Delete the cloud Gist? Local data stays.")) return;
    try {
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: "DELETE",
        headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Delete failed");
      }
      localStorage.removeItem(KEYS.syncGistId);
      localStorage.removeItem(KEYS.lastSynced);
      localStorage.removeItem(KEYS.lastSyncedHash);
      lastSyncedAt = 0; lastSyncedHash = null;
      $("#syncGistIdInput").value = "";
      updateSyncIndicator("idle");
      showSyncStatus("Cloud data deleted.", "success");
    } catch (e) {
      showSyncStatus("Delete error: " + e.message, "error");
    }
  }

  /* ================================================================
   * Templates
   * ================================================================ */

  // Set of "sectionIdx:itemIdx" keys currently ticked in the picker.
  let templateSelected = new Set();

  function templateKey(si, ii) { return `${si}:${ii}`; }

  // A template item counts as "already added" if a non-deleted habit has the
  // same name (case-insensitive).
  function existingHabitNames() {
    return new Set(state.habits.map((h) => h.name.trim().toLowerCase()));
  }

  function openTemplateModal() {
    templateSelected = new Set();
    renderTemplateList();
    updateTemplateCount();
    getEls().templateModal.classList.remove("hidden");
  }
  function closeTemplateModal() {
    getEls().templateModal.classList.add("hidden");
  }

  function renderTemplateList() {
    const els = getEls();
    const listEl = els.templateList;
    listEl.innerHTML = "";
    const added = existingHabitNames();

    TEMPLATE_LIBRARY.forEach((section, si) => {
      const secEl = document.createElement("div");
      secEl.className = "template-section";

      const title = document.createElement("div");
      title.className = "template-section-title";
      const selectableIdx = section.items.map((_, ii) => ii);
      const selCount = selectableIdx.filter((ii) => templateSelected.has(templateKey(si, ii))).length;
      title.innerHTML = `<span>${escapeHtml(section.title)}</span><span class="template-section-count">${selCount}/${section.items.length}</span>`;
      title.addEventListener("click", () => toggleSection(si));
      secEl.appendChild(title);

      section.items.forEach((item, ii) => {
        const key = templateKey(si, ii);
        const isAdded = added.has(item.name.trim().toLowerCase());
        const row = document.createElement("div");
        row.className = "template-item" + (templateSelected.has(key) ? " selected" : "");
        row.addEventListener("click", () => toggleItem(si, ii));

        const check = document.createElement("div");
        check.className = "template-check";
        check.textContent = "✓";

        const icon = document.createElement("div");
        icon.className = "template-icon";
        icon.style.background = item.color || "#6366f1";
        icon.textContent = item.icon || "🎯";

        const info = document.createElement("div");
        info.className = "template-item-info";
        const name = document.createElement("div");
        name.className = "template-item-name";
        name.textContent = item.name;
        const meta = document.createElement("div");
        meta.className = "template-item-meta";
        const metaParts = [];
        if (item.time) metaParts.push(item.time);
        if (item.notes) metaParts.push(item.notes);
        if (clockFromTimeStr(item.time)) metaParts.push("🔔 auto-reminder");
        meta.textContent = metaParts.join(" · ");
        info.appendChild(name);
        if (metaParts.length) info.appendChild(meta);

        row.appendChild(check);
        row.appendChild(icon);
        row.appendChild(info);
        if (isAdded) {
          const badge = document.createElement("span");
          badge.className = "template-item-added";
          badge.textContent = "Added";
          row.appendChild(badge);
        }
        secEl.appendChild(row);
      });

      listEl.appendChild(secEl);
    });
  }

  function toggleItem(si, ii) {
    const key = templateKey(si, ii);
    if (templateSelected.has(key)) templateSelected.delete(key);
    else templateSelected.add(key);
    renderTemplateList();
    updateTemplateCount();
  }

  function toggleSection(si) {
    const section = TEMPLATE_LIBRARY[si];
    const keys = section.items.map((_, ii) => templateKey(si, ii));
    const allSelected = keys.every((k) => templateSelected.has(k));
    keys.forEach((k) => allSelected ? templateSelected.delete(k) : templateSelected.add(k));
    renderTemplateList();
    updateTemplateCount();
  }

  function templateSelectAll() {
    TEMPLATE_LIBRARY.forEach((section, si) => {
      section.items.forEach((_, ii) => templateSelected.add(templateKey(si, ii)));
    });
    renderTemplateList();
    updateTemplateCount();
  }
  function templateClearAll() {
    templateSelected.clear();
    renderTemplateList();
    updateTemplateCount();
  }

  function updateTemplateCount() {
    const els = getEls();
    const n = templateSelected.size;
    els.templateCount.textContent = `${n} selected`;
    els.templateAddBtn.textContent = n > 0 ? `Add selected (${n})` : "Add selected";
    els.templateAddBtn.disabled = n === 0;
  }

  // Extract "HH:MM" (24h) from a time string like "8:00 AM · with meal" or "".
  function clockFromTimeStr(t) {
    const m = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(t || "");
    if (!m) return "";
    let hh = parseInt(m[1], 10); const mm = parseInt(m[2], 10); const ap = (m[3] || "").toUpperCase();
    if (ap === "PM" && hh < 12) hh += 12;
    if (ap === "AM" && hh === 12) hh = 0;
    if (hh > 23 || mm > 59) return "";
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }
  // Build a full habit from a template item, filling in smart defaults:
  //  • auto reminder time derived from the item's clock time (else defaultReminder)
  //  • supplement dose/notes carried into the custom reminder message
  function habitFromTemplate(item, opts) {
    const now = Date.now();
    const h = {
      id: uid(),
      createdAt: new Date(now).toISOString(),
      updatedAt: now,
      ...TEMPLATE_ITEM_DEFAULTS,
      ...item,
    };
    if (!h.reminderTime) {
      const c = clockFromTimeStr(item.time);
      if (c) h.reminderTime = c;
      else if (opts && opts.defaultReminder) h.reminderTime = opts.defaultReminder;
    }
    if (!h.reminderMsg && h.notes && h.category === "Supplements") h.reminderMsg = h.notes.slice(0, 120);
    return h;
  }

  // One-time backfill: give existing habits the same smart defaults new
  // template habits get — reminder time from their set time, dose→message for
  // supplements. Only fills blanks; never overwrites a reminder you set.
  function smartFillReminders() {
    const els = getEls();
    let n = 0;
    for (const h of state.habits) {
      let changed = false;
      if (!h.reminderTime) {
        const c = clockFromTimeStr(h.time);
        if (c) { h.reminderTime = c; changed = true; }
      }
      if (!h.reminderMsg && h.notes && h.category === "Supplements") {
        h.reminderMsg = h.notes.slice(0, 120); changed = true;
      }
      if (changed) { h.updatedAt = Date.now(); n++; }
    }
    if (n) { save(); scheduleReminders(); if (currentView === "habits") renderHabits(); }
    const el = els.smartFillStatus;
    if (el) {
      el.hidden = false;
      el.className = "sync-status success";
      el.textContent = n ? `Smart-filled ${n} habit${n === 1 ? "" : "s"}.` : "All caught up — nothing to fill.";
    }
    showToast(n ? `Smart-filled ${n} habit${n === 1 ? "" : "s"}.` : "Nothing to fill — you're all set.", "success");
  }

  // Copy the matching template's note onto any habit (by name) that has no note
  // yet. Never overwrites a note you've written. Returns the count filled.
  function templateNoteMap() {
    const map = {};
    for (const sec of TEMPLATE_LIBRARY) {
      for (const it of sec.items) {
        const key = (it.name || "").trim().toLowerCase();
        if (key && it.notes && !map[key]) map[key] = it.notes;
      }
    }
    return map;
  }
  function fillNotesFromTemplates(overwrite) {
    const map = templateNoteMap();
    let n = 0;
    for (const h of state.habits) {
      const note = map[(h.name || "").trim().toLowerCase()];
      if (!note) continue;                                   // no matching template → leave alone
      const cur = (h.notes || "").trim();
      if (cur && !overwrite) continue;                       // keep your own note unless overwriting
      if (cur === note) continue;                            // already up to date
      h.notes = note.slice(0, 500); h.updatedAt = Date.now(); n++;
    }
    if (typeof document === "undefined") return n; // test sandbox: skip UI
    if (n) {
      save();
      if (currentView === "habits") renderHabits();
      if (currentView === "today") renderToday();
    }
    const verb = overwrite ? "Updated" : "Added";
    const el = getEls().smartFillStatus;
    if (el) {
      el.hidden = false;
      el.className = "sync-status success";
      el.textContent = n ? `${verb} notes on ${n} habit${n === 1 ? "" : "s"} from templates.` : "Nothing to change — notes already match.";
    }
    showToast(n ? `${verb} notes on ${n} habit${n === 1 ? "" : "s"}.` : "No note changes needed.", "success");
    return n;
  }
  // One button: fill blank notes from templates, and if some matching habits
  // already have a *different* note, offer to update those too.
  function syncNotesFromTemplates() {
    const map = templateNoteMap();
    let blanks = 0, diffs = 0;
    for (const h of state.habits) {
      const note = map[(h.name || "").trim().toLowerCase()];
      if (!note) continue;
      const cur = (h.notes || "").trim();
      if (!cur) blanks++;
      else if (cur !== note) diffs++;
    }
    if (blanks === 0 && diffs === 0) {
      showToast("Notes already match your templates — nothing to change.", "success");
      const el = getEls().smartFillStatus;
      if (el) { el.hidden = false; el.className = "sync-status success"; el.textContent = "Notes already match your templates."; }
      return;
    }
    // Fill the blanks first.
    if (blanks > 0) fillNotesFromTemplates(false);
    // Then, if there are habits with their own (different) notes, ask.
    if (diffs > 0 && confirm(`${diffs} habit${diffs === 1 ? " already has a note that's" : "s already have notes that are"} different from the template. Update ${diffs === 1 ? "it" : "them"} too? (Your custom wording will be replaced.)`)) {
      fillNotesFromTemplates(true);
    }
  }

  /* ---- Bulk "Time of day" from reminder times ---- */
  // The clock summary a habit's reminder times would produce, e.g. "8:00 AM &
  // 8:00 PM". Empty string when the habit has no valid reminder times. Pure.
  function timeSummaryFromReminders(habit) {
    const times = (habit.reminderTimes && habit.reminderTimes.length)
      ? habit.reminderTimes.filter((t) => /^\d{2}:\d{2}$/.test(t))
      : (/^\d{2}:\d{2}$/.test(habit.reminderTime) ? [habit.reminderTime] : []);
    if (!times.length) return "";
    return times.slice().sort().map(fmtClockLabel).join(" & ");
  }
  // Apply that summary to each habit's "Time of day". When overwrite is false,
  // only fills blanks and refreshes auto-generated clock summaries — custom
  // labels like "8:00 AM · with meal" or "Morning" are preserved. Returns count.
  function applyTimeFromReminders(overwrite) {
    let n = 0;
    for (const h of state.habits) {
      const summary = timeSummaryFromReminders(h);
      if (!summary) continue;
      const cur = (h.time || "").trim();
      if (cur === summary) continue;
      if (overwrite || cur === "" || isAutoTimeSummary(cur)) {
        h.time = summary;
        h.updatedAt = Date.now();
        n++;
      }
    }
    if (n && typeof document !== "undefined") { save(); if (currentView === "habits") renderHabits(); if (currentView === "today") renderToday(); }
    return n;
  }
  // One button: refresh "Time of day" from reminder times for all habits. Fills
  // blanks/auto summaries silently, then offers to overwrite custom labels too.
  function syncTimeFromRemindersAll() {
    let blanks = 0, autos = 0, customDiffs = 0;
    for (const h of state.habits) {
      const summary = timeSummaryFromReminders(h);
      if (!summary) continue;
      const cur = (h.time || "").trim();
      if (cur === summary) continue;
      if (cur === "") blanks++;
      else if (isAutoTimeSummary(cur)) autos++;
      else customDiffs++;
    }
    const el = getEls().smartFillStatus;
    if (blanks === 0 && autos === 0 && customDiffs === 0) {
      showToast("Time of day already matches your reminder times.", "success");
      if (el) { el.hidden = false; el.className = "sync-status success"; el.textContent = "Time of day already matches your reminders."; }
      return;
    }
    const filled = applyTimeFromReminders(false); // blanks + auto summaries
    if (customDiffs > 0 && confirm(`${customDiffs} habit${customDiffs === 1 ? " has a custom time label" : "s have custom time labels"} (e.g. "with meal"). Replace ${customDiffs === 1 ? "it" : "them"} with the reminder times too?`)) {
      const more = applyTimeFromReminders(true);
      if (el) { el.hidden = false; el.className = "sync-status success"; el.textContent = `Updated Time of day on ${filled + more} habit${filled + more === 1 ? "" : "s"}.`; }
      showToast(`Updated Time of day on ${filled + more} habit${filled + more === 1 ? "" : "s"}.`, "success");
      return;
    }
    if (el) { el.hidden = false; el.className = "sync-status success"; el.textContent = `Updated Time of day on ${filled} habit${filled === 1 ? "" : "s"}.`; }
    showToast(`Updated Time of day on ${filled} habit${filled === 1 ? "" : "s"}.`, "success");
  }

  function addSelectedTemplates() {
    if (templateSelected.size === 0) return;
    let count = 0;
    templateSelected.forEach((key) => {
      const [si, ii] = key.split(":").map(Number);
      const item = TEMPLATE_LIBRARY[si] && TEMPLATE_LIBRARY[si].items[ii];
      if (!item) return;
      state.habits.push(habitFromTemplate(item));
      count++;
    });
    save();
    closeTemplateModal();
    showToast(`Added ${count} habit${count === 1 ? "" : "s"}.`, "success");
    switchView("habits");
  }

  function clearAllHistory() {
    const days = Object.keys(state.completions).length;
    if (days === 0) { showToast("No check-in history to clear."); return; }
    if (!confirm(`Clear all check-in history across ${days} day(s)? Your habits, measurements, and settings stay. This can't be undone.`)) return;
    const ts = Date.now();
    for (const d of Object.keys(state.completions)) {
      state.completions[d] = {};
      state.completionsUpdatedAt[d] = ts;
    }
    save();
    renderDataSummary();
    showToast("Check-in history cleared.", "success");
  }

  // Approx bytes used by the local progress-photo store (UTF-16 ≈ 2 bytes/char).
  function photosBytes() {
    try { return (localStorage.getItem("ht_photos") || "{}").length * 2 + (localStorage.getItem("ht_schedule_photo") || "").length * 2; }
    catch (e) { return 0; }
  }
  function prunePhotosOlderThan(days) {
    const p = loadPhotos();
    const cutoff = addDays(new Date(), -days);
    let n = 0;
    for (const wk of Object.keys(p)) {
      const d = new Date(wk + "T00:00:00");
      if (!isNaN(d.getTime()) && d < cutoff) { delete p[wk]; n++; }
    }
    if (n) {
      savePhotos(p);
      renderDataSummary();
      if (currentView === "progress") renderProgress();
    }
    showToast(n ? `Pruned ${n} photo${n === 1 ? "" : "s"} older than ${days} days.` : "No photos older than that.", n ? "success" : "");
  }
  function prunePhotosPrompt() {
    const total = Object.keys(loadPhotos()).length;
    if (total === 0) { showToast("No progress photos saved."); return; }
    if (confirm(`Delete progress photos older than 90 days? Recent ones stay. (${total} saved right now.)`)) {
      prunePhotosOlderThan(90);
    }
  }

  function deleteAllPhotos() {
    const n = Object.keys(loadPhotos()).length;
    if (n === 0) { showToast("No photos to delete."); return; }
    if (!confirm(`Delete all ${n} progress photo(s) from this device? This can't be undone.`)) return;
    localStorage.removeItem("ht_photos");
    renderDataSummary();
    if (currentView === "progress") renderProgress();
    showToast("Photos deleted.", "success");
  }

  function resetApp() {
    if (!confirm("This will delete all local data and sync setup. Continue?")) return;
    if (!confirm("Really? This is irreversible.")) return;
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    LEGACY_PLAIN_KEYS.forEach((k) => localStorage.removeItem(k));
    LEGACY_KEYS_TO_CLEAR.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem("ht_photos");
    localStorage.removeItem("ht_schedule_photo");
    state = defaultState();
    location.reload();
  }

  /* ================================================================
   * DOM handles
   * ================================================================ */

  let elsCache = null;
  function getEls() {
    if (elsCache) return elsCache;
    elsCache = {
      // shell
      app: $("#app"),
      sidebar: $("#sidebar"),
      sidebarBackdrop: $("#sidebarBackdrop"),
      menuToggle: $("#menuToggle"),
      // nav
      navItems: $$(".nav-item"),
      pages: {
        today: $("#page-today"),
        habits: $("#page-habits"),
        progress: $("#page-progress"),
        report: $("#page-report"),
        schedule: $("#page-schedule"),
        settings: $("#page-settings"),
      },
      // today
      todayGreeting: $("#todayGreeting"),
      todayGreetingSub: $("#todayGreetingSub"),
      todayCategoryFilter: $("#todayCategoryFilter"),
      todayAddBtn: $("#todayAddBtn"),
      todayMenuBtn: $("#todayMenuBtn"),
      todayMenu: $("#todayMenu"),
      adherencePct: $("#adherencePct"),
      adherenceText: $("#adherenceText"),
      adherenceUpNext: $("#adherenceUpNext"),
      todayGroups: $("#todayGroups"),
      fastingCard: $("#fastingCard"),
      fastingToggle: $("#fastingToggle"),
      fastingHeadSummary: $("#fastingHeadSummary"),
      fastingSchedBtn: $("#fastingSchedBtn"),
      fastingActive: $("#fastingActive"),
      fastingIdle: $("#fastingIdle"),
      fastingIdleSub: $("#fastingIdleSub"),
      fastingSchedule: $("#fastingSchedule"),
      fastingRingSeg: $("#fastingRingSeg"),
      fastingElapsed: $("#fastingElapsed"),
      fastingRingLabel: $("#fastingRingLabel"),
      fastingStatus: $("#fastingStatus"),
      fastingRemaining: $("#fastingRemaining"),
      fastingWindow: $("#fastingWindow"),
      fastingStopBtn: $("#fastingStopBtn"),
      fastingPresets: $("#fastingPresets"),
      fastingStartBtn: $("#fastingStartBtn"),
      fastingSchedToggle: $("#fastingSchedToggle"),
      fastingStartTime: $("#fastingStartTime"),
      fastingEatTime: $("#fastingEatTime"),
      fastingSchedHint: $("#fastingSchedHint"),
      todayEmpty: $("#todayEmpty"),
      todayHint: $("#todayHint"),
      todayHintDismiss: $("#todayHintDismiss"),
      journalText: $("#journalText"),
      journalSaved: $("#journalSaved"),
      // habits
      habitsGroups: $("#habitsGroups"),
      habitsEmpty: $("#habitsEmpty"),
      habitSearch: $("#habitSearch"),
      quickAddForm: $("#quickAddForm"),
      quickAddInput: $("#quickAddInput"),
      bulkToggleBtn: $("#bulkToggleBtn"),
      bulkBar: $("#bulkBar"),
      bulkCount: $("#bulkCount"),
      bulkCategory: $("#bulkCategory"),
      bulkMoveBtn: $("#bulkMoveBtn"),
      bulkDeleteBtn: $("#bulkDeleteBtn"),
      bulkDoneBtn: $("#bulkDoneBtn"),
      addBtn: $("#addBtn"),
      deleteAllBtn: $("#deleteAllBtn"),
      // habit modal
      modal: $("#modal"),
      modalTitle: $("#modalTitle"),
      habitForm: $("#habitForm"),
      habitName: $("#habitName"),
      habitCategory: $("#habitCategory"),
      habitTime: $("#habitTime"),
      habitReminderList: $("#habitReminderList"),
      addReminderTimeBtn: $("#addReminderTimeBtn"),
      habitNotes: $("#habitNotes"),
      habitTarget: $("#habitTarget"),
      habitUnit: $("#habitUnit"),
      habitIncrement: $("#habitIncrement"),
      typePicker: $(".type-picker"),
      countFields: $("#countFields"),
      habitDoseSpacingHint: $("#habitDoseSpacingHint"),
      habitCountSuggest: $("#habitCountSuggest"),
      habitCountSuggestText: $("#habitCountSuggestText"),
      habitCountSuggestBtn: $("#habitCountSuggestBtn"),
      iconPicker: $("#iconPicker"),
      colorPicker: $("#colorPicker"),
      daysPicker: $("#daysPicker"),
      freqType: $("#freqType"),
      daysWrap: $("#daysWrap"),
      weeklyWrap: $("#weeklyWrap"),
      habitWeeklyTarget: $("#habitWeeklyTarget"),
      habitNightPrevDay: $("#habitNightPrevDay"),
      habitNoPush: $("#habitNoPush"),
      habitQuit: $("#habitQuit"),
      habitReminderMsg: $("#habitReminderMsg"),
      habitAnchor: $("#habitAnchor"),
      advancedToggle: $("#advancedToggle"),
      dayTimesWrap: $("#dayTimesWrap"),
      dayTimesGrid: $("#dayTimesGrid"),
      cancelBtn: $("#cancelBtn"),
      deleteBtn: $("#deleteBtn"),
      // habit detail modal
      habitDetailModal: $("#habitDetailModal"),
      habitDetailBody: $("#habitDetailBody"),
      detailArchiveBtn: $("#detailArchiveBtn"),
      detailCloseBtn: $("#detailCloseBtn"),
      detailEditBtn: $("#detailEditBtn"),
      moodStrip: $("#moodStrip"),
      keystoneCard: $("#keystoneCard"),
      // vacation mode
      vacationBanner: $("#vacationBanner"),
      vacationStatus: $("#vacationStatus"),
      vacationStart: $("#vacationStart"),
      vacationEnd: $("#vacationEnd"),
      vacationNote: $("#vacationNote"),
      vacationSaveBtn: $("#vacationSaveBtn"),
      vacationClearBtn: $("#vacationClearBtn"),
      // weekly review
      reviewPrompt: $("#reviewPrompt"),
      reviewModal: $("#reviewModal"),
      reviewRange: $("#reviewRange"),
      reviewBody: $("#reviewBody"),
      reviewFocus: $("#reviewFocus"),
      reviewKeystone: $("#reviewKeystone"),
      reviewCloseBtn: $("#reviewCloseBtn"),
      reviewSkipBtn: $("#reviewSkipBtn"),
      reviewSaveBtn: $("#reviewSaveBtn"),
      // onboarding
      onboardModal: $("#onboardModal"),
      onboardTemplates: $("#onboardTemplates"),
      onboardReminder: $("#onboardReminder"),
      onboardSkipBtn: $("#onboardSkipBtn"),
      onboardAddBtn: $("#onboardAddBtn"),
      // report
      weekLabel: $("#weekLabel"),
      prevWeek: $("#prevWeek"),
      nextWeek: $("#nextWeek"),
      statCompletion: $("#statCompletion"),
      statCompleted: $("#statCompleted"),
      statStreak: $("#statStreak"),
      dayAdherence: $("#dayAdherence"),
      reportHeatmap: $("#reportHeatmap"),
      trendRangeSelect: $("#trendRangeSelect"),
      adherenceTrend: $("#adherenceTrend"),
      adherenceTrendEmpty: $("#adherenceTrendEmpty"),
      weeklyBreakdown: $("#weeklyBreakdown"),
      reportCategoryFilter: $("#reportCategoryFilter"),
      reportMenuBtn: $("#reportMenuBtn"),
      reportMenu: $("#reportMenu"),
      // progress
      weekLabelP: $("#weekLabelP"),
      prevWeekP: $("#prevWeekP"),
      nextWeekP: $("#nextWeekP"),
      measurementForm: $("#measurementForm"),
      mWeight: $("#mWeight"),
      mWaist: $("#mWaist"),
      mEnergy: $("#mEnergy"),
      mStrength: $("#mStrength"),
      mNotes: $("#mNotes"),
      mSaved: $("#mSaved"),
      clearMeasurementBtn: $("#clearMeasurementBtn"),
      pStartWeight: $("#pStartWeight"),
      pLatestWeight: $("#pLatestWeight"),
      pChange: $("#pChange"),
      pAvgWeekly: $("#pAvgWeekly"),
      pWaistChange: $("#pWaistChange"),
      pAvgEnergy: $("#pAvgEnergy"),
      trendChart: $("#trendChart"),
      trendEmpty: $("#trendEmpty"),
      trendRange: $("#trendRange"),
      trendMetric: $("#trendMetric"),
      measurementHistory: $("#measurementHistory"),
      customMetricFields: $("#customMetricFields"),
      addMetricBtn: $("#addMetricBtn"),
      unitsSelect: $("#unitsSelect"),
      mPhoto: $("#mPhoto"),
      mPhotoRemove: $("#mPhotoRemove"),
      // settings
      syncTokenInput: $("#syncTokenInput"),
      syncGistIdInput: $("#syncGistIdInput"),
      syncSaveBtn: $("#syncSaveBtn"),
      syncPushBtn: $("#syncPushBtn"),
      syncPullBtn: $("#syncPullBtn"),
      syncTestBtn: $("#syncTestBtn"),
      syncDeleteCloudBtn: $("#syncDeleteCloudBtn"),
      pairDeviceBtn: $("#pairDeviceBtn"),
      pairQrBtn: $("#pairQrBtn"),
      scanQrBtn: $("#scanQrBtn"),
      deviceNameInput: $("#deviceNameInput"),
      autoSyncToggle: $("#autoSyncToggle"),
      addCategoryBtn: $("#addCategoryBtn"),
      reminderDefault: $("#reminderDefault"),
      soundToggle: $("#soundToggle"),
      testReminderBtn: $("#testReminderBtn"),
      reminderHealthBtn: $("#reminderHealthBtn"),
      reminderHealth: $("#reminderHealth"),
      smartTimingBtn: $("#smartTimingBtn"),
      smartTiming: $("#smartTiming"),
      activityLogBtn: $("#activityLogBtn"),
      activityLog: $("#activityLog"),
      quietStart: $("#quietStart"),
      quietEnd: $("#quietEnd"),
      morningDigest: $("#morningDigest"),
      eveningNudge: $("#eveningNudge"),
      weeklyReport: $("#weeklyReport"),
      snoozeDuration: $("#snoozeDuration"),
      pushToggle: $("#pushToggle"),
      pushUrl: $("#pushUrl"),
      pushVapid: $("#pushVapid"),
      pushTestBtn: $("#pushTestBtn"),
      pushResetBtn: $("#pushResetBtn"),
      pushStatus: $("#pushStatus"),
      exportBackupBtn: $("#exportBackupBtn"),
      importBackupBtn: $("#importBackupBtn"),
      importBackupInput: $("#importBackupInput"),
      backupStatus: $("#backupStatus"),
      trashCard: $("#trashCard"),
      trashCount: $("#trashCount"),
      trashList: $("#trashList"),
      clearHistoryBtn: $("#clearHistoryBtn"),
      deletePhotosBtn: $("#deletePhotosBtn"),
      themeSelect: $("#themeSelect"),
      langSelect: $("#langSelect"),
      accentPicker: $("#accentPicker"),
      textSizeSelect: $("#textSizeSelect"),
      contrastToggle: $("#contrastToggle"),
      compactToggle: $("#compactToggle"),
      timeFormatSelect: $("#timeFormatSelect"),
      showDetailsToggle: $("#showDetailsToggle"),
      showTodayNotesToggle: $("#showTodayNotesToggle"),
      remindersToggle: $("#remindersToggle"),
      exportBtn: $("#exportBtn"),
      importBtn: $("#importBtn"),
      fileInput: $("#fileInput"),
      resetAllBtn: $("#resetAllBtn"),
      browseTemplatesBtn: $("#browseTemplatesBtn"),
      smartFillBtn: $("#smartFillBtn"),
      fillNotesBtn: $("#fillNotesBtn"),
      syncTimeBtn: $("#syncTimeBtn"),
      smartFillStatus: $("#smartFillStatus"),
      // template picker modal
      templateModal: $("#templateModal"),
      templateList: $("#templateList"),
      templateCount: $("#templateCount"),
      templateSelectAll: $("#templateSelectAll"),
      templateClearAll: $("#templateClearAll"),
      templateAddBtn: $("#templateAddBtn"),
      templateCancelBtn: $("#templateCancelBtn"),
      templateCloseBtn: $("#templateCloseBtn"),
    };
    return elsCache;
  }

  /* ================================================================
   * Views
   * ================================================================ */

  function switchView(view) {
    currentView = view;
    const els = getEls();
    els.navItems.forEach((n) => n.classList.toggle("active", n.dataset.tab === view));
    for (const [name, node] of Object.entries(els.pages)) {
      node.classList.toggle("active", name === view);
    }
    if (view === "today") { scrollToNowPending = true; renderToday(); }
    else if (view === "habits") renderHabits();
    else if (view === "progress") { progressOffset = 0; renderProgress(); }
    else if (view === "report") { weekOffset = 0; renderReport(); }
    else if (view === "schedule") renderSchedule();
    else if (view === "settings") hydrateSettings();
    closeSidebar();
  }

  function openSidebar() {
    getEls().sidebar.classList.add("open");
    getEls().sidebarBackdrop.classList.add("open");
  }
  function closeSidebar() {
    getEls().sidebar.classList.remove("open");
    getEls().sidebarBackdrop.classList.remove("open");
  }

  /* ---- Today ---- */
  // Day-part buckets. `test` receives minutes-of-day (0..1440) or null.
  const DAY_PARTS = [
    { id: "morning",   title: "🌅 Morning",   min: 0,        max: 12 * 60 - 1 },
    { id: "midday",    title: "🏙️ Midday",    min: 12 * 60,  max: 17 * 60 - 1 },
    { id: "evening",   title: "🌆 Evening",   min: 17 * 60,  max: 21 * 60 - 1 },
    { id: "night",     title: "🌙 Night",     min: 21 * 60,  max: 24 * 60 - 1 },
    { id: "anytime",   title: "🔁 All day / anytime", min: 24 * 60, max: Infinity },
  ];

  function dayPartForTime(timeStr) {
    const label = (timeStr || "").trim().toLowerCase();
    if (!label || label === "all day" || label === "anytime") return "anytime";
    const mins = parseTimeToMinutes(timeStr);
    if (mins === null || mins >= 24 * 60) return "anytime";
    for (const p of DAY_PARTS) {
      if (mins >= p.min && mins <= p.max) return p.id;
    }
    return "anytime";
  }
  function dayPartFor(habit, dayIdx) {
    return dayPartForTime(effectiveTime(habit, dayIdx == null ? new Date().getDay() : dayIdx));
  }
  // Day-part(s) a habit belongs to on Today. A multi-reminder habit (e.g. a
  // twice-a-day supplement at 8am & 8pm) shows in each distinct part so you get
  // prompted for every dose; single-time habits stay in exactly one part.
  function dayPartsForHabit(habit, dayIdx) {
    const times = (habit.reminderTimes && habit.reminderTimes.length) ? habit.reminderTimes : [];
    if (times.length >= 2) {
      const parts = [];
      for (const t of times) { const p = dayPartForTime(t); if (!parts.includes(p)) parts.push(p); }
      if (parts.length >= 2) return parts;
    }
    return [dayPartFor(habit, dayIdx)];
  }

  // A "times per day" habit (integer count, step 1, target 2-12) is shown as
  // one tickable row PER dose. Returns the dose slots, or null for normal habits.
  function doseSlots(habit, dayIdx) {
    if (habit.type !== "count") return null;
    const inc = habit.increment == null ? 1 : Number(habit.increment);
    const tgt = Number(habit.target);
    if (!Number.isInteger(tgt) || tgt < 2 || tgt > 12) return null;
    const times = (habit.reminderTimes && habit.reminderTimes.length)
      ? habit.reminderTimes.filter((t) => /^\d{2}:\d{2}$/.test(t)).slice().sort()
      : [];
    // Treat as per-dose ("N times a day") unless it's a *measurable* count.
    // A measurable count has a real unit (L, g, ml, steps…) AND doesn't line up
    // one-reminder-per-dose. Dose habits are step 1, or unit-less, or have a
    // reminder time for each dose — regardless of the step size.
    const unit = (habit.unit || "").trim().toLowerCase();
    const doseUnit = unit === "" || ["x", "×", "time", "times", "dose", "doses", "rep", "reps"].includes(unit);
    const eligible = inc === 1 || doseUnit || times.length === tgt;
    if (!eligible) return null;
    const slots = [];
    for (let i = 0; i < tgt; i++) {
      const time = i < times.length ? times[i] : null;
      const partId = time ? dayPartForTime(time) : dayPartFor(habit, dayIdx);
      slots.push({ i, total: tgt, time, partId });
    }
    return slots;
  }
  function popcount(n) { let c = 0; n = n | 0; while (n) { c += n & 1; n >>>= 1; } return c; }
  // Status of a single dose slot for the day: "done" | "skipped" | "pending".
  // Uses the independent per-dose bitmask when present; otherwise falls back to
  // the completion count (first N doses done) for older/other-device data.
  function doseStatus(habit, date, i) {
    if (isSkipped(habit, date)) return "skipped";
    const day = dateKey(date);
    const mask = state.doseTicks && state.doseTicks[day] ? state.doseTicks[day][habit.id] : undefined;
    const done = mask == null ? (completionValue(habit.id, date) > i) : (((mask >> i) & 1) === 1);
    if (done) return "done";
    // A dose can be explicitly marked "not done" (skipped) without done-ness.
    const skipMask = state.doseSkips && state.doseSkips[day] ? state.doseSkips[day][habit.id] : undefined;
    if (skipMask != null && ((skipMask >> i) & 1)) return "skipped";
    return "pending";
  }
  // Toggle one dose independently. Keeps the completion count = number of doses
  // done (popcount of the mask) so streaks/adherence keep working unchanged.
  function toggleDose(habit, date, i) {
    const day = dateKey(date);
    if (!state.doseTicks) state.doseTicks = {};
    if (!state.doseTicks[day]) state.doseTicks[day] = {};
    let mask = state.doseTicks[day][habit.id];
    if (mask == null) { // seed from any existing count (first-N doses)
      const cnt = completionValue(habit.id, date);
      mask = cnt > 0 ? (1 << Math.min(cnt, 12)) - 1 : 0;
    }
    mask ^= (1 << i);
    const turningOn = ((mask >> i) & 1) === 1;
    // Learn when this specific dose gets done (only when turning it ON today).
    if (turningOn && sameDay(date, new Date())) recordDoseClock(habit.id, i, date);
    if (turningOn) clearDoseSkip(habit.id, day, i); // done and not-done are mutually exclusive
    const cnt = popcount(mask);
    if (mask === 0) {
      delete state.doseTicks[day][habit.id];
      if (!Object.keys(state.doseTicks[day]).length) delete state.doseTicks[day];
    } else {
      state.doseTicks[day][habit.id] = mask;
    }
    setCompletionValue(habit.id, date, cnt); // syncs count + persists whole state
    return cnt;
  }
  function clearDoseSkip(habitId, day, i) {
    if (!state.doseSkips || !state.doseSkips[day] || state.doseSkips[day][habitId] == null) return;
    let sm = state.doseSkips[day][habitId] & ~(1 << i);
    if (sm === 0) {
      delete state.doseSkips[day][habitId];
      if (!Object.keys(state.doseSkips[day]).length) delete state.doseSkips[day];
    } else {
      state.doseSkips[day][habitId] = sm;
    }
  }
  // Mark a single dose "not done" (or clear that mark). Clears the done bit for
  // the same dose so the two states can't both be set.
  function toggleDoseSkip(habit, date, i) {
    const day = dateKey(date);
    if (!state.doseSkips) state.doseSkips = {};
    if (!state.doseSkips[day]) state.doseSkips[day] = {};
    const cur = state.doseSkips[day][habit.id] || 0;
    const willSkip = ((cur >> i) & 1) === 0;
    let sm = cur ^ (1 << i);
    if (willSkip) {
      // Clear this dose's done bit and resync the completion count.
      const tmask = (state.doseTicks && state.doseTicks[day]) ? state.doseTicks[day][habit.id] : undefined;
      if (tmask != null && ((tmask >> i) & 1)) {
        const nt = tmask & ~(1 << i);
        if (nt === 0) { delete state.doseTicks[day][habit.id]; if (!Object.keys(state.doseTicks[day]).length) delete state.doseTicks[day]; }
        else state.doseTicks[day][habit.id] = nt;
        setCompletionValue(habit.id, date, popcount(nt)); // persists whole state
      }
    }
    if (sm === 0) {
      delete state.doseSkips[day][habit.id];
      if (!Object.keys(state.doseSkips[day]).length) delete state.doseSkips[day];
    } else {
      state.doseSkips[day][habit.id] = sm;
    }
    if (typeof document !== "undefined") save();
    return willSkip;
  }
  // Mark every dose of a habit done (or clear) — used by "mark all".
  function setAllDoses(habit, date, done) {
    const slots = doseSlots(habit, date.getDay());
    if (!slots) { setCompletionValue(habit.id, date, done ? habit.target : 0); return; }
    const day = dateKey(date);
    if (!state.doseTicks) state.doseTicks = {};
    if (done) {
      if (!state.doseTicks[day]) state.doseTicks[day] = {};
      state.doseTicks[day][habit.id] = (1 << habit.target) - 1;
      setCompletionValue(habit.id, date, habit.target);
    } else {
      if (state.doseTicks[day]) delete state.doseTicks[day][habit.id];
      setCompletionValue(habit.id, date, 0);
    }
  }

  /* ---- Smart multi-dose helpers (pure + tested) ---- */
  // Warn when two dose reminders sit too close together (supplements/meds
  // usually want spacing). Returns a message, or "" when spacing is fine.
  // times: array of "HH:MM"; minGapMin: minimum comfortable gap in minutes.
  function doseSpacingWarning(times, minGapMin) {
    const gap = minGapMin == null ? 180 : minGapMin;
    const mins = (Array.isArray(times) ? times : [])
      .filter((t) => /^\d{2}:\d{2}$/.test(t))
      .map((t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; })
      .sort((a, b) => a - b);
    if (mins.length < 2) return "";
    let tightest = Infinity;
    for (let i = 1; i < mins.length; i++) tightest = Math.min(tightest, mins[i] - mins[i - 1]);
    if (tightest >= gap) return "";
    const hrs = Math.round((tightest / 60) * 10) / 10;
    const label = tightest < 60 ? `${tightest} min` : `${hrs} hr`;
    return `Two doses are only ${label} apart. Spacing them out (3+ hours) usually works better.`;
  }

  // Detect a "twice/N times a day" intent from a habit name, or from having
  // several reminder times on a yes/no habit. Returns {target} to switch it to
  // a per-dose count habit, or null. Pure so it can be unit-tested.
  function suggestCountSetup(name, reminderCount, currentType) {
    if (currentType === "count") return null; // already a count habit
    const s = " " + String(name || "").toLowerCase() + " ";
    const words = { once: 1, twice: 2, thrice: 3, two: 2, three: 3, four: 4, five: 5 };
    let target = null;
    let m = s.match(/\b(\d{1,2})\s*(?:x|×|times?|doses?)\s*(?:a|per|\/)\s*day\b/);
    if (m) target = +m[1];
    if (target == null) { m = s.match(/\b(twice|thrice|two|three|four|five)\s*(?:a|per)?\s*(?:times?\s*)?(?:a|per)\s*day\b/); if (m) target = words[m[1]]; }
    if (target == null && /\btwice\b/.test(s)) target = 2;
    if (target == null && /\bthrice\b/.test(s)) target = 3;
    if (target == null && /\b(\d{1,2})\s*(?:x|×)\/day\b/.test(s)) target = +s.match(/\b(\d{1,2})\s*(?:x|×)\/day\b/)[1];
    // Fall back to reminder count when the name gives no hint.
    if (target == null && Number(reminderCount) >= 2) target = Number(reminderCount);
    if (target == null || target < 2 || target > 12) return null;
    return { target };
  }

  // Progress for a per-dose habit today: how many of N doses are done and how
  // many remain. Returns null for non-dose habits.
  function doseProgress(habit, date) {
    const slots = doseSlots(habit, date.getDay());
    if (!slots) return null;
    let done = 0;
    for (const sl of slots) if (doseStatus(habit, date, sl.i) === "done") done++;
    return { done, total: slots.length, pending: slots.length - done, slots };
  }

  // A gentle catch-up message when an earlier dose is done but a later one is
  // still open and its time has passed. Returns "" when no nudge is due.
  // nowMin = minutes since midnight (injectable for tests).
  function doseNudgeMessage(habit, date, nowMin) {
    const prog = doseProgress(habit, date);
    if (!prog || prog.done === 0 || prog.pending === 0) return "";
    // Find the earliest still-open dose whose scheduled time has already passed.
    let overdue = null;
    for (const sl of prog.slots) {
      if (doseStatus(habit, date, sl.i) === "done") continue;
      if (!sl.time || !/^\d{2}:\d{2}$/.test(sl.time)) continue;
      const [h, m] = sl.time.split(":").map(Number);
      const t = h * 60 + m;
      if (t <= nowMin && (overdue == null || t < overdue.t)) overdue = { sl, t };
    }
    if (!overdue) return "";
    return `${habit.icon || "💊"} You've done ${prog.done} of ${prog.total} ${habit.name} doses today — dose ${overdue.sl.i + 1} is still open.`;
  }

  // Which day part is "now" (for the highlight).
  function currentDayPartId() {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    for (const p of DAY_PARTS) {
      if (p.id === "anytime") continue;
      if (mins >= p.min && mins <= p.max) return p.id;
    }
    return null;
  }

  // Sections whose "Completed" fold is expanded (persist within a session).
  const openCompletedFolds = new Set();

  // Short chip label: strip any trailing "· description" so the chip stays tidy.
  function timeChipLabel(time) {
    if (!time) return "";
    const t = time.trim();
    const lower = t.toLowerCase();
    if (lower === "all day" || lower === "anytime") return "";
    const dotIdx = t.indexOf("·");
    const c = (dotIdx >= 0 ? t.slice(0, dotIdx) : t).trim();
    // Reformat a leading clock time to the 12/24h preference; leave words as-is.
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(c);
    if (m) {
      let hh = parseInt(m[1], 10); const mm = parseInt(m[2], 10); const ap = (m[3] || "").toUpperCase();
      if (ap === "PM" && hh < 12) hh += 12;
      if (ap === "AM" && hh === 12) hh = 0;
      return formatClock(hh, mm);
    }
    return c;
  }

  // Sections whose fully-done state has been manually expanded this session.
  const reopenedDoneSections = new Set();
  // Set true when we want the NOW block scrolled into view after render.
  let scrollToNowPending = false;

  function greetingForHour(h) {
    if (h < 5) return "Late night";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Winding down";
  }

  // Night habits (bedtime, no-screens) always log against the previous day —
  // you review "last night" the next day. Kept as a helper for testing.
  function nightLogInfo(now) {
    return { isPrev: true, date: addDays(now, -1) };
  }
  // Splits habits into the night group (attributed to the right night) and the
  // regular "scheduled today" set. Pure — used by renderToday and tested.
  function splitNightHabits(habits, now) {
    const info = nightLogInfo(now);
    return {
      isPrev: info.isPrev,
      date: info.date,
      nightHabits: habits.filter((h) => !h.archived && h.nightPrevDay && isHabitActiveOn(h, info.date)),
      scheduled: habits.filter((h) => !h.archived && !h.nightPrevDay && isHabitActiveOn(h, now)),
    };
  }

  function renderToday() {
    const els = getEls();
    resetRenderCaches();
    els.todayGroups.innerHTML = "";
    const today = new Date();

    // Reset fasting-card placement: default it back to the top anchor. If an
    // "Intermittent fasting" habit is rendered below, the card is moved into
    // that row instead (see renderTodayItem).
    fastingCardPlacedThisRender = false;
    if (els.fastingCard) {
      // Hidden by default: the fasting tracker only shows embedded inside an
      // "Intermittent fasting" habit row (see renderTodayItem). If no such
      // habit is rendered today, the card stays hidden.
      els.fastingCard.classList.remove("embedded");
      els.fastingCard.classList.add("hidden");
      if (els.todayHint && els.todayHint.parentNode) {
        els.todayHint.parentNode.insertBefore(els.fastingCard, els.todayHint);
      }
    }

    // Greeting
    const hour = today.getHours();
    els.todayGreeting.textContent = greetingForHour(hour) + " 👋";

    // One-time usage hint (only if there are habits and not yet dismissed)
    const showHint = state.habits.length > 0 && localStorage.getItem(KEYS.hintSeen) !== "true";
    els.todayHint.hidden = !showHint;

    // Night habits (bedtime, no-screens) span midnight, so attribute them to
    // the night they belong to based on time of day (see splitNightHabits).
    const { isPrev: nightIsPrev, date: nightDate, nightHabits, scheduled } = splitNightHabits(state.habits, today);
    // Adherence reflects everything scheduled today, regardless of the filter.
    renderTodayAdherence(scheduled, today);

    // Greeting subtitle: how many left today
    const doneToday = scheduled.filter((h) => isCompleted(h, today)).length;
    const settledToday = scheduled.filter((h) => habitStatus(h, today) !== "pending").length;
    const leftToday = scheduled.length - settledToday;
    const dateStr = today.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    let leftMsg;
    if (scheduled.length === 0) {
      leftMsg = state.habits.length === 0 ? "Let's set up your first habit." : "Nothing scheduled today.";
    } else if (leftToday === 0) {
      leftMsg = "Everything's logged. Nice work. 🎉";
    } else {
      leftMsg = `${leftToday} habit${leftToday === 1 ? "" : "s"} left today`;
    }
    els.todayGreetingSub.textContent = `${dateStr} · ${leftMsg}`;

    renderVacationBanner();
    renderKeystone();
    renderReviewPrompt();
    renderMoodStrip();
    renderFasting();
    renderJournal(today);

    const active = todayCategoryFilter === "all"
      ? scheduled
      : scheduled.filter((h) => h.category === todayCategoryFilter);
    const nightActive = todayCategoryFilter === "all"
      ? nightHabits
      : nightHabits.filter((h) => h.category === todayCategoryFilter);

    if (state.habits.length === 0) {
      els.todayEmpty.classList.remove("hidden");
      els.todayEmpty.innerHTML = '<p>No habits yet. Head to the Habits tab and tap <b>+ Add habit</b> to get started.</p>';
      return;
    }
    if (active.length === 0 && nightActive.length === 0) {
      els.todayEmpty.classList.remove("hidden");
      els.todayEmpty.innerHTML = todayCategoryFilter === "all"
        ? '<p>Nothing scheduled for today. Enjoy the break.</p>'
        : `<p>No ${escapeHtml(todayCategoryFilter)} habits scheduled for today.</p>`;
      return;
    }
    els.todayEmpty.classList.add("hidden");

    // Night habits, attributed to the correct night (last night or tonight).
    renderLastNightGroup(nightActive, nightDate, els, nightIsPrev);

    // Bucket entries into day parts. An entry is a normal habit ({h,slot:null})
    // or one dose of a "times per day" habit ({h,slot:{i,time,…}}). Multi-time
    // habits therefore appear once per dose, each in its own part.
    const buckets = new Map(DAY_PARTS.map((p) => [p.id, []]));
    const todayIdx = today.getDay();
    for (const h of active) {
      const slots = doseSlots(h, todayIdx);
      if (slots) {
        for (const s of slots) (buckets.get(s.partId) || buckets.get("anytime")).push({ h, slot: s });
      } else {
        for (const pid of dayPartsForHabit(h, todayIdx)) (buckets.get(pid) || buckets.get("anytime")).push({ h, slot: null });
      }
    }
    const nowPart = currentDayPartId();

    const entryStatus = (e) => e.slot ? doseStatus(e.h, today, e.slot.i) : todayStatus(e.h, today);
    const entryTime = (e) => {
      if (e.slot && e.slot.time) return parseTimeToMinutes(e.slot.time) ?? 9999;
      return parseTimeToMinutes(effectiveTime(e.h, todayIdx)) ?? 9999;
    };

    for (const part of DAY_PARTS) {
      const list = buckets.get(part.id);
      if (!list || list.length === 0) continue;

      const byOrderTime = (a, b) => {
        const ta = entryTime(a), tb = entryTime(b);
        if (ta !== tb) return ta - tb;
        return (a.h.order ?? 0) - (b.h.order ?? 0);
      };
      const pending = list.filter((e) => entryStatus(e) === "pending").sort(byOrderTime);
      const settled = list.filter((e) => entryStatus(e) !== "pending").sort(byOrderTime);
      const doneCount = list.filter((e) => entryStatus(e) === "done").length;

      // Fully-settled block → collapse into a single strip unless reopened.
      if (pending.length === 0 && settled.length > 0 && !reopenedDoneSections.has(part.id)) {
        const strip = document.createElement("div");
        strip.className = "daypart-done-strip";
        strip.innerHTML = `<span>${escapeHtml(part.title)} · all done ✓</span><span class="strip-reopen">${settled.length} item${settled.length === 1 ? "" : "s"} · tap to show</span>`;
        strip.addEventListener("click", () => { reopenedDoneSections.add(part.id); renderToday(); });
        els.todayGroups.appendChild(strip);
        continue;
      }

      const wrap = document.createElement("div");
      wrap.className = "time-group";
      wrap.dataset.part = part.id;

      // Header with title, now-chip, mark-all, and progress count
      const heading = document.createElement("div");
      heading.className = "time-group-title" + (part.id === nowPart ? " is-now" : "");
      const left = document.createElement("span");
      left.textContent = part.title;
      const right = document.createElement("span");
      right.className = "group-right";
      if (part.id === nowPart) {
        const nowChip = document.createElement("span");
        nowChip.className = "now-chip";
        nowChip.textContent = "NOW";
        right.appendChild(nowChip);
      }
      if (pending.length > 0) {
        const markAll = document.createElement("button");
        markAll.className = "mark-all-btn";
        markAll.textContent = "✓ all";
        markAll.title = "Mark all pending in this block as done";
        markAll.addEventListener("click", (e) => {
          e.stopPropagation();
          const lastHabit = pending[pending.length - 1].h;
          const seen = new Set();
          for (const en of pending) { if (seen.has(en.h.id)) continue; seen.add(en.h.id); if (en.slot) setAllDoses(en.h, today, true); else setCompletionValue(en.h.id, today, en.h.target); }
          renderToday();
          showToast(`Marked ${seen.size} done.`, "success");
          if (lastHabit) maybeCelebrate(lastHabit, today);
        });
        right.appendChild(markAll);
      }
      const count = document.createElement("span");
      count.className = "time-group-count";
      count.textContent = `${doneCount}/${list.length} done`;
      right.appendChild(count);
      heading.appendChild(left);
      heading.appendChild(right);
      wrap.appendChild(heading);

      // Pending items (drag-reorderable — dose rows aren't reorderable)
      const ul = document.createElement("ul");
      ul.className = "habit-list";
      ul.dataset.part = part.id;
      for (const en of pending) ul.appendChild(en.slot ? renderDoseItem(en.h, today, en.slot) : renderTodayItem(en.h, today, part.id));
      enableReorder(ul, pending.filter((e) => !e.slot).map((e) => e.h), today);
      wrap.appendChild(ul);

      // Collapsible completed/skipped items
      if (settled.length > 0) {
        const foldKey = part.id;
        const isOpen = openCompletedFolds.has(foldKey);
        const fold = document.createElement("div");
        fold.className = "completed-fold";

        const toggle = document.createElement("button");
        toggle.className = "completed-toggle" + (isOpen ? " open" : "");
        toggle.innerHTML = `<span class="chevron">›</span> ${settled.length} completed`;
        toggle.addEventListener("click", () => {
          if (openCompletedFolds.has(foldKey)) openCompletedFolds.delete(foldKey);
          else openCompletedFolds.add(foldKey);
          renderToday();
        });
        fold.appendChild(toggle);

        if (isOpen) {
          const cul = document.createElement("ul");
          cul.className = "habit-list completed-list";
          for (const en of settled) cul.appendChild(en.slot ? renderDoseItem(en.h, today, en.slot) : renderTodayItem(en.h, today, part.id));
          fold.appendChild(cul);
        }
        wrap.appendChild(fold);
      }

      els.todayGroups.appendChild(wrap);
    }

    // Auto-scroll to the NOW block (only when the tab was just opened)
    if (scrollToNowPending) {
      scrollToNowPending = false;
      const nowEl = els.todayGroups.querySelector(`.time-group[data-part="${nowPart}"]`);
      if (nowEl) {
        setTimeout(() => nowEl.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      }
    }
  }

  const RING_CIRCUMFERENCE = 2 * Math.PI * 52; // r=52 in the SVG

  function setRing(total, done, notDone) {
    const ringDone = document.querySelector("#adherenceRing .ring-done");
    const ringNot = document.querySelector("#adherenceRing .ring-notdone");
    if (!ringDone || !ringNot) return;
    const C = RING_CIRCUMFERENCE;
    if (total === 0) {
      ringDone.style.strokeDasharray = `0 ${C}`;
      ringNot.style.strokeDasharray = `0 ${C}`;
      return;
    }
    const doneLen = (done / total) * C;
    const notLen = (notDone / total) * C;
    // Done segment starts at 0
    ringDone.style.strokeDasharray = `${doneLen} ${C - doneLen}`;
    ringDone.style.strokeDashoffset = "0";
    // Not-done segment follows the done segment
    ringNot.style.strokeDasharray = `${notLen} ${C - notLen}`;
    ringNot.style.strokeDashoffset = `${-doneLen}`;
  }

  function renderUpNext(active, today) {
    const el = getEls().adherenceUpNext;
    if (!el) return;
    const tIdx = today.getDay();
    const timeOf = (h) => parseTimeToMinutes(effectiveTime(h, tIdx));
    const nowMin = today.getHours() * 60 + today.getMinutes();

    const pending = active.filter((h) => todayStatus(h, today) === "pending");
    if (pending.length === 0) { el.hidden = true; el.innerHTML = ""; return; }

    const timed = pending.filter((h) => { const m = timeOf(h); return m !== null && m < 24 * 60; });
    const untimed = pending.filter((h) => { const m = timeOf(h); return m === null || m >= 24 * 60; });
    const overdue = timed.filter((h) => timeOf(h) < nowMin).sort((a, b) => timeOf(a) - timeOf(b));
    const upcoming = timed.filter((h) => timeOf(h) >= nowMin).sort((a, b) => timeOf(a) - timeOf(b));

    el.hidden = false;
    el.innerHTML = "";

    // ---- Up next: the soonest upcoming, else an untimed one, else earliest overdue.
    const next = upcoming[0] || untimed[0] || overdue[0];
    if (next) {
      const chip = timeChipLabel(effectiveTime(next, tIdx));
      const row = document.createElement("div");
      row.className = "upnext-row";
      row.innerHTML =
        `<span class="upnext-label">Up next</span>` +
        (chip ? `<span class="upnext-time">🕒 ${escapeHtml(chip)}</span>` : "") +
        `<span class="upnext-name">${escapeHtml(next.icon + " " + next.name)}</span>`;
      const remaining = pending.length - 1;
      if (remaining > 0) {
        const more = document.createElement("span");
        more.className = "upnext-more";
        more.textContent = `+${remaining} more today`;
        row.appendChild(more);
      }
      el.appendChild(row);
    }

    // ---- Missed: overdue pending habits. Tap a chip to mark it done.
    if (overdue.length) {
      const missed = document.createElement("div");
      missed.className = "missed-row";
      const label = document.createElement("span");
      label.className = "missed-label";
      label.textContent = `⚠ Missed so far (${overdue.length})`;
      missed.appendChild(label);
      const listWrap = document.createElement("div");
      listWrap.className = "missed-list";
      const cap = 6;
      for (const h of overdue.slice(0, cap)) {
        const chip = document.createElement("button");
        chip.className = "missed-chip";
        chip.type = "button";
        const t = timeChipLabel(effectiveTime(h, tIdx));
        chip.innerHTML = `${escapeHtml(h.icon + " " + h.name)}${t ? ` <span class="mc-time">${escapeHtml(t)}</span>` : ""}`;
        chip.title = "Tap to mark done";
        chip.addEventListener("click", () => {
          setCompletionWithUndo(h, today, h.target, `${h.name} marked done`);
        });
        listWrap.appendChild(chip);
      }
      if (overdue.length > cap) {
        const more = document.createElement("span");
        more.className = "missed-more";
        more.textContent = `+${overdue.length - cap} more`;
        listWrap.appendChild(more);
      }
      missed.appendChild(listWrap);
      el.appendChild(missed);
    }
  }

  // Renders the "Last night" group for night-prev-day habits, logged against
  // the given date (yesterday). Uses renderTodayItem so all toggles/swipes work.
  function renderLastNightGroup(list, date, els, isPrev) {
    if (!list || list.length === 0) return;
    const dIdx = date.getDay();
    const byOrderTime = (a, b) => {
      const ta = parseTimeToMinutes(effectiveTime(a, dIdx)) ?? 9999;
      const tb = parseTimeToMinutes(effectiveTime(b, dIdx)) ?? 9999;
      if (ta !== tb) return ta - tb;
      return (a.order ?? 0) - (b.order ?? 0);
    };
    const sorted = list.slice().sort(byOrderTime);
    const pending = sorted.filter((h) => habitStatus(h, date) === "pending");
    const doneCount = sorted.filter((h) => isCompleted(h, date)).length;
    const label = `${isPrev ? "🌙 Last night" : "🌙 Tonight"} · ${date.toLocaleDateString(undefined, { weekday: "long" })}`;
    const foldKey = "__lastnight";

    // Fully logged → collapse into a strip (tap to expand), like the day parts.
    if (pending.length === 0 && sorted.length > 0 && !reopenedDoneSections.has(foldKey)) {
      const strip = document.createElement("div");
      strip.className = "daypart-done-strip";
      strip.innerHTML = `<span>${escapeHtml(label)} · all done ✓</span><span class="strip-reopen">${sorted.length} item${sorted.length === 1 ? "" : "s"} · tap to show</span>`;
      strip.addEventListener("click", () => { reopenedDoneSections.add(foldKey); renderToday(); });
      els.todayGroups.appendChild(strip);
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "time-group last-night-group";

    const heading = document.createElement("div");
    heading.className = "time-group-title";
    const left = document.createElement("span");
    left.textContent = label;
    const right = document.createElement("span");
    right.className = "group-right";
    if (pending.length > 0) {
      const markAll = document.createElement("button");
      markAll.className = "mark-all-btn";
      markAll.textContent = "✓ all";
      markAll.title = isPrev ? "Log all as done for last night" : "Log all as done for tonight";
      markAll.addEventListener("click", (e) => {
        e.stopPropagation();
        for (const h of pending) setCompletionValue(h.id, date, h.target);
        renderToday();
        showToast(`Logged ${pending.length} night habit${pending.length === 1 ? "" : "s"}.`, "success");
      });
      right.appendChild(markAll);
    }
    const count = document.createElement("span");
    count.className = "time-group-count";
    count.textContent = `${doneCount}/${sorted.length} done`;
    right.appendChild(count);
    heading.appendChild(left);
    heading.appendChild(right);

    // When fully logged, the header toggles the group closed again (tap to hide).
    const allDone = pending.length === 0 && sorted.length > 0;
    if (allDone) {
      heading.classList.add("fold-toggle");
      heading.style.cursor = "pointer";
      heading.title = "Tap to collapse";
      const caret = document.createElement("span");
      caret.className = "fold-caret";
      caret.textContent = "▾";
      left.appendChild(caret);
      heading.addEventListener("click", () => { reopenedDoneSections.delete(foldKey); renderToday(); });
    }
    wrap.appendChild(heading);

    const ul = document.createElement("ul");
    ul.className = "habit-list";
    for (const habit of sorted) ul.appendChild(renderTodayItem(habit, date));
    wrap.appendChild(ul);

    els.todayGroups.appendChild(wrap);
  }

  // Average completion rate for this weekday over the last ~8 occurrences —
  // the baseline the coach line compares "today" against.
  function weekdayAvgAdherence(today) {
    let sum = 0, n = 0;
    for (let w = 1; w <= 8; w++) {
      const d = addDays(today, -7 * w);
      const sched = state.habits.filter((h) => !h.archived && !h.nightPrevDay && isHabitActiveOn(h, d));
      if (!sched.length) continue;
      const done = sched.filter((h) => isCompleted(h, d)).length;
      sum += done / sched.length; n++;
    }
    return n ? Math.round((sum / n) * 100) : null;
  }
  function dayNameOf(d) { return d.toLocaleDateString(undefined, { weekday: "long" }); }

  // A short "will today's streaks survive?" read for the Today card. Looks at
  // habits with a live streak (>=3) that are still pending and how much day is
  // left. Returns {level:"safe"|"watch"|"risk", text} or null when nothing's
  // riding on today. Pure-ish (reads state), injectable "now" for tests.
  function momentumForecast(active, today) {
    const now = today || new Date();
    const hour = now.getHours();
    const streaked = active.filter((h) => currentStreak(h) >= 3);
    if (streaked.length === 0) return null;
    const pending = streaked.filter((h) => habitStatus(h, now) === "pending");
    if (pending.length === 0) {
      return { level: "safe", text: `🛡️ All ${streaked.length} of your active streaks are safe for today.` };
    }
    const top = pending.slice().sort((a, b) => currentStreak(b) - currentStreak(a))[0];
    const s = currentStreak(top);
    const late = hour >= 20;
    if (late || pending.length >= 3) {
      return { level: "risk", text: `⏳ ${pending.length} streak${pending.length === 1 ? "" : "s"} still riding on today${late ? " and it's getting late" : ""} — biggest is ${top.icon || "•"} ${top.name} (${s} days).` };
    }
    return { level: "watch", text: `👀 ${pending.length} streak${pending.length === 1 ? "" : "s"} to protect today, incl. your ${s}-day ${top.name}. Plenty of day left.` };
  }

  // A personalized, data-driven "coach" line for the Today card. Picks the
  // single most relevant signal (streak at risk, pace vs your usual weekday,
  // time of day, momentum) instead of a static count.
  function aiTodayInsight(active, today, done, pending, skipped, pct) {
    const hour = today.getHours();
    const total = active.length;
    const partOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    let bestStreak = 0;
    const atRisk = [];
    for (const h of active) {
      const s = currentStreak(h);
      if (s > bestStreak) bestStreak = s;
      if (!isCompleted(h, today) && isStreakAtRisk(h, today)) atRisk.push(h);
    }
    const dow = weekdayAvgAdherence(today);

    if (pending === 0 && skipped === 0) {
      if (bestStreak >= 7) return `🔥 Perfect day — with a ${bestStreak}-day streak riding on it. This is what consistency looks like.`;
      if (dow != null && pct >= dow) return `✅ All ${total} done — above your usual ${dow}% for a ${dayNameOf(today)}. Strong finish.`;
      return `✅ Clean sweep — all ${total} logged. Enjoy the rest of your day.`;
    }
    if (pending === 0) return `Everything's settled for today. ${skipped} skipped — no guilt, tomorrow's a fresh slate.`;

    if (atRisk.length) {
      const h = atRisk.slice().sort((a, b) => currentStreak(b) - currentStreak(a))[0];
      const s = currentStreak(h);
      if (s >= 2) return `⚠️ Your ${s}-day "${h.name}" streak is on the line today. Knock it out before the day gets away.`;
    }

    // Skip-risk: this weekday is historically weak for a still-pending habit.
    if (hour >= 11 && pending > 0) {
      const risky = skipRiskHabits(today);
      if (risky.length) {
        const r = risky[0];
        return `🎯 ${dayNameOf(today)}s are tough for ${r.habit.icon || "•"} ${r.habit.name} (${Math.round(r.rate * 100)}% usually). Beat the pattern — do it now while you're thinking of it.`;
      }
    }

    if (done === 0) {
      if (hour >= 18) return `🌙 Day's winding down and nothing's logged yet. Pick the one that matters most and start there.`;
      if (hour >= 12) return `Half the day's gone, ${total} still waiting. Momentum beats motivation — start with the easiest.`;
      return `🌅 Fresh ${partOfDay}, clean slate. ${total} on the list — your first win sets the tone.`;
    }

    if (dow != null) {
      if (pct >= dow + 5) return `📈 ${done}/${total} done — ahead of your typical ${dayNameOf(today)} (${dow}%). Keep rolling.`;
      if (pct >= dow - 15) return `${done}/${total} done, tracking right with your usual ${dayNameOf(today)}. ${pending} to go.`;
      return `${done}/${total} so far — a touch behind your ${dayNameOf(today)} average (${dow}%). One quick win closes the gap.`;
    }

    if (pct >= 67) return `💪 ${done}/${total} — you're in the home stretch. ${pending} left.`;
    if (pct >= 34) return `Good rhythm — ${done} down, ${pending} to go.`;
    return `${done} done, ${pending} to go. One at a time.`;
  }

  function renderTodayAdherence(active, today) {
    const els = getEls();
    if (!active || active.length === 0) {
      els.adherencePct.textContent = "—";
      setRing(0, 0, 0);
      els.adherenceText.textContent = state.habits.length === 0
        ? "No habits yet — add one to start tracking."
        : "Nothing scheduled today.";
      $("#adherenceLegend").innerHTML = "";
      els.adherenceUpNext.hidden = true;
      return;
    }
    const done = active.filter((h) => isCompleted(h, today)).length;
    const skipped = active.filter((h) => isSkipped(h, today)).length;
    const pending = active.length - done - skipped;
    const pct = Math.round((done / active.length) * 100);
    els.adherencePct.textContent = pct + "%";
    setRing(active.length, done, skipped);
    const insight = aiTodayInsight(active, today, done, pending, skipped, pct);
    els.adherenceText.innerHTML = `<span class="ai-spark">✨</span> <span class="ai-coach-text">${escapeHtml(insight)}</span>`;
    renderUpNext(active, today);
    $("#adherenceLegend").innerHTML =
      `<span class="leg"><span class="leg-num">${done}</span>Done</span>` +
      `<span class="leg"><span class="leg-num">${pending}</span>Pending</span>` +
      `<span class="leg"><span class="leg-num">${skipped}</span>Not done</span>`;
  }

  // Compact, tap-to-expand note line for the Today view (opt-in via setting).
  function buildTodayNoteLine(habit) {
    if (localStorage.getItem(KEYS.showTodayNotes) !== "true") return null;
    const note = (habit.notes || "").trim();
    if (!note) return null;
    const el = document.createElement("div");
    el.className = "today-note clamp";
    el.textContent = note;
    el.title = "Tap to expand";
    el.addEventListener("click", (e) => { e.stopPropagation(); el.classList.toggle("clamp"); });
    return el;
  }

  // A single dose row for a "times per day" habit (e.g. dose 2 of 2 at 8:00 PM).
  // Ticking fills this dose (and earlier ones); un-ticking clears it and later.
  function renderDoseItem(habit, date, slot) {
    const li = document.createElement("li");
    li.className = "habit-item dose-item";
    const st = doseStatus(habit, date, slot.i);
    const done = st === "done";
    if (done) li.classList.add("done");
    if (st === "skipped") li.classList.add("not-done");
    li.dataset.habitId = habit.id;

    const icon = document.createElement("div");
    icon.className = "habit-icon";
    icon.style.background = habit.color;
    icon.textContent = habit.icon;

    const info = document.createElement("div");
    info.className = "habit-info";
    const name = document.createElement("div");
    name.className = "habit-name";
    name.textContent = habit.name;
    info.appendChild(name);
    const meta = document.createElement("div");
    meta.className = "habit-meta";
    if (slot.time) {
      const t = document.createElement("span");
      t.className = "time-chip";
      t.textContent = fmtClockLabel(slot.time);
      meta.appendChild(t);
    }
    const dchip = document.createElement("span");
    dchip.className = "dose-chip";
    dchip.textContent = `dose ${slot.i + 1} of ${slot.total}`;
    meta.appendChild(dchip);
    info.appendChild(meta);
    const dNote = buildTodayNoteLine(habit);
    if (dNote) info.appendChild(dNote);
    info.addEventListener("click", () => openHabitDetail(habit));

    const controls = document.createElement("div");
    controls.className = "count-controls";

    // "Not done" toggle for this dose — parity with regular habit rows, without
    // affecting the habit's other doses.
    const skipBtn = document.createElement("button");
    const skipped = st === "skipped";
    skipBtn.className = "stepper-btn minus" + (skipped ? " active" : "");
    skipBtn.textContent = "✕";
    skipBtn.setAttribute("aria-label", (skipped ? "Clear not-done for " : "Mark not done ") + habit.name + " dose " + (slot.i + 1));
    skipBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDoseSkip(habit, date, slot.i);
      renderToday();
    });
    controls.appendChild(skipBtn);

    const btn = document.createElement("button");
    btn.className = "stepper-btn plus" + (done ? " done" : "");
    btn.setAttribute("aria-label", (done ? "Undo " : "Mark done ") + habit.name + " dose " + (slot.i + 1));
    if (done) {
      btn.style.background = habit.color; btn.style.borderColor = habit.color; btn.style.color = "#fff";
      btn.textContent = "✓";
    } else {
      btn.textContent = "+";
    }
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const wasDone = isCompleted(habit, date);
      const cnt = toggleDose(habit, date, slot.i); // independent per-dose toggle
      renderToday();
      if (!wasDone && cnt >= habit.target) maybeCelebrate(habit, date);
    });
    controls.appendChild(btn);

    li.appendChild(icon);
    li.appendChild(info);
    li.appendChild(controls);
    return li;
  }

  function renderTodayItem(habit, date, partId) {
    const li = document.createElement("li");
    li.className = "habit-item";
    // Row/grouping status is weekly-aware; the +/- buttons act on today only.
    const status = todayStatus(habit, date); // "done" | "skipped" | "pending"
    const dayDone = isCompleted(habit, date);
    const daySkipped = isSkipped(habit, date);
    if (status === "done") li.classList.add("done");
    if (status === "skipped") li.classList.add("not-done");
    const atRisk = isStreakAtRisk(habit, date);
    if (atRisk) li.classList.add("at-risk");
    attachSwipe(li, habit, date, status);
    li.dataset.habitId = habit.id;

    // Drag handle (reorder within a block) — only for pending items
    if (status === "pending") {
      const handle = document.createElement("span");
      handle.className = "drag-handle";
      handle.textContent = "⠿";
      handle.setAttribute("draggable", "true");
      handle.setAttribute("aria-label", "Drag to reorder");
      li._dragHandle = handle;
      li.appendChild(handle);
    }

    const icon = document.createElement("div");
    icon.className = "habit-icon";
    icon.style.background = habit.color;
    icon.textContent = habit.icon;

    const info = document.createElement("div");
    info.className = "habit-info";
    const name = document.createElement("div");
    name.className = "habit-name";
    name.textContent = habit.name;
    info.appendChild(name);

    // Compact meta line: just time + the single most useful signal.
    const streak = currentStreak(habit);
    const meta = document.createElement("div");
    meta.className = "habit-meta";
    // For a multi-reminder habit shown in a specific day-part, display that
    // part's dose time (e.g. 8:00 PM in the Evening group) instead of the base.
    let chipTime = effectiveTime(habit, date.getDay());
    if (partId && habit.reminderTimes && habit.reminderTimes.length >= 2) {
      const inPart = habit.reminderTimes.filter((t) => dayPartForTime(t) === partId);
      if (inPart.length) chipTime = fmtClockLabel(inPart[0]);
    }
    const timeChip = timeChipLabel(chipTime);
    if (timeChip) {
      const timeEl = document.createElement("span");
      timeEl.className = "time-chip";
      timeEl.textContent = timeChip + ((habit.dayTimes && habit.dayTimes[date.getDay()]) ? " ✎" : "");
      meta.appendChild(timeEl);
    }
    if (isWeekly(habit)) {
      const wd = weeklyDoneCount(habit, date);
      const wt = weeklyTarget(habit);
      const wc = document.createElement("span");
      wc.className = "weekly-chip" + (wd >= wt ? " on-pace" : "");
      wc.textContent = `${Math.min(wd, wt)}/${wt} this week`;
      meta.appendChild(wc);
    }
    if (habit.quit && streak > 0) {
      const s = document.createElement("span");
      s.className = "clean-flag";
      s.textContent = `🟢 ${streak} day${streak === 1 ? "" : "s"} clean`;
      meta.appendChild(s);
    } else if (atRisk) {
      const risk = document.createElement("span");
      risk.className = "risk-flag";
      risk.textContent = "⚠ streak";
      meta.appendChild(risk);
    } else if (status === "done" && streak > 0) {
      const s = document.createElement("span");
      s.textContent = `🔥 ${streak}`;
      meta.appendChild(s);
    } else if (status === "skipped") {
      const s = document.createElement("span");
      s.className = "meta-muted";
      s.textContent = "Not done today";
      meta.appendChild(s);
    }
    info.appendChild(meta);
    const noteLine = buildTodayNoteLine(habit);
    if (noteLine) info.appendChild(noteLine);

    // Expandable detail panel (hidden until the row is tapped, unless "Show details" is on)
    const showDetails = localStorage.getItem(KEYS.showDetails) === "true";
    const detail = document.createElement("div");
    detail.className = "habit-detail" + (showDetails ? "" : " hidden");
    const chips = document.createElement("div");
    chips.className = "detail-chips";
    const catBadge = document.createElement("span");
    catBadge.className = "category-badge";
    const cm = categoryMeta(habit.category);
    catBadge.textContent = `${cm.icon} ${habit.category}`;
    catBadge.style.borderColor = cm.color;
    catBadge.style.color = cm.color;
    chips.appendChild(catBadge);
    if (habit.anchorId) {
      const anchor = state.habits.find((h) => h.id === habit.anchorId);
      if (anchor) {
        const chain = document.createElement("span");
        chain.className = "detail-chip";
        chain.textContent = `⛓️ after ${anchor.icon || ""} ${anchor.name}`.trim();
        chips.appendChild(chain);
      }
    }
    if (streak > 0) {
      const st = document.createElement("span");
      st.className = "detail-chip";
      st.textContent = `🔥 ${streak} day${streak === 1 ? "" : "s"}`;
      chips.appendChild(st);
    }
    if (habit.days && habit.days.length > 0 && habit.days.length < 7) {
      const wp = weeklyProgress(habit);
      if (wp.weekTotal > 0) {
        const wt = document.createElement("span");
        wt.className = "weekly-target" + (wp.done >= wp.weekTotal ? " on-pace" : "");
        wt.textContent = `${wp.done}/${wp.weekTotal} this week`;
        chips.appendChild(wt);
      }
    }
    detail.appendChild(chips);
    if (habit.notes) {
      const notes = document.createElement("div");
      notes.className = "habit-notes";
      notes.textContent = habit.notes;
      detail.appendChild(notes);
    }
    const spark = document.createElement("div");
    spark.className = "habit-spark";
    spark.title = "Last 7 days";
    for (const s of last7Days(habit)) {
      const cell = document.createElement("span");
      cell.className = "sp " + s;
      if (s === "done") cell.style.background = habit.color;
      spark.appendChild(cell);
    }
    detail.appendChild(spark);
    const editLink = document.createElement("button");
    editLink.className = "detail-edit";
    editLink.textContent = "Edit habit ›";
    editLink.addEventListener("click", (e) => { e.stopPropagation(); openHabitModal(habit); });
    detail.appendChild(editLink);
    info.appendChild(detail);

    // Tap the info area to expand/collapse detail
    info.addEventListener("click", () => detail.classList.toggle("hidden"));

    li.appendChild(icon);
    li.appendChild(info);

    const controls = document.createElement("div");
    controls.className = "count-controls";

    if (habit.type === "count") {
      // Measurable habit: tap to add/subtract the increment toward the target.
      const cur = completionValue(habit.id, date);
      const shown = cur < 0 ? 0 : cur;
      const inc = habit.increment > 0 ? habit.increment : 1;

      const minus = document.createElement("button");
      minus.className = "stepper-btn minus";
      minus.setAttribute("aria-label", `Subtract from ${habit.name}`);
      minus.textContent = daySkipped ? "✕" : "−";
      if (daySkipped) minus.classList.add("active");
      else if (shown <= 0) minus.classList.add("muted");
      minus.addEventListener("click", (e) => {
        e.stopPropagation();
        if (daySkipped) { setCompletionValue(habit.id, date, 0); renderToday(); return; }
        if (shown <= 0) { setCompletionWithUndo(habit, date, SKIPPED, `${habit.name} marked not done`); return; }
        const next = Math.max(0, Math.round((shown - inc) * 100) / 100);
        setCompletionValue(habit.id, date, next);
        renderToday();
      });
      controls.appendChild(minus);

      const val = document.createElement("div");
      val.className = "count-value" + (dayDone ? " done" : "");
      if (dayDone) val.style.color = habit.color;
      val.innerHTML = `<span class="cv-now">${escapeHtml(fmtValue(habit, shown))}</span><span class="cv-target">/ ${escapeHtml(fmtValue(habit, habit.target))}</span>`;
      controls.appendChild(val);

      const plus = document.createElement("button");
      plus.className = "stepper-btn plus";
      plus.setAttribute("aria-label", `Add to ${habit.name}`);
      plus.textContent = "+";
      plus.addEventListener("click", (e) => {
        e.stopPropagation();
        const base = shown < 0 ? 0 : shown;
        const next = Math.round((base + inc) * 100) / 100;
        const wasDone = base >= habit.target;
        setCompletionValue(habit.id, date, next);
        renderToday();
        if (!wasDone && next >= habit.target) maybeCelebrate(habit, date);
      });
      controls.appendChild(plus);

      li.appendChild(controls);
      // Fasting card still embeds below (handled after this block).
    } else {
    // Unified minus / plus controls with tri-state:
    //   '+' toggles between done and pending
    //   '−' toggles between skipped and pending
    const minus = document.createElement("button");
    minus.className = "stepper-btn minus";
    minus.setAttribute("aria-label", `Mark ${habit.name} not done`);
    if (daySkipped) {
      minus.classList.add("active");
      minus.textContent = "✕";
    } else {
      minus.textContent = "−";
      if (!dayDone) minus.classList.add("muted");
    }
    minus.addEventListener("click", (e) => {
      e.stopPropagation();
      if (daySkipped) {
        setCompletionValue(habit.id, date, 0);
        renderToday();
      } else {
        setCompletionWithUndo(habit, date, SKIPPED, `${habit.name} marked not done`);
      }
    });
    controls.appendChild(minus);

    const plus = document.createElement("button");
    plus.className = "stepper-btn plus";
    plus.setAttribute("aria-label", `Mark ${habit.name} done`);
    if (dayDone) {
      plus.classList.add("done");
      plus.style.background = habit.color;
      plus.style.borderColor = habit.color;
      plus.style.color = "#fff";
      plus.textContent = "✓";
    } else {
      plus.textContent = "+";
    }
    plus.addEventListener("click", (e) => {
      e.stopPropagation();
      if (dayDone) {
        setCompletionValue(habit.id, date, 0);
        renderToday();
      } else {
        setCompletionWithUndo(habit, date, habit.target, `${habit.name} marked done`);
        maybeCelebrate(habit, date);
      }
    });
    controls.appendChild(plus);

    li.appendChild(controls);
    }

    // Embed the fasting tracker inline within the intermittent-fasting habit.
    if (isFastingHabit(habit) && !fastingCardPlacedThisRender) {
      const e = getEls();
      if (e.fastingCard) {
        fastingCardPlacedThisRender = true;
        e.fastingCard.classList.remove("hidden");
        e.fastingCard.classList.add("embedded");
        li.classList.add("has-fasting");
        li.appendChild(e.fastingCard);
        renderFasting();
      }
    }
    return li;
  }

  /* ---- Confetti + haptic celebration ---- */
  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function celebrate(big) {
    if (navigator.vibrate) navigator.vibrate(big ? [30, 40, 30] : 20);
    if (prefersReducedMotion()) return; // respect the OS "reduce motion" setting
    const layer = $("#confetti");
    if (!layer) return;
    const colors = ["#6366f1", "#14b8a6", "#22c55e", "#3b82f6", "#ec4899", "#f59e0b"];
    const count = big ? 90 : 36;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "confetti-piece";
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = (1.6 + Math.random() * 1.4) + "s";
      p.style.animationDelay = (Math.random() * 0.3) + "s";
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      layer.appendChild(p);
      setTimeout(() => p.remove(), 3600);
    }
  }

  // Detect if a state change just completed a whole day-part block or the day,
  // and celebrate. Call after a completion change and re-render.
  // Habit stacking: when an anchor habit is completed, surface the habits
  // stacked onto it that are still pending today as a "next cue".
  function fireStackCues(habit, date) {
    if (!sameDay(date, new Date())) return;
    const stacked = state.habits.filter((h) =>
      !h.archived && h.anchorId === habit.id &&
      isHabitActiveOn(h, date) && !isCompleted(h, date) && !isSkipped(h, date));
    if (stacked.length === 0) return;
    const names = stacked.map((h) => `${h.icon || "•"} ${h.name}`).join(", ");
    showToast(`Next: ${names}`, "info");
    if (navigator.vibrate) { try { navigator.vibrate(20); } catch (e) {} }
    // Also fire an OS notification when reminders are on (helps when it lands
    // on the lock screen right after you check the anchor off).
    try {
      if (remindersEnabled() && "Notification" in window && Notification.permission === "granted") {
        const first = stacked[0];
        notify(`${first.icon || "⛓️"} Next: ${first.name}`, {
          body: `You just did ${habit.name} — ${stacked.length > 1 ? `${stacked.length} habits stacked next` : first.name} is your cue.`,
          ids: stacked.map((h) => h.id),
          tag: "ht-stack",
        });
      }
    } catch (e) {}
  }

  function maybeCelebrate(habit, date) {
    const today = new Date();
    if (!sameDay(date, today)) return;
    recordCompletionClock(habit.id, date);
    checkStreakMilestone(habit);
    checkAchievements();
    fireStackCues(habit, date);
    const scheduled = state.habits.filter((h) => isHabitActiveOn(h, today));
    if (scheduled.length === 0) return;
    const allDone = scheduled.every((h) => isCompleted(h, today));
    if (allDone) { celebrate(true); showToast("All habits done today! 🎉", "success"); return; }
    // Block-level: the block this habit belongs to
    const partId = dayPartFor(habit);
    const block = scheduled.filter((h) => dayPartFor(h) === partId);
    const blockPendingBefore = block.some((h) => habitStatus(h, today) === "pending");
    if (!blockPendingBefore && block.length > 1) celebrate(false);
  }

  // Celebrate streak milestones once each (7, 30, 60, 100, 200, 365 days).
  const STREAK_MILESTONES = [7, 30, 60, 100, 200, 365];
  function checkStreakMilestone(habit) {
    if (!habit) return;
    const streak = currentStreak(habit);
    if (streak < STREAK_MILESTONES[0]) return;
    const milestone = STREAK_MILESTONES.filter((m) => m <= streak).pop();
    if (!milestone) return;
    const key = "ht_milestone_" + habit.id;
    if (Number(localStorage.getItem(key) || 0) >= milestone) return; // already celebrated
    localStorage.setItem(key, String(milestone));
    celebrate(true);
    showToast(`🔥 ${milestone}-day streak: ${habit.name}!`, "success");
  }

  /* ---- Drag reorder within a block ---- */
  let dragState = null;
  function enableReorder(ul, list, date) {
    ul.querySelectorAll(".habit-item").forEach((li) => {
      const handle = li._dragHandle;
      if (!handle) return;
      handle.addEventListener("dragstart", (e) => {
        dragState = { ul, id: li.dataset.habitId };
        li.classList.add("dragging");
        try { e.dataTransfer.setData("text/plain", li.dataset.habitId); e.dataTransfer.effectAllowed = "move"; } catch (_) {}
      });
      handle.addEventListener("dragend", () => {
        li.classList.remove("dragging");
        ul.querySelectorAll(".drag-over").forEach((x) => x.classList.remove("drag-over"));
        dragState = null;
      });
      li.addEventListener("dragover", (e) => {
        if (!dragState || dragState.ul !== ul) return;
        e.preventDefault();
        li.classList.add("drag-over");
      });
      li.addEventListener("dragleave", () => li.classList.remove("drag-over"));
      li.addEventListener("drop", (e) => {
        e.preventDefault();
        li.classList.remove("drag-over");
        if (!dragState || dragState.ul !== ul) return;
        const fromId = dragState.id;
        const toId = li.dataset.habitId;
        if (fromId === toId) return;
        reorderWithinBlock(list, fromId, toId);
      });
    });
  }

  function reorderWithinBlock(list, fromId, toId) {
    const ids = list.map((h) => h.id);
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const reordered = [...list];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    // Reassign order values across this block using their current min as base
    const base = Math.min(...list.map((h) => h.order ?? 0));
    reordered.forEach((h, i) => {
      const habit = state.habits.find((x) => x.id === h.id);
      if (habit) habit.order = base + i;
    });
    save();
    renderToday();
  }

  // Swipe right = done, swipe left = not done.
  function attachSwipe(li, habit, date, status) {
    let startX = 0, startY = 0, tracking = false;
    li.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });
    li.addEventListener("touchend", (e) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return; // not a horizontal swipe
      if (dx > 0) {
        // swipe right → done
        if (status !== "done") { setCompletionWithUndo(habit, date, habit.target, `${habit.name} marked done`); maybeCelebrate(habit, date); }
      } else {
        // swipe left → not done
        if (status !== "skipped") setCompletionWithUndo(habit, date, SKIPPED, `${habit.name} marked not done`);
      }
    }, { passive: true });
  }

  /* ---- Day journal ---- */
  let journalSaveTimer = null;
  function renderJournal(date) {
    const els = getEls();
    const key = dateKey(date);
    const entry = state.journal[key];
    els.journalText.value = entry ? entry.text : "";
    els.journalSaved.hidden = true;
  }
  function onJournalInput() {
    const els = getEls();
    const key = todayKey();
    const text = els.journalText.value;
    if (journalSaveTimer) clearTimeout(journalSaveTimer);
    journalSaveTimer = setTimeout(() => {
      if (text.trim()) state.journal[key] = { text: text.slice(0, 2000), updatedAt: Date.now() };
      else delete state.journal[key];
      save();
      els.journalSaved.hidden = false;
      setTimeout(() => (els.journalSaved.hidden = true), 1200);
    }, 500);
  }

  /* ---- Copy yesterday ---- */
  function copyYesterday() {
    const today = new Date();
    const yKey = dateKey(addDays(today, -1));
    const tKey = todayKey();
    const yVals = state.completions[yKey];
    if (!yVals || Object.keys(yVals).length === 0) {
      showToast("Nothing logged yesterday to copy.");
      return;
    }
    const scheduledIds = new Set(state.habits.filter((h) => isHabitActiveOn(h, today)).map((h) => h.id));
    let copied = 0;
    const target = { ...(state.completions[tKey] || {}) };
    for (const [hid, val] of Object.entries(yVals)) {
      if (scheduledIds.has(hid) && !(hid in target)) {
        target[hid] = val;
        copied++;
      }
    }
    if (copied === 0) { showToast("Nothing new to copy — today's already logged."); return; }
    state.completions[tKey] = target;
    state.completionsUpdatedAt[tKey] = Date.now();
    save();
    renderToday();
    showToast(`Copied ${copied} from yesterday.`, "success");
  }

  // Clear all of today's check-ins (done + not-done) back to pending.
  function resetToday() {
    const tKey = todayKey();
    if (!state.completions[tKey] || Object.keys(state.completions[tKey]).length === 0) {
      showToast("Nothing logged today yet.");
      return;
    }
    const n = Object.keys(state.completions[tKey]).length;
    if (!confirm(`Reset ${n} check-in${n === 1 ? "" : "s"} for today back to pending?`)) return;
    // Represent the reset as an explicit empty day with a fresh timestamp so a
    // stale remote copy can't resurrect the cleared check-ins on next sync.
    state.completions[tKey] = {};
    state.completionsUpdatedAt[tKey] = Date.now();
    save();
    renderToday();
    showToast("Today reset.", "success");
  }

  /* ---- Reminder sound (Web Audio) ---- */
  let audioCtx = null;
  function ensureAudioCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }
  // Unlock audio on the first user gesture (iOS requirement).
  function unlockAudioOnce() {
    ensureAudioCtx();
    document.removeEventListener("pointerdown", unlockAudioOnce);
    document.removeEventListener("keydown", unlockAudioOnce);
  }
  function soundEnabled() {
    // Default on unless explicitly turned off
    return localStorage.getItem(KEYS.reminderSound) !== "false";
  }
  // A gentle three-note ascending chime.
  function playChime() {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [
      { f: 587.33, t: 0.00 }, // D5
      { f: 783.99, t: 0.12 }, // G5
      { f: 1046.50, t: 0.24 }, // C6
    ];
    const master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.f;
      const start = now + n.t;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(1, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
      osc.connect(g);
      g.connect(master);
      osc.start(start);
      osc.stop(start + 0.5);
    }
  }

  /* ---- Fasting ---- */
  let selectedFastGoal = 16;
  let fastingTickTimer = null;
  let fastingGoalTimer = null;
  let fastingCardPlacedThisRender = false;
  const FRING_CIRC = 2 * Math.PI * 52;

  // A habit named like "Intermittent fasting" hosts the fasting tracker inline.
  function isFastingHabit(h) { return !!h && /fasting/i.test(h.name || ""); }

  function fastingState() {
    if (!state.fasting) state.fasting = defaultState().fasting;
    return state.fasting;
  }
  function fmtDur(ms) {
    if (ms < 0) ms = 0;
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
  }
  function fmtClock(ms) {
    if (ms < 0) ms = 0;
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  function fmtTimeOfDay(ts) {
    return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function startFast(hours) {
    const f = fastingState();
    f.active = true;
    f.startTs = Date.now();
    f.targetHours = hours;
    f.updatedAt = Date.now();
    selectedFastGoal = hours;
    save();
    armFastingGoalTimer();
    startFastingTick();
    renderFasting();
    if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) {} }
    showToast(`Fast started · ${hours}h goal (until ${fmtTimeOfDay(f.startTs + hours * 3600000)})`);
  }

  // Apply a preset ratio (e.g. 16 → 16:8) to the daily schedule window,
  // keeping the eating-window start (eatTime) fixed and moving the fast start.
  function applyFastPresetToSchedule(fastHours) {
    const f = fastingState();
    const eatHours = Math.max(0, 24 - fastHours);
    const [eh, em] = (f.eatTime || "12:00").split(":").map(Number);
    let startMin = (eh * 60 + em) + eatHours * 60;
    startMin = ((startMin % 1440) + 1440) % 1440;
    const sh = Math.floor(startMin / 60), sm = startMin % 60;
    f.startTime = `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;
    f.updatedAt = Date.now();
    save();
    scheduleReminders();
  }

  function endFast() {
    const f = fastingState();
    if (!f.active || !f.startTs) return;
    const start = f.startTs;
    const end = Date.now();
    const durMs = end - start;
    f.history.push({ start, end, targetHours: f.targetHours, goalMet: durMs >= f.targetHours * 3600000 });
    f.history = f.history.slice(-200);
    f.active = false;
    f.startTs = 0;
    f.updatedAt = Date.now();
    save();
    if (fastingGoalTimer) { clearTimeout(fastingGoalTimer); fastingGoalTimer = null; }
    stopFastingTick();
    const e = getEls();
    if (e.fastingCard) e.fastingCard.classList.remove("goal-reached");
    renderFasting();
    showToast(`Fast ended · ${fmtDur(durMs)} logged`);
  }

  function armFastingGoalTimer() {
    if (fastingGoalTimer) { clearTimeout(fastingGoalTimer); fastingGoalTimer = null; }
    const f = fastingState();
    if (!f.active || !f.startTs) return;
    const delay = f.startTs + f.targetHours * 3600000 - Date.now();
    if (delay > 0 && delay <= 24 * 60 * 60 * 1000) {
      fastingGoalTimer = setTimeout(() => {
        if (soundEnabled()) { try { playChime(); } catch (e) {} }
        if (navigator.vibrate) { try { navigator.vibrate([60, 40, 60]); } catch (e) {} }
        notify("🎉 Fast complete", { body: `You hit your ${f.targetHours}h goal. You can eat now.`, tag: "ht-fast-goal" });
        renderFasting();
      }, delay);
    }
  }

  // "manual" = a one-off fast the user started; "auto" = intermittent fasting
  // driven purely by the daily schedule (no start button needed); "idle" = neither.
  function fastingMode() {
    const f = fastingState();
    if (f.active && f.startTs) return "manual";
    if (f.scheduleEnabled) return "auto";
    return "idle";
  }

  function startFastingTick() {
    stopFastingTick();
    if (fastingMode() === "idle") return;
    fastingTickTimer = setInterval(updateFastingProgress, 1000);
  }
  function stopFastingTick() {
    if (fastingTickTimer) { clearInterval(fastingTickTimer); fastingTickTimer = null; }
  }

  function setFastingRing(frac) {
    const e = getEls();
    if (!e.fastingRingSeg) return;
    const pct = Math.max(0, Math.min(1, frac));
    e.fastingRingSeg.style.strokeDasharray = FRING_CIRC.toFixed(1);
    e.fastingRingSeg.style.strokeDashoffset = (FRING_CIRC * (1 - pct)).toFixed(1);
  }

  function occurrenceNear(totalMin, refMs) {
    const d = new Date(refMs);
    d.setHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0);
    return d.getTime();
  }
  function nextOccur(totalMin, refMs) {
    let t = occurrenceNear(totalMin, refMs);
    if (t <= refMs) t += 86400000;
    return t;
  }
  function prevOccur(totalMin, refMs) {
    let t = occurrenceNear(totalMin, refMs);
    if (t > refMs) t -= 86400000;
    return t;
  }
  function fastLabel(fastMin, eatMin) {
    if (eatMin <= 0) return `${Math.round(fastMin / 60)}h`;
    const fh = fastMin / 60, eh = eatMin / 60;
    if (Number.isInteger(fh) && Number.isInteger(eh)) return `${fh}:${eh}`;
    return `${(fastMin / 60).toFixed(1)}h fast`;
  }

  // Derive the current phase (fasting vs eating) from the daily schedule.
  function computeSchedulePhase() {
    const f = fastingState();
    const now = Date.now();
    const [sh, sm] = f.startTime.split(":").map(Number); // fast begins
    const [eh, em] = f.eatTime.split(":").map(Number);   // eating begins (fast ends)
    const SF = sh * 60 + sm;
    const ES = eh * 60 + em;
    const d = new Date(now);
    const m = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

    let eating;
    if (ES === SF) eating = false;
    else if (ES < SF) eating = (m >= ES && m < SF);
    else eating = (m >= ES || m < SF);
    const fasting = !eating;

    let fastLen = ES - SF; if (fastLen <= 0) fastLen += 1440;
    const eatLen = 1440 - fastLen;

    const start = fasting ? prevOccur(SF, now) : prevOccur(ES, now);
    const end = fasting ? nextOccur(ES, now) : nextOccur(SF, now);
    return { fasting, start, end, label: fastLabel(fastLen, eatLen) };
  }

  function updateFastingProgress() {
    const e = getEls();
    if (!e.fastingRingSeg) return;
    const f = fastingState();
    const mode = fastingMode();
    if (mode === "idle") return;

    if (mode === "manual") {
      const elapsed = Date.now() - f.startTs;
      const goalMs = f.targetHours * 3600000;
      setFastingRing(elapsed / goalMs);
      e.fastingElapsed.textContent = fmtClock(elapsed);
      const reached = elapsed >= goalMs;
      e.fastingCard.classList.toggle("goal-reached", reached);
      if (reached) {
        e.fastingRingLabel.textContent = "goal met 🎉";
        e.fastingStatus.textContent = "Goal reached — you can eat";
        e.fastingRemaining.textContent = `${fmtDur(elapsed - goalMs)} past your ${f.targetHours}h goal`;
        e.fastingHeadSummary.textContent = "Goal met 🎉";
      } else {
        e.fastingRingLabel.textContent = "elapsed";
        e.fastingStatus.textContent = `Fasting · ${f.targetHours}h goal`;
        e.fastingRemaining.textContent = `${fmtDur(goalMs - elapsed)} left`;
        e.fastingHeadSummary.textContent = `${fmtDur(goalMs - elapsed)} left`;
      }
      e.fastingWindow.textContent = `Started ${fmtTimeOfDay(f.startTs)} · goal ${fmtTimeOfDay(f.startTs + goalMs)}`;
      return;
    }

    // Auto (intermittent) mode — follows the daily schedule automatically.
    const phase = computeSchedulePhase();
    const now = Date.now();
    const total = phase.end - phase.start;
    setFastingRing(total > 0 ? (now - phase.start) / total : 0);
    e.fastingElapsed.textContent = fmtClock(now - phase.start);
    e.fastingCard.classList.toggle("goal-reached", !phase.fasting);
    if (phase.fasting) {
      e.fastingRingLabel.textContent = "fasting";
      e.fastingStatus.textContent = `Fasting · ${phase.label}`;
      e.fastingRemaining.textContent = `${fmtDur(phase.end - now)} until eating window`;
      e.fastingWindow.textContent = `Eat at ${f.eatTime} · fast again ${f.startTime}`;
      e.fastingHeadSummary.textContent = `${fmtDur(phase.end - now)} to eat`;
    } else {
      e.fastingRingLabel.textContent = "eating";
      e.fastingStatus.textContent = "Eating window open";
      e.fastingRemaining.textContent = `${fmtDur(phase.end - now)} until fast starts`;
      e.fastingWindow.textContent = `Start fasting at ${f.startTime}`;
      e.fastingHeadSummary.textContent = `${fmtDur(phase.end - now)} to fast`;
    }
  }

  function renderFastingSchedHint() {
    const e = getEls();
    if (!e.fastingSchedHint) return;
    const f = fastingState();
    if (!f.scheduleEnabled) {
      e.fastingSchedHint.textContent = "Turn on to get a daily nudge to start fasting and to eat.";
      return;
    }
    const [sh, sm] = f.startTime.split(":").map(Number);
    const [eh, em] = f.eatTime.split(":").map(Number);
    let fastMin = (eh * 60 + em) - (sh * 60 + sm);
    if (fastMin <= 0) fastMin += 24 * 60;
    const h = Math.floor(fastMin / 60), m = fastMin % 60;
    e.fastingSchedHint.textContent = `Fasting window ≈ ${h}h${m ? " " + m + "m" : ""}. Reminders at ${f.startTime} (start) and ${f.eatTime} (eat).`;
  }

  function renderFasting() {
    const e = getEls();
    if (!e.fastingCard) return;
    const f = fastingState();
    e.fastingSchedToggle.checked = !!f.scheduleEnabled;
    e.fastingStartTime.value = f.startTime || "20:00";
    e.fastingEatTime.value = f.eatTime || "12:00";
    renderFastingSchedHint();

    // Collapsed (hidden) state
    const collapsed = localStorage.getItem(KEYS.fastingCollapsed) === "true";
    e.fastingCard.classList.toggle("collapsed", collapsed);
    if (e.fastingToggle) e.fastingToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");

    const mode = fastingMode();
    if (mode === "idle") {
      e.fastingActive.classList.add("hidden");
      e.fastingIdle.classList.remove("hidden");
      e.fastingCard.classList.remove("goal-reached");
      for (const btn of e.fastingPresets.querySelectorAll(".preset-chip")) {
        btn.classList.toggle("is-sel", Number(btn.dataset.hrs) === selectedFastGoal);
      }
      const last = f.history[f.history.length - 1];
      e.fastingIdleSub.textContent = last
        ? `Last fast: ${fmtDur(last.end - last.start)}${last.goalMet ? " ✓ goal met" : ""}. Start another, or tap “Daily schedule” for automatic intermittent fasting.`
        : "Start a one-off fast, or tap “Daily schedule” to track intermittent fasting automatically each day.";
      e.fastingHeadSummary.textContent = "Not fasting";
      stopFastingTick();
    } else {
      e.fastingActive.classList.remove("hidden");
      e.fastingIdle.classList.add("hidden");
      // Manual fasts can be ended; auto (schedule) mode runs itself.
      e.fastingStopBtn.style.display = (mode === "manual") ? "" : "none";
      updateFastingProgress();
      startFastingTick();
    }
  }

  /* ---- Reminders ---- */
  let reminderTimers = [];
  // Snooze timers live in their own list so re-scheduling (on tab focus, edits,
  // etc.) doesn't silently cancel a pending snooze the user just set.
  let snoozeTimers = [];
  function clearReminderTimers() {
    reminderTimers.forEach((t) => clearTimeout(t));
    reminderTimers = [];
  }
  function remindersEnabled() {
    return localStorage.getItem(KEYS.remindersEnabled) === "true";
  }
  function snoozeMinutes() {
    const n = parseInt(localStorage.getItem(KEYS.snoozeMin), 10);
    return [10, 15, 30, 60].includes(n) ? n : 10;
  }
  function snoozeLabel() {
    const n = snoozeMinutes();
    return n >= 60 ? `${n / 60}h` : `${n}m`;
  }
  function inQuietHours(hh, mm) {
    const qs = localStorage.getItem(KEYS.quietStart);
    const qe = localStorage.getItem(KEYS.quietEnd);
    if (!qs || !qe || !/^\d{2}:\d{2}$/.test(qs) || !/^\d{2}:\d{2}$/.test(qe)) return false;
    const t = hh * 60 + mm;
    const [sh, sm] = qs.split(":").map(Number);
    const [eh, em] = qe.split(":").map(Number);
    const start = sh * 60 + sm, end = eh * 60 + em;
    if (start === end) return false;
    // Handle overnight quiet windows (e.g. 22:00 → 07:00)
    return start < end ? (t >= start && t < end) : (t >= start || t < end);
  }

  function msUntilToday(hh, mm) {
    const now = new Date();
    const when = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
    return when.getTime() - now.getTime();
  }

  // The clock time a habit's reminder should fire at on the given day. If the
  // habit has a per-day time override (e.g. the Work Schedule auto-fit moved it
  // around a shift) and that override parses to a clock time, the reminder
  // follows it; otherwise it uses the habit's fixed reminder time.
  function effectiveReminderTime(habit, date) {
    const dayIdx = date.getDay();
    if (habit.dayTimes && habit.dayTimes[dayIdx]) {
      const mins = parseTimeToMinutes(effectiveTime(habit, dayIdx));
      // Only a real time-of-day (< 24:00) is a valid clock; parseTimeToMinutes
      // returns sentinels (1441/1442) for "all day"/descriptive text, which
      // would otherwise produce bogus "24:01" reminders firing near midnight.
      if (mins != null && mins < 24 * 60) {
        return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
      }
    }
    return /^\d{2}:\d{2}$/.test(habit.reminderTime) ? habit.reminderTime : null;
  }

  // All reminder times a habit should fire at on the given day. Supports
  // multiple times; for a single time the work-schedule per-day override applies.
  function habitReminderTimes(habit, date) {
    const list = (habit.reminderTimes && habit.reminderTimes.length)
      ? habit.reminderTimes.filter((t) => /^\d{2}:\d{2}$/.test(t))
      : (/^\d{2}:\d{2}$/.test(habit.reminderTime) ? [habit.reminderTime] : []);
    if (list.length === 1) {
      const rt = effectiveReminderTime(habit, date);
      if (rt) return [rt];
    }
    return list;
  }

  function scheduleReminders() {
    if (typeof window === "undefined") return; // no-op outside the browser (tests)
    clearReminderTimers();
    if (vacationActiveNow()) { updateBadge(); return; } // paused during vacation
    if (pushEnabled()) {
      // The Worker delivers every scheduled reminder (even when the app is
      // closed), so we must NOT also fire local timers — that would double up.
      syncPushSchedule();
      updateBadge();
      return;
    }
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (!remindersEnabled()) { scheduleFastingReminders(); updateBadge(); return; }
    const now = new Date();

    // ---- Group per-habit reminders by time slot ----
    // The reminder tracks the habit's effective time for today, so anything the
    // Work Schedule auto-fit moved (a per-day override) is reminded at its
    // adjusted time rather than the original fixed reminder time.
    const groups = new Map(); // "HH:MM" -> [habitId]
    for (const h of state.habits) {
      if (h.archived) continue;
      if (!isHabitActiveOn(h, now)) continue;
      if (isWeekly(h) && weeklyMet(h, now)) continue; // weekly quota already hit — no nagging
      for (const rt of habitReminderTimes(h, now)) {
        const [hh, mm] = rt.split(":").map(Number);
        if (inQuietHours(hh, mm)) continue;
        if (!groups.has(rt)) groups.set(rt, []);
        groups.get(rt).push(h.id);
      }
    }
    for (const [time, ids] of groups) {
      const [hh, mm] = time.split(":").map(Number);
      const delay = msUntilToday(hh, mm);
      if (delay <= 0 || delay > 24 * 60 * 60 * 1000) continue;
      const t = setTimeout(() => fireGroupReminder(ids), delay);
      reminderTimers.push(t);
    }

    // ---- Morning digest ----
    const md = localStorage.getItem(KEYS.morningDigest);
    if (md && /^\d{2}:\d{2}$/.test(md)) {
      const [hh, mm] = md.split(":").map(Number);
      const delay = msUntilToday(hh, mm);
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        reminderTimers.push(setTimeout(fireMorningDigest, delay));
      }
    }
    // ---- Evening nudge ----
    const en = localStorage.getItem(KEYS.eveningNudge);
    if (en && /^\d{2}:\d{2}$/.test(en)) {
      const [hh, mm] = en.split(":").map(Number);
      const delay = msUntilToday(hh, mm);
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        reminderTimers.push(setTimeout(fireEveningNudge, delay));
      }
    }
    // ---- Weekly summary (Sundays only) ----
    const wr = localStorage.getItem(KEYS.weeklyReport);
    if (wr && /^\d{2}:\d{2}$/.test(wr) && now.getDay() === 0) {
      const [hh, mm] = wr.split(":").map(Number);
      const delay = msUntilToday(hh, mm);
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        reminderTimers.push(setTimeout(fireWeeklyReport, delay));
      }
    }
    scheduleFastingReminders();
    updateBadge();
  }

  function scheduleFastingReminders() {
    const f = state.fasting;
    if (!f || !f.scheduleEnabled) return;
    if (/^\d{2}:\d{2}$/.test(f.startTime)) {
      const [hh, mm] = f.startTime.split(":").map(Number);
      const delay = msUntilToday(hh, mm);
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) reminderTimers.push(setTimeout(fireFastStartReminder, delay));
    }
    if (/^\d{2}:\d{2}$/.test(f.eatTime)) {
      const [hh, mm] = f.eatTime.split(":").map(Number);
      const delay = msUntilToday(hh, mm);
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) reminderTimers.push(setTimeout(fireFastEatReminder, delay));
    }
  }

  function fireFastStartReminder() {
    const f = state.fasting;
    if (soundEnabled()) { try { playChime(); } catch (e) {} }
    notify("🍽️ Time to start fasting", { body: `Eating window closed. Plan to break your fast around ${f.eatTime}.`, tag: "ht-fast-start" });
  }
  function fireFastEatReminder() {
    if (soundEnabled()) { try { playChime(); } catch (e) {} }
    notify("🥗 Eating window open", { body: "You can break your fast now.", tag: "ht-fast-eat" });
  }

  // ---- Missed-reminder catch-up -------------------------------------------
  // PWA timers only fire while the app is open, so a reminder due while the app
  // was closed is otherwise lost. On open/visibility we send one notification
  // for anything that came due while away and is still pending. A per-day
  // "notified" set (persisted) de-dupes against the normal scheduled reminders.
  function notifiedTodayKey() { return "ht_notified_" + todayKey(); }
  function getNotifiedToday() {
    try { return new Set(JSON.parse(localStorage.getItem(notifiedTodayKey()) || "[]")); }
    catch (e) { return new Set(); }
  }
  function markNotified(ids) {
    if (!ids || !ids.length) return;
    const s = getNotifiedToday();
    ids.forEach((id) => s.add(id));
    try { localStorage.setItem(notifiedTodayKey(), JSON.stringify([...s])); } catch (e) {}
  }
  function cleanupNotifiedKeys() {
    const keep = notifiedTodayKey();
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("ht_notified_") && k !== keep) localStorage.removeItem(k);
      }
    } catch (e) {}
  }
  function catchUpReminders() {
    if (pushEnabled()) return; // the Worker already delivers these
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (!remindersEnabled()) return;
    if (vacationActiveNow()) return; // paused during vacation
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const notified = getNotifiedToday();
    const overdue = [];
    for (const h of state.habits) {
      if (h.archived) continue;
      if (!isHabitActiveOn(h, now)) continue;
      if (todayStatus(h, now) !== "pending") continue; // done/skipped or weekly quota met
      if (notified.has(h.id)) continue;                // already pinged today
      // Overdue if the earliest non-quiet reminder time has passed.
      const due = habitReminderTimes(h, now).some((rt) => {
        const [hh, mm] = rt.split(":").map(Number);
        return hh * 60 + mm <= nowMin && !inQuietHours(hh, mm);
      });
      if (due) overdue.push(h);
    }
    if (overdue.length === 0) return;
    markNotified(overdue.map((h) => h.id));
    if (soundEnabled()) { try { playChime(); } catch (e) {} }
    if (navigator.vibrate) { try { navigator.vibrate([40, 30, 40]); } catch (e) {} }
    if (overdue.length === 1) {
      const h = overdue[0];
      // Dose-aware body: if an earlier dose is done but a later one is open.
      const dp = doseProgress(h, now);
      let body;
      if (dp && dp.done > 0 && dp.pending > 0) {
        body = `You've done ${dp.done} of ${dp.total} — ${dp.pending} dose${dp.pending === 1 ? "" : "s"} still open.`;
      } else {
        const chip = timeChipLabel(effectiveTime(h, now.getDay()));
        const bits = [];
        if (chip) bits.push(`Was due ${chip}`);
        if (h.notes) bits.push(h.notes);
        body = bits.length ? bits.join(" · ") : "Still pending from earlier today.";
      }
      notify(`${h.icon || "⏰"} ${h.name}`, {
        body,
        ids: [h.id],
        tag: "ht-catchup",
      });
    } else {
      notify(`⏰ ${overdue.length} habits still pending`, {
        body: overdue.slice(0, 6).map((h) => `${h.icon || "•"} ${h.name}`).join(", ") + (overdue.length > 6 ? "…" : ""),
        ids: overdue.map((h) => h.id),
        tag: "ht-catchup",
      });
    }
  }

  function fireGroupReminder(ids) {
    const today = new Date();
    const pending = ids
      .map((id) => state.habits.find((h) => h.id === id))
      .filter((h) => h && isHabitActiveOn(h, today) && !isCompleted(h, today) && !isSkipped(h, today));
    if (pending.length === 0) return;
    markNotified(pending.map((h) => h.id));
    if (soundEnabled()) { try { playChime(); } catch (e) {} }
    if (navigator.vibrate) { try { navigator.vibrate([40, 30, 40]); } catch (e) {} }
    if (pending.length === 1) {
      const h = pending[0];
      const chip = timeChipLabel(effectiveTime(h, today.getDay()));
      const body = h.reminderMsg
        ? h.reminderMsg
        : h.notes
          ? (chip ? `${chip} · ${h.notes}` : h.notes)
          : (chip ? `Time for your ${chip} habit` : "Time to check this off");
      notify(`${h.icon || "⏰"} ${h.name}`, {
        body,
        ids: [h.id],
        tag: "ht-slot-" + (h.reminderTime || h.id),
      });
    } else {
      const chip = timeChipLabel(effectiveTime(pending[0], today.getDay()));
      const title = chip
        ? `🕒 Your ${chip} stack · ${pending.length} items`
        : `⏰ ${pending.length} habits to check off`;
      notify(title, {
        body: pending.map((h) => `${h.icon || "•"} ${h.name}`).join(", "),
        ids: pending.map((h) => h.id),
        tag: "ht-slot-" + (pending[0].reminderTime || "group"),
      });
    }
  }

  function fireMorningDigest() {
    const today = new Date();
    const scheduled = state.habits.filter((h) => isHabitActiveOn(h, today));
    if (scheduled.length === 0) return;
    notify("☀️ Good morning", {
      body: `You have ${scheduled.length} habit${scheduled.length === 1 ? "" : "s"} today. Let's build momentum.`,
      tag: "ht-digest",
    });
    if (soundEnabled()) { try { playChime(); } catch (e) {} }
  }

  function fireEveningNudge() {
    const today = new Date();
    const scheduled = state.habits.filter((h) => isHabitActiveOn(h, today));
    // Weekly-quota habits that already met their target aren't pending — use
    // todayStatus so we don't nag about habits that are done for the week.
    const pending = scheduled.filter((h) => todayStatus(h, today) === "pending");
    if (pending.length === 0) return;
    const atRisk = pending.filter((h) => isStreakAtRisk(h, today));
    let title = "🌙 Before you wind down";
    let body;
    if (atRisk.length) {
      title = `🔥 ${atRisk.length} streak${atRisk.length === 1 ? "" : "s"} at risk`;
      body = `Don't break the chain: ${atRisk.slice(0, 5).map((h) => h.name).join(", ")}${atRisk.length > 5 ? "…" : ""}`;
    } else {
      body = `${pending.length} habit${pending.length === 1 ? "" : "s"} still pending: ${pending.slice(0, 5).map((h) => h.name).join(", ")}${pending.length > 5 ? "…" : ""}`;
    }
    notify(title, { body, ids: pending.map((h) => h.id), tag: "ht-nudge" });
    if (soundEnabled()) { try { playChime(); } catch (e) {} }
  }
  // Weekly summary — a recap of the last 7 days, fired Sunday evening.
  function fireWeeklyReport() {
    const stamp = todayKey();
    if (localStorage.getItem("ht_weekly_sent") === stamp) return; // once per day
    localStorage.setItem("ht_weekly_sent", stamp);
    const today = new Date();
    let done = 0, total = 0, bestDay = null, bestPct = -1;
    for (let i = 0; i < 7; i++) {
      const d = addDays(today, -i);
      let dDone = 0, dTot = 0;
      for (const h of state.habits) {
        if (isHabitActiveOn(h, d)) { dTot++; total++; if (isCompleted(h, d)) { dDone++; done++; } }
      }
      if (dTot > 0) { const p = dDone / dTot; if (p > bestPct) { bestPct = p; bestDay = d; } }
    }
    const pct = total ? Math.round((done / total) * 100) : 0;
    let body;
    if (!total) {
      body = "No habits scheduled this week yet. Add a few to start building momentum.";
    } else {
      body = `${pct}% adherence · ${done}/${total} check-ins`;
      if (bestDay) body += ` · best day ${bestDay.toLocaleDateString(undefined, { weekday: "long" })}`;
    }
    notify("📊 Your week in Momentum", { body, tag: "ht-weekly" });
    if (soundEnabled()) { try { playChime(); } catch (e) {} }
  }
  function maybeFireWeeklyReport() {
    if (pushEnabled()) return; // the Worker already delivers the weekly summary
    if (!("Notification" in window) || Notification.permission !== "granted" || !remindersEnabled()) return;
    const wr = localStorage.getItem(KEYS.weeklyReport);
    if (!wr || !/^\d{2}:\d{2}$/.test(wr)) return;
    const now = new Date();
    if (now.getDay() !== 0) return; // Sundays only
    const [hh, mm] = wr.split(":").map(Number);
    if (now.getHours() * 60 + now.getMinutes() < hh * 60 + mm) return; // not time yet
    fireWeeklyReport(); // self-dedupes per day
  }

  /* ---- Background push (Web Push via a user-deployed Cloudflare Worker) -----
   * Lets reminders arrive when the app is closed. The client subscribes with a
   * VAPID public key, then uploads its schedule + timezone to the worker, which
   * sends the push at the right local time. Fully opt-in and independent of the
   * in-app reminder timers. */
  function pushConfigured() {
    return !!(localStorage.getItem(KEYS.pushUrl) && localStorage.getItem(KEYS.pushVapid));
  }
  // Stable per-device id so the worker overwrites (not duplicates) on re-register.
  function pushDeviceId() {
    let id = localStorage.getItem(KEYS.pushDeviceId);
    if (!id) { id = uid(); localStorage.setItem(KEYS.pushDeviceId, id); }
    return id;
  }
  function pushEnabled() {
    return localStorage.getItem(KEYS.pushEnabled) === "true" && pushConfigured();
  }
  function showPushStatus(msg, kind) {
    const el = getEls().pushStatus;
    if (!el) return;
    el.hidden = false;
    el.className = "sync-status " + (kind || "");
    el.textContent = msg;
  }
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function timeFmt() { return localStorage.getItem(KEYS.timeFormat) === "24" ? "24" : "12"; }
  function formatClock(hh, mm) {
    hh = ((hh % 24) + 24) % 24;
    if (timeFmt() === "24") return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    const ap = hh < 12 ? "AM" : "PM";
    const h12 = ((hh + 11) % 12) + 1;
    return `${h12}:${String(mm).padStart(2, "0")} ${ap}`;
  }
  function fmtClockLabel(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return formatClock(h, m);
  }
  // Build the reminder schedule the worker will fire on. Times are local "HH:MM"
  // plus the weekdays each applies to. Background pushes can't know completion
  // status, so they're informational — the app's on-open catch-up stays exact.
  // A snapshot of the last 7 days for the weekly push body (computed at sync).
  function weeklySummaryText() {
    const today = new Date();
    let done = 0, total = 0, bestDay = null, bestPct = -1;
    for (let i = 0; i < 7; i++) {
      const d = addDays(today, -i);
      let dDone = 0, dTot = 0;
      for (const h of state.habits) {
        if (isHabitActiveOn(h, d)) { dTot++; total++; if (isCompleted(h, d)) { dDone++; done++; } }
      }
      if (dTot > 0) { const p = dDone / dTot; if (p > bestPct) { bestPct = p; bestDay = d; } }
    }
    if (!total) return "See your adherence, streaks, and trends in the Report tab.";
    const pct = Math.round((done / total) * 100);
    let s = `${pct}% adherence · ${done}/${total} check-ins`;
    if (bestDay) s += ` · best day ${bestDay.toLocaleDateString(undefined, { weekday: "long" })}`;
    return s + ". Open Report for the full picture.";
  }

  function buildPushSchedule() {
    const entries = [];
    if (vacationActiveNow()) return entries; // no background pushes during vacation
    const today = new Date();
    // Group by time AND day-set. Grouping by time alone would union the days of
    // every habit in the slot, so a Monday-only habit sharing 08:00 with a daily
    // one would get pushed all week. Keying on the day-set keeps each habit on
    // its own days (habits with identical time+days still share one push).
    const byTime = new Map();
    for (const h of state.habits) {
      if (h.archived) continue;
      if (h.noPush) continue; // habit opted out of background reminders
      const hDays = (h.days && h.days.length) ? h.days.slice().sort((a, b) => a - b) : [0, 1, 2, 3, 4, 5, 6];
      for (const rt of habitReminderTimes(h, today)) {
        const [qh, qm] = rt.split(":").map(Number);
        if (inQuietHours(qh, qm)) continue; // don't push during quiet hours
        const key = rt + "|" + hDays.join(",");
        if (!byTime.has(key)) byTime.set(key, { time: rt, days: hDays, hs: [] });
        byTime.get(key).hs.push(h);
      }
    }
    for (const { time, days, hs } of byTime.values()) {
      const label = fmtClockLabel(time);
      let title, body;
      if (hs.length === 1) {
        const h = hs[0];
        title = `${h.icon || "⏰"} ${h.name}`;
        if (h.reminderMsg) {
          body = `Due ${label} · ${h.reminderMsg}`;
        } else {
          const bits = [`Due ${label}`];
          if (h.notes) bits.push(h.notes);
          body = bits.join(" · ");
        }
      } else {
        title = `🕒 ${label} · ${hs.length} to check off`;
        // One line per habit — prefer its custom message, else its notes.
        body = hs.map((h) => `${h.icon || "•"} ${h.name}${h.reminderMsg ? " — " + h.reminderMsg : h.notes ? " — " + h.notes : ""}`).join("\n");
      }
      // ids make the notification actionable (Done / Snooze).
      entries.push({ time, days, title, body, ids: hs.map((h) => h.id) });
    }
    const md = localStorage.getItem(KEYS.morningDigest);
    if (md) {
      const dayHabits = state.habits.filter((h) => isHabitActiveOn(h, today) && !h.nightPrevDay);
      const names = dayHabits.slice(0, 4).map((h) => `${h.icon || "•"} ${h.name}`).join(", ");
      const body = dayHabits.length
        ? `${dayHabits.length} habit${dayHabits.length === 1 ? "" : "s"} today${names ? " — " + names + (dayHabits.length > 4 ? "…" : "") : ""}.`
        : "A fresh day. Open Momentum to plan your habits.";
      entries.push({ time: md, days: [0, 1, 2, 3, 4, 5, 6], title: "☀️ Good morning", body });
    }
    const en = localStorage.getItem(KEYS.eveningNudge);
    if (en) {
      const dayHabits = state.habits.filter((h) => isHabitActiveOn(h, today));
      const body = dayHabits.length
        ? `Wind-down check-in — log what you finished today${dayHabits.length ? ` (${dayHabits.length} on today's list)` : ""}.`
        : "Wind-down check-in. Open Momentum to log your day.";
      entries.push({ time: en, days: [0, 1, 2, 3, 4, 5, 6], title: "🌙 Before you wind down", body });
    }
    const wr = localStorage.getItem(KEYS.weeklyReport);
    if (wr) entries.push({ time: wr, days: [0], title: "📊 Your week in Momentum", body: weeklySummaryText() });
    const f = state.fasting;
    if (f && f.scheduleEnabled) {
      if (/^\d{2}:\d{2}$/.test(f.startTime) && /^\d{2}:\d{2}$/.test(f.eatTime)) {
        const [sh, sm] = f.startTime.split(":").map(Number);
        const [eh, em] = f.eatTime.split(":").map(Number);
        let mins = (eh * 60 + em) - (sh * 60 + sm); if (mins <= 0) mins += 1440;
        const hrs = Math.round(mins / 60);
        entries.push({ time: f.startTime, days: [0, 1, 2, 3, 4, 5, 6], title: "🍽️ Time to start fasting", body: `Begin your ${hrs}h fast. Eating window opens ${fmtClockLabel(f.eatTime)}.` });
        entries.push({ time: f.eatTime, days: [0, 1, 2, 3, 4, 5, 6], title: "🥗 Eating window open", body: `Break your fast. Next fast starts ${fmtClockLabel(f.startTime)}.` });
      }
    }
    return entries;
  }
  async function getPushSubscription() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  }
  let pushSyncTimer = null;
  function syncPushSchedule() {
    if (!pushEnabled()) return;
    if (pushSyncTimer) clearTimeout(pushSyncTimer);
    pushSyncTimer = setTimeout(async () => {
      try {
        const sub = await getPushSubscription();
        if (!sub) return;
        const url = localStorage.getItem(KEYS.pushUrl).replace(/\/$/, "");
        await fetch(url + "/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: pushDeviceId(),
            subscription: sub.toJSON(),
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            schedule: buildPushSchedule(),
          }),
        });
      } catch (e) { /* offline or worker down — will retry on next reschedule */ }
    }, 800);
  }
  async function enableBackgroundPush() {
    const els = getEls();
    const url = (els.pushUrl.value || "").trim().replace(/\/$/, "");
    const key = (els.pushVapid.value || "").trim();
    if (!/^https:\/\//.test(url) || !key) {
      showPushStatus("Enter your push server URL (https) and VAPID public key first.", "warn");
      els.pushToggle.checked = false;
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      showPushStatus("This browser/device doesn't support Web Push. On iPhone, add Momentum to your Home Screen first.", "warn");
      els.pushToggle.checked = false;
      return;
    }
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm !== "granted") {
      showPushStatus("Allow notifications to enable background reminders.", "warn");
      els.pushToggle.checked = false;
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
      }
      localStorage.setItem(KEYS.pushUrl, url);
      localStorage.setItem(KEYS.pushVapid, key);
      localStorage.setItem(KEYS.pushEnabled, "true");
      const resp = await fetch(url + "/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: pushDeviceId(),
          subscription: sub.toJSON(),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          schedule: buildPushSchedule(),
        }),
      });
      if (!resp.ok) throw new Error("server " + resp.status);
      showPushStatus("Background reminders on. Tap “Send test push” to confirm delivery.", "success");
    } catch (e) {
      localStorage.setItem(KEYS.pushEnabled, "false");
      els.pushToggle.checked = false;
      showPushStatus("Setup failed: " + (e.message || e) + ". Check the URL/key and that the app is opened from the Home Screen.", "warn");
    }
  }
  // Fire an immediate push through the worker to verify the whole path works,
  // without waiting for a scheduled time.
  async function testBackgroundPush() {
    const els = getEls();
    const url = ((localStorage.getItem(KEYS.pushUrl) || els.pushUrl.value) || "").trim().replace(/\/$/, "");
    if (!/^https:\/\//.test(url)) { showPushStatus("Enter your push server URL first.", "warn"); return; }
    if (!("Notification" in window) || Notification.permission !== "granted") { showPushStatus("Allow notifications first (toggle background reminders on).", "warn"); return; }
    try {
      const sub = await getPushSubscription();
      if (!sub) { showPushStatus("This device isn't subscribed yet — turn the toggle on first.", "warn"); return; }
      showPushStatus("Sending test push…");
      const resp = await fetch(url + "/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data.ok) {
        showPushStatus("Test sent ✓ — a notification should appear in a few seconds. Try closing the app to confirm background delivery.", "success");
      } else {
        showPushStatus(`Server couldn't send (status ${resp.status}${data.result !== undefined ? ", push=" + data.result : ""}${data.error ? ", " + data.error : ""}).`, "warn");
      }
    } catch (e) {
      showPushStatus("Couldn't reach the server: " + (e.message || e), "warn");
    }
  }

  // Re-register this device with a fresh subscription. Because the worker keys
  // by a stable device id, this overwrites (never duplicates) this device's
  // entry — handy if pushes stop after the browser rotates the subscription.
  async function reregisterDevice() {
    const els = getEls();
    const url = ((localStorage.getItem(KEYS.pushUrl) || els.pushUrl.value) || "").trim().replace(/\/$/, "");
    if (!/^https:\/\//.test(url)) { showPushStatus("Enter your push server URL first.", "warn"); return; }
    try {
      showPushStatus("Re-registering this device…");
      const sub = await getPushSubscription();
      if (sub) await sub.unsubscribe().catch(() => {});
      await enableBackgroundPush(); // creates a fresh subscription under the same device id
    } catch (e) {
      showPushStatus("Re-register failed: " + (e.message || e), "warn");
    }
  }

  async function disableBackgroundPush() {
    const url = (localStorage.getItem(KEYS.pushUrl) || "").replace(/\/$/, "");
    localStorage.setItem(KEYS.pushEnabled, "false");
    try {
      const sub = await getPushSubscription();
      if (sub) {
        if (url) {
          await fetch(url + "/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceId: pushDeviceId(), endpoint: sub.endpoint }),
          }).catch(() => {});
        }
        await sub.unsubscribe().catch(() => {});
      }
    } catch (e) {}
    showPushStatus("Background reminders off.", "success");
  }

  // Central notification helper: prefer the service worker (enables action
  // buttons + reliability when unfocused), fall back to a page Notification.
  async function notify(title, opts = {}) {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      showToast("⏰ " + title);
      return false;
    }
    const options = {
      body: opts.body || "",
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      tag: opts.tag || "ht",
      renotify: true,
      data: { ids: opts.ids || [] },
    };
    if (opts.ids && opts.ids.length) {
      options.actions = [
        { action: "done", title: "✓ Done" },
        { action: "snooze", title: `Snooze ${snoozeLabel()}` },
      ];
    }
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, options);
        try { localStorage.setItem(KEYS.lastNotif, String(Date.now())); } catch (e) {}
        return true;
      }
    } catch (e) { /* fall through */ }
    try {
      const n = new Notification(title, options);
      n.onclick = () => { window.focus(); n.close(); };
      try { localStorage.setItem(KEYS.lastNotif, String(Date.now())); } catch (e) {}
      return true;
    } catch (e) {
      showToast("⏰ " + title);
      return false;
    }
  }

  // Handle action from a notification (Done / Snooze / open), whether it came
  // via SW postMessage or a ?notif= query param on cold start.
  function handleNotifAction(action, data) {
    const ids = (data && data.ids) || [];
    const today = new Date();
    if (action === "done" && ids.length) {
      for (const id of ids) {
        const h = state.habits.find((x) => x.id === id);
        if (h) setCompletionValue(id, today, h.target);
      }
      if (currentView === "today") renderToday();
      updateBadge();
      showToast(`Marked ${ids.length} done.`, "success");
    } else if (action === "snooze" && ids.length) {
      const mins = snoozeMinutes();
      const t = setTimeout(() => fireGroupReminder(ids), mins * 60 * 1000);
      snoozeTimers.push(t); // survive re-scheduling so the snooze actually fires
      showToast(`Snoozed ${snoozeLabel()}.`);
    }
  }

  // Earliest upcoming habit reminder still to fire today (HH:MM), or null.
  function nextReminderToday() {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let best = null;
    for (const h of state.habits) {
      if (h.archived || !isHabitActiveOn(h, now)) continue;
      for (const rt of habitReminderTimes(h, now)) {
        const [hh, mm] = rt.split(":").map(Number);
        const t = hh * 60 + mm;
        if (t > nowMin && !inQuietHours(hh, mm) && (best == null || t < best)) best = t;
      }
    }
    return best == null ? null : fmtClockLabel(String(Math.floor(best / 60)).padStart(2, "0") + ":" + String(best % 60).padStart(2, "0"));
  }

  function healthRow(level, label, value, hint) {
    const icon = level === "ok" ? "✅" : level === "warn" ? "⚠️" : "❌";
    return `<div class="rh-row rh-${level}"><span class="rh-icon">${icon}</span>` +
      `<span class="rh-label">${escapeHtml(label)}</span>` +
      `<span class="rh-value">${escapeHtml(value)}</span>` +
      (hint ? `<span class="rh-hint">${escapeHtml(hint)}</span>` : "") + `</div>`;
  }

  async function renderReminderHealth() {
    const el = getEls().reminderHealth;
    if (!el) return;
    const rows = [];

    // Notification permission
    const supported = "Notification" in window;
    const perm = supported ? Notification.permission : "unsupported";
    rows.push(healthRow(
      perm === "granted" ? "ok" : perm === "denied" ? "bad" : "warn",
      "Notification permission",
      perm,
      perm === "denied" ? "Enable it in your browser/site settings." :
      perm === "default" ? "Tap Enable reminders to grant." :
      !supported ? "This browser can't show notifications." : ""));

    // Reminders enabled
    const remOn = remindersEnabled();
    rows.push(healthRow(remOn ? "ok" : "warn", "In-app reminders", remOn ? "on" : "off",
      remOn ? "" : "Turn on Enable reminders above."));

    // Background push
    const pconf = pushConfigured();
    const penabled = pushEnabled();
    let sub = null;
    try { sub = await getPushSubscription(); } catch (e) {}
    if (!pconf) {
      rows.push(healthRow("warn", "Background push", "not set up", "Add a push server URL below for reminders when the app is closed."));
    } else if (penabled && sub) {
      rows.push(healthRow("ok", "Background push", "active", "Reminders fire even when the app is closed."));
    } else {
      rows.push(healthRow("warn", "Background push", penabled ? "enabled, no subscription" : "off",
        penabled ? "Try Re-register device below." : "Turn on background reminders below."));
    }

    // Habits with reminders
    const withReminders = state.habits.filter((h) => !h.archived && habitReminderTimes(h, new Date()).length > 0).length;
    const activeHabits = state.habits.filter((h) => !h.archived).length;
    rows.push(healthRow(withReminders > 0 ? "ok" : "warn", "Habits with a reminder",
      `${withReminders} of ${activeHabits}`,
      withReminders === 0 ? "Add a reminder time when editing a habit." : ""));

    // Next reminder today
    const next = nextReminderToday();
    rows.push(healthRow(next ? "ok" : "warn", "Next reminder today", next || "none left",
      next ? "" : "Nothing more scheduled before midnight."));

    // Quiet hours
    const qs = localStorage.getItem(KEYS.quietStart);
    const qe = localStorage.getItem(KEYS.quietEnd);
    rows.push(healthRow("ok", "Quiet hours",
      (qs && qe) ? `${fmtClockLabel(qs)} – ${fmtClockLabel(qe)}` : "none",
      (qs && qe) ? "No reminders in this window." : ""));

    // Sound
    rows.push(healthRow("ok", "Reminder sound", soundEnabled() ? "on" : "off", ""));

    // Last notification delivered
    const last = Number(localStorage.getItem(KEYS.lastNotif) || 0);
    rows.push(healthRow(last ? "ok" : "warn", "Last notification", last ? timeAgo(last) : "none yet",
      last ? "" : "Send a test to confirm delivery."));

    el.innerHTML = `<div class="rh-list">${rows.join("")}</div>`;
  }

  function toggleReminderHealth() {
    const el = getEls().reminderHealth;
    if (!el) return;
    if (el.hidden) { el.hidden = false; renderReminderHealth(); }
    else { el.hidden = true; }
  }

  function testReminder() {
    ensureAudioCtx();
    const sample = state.habits.find((h) => habitReminderTimes(h, new Date()).length && isHabitActiveOn(h, new Date()));
    if (sample) {
      fireGroupReminder([sample.id]);
    } else {
      if (soundEnabled()) { try { playChime(); } catch (e) {} }
      notify("🔔 Sample reminder", { body: "This is how a Momentum reminder looks.", tag: "ht-test" });
    }
    showReminderStatus("Test reminder sent. Nothing? Check notification permission below.", "success");
  }

  /* ---- App icon badge (pending count today) ---- */
  function updateBadge() {
    try {
      if (!("setAppBadge" in navigator)) return;
      const today = new Date();
      const pending = state.habits.filter((h) => isHabitActiveOn(h, today) && todayStatus(h, today) === "pending").length;
      if (pending > 0) navigator.setAppBadge(pending).catch(() => {});
      else navigator.clearAppBadge && navigator.clearAppBadge().catch(() => {});
    } catch (e) { /* unsupported */ }
  }
  async function toggleReminders() {
    const els = getEls();
    const on = els.remindersToggle.checked;
    if (on) {
      if (!("Notification" in window)) {
        els.remindersToggle.checked = false;
        showReminderStatus("This browser doesn't support notifications.", "warn");
        return;
      }
      let perm = Notification.permission;
      if (perm === "default") perm = await Notification.requestPermission();
      if (perm !== "granted") {
        els.remindersToggle.checked = false;
        localStorage.setItem(KEYS.remindersEnabled, "false");
        showReminderStatus("Notification permission denied. Reminders stay off.", "warn");
        return;
      }
      localStorage.setItem(KEYS.remindersEnabled, "true");
      scheduleReminders();
      const withTimes = state.habits.filter((h) => habitReminderTimes(h, new Date()).length > 0).length;
      showReminderStatus(withTimes > 0
        ? `Reminders on. ${withTimes} habit${withTimes === 1 ? "" : "s"} have a reminder time.`
        : "Reminders on. Set a reminder time on a habit to get notified.", "success");
    } else {
      localStorage.setItem(KEYS.remindersEnabled, "false");
      clearReminderTimers();
      showReminderStatus("Reminders off.", "success");
    }
    renderReminderInfo();
  }
  function showReminderStatus(msg, kind) {
    const el = $("#reminderStatus");
    if (!el) return;
    el.hidden = false;
    el.className = "sync-status " + (kind || "");
    el.textContent = msg;
  }

  function renderReminderInfo() {
    // Permission status
    const perm = $("#permStatus");
    if (perm) {
      if (!("Notification" in window)) {
        perm.className = "perm-status denied";
        perm.textContent = "🚫 Notifications not supported in this browser.";
      } else {
        const p = Notification.permission;
        if (p === "granted") { perm.className = "perm-status granted"; perm.textContent = "✓ Notifications allowed."; }
        else if (p === "denied") { perm.className = "perm-status denied"; perm.textContent = "🚫 Blocked. Enable notifications for this site in your browser/OS settings."; }
        else { perm.className = "perm-status default"; perm.textContent = "○ Not enabled yet. Toggle reminders on to allow."; }
      }
    }
    // Preview of today's scheduled reminder times
    const prev = $("#reminderPreview");
    if (prev) {
      if (!remindersEnabled() || (("Notification" in window) && Notification.permission !== "granted")) {
        prev.innerHTML = "";
      } else {
        const now = new Date();
        const times = new Set();
        for (const h of state.habits) {
          if (h.reminderTime && /^\d{2}:\d{2}$/.test(h.reminderTime) && isHabitActiveOn(h, now)) {
            const [hh, mm] = h.reminderTime.split(":").map(Number);
            if (!inQuietHours(hh, mm)) times.add(h.reminderTime);
          }
        }
        const md = localStorage.getItem(KEYS.morningDigest);
        const en = localStorage.getItem(KEYS.eveningNudge);
        const wr = localStorage.getItem(KEYS.weeklyReport);
        const extras = [];
        if (md) extras.push(`${md} digest`);
        if (en) extras.push(`${en} nudge`);
        if (wr) extras.push(`${wr} Sun summary`);
        const sorted = [...times].sort();
        if (sorted.length === 0 && extras.length === 0) {
          prev.innerHTML = "No reminder times set. Add a reminder time on a habit (in its edit screen).";
        } else {
          const all = [...sorted, ...extras];
          prev.innerHTML = `<b>Today's reminders:</b> ${all.map(escapeHtml).join(" · ")}`;
        }
        prev.innerHTML += `<br><span class="hint">Reminders fire while the app is open. Miss one because it was closed? You'll get a catch-up notification when you reopen Momentum.</span>`;
      }
    }
  }

  /* ---- Habits management ---- */
  let habitSearchTerm = "";
  let habitsView = "active"; // "active" | "archived"
  let bulkMode = false;
  const bulkSelected = new Set();

  function toggleBulkSelect(id) {
    if (bulkSelected.has(id)) bulkSelected.delete(id);
    else bulkSelected.add(id);
    renderHabits();
  }
  function updateBulkBar() {
    const els = getEls();
    if (!els.bulkBar) return;
    els.bulkBar.classList.toggle("hidden", !bulkMode);
    els.bulkToggleBtn.textContent = bulkMode ? "Cancel" : "Select";
    if (bulkMode) {
      els.bulkCount.textContent = `${bulkSelected.size} selected`;
      els.bulkMoveBtn.disabled = bulkSelected.size === 0;
      els.bulkDeleteBtn.disabled = bulkSelected.size === 0;
    }
  }
  function setBulkMode(on) {
    bulkMode = on;
    bulkSelected.clear();
    if (on) {
      const els = getEls();
      els.bulkCategory.innerHTML = getCategories().map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    }
    renderHabits();
  }
  function bulkMoveSelected() {
    const els = getEls();
    const cat = els.bulkCategory.value;
    if (!cat || bulkSelected.size === 0) return;
    const ts = Date.now();
    for (const h of state.habits) if (bulkSelected.has(h.id)) { h.category = cat; h.updatedAt = ts; }
    save();
    showToast(`Moved ${bulkSelected.size} to ${cat}.`, "success");
    setBulkMode(false);
  }
  function bulkDeleteSelected() {
    if (bulkSelected.size === 0) return;
    if (!confirm(`Delete ${bulkSelected.size} habit${bulkSelected.size === 1 ? "" : "s"} and their check-ins?`)) return;
    const ts = Date.now();
    for (const id of bulkSelected) { state.deletions.habits[id] = ts; }
    state.habits = state.habits.filter((h) => !bulkSelected.has(h.id));
    save();
    showToast("Deleted.", "success");
    setBulkMode(false);
  }

  // Habit currently being dragged between category groups (Habits tab).
  let draggingHabitId = null;
  function moveHabitToCategory(id, cat) {
    const h = state.habits.find((x) => x.id === id);
    if (!h || h.category === cat) return;
    const from = h.category;
    h.category = cat;
    h.updatedAt = Date.now();
    logActivity("move", `Moved ${h.icon || "•"} ${h.name} to ${cat}`);
    save();
    renderHabits();
    showToast(`Moved "${h.name}" from ${from} to ${cat}.`, "success");
  }

  function renderHabits() {
    const els = getEls();
    els.habitsGroups.innerHTML = "";
    updateBulkBar();
    if (state.habits.length === 0) {
      els.habitsEmpty.classList.remove("hidden");
      els.deleteAllBtn.classList.add("hidden");
      els.bulkToggleBtn.classList.add("hidden");
      return;
    }
    els.habitsEmpty.classList.add("hidden");
    els.deleteAllBtn.classList.remove("hidden");
    els.bulkToggleBtn.classList.remove("hidden");

    const term = (habitSearchTerm || "").trim().toLowerCase();
    const archivedCount = state.habits.filter((h) => h.archived).length;
    // Active / Archived filter chips (only when there are archived habits).
    if (archivedCount > 0) {
      const chips = document.createElement("div");
      chips.className = "habit-view-chips";
      const activeCount = state.habits.length - archivedCount;
      chips.innerHTML =
        `<button type="button" class="view-chip${habitsView === "active" ? " on" : ""}" data-view="active">Active (${activeCount})</button>` +
        `<button type="button" class="view-chip${habitsView === "archived" ? " on" : ""}" data-view="archived">Archived (${archivedCount})</button>`;
      chips.querySelectorAll(".view-chip").forEach((b) =>
        b.addEventListener("click", () => { habitsView = b.dataset.view; renderHabits(); }));
      els.habitsGroups.appendChild(chips);
    } else if (habitsView === "archived") {
      habitsView = "active";
    }

    const visible = state.habits.filter((h) => {
      if (habitsView === "archived" ? !h.archived : h.archived) return false;
      if (term) return (h.name || "").toLowerCase().includes(term) || (h.notes || "").toLowerCase().includes(term);
      return true;
    });

    const cats = getCategories();
    const groupMap = new Map();
    for (const cat of cats) groupMap.set(cat, []);
    for (const h of visible) {
      if (!groupMap.has(h.category)) groupMap.set(h.category, []); // preserve unknown categories
      groupMap.get(h.category).push(h);
    }
    if (visible.length === 0) {
      const msg = term ? `No habits match “${escapeHtml(term)}”.`
        : habitsView === "archived" ? "No archived habits." : "No active habits.";
      els.habitsGroups.insertAdjacentHTML("beforeend", `<div class="empty-state"><p>${msg}</p></div>`);
      return;
    }

    for (const cat of groupMap.keys()) {
      const list = groupMap.get(cat);
      if (!list || list.length === 0) continue;
      const wrap = document.createElement("div");
      wrap.className = "cat-drop";
      // Drop target: dragging a habit here moves it to this category.
      wrap.addEventListener("dragover", (e) => {
        if (!draggingHabitId) return;
        e.preventDefault();
        wrap.classList.add("drop-over");
      });
      wrap.addEventListener("dragleave", () => wrap.classList.remove("drop-over"));
      wrap.addEventListener("drop", (e) => {
        e.preventDefault();
        wrap.classList.remove("drop-over");
        if (draggingHabitId) moveHabitToCategory(draggingHabitId, cat);
      });
      const heading = document.createElement("div");
      heading.className = "category-group-title";
      const cmeta = categoryMeta(cat);
      heading.innerHTML = `<span><span class="cat-head-icon" style="color:${escapeHtml(cmeta.color)}">${escapeHtml(cmeta.icon)}</span> ${escapeHtml(cat)}</span><span class="time-group-count">${list.length}</span>`;
      wrap.appendChild(heading);

      const ul = document.createElement("ul");
      ul.className = "habit-list";
      for (const habit of list) {
        const li = document.createElement("li");
        li.className = "habit-item";
        li.style.cursor = "pointer";
        if (!bulkMode) {
          // Drag a habit onto another category group to move it.
          li.setAttribute("draggable", "true");
          li.addEventListener("dragstart", (e) => {
            draggingHabitId = habit.id;
            li.classList.add("dragging");
            if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", habit.id); } catch (_) {} }
          });
          li.addEventListener("dragend", () => { draggingHabitId = null; li.classList.remove("dragging"); });
        }
        if (bulkMode) {
          li.classList.add("selectable");
          if (bulkSelected.has(habit.id)) li.classList.add("selected");
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.className = "bulk-check";
          cb.checked = bulkSelected.has(habit.id);
          cb.setAttribute("aria-label", `Select ${habit.name}`);
          li.appendChild(cb);
          li.addEventListener("click", () => toggleBulkSelect(habit.id));
        } else {
          li.addEventListener("click", () => openHabitDetail(habit));
        }

        const icon = document.createElement("div");
        icon.className = "habit-icon";
        icon.style.background = habit.color;
        icon.textContent = habit.icon;

        const info = document.createElement("div");
        info.className = "habit-info";
        const name = document.createElement("div");
        name.className = "habit-name";
        name.textContent = habit.name;
        const meta = document.createElement("div");
        meta.className = "habit-meta";
        const parts = [];
        parts.push(fmtFrequency(habit.days));
        if (habit.time) parts.push(habit.time);
        parts.push(fmtTargetLabel(habit));
        meta.textContent = parts.join(" · ");
        info.appendChild(name);
        info.appendChild(meta);
        if (habit.notes) {
          const notes = document.createElement("div");
          notes.className = "habit-notes";
          notes.textContent = habit.notes;
          notes.title = habit.notes;
          info.appendChild(notes);
        }

        const chev = document.createElement("span");
        chev.className = "row-chevron";
        chev.textContent = "›";

        const arch = document.createElement("button");
        arch.className = "row-archive";
        arch.type = "button";
        arch.textContent = habit.archived ? "⤴" : "🗄";
        arch.title = habit.archived ? "Unarchive" : "Archive (pause)";
        arch.setAttribute("aria-label", (habit.archived ? "Unarchive " : "Archive ") + habit.name);
        arch.addEventListener("click", (e) => {
          e.stopPropagation();
          setHabitArchived(habit.id, !habit.archived);
        });

        const del = document.createElement("button");
        del.className = "row-delete";
        del.type = "button";
        del.textContent = "×";
        del.setAttribute("aria-label", `Delete ${habit.name}`);
        del.addEventListener("click", (e) => {
          e.stopPropagation();
          if (deleteHabitById(habit.id)) renderHabits();
        });

        li.appendChild(icon);
        li.appendChild(info);
        if (!bulkMode) {
          li.appendChild(arch);
          li.appendChild(chev);
          li.appendChild(del);
        }
        ul.appendChild(li);
      }
      wrap.appendChild(ul);
      els.habitsGroups.appendChild(wrap);
    }
  }

  /* ---- Reminder-time editor (multiple times per habit) ---- */
  function addReminderTimeRow(value) {
    const els = getEls();
    const row = document.createElement("div");
    row.className = "reminder-time-row";
    const inp = document.createElement("input");
    inp.type = "time";
    inp.className = "reminder-time-input";
    if (value) inp.value = value;
    inp.addEventListener("change", syncTimeFromReminders);
    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "reminder-time-remove";
    rm.textContent = "×";
    rm.setAttribute("aria-label", "Remove reminder time");
    rm.addEventListener("click", () => { row.remove(); syncTimeFromReminders(); });
    row.appendChild(inp);
    row.appendChild(rm);
    els.habitReminderList.appendChild(row);
  }
  function renderReminderTimeInputs(times) {
    const els = getEls();
    els.habitReminderList.innerHTML = "";
    const list = (times || []).filter((t) => /^\d{2}:\d{2}$/.test(t));
    if (list.length === 0) addReminderTimeRow("");
    else list.forEach((t) => addReminderTimeRow(t));
  }
  function collectReminderTimes() {
    const els = getEls();
    const out = [];
    els.habitReminderList.querySelectorAll(".reminder-time-input").forEach((inp) => {
      if (/^\d{2}:\d{2}$/.test(inp.value) && !out.includes(inp.value)) out.push(inp.value);
    });
    return out.sort();
  }
  // Is the "Time of day" text just an auto-generated summary of clock times
  // (so we can safely refresh it), vs. custom text like "8:00 AM · with meal"?
  function isAutoTimeSummary(str) {
    return str === "" || /^\s*\d{1,2}:\d{2}(\s?[AP]M)?(\s*&\s*\d{1,2}:\d{2}(\s?[AP]M)?)*\s*$/i.test(str);
  }
  // Keep the "Time of day" field in sync with the reminder times, unless the
  // user has typed their own descriptive label there.
  function syncTimeFromReminders() {
    const els = getEls();
    if (!els.habitTime) return;
    const times = collectReminderTimes();
    if (times.length === 0) return;
    const cur = (els.habitTime.value || "").trim();
    if (isAutoTimeSummary(cur)) {
      els.habitTime.value = times.map(fmtClockLabel).join(" & ");
    }
    updateFormSmartHints();
  }

  // Live smart hints in the habit form: dose spacing warning + a suggestion to
  // switch a yes/no habit to a per-dose count habit.
  function currentFormType() {
    const els = getEls();
    const sel = els.typePicker && els.typePicker.querySelector(".type-btn.selected");
    return sel && sel.dataset.type === "count" ? "count" : "check";
  }
  function updateFormSmartHints() {
    const els = getEls();
    if (!els.habitReminderList) return;
    const times = collectReminderTimes();
    const type = currentFormType();
    // Dose spacing warning.
    if (els.habitDoseSpacingHint) {
      const warn = doseSpacingWarning(times);
      els.habitDoseSpacingHint.textContent = warn ? "⏱️ " + warn : "";
      els.habitDoseSpacingHint.hidden = !warn;
    }
    // Count-setup suggestion (only for yes/no habits).
    if (els.habitCountSuggest) {
      const name = els.habitName ? els.habitName.value : "";
      const sug = suggestCountSetup(name, times.length, type);
      if (sug) {
        els.habitCountSuggest.dataset.target = String(sug.target);
        if (els.habitCountSuggestText) els.habitCountSuggestText.textContent = `This looks like a ${sug.target}× a day habit. Track each dose separately?`;
        els.habitCountSuggest.hidden = false;
      } else {
        els.habitCountSuggest.hidden = true;
      }
    }
  }
  // Apply the count-setup suggestion: switch to count + set the target.
  function applyCountSuggestion() {
    const els = getEls();
    const target = Number(els.habitCountSuggest && els.habitCountSuggest.dataset.target) || 2;
    els.typePicker.querySelectorAll(".type-btn").forEach((b) => b.classList.toggle("selected", b.dataset.type === "count"));
    els.countFields.classList.remove("hidden");
    if (els.habitTarget) els.habitTarget.value = target;
    if (els.habitIncrement && !els.habitIncrement.value) els.habitIncrement.value = 1;
    els.habitCountSuggest.hidden = true;
  }

  /* ---- Natural-language quick-add ---- */
  // Parse "meditate 10 min every morning" into a habit draft. Pure + tested.
  function parseQuickAdd(text) {
    const raw = (text || "").trim();
    if (!raw) return null;
    const pad = (n) => String(n).padStart(2, "0");
    let s = " " + raw.toLowerCase() + " ";
    const res = { name: "", days: null, freqType: "days", weeklyTarget: 3, time: "", reminderTime: "", type: "check", target: 1, unit: "", increment: 1, quit: false };
    // Fragments matched here are removed from the ORIGINAL text later so the
    // habit name keeps its casing (e.g. "ACV", "Cinnamon Turmeric ACV").
    const consumed = [];
    const eat = (frag) => { if (frag) consumed.push(frag); };

    // Quit intent (starts with no/quit/stop/avoid)
    const qm = raw.toLowerCase().match(/^(no|quit|stop|avoid|give up)\b/);
    if (qm) res.quit = true;

    // Clock time (am/pm, or "at HH:MM")
    let m = s.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/);
    if (m) {
      let hr = +m[1]; const mn = m[2] ? +m[2] : 0; const pm = /p/.test(m[3]);
      if (pm && hr < 12) hr += 12; if (!pm && hr === 12) hr = 0;
      // Only accept a valid time-of-day; ignore junk like "8:88am" or "45am".
      if (hr >= 0 && hr <= 23 && mn >= 0 && mn <= 59) res.reminderTime = pad(hr) + ":" + pad(mn);
      s = s.replace(m[0], " "); eat(m[0]);
    } else {
      m = s.match(/\bat\s+(\d{1,2}):(\d{2})\b/);
      if (m) {
        const hr = +m[1], mn = +m[2];
        if (hr >= 0 && hr <= 23 && mn >= 0 && mn <= 59) res.reminderTime = pad(hr) + ":" + pad(mn);
        s = s.replace(m[0], " "); eat(m[0]);
      }
    }

    // Part of day
    const partMap = [["morning", "Morning", "08:00"], ["afternoon", "Afternoon", "14:00"], ["evening", "Evening", "19:00"], ["night", "Night", "21:00"], ["noon", "Afternoon", "12:00"]];
    for (const [word, label, def] of partMap) {
      const re = new RegExp("\\b(?:in the |every |each )?" + word + "s?\\b");
      const pm2 = s.match(re);
      if (pm2) { res.time = res.time || label; if (!res.reminderTime) res.reminderTime = def; s = s.replace(re, " "); eat(pm2[0]); }
    }

    // N times per week
    m = s.match(/\b(\d+)\s*(?:x|times?)\s*(?:a|per|\/)\s*week\b/);
    if (m) { res.freqType = "weekly"; res.weeklyTarget = Math.min(14, Math.max(1, +m[1])); s = s.replace(m[0], " "); eat(m[0]); }

    // N times per day → a count habit with a daily target (e.g. "twice a day")
    let dm = s.match(/\b(\d+)\s*(?:x|times?)\s*(?:a|per|\/)?\s*day\b/);
    if (!dm) {
      const wordNum = { once: 1, twice: 2, thrice: 3, two: 2, three: 3, four: 4, five: 5 };
      const wm = s.match(/\b(once|twice|thrice|two|three|four|five)\s*(?:times?)?\s*(?:a|per)?\s*day\b/);
      if (wm) dm = [wm[0], String(wordNum[wm[1]])];
    }
    if (dm) {
      const n = Math.max(1, Math.min(20, +dm[1]));
      if (n > 1) { res.type = "count"; res.target = n; res.unit = ""; res.increment = 1; }
      s = s.replace(dm[0], " "); eat(dm[0]);
    }

    // Weekday / weekend / everyday
    let wm2;
    if ((wm2 = s.match(/\b(?:on\s+)?weekdays?\b/))) { res.days = [1, 2, 3, 4, 5]; s = s.replace(/\b(?:on\s+)?weekdays?\b/g, " "); eat(wm2[0]); }
    if ((wm2 = s.match(/\b(?:on\s+)?weekends?\b/))) { res.days = [0, 6]; s = s.replace(/\b(?:on\s+)?weekends?\b/g, " "); eat(wm2[0]); }
    if ((wm2 = s.match(/\b(?:every\s?day|daily|everyday)\b/))) { res.days = [0, 1, 2, 3, 4, 5, 6]; s = s.replace(/\b(?:every\s?day|daily|everyday)\b/g, " "); eat(wm2[0]); }

    // Specific weekday names
    const dayNames = { sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tues: 2, tue: 2, wednesday: 3, weds: 3, wed: 3, thursday: 4, thurs: 4, thur: 4, thu: 4, friday: 5, fri: 5, saturday: 6, sat: 6 };
    const foundDays = new Set();
    for (const [name, idx] of Object.entries(dayNames)) {
      const re = new RegExp("\\b" + name + "\\b", "g");
      if (re.test(s)) { foundDays.add(idx); s = s.replace(new RegExp("\\b" + name + "\\b", "g"), " "); eat(name); }
    }
    if (foundDays.size) res.days = [...foundDays].sort();

    // Count amount: number + unit
    const unitMap = { min: "min", mins: "min", minute: "min", minutes: "min", l: "L", litre: "L", litres: "L", liter: "L", liters: "L", g: "g", gram: "g", grams: "g", step: "steps", steps: "steps", page: "pages", pages: "pages", rep: "reps", reps: "reps", oz: "oz", ml: "ml", cup: "cups", cups: "cups", glass: "glasses", glasses: "glasses", km: "km", mile: "miles", miles: "miles" };
    m = s.match(/\b(\d+(?:\.\d+)?)\s*(mins?|minutes?|l|litres?|liters?|g|grams?|steps?|pages?|reps?|oz|ml|cups?|glass(?:es)?|km|miles?)\b/);
    if (m) {
      res.type = "count"; res.target = Math.max(1, +m[1]); res.unit = unitMap[m[2]] || m[2];
      res.increment = res.unit === "L" ? 0.5 : res.unit === "steps" ? 1000 : res.unit === "min" ? 5 : res.unit === "g" ? 10 : res.unit === "pages" ? 5 : 1;
      s = s.replace(m[0], " "); eat(m[0]);
    }

    // Build the name from the ORIGINAL text (preserve casing) minus consumed bits.
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let name = raw;
    for (const frag of consumed) {
      const f = frag.trim();
      if (f) name = name.replace(new RegExp("\\b" + esc(f) + "\\b", "i"), " ");
    }
    name = name.replace(/\b(every|each|at|a|an|the|per|on|of|in|for|to|do|my|some)\b/gi, " ");
    name = name.replace(/^\s*(no|quit|stop|avoid|give up)\s+/i, " ");
    name = name.replace(/\s+/g, " ").trim();
    res.name = name ? name.charAt(0).toUpperCase() + name.slice(1) : "";
    return res;
  }

  // Open the habit modal pre-filled from a natural-language draft.
  function quickAddHabit(text) {
    const p = parseQuickAdd(text);
    if (!p || !p.name) { showToast("Try something like \"Meditate 10 min every morning\".", "warn"); return; }
    openHabitModal(null);
    const els = getEls();
    els.habitName.value = p.name;
    // Type
    const type = p.type === "count" ? "count" : "check";
    els.typePicker.querySelectorAll(".type-btn").forEach((b) => b.classList.toggle("selected", b.dataset.type === type));
    els.countFields.classList.toggle("hidden", type !== "count");
    if (type === "count") {
      els.habitTarget.value = p.target;
      els.habitUnit.value = p.unit;
      els.habitIncrement.value = p.increment;
    }
    if (p.time) els.habitTime.value = p.time;
    if (p.reminderTime) renderReminderTimeInputs([p.reminderTime]);
    els.habitQuit.checked = !!p.quit;
    // Frequency
    if (p.freqType === "weekly") {
      els.habitWeeklyTarget.value = p.weeklyTarget;
      applyFreqType("weekly");
    } else if (p.days) {
      applyFreqType("days");
      els.daysPicker.querySelectorAll("button").forEach((b) => {
        b.classList.toggle("selected", p.days.includes(Number(b.dataset.day)));
      });
    }
    showToast("Review and save your habit.", "success");
  }

  /* ---- Habit modal ---- */
  function applyFreqType(freq) {
    const els = getEls();
    const weekly = freq === "weekly";
    els.freqType.querySelectorAll(".freq-opt").forEach((b) =>
      b.classList.toggle("active", b.dataset.freq === freq));
    els.daysWrap.classList.toggle("hidden", weekly);
    els.weeklyWrap.classList.toggle("hidden", !weekly);
    els.freqType.dataset.value = freq;
  }

  function openHabitModal(habit) {
    const els = getEls();
    editingId = habit ? habit.id : null;
    els.modalTitle.textContent = habit ? "Edit habit" : "New habit";
    els.deleteBtn.classList.toggle("hidden", !habit);

    // Ensure the category dropdown reflects the current (possibly edited) list.
    populateCategorySelects();
    const cats = getCategories();
    const defaultCat = cats.includes("Custom") ? "Custom" : cats[cats.length - 1];
    els.habitName.value = habit ? habit.name : "";
    els.habitCategory.value = habit ? habit.category : defaultCat;
    if (habit && !cats.includes(habit.category)) {
      // Habit has a category no longer in the list — add a temporary option so it shows.
      const opt = document.createElement("option");
      opt.value = habit.category; opt.textContent = habit.category;
      els.habitCategory.appendChild(opt);
      els.habitCategory.value = habit.category;
    }
    els.habitTime.value = habit ? habit.time : "";
    const initTimes = habit
      ? (habit.reminderTimes && habit.reminderTimes.length ? habit.reminderTimes : (habit.reminderTime ? [habit.reminderTime] : []))
      : (localStorage.getItem(KEYS.reminderDefault) ? [localStorage.getItem(KEYS.reminderDefault)] : []);
    renderReminderTimeInputs(initTimes);
    els.habitReminderMsg.value = habit ? (habit.reminderMsg || "") : "";
    els.habitNotes.value = habit ? (habit.notes || "") : "";
    updateFormSmartHints();
    // Habit-stacking anchor: any other habit can be the trigger (exclude self).
    const anchorOpts = ['<option value="">— On its own —</option>'].concat(
      state.habits
        .filter((h) => (!editingId || h.id !== editingId) && !h.archived)
        .map((h) => `<option value="${escapeHtml(h.id)}">${escapeHtml((h.icon || "•") + " " + h.name)}</option>`)
    );
    els.habitAnchor.innerHTML = anchorOpts.join("");
    els.habitAnchor.value = habit && habit.anchorId ? habit.anchorId : "";
    els.habitNightPrevDay.checked = habit ? !!habit.nightPrevDay : false;
    els.habitNoPush.checked = habit ? !!habit.noPush : false;
    els.habitQuit.checked = habit ? !!habit.quit : false;
    els.habitTarget.value = habit && habit.type === "count" ? habit.target : "";
    els.habitUnit.value = habit ? habit.unit : "";
    els.habitIncrement.value = habit && habit.type === "count" ? habit.increment : "";

    const type = habit ? habit.type : "check";
    els.typePicker.querySelectorAll(".type-btn").forEach((b) => b.classList.toggle("selected", b.dataset.type === type));
    els.countFields.classList.toggle("hidden", type !== "count");

    els.iconPicker.innerHTML = "";
    const selectedIcon = habit ? habit.icon : ICONS[0];
    for (const ic of ICONS) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = ic;
      b.dataset.icon = ic;
      if (ic === selectedIcon) b.classList.add("selected");
      b.addEventListener("click", () => {
        els.iconPicker.querySelectorAll("button").forEach((x) => x.classList.remove("selected"));
        b.classList.add("selected");
      });
      els.iconPicker.appendChild(b);
    }
    els.colorPicker.innerHTML = "";
    const selectedColor = habit ? habit.color : COLORS[0];
    for (const c of COLORS) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.color = c;
      b.style.background = c;
      b.setAttribute("aria-label", `Color ${c}`);
      if (c === selectedColor) b.classList.add("selected");
      b.addEventListener("click", () => {
        els.colorPicker.querySelectorAll("button").forEach((x) => x.classList.remove("selected"));
        b.classList.add("selected");
      });
      els.colorPicker.appendChild(b);
    }
    els.daysPicker.innerHTML = "";
    const selectedDays = new Set(habit ? habit.days : [0,1,2,3,4,5,6]);
    for (const d of DAY_DISPLAY) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = d.label;
      b.dataset.day = String(d.idx);
      b.title = d.full;
      if (selectedDays.has(d.idx)) b.classList.add("selected");
      b.addEventListener("click", () => b.classList.toggle("selected"));
      els.daysPicker.appendChild(b);
    }

    // Frequency type: "days" (specific weekdays) vs "weekly" (N times/week)
    const freq = habit && habit.freqType === "weekly" ? "weekly" : "days";
    els.habitWeeklyTarget.value = habit && habit.weeklyTarget ? habit.weeklyTarget : 3;
    applyFreqType(freq);
    els.freqType.querySelectorAll(".freq-opt").forEach((b) => {
      b.onclick = () => applyFreqType(b.dataset.freq);
    });

    // Advanced: per-day time overrides
    els.dayTimesGrid.innerHTML = "";
    const dt = (habit && habit.dayTimes) ? habit.dayTimes : {};
    for (const d of DAY_DISPLAY) {
      const stored = dt[d.idx];
      const pm = stored ? parseTimeToMinutes(timeChipLabel(stored) || stored) : null;
      // Only prefill the time input from an actual clock value; descriptive
      // overrides ("All day") return a sentinel that must not become "00:01".
      const hhmm = (pm != null && pm < 24 * 60) ? minToHHMM(pm) : "";
      const row = document.createElement("div");
      row.className = "day-time-row";
      row.innerHTML = `<span class="dt-day">${d.full}</span><input type="time" data-daytime="${d.idx}" value="${hhmm}" />`;
      els.dayTimesGrid.appendChild(row);
    }
    const hasOverrides = Object.keys(dt).length > 0;
    els.dayTimesWrap.classList.toggle("hidden", !hasOverrides);
    els.advancedToggle.classList.toggle("open", hasOverrides);

    els.modal.classList.remove("hidden");
    setTimeout(() => els.habitName.focus(), 50);
  }

  function closeModal() {
    getEls().modal.classList.add("hidden");
    editingId = null;
  }

  function submitHabitForm(e) {
    e.preventDefault();
    const els = getEls();
    const name = els.habitName.value.trim();
    if (!name) return;

    const selectedType = els.typePicker.querySelector(".selected")?.dataset.type || "check";
    const category = els.habitCategory.value;
    const icon = els.iconPicker.querySelector(".selected")?.dataset.icon || ICONS[0];
    const color = els.colorPicker.querySelector(".selected")?.dataset.color || COLORS[0];
    const days = Array.from(els.daysPicker.querySelectorAll(".selected")).map((b) => Number(b.dataset.day));
    const freqType = els.freqType.dataset.value === "weekly" ? "weekly" : "days";
    let weeklyTargetVal = Math.round(Number(els.habitWeeklyTarget.value));
    if (!Number.isFinite(weeklyTargetVal) || weeklyTargetVal < 1) weeklyTargetVal = 1;
    if (weeklyTargetVal > 14) weeklyTargetVal = 14;

    let target = 1, unit = "", increment = 1;
    if (selectedType === "count") {
      const t = Number(els.habitTarget.value);
      if (!Number.isFinite(t) || t <= 0) return alert("Enter a target greater than 0.");
      target = t;
      unit = els.habitUnit.value.trim();
      const inc = Number(els.habitIncrement.value);
      increment = Number.isFinite(inc) && inc > 0 ? inc : 1;
    }

    const dayTimes = {};
    els.dayTimesGrid.querySelectorAll("input[data-daytime]").forEach((inp) => {
      if (inp.value) dayTimes[inp.dataset.daytime] = minToClock(hhmmToMin(inp.value));
    });

    const now = Date.now();
    const payload = {
      name, icon, color, category,
      type: selectedType,
      target, unit, increment,
      time: els.habitTime.value.trim(),
      dayTimes,
      reminderTime: collectReminderTimes()[0] || "",
      reminderTimes: collectReminderTimes(),
      reminderMsg: (els.habitReminderMsg.value || "").trim().slice(0, 120),
      nightPrevDay: !!els.habitNightPrevDay.checked,
      noPush: !!els.habitNoPush.checked,
      quit: !!els.habitQuit.checked,
      notes: (els.habitNotes.value || "").trim().slice(0, 500),
      days: days.length ? days : [0,1,2,3,4,5,6],
      freqType,
      weeklyTarget: weeklyTargetVal,
      anchorId: els.habitAnchor.value || "",
      updatedAt: now,
    };

    if (editingId) {
      const h = state.habits.find((x) => x.id === editingId);
      if (h) Object.assign(h, payload);
      logActivity("edit", `Edited ${payload.icon || "•"} ${payload.name}`);
    } else {
      state.habits.push({
        id: uid(),
        createdAt: new Date(now).toISOString(),
        order: state.habits.length,
        ...payload,
      });
      logActivity("create", `Added ${payload.icon || "•"} ${payload.name}`);
    }
    save();
    scheduleReminders();
    closeModal();
    switchView(currentView);
  }

  /* ---- Guided weekly review ---- */
  function weekKeyOf(date) { return dateKey(startOfWeekMonday(date)); }

  // Which week to review right now: on Sunday, this week (it ends today);
  // Mon-Wed, last week (just ended) if it hasn't been reviewed yet.
  function reviewTargetWeek() {
    const today = new Date();
    const dow = today.getDay(); // 0 = Sun
    if (dow === 0) return startOfWeekMonday(today);
    if (dow >= 1 && dow <= 3) return addDays(startOfWeekMonday(today), -7);
    return null;
  }

  function computeWeekReview(weekStart) {
    const now = new Date();
    const adherence = weekAdherencePct(weekStart);
    const prevAdh = weekAdherencePct(addDays(weekStart, -7));
    let totalDone = 0;
    const dayDone = new Array(7).fill(0);
    const habitDone = {};
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      if (d > now && !sameDay(d, now)) break;
      for (const h of state.habits) {
        if (h.archived) continue;
        if (isCompleted(h, d)) { totalDone++; dayDone[i]++; habitDone[h.id] = (habitDone[h.id] || 0) + 1; }
      }
    }
    let bestIdx = -1, bestVal = -1;
    for (let i = 0; i < 7; i++) if (dayDone[i] > bestVal) { bestVal = dayDone[i]; bestIdx = i; }
    let topId = null, topVal = 0;
    for (const [id, c] of Object.entries(habitDone)) if (c > topVal) { topVal = c; topId = id; }
    const topHabit = state.habits.find((h) => h.id === topId) || null;
    let bestStreak = 0;
    for (const h of state.habits) if (!h.archived) { const s = currentStreak(h); if (s > bestStreak) bestStreak = s; }
    return { adherence, prevAdh, totalDone, bestIdx, bestVal, topHabit, topVal, bestStreak };
  }

  const WEEK_DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function renderReviewPrompt() {
    const els = getEls();
    const el = els.reviewPrompt;
    if (!el) return;
    const ws = reviewTargetWeek();
    if (!ws || state.habits.length === 0) { el.classList.add("hidden"); return; }
    const wk = dateKey(ws);
    if (state.reviews && state.reviews[wk]) { el.classList.add("hidden"); return; }
    if (localStorage.getItem("ht_review_dismissed") === wk) { el.classList.add("hidden"); return; }
    const r = computeWeekReview(ws);
    el.classList.remove("hidden");
    el.innerHTML =
      `<div class="review-prompt-body">
        <span class="review-prompt-icon">📋</span>
        <div class="review-prompt-text">
          <b>Your week in review</b>
          <span class="hint">${r.adherence == null ? "See how the week went" : r.adherence + "% adherence"} · set next week's focus</span>
        </div>
      </div>
      <div class="review-prompt-actions">
        <button type="button" class="btn-secondary" id="reviewDismissBtn">Later</button>
        <button type="button" class="btn-primary" id="reviewOpenBtn">Review</button>
      </div>`;
    el.querySelector("#reviewOpenBtn").addEventListener("click", () => openWeeklyReview(ws));
    el.querySelector("#reviewDismissBtn").addEventListener("click", () => {
      localStorage.setItem("ht_review_dismissed", wk);
      el.classList.add("hidden");
    });
  }

  /* ---- Activity log ---- */
  function logActivity(type, text) {
    if (!Array.isArray(state.activity)) state.activity = [];
    state.activity.unshift({ ts: Date.now(), type: String(type || "").slice(0, 20), text: String(text || "").slice(0, 140) });
    state.activity = state.activity.slice(0, 50);
    // Persistence is handled by the caller's save(); guard direct calls in tests.
  }
  function renderActivityLog() {
    const el = getEls().activityLog;
    if (!el) return;
    const acts = (state.activity || []).slice(0, 30);
    if (acts.length === 0) {
      el.innerHTML = `<p class="empty-inline">No recent activity yet. Changes you make will show up here.</p>`;
      return;
    }
    el.innerHTML = acts.map((a) =>
      `<div class="act-row"><span class="act-text">${escapeHtml(a.text)}</span><span class="act-when">${escapeHtml(timeAgo(a.ts))}</span></div>`
    ).join("");
  }
  function toggleActivityLog() {
    const el = getEls().activityLog;
    if (!el) return;
    if (el.hidden) { el.hidden = false; renderActivityLog(); } else { el.hidden = true; }
  }

  /* ---- Keystone habit of the week ---- */
  function keystoneId() {
    const wk = weekKeyOf(new Date());
    return (state.keystone && state.keystone[wk]) || null;
  }
  function getKeystoneHabit() {
    const id = keystoneId();
    if (!id) return null;
    return state.habits.find((h) => h.id === id && !h.archived) || null;
  }
  function setKeystone(habitId) {
    if (!state.keystone) state.keystone = {};
    const wk = weekKeyOf(new Date());
    if (habitId) state.keystone[wk] = habitId; else delete state.keystone[wk];
    save();
    renderKeystone();
    if (currentView === "today") renderToday();
  }
  function renderKeystone() {
    const el = getEls().keystoneCard;
    if (!el) return;
    const active = state.habits.filter((h) => !h.archived);
    if (active.length === 0) { el.classList.add("hidden"); el.innerHTML = ""; return; }
    const h = getKeystoneHabit();
    el.classList.remove("hidden");
    if (!h) {
      el.innerHTML =
        `<div class="ks-head"><span class="ks-icon">⭐</span><b>Pick your focus this week</b></div>
         <p class="hint">Choose one keystone habit to prioritize — small wins here lift everything else.</p>
         <select id="keystoneSelect" class="filter-select" style="width:100%">
           <option value="">Choose a habit…</option>
           ${active.map((x) => `<option value="${escapeHtml(x.id)}">${escapeHtml((x.icon || "•") + " " + x.name)}</option>`).join("")}
         </select>`;
      const sel = el.querySelector("#keystoneSelect");
      if (sel) sel.addEventListener("change", () => setKeystone(sel.value));
      return;
    }
    const today = new Date();
    const streak = currentStreak(h);
    let progressLine;
    if (isWeekly(h)) {
      progressLine = `${weeklyDoneCount(h, today)}/${weeklyTarget(h)} this week`;
    } else {
      const wp = weeklyProgress(h);
      progressLine = wp.weekTotal > 0 ? `${wp.done}/${wp.weekTotal} this week` : `${streak}-day streak`;
    }
    const doneToday = isCompleted(h, today);
    el.innerHTML =
      `<div class="ks-head"><span class="ks-icon">⭐</span><b>Focus this week</b>
        <button type="button" class="ks-change" id="keystoneChange">Change</button></div>
       <div class="ks-body">
         <span class="habit-icon" style="background:${escapeHtml(h.color)}">${escapeHtml(h.icon || "🎯")}</span>
         <div class="ks-info"><div class="ks-name">${escapeHtml(h.name)}</div>
           <div class="ks-meta">${escapeHtml(progressLine)}${streak > 0 ? " · 🔥 " + streak : ""}${doneToday ? " · ✓ done today" : ""}</div>
         </div>
       </div>`;
    const chg = el.querySelector("#keystoneChange");
    if (chg) chg.addEventListener("click", () => setKeystone(""));
  }

  /* ---- Vacation / pause mode ---- */
  function setVacation(start, end, note) {
    if (!start || !end) return;
    if (end < start) { const t = start; start = end; end = t; }
    state.vacation = { start, end, note: (note || "").slice(0, 120), updatedAt: Date.now() };
    save();
    scheduleReminders();      // pauses timers + re-syncs push (empty during vacation)
    renderVacationBanner();
    renderVacationSettings();
    if (currentView === "today") renderToday();
    showToast("🏝️ Vacation mode on — reminders paused, streaks safe.", "success");
  }
  function clearVacation() {
    state.vacation = { start: null, end: null, note: "", updatedAt: Date.now() };
    save();
    scheduleReminders();      // restore the normal reminder + push schedule
    renderVacationBanner();
    renderVacationSettings();
    if (currentView === "today") renderToday();
    showToast("Vacation mode off — welcome back.", "success");
  }
  function fmtVacRange() {
    const v = state.vacation;
    if (!v || !v.start || !v.end) return "";
    const s = new Date(v.start + "T00:00:00"), e = new Date(v.end + "T00:00:00");
    return `${formatDateShort(s)} – ${formatDateShort(e)}`;
  }
  function renderVacationBanner() {
    const el = getEls().vacationBanner;
    if (!el) return;
    if (!vacationActiveNow()) { el.classList.add("hidden"); el.innerHTML = ""; return; }
    const v = state.vacation;
    el.classList.remove("hidden");
    el.innerHTML =
      `<span class="vac-icon">🏝️</span>
       <div class="vac-text"><b>Vacation mode${v.note ? " · " + escapeHtml(v.note) : ""}</b>
       <span class="hint">Reminders paused, streaks protected · ${escapeHtml(fmtVacRange())}</span></div>
       <button type="button" id="vacEndBtn" class="vac-end">End</button>`;
    const btn = el.querySelector("#vacEndBtn");
    if (btn) btn.addEventListener("click", clearVacation);
  }
  function renderVacationSettings() {
    const els = getEls();
    if (!els.vacationStart) return;
    const v = state.vacation || {};
    const active = !!(v.start && v.end);
    els.vacationStart.value = v.start || "";
    els.vacationEnd.value = v.end || "";
    els.vacationNote.value = v.note || "";
    els.vacationClearBtn.hidden = !active;
    els.vacationSaveBtn.textContent = active ? "Update vacation" : "Start vacation";
    if (els.vacationStatus) {
      if (active) {
        const on = vacationActiveNow();
        els.vacationStatus.hidden = false;
        els.vacationStatus.className = "vacation-status " + (on ? "on" : "scheduled");
        els.vacationStatus.textContent = on
          ? `🏝️ Active now · ${fmtVacRange()}`
          : `📅 Scheduled · ${fmtVacRange()}`;
      } else {
        els.vacationStatus.hidden = true;
      }
    }
  }

  /* ---- Smart reminder timing ---- */
  // Record the clock time a habit was completed (today only), so we can learn
  // when it actually gets done and suggest a better reminder time.
  function recordCompletionClock(habitId, date) {
    if (!sameDay(date, new Date())) return;
    const now = new Date();
    const min = now.getHours() * 60 + now.getMinutes();
    if (!state.completionClock) state.completionClock = {};
    const rec = state.completionClock[habitId] || { samples: [], updatedAt: 0 };
    rec.samples = rec.samples.concat(min).slice(-50);
    rec.updatedAt = Date.now();
    state.completionClock[habitId] = rec;
    if (typeof document !== "undefined") save(); // persist (guarded for test sandbox)
  }
  function median(nums) {
    if (!nums.length) return null;
    const s = nums.slice().sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
  }
  // Suggest a reminder "HH:MM" from the median completion time; null if too few
  // samples. Rounds to the nearest 5 minutes.
  function suggestReminderTime(habitId) {
    const rec = state.completionClock && state.completionClock[habitId];
    if (!rec || rec.samples.length < 5) return null;
    let m = median(rec.samples);
    if (m == null) return null;
    m = Math.round(m / 5) * 5;
    return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  }

  // Per-dose completion-time learning: each dose slot of a multi-dose habit
  // learns the clock time it actually gets done, so we can suggest a better
  // time for that specific dose (not just the habit as a whole).
  function recordDoseClock(habitId, doseIndex, date) {
    if (!sameDay(date, new Date())) return;
    const now = new Date();
    const min = now.getHours() * 60 + now.getMinutes();
    if (!state.doseClock) state.doseClock = {};
    if (!state.doseClock[habitId]) state.doseClock[habitId] = {};
    const rec = state.doseClock[habitId][doseIndex] || { samples: [], updatedAt: 0 };
    rec.samples = rec.samples.concat(min).slice(-50);
    rec.updatedAt = Date.now();
    state.doseClock[habitId][doseIndex] = rec;
    if (typeof document !== "undefined") save();
  }
  function suggestDoseTime(habitId, doseIndex) {
    const rec = state.doseClock && state.doseClock[habitId] && state.doseClock[habitId][doseIndex];
    if (!rec || rec.samples.length < 5) return null;
    let m = median(rec.samples);
    if (m == null) return null;
    m = Math.round(m / 5) * 5;
    return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  }
  // Per-dose suggestions where the learned time differs from the scheduled dose
  // reminder by > 45 min. Returns [{habit, doseIndex, current, suggested, diff}].
  function doseTimingSuggestions() {
    const out = [];
    for (const h of state.habits) {
      if (h.archived) continue;
      const slots = doseSlots(h, new Date().getDay());
      if (!slots) continue;
      for (const sl of slots) {
        const sug = suggestDoseTime(h.id, sl.i);
        if (!sug) continue;
        const cur = sl.time && /^\d{2}:\d{2}$/.test(sl.time) ? sl.time : "";
        if (!cur) { out.push({ habit: h, doseIndex: sl.i, total: sl.total, current: "", suggested: sug, diff: 999 }); continue; }
        const [ch, cm] = cur.split(":").map(Number);
        const [sh, sm] = sug.split(":").map(Number);
        const diff = Math.abs((sh * 60 + sm) - (ch * 60 + cm));
        if (diff >= 45) out.push({ habit: h, doseIndex: sl.i, total: sl.total, current: cur, suggested: sug, diff });
      }
    }
    return out.sort((a, b) => b.diff - a.diff);
  }
  // Habits whose usual completion time differs from their reminder by > 45 min.
  function smartTimingSuggestions() {
    const out = [];
    for (const h of state.habits) {
      if (h.archived) continue;
      const sug = suggestReminderTime(h.id);
      if (!sug) continue;
      const cur = (h.reminderTimes && h.reminderTimes[0]) || h.reminderTime || "";
      if (!/^\d{2}:\d{2}$/.test(cur)) {
        out.push({ habit: h, suggested: sug, current: "", diff: 999 });
        continue;
      }
      const [ch, cm] = cur.split(":").map(Number);
      const [sh, sm] = sug.split(":").map(Number);
      const diff = Math.abs((sh * 60 + sm) - (ch * 60 + cm));
      if (diff >= 45) out.push({ habit: h, suggested: sug, current: cur, diff });
    }
    return out.sort((a, b) => b.diff - a.diff);
  }
  function applySmartTime(habitId, hhmm) {
    const h = state.habits.find((x) => x.id === habitId);
    if (!h || !/^\d{2}:\d{2}$/.test(hhmm)) return;
    h.reminderTimes = [hhmm];
    h.reminderTime = hhmm;
    h.updatedAt = Date.now();
    save();
    scheduleReminders();
    renderSmartTiming();
    showToast(`${h.icon || "⏰"} ${h.name} reminder moved to ${fmtClockLabel(hhmm)}.`, "success");
  }
  // Move one dose's reminder time (keeps the other dose times as they are).
  function applyDoseTime(habitId, doseIndex, hhmm) {
    const h = state.habits.find((x) => x.id === habitId);
    if (!h || !/^\d{2}:\d{2}$/.test(hhmm)) return;
    const times = (h.reminderTimes && h.reminderTimes.length ? h.reminderTimes.slice() : [])
      .filter((t) => /^\d{2}:\d{2}$/.test(t)).sort();
    if (doseIndex < times.length) times[doseIndex] = hhmm; else times.push(hhmm);
    const dedup = [];
    for (const t of times.sort()) if (!dedup.includes(t)) dedup.push(t);
    h.reminderTimes = dedup;
    h.reminderTime = dedup[0] || "";
    h.updatedAt = Date.now();
    save();
    scheduleReminders();
    renderSmartTiming();
    showToast(`${h.icon || "⏰"} ${h.name} dose ${doseIndex + 1} moved to ${fmtClockLabel(hhmm)}.`, "success");
  }
  function renderSmartTiming() {
    const el = getEls().smartTiming;
    if (!el) return;
    const sugg = smartTimingSuggestions();
    const dose = doseTimingSuggestions();
    if (sugg.length === 0 && dose.length === 0) {
      el.innerHTML = `<p class="empty-inline">No suggestions yet. Momentum learns when you actually complete habits and will suggest better reminder times here.</p>`;
      return;
    }
    const rows = sugg.map((s) =>
      `<div class="st-row">
        <span class="st-name">${escapeHtml((s.habit.icon || "•") + " " + s.habit.name)}</span>
        <span class="st-info">${s.current ? "now " + escapeHtml(fmtClockLabel(s.current)) + " → " : "set "}<b>${escapeHtml(fmtClockLabel(s.suggested))}</b></span>
        <button type="button" class="btn-secondary st-apply" data-id="${escapeHtml(s.habit.id)}" data-t="${escapeHtml(s.suggested)}">Use</button>
      </div>`
    );
    for (const s of dose) {
      rows.push(`<div class="st-row">
        <span class="st-name">${escapeHtml((s.habit.icon || "•") + " " + s.habit.name)} <span class="hint">dose ${s.doseIndex + 1} of ${s.total}</span></span>
        <span class="st-info">${s.current ? "now " + escapeHtml(fmtClockLabel(s.current)) + " → " : "set "}<b>${escapeHtml(fmtClockLabel(s.suggested))}</b></span>
        <button type="button" class="btn-secondary st-apply-dose" data-id="${escapeHtml(s.habit.id)}" data-i="${s.doseIndex}" data-t="${escapeHtml(s.suggested)}">Use</button>
      </div>`);
    }
    el.innerHTML = rows.join("");
    el.querySelectorAll(".st-apply").forEach((b) =>
      b.addEventListener("click", () => applySmartTime(b.dataset.id, b.dataset.t)));
    el.querySelectorAll(".st-apply-dose").forEach((b) =>
      b.addEventListener("click", () => applyDoseTime(b.dataset.id, Number(b.dataset.i), b.dataset.t)));
  }
  function toggleSmartTiming() {
    const el = getEls().smartTiming;
    if (!el) return;
    if (el.hidden) { el.hidden = false; renderSmartTiming(); } else { el.hidden = true; }
  }

  /* ---- Daily mood / energy quick-log ---- */
  const MOODS = [
    { v: 1, icon: "😫", label: "Drained" },
    { v: 2, icon: "😕", label: "Low" },
    { v: 3, icon: "😐", label: "Okay" },
    { v: 4, icon: "🙂", label: "Good" },
    { v: 5, icon: "🤩", label: "Great" },
  ];
  function setMood(v) {
    if (!state.moods) state.moods = {};
    const k = todayKey();
    if (state.moods[k] && state.moods[k].mood === v) {
      delete state.moods[k]; // tap again to clear
    } else {
      state.moods[k] = { mood: v, updatedAt: Date.now() };
    }
    save();
    renderMoodStrip();
  }
  function renderMoodStrip() {
    const el = getEls().moodStrip;
    if (!el) return;
    if (state.habits.length === 0) { el.innerHTML = ""; return; }
    const cur = state.moods && state.moods[todayKey()] ? state.moods[todayKey()].mood : 0;
    el.innerHTML =
      `<span class="mood-q">${cur ? "Energy today" : "How's your energy?"}</span>` +
      `<span class="mood-opts">` +
      MOODS.map((m) => `<button type="button" class="mood-btn${cur === m.v ? " on" : ""}" data-mood="${m.v}" title="${m.label}" aria-label="${m.label}">${m.icon}</button>`).join("") +
      `</span>`;
    el.querySelectorAll(".mood-btn").forEach((b) => b.addEventListener("click", () => setMood(Number(b.dataset.mood))));
  }

  // Daily mood vs daily completion rate — for the insights feed.
  function moodCompletionInsight() {
    const rows = [];
    for (const [day, m] of Object.entries(state.moods || {})) {
      const parts = day.split("-").map(Number);
      if (parts.length !== 3) continue;
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const sched = state.habits.filter((h) => !h.archived && !h.nightPrevDay && countsForAdherence(h, d));
      if (!sched.length) continue;
      const done = sched.filter((h) => isCompleted(h, d)).length;
      rows.push({ mood: m.mood, rate: done / sched.length });
    }
    if (rows.length < 5) return null;
    const r = pearson(rows.map((x) => x.mood), rows.map((x) => x.rate));
    if (r == null || Math.abs(r) < 0.35) return null;
    return r > 0
      ? { icon: "🔋", text: "You complete more on days you feel higher energy." }
      : { icon: "🔎", text: "Your check-ins hold up even on lower-energy days — nice resilience." };
  }

  let reviewingWeek = null;
  function openWeeklyReview(weekStart) {
    const els = getEls();
    reviewingWeek = weekStart;
    const wk = dateKey(weekStart);
    const r = computeWeekReview(weekStart);
    const end = addDays(weekStart, 6);
    els.reviewRange.textContent = `${formatDateShort(weekStart)} – ${formatDateShort(end)}`;

    const rows = [];
    rows.push(reviewStat("Adherence", r.adherence == null ? "—" : r.adherence + "%",
      r.prevAdh != null && r.adherence != null ? deltaLabel(r.adherence - r.prevAdh) : ""));
    rows.push(reviewStat("Habits completed", String(r.totalDone), ""));
    if (r.bestIdx >= 0 && r.bestVal > 0) rows.push(reviewStat("Strongest day", WEEK_DAY_NAMES[r.bestIdx], `${r.bestVal} done`));
    if (r.topHabit) rows.push(reviewStat("Most consistent", `${r.topHabit.icon || "•"} ${r.topHabit.name}`, `${r.topVal}×`));
    rows.push(reviewStat("Best current streak", `${r.bestStreak} day${r.bestStreak === 1 ? "" : "s"}`, ""));
    els.reviewBody.innerHTML = `<div class="review-stats">${rows.join("")}</div>`;

    const existing = state.reviews && state.reviews[wk];
    els.reviewFocus.value = existing ? (existing.focus || "") : "";
    // Keystone picker (applies to the current week's focus habit).
    if (els.reviewKeystone) {
      const active = state.habits.filter((h) => !h.archived);
      els.reviewKeystone.innerHTML = `<option value="">No keystone habit</option>` +
        active.map((h) => `<option value="${escapeHtml(h.id)}">${escapeHtml((h.icon || "•") + " " + h.name)}</option>`).join("");
      els.reviewKeystone.value = keystoneId() || "";
    }
    els.reviewModal.classList.remove("hidden");
    setTimeout(() => els.reviewFocus.focus(), 60);
  }

  function reviewStat(label, value, sub) {
    return `<div class="review-stat"><span class="rs-label">${escapeHtml(label)}</span><span class="rs-value">${escapeHtml(value)}</span>${sub ? `<span class="rs-sub">${escapeHtml(sub)}</span>` : ""}</div>`;
  }
  function deltaLabel(delta) {
    const d = Math.round(delta);
    if (d === 0) return "same as last week";
    return d > 0 ? `▲ ${d}% vs last week` : `▼ ${Math.abs(d)}% vs last week`;
  }

  function closeReviewModal() {
    getEls().reviewModal.classList.add("hidden");
    reviewingWeek = null;
  }

  function saveWeeklyReview() {
    if (!reviewingWeek) return closeReviewModal();
    const els = getEls();
    const wk = dateKey(reviewingWeek);
    const r = computeWeekReview(reviewingWeek);
    if (!state.reviews) state.reviews = {};
    state.reviews[wk] = {
      focus: (els.reviewFocus.value || "").trim().slice(0, 500),
      adherence: r.adherence,
      updatedAt: Date.now(),
    };
    // Apply the chosen keystone habit for the current week.
    if (els.reviewKeystone) {
      const wkNow = weekKeyOf(new Date());
      if (!state.keystone) state.keystone = {};
      if (els.reviewKeystone.value) state.keystone[wkNow] = els.reviewKeystone.value;
      else delete state.keystone[wkNow];
    }
    save();
    closeReviewModal();
    renderReviewPrompt();
    showToast("Weekly review saved. 📋", "success");
  }

  /* ---- Report ---- */
  function renderReport() {
    const els = getEls();
    resetRenderCaches();
    const now = new Date();
    const weekStart = addDays(startOfWeekMonday(now), weekOffset * 7);
    const weekEnd = addDays(weekStart, 6);
    els.weekLabel.textContent = weekOffset === 0
      ? `${formatDateShort(weekStart)} – ${formatDateShort(weekEnd)} · This week`
      : `${formatDateShort(weekStart)} – ${formatDateShort(weekEnd)}`;
    els.nextWeek.disabled = weekOffset >= 0;

    const habitsInScope = (reportCategoryFilter === "all"
      ? state.habits
      : state.habits.filter((h) => h.category === reportCategoryFilter)).filter((h) => !h.archived);

    let scheduledCount = 0, completedCount = 0, bestStreak = 0;
    const dayTotals = Array.from({ length: 7 }, () => ({ scheduled: 0, done: 0 }));
    const catTotals = {};
    const rows = [];

    for (const habit of habitsInScope) {
      let hs = 0, hd = 0;
      const cells = [];
      if (isWeekly(habit)) {
        // Weekly-quota habit: measure against the target, not weekdays.
        // Cells still mark which days were completed, but don't feed dayTotals
        // (day-of-week stats are meaningless for "any N days").
        let wd = 0;
        for (let i = 0; i < 7; i++) {
          const d = addDays(weekStart, i);
          const isFuture = d > now && !sameDay(d, now);
          const done = isCompleted(habit, d);
          if (done) wd++;
          cells.push({ date: d, isScheduled: true, done, notDone: false, isFuture, weekly: true });
        }
        hs = weeklyTarget(habit);
        hd = Math.min(wd, hs);
      } else {
        for (let i = 0; i < 7; i++) {
          const d = addDays(weekStart, i);
          const isScheduled = isHabitActiveOn(habit, d);
          const isFuture = d > now && !sameDay(d, now);
          const done = isScheduled && isCompleted(habit, d);
          const notDone = isScheduled && isSkipped(habit, d);
          if (isScheduled && !isFuture) {
            hs++; dayTotals[i].scheduled++;
            if (done) { hd++; dayTotals[i].done++; }
          }
          cells.push({ date: d, isScheduled, done, notDone, isFuture });
        }
      }
      scheduledCount += hs;
      completedCount += hd;
      const st = currentStreak(habit);
      if (st > bestStreak) bestStreak = st;
      if (!catTotals[habit.category]) catTotals[habit.category] = { scheduled: 0, done: 0 };
      catTotals[habit.category].scheduled += hs;
      catTotals[habit.category].done += hd;
      rows.push({ habit, cells, hs, hd, pct: hs === 0 ? null : Math.round((hd / hs) * 100) });
    }

    const pct = scheduledCount === 0 ? 0 : Math.round((completedCount / scheduledCount) * 100);
    els.statCompletion.textContent = pct + "%";
    els.statCompleted.textContent = String(completedCount);
    els.statStreak.textContent = String(bestStreak);

    // Insight summary
    renderReportInsight(rows, pct, dayTotals, weekStart);
    // Auto-generated insights feed + time-of-day breakdown
    renderInsightsFeed();
    renderTimeOfDay();
    renderMoodTrend();
    // Achievements (check for newly-earned, then render the grid)
    checkAchievements();
    renderAchievements();
    // 5-week heatmap + full-year heatmap
    renderReportHeatmap(habitsInScope);
    renderYearHeatmap();
    // Adherence trend line
    renderAdherenceTrend(habitsInScope);
    // Category breakdown
    renderCategoryBreakdown(catTotals);

    els.dayAdherence.innerHTML = "";
    for (let i = 0; i < 7; i++) {
      const cell = document.createElement("div");
      cell.className = "day-adherence-cell";
      const label = document.createElement("div");
      label.className = "day-adherence-label";
      label.textContent = DAY_DISPLAY[i].label;
      const val = document.createElement("div");
      val.className = "day-adherence-value";
      const dt = dayTotals[i];
      val.textContent = dt.scheduled === 0 ? "—" : `${Math.round((dt.done / dt.scheduled) * 100)}%`;
      cell.appendChild(label);
      cell.appendChild(val);
      els.dayAdherence.appendChild(cell);
    }

    els.weeklyBreakdown.innerHTML = "";
    if (rows.length === 0) {
      const p = document.createElement("p");
      p.className = "empty-inline";
      p.textContent = reportCategoryFilter === "all"
        ? "Add some habits to see your weekly report."
        : `No ${reportCategoryFilter} habits to report.`;
      els.weeklyBreakdown.appendChild(p);
      return;
    }
    // Sort worst-first so what needs attention is on top
    rows.sort((a, b) => {
      const ap = a.pct == null ? 999 : a.pct;
      const bp = b.pct == null ? 999 : b.pct;
      return ap - bp;
    });

    for (const row of rows) {
      const wrap = document.createElement("div");
      wrap.className = "breakdown-row";
      const header = document.createElement("div");
      header.className = "breakdown-header";
      const name = document.createElement("div");
      name.className = "breakdown-name";
      const dot = document.createElement("span");
      dot.className = "breakdown-dot";
      dot.style.background = row.habit.color;
      const nameText = document.createElement("span");
      nameText.className = "breakdown-name-text";
      nameText.textContent = `${row.habit.icon} ${row.habit.name}`;
      name.appendChild(dot);
      name.appendChild(nameText);
      const count = document.createElement("div");
      count.className = "breakdown-count";
      count.textContent = row.hs === 0 ? "Not scheduled" : `${row.hd}/${row.hs} · ${row.pct}%`;
      header.appendChild(name);
      header.appendChild(count);

      const cells = document.createElement("div");
      cells.className = "day-cells";
      for (let i = 0; i < 7; i++) {
        const cell = row.cells[i];
        const el = document.createElement("div");
        el.className = "day-cell";
        el.title = DAY_DISPLAY[i].full + " " + formatDateShort(cell.date);
        if (!cell.isScheduled) {
          el.classList.add("skipped");
          el.textContent = DAY_DISPLAY[i].label;
        } else if (cell.done) {
          el.classList.add("done");
          el.style.background = row.habit.color;
          el.textContent = "✓";
        } else if (cell.notDone) {
          el.classList.add("not-done");
          el.textContent = "✕";
        } else {
          el.textContent = DAY_DISPLAY[i].label;
        }
        cells.appendChild(el);
      }
      wrap.appendChild(header);
      wrap.appendChild(cells);
      els.weeklyBreakdown.appendChild(wrap);
    }
  }

  // Adherence % over a [start, endExclusive) date range (excludes archived +
  // freeze days; only counts past/today). Returns null if nothing scheduled.
  function rangeAdherence(habits, start, endExcl) {
    const now = new Date();
    let sched = 0, done = 0;
    let d = new Date(start);
    while (d < endExcl) {
      if (d <= now) {
        for (const h of habits) {
          if (h.archived) continue;
          if (countsForAdherence(h, d)) { sched++; if (isCompleted(h, d)) done++; }
        }
      }
      d = addDays(d, 1);
    }
    return sched === 0 ? null : Math.round((done / sched) * 100);
  }

  function renderAdherenceTrend(habits) {
    const els = getEls();
    if (!els.adherenceTrend) return;
    const mode = els.trendRangeSelect ? els.trendRangeSelect.value : "weekly";
    const now = new Date();
    const points = []; // {label, pct|null}
    if (mode === "monthly") {
      for (let i = 11; i >= 0; i--) {
        const first = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        points.push({ label: first.toLocaleDateString(undefined, { month: "short" }), pct: rangeAdherence(habits, first, next) });
      }
    } else {
      const thisWeek = startOfWeekMonday(now);
      for (let i = 11; i >= 0; i--) {
        const ws = addDays(thisWeek, -7 * i);
        points.push({ label: `${ws.getMonth() + 1}/${ws.getDate()}`, pct: rangeAdherence(habits, ws, addDays(ws, 7)) });
      }
    }
    const haveData = points.some((p) => p.pct !== null);
    els.adherenceTrendEmpty.hidden = haveData;
    els.adherenceTrend.innerHTML = "";
    if (!haveData) return;

    const W = 320, H = 120, padL = 8, padR = 8, padT = 10, padB = 22;
    const n = points.length;
    const xAt = (i) => padL + (i * (W - padL - padR)) / (n - 1);
    const yAt = (pct) => padT + (1 - pct / 100) * (H - padT - padB);
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("class", "trend-svg");
    // gridlines at 0/50/100
    [0, 50, 100].forEach((g) => {
      const ln = document.createElementNS(ns, "line");
      ln.setAttribute("x1", padL); ln.setAttribute("x2", W - padR);
      ln.setAttribute("y1", yAt(g)); ln.setAttribute("y2", yAt(g));
      ln.setAttribute("class", "trend-grid");
      svg.appendChild(ln);
    });
    // polyline segments (break on null)
    let seg = [];
    const flush = () => {
      if (seg.length >= 2) {
        const pl = document.createElementNS(ns, "polyline");
        pl.setAttribute("points", seg.map((p) => `${p.x},${p.y}`).join(" "));
        pl.setAttribute("class", "trend-line");
        svg.appendChild(pl);
      }
      seg = [];
    };
    points.forEach((p, i) => {
      if (p.pct === null) { flush(); return; }
      const x = xAt(i), y = yAt(p.pct);
      seg.push({ x, y });
      const dot = document.createElementNS(ns, "circle");
      dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", 2.5);
      dot.setAttribute("class", "trend-dot");
      const t = document.createElementNS(ns, "title");
      t.textContent = `${p.label}: ${p.pct}%`;
      dot.appendChild(t);
      svg.appendChild(dot);
    });
    flush();
    // x labels (first, middle, last)
    [0, Math.floor((n - 1) / 2), n - 1].forEach((i) => {
      const tx = document.createElementNS(ns, "text");
      tx.setAttribute("x", xAt(i)); tx.setAttribute("y", H - 6);
      tx.setAttribute("class", "trend-xlabel");
      tx.setAttribute("text-anchor", i === 0 ? "start" : i === n - 1 ? "end" : "middle");
      tx.textContent = points[i].label;
      svg.appendChild(tx);
    });
    els.adherenceTrend.appendChild(svg);
  }

  function renderReportHeatmap(habits) {
    const el = getEls().reportHeatmap;
    if (!el) return;
    el.innerHTML = "";
    const now = new Date();
    // 5 weeks ending with the current week; align columns to Monday.
    const start = addDays(startOfWeekMonday(now), -28);
    for (let i = 0; i < 35; i++) {
      const d = addDays(start, i);
      const cell = document.createElement("div");
      cell.className = "hm-cell";
      const future = d > now && !sameDay(d, now);
      if (future) {
        cell.classList.add("hm-future");
      } else {
        let s = 0, done = 0;
        for (const h of habits) { if (isHabitActiveOn(h, d)) { s++; if (isCompleted(h, d)) done++; } }
        let bucket = "hm-0";
        if (s === 0) bucket = "hm-none";
        else {
          const p = done / s;
          bucket = p >= 1 ? "hm-4" : p >= 0.66 ? "hm-3" : p >= 0.33 ? "hm-2" : p > 0 ? "hm-1" : "hm-0";
        }
        cell.classList.add(bucket);
        const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        cell.title = s === 0 ? `${label}: nothing scheduled` : `${label}: ${done}/${s} done`;
      }
      el.appendChild(cell);
    }
  }

  /* ---- Insights feed + time-of-day ---- */

  // Which part of the day a habit lives in, from its (effective) time or a
  // descriptive time string like "Morning" / "10:30 PM · with meal".
  function slotForHabit(h) {
    const min = parseTimeToMinutes(h.time);
    // parseTimeToMinutes returns a sentinel >= 1440 for "All day"/"anytime"/unparseable.
    if (min != null && min < 1440) return min < 720 ? "morning" : min < 1020 ? "afternoon" : "evening";
    const t = (h.time || "").toLowerCase();
    if (/morning|wake|breakfast|sunrise/.test(t)) return "morning";
    if (/afternoon|lunch|midday|noon/.test(t)) return "afternoon";
    if (/evening|night|bed|dinner|sunset/.test(t)) return "evening";
    return "anytime";
  }

  const TOD_SLOTS = [
    { key: "morning", label: "Morning", icon: "🌅" },
    { key: "afternoon", label: "Afternoon", icon: "☀️" },
    { key: "evening", label: "Evening", icon: "🌙" },
    { key: "anytime", label: "Anytime", icon: "🕐" },
  ];

  // Scheduled/done tallies per time-of-day slot over the last ~8 weeks.
  function timeOfDayStats() {
    const slots = { morning: { s: 0, d: 0 }, afternoon: { s: 0, d: 0 }, evening: { s: 0, d: 0 }, anytime: { s: 0, d: 0 } };
    const today = new Date();
    for (const h of state.habits) {
      if (h.archived) continue;
      const slot = slotForHabit(h);
      let d = new Date();
      for (let i = 0; i < 56; i++) {
        if (d <= today && countsForAdherence(h, d)) {
          slots[slot].s++;
          if (isCompleted(h, d)) slots[slot].d++;
        }
        d = addDays(d, -1);
      }
    }
    return slots;
  }

  // Aggregate adherence per weekday across all active habits (~12 weeks).
  function weekdayAdherenceAll() {
    const byDow = Array.from({ length: 7 }, () => ({ s: 0, d: 0 }));
    const today = new Date();
    for (const h of state.habits) {
      if (h.archived) continue;
      let d = new Date();
      for (let i = 0; i < 84; i++) {
        if (d <= today && countsForAdherence(h, d)) {
          const w = d.getDay();
          byDow[w].s++;
          if (isCompleted(h, d)) byDow[w].d++;
        }
        d = addDays(d, -1);
      }
    }
    return byDow;
  }

  // Count of "perfect days" (every scheduled habit done) in the last N days.
  function perfectDayCount(days) {
    let n = 0;
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = addDays(today, -i);
      const sched = state.habits.filter((h) => !h.archived && !h.nightPrevDay && countsForAdherence(h, d));
      if (sched.length && sched.every((h) => isCompleted(h, d))) n++;
    }
    return n;
  }

  function totalCheckins() {
    let n = 0;
    for (const day of Object.values(state.completions)) {
      for (const v of Object.values(day)) if (v > 0) n++;
    }
    return n;
  }

  // Strongest positive habit-to-habit link over the last ~60 days:
  // "On days you do A, you also hit B N% of the time." Only surfaced when the
  // conditional rate is high AND meaningfully above B's baseline.
  function habitPairInsight() {
    const active = state.habits.filter((h) => !h.archived && !h.nightPrevDay);
    if (active.length < 2) return null;
    const today = new Date();
    const days = [];
    for (let i = 1; i <= 60; i++) days.push(addDays(today, -i));
    let best = null;
    for (const A of active) {
      for (const B of active) {
        if (A.id === B.id) continue;
        let aDone = 0, bGivenA = 0, bTotal = 0, shared = 0;
        for (const d of days) {
          if (!countsForAdherence(A, d) || !countsForAdherence(B, d)) continue;
          shared++;
          const bDone = isCompleted(B, d);
          if (bDone) bTotal++;
          if (isCompleted(A, d)) { aDone++; if (bDone) bGivenA++; }
        }
        if (aDone < 8 || shared < 12) continue;
        const cond = bGivenA / aDone;
        const base = bTotal / shared;
        if (cond >= 0.7 && cond - base >= 0.15) {
          if (!best || cond > best.cond) best = { A, B, cond };
        }
      }
    }
    if (!best) return null;
    return { icon: "🔗", text: `On days you do ${best.A.icon || "•"} ${best.A.name}, you also hit ${best.B.name} ${Math.round(best.cond * 100)}% of the time.` };
  }

  // Build a scannable list of plain-language findings from real data.
  function buildInsights() {
    const out = [];
    const active = state.habits.filter((h) => !h.archived);
    if (active.length === 0) return out;
    const now = new Date();

    // 1. This week vs last week
    const wsThis = startOfWeekMonday(now);
    const thisPct = weekAdherencePct(wsThis);
    const lastPct = weekAdherencePct(addDays(wsThis, -7));
    if (thisPct != null && lastPct != null) {
      const d = thisPct - lastPct;
      if (Math.abs(d) >= 5) {
        out.push({ icon: d > 0 ? "📈" : "📉", text: `You're ${d > 0 ? "up" : "down"} ${Math.abs(d)} points this week (${thisPct}% vs ${lastPct}% last week).` });
      } else {
        out.push({ icon: "📊", text: `Holding steady around ${thisPct}% adherence week to week.` });
      }
    }

    // 2. Strongest / weakest weekday
    const byDow = weekdayAdherenceAll();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let bestDay = null, worstDay = null;
    for (let i = 0; i < 7; i++) {
      if (byDow[i].s < 3) continue;
      const rate = byDow[i].d / byDow[i].s;
      if (!bestDay || rate > bestDay.rate) bestDay = { i, rate };
      if (!worstDay || rate < worstDay.rate) worstDay = { i, rate };
    }
    if (bestDay && worstDay && bestDay.i !== worstDay.i && bestDay.rate - worstDay.rate >= 0.15) {
      out.push({ icon: "💪", text: `${dayNames[bestDay.i]}s are your strongest day (${Math.round(bestDay.rate * 100)}%).` });
      if (worstDay.rate < 0.6) out.push({ icon: "🎯", text: `${dayNames[worstDay.i]}s slip the most (${Math.round(worstDay.rate * 100)}%) — worth a plan.` });
    }

    // 3. Best time of day
    const tod = timeOfDayStats();
    let bestSlot = null;
    for (const s of TOD_SLOTS) {
      const v = tod[s.key];
      if (v.s < 5) continue;
      const rate = v.d / v.s;
      if (!bestSlot || rate > bestSlot.rate) bestSlot = { ...s, rate };
    }
    if (bestSlot && bestSlot.rate >= 0.6) {
      out.push({ icon: bestSlot.icon, text: `${bestSlot.label} is your power window — ${Math.round(bestSlot.rate * 100)}% of those habits get done.` });
    }

    // 4. Best & needs-work habits (by completion rate over history)
    const scored = [];
    for (const h of active) {
      const s = habitCompletionStats(h);
      if (s && s.sched >= 5) scored.push({ h, rate: s.rate });
    }
    scored.sort((a, b) => b.rate - a.rate);
    if (scored.length >= 2) {
      const top = scored[0], low = scored[scored.length - 1];
      if (top.rate >= 70) out.push({ icon: "🏆", text: `Most consistent: ${top.h.icon || "•"} ${top.h.name} (${top.rate}%).` });
      if (low.rate < 50 && low.h.id !== top.h.id) out.push({ icon: "🌱", text: `Needs love: ${low.h.icon || "•"} ${low.h.name} (${low.rate}%). Try shrinking it or moving the time.` });
    }

    // 5. Longest current streak
    let bestStreak = 0, bestStreakHabit = null;
    for (const h of active) { const st = currentStreak(h); if (st > bestStreak) { bestStreak = st; bestStreakHabit = h; } }
    if (bestStreak >= 3 && bestStreakHabit) {
      out.push({ icon: "🔥", text: `${bestStreakHabit.icon || "•"} ${bestStreakHabit.name} is on a ${bestStreak}-day streak — your longest going right now.` });
    }

    // 6. Perfect days
    const pd = perfectDayCount(30);
    if (pd >= 3) out.push({ icon: "✅", text: `${pd} perfect days in the last month — every scheduled habit done.` });

    // 7. Energy correlation (needs 4+ weeks with energy logged)
    const enWeeks = measurementList().filter((e) => e.energy != null);
    if (enWeeks.length >= 4) {
      const ad = [], en = [];
      for (const e of enWeeks) {
        const parts = String(e.weekKey).split("-").map(Number);
        if (parts.length !== 3) continue;
        const p = weekAdherencePct(new Date(parts[0], parts[1] - 1, parts[2]));
        if (p != null) { ad.push(p); en.push(e.energy); }
      }
      // Need 4+ real pairs — 2 points are always perfectly correlated (±1).
      if (ad.length >= 4) {
        const r = pearson(ad, en);
        if (r != null && Math.abs(r) >= 0.4) {
          out.push({ icon: "⚡", text: r > 0
            ? `Your energy runs higher in weeks you hit your habits.`
            : `Interesting — higher-adherence weeks track with lower logged energy. Watch for overtraining.` });
        }
      }
    }

    // 8. Habit-to-habit link
    const pi = habitPairInsight();
    if (pi) out.push(pi);

    // 9. Daily mood vs completion
    const mi = moodCompletionInsight();
    if (mi) out.push(mi);

    // 10. Skip-risk: a habit that historically slips on today's weekday.
    const risky = skipRiskHabits(now);
    if (risky.length) {
      const r = risky[0];
      out.push({ icon: "🎯", text: `${dayNameOf(now)}s are your toughest for ${r.habit.icon || "•"} ${r.habit.name} (${Math.round(r.rate * 100)}% done historically). It's still open today.` });
    }

    // 11. Adaptive target: consistently landing short of a count target.
    for (const h of active) {
      const at = adaptiveTargetSuggestion(h);
      if (at) { out.push({ icon: "🎚️", text: `${h.icon || "•"} ${h.name}: you average ${at.avg}/day vs a target of ${at.current}. Setting it to ${at.suggested} keeps the win realistic.` }); break; }
    }

    // 12. Momentum forecast for today's live streaks.
    const mf = momentumForecast(active, now);
    if (mf && mf.level !== "safe") out.push({ icon: mf.text.slice(0, 2), text: mf.text.replace(/^\S+\s/, "") });

    // 13. Milestone-ish total
    const total = totalCheckins();
    if (total >= 50) out.push({ icon: "🎉", text: `${total} check-ins logged all-time. That's a lot of small wins.` });

    return out;
  }

  function renderInsightsFeed() {
    const card = $("#insightsFeedCard");
    const wrap = $("#insightsFeed");
    if (!card || !wrap) return;
    const items = buildInsights();
    if (items.length === 0) { card.hidden = true; return; }
    card.hidden = false;
    wrap.innerHTML = items.slice(0, 7).map((it) =>
      `<div class="insight-row"><span class="insight-row-icon">${it.icon}</span><span class="insight-row-text">${escapeHtml(it.text)}</span></div>`
    ).join("");
  }

  // Last N days of mood taps (1-5), oldest→newest; mood null on untapped days.
  function moodTrendData(days) {
    const out = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      const m = state.moods && state.moods[dateKey(d)];
      out.push({ date: d, mood: m ? m.mood : null });
    }
    return out;
  }
  const MOOD_ICONS = ["", "😫", "😕", "😐", "🙂", "🤩"];
  function renderMoodTrend() {
    const card = $("#moodTrendCard");
    const el = $("#moodTrendChart");
    const avgEl = $("#moodTrendAvg");
    if (!card || !el) return;
    const data = moodTrendData(30);
    const logged = data.filter((x) => x.mood != null);
    if (logged.length < 3) { card.hidden = true; return; }
    card.hidden = false;
    const avg = logged.reduce((s, x) => s + x.mood, 0) / logged.length;
    if (avgEl) avgEl.textContent = `avg ${avg.toFixed(1)} ${MOOD_ICONS[Math.round(avg)] || ""}`;
    el.innerHTML = data.map((x) => {
      if (x.mood == null) return `<span class="mt-bar mt-empty" title="${x.date.toLocaleDateString()} · no entry"></span>`;
      const h = Math.round((x.mood / 5) * 100);
      return `<span class="mt-bar" style="height:${h}%" data-mood="${x.mood}" title="${x.date.toLocaleDateString()} · ${MOOD_ICONS[x.mood]}"></span>`;
    }).join("");
  }

  function renderTimeOfDay() {
    const card = $("#timeOfDayCard");
    const wrap = $("#timeOfDayChart");
    if (!card || !wrap) return;
    const tod = timeOfDayStats();
    const rows = TOD_SLOTS.filter((s) => tod[s.key].s > 0);
    if (rows.length === 0) { card.hidden = true; return; }
    card.hidden = false;
    // Only consider reliable slots (>=5 samples) when picking the best window,
    // otherwise a tiny high-rate slot can make the badge never appear.
    let bestRate = -1;
    for (const s of rows) { const v = tod[s.key]; if (v.s < 5) continue; const r = v.d / v.s; if (r > bestRate) bestRate = r; }
    wrap.innerHTML = rows.map((s) => {
      const v = tod[s.key];
      const pct = Math.round((v.d / v.s) * 100);
      const isBest = v.s >= 5 && bestRate >= 0 && (v.d / v.s) === bestRate;
      return `<div class="tod-row">
        <span class="tod-label">${s.icon} ${s.label}</span>
        <span class="tod-bar"><span class="tod-fill${isBest ? " best" : ""}" style="width:${pct}%"></span></span>
        <span class="tod-pct">${pct}%</span>
      </div>`;
    }).join("");
  }

  /* ---- Achievements ---- */
  function maxLongestStreak() {
    let m = 0;
    for (const h of state.habits) { if (h.archived) continue; const s = longestStreak(h); if (s > m) m = s; }
    return m;
  }
  // Any fully-complete Mon-Sun week in the last ~16 weeks?
  function hasPerfectWeek() {
    const today = new Date();
    for (let w = 1; w <= 16; w++) {
      const ws = addDays(startOfWeekMonday(today), -7 * w);
      let sched = 0, ok = true;
      for (let i = 0; i < 7 && ok; i++) {
        const d = addDays(ws, i);
        for (const h of state.habits) {
          if (h.archived) continue;
          if (countsForAdherence(h, d)) { sched++; if (!isCompleted(h, d)) { ok = false; break; } }
        }
      }
      if (ok && sched > 0) return true;
    }
    return false;
  }

  const ACHIEVEMENTS = [
    { id: "first_checkin", icon: "👟", title: "First step", desc: "Log your first check-in", progress: () => ({ cur: totalCheckins(), target: 1 }) },
    { id: "ten_checkins", icon: "🌱", title: "Warming up", desc: "10 check-ins", progress: () => ({ cur: totalCheckins(), target: 10 }) },
    { id: "hundred_checkins", icon: "💯", title: "Century", desc: "100 check-ins", progress: () => ({ cur: totalCheckins(), target: 100 }) },
    { id: "fivehundred_checkins", icon: "🏅", title: "Devoted", desc: "500 check-ins", progress: () => ({ cur: totalCheckins(), target: 500 }) },
    { id: "streak_7", icon: "🔥", title: "Week warrior", desc: "A 7-day streak", progress: () => ({ cur: maxLongestStreak(), target: 7 }) },
    { id: "streak_30", icon: "🗓️", title: "Monthly master", desc: "A 30-day streak", progress: () => ({ cur: maxLongestStreak(), target: 30 }) },
    { id: "streak_100", icon: "🚀", title: "Unstoppable", desc: "A 100-day streak", progress: () => ({ cur: maxLongestStreak(), target: 100 }) },
    { id: "perfect_day", icon: "✨", title: "Flawless day", desc: "One perfect day", progress: () => ({ cur: perfectDayCount(730) >= 1 ? 1 : 0, target: 1 }) },
    { id: "perfect_day_10", icon: "🎯", title: "Perfectionist", desc: "10 perfect days", progress: () => ({ cur: Math.min(perfectDayCount(730), 10), target: 10 }) },
    { id: "perfect_week", icon: "🏆", title: "Perfect week", desc: "Every habit, all week", progress: () => ({ cur: hasPerfectWeek() ? 1 : 0, target: 1 }) },
    { id: "collector", icon: "🧩", title: "Habit builder", desc: "Track 5 habits", progress: () => ({ cur: state.habits.filter((h) => !h.archived).length, target: 5 }) },
    { id: "reviewer", icon: "📋", title: "Reflective", desc: "Complete a weekly review", progress: () => ({ cur: state.reviews ? Object.keys(state.reviews).length : 0, target: 1 }) },
  ];

  function evaluateAchievements() {
    return ACHIEVEMENTS.map((a) => {
      const p = a.progress();
      const unlocked = p.cur >= p.target;
      return { def: a, unlocked, cur: Math.min(p.cur, p.target), target: p.target, earnedAt: state.achievements && state.achievements[a.id] };
    });
  }

  // Persist any newly-earned achievements and celebrate them. Safe to call often
  // — it only reacts to achievements not already recorded.
  function checkAchievements() {
    if (!state.achievements) state.achievements = {};
    const now = Date.now();
    const fresh = [];
    for (const a of ACHIEVEMENTS) {
      const p = a.progress();
      if (p.cur >= p.target && !state.achievements[a.id]) {
        state.achievements[a.id] = now;
        fresh.push(a);
      }
    }
    if (fresh.length === 0) return [];
    // Browser-only side effects (guarded so the test sandbox can call this).
    if (typeof document !== "undefined") {
      saveNow();
      if (fresh.length === 1) {
        showToast(`${fresh[0].icon} Achievement unlocked: ${fresh[0].title}!`, "success");
      } else {
        showToast(`🎉 ${fresh.length} achievements unlocked!`, "success");
      }
      try { celebrate(true); } catch (e) {}
    }
    return fresh;
  }

  function renderAchievements() {
    const card = $("#achievementsCard");
    const wrap = $("#achievementsGrid");
    const sub = $("#achievementsSub");
    if (!card || !wrap) return;
    const list = evaluateAchievements();
    const earned = list.filter((a) => a.unlocked).length;
    card.hidden = false;
    if (sub) sub.textContent = `${earned} of ${list.length} unlocked`;
    wrap.innerHTML = list.map((a) => {
      const pct = a.target > 1 ? Math.round((a.cur / a.target) * 100) : (a.unlocked ? 100 : 0);
      return `<div class="badge${a.unlocked ? " earned" : ""}" title="${escapeHtml(a.def.desc)}">
        <span class="badge-icon">${a.def.icon}</span>
        <span class="badge-title">${escapeHtml(a.def.title)}</span>
        ${a.unlocked ? `<span class="badge-status">Unlocked</span>`
          : `<span class="badge-progress"><span class="badge-progress-fill" style="width:${pct}%"></span></span>
             <span class="badge-count">${a.cur}/${a.target}</span>`}
      </div>`;
    }).join("");
  }

  /* ---- Year in pixels (full-year adherence heatmap) ---- */
  // Overall adherence bucket for a day: "none" | "0".."4" | "future".
  function dayAdherenceBucket(d) {
    const now = new Date();
    if (d > now && !sameDay(d, now)) return "future";
    const sched = state.habits.filter((h) => !h.archived && !h.nightPrevDay && countsForAdherence(h, d));
    if (!sched.length) return "none";
    const done = sched.filter((h) => isCompleted(h, d)).length;
    const p = done / sched.length;
    if (p === 0) return "0";
    if (p < 0.34) return "1";
    if (p < 0.67) return "2";
    if (p < 1) return "3";
    return "4";
  }
  // 53 weeks × 7 days ending this week (Monday-first columns).
  function yearHeatmapCells() {
    const today = new Date();
    const start = startOfWeekMonday(addDays(today, -7 * 52));
    const cells = [];
    for (let i = 0; i < 53 * 7; i++) {
      const d = addDays(start, i);
      cells.push({ date: d, bucket: dayAdherenceBucket(d) });
    }
    return cells;
  }
  function renderYearHeatmap() {
    const card = $("#yearHeatmapCard");
    const el = $("#yearHeatmap");
    if (!card || !el) return;
    const cells = yearHeatmapCells();
    // Hide until there's at least some logged history.
    const anyData = cells.some((c) => c.bucket !== "none" && c.bucket !== "future");
    if (!anyData) { card.hidden = true; return; }
    card.hidden = false;
    el.innerHTML = cells.map((c) => {
      const cls = c.bucket === "none" ? "hm-none" : c.bucket === "future" ? "yh-future" : "hm-" + c.bucket;
      const title = c.bucket === "future" ? "" : `${c.date.toLocaleDateString()}`;
      return `<span class="yh-cell ${cls}" title="${title}"></span>`;
    }).join("");
  }

  function renderReportInsight(rows, pct, dayTotals, weekStart) {
    const card = $("#reportInsight");
    const el = $("#reportInsightText");
    if (!card || !el) return;
    const scored = rows.filter((r) => r.pct !== null);
    if (scored.length === 0) { card.hidden = true; return; }
    const parts = [`${pct}% adherence this week.`];
    // Best day
    let bestDayIdx = -1, bestDayPct = -1;
    for (let i = 0; i < 7; i++) {
      const dt = dayTotals[i];
      if (dt.scheduled > 0) {
        const p = dt.done / dt.scheduled;
        if (p > bestDayPct) { bestDayPct = p; bestDayIdx = i; }
      }
    }
    if (bestDayIdx >= 0) parts.push(`Strongest day: ${DAY_DISPLAY[bestDayIdx].full}.`);
    // Most consistent + needs work
    const sorted = [...scored].sort((a, b) => b.pct - a.pct);
    const best = sorted[0], worst = sorted[sorted.length - 1];
    if (best && best.pct >= 80) parts.push(`Nailing it: ${best.habit.icon} ${best.habit.name} (${best.pct}%).`);
    if (worst && worst.pct < 50 && worst !== best) parts.push(`Needs work: ${worst.habit.icon} ${worst.habit.name} (${worst.pct}%).`);
    card.hidden = false;
    el.textContent = parts.join(" ");
  }

  function renderCategoryBreakdown(catTotals) {
    const wrap = $("#categoryBreakdown");
    if (!wrap) return;
    wrap.innerHTML = "";
    const cats = Object.keys(catTotals).filter((c) => catTotals[c] && catTotals[c].scheduled > 0);
    if (cats.length === 0) {
      wrap.innerHTML = '<p class="empty-inline">No scheduled habits this week.</p>';
      return;
    }
    const colorFor = { Fitness: "#f59e0b", Nutrition: "#14b8a6", Sleep: "#a855f7", Supplements: "#3b82f6", Custom: "#6366f1" };
    for (const c of cats) {
      const t = catTotals[c];
      const p = Math.round((t.done / t.scheduled) * 100);
      const row = document.createElement("div");
      row.className = "cat-bar-row";
      row.innerHTML =
        `<div class="cat-bar-head"><span class="cat-name">${escapeHtml(c)}</span><span class="cat-pct">${t.done}/${t.scheduled} · ${p}%</span></div>` +
        `<div class="cat-bar"><div class="cat-bar-fill" style="width:${p}%;background:${colorFor[c] || "#6366f1"}"></div></div>`;
      wrap.appendChild(row);
    }
  }

  /* ---- Report downloads ---- */
  function csvEscape(v) {
    let s = String(v ?? "");
    // Neutralize spreadsheet formula injection: a cell starting with = + - @
    // (or tab/CR) is treated as a formula by Excel/Sheets. Prefix with a quote.
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // CSV of one week's per-habit results.
  function downloadWeekCsv() {
    const now = new Date();
    const weekStart = addDays(startOfWeekMonday(now), weekOffset * 7);
    const header = ["Habit", "Category", "Time", ...DAY_DISPLAY.map((d) => d.full), "Done", "Scheduled", "Percent"];
    const lines = [header.map(csvEscape).join(",")];
    for (const habit of state.habits) {
      let hs = 0, hd = 0;
      const dayCells = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        const scheduled = isHabitActiveOn(habit, d);
        const future = d > now && !sameDay(d, now);
        if (!scheduled) { dayCells.push("-"); continue; }
        if (future) { dayCells.push(""); continue; }
        hs++;
        if (isCompleted(habit, d)) { hd++; dayCells.push("done"); }
        else if (isSkipped(habit, d)) dayCells.push("not done");
        else dayCells.push("pending");
      }
      const pct = hs === 0 ? "" : Math.round((hd / hs) * 100);
      lines.push([habit.name, habit.category, habit.time || "", ...dayCells, hd, hs, pct].map(csvEscape).join(","));
    }
    const wk = dateKey(weekStart);
    downloadFile(`momentum-report-${wk}.csv`, lines.join("\n"), "text/csv");
    showToast("Week CSV downloaded.", "success");
  }

  // CSV of all history: every dated check-in + weekly measurements.
  function downloadAllCsv() {
    const lines = [];
    lines.push("HABIT CHECK-INS");
    lines.push(["Date", "Habit", "Category", "Status", "Value"].map(csvEscape).join(","));
    const habitById = new Map(state.habits.map((h) => [h.id, h]));
    const dates = Object.keys(state.completions).sort();
    for (const d of dates) {
      for (const [hid, val] of Object.entries(state.completions[d])) {
        const h = habitById.get(hid);
        if (!h) continue;
        const status = val < 0 ? "not done" : (val >= h.target ? "done" : "partial");
        lines.push([d, h.name, h.category, status, val < 0 ? "" : val].map(csvEscape).join(","));
      }
    }
    lines.push("");
    lines.push("WEEKLY MEASUREMENTS");
    const mHeader = ["Week", "Weight(lb)", "Waist(in)", "Energy", "Strength", "Notes"];
    const customCols = state.customMetrics.map((c) => c.name);
    lines.push([...mHeader, ...customCols].map(csvEscape).join(","));
    for (const wk of Object.keys(state.measurements).sort()) {
      const m = state.measurements[wk];
      const custom = state.customMetrics.map((c) => (m.custom && m.custom[c.id] != null ? m.custom[c.id] : ""));
      lines.push([wk, m.weight ?? "", m.waist ?? "", m.energy ?? "", m.strengthTrend || "", m.notes || "", ...custom].map(csvEscape).join(","));
    }
    downloadFile(`momentum-all-${todayKey()}.csv`, lines.join("\n"), "text/csv");
    showToast("Full history CSV downloaded.", "success");
  }

  function printReport() {
    window.print();
  }

  // Render a shareable progress summary to a PNG and share/download it.
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  async function shareProgressCard() {
    const now = new Date();
    const weekStart = addDays(startOfWeekMonday(now), weekOffset * 7);
    const pct = weekAdherencePct(weekStart);
    const checkins = totalCheckins();
    const bestStreak = maxLongestStreak();
    const curBest = (() => { let m = 0, h = null; for (const x of state.habits) { if (x.archived) continue; const s = currentStreak(x); if (s > m) { m = s; h = x; } } return { streak: m, habit: h }; })();
    const earned = evaluateAchievements().filter((a) => a.unlocked).length;

    const W = 1080, H = 1350, S = 1;
    const canvas = document.createElement("canvas");
    canvas.width = W * S; canvas.height = H * S;
    const ctx = canvas.getContext("2d");
    ctx.scale(S, S);

    // Background gradient
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#6366f1");
    g.addColorStop(1, "#14b8a6");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "700 64px system-ui, -apple-system, sans-serif";
    ctx.fillText("Momentum", W / 2, 150);
    ctx.font = "400 34px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    const label = weekOffset === 0 ? "This week" : `Week of ${formatDateShort(weekStart)}`;
    ctx.fillText(label, W / 2, 205);

    // Big adherence ring number
    ctx.fillStyle = "#fff";
    ctx.font = "800 260px system-ui, -apple-system, sans-serif";
    ctx.fillText(pct == null ? "—" : pct + "%", W / 2, 500);
    ctx.font = "500 38px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText("adherence", W / 2, 560);

    // Stat cards
    const stats = [
      { n: String(checkins), l: "check-ins" },
      { n: "🔥 " + curBest.streak, l: "current streak" },
      { n: "🏆 " + bestStreak, l: "best streak" },
      { n: "🎖 " + earned, l: "achievements" },
    ];
    const cardW = 460, cardH = 190, gap = 40;
    const startX = (W - (cardW * 2 + gap)) / 2;
    let y0 = 660;
    ctx.textAlign = "center";
    stats.forEach((s, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = startX + col * (cardW + gap);
      const y = y0 + row * (cardH + gap);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      roundRect(ctx, x, y, cardW, cardH, 28); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "800 84px system-ui, -apple-system, sans-serif";
      ctx.fillText(s.n, x + cardW / 2, y + 100);
      ctx.font = "500 34px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText(s.l, x + cardW / 2, y + 150);
    });

    // Footer line
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "600 40px system-ui, -apple-system, sans-serif";
    const foot = curBest.habit ? `${curBest.habit.icon || "•"} ${curBest.habit.name} — going strong` : "Small steps, every day.";
    ctx.fillText(foot.slice(0, 34), W / 2, H - 90);

    // Export → share or download
    const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
    if (!blob) { showToast("Couldn't build the image.", "error"); return; }
    const file = new File([blob], `momentum-${todayKey()}.png`, { type: "image/png" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Momentum progress" });
        return;
      }
    } catch (e) { /* fall back to download */ }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = file.name; a.click();
    URL.revokeObjectURL(url);
    showToast("Progress card saved.", "success");
  }

  /* ================================================================
   * Schedule tab
   * ================================================================ */
  const SCHED_PHOTO_KEY = "ht_schedule_photo";
  let schedSaveTimer = null;

  function minToClock(min) {
    min = ((Math.round(min) % 1440) + 1440) % 1440;
    let h = Math.floor(min / 60), m = min % 60;
    const ampm = h < 12 ? "AM" : "PM";
    let hh = h % 12; if (hh === 0) hh = 12;
    return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
  }
  function hhmmToMin(s) {
    const m = /^(\d{2}):(\d{2})$/.exec(s || "");
    return m ? (+m[1]) * 60 + (+m[2]) : null;
  }
  function minToHHMM(min) {
    if (min == null) return "";
    min = ((Math.round(min) % 1440) + 1440) % 1440;
    return String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0");
  }

  function renderSchedule() {
    const grid = $("#scheduleGrid");
    if (!grid) return;
    // Per-day rows
    grid.innerHTML = "";
    const ws = state.workSchedule.days;
    for (const d of DAY_DISPLAY) {
      const day = ws[d.idx] || { off: false, start: "", end: "" };
      const row = document.createElement("div");
      row.className = "sched-row" + (day.off ? " off" : "");
      row.innerHTML =
        `<span class="sched-day">${d.full}</span>` +
        `<label class="sched-off"><input type="checkbox" data-off="${d.idx}" ${day.off ? "checked" : ""}/> Off</label>` +
        `<span class="sched-times">` +
        `<input type="time" data-start="${d.idx}" value="${day.start}" />` +
        `<span>to</span>` +
        `<input type="time" data-end="${d.idx}" value="${day.end}" />` +
        `</span>`;
      grid.appendChild(row);
    }
    grid.querySelectorAll("input[data-off]").forEach((el) =>
      el.addEventListener("change", () => updateSchedDay(+el.dataset.off, "off", el.checked)));
    grid.querySelectorAll("input[data-start]").forEach((el) =>
      el.addEventListener("change", () => updateSchedDay(+el.dataset.start, "start", el.value)));
    grid.querySelectorAll("input[data-end]").forEach((el) =>
      el.addEventListener("change", () => updateSchedDay(+el.dataset.end, "end", el.value)));

    // Notes + photo
    const notes = $("#schedNotes");
    if (notes) notes.value = state.workSchedule.notes || "";
    renderSchedPhoto();

    // Reference-day selector
    const sel = $("#schedRefDay");
    if (sel && !sel.dataset.filled) {
      sel.innerHTML = DAY_DISPLAY.map((d) => `<option value="${d.idx}">${d.full}</option>`).join("");
      sel.dataset.filled = "1";
      const todayIdx = new Date().getDay();
      sel.value = String(todayIdx);
    }
    renderConflicts();
  }

  function updateSchedDay(idx, field, value) {
    if (!state.workSchedule.days[idx]) state.workSchedule.days[idx] = { off: false, start: "", end: "" };
    state.workSchedule.days[idx][field] = value;
    state.workSchedule.updatedAt = Date.now();
    save();
    if (field === "off") renderSchedule();
    else renderConflicts();
  }

  function onSchedNotes() {
    if (schedSaveTimer) clearTimeout(schedSaveTimer);
    schedSaveTimer = setTimeout(() => {
      state.workSchedule.notes = ($("#schedNotes").value || "").slice(0, 500);
      state.workSchedule.updatedAt = Date.now();
      save();
      const s = $("#schedSaved"); if (s) { s.hidden = false; setTimeout(() => (s.hidden = true), 1200); }
    }, 500);
  }

  function renderSchedPhoto() {
    const thumb = $("#schedPhotoThumb"), remove = $("#schedPhotoRemove");
    if (!thumb) return;
    const photo = localStorage.getItem(SCHED_PHOTO_KEY);
    if (photo) { thumb.src = photo; thumb.hidden = false; remove.hidden = false; }
    else { thumb.hidden = true; remove.hidden = true; thumb.removeAttribute("src"); }
  }
  async function onSchedPhotoPick(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file, 900, 0.6); // larger for legibility
      localStorage.setItem(SCHED_PHOTO_KEY, dataUrl);
      e.target.value = "";
      renderSchedPhoto();
      showToast("Schedule photo saved (this device).", "success");
    } catch (err) {
      showToast(isQuotaError(err) ? "Storage full — delete some photos first." : "Couldn't save that image.", "error");
    }
  }
  function removeSchedPhoto() {
    localStorage.removeItem(SCHED_PHOTO_KEY);
    renderSchedPhoto();
  }

  /* ---- OCR: read work hours from the schedule photo (Tesseract.js, lazy-loaded) ---- */
  let tesseractPromise = null;
  function lazyLoadTesseract() {
    if (typeof Tesseract !== "undefined") return Promise.resolve();
    if (tesseractPromise) return tesseractPromise;
    tesseractPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      s.onload = () => resolve();
      s.onerror = () => { tesseractPromise = null; reject(new Error("Couldn't load the OCR engine — needs an internet connection.")); };
      document.head.appendChild(s);
    });
    return tesseractPromise;
  }

  // Parse free OCR text into { dayIdx: {start,end} | {off:true} }.
  function parseScheduleText(text) {
    const dayMap = { sunday:0, sun:0, monday:1, mon:1, tuesday:2, tue:2, tues:2,
      wednesday:3, wed:3, thursday:4, thu:4, thur:4, thurs:4, friday:5, fri:5, saturday:6, sat:6 };
    const result = {};
    for (const rawLine of text.split(/\n+/)) {
      const line = rawLine.trim();
      const low = line.toLowerCase();
      let dayIdx = null;
      for (const k of Object.keys(dayMap)) {
        if (new RegExp("\\b" + k + "\\b").test(low)) { dayIdx = dayMap[k]; break; }
      }
      if (dayIdx == null) continue;
      if (/\b(off|rest|leave|holiday|closed)\b/.test(low) && !/\d/.test(low)) { result[dayIdx] = { off: true }; continue; }
      const times = [];
      const re = /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/gi;
      let m;
      while ((m = re.exec(line)) && times.length < 4) {
        let h = +m[1]; const min = m[2] ? +m[2] : 0;
        const ap = (m[3] || "").replace(/[.\s]/g, "").toLowerCase();
        if (h > 23 || min > 59) continue; // skip impossible clock values (OCR/typos)
        if (ap === "pm" && h < 12) h += 12;
        if (ap === "am" && h === 12) h = 0;
        times.push({ min: h * 60 + min, hadAp: !!ap });
      }
      if (times.length >= 2) {
        let start = times[0].min, end = times[1].min;
        // "9-5" with no am/pm → assume the end is PM
        if (end <= start && !times[1].hadAp && end < 12 * 60) end += 12 * 60;
        result[dayIdx] = { start: minToHHMM(start), end: minToHHMM(end) };
      }
    }
    return result;
  }

  async function runScheduleOcr() {
    const photo = localStorage.getItem(SCHED_PHOTO_KEY);
    const status = $("#schedOcrStatus");
    const btn = $("#schedOcrBtn");
    if (!photo) { showToast("Add a schedule photo first."); return; }
    status.hidden = false; status.className = "sync-status loading";
    status.textContent = "Loading OCR engine…"; btn.disabled = true;
    try {
      await lazyLoadTesseract();
      status.textContent = "Reading the photo… this can take 10–20 seconds.";
      const { data: { text } } = await Tesseract.recognize(photo, "eng");
      const parsed = parseScheduleText(text);
      const keys = Object.keys(parsed);
      if (keys.length === 0) {
        status.className = "sync-status warn";
        status.textContent = "Couldn't read any day/time rows. Enter hours manually below.";
        return;
      }
      const summary = DAY_DISPLAY.filter((d) => parsed[d.idx])
        .map((d) => { const p = parsed[d.idx]; return `${d.full}: ${p.off ? "Off" : (p.start + "–" + p.end)}`; })
        .join("\n");
      if (!confirm("OCR found:\n\n" + summary + "\n\nApply these hours? You can still edit them after.")) {
        status.hidden = true; return;
      }
      for (const [idx, p] of Object.entries(parsed)) {
        state.workSchedule.days[idx] = { off: !!p.off, start: p.start || "", end: p.end || "" };
      }
      state.workSchedule.updatedAt = Date.now();
      save();
      renderSchedule();
      status.className = "sync-status success";
      status.textContent = "Applied — review and tweak the hours below.";
    } catch (e) {
      status.className = "sync-status error";
      status.textContent = "OCR failed: " + (e.message || e);
    } finally {
      btn.disabled = false;
    }
  }

  // Read work hours from typed/pasted text (instant, offline — no OCR).
  function readHoursFromText() {
    const ta = $("#schedTextInput");
    const status = $("#schedOcrStatus");
    const text = (ta && ta.value || "").trim();
    if (!text) { showToast("Type or paste your schedule first."); return; }
    const parsed = parseScheduleText(text);
    const keys = Object.keys(parsed);
    if (keys.length === 0) {
      status.hidden = false; status.className = "sync-status warn";
      status.textContent = "Couldn't find day/time rows. Try one day per line, e.g. 'Mon 9:00-17:00'.";
      return;
    }
    const summary = DAY_DISPLAY.filter((d) => parsed[d.idx])
      .map((d) => { const p = parsed[d.idx]; return `${d.full}: ${p.off ? "Off" : (p.start + "–" + p.end)}`; })
      .join("\n");
    if (!confirm("Found:\n\n" + summary + "\n\nApply these hours? You can still edit them.")) return;
    for (const [idx, p] of Object.entries(parsed)) {
      state.workSchedule.days[idx] = { off: !!p.off, start: p.start || "", end: p.end || "" };
    }
    state.workSchedule.updatedAt = Date.now();
    save();
    renderSchedule();
    status.hidden = false; status.className = "sync-status success";
    status.textContent = `Applied ${keys.length} day${keys.length === 1 ? "" : "s"} — review below.`;
  }

  // Compute suggested new time for a habit that clashes with a work block.
  function suggestFit(habitMin, workStart, workEnd) {
    // Move to before work if the habit sits nearer the start, else after work.
    const distToStart = habitMin - workStart;
    const distToEnd = workEnd - habitMin;
    if (distToStart <= distToEnd) {
      let t = workStart - 45;                       // 45 min before shift
      if (t < 5 * 60) t = workEnd + 30;             // too early → put after work
      return t;
    }
    return workEnd + 30;                            // 30 min after shift
  }

  function renderConflicts() {
    const list = $("#conflictList");
    const applyAll = $("#applyAllFitBtn");
    if (!list) return;
    const sel = $("#schedRefDay");
    const dayIdx = sel ? Number(sel.value) : new Date().getDay();
    const day = state.workSchedule.days[dayIdx];
    list.innerHTML = "";
    if (applyAll) applyAll.hidden = true;

    if (!day || day.off || !day.start || !day.end) {
      list.innerHTML = `<p class="conflict-ok">No work hours set for ${DAY_DISPLAY.find(d=>d.idx===dayIdx)?.full || "this day"} — nothing to fit around.</p>`;
      return;
    }
    const ws = hhmmToMin(day.start), we = hhmmToMin(day.end);
    if (ws == null || we == null || we <= ws) {
      list.innerHTML = `<p class="conflict-ok">Enter a valid start and end time to see suggestions.</p>`;
      return;
    }

    const conflicts = [];
    for (const habit of state.habits) {
      if (!habit.days.includes(dayIdx)) continue;      // not scheduled that day
      const eff = effectiveTime(habit, dayIdx);         // per-day override if set
      const label = timeChipLabel(eff);                 // strips "· description"
      const hm = parseTimeToMinutes(label);
      if (hm == null || hm >= 24 * 60) continue;         // "All day"/named → flexible, skip
      if (hm >= ws && hm < we) {
        const newMin = suggestFit(hm, ws, we);
        conflicts.push({ habit, dayIdx, curTime: eff, newTime: minToClock(newMin) });
      }
    }

    if (conflicts.length === 0) {
      list.innerHTML = `<p class="conflict-ok">✓ No habits clash with your ${day.start}–${day.end} shift.</p>`;
      return;
    }

    for (const c of conflicts) {
      const row = document.createElement("div");
      row.className = "conflict-row";
      const icon = document.createElement("div");
      icon.className = "cf-icon";
      icon.style.background = c.habit.color;
      icon.textContent = c.habit.icon;
      const info = document.createElement("div");
      info.className = "cf-info";
      info.innerHTML = `<div class="cf-name">${escapeHtml(c.habit.name)}</div>` +
        `<div class="cf-move">${escapeHtml(timeChipLabel(c.curTime) || c.curTime)} → <b>${escapeHtml(c.newTime)}</b> <span style="opacity:.7">(${(DAY_DISPLAY.find(d=>d.idx===c.dayIdx)||{}).full || ""} only)</span></div>`;
      const btn = document.createElement("button");
      btn.className = "cf-apply";
      btn.textContent = "Apply";
      btn.addEventListener("click", () => { applyFit(c.habit.id, c.newTime, c.dayIdx); renderConflicts(); });
      row.appendChild(icon); row.appendChild(info); row.appendChild(btn);
      list.appendChild(row);
    }
    if (applyAll) {
      applyAll.hidden = false;
      applyAll.onclick = () => {
        for (const c of conflicts) applyFit(c.habit.id, c.newTime, c.dayIdx);
        renderConflicts();
        showToast(`Adjusted ${conflicts.length} habit${conflicts.length === 1 ? "" : "s"} for ${DAY_DISPLAY.find(d=>d.idx===dayIdx).full}.`, "success");
      };
    }
  }

  // Apply a new clock time to a habit for a specific day only (per-day override),
  // preserving any "· description" suffix from that day's current time.
  function applyFit(habitId, newClock, dayIdx) {
    const habit = state.habits.find((h) => h.id === habitId);
    if (!habit) return;
    const cur = effectiveTime(habit, dayIdx);
    const dotIdx = cur.indexOf("·");
    const suffix = dotIdx >= 0 ? " " + cur.slice(dotIdx) : "";
    if (!habit.dayTimes) habit.dayTimes = {};
    habit.dayTimes[dayIdx] = newClock + suffix;
    habit.updatedAt = Date.now();
    save();
  }

  /* ---- Progress / Measurements ---- */
  function currentWeekKey(offset) {
    const now = new Date();
    const weekStart = addDays(startOfWeekMonday(now), offset * 7);
    return dateKey(weekStart);
  }

  function renderProgress() {
    const els = getEls();
    const now = new Date();
    const weekStart = addDays(startOfWeekMonday(now), progressOffset * 7);
    const weekEnd = addDays(weekStart, 6);
    els.weekLabelP.textContent = progressOffset === 0
      ? `${formatDateShort(weekStart)} – ${formatDateShort(weekEnd)} · This week`
      : `${formatDateShort(weekStart)} – ${formatDateShort(weekEnd)}`;
    els.nextWeekP.disabled = progressOffset >= 0;

    // Update unit labels in the form
    document.querySelectorAll(".unit-w").forEach((e) => (e.textContent = wUnit()));
    document.querySelectorAll(".unit-l").forEach((e) => (e.textContent = lUnit()));

    const wk = dateKey(weekStart);
    const m = state.measurements[wk];
    els.mWeight.value = m && m.weight != null ? round1(wDisp(m.weight)) : "";
    els.mWaist.value = m && m.waist != null ? round1(lDisp(m.waist)) : "";
    els.mEnergy.value = m && m.energy != null ? m.energy : "";
    els.mStrength.value = m && m.strengthTrend ? m.strengthTrend : "";
    els.mNotes.value = m && m.notes ? m.notes : "";
    els.mSaved.hidden = true;

    renderCustomMetricFields(m);
    renderPhotoField(wk);
    renderGoal();
    renderProgressSummary();
    renderInsight();
    renderTrendMetricOptions();
    renderTrendChart();
    renderHistory();
  }

  /* ---- Custom metric fields in the form ---- */
  function renderCustomMetricFields(m) {
    const wrap = getEls().customMetricFields;
    wrap.innerHTML = "";
    for (const cm of state.customMetrics) {
      const field = document.createElement("label");
      field.className = "custom-metric-field";
      const val = m && m.custom && m.custom[cm.id] != null ? m.custom[cm.id] : "";
      field.innerHTML = `${escapeHtml(cm.name)}${cm.unit ? ` (${escapeHtml(cm.unit)})` : ""}
        <button type="button" class="custom-metric-remove" data-id="${cm.id}" title="Remove metric">✕</button>
        <input type="number" inputmode="decimal" step="any" data-metric="${cm.id}" value="${val}" />`;
      wrap.appendChild(field);
    }
    wrap.querySelectorAll(".custom-metric-remove").forEach((b) => {
      b.addEventListener("click", () => removeCustomMetric(b.dataset.id));
    });
  }

  function addCustomMetric() {
    const name = prompt("Metric name (e.g. Body fat, Chest, Sleep hrs):");
    if (!name || !name.trim()) return;
    const unit = prompt("Unit (optional, e.g. %, in, hrs):") || "";
    state.customMetrics.push({ id: uid(), name: name.trim().slice(0, 30), unit: unit.trim().slice(0, 12), updatedAt: Date.now() });
    save();
    renderProgress();
  }
  function removeCustomMetric(id) {
    const cm = state.customMetrics.find((c) => c.id === id);
    if (!cm) return;
    if (!confirm(`Remove "${cm.name}"? Logged values stay in your data but won't show.`)) return;
    state.customMetrics = state.customMetrics.filter((c) => c.id !== id);
    save();
    renderProgress();
  }

  /* ---- Progress photos (local-only, not synced) ---- */
  const PHOTOS_KEY = "ht_photos";
  function loadPhotos() {
    try { return JSON.parse(localStorage.getItem(PHOTOS_KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function savePhotos(p) {
    try { localStorage.setItem(PHOTOS_KEY, JSON.stringify(p)); }
    catch (e) {
      showToast(isQuotaError(e)
        ? "Storage full — couldn't save photo. Delete old photos in Settings first."
        : "Couldn't save photo.", "error");
    }
  }
  function getPhoto(wk) { return loadPhotos()[wk] || null; }
  function setPhoto(wk, dataUrl) {
    const p = loadPhotos();
    if (dataUrl) p[wk] = dataUrl; else delete p[wk];
    savePhotos(p);
  }

  // Downscale + compress an image File to a small JPEG data URL.
  function compressImage(file, maxDim = 480, quality = 0.6) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxDim) { height = height * maxDim / width; width = maxDim; }
          else if (height > maxDim) { width = width * maxDim / height; height = maxDim; }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function renderPhotoField(wk) {
    const thumb = $("#mPhotoThumb");
    const remove = $("#mPhotoRemove");
    const photo = getPhoto(wk);
    if (photo) {
      thumb.src = photo; thumb.hidden = false; remove.hidden = false;
    } else {
      thumb.hidden = true; remove.hidden = true; thumb.removeAttribute("src");
    }
  }

  async function onPhotoPick(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      const wk = currentWeekKey(progressOffset);
      setPhoto(wk, dataUrl);
      e.target.value = "";
      renderPhotoField(wk);
      renderHistory();
      showToast("Photo saved (this device).", "success");
    } catch (err) {
      showToast("Couldn't process that image.", "error");
    }
  }
  function removePhoto() {
    const wk = currentWeekKey(progressOffset);
    setPhoto(wk, null);
    renderPhotoField(wk);
    renderHistory();
  }
  function openPhotoViewer(src) {
    $("#photoViewerImg").src = src;
    $("#photoViewer").classList.remove("hidden");
  }

  /* ---- Goal ---- */
  function renderGoal() {
    const els = getEls();
    const body = $("#goalBody");
    const g = state.goal;
    if (!g) {
      body.innerHTML = '<p class="empty-inline">Set a target weight to track progress and see a projected date.</p>';
      $("#editGoalBtn").textContent = "Set goal ›";
      return;
    }
    $("#editGoalBtn").textContent = "Edit goal ›";
    const wl = measurementsWithWeight();
    const start = wl.length ? wl[0].weight : null;
    const latest = wl.length ? wl[wl.length - 1].weight : null;
    const target = g.targetWeight;

    let html = "";
    const tDisp = `${round1(wDisp(target))} ${wUnit()}`;
    if (latest == null || start == null) {
      html = `<div class="goal-meta"><span>Target: <b>${tDisp}</b></span><span>Log your weight to track progress.</span></div>`;
    } else {
      const totalDelta = target - start;      // could be negative (weight loss)
      const doneDelta = latest - start;
      let pct = totalDelta === 0 ? 100 : Math.round((doneDelta / totalDelta) * 100);
      pct = Math.max(0, Math.min(100, pct));
      const remaining = latest - target;
      const reached = (totalDelta < 0 && latest <= target) || (totalDelta > 0 && latest >= target) || Math.abs(remaining) < 0.05;

      // Projection from average weekly change (elapsed weeks, not entry count)
      const weeks = weeksBetween(wl[0].weekKey, wl[wl.length - 1].weekKey) || (wl.length - 1);
      const avgWk = weeks > 0 ? (latest - start) / weeks : 0;
      let projection = "";
      if (!reached && avgWk !== 0 && Math.sign(avgWk) === Math.sign(target - latest)) {
        const weeksLeft = Math.abs((target - latest) / avgWk);
        const eta = addDays(new Date(), Math.ceil(weeksLeft * 7));
        projection = `On pace for <b>${eta.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</b> (~${round1(Math.abs(avgWk))} ${wUnit()}/wk)`;
      } else if (!reached) {
        projection = `Not trending toward the goal yet`;
      }

      html = `
        <div class="goal-progress-wrap">
          <div class="goal-progress-head">
            <span>${round1(wDisp(latest))} → ${tDisp}</span>
            <span class="${reached ? "goal-reached" : "goal-remaining"}">${reached ? "🎉 Goal reached!" : `${round1(Math.abs(wDisp(remaining)))} ${wUnit()} to go`}</span>
          </div>
          <div class="goal-bar"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
          <div class="goal-meta">
            ${projection ? `<span>${projection}</span>` : ""}
            ${g.targetDate ? `<span>Target date: <b>${escapeHtml(g.targetDate)}</b></span>` : ""}
          </div>
        </div>`;
    }
    body.innerHTML = html;
  }

  function openGoalForm() {
    const els = getEls();
    $("#goalBody").hidden = true;
    $("#goalForm").hidden = false;
    $("#goalWeight").value = state.goal ? round1(wDisp(state.goal.targetWeight)) : "";
    $("#goalDate").value = state.goal ? (state.goal.targetDate || "") : "";
    document.querySelectorAll(".unit-w").forEach((e) => (e.textContent = wUnit()));
    setTimeout(() => $("#goalWeight").focus(), 40);
  }
  function closeGoalForm() {
    $("#goalForm").hidden = true;
    $("#goalBody").hidden = false;
  }
  function saveGoal(e) {
    e.preventDefault();
    const v = numOrNull($("#goalWeight").value);
    if (v === null || v <= 0) { alert("Enter a target weight."); return; }
    state.goal = {
      targetWeight: wStore(v),
      targetDate: /^\d{4}-\d{2}-\d{2}$/.test($("#goalDate").value) ? $("#goalDate").value : "",
      updatedAt: Date.now(),
    };
    save();
    closeGoalForm();
    renderProgress();
    showToast("Goal saved.", "success");
  }
  function clearGoal() {
    state.goal = null;
    save();
    closeGoalForm();
    renderProgress();
  }

  function measurementList() {
    return Object.entries(state.measurements)
      .map(([k, v]) => ({ ...v, weekKey: k }))
      .filter((e) => e.weight !== null || e.waist !== null || e.energy !== null || e.strengthTrend || e.notes || (e.custom && Object.keys(e.custom).length))
      .sort((a, b) => a.weekKey.localeCompare(b.weekKey));
  }
  // Actual calendar weeks between two "YYYY-MM-DD" week keys (Mondays). Used so
  // weekly-rate math reflects elapsed time, not the number of logged entries
  // (logging is sporadic, so entry-count is not a reliable week count).
  function weeksBetween(weekKeyA, weekKeyB) {
    const pa = String(weekKeyA).split("-").map(Number);
    const pb = String(weekKeyB).split("-").map(Number);
    if (pa.length !== 3 || pb.length !== 3 || pa.some(isNaN) || pb.some(isNaN)) return 0;
    const a = new Date(pa[0], pa[1] - 1, pa[2]);
    const b = new Date(pb[0], pb[1] - 1, pb[2]);
    return Math.round((b - a) / (7 * 86400000));
  }
  function measurementsWithWeight() { return measurementList().filter((e) => e.weight !== null); }

  function setDeltaCard(el, delta, unit) {
    el.classList.remove("up", "down");
    if (Math.abs(delta) < 0.05) { el.textContent = `0 ${unit}`; return; }
    const sign = delta > 0 ? "+" : "−";
    el.textContent = `${sign}${round1(Math.abs(delta))} ${unit}`;
    if (delta < 0) el.classList.add("up"); else el.classList.add("down");
  }

  function renderProgressSummary() {
    const els = getEls();
    const all = measurementList();
    const wl = measurementsWithWeight();

    if (wl.length === 0) {
      els.pStartWeight.textContent = "—";
      els.pLatestWeight.textContent = "—";
      els.pChange.textContent = "—";
      els.pAvgWeekly.textContent = "—";
    } else {
      const start = wl[0], latest = wl[wl.length - 1];
      els.pStartWeight.textContent = `${round1(wDisp(start.weight))} ${wUnit()}`;
      els.pLatestWeight.textContent = `${round1(wDisp(latest.weight))} ${wUnit()}`;
      const change = latest.weight - start.weight;
      const weeks = weeksBetween(wl[0].weekKey, wl[wl.length - 1].weekKey) || (wl.length - 1);
      setDeltaCard(els.pChange, wDisp(change), wUnit());
      setDeltaCard(els.pAvgWeekly, wDisp(weeks > 0 ? change / weeks : 0), wUnit());
    }

    const waistList = all.filter((e) => e.waist !== null);
    if (waistList.length === 0) {
      els.pWaistChange.textContent = "—";
    } else {
      const w0 = waistList[0].waist, w1 = waistList[waistList.length - 1].waist;
      setDeltaCard(els.pWaistChange, lDisp(w1 - w0), lUnit());
    }

    const energies = all.map((e) => e.energy).filter((v) => v !== null && v !== undefined);
    if (energies.length === 0) els.pAvgEnergy.textContent = "—";
    else {
      els.pAvgEnergy.textContent = String(round1(energies.reduce((s, v) => s + v, 0) / energies.length));
      els.pAvgEnergy.classList.remove("up", "down");
    }

    // Mini-deltas: latest vs previous entry
    const setMini = (el, latestArr, conv, unit, lowerIsBetter) => {
      if (!el) return;
      el.classList.remove("up", "down");
      if (latestArr.length < 2) { el.textContent = ""; return; }
      const d = latestArr[latestArr.length - 1] - latestArr[latestArr.length - 2];
      if (Math.abs(d) < 0.05) { el.textContent = "no change"; return; }
      const good = lowerIsBetter ? d < 0 : d > 0;
      el.classList.add(good ? "up" : "down");
      el.textContent = `${d > 0 ? "+" : "−"}${round1(Math.abs(conv(d)))} ${unit} vs last`;
    };
    setMini($("#pLatestMeta"), wl.map((e) => e.weight), wDisp, wUnit(), true);
    setMini($("#pWaistMeta"), waistList.map((e) => e.waist), lDisp, lUnit(), true);
    setMini($("#pEnergyMeta"), all.filter((e) => e.energy != null).map((e) => e.energy), (x) => x, "", false);
  }

  // Pearson correlation coefficient, or null if undefined.
  function pearson(xs, ys) {
    const n = Math.min(xs.length, ys.length);
    if (n < 2) return null;
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (let i = 0; i < n; i++) {
      const x = xs[i], y = ys[i];
      sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
    }
    const num = n * sxy - sx * sy;
    const den = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
    return den === 0 ? null : num / den;
  }

  /* ---- Insight line ---- */
  function renderInsight() {
    const card = $("#insightCard");
    const el = $("#insightText");
    const wl = measurementsWithWeight();
    const parts = [];
    if (wl.length >= 2) {
      const start = wl[0], latest = wl[wl.length - 1];
      const change = latest.weight - start.weight;
      const weeks = weeksBetween(wl[0].weekKey, wl[wl.length - 1].weekKey) || (wl.length - 1);
      const avg = weeks > 0 ? change / weeks : 0;
      const dir = change < 0 ? "Down" : change > 0 ? "Up" : "Flat";
      parts.push(`${dir} ${round1(Math.abs(wDisp(change)))} ${wUnit()} over ${weeks} week${weeks === 1 ? "" : "s"} (~${round1(Math.abs(wDisp(avg)))}/wk).`);
    }
    const waistList = measurementList().filter((e) => e.waist !== null);
    if (waistList.length >= 2) {
      const d = waistList[waistList.length - 1].waist - waistList[0].waist;
      if (Math.abs(d) >= 0.1) parts.push(`Waist ${d < 0 ? "−" : "+"}${round1(Math.abs(lDisp(d)))} ${lUnit()}.`);
    }
    const energyList = measurementList().filter((e) => e.energy != null);
    if (energyList.length >= 2) {
      const d = energyList[energyList.length - 1].energy - energyList[0].energy;
      if (Math.abs(d) >= 1) parts.push(`Energy ${d > 0 ? "up" : "down"} ${Math.abs(d)} pt${Math.abs(d) === 1 ? "" : "s"}.`);
    }
    // Correlation between weight and energy (needs 4+ weeks with both).
    const paired = measurementList().filter((e) => e.weight != null && e.energy != null);
    if (paired.length >= 4) {
      const r = pearson(paired.map((e) => e.weight), paired.map((e) => e.energy));
      if (r != null && Math.abs(r) >= 0.5) {
        parts.push(r < 0
          ? "Your energy tends to be higher on lower-weight weeks."
          : "Your energy tends to rise along with your weight.");
      }
    }
    // Correlation between weekly habit adherence and energy.
    const enWeeks = measurementList().filter((e) => e.energy != null);
    if (enWeeks.length >= 4) {
      const ad = [], en = [];
      for (const e of enWeeks) {
        const parts2 = String(e.weekKey).split("-").map(Number);
        if (parts2.length !== 3) continue;
        const wkStart = new Date(parts2[0], parts2[1] - 1, parts2[2]);
        const p = weekAdherencePct(wkStart);
        if (p != null) { ad.push(p); en.push(e.energy); }
      }
      if (ad.length >= 4) {
        const r = pearson(ad, en);
        if (r != null && Math.abs(r) >= 0.5) {
          parts.push(r > 0
            ? "Your energy runs higher on weeks you keep your habits."
            : "Interestingly, your energy dips on higher-adherence weeks — maybe you're pushing hard.");
        }
      }
    }
    if (parts.length === 0) { card.hidden = true; return; }
    card.hidden = false;
    el.textContent = parts.join(" ");
  }

  /* ---- Trend metric selector ---- */
  let trendMetric = "weight";
  function trendMetricSeries(metric) {
    // Returns [{weekKey, value}] sorted by weekKey. Progress = body metrics only.
    const list = measurementList();
    const conv = metric === "weight" ? wDisp : metric === "waist" ? lDisp : (x) => x;
    return list
      .map((e) => {
        let v = null;
        if (metric === "weight") v = e.weight;
        else if (metric === "waist") v = e.waist;
        else if (metric === "energy") v = e.energy;
        else if (metric.startsWith("cm:")) v = e.custom ? e.custom[metric.slice(3)] : null;
        return v == null ? null : { weekKey: e.weekKey, value: conv(v) };
      })
      .filter(Boolean);
  }

  function renderTrendMetricOptions() {
    const sel = getEls().trendMetric;
    if (!sel) return;
    const opts = [
      { v: "weight", label: `Weight (${wUnit()})` },
      { v: "waist", label: `Waist (${lUnit()})` },
      { v: "energy", label: "Energy" },
    ];
    for (const cm of state.customMetrics) opts.push({ v: "cm:" + cm.id, label: cm.name + (cm.unit ? ` (${cm.unit})` : "") });
    // Preserve selection if still valid
    if (!opts.some((o) => o.v === trendMetric)) trendMetric = "weight";
    sel.innerHTML = opts.map((o) => `<option value="${o.v}"${o.v === trendMetric ? " selected" : ""}>${escapeHtml(o.label)}</option>`).join("");
  }

  function renderTrendChart() {
    const els = getEls();
    els.trendChart.innerHTML = "";
    const series = trendMetricSeries(trendMetric);
    if (series.length < 2) {
      els.trendChart.classList.add("hidden");
      els.trendEmpty.classList.remove("hidden");
      els.trendEmpty.textContent = series.length === 0
        ? "No data for this metric yet."
        : "Log another week to see the trend line.";
      els.trendRange.textContent = "";
      const lg = $("#chartLegend"); if (lg) lg.hidden = true;
      return;
    }
    els.trendChart.classList.remove("hidden");
    els.trendEmpty.classList.add("hidden");

    const recent = series.slice(-12);
    els.trendRange.textContent = `${recent[0].weekKey} → ${recent[recent.length - 1].weekKey}`;

    const w = 320, h = 160, padX = 24, padY = 20;
    const weights = recent.map((r) => r.value);
    // Include the goal value in the scale so the goal line is visible.
    const goalVal = (trendMetric === "weight" && state.goal) ? wDisp(state.goal.targetWeight) : null;
    const scaleVals = goalVal !== null ? [...weights, goalVal] : weights;
    const min = Math.min(...scaleVals);
    const max = Math.max(...scaleVals);
    const range = Math.max(0.5, max - min);
    const stepX = (w - padX * 2) / Math.max(1, recent.length - 1);
    const yFor = (v) => padY + ((max - v) / range) * (h - padY * 2);
    const points = recent.map((r, i) => ({ x: padX + i * stepX, y: yFor(r.value), value: r.value, weekKey: r.weekKey }));
    const SVGNS = "http://www.w3.org/2000/svg";
    const showAvgLegend = recent.length >= 3;
    const showGoalLegend = goalVal !== null;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("preserveAspectRatio", "none");

    for (let i = 0; i < 3; i++) {
      const y = padY + ((h - padY * 2) * i) / 2;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", padX); line.setAttribute("x2", w - padX);
      line.setAttribute("y1", y); line.setAttribute("y2", y);
      line.setAttribute("stroke", "currentColor");
      line.setAttribute("opacity", "0.12");
      svg.appendChild(line);
    }

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    grad.setAttribute("id", "trendGrad");
    grad.setAttribute("x1", "0"); grad.setAttribute("y1", "0");
    grad.setAttribute("x2", "0"); grad.setAttribute("y2", "1");
    const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", "#6366f1");
    stop1.setAttribute("stop-opacity", "0.55");
    const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", "#6366f1");
    stop2.setAttribute("stop-opacity", "0");
    grad.appendChild(stop1); grad.appendChild(stop2); defs.appendChild(grad);
    svg.appendChild(defs);

    const areaPath = `M ${points[0].x} ${h - padY} ` +
      points.map((p) => `L ${p.x} ${p.y}`).join(" ") +
      ` L ${points[points.length - 1].x} ${h - padY} Z`;
    const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
    area.setAttribute("d", areaPath);
    area.setAttribute("fill", "url(#trendGrad)");
    area.setAttribute("opacity", "0.55");
    svg.appendChild(area);

    const linePath = "M " + points.map((p) => `${p.x} ${p.y}`).join(" L ");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    line.setAttribute("d", linePath);
    line.setAttribute("stroke", "#6366f1");
    line.setAttribute("stroke-width", "2.5");
    line.setAttribute("fill", "none");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("stroke-linejoin", "round");
    svg.appendChild(line);

    for (const p of points) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", p.x); c.setAttribute("cy", p.y);
      c.setAttribute("r", "3.5"); c.setAttribute("fill", "#6366f1");
      svg.appendChild(c);
    }

    const minLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    minLabel.setAttribute("x", 4); minLabel.setAttribute("y", h - padY + 4);
    minLabel.setAttribute("fill", "currentColor"); minLabel.setAttribute("opacity", "0.55");
    minLabel.setAttribute("font-size", "10");
    minLabel.textContent = round1(min);
    const maxLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    maxLabel.setAttribute("x", 4); maxLabel.setAttribute("y", padY);
    maxLabel.setAttribute("fill", "currentColor"); maxLabel.setAttribute("opacity", "0.55");
    maxLabel.setAttribute("font-size", "10");
    maxLabel.textContent = round1(max);
    svg.appendChild(minLabel); svg.appendChild(maxLabel);

    // ---- Rolling 3-point average line (dashed teal) ----
    if (recent.length >= 3) {
      const avgPts = recent.map((r, i) => {
        const lo = Math.max(0, i - 2);
        const window = recent.slice(lo, i + 1);
        const avg = window.reduce((s, x) => s + x.value, 0) / window.length;
        return { x: padX + i * stepX, y: yFor(avg) };
      });
      const avgPath = document.createElementNS(SVGNS, "path");
      avgPath.setAttribute("d", "M " + avgPts.map((p) => `${p.x} ${p.y}`).join(" L "));
      avgPath.setAttribute("stroke", "#14b8a6");
      avgPath.setAttribute("stroke-width", "2");
      avgPath.setAttribute("stroke-dasharray", "5 4");
      avgPath.setAttribute("fill", "none");
      avgPath.setAttribute("opacity", "0.9");
      svg.appendChild(avgPath);
    }

    // ---- Goal line + projection (weight only) ----
    if (goalVal !== null) {
      const gy = yFor(goalVal);
      const gLine = document.createElementNS(SVGNS, "line");
      gLine.setAttribute("x1", padX); gLine.setAttribute("x2", w - padX);
      gLine.setAttribute("y1", gy); gLine.setAttribute("y2", gy);
      gLine.setAttribute("stroke", "#f59e0b");
      gLine.setAttribute("stroke-width", "1.5");
      gLine.setAttribute("stroke-dasharray", "4 3");
      svg.appendChild(gLine);
      // Projection: dashed line from last point toward the goal, based on avg weekly change
      const wl = measurementsWithWeight();
      if (wl.length >= 2) {
        const weeks = wl.length - 1;
        const avgWk = wDisp((wl[wl.length - 1].weight - wl[0].weight) / weeks);
        const lastPt = points[points.length - 1];
        if (avgWk !== 0 && Math.sign(avgWk) === Math.sign(goalVal - lastPt.value)) {
          const weeksLeft = Math.abs((goalVal - lastPt.value) / avgWk);
          // Extend the x a little to indicate future direction
          const projX = Math.min(w - padX, lastPt.x + Math.min(weeksLeft, 6) * stepX);
          const proj = document.createElementNS(SVGNS, "path");
          proj.setAttribute("d", `M ${lastPt.x} ${lastPt.y} L ${projX} ${gy}`);
          proj.setAttribute("stroke", "#f59e0b");
          proj.setAttribute("stroke-width", "2");
          proj.setAttribute("stroke-dasharray", "2 3");
          proj.setAttribute("fill", "none");
          proj.setAttribute("opacity", "0.8");
          svg.appendChild(proj);
        }
      }
    }

    els.trendChart.appendChild(svg);

    // ---- Hover / tap tooltip ----
    let tip = null;
    const unitLabel = trendMetric === "adherence" ? "%"
      : trendMetric === "weight" ? " " + wUnit()
      : trendMetric === "waist" ? " " + lUnit() : "";
    function showTip(pt) {
      if (!tip) {
        tip = document.createElement("div");
        tip.className = "chart-tooltip";
        els.trendChart.appendChild(tip);
      }
      tip.textContent = `${round1(pt.value)}${unitLabel} · ${pt.weekKey}`;
      tip.style.left = (pt.x / w * 100) + "%";
      tip.style.top = (pt.y / h * 100) + "%";
    }
    function hideTip() { if (tip) { tip.remove(); tip = null; } }
    points.forEach((pt) => {
      const hit = document.createElementNS(SVGNS, "circle");
      hit.setAttribute("cx", pt.x); hit.setAttribute("cy", pt.y);
      hit.setAttribute("r", "10"); hit.setAttribute("fill", "transparent");
      hit.style.cursor = "pointer";
      hit.addEventListener("mouseenter", () => showTip(pt));
      hit.addEventListener("mouseleave", hideTip);
      hit.addEventListener("click", () => { showTip(pt); setTimeout(hideTip, 1800); });
      svg.appendChild(hit);
    });

    // ---- Legend ----
    const legend = $("#chartLegend");
    if (legend) {
      const items = [`<span class="cl"><span class="cl-line solid"></span>${escapeHtml(getEls().trendMetric.selectedOptions[0]?.textContent || "Value")}</span>`];
      if (showAvgLegend) items.push(`<span class="cl"><span class="cl-line avg"></span>3-wk average</span>`);
      if (showGoalLegend) items.push(`<span class="cl"><span class="cl-line goal"></span>Goal</span>`);
      legend.innerHTML = items.join("");
      legend.hidden = false;
    }
  }

  function renderHistory() {
    const els = getEls();
    els.measurementHistory.innerHTML = "";
    const list = measurementList();
    if (list.length === 0) {
      const p = document.createElement("p");
      p.className = "empty-inline";
      p.textContent = "No entries yet.";
      els.measurementHistory.appendChild(p);
      return;
    }
    const wl = measurementsWithWeight();
    const reversed = [...list].reverse();
    for (const m of reversed) {
      const row = document.createElement("div");
      row.className = "history-row";
      const wk = document.createElement("div");
      const weekNum = list.findIndex((x) => x.weekKey === m.weekKey) + 1;
      wk.innerHTML = `<div class="history-week">Week ${weekNum}</div><div class="history-date">${m.weekKey}</div>`;
      const photo = getPhoto(m.weekKey);
      if (photo) {
        const img = document.createElement("img");
        img.className = "history-photo";
        img.src = photo;
        img.alt = "Progress photo";
        img.style.marginTop = "6px";
        img.addEventListener("click", () => openPhotoViewer(photo));
        wk.appendChild(img);
      }

      const vals = document.createElement("div");
      vals.className = "history-values";
      const parts = [];
      if (m.weight != null) parts.push(`<b>${round1(wDisp(m.weight))}</b> ${wUnit()}`);
      if (m.waist != null) parts.push(`<b>${round1(lDisp(m.waist))}</b> ${lUnit()}`);
      if (m.energy != null) parts.push(`Energy <b>${m.energy}</b>`);
      if (m.strengthTrend) parts.push(`Strength <b>${escapeHtml(m.strengthTrend)}</b>`);
      if (m.custom) {
        for (const cm of state.customMetrics) {
          if (m.custom[cm.id] != null) parts.push(`${escapeHtml(cm.name)} <b>${round1(m.custom[cm.id])}</b>${cm.unit ? " " + escapeHtml(cm.unit) : ""}`);
        }
      }
      vals.innerHTML = parts.join("");
      if (m.notes) {
        const notes = document.createElement("div");
        notes.style.cssText = "color: var(--text-dim); font-size: 0.75rem; margin-top: 4px";
        notes.textContent = m.notes;
        vals.appendChild(notes);
      }

      const right = document.createElement("div");
      const delta = document.createElement("div");
      delta.className = "history-delta";
      if (m.weight != null) {
        const idx = wl.findIndex((x) => x.weekKey === m.weekKey);
        if (idx > 0) {
          const d = m.weight - wl[idx - 1].weight;
          if (Math.abs(d) < 0.05) delta.textContent = `0 ${wUnit()}`;
          else {
            delta.textContent = `${d > 0 ? "+" : "−"}${round1(Math.abs(wDisp(d)))} ${wUnit()}`;
            delta.classList.add(d < 0 ? "up" : "down");
          }
        }
      }
      right.appendChild(delta);
      const actions = document.createElement("div");
      actions.className = "history-actions";
      const editBtn = document.createElement("button");
      editBtn.className = "history-btn";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => {
        // Jump the form to this week
        const now = new Date();
        const thisWeekStart = dateKey(startOfWeekMonday(now));
        const targetStart = m.weekKey;
        const diffWeeks = Math.round((new Date(targetStart) - new Date(thisWeekStart)) / (7 * 86400000));
        progressOffset = diffWeeks;
        renderProgress();
        getEls().mWeight.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      const delBtn = document.createElement("button");
      delBtn.className = "history-btn del";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => {
        if (!confirm(`Delete the entry for ${m.weekKey}?`)) return;
        delete state.measurements[m.weekKey];
        save();
        renderProgress();
      });
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      right.appendChild(actions);

      row.appendChild(wk);
      row.appendChild(vals);
      row.appendChild(right);
      els.measurementHistory.appendChild(row);
    }
  }

  function saveMeasurement(e) {
    e.preventDefault();
    const els = getEls();
    const wk = currentWeekKey(progressOffset);
    const wVal = numOrNull(els.mWeight.value);
    const waistVal = numOrNull(els.mWaist.value);
    // Custom metric values from the dynamic fields
    const custom = {};
    els.customMetricFields.querySelectorAll("input[data-metric]").forEach((inp) => {
      const v = numOrNull(inp.value);
      if (v !== null) custom[inp.dataset.metric] = v;
    });
    // Preserve the canonical stored value on a no-op save so re-saving an
    // unchanged record in metric mode doesn't drift via kg↔lb rounding.
    const prev = state.measurements[wk] || {};
    const weight = wVal === null ? null
      : (prev.weight != null && round1(wDisp(prev.weight)) === round1(wVal) ? prev.weight : wStore(wVal));
    const waist = waistVal === null ? null
      : (prev.waist != null && round1(lDisp(prev.waist)) === round1(waistVal) ? prev.waist : lStore(waistVal));
    const data = {
      date: wk,
      weight,   // canonical lb
      waist,    // canonical in
      energy: numOrNull(els.mEnergy.value),
      strengthTrend: els.mStrength.value,
      notes: els.mNotes.value.trim(),
      custom,
      updatedAt: Date.now(),
    };
    const hasAny = data.weight !== null || data.waist !== null || data.energy !== null ||
      data.strengthTrend || data.notes || Object.keys(custom).length > 0;
    if (!hasAny) delete state.measurements[wk];
    else state.measurements[wk] = data;
    save();
    els.mSaved.hidden = false;
    setTimeout(() => (els.mSaved.hidden = true), 1500);
    renderGoal();
    renderProgressSummary();
    renderInsight();
    renderTrendMetricOptions();
    renderTrendChart();
    renderHistory();
  }

  function clearMeasurement() {
    const els = getEls();
    const wk = currentWeekKey(progressOffset);
    if (!state.measurements[wk]) {
      els.mWeight.value = els.mWaist.value = els.mEnergy.value = els.mNotes.value = "";
      els.mStrength.value = "";
      return;
    }
    if (!confirm("Clear this week's measurement?")) return;
    delete state.measurements[wk];
    save();
    renderProgress();
  }

  /* ================================================================
   * Settings
   * ================================================================ */

  function hydrateSettings() {
    const els = getEls();
    if (!els.syncTokenInput) return;
    els.syncTokenInput.value = localStorage.getItem(KEYS.syncToken) || "";
    els.syncGistIdInput.value = localStorage.getItem(KEYS.syncGistId) || "";
    els.autoSyncToggle.checked = isAutoSyncEnabled();
    els.themeSelect.value = localStorage.getItem(KEYS.theme) || "auto";
    if (els.langSelect) {
      els.langSelect.innerHTML = availableLangs().map((l) => `<option value="${l}">${LANG_NAMES[l] || l}</option>`).join("");
      els.langSelect.value = currentLang();
    }
    renderAccentPicker();
    if (els.textSizeSelect) els.textSizeSelect.value = localStorage.getItem(KEYS.textSize) || "normal";
    if (els.contrastToggle) els.contrastToggle.checked = localStorage.getItem(KEYS.contrast) === "true";
    els.remindersToggle.checked = remindersEnabled() && ("Notification" in window) && Notification.permission === "granted";
    els.compactToggle.checked = localStorage.getItem(KEYS.compact) === "true";
    els.timeFormatSelect.value = timeFmt();
    els.showDetailsToggle.checked = localStorage.getItem(KEYS.showDetails) === "true";
    if (els.showTodayNotesToggle) els.showTodayNotesToggle.checked = localStorage.getItem(KEYS.showTodayNotes) === "true";
    renderTrash();
    els.unitsSelect.value = localStorage.getItem(KEYS.units) === "metric" ? "metric" : "imperial";
    els.deviceNameInput.value = localStorage.getItem(KEYS.deviceName) || "";
    els.reminderDefault.value = localStorage.getItem(KEYS.reminderDefault) || "";
    els.soundToggle.checked = soundEnabled();
    els.quietStart.value = localStorage.getItem(KEYS.quietStart) || "";
    els.quietEnd.value = localStorage.getItem(KEYS.quietEnd) || "";
    els.morningDigest.value = localStorage.getItem(KEYS.morningDigest) || "";
    els.eveningNudge.value = localStorage.getItem(KEYS.eveningNudge) || "";
    els.weeklyReport.value = localStorage.getItem(KEYS.weeklyReport) || "";
    els.snoozeDuration.value = String(snoozeMinutes());
    els.pushUrl.value = localStorage.getItem(KEYS.pushUrl) || "";
    els.pushVapid.value = localStorage.getItem(KEYS.pushVapid) || "";
    els.pushToggle.checked = pushEnabled();
    renderReminderInfo();
    // Show the iOS guidance note on Apple devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const note = $("#iosNote");
    if (note) note.hidden = !isIOS;
    renderSyncStateLine();
    renderDataSummary();
    renderDeviceList();
    renderCategoryManager();
    renderVacationSettings();
    const odHint = document.getElementById("odRedirectHint");
    if (odHint) odHint.textContent = odRedirectUri();
    renderOneDriveState();
  }

  function renderDeviceList() {
    const wrap = document.getElementById("deviceList");
    if (!wrap) return;
    wrap.innerHTML = "";
    const devices = state.devices || {};
    const entries = Object.entries(devices).sort((a, b) => (b[1].lastSync || 0) - (a[1].lastSync || 0));
    const myId = getDeviceId();
    if (entries.length === 0) {
      wrap.innerHTML = '<p class="empty-inline">No devices yet. Push once to register this device.</p>';
      return;
    }
    for (const [id, d] of entries) {
      const row = document.createElement("div");
      row.className = "device-row";
      const isMe = id === myId;
      row.innerHTML =
        `<span class="dv-icon">${isMe ? "📱" : "🖥️"}</span>` +
        `<div class="dv-info"><div class="dv-name">${escapeHtml(d.name || "Device")}` +
        `${isMe ? '<span class="dv-you">THIS DEVICE</span>' : ""}</div>` +
        `<div class="dv-when">Last synced ${timeAgo(d.lastSync)}</div></div>`;
      if (!isMe) {
        const rm = document.createElement("button");
        rm.className = "dv-remove";
        rm.textContent = "✕";
        rm.title = "Remove this device from the list";
        rm.addEventListener("click", () => {
          if (!confirm(`Remove "${d.name}" from the device list? It'll reappear if that device syncs again.`)) return;
          delete state.devices[id];
          save();
          renderDeviceList();
        });
        row.appendChild(rm);
      }
      wrap.appendChild(row);
    }
  }

  function getDeviceName() {
    return localStorage.getItem(KEYS.deviceName) || "This device";
  }
  function getDeviceId() {
    let id = localStorage.getItem("ht_device_id");
    if (!id) { id = uid(); localStorage.setItem("ht_device_id", id); }
    return id;
  }
  // Record this device's presence in the synced state.
  function stampThisDevice() {
    if (!state.devices) state.devices = {};
    state.devices[getDeviceId()] = { name: getDeviceName(), lastSync: Date.now() };
  }

  function timeAgo(ts) {
    if (!ts) return "never";
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
    return `${Math.floor(s / 86400)} day(s) ago`;
  }

  function renderSyncStateLine() {
    const el = $("#syncStateLine");
    if (!el) return;
    const configured = !!localStorage.getItem(KEYS.syncToken);
    if (!configured) { el.hidden = true; return; }
    el.hidden = false;
    let auto = isAutoSyncEnabled() ? "on" : "off";
    if (isRateLimited()) auto = `paused until ${new Date(rateLimitResetAt).toLocaleTimeString()}`;
    const detail = syncDetailText();
    el.innerHTML = `☁️ Last synced <b>${timeAgo(lastSyncedAt)}</b> · Device: <b>${escapeHtml(getDeviceName())}</b> · Auto-sync <b>${auto}</b>` +
      (detail ? `<br><span class="sync-detail">${escapeHtml(detail)}</span>` : "");
  }
  // Last sync action summary (transparency): what happened and when.
  function recordSyncDetail(action, extra) {
    try { localStorage.setItem("ht_sync_detail", JSON.stringify({ ts: Date.now(), action, extra: extra || "" })); } catch (e) {}
  }
  function syncDetailText() {
    try {
      const d = JSON.parse(localStorage.getItem("ht_sync_detail") || "null");
      if (!d || !d.ts) return "";
      return `${d.action} ${timeAgo(d.ts)}${d.extra ? " · " + d.extra : ""}`;
    } catch (e) { return ""; }
  }

  function renderDataSummary() {
    const wrap = $("#dataSummary");
    if (!wrap) return;
    let checkins = 0;
    for (const day of Object.keys(state.completions)) checkins += Object.keys(state.completions[day]).length;
    const measurements = Object.keys(state.measurements).length;
    const photos = Object.keys(loadPhotos()).length;
    const bytes = estimateStorageBytes();
    const used = bytes >= 1024 * 1024
      ? (bytes / (1024 * 1024)).toFixed(1) + " MB"
      : Math.round(bytes / 1024) + " KB";
    const items = [
      { n: state.habits.length, l: "Habits" },
      { n: checkins, l: "Check-ins" },
      { n: measurements, l: "Weekly logs" },
      { n: photos, l: "Photos" },
      { n: state.customMetrics.length, l: "Custom metrics" },
      { n: used, l: "Storage used" },
    ];
    let html = items.map((i) => `<div class="ds-item"><div class="ds-num">${i.n}</div><div class="ds-label">${i.l}</div></div>`).join("");
    wrap.innerHTML = html;
    // Storage meter: total vs ~5 MB, with the photos share highlighted.
    const meter = $("#storageMeter");
    if (meter) {
      const cap = 5 * 1024 * 1024;
      const pBytes = photosBytes();
      const totalPct = Math.min(100, Math.round((bytes / cap) * 100));
      const photoPct = Math.min(100, Math.round((pBytes / cap) * 100));
      const pLabel = pBytes >= 1024 * 1024 ? (pBytes / (1024 * 1024)).toFixed(1) + " MB" : Math.round(pBytes / 1024) + " KB";
      meter.innerHTML =
        `<div class="sm-bar"><span class="sm-fill" style="width:${totalPct}%"></span><span class="sm-photos" style="width:${photoPct}%"></span></div>
         <div class="sm-legend"><span>${used} of ~5 MB used (${totalPct}%)</span><span class="sm-photo-key">📷 photos ${pLabel}</span></div>`;
    }
    // Proactive storage warning
    const warn = $("#storageWarn");
    if (warn) {
      const pct = Math.round((bytes / (5 * 1024 * 1024)) * 100);
      if (bytes >= STORAGE_WARN_BYTES) {
        warn.hidden = false;
        warn.textContent = `⚠️ Storage is ${pct}% full (~${used} of ~5 MB). Export a backup, then delete old progress photos or check-in history to free space.`;
      } else {
        warn.hidden = true;
      }
    }
  }

  /* ---- Category management ---- */
  function renderCategoryManager() {
    const wrap = $("#categoryManager");
    if (!wrap) return;
    wrap.innerHTML = "";
    const counts = {};
    for (const h of state.habits) counts[h.category] = (counts[h.category] || 0) + 1;
    const cats = getCategories();
    cats.forEach((cat, idx) => {
      const meta = categoryMeta(cat);
      const row = document.createElement("div");
      row.className = "category-row";

      // Reorder controls (up/down — reliable on touch)
      const reorder = document.createElement("div");
      reorder.className = "cat-reorder";
      const up = document.createElement("button");
      up.className = "cat-move"; up.textContent = "▲"; up.title = "Move up";
      up.disabled = idx === 0;
      up.addEventListener("click", () => moveCategory(idx, -1));
      const down = document.createElement("button");
      down.className = "cat-move"; down.textContent = "▼"; down.title = "Move down";
      down.disabled = idx === cats.length - 1;
      down.addEventListener("click", () => moveCategory(idx, 1));
      reorder.appendChild(up); reorder.appendChild(down);
      row.appendChild(reorder);

      // Icon (single emoji) — swatch background reflects the color.
      const iconInput = document.createElement("input");
      iconInput.type = "text";
      iconInput.className = "cat-icon-input";
      iconInput.value = meta.icon;
      iconInput.maxLength = 4;
      iconInput.title = "Category icon";
      iconInput.style.background = meta.color;
      iconInput.addEventListener("change", () => setCategoryMeta(cat, { icon: iconInput.value.trim() || "🏷️" }));
      row.appendChild(iconInput);

      // Color
      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.className = "cat-color-input";
      colorInput.value = toHexColor(meta.color);
      colorInput.title = "Category color";
      colorInput.addEventListener("change", () => setCategoryMeta(cat, { color: colorInput.value }));
      row.appendChild(colorInput);

      const input = document.createElement("input");
      input.type = "text";
      input.className = "cat-name-input";
      input.value = cat;
      input.maxLength = 30;
      input.addEventListener("change", () => renameCategory(idx, input.value.trim()));
      row.appendChild(input);

      const count = document.createElement("span");
      count.className = "cat-count";
      count.textContent = `${counts[cat] || 0}`;
      count.title = `${counts[cat] || 0} habit${(counts[cat] || 0) === 1 ? "" : "s"}`;
      row.appendChild(count);

      const del = document.createElement("button");
      del.className = "cat-del";
      del.textContent = "✕";
      del.title = "Remove category";
      del.addEventListener("click", () => removeCategory(idx));
      row.appendChild(del);

      wrap.appendChild(row);
    });
  }

  // Normalize a CSS color to a #rrggbb value for <input type="color">.
  function toHexColor(c) {
    if (typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c)) return c;
    return "#64748b";
  }

  function setCategoryMeta(name, patch) {
    if (!state.categoryMeta) state.categoryMeta = {};
    const cur = state.categoryMeta[name] || { ...(DEFAULT_CATEGORY_META[name] || {}) };
    state.categoryMeta[name] = { ...cur, ...patch };
    state.categoriesUpdatedAt = Date.now();
    save();
    renderCategoryManager();
    if (currentView === "today") renderToday();
    if (currentView === "habits") renderHabits();
  }

  function moveCategory(idx, dir) {
    const cats = getCategories().slice();
    const j = idx + dir;
    if (j < 0 || j >= cats.length) return;
    const tmp = cats[idx]; cats[idx] = cats[j]; cats[j] = tmp;
    commitCategories(cats);
    renderCategoryManager();
    populateCategorySelects();
  }

  function commitCategories(newList) {
    state.categories = newList;
    state.categoriesUpdatedAt = Date.now();
    save();
  }

  function renameCategory(idx, newName) {
    const cats = getCategories().slice();
    const old = cats[idx];
    if (!newName || newName === old) { renderCategoryManager(); return; }
    if (cats.includes(newName)) { alert("A category with that name already exists."); renderCategoryManager(); return; }
    cats[idx] = newName;
    // Move habits from old name to new
    for (const h of state.habits) if (h.category === old) { h.category = newName; h.updatedAt = Date.now(); }
    // Carry the color/icon over to the new name.
    if (state.categoryMeta && state.categoryMeta[old]) {
      state.categoryMeta[newName] = state.categoryMeta[old];
      delete state.categoryMeta[old];
    }
    commitCategories(cats);
    renderCategoryManager();
    renderDataSummary();
    showToast(`Renamed to "${newName}".`, "success");
  }

  function removeCategory(idx) {
    const cats = getCategories().slice();
    if (cats.length <= 1) { alert("Keep at least one category."); return; }
    const name = cats[idx];
    const used = state.habits.filter((h) => h.category === name).length;
    const fallback = cats.find((c, i) => i !== idx) || "Custom";
    if (used > 0 && !confirm(`Move ${used} habit${used === 1 ? "" : "s"} from "${name}" to "${fallback}" and remove this category?`)) return;
    for (const h of state.habits) if (h.category === name) { h.category = fallback; h.updatedAt = Date.now(); }
    cats.splice(idx, 1);
    if (state.categoryMeta && state.categoryMeta[name]) delete state.categoryMeta[name];
    commitCategories(cats);
    renderCategoryManager();
    renderDataSummary();
    populateCategorySelects();
  }

  function addCategory() {
    const name = prompt("New category name:");
    if (!name || !name.trim()) return;
    const cats = getCategories().slice();
    if (cats.includes(name.trim())) { alert("That category already exists."); return; }
    cats.push(name.trim().slice(0, 30));
    commitCategories(cats);
    renderCategoryManager();
    populateCategorySelects();
  }

  // Rebuild all category <select>s from the dynamic list.
  function populateCategorySelects() {
    const cats = getCategories();
    // Habit modal — plain options
    const hc = getEls().habitCategory;
    if (hc) {
      const cur = hc.value;
      hc.innerHTML = cats.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
      if (cats.includes(cur)) hc.value = cur;
    }
    // Filters — with an "All categories" option
    for (const id of ["todayCategoryFilter", "reportCategoryFilter"]) {
      const sel = document.getElementById(id);
      if (!sel) continue;
      const cur = sel.value;
      sel.innerHTML = `<option value="all">All categories</option>` +
        cats.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
      if (cur === "all" || cats.includes(cur)) sel.value = cur;
    }
  }

  function saveSyncSettings() {
    const els = getEls();
    const token = els.syncTokenInput.value.trim();
    const gistId = els.syncGistIdInput.value.trim();
    if (token) localStorage.setItem(KEYS.syncToken, token);
    else localStorage.removeItem(KEYS.syncToken);
    if (gistId) localStorage.setItem(KEYS.syncGistId, gistId);
    else localStorage.removeItem(KEYS.syncGistId);
    const dn = els.deviceNameInput.value.trim();
    if (dn) localStorage.setItem(KEYS.deviceName, dn);
    else localStorage.removeItem(KEYS.deviceName);
    updateSyncIndicator("idle");
    // Auto-sync is on by default once a token exists — start it and reflect in UI.
    if (token && isAutoSyncEnabled()) { startAutoSync(); }
    els.autoSyncToggle.checked = isAutoSyncEnabled();
    renderSyncStateLine();
    showSyncStatus("Settings saved.", "success");
  }

  function onAutoSyncToggle() {
    const on = getEls().autoSyncToggle.checked;
    if (on && !localStorage.getItem(KEYS.syncToken)) {
      getEls().autoSyncToggle.checked = false;
      return showSyncStatus("Add a GitHub token first.", "warn");
    }
    localStorage.setItem(KEYS.syncEnabled, on ? "true" : "false");
    if (on) {
      // Turning it back on clears any rate-limit pause.
      rateLimitResetAt = 0;
      if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = null; }
      startAutoSync();
    } else {
      stopAutoSync();
    }
    showSyncStatus(on ? "Auto-sync on." : "Auto-sync off.", "success");
  }

  function applyTheme() {
    const pref = localStorage.getItem(KEYS.theme) || "auto";
    let dark = pref === "dark";
    if (pref === "auto") dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }
  function onThemeChange() {
    localStorage.setItem(KEYS.theme, getEls().themeSelect.value);
    applyTheme();
  }

  /* ---- Localization scaffolding ----
   * English is authored inline in the HTML (the base). Other locales provide a
   * dictionary keyed by data-i18n keys; applyTranslations() swaps text in/out.
   * Add a locale by dropping another entry into I18N — no code changes needed.
   */
  const I18N = {
    es: {
      "nav.today": "Hoy", "nav.habits": "Hábitos", "nav.progress": "Progreso",
      "nav.report": "Informe", "nav.schedule": "Horario", "nav.settings": "Ajustes",
      "page.today": "Hoy", "page.habits": "Hábitos", "page.progress": "Progreso",
      "page.report": "Informe", "page.settings": "Ajustes",
    },
    // Add more locales here, e.g. fr: { ... }
  };
  function availableLangs() { return ["en", ...Object.keys(I18N)]; }
  const LANG_NAMES = { en: "English", es: "Español", fr: "Français", de: "Deutsch", pt: "Português" };
  function currentLang() {
    const l = localStorage.getItem("ht_lang") || "en";
    return availableLangs().includes(l) ? l : "en";
  }
  // Pure lookup (no storage): returns the translation or null.
  function translate(lang, key) {
    return (lang && lang !== "en" && I18N[lang] && I18N[lang][key]) || null;
  }
  // Translate a key for the current language, or null if untranslated.
  function t(key) { return translate(currentLang(), key); }
  function applyTranslations() {
    const lang = currentLang();
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      if (el.dataset.i18nBase == null) el.dataset.i18nBase = el.textContent; // cache English base
      const tr = t(el.dataset.i18n);
      el.textContent = tr != null ? tr : el.dataset.i18nBase;
    });
  }
  function setLang(lang) {
    localStorage.setItem("ht_lang", availableLangs().includes(lang) ? lang : "en");
    applyTranslations();
  }

  /* ---- Accent color, text size, high contrast ---- */
  const ACCENTS = ["#6366f1", "#14b8a6", "#22c55e", "#3b82f6", "#ec4899", "#f59e0b", "#ef4444", "#a855f7"];
  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function shade(hex, pct) {
    const c = hexToRgb(hex); if (!c) return hex;
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + (pct < 0 ? v : 255 - v) * pct)));
    const h = (v) => v.toString(16).padStart(2, "0");
    return "#" + h(f(c.r)) + h(f(c.g)) + h(f(c.b));
  }
  function applyAccent() {
    const hex = localStorage.getItem(KEYS.accent);
    const root = document.documentElement;
    if (!hex || !hexToRgb(hex)) {
      // Clear overrides → fall back to the theme's default accent.
      ["--primary", "--primary-hover", "--primary-soft", "--primary-tint"].forEach((v) => root.style.removeProperty(v));
      return;
    }
    const c = hexToRgb(hex);
    root.style.setProperty("--primary", hex);
    root.style.setProperty("--primary-hover", shade(hex, -0.18));
    root.style.setProperty("--primary-soft", `rgba(${c.r},${c.g},${c.b},0.12)`);
    root.style.setProperty("--primary-tint", `rgba(${c.r},${c.g},${c.b},0.10)`);
  }
  function setAccent(hex) {
    if (hex && hexToRgb(hex)) localStorage.setItem(KEYS.accent, hex);
    else localStorage.removeItem(KEYS.accent);
    applyAccent();
    renderAccentPicker();
  }
  function renderAccentPicker() {
    const el = getEls().accentPicker;
    if (!el) return;
    const cur = localStorage.getItem(KEYS.accent) || "";
    el.innerHTML = ACCENTS.map((c) =>
      `<button type="button" class="accent-swatch${cur.toLowerCase() === c ? " selected" : ""}" data-c="${c}" style="background:${c}" aria-label="Accent ${c}"></button>`
    ).join("") + `<button type="button" class="accent-swatch accent-reset${cur ? "" : " selected"}" data-c="" title="Default" aria-label="Default accent">↺</button>`;
    el.querySelectorAll(".accent-swatch").forEach((b) => b.addEventListener("click", () => setAccent(b.dataset.c)));
  }
  function applyTextSize() {
    const size = localStorage.getItem(KEYS.textSize) || "normal";
    const px = size === "xlarge" ? "17px" : size === "large" ? "16px" : "15px";
    document.documentElement.style.fontSize = px;
  }
  function applyContrast() {
    document.body.classList.toggle("hc", localStorage.getItem(KEYS.contrast) === "true");
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `momentum-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function importData() {
    const els = getEls();
    els.fileInput.value = "";
    els.fileInput.click();
  }
  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || !Array.isArray(data.habits)) throw new Error("Invalid file");
        if (!confirm("Replace current data with the imported file?")) return;
        state = normalizeState(data);
        saveNow();
        switchView(currentView);
        showToast("Imported.", "success");
      } catch (err) {
        alert("Could not import file: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  /* ================================================================
   * Wire up
   * ================================================================ */

  function wireEvents() {
    const els = getEls();

    // Sidebar / nav
    els.menuToggle.addEventListener("click", openSidebar);
    els.sidebarBackdrop.addEventListener("click", closeSidebar);
    els.navItems.forEach((n) => n.addEventListener("click", () => switchView(n.dataset.tab)));
    els.todayCategoryFilter.addEventListener("change", (e) => {
      todayCategoryFilter = e.target.value;
      localStorage.setItem(KEYS.todayFilter, todayCategoryFilter);
      renderToday();
    });
    els.todayAddBtn.addEventListener("click", () => openHabitModal(null));
    els.todayMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      els.todayMenu.classList.toggle("hidden");
    });
    els.todayMenu.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => {
        els.todayMenu.classList.add("hidden");
        if (b.dataset.action === "copy") copyYesterday();
        if (b.dataset.action === "reset") resetToday();
      });
    });
    document.addEventListener("click", (e) => {
      if (!els.todayMenu.contains(e.target) && e.target !== els.todayMenuBtn) {
        els.todayMenu.classList.add("hidden");
      }
    });
    els.journalText.addEventListener("input", onJournalInput);
    els.remindersToggle.addEventListener("change", toggleReminders);
    els.todayHintDismiss.addEventListener("click", () => {
      localStorage.setItem(KEYS.hintSeen, "true");
      els.todayHint.hidden = true;
    });
    els.compactToggle.addEventListener("change", () => {
      const on = els.compactToggle.checked;
      localStorage.setItem(KEYS.compact, on ? "true" : "false");
      document.body.classList.toggle("compact", on);
    });
    els.showDetailsToggle.addEventListener("change", () => {
      localStorage.setItem(KEYS.showDetails, els.showDetailsToggle.checked ? "true" : "false");
      renderToday();
    });
    if (els.showTodayNotesToggle) els.showTodayNotesToggle.addEventListener("change", () => {
      localStorage.setItem(KEYS.showTodayNotes, els.showTodayNotesToggle.checked ? "true" : "false");
      renderToday();
    });
    els.timeFormatSelect.addEventListener("change", () => {
      localStorage.setItem(KEYS.timeFormat, els.timeFormatSelect.value === "24" ? "24" : "12");
      switchView(currentView);
    });
    els.exportBackupBtn.addEventListener("click", exportBackup);
    els.importBackupBtn.addEventListener("click", () => els.importBackupInput.click());
    els.importBackupInput.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importBackupFile(f);
      e.target.value = "";
    });

    // Fasting
    if (els.fastingPresets) {
      // When embedded in a habit row, keep card interactions from triggering
      // the row's tap/swipe gestures.
      ["click", "pointerdown", "touchstart"].forEach((ev) =>
        els.fastingCard.addEventListener(ev, (e) => e.stopPropagation()));
      els.fastingPresets.addEventListener("click", (e) => {
        const btn = e.target.closest(".preset-chip");
        if (!btn) return;
        selectedFastGoal = Number(btn.dataset.hrs) || 16;
        applyFastPresetToSchedule(selectedFastGoal);
        renderFasting();
        showToast(`${btn.textContent.trim()} · fast starts ${fastingState().startTime}, eat ${fastingState().eatTime}`);
      });
      els.fastingStartBtn.addEventListener("click", () => startFast(selectedFastGoal));
      els.fastingStopBtn.addEventListener("click", () => endFast());
      els.fastingToggle.addEventListener("click", () => {
        const collapsed = localStorage.getItem(KEYS.fastingCollapsed) === "true";
        localStorage.setItem(KEYS.fastingCollapsed, collapsed ? "false" : "true");
        renderFasting();
      });
      els.fastingSchedBtn.addEventListener("click", () => {
        // Expand the card first if it's collapsed, so the schedule is visible.
        if (localStorage.getItem(KEYS.fastingCollapsed) === "true") {
          localStorage.setItem(KEYS.fastingCollapsed, "false");
          renderFasting();
        }
        els.fastingSchedule.classList.toggle("hidden");
      });
      els.fastingSchedToggle.addEventListener("change", () => {
        const f = fastingState();
        f.scheduleEnabled = els.fastingSchedToggle.checked;
        f.updatedAt = Date.now();
        save();
        if (f.scheduleEnabled && "Notification" in window && Notification.permission === "default") {
          Notification.requestPermission().then(() => scheduleReminders());
        } else {
          scheduleReminders();
        }
        renderFasting();
      });
      els.fastingStartTime.addEventListener("change", () => {
        const f = fastingState();
        f.startTime = /^\d{2}:\d{2}$/.test(els.fastingStartTime.value) ? els.fastingStartTime.value : "20:00";
        f.updatedAt = Date.now();
        save(); scheduleReminders(); renderFasting();
      });
      els.fastingEatTime.addEventListener("change", () => {
        const f = fastingState();
        f.eatTime = /^\d{2}:\d{2}$/.test(els.fastingEatTime.value) ? els.fastingEatTime.value : "12:00";
        f.updatedAt = Date.now();
        save(); scheduleReminders(); renderFasting();
      });
    }

    // Habits
    els.habitSearch.addEventListener("input", () => { habitSearchTerm = els.habitSearch.value; renderHabits(); });
    if (els.quickAddForm) els.quickAddForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = els.quickAddInput.value;
      if (!v.trim()) return;
      quickAddHabit(v);
      els.quickAddInput.value = "";
    });
    els.bulkToggleBtn.addEventListener("click", () => setBulkMode(!bulkMode));
    els.bulkMoveBtn.addEventListener("click", bulkMoveSelected);
    els.bulkDeleteBtn.addEventListener("click", bulkDeleteSelected);
    els.bulkDoneBtn.addEventListener("click", () => setBulkMode(false));
    els.addBtn.addEventListener("click", () => openHabitModal(null));

    // Habit detail modal
    els.detailCloseBtn.addEventListener("click", closeHabitDetail);
    els.habitDetailModal.addEventListener("click", (e) => { if (e.target === els.habitDetailModal) closeHabitDetail(); });
    els.detailEditBtn.addEventListener("click", () => {
      const h = state.habits.find((x) => x.id === detailHabitId);
      closeHabitDetail();
      if (h) openHabitModal(h);
    });
    els.detailArchiveBtn.addEventListener("click", () => {
      const h = state.habits.find((x) => x.id === detailHabitId);
      if (h) { setHabitArchived(h.id, !h.archived); closeHabitDetail(); }
    });
    // Onboarding
    els.onboardAddBtn.addEventListener("click", () => finishOnboard(true));
    els.onboardSkipBtn.addEventListener("click", () => finishOnboard(false));
    els.deleteAllBtn.addEventListener("click", deleteAllHabits);
    els.cancelBtn.addEventListener("click", closeModal);
    els.deleteBtn.addEventListener("click", () => {
      if (!editingId) return;
      if (deleteHabitById(editingId)) { closeModal(); switchView(currentView); }
    });
    els.addReminderTimeBtn.addEventListener("click", () => addReminderTimeRow(""));
    els.habitForm.addEventListener("submit", submitHabitForm);
    els.modal.addEventListener("click", (e) => { if (e.target === els.modal) closeModal(); });

    // Weekly review modal
    if (els.reviewSaveBtn) els.reviewSaveBtn.addEventListener("click", saveWeeklyReview);
    if (els.reviewSkipBtn) els.reviewSkipBtn.addEventListener("click", closeReviewModal);
    if (els.reviewCloseBtn) els.reviewCloseBtn.addEventListener("click", closeReviewModal);
    if (els.reviewModal) els.reviewModal.addEventListener("click", (e) => { if (e.target === els.reviewModal) closeReviewModal(); });
    els.typePicker.addEventListener("click", (e) => {
      const btn = e.target.closest(".type-btn");
      if (!btn) return;
      els.typePicker.querySelectorAll(".type-btn").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      els.countFields.classList.toggle("hidden", btn.dataset.type !== "count");
      updateFormSmartHints();
    });
    if (els.habitName) els.habitName.addEventListener("input", updateFormSmartHints);
    if (els.habitCountSuggestBtn) els.habitCountSuggestBtn.addEventListener("click", applyCountSuggestion);
    els.advancedToggle.addEventListener("click", () => {
      const open = els.dayTimesWrap.classList.toggle("hidden");
      els.advancedToggle.classList.toggle("open", !open);
    });

    // Schedule
    const schedNotes = $("#schedNotes");
    if (schedNotes) schedNotes.addEventListener("input", onSchedNotes);
    const schedPhoto = $("#schedPhoto");
    if (schedPhoto) schedPhoto.addEventListener("change", onSchedPhotoPick);
    const schedPhotoRemove = $("#schedPhotoRemove");
    if (schedPhotoRemove) schedPhotoRemove.addEventListener("click", removeSchedPhoto);
    const schedRefDay = $("#schedRefDay");
    if (schedRefDay) schedRefDay.addEventListener("change", renderConflicts);
    const schedOcrBtn = $("#schedOcrBtn");
    if (schedOcrBtn) schedOcrBtn.addEventListener("click", runScheduleOcr);
    const schedTextBtn = $("#schedTextBtn");
    if (schedTextBtn) schedTextBtn.addEventListener("click", readHoursFromText);
    const schedThumb = $("#schedPhotoThumb");
    if (schedThumb) schedThumb.addEventListener("click", () => {
      const src = schedThumb.getAttribute("src"); if (src) openPhotoViewer(src);
    });

    // Report / Progress
    els.prevWeek.addEventListener("click", () => { weekOffset--; renderReport(); });
    els.nextWeek.addEventListener("click", () => { if (weekOffset < 0) { weekOffset++; renderReport(); } });
    els.reportCategoryFilter.addEventListener("change", (e) => { reportCategoryFilter = e.target.value; renderReport(); });
    if (els.trendRangeSelect) els.trendRangeSelect.addEventListener("change", () => renderReport());
    els.reportMenuBtn.addEventListener("click", (e) => { e.stopPropagation(); els.reportMenu.classList.toggle("hidden"); });
    els.reportMenu.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => {
        els.reportMenu.classList.add("hidden");
        if (b.dataset.action === "share-card") shareProgressCard();
        if (b.dataset.action === "csv-week") downloadWeekCsv();
        if (b.dataset.action === "csv-all") downloadAllCsv();
        if (b.dataset.action === "print") printReport();
      });
    });
    document.addEventListener("click", (e) => {
      if (!els.reportMenu.contains(e.target) && e.target !== els.reportMenuBtn) els.reportMenu.classList.add("hidden");
    });
    els.prevWeekP.addEventListener("click", () => { progressOffset--; renderProgress(); });
    els.nextWeekP.addEventListener("click", () => { if (progressOffset < 0) { progressOffset++; renderProgress(); } });
    els.measurementForm.addEventListener("submit", saveMeasurement);
    els.clearMeasurementBtn.addEventListener("click", clearMeasurement);
    els.addMetricBtn.addEventListener("click", addCustomMetric);
    els.trendMetric.addEventListener("change", (e) => { trendMetric = e.target.value; renderTrendChart(); });
    // Goal
    $("#editGoalBtn").addEventListener("click", openGoalForm);
    $("#goalForm").addEventListener("submit", saveGoal);
    $("#goalCancelBtn").addEventListener("click", closeGoalForm);
    $("#goalClearBtn").addEventListener("click", clearGoal);
    // Photos
    els.mPhoto.addEventListener("change", onPhotoPick);
    els.mPhotoRemove.addEventListener("click", removePhoto);
    $("#mPhotoThumb").addEventListener("click", () => {
      const src = $("#mPhotoThumb").getAttribute("src");
      if (src) openPhotoViewer(src);
    });
    $("#photoViewer").addEventListener("click", () => $("#photoViewer").classList.add("hidden"));

    // Settings — Sync
    els.syncSaveBtn.addEventListener("click", saveSyncSettings);
    els.syncPushBtn.addEventListener("click", () => syncPush());
    els.syncPullBtn.addEventListener("click", () => syncPull());
    els.syncTestBtn.addEventListener("click", testConnection);
    els.syncDeleteCloudBtn.addEventListener("click", deleteCloudData);

    // Settings — OneDrive sync
    const odCid = document.getElementById("odClientId");
    if (odCid) odCid.addEventListener("change", () => localStorage.setItem(KEYS.odClientId, odCid.value.trim()));
    const odConnectBtn = document.getElementById("odConnectBtn");
    if (odConnectBtn) odConnectBtn.addEventListener("click", () => {
      if (odCid) localStorage.setItem(KEYS.odClientId, odCid.value.trim());
      connectOneDrive();
    });
    const odDisconnectBtn = document.getElementById("odDisconnectBtn");
    if (odDisconnectBtn) odDisconnectBtn.addEventListener("click", disconnectOneDrive);
    const odPushBtn = document.getElementById("odPushBtn");
    if (odPushBtn) odPushBtn.addEventListener("click", () => oneDrivePush());
    const odPullBtn = document.getElementById("odPullBtn");
    if (odPullBtn) odPullBtn.addEventListener("click", () => oneDrivePull());
    const odAutoToggle = document.getElementById("odAutoToggle");
    if (odAutoToggle) odAutoToggle.addEventListener("change", () => {
      localStorage.setItem(KEYS.odAuto, odAutoToggle.checked ? "true" : "false");
      renderOneDriveState();
      if (odAutoToggle.checked) oneDrivePush({ silent: true });
    });
    els.pairDeviceBtn.addEventListener("click", copyPairingLink);
    els.pairQrBtn.addEventListener("click", showPairingQr);
    els.scanQrBtn.addEventListener("click", openScanner);
    $("#scanCloseBtn").addEventListener("click", closeScanner);
    $("#scanModal").addEventListener("click", (e) => { if (e.target === $("#scanModal")) closeScanner(); });
    $("#qrCloseBtn").addEventListener("click", closeQrModal);
    $("#qrCopyBtn").addEventListener("click", copyPairingLink);
    $("#qrModal").addEventListener("click", (e) => { if (e.target === $("#qrModal")) closeQrModal(); });
    els.autoSyncToggle.addEventListener("change", onAutoSyncToggle);
    els.addCategoryBtn.addEventListener("click", addCategory);
    // Reminder defaults + quiet hours
    els.reminderDefault.addEventListener("change", () => {
      if (els.reminderDefault.value) localStorage.setItem(KEYS.reminderDefault, els.reminderDefault.value);
      else localStorage.removeItem(KEYS.reminderDefault);
    });
    els.soundToggle.addEventListener("change", () => {
      localStorage.setItem(KEYS.reminderSound, els.soundToggle.checked ? "true" : "false");
      if (els.soundToggle.checked) { ensureAudioCtx(); playChime(); }
    });
    els.testReminderBtn.addEventListener("click", testReminder);
    if (els.reminderHealthBtn) els.reminderHealthBtn.addEventListener("click", toggleReminderHealth);
    if (els.smartTimingBtn) els.smartTimingBtn.addEventListener("click", toggleSmartTiming);
    if (els.activityLogBtn) els.activityLogBtn.addEventListener("click", toggleActivityLog);
    if (els.vacationSaveBtn) els.vacationSaveBtn.addEventListener("click", () => {
      const s = els.vacationStart.value, e = els.vacationEnd.value;
      if (!s || !e) { showToast("Pick both a start and end date.", "warn"); return; }
      setVacation(s, e, els.vacationNote.value);
    });
    if (els.vacationClearBtn) els.vacationClearBtn.addEventListener("click", clearVacation);
    els.morningDigest.addEventListener("change", () => {
      if (els.morningDigest.value) localStorage.setItem(KEYS.morningDigest, els.morningDigest.value);
      else localStorage.removeItem(KEYS.morningDigest);
      scheduleReminders(); renderReminderInfo();
    });
    els.eveningNudge.addEventListener("change", () => {
      if (els.eveningNudge.value) localStorage.setItem(KEYS.eveningNudge, els.eveningNudge.value);
      else localStorage.removeItem(KEYS.eveningNudge);
      scheduleReminders(); renderReminderInfo();
    });
    els.weeklyReport.addEventListener("change", () => {
      if (els.weeklyReport.value) localStorage.setItem(KEYS.weeklyReport, els.weeklyReport.value);
      else localStorage.removeItem(KEYS.weeklyReport);
      scheduleReminders(); renderReminderInfo();
    });
    els.snoozeDuration.addEventListener("change", () => {
      localStorage.setItem(KEYS.snoozeMin, els.snoozeDuration.value);
    });
    els.pushToggle.addEventListener("change", () => {
      if (els.pushToggle.checked) enableBackgroundPush();
      else disableBackgroundPush();
    });
    els.pushTestBtn.addEventListener("click", testBackgroundPush);
    els.pushResetBtn.addEventListener("click", reregisterDevice);
    els.quietStart.addEventListener("change", () => {
      if (els.quietStart.value) localStorage.setItem(KEYS.quietStart, els.quietStart.value); else localStorage.removeItem(KEYS.quietStart);
      scheduleReminders();
    });
    els.quietEnd.addEventListener("change", () => {
      if (els.quietEnd.value) localStorage.setItem(KEYS.quietEnd, els.quietEnd.value); else localStorage.removeItem(KEYS.quietEnd);
      scheduleReminders();
    });
    // Granular danger zone
    els.clearHistoryBtn.addEventListener("click", clearAllHistory);
    els.deletePhotosBtn.addEventListener("click", deleteAllPhotos);
    const pruneBtn = document.getElementById("prunePhotosBtn");
    if (pruneBtn) pruneBtn.addEventListener("click", prunePhotosPrompt);
    const fu = document.getElementById("forceUpdateBtn");
    if (fu) fu.addEventListener("click", forceUpdate);

    // Settings — Theme
    els.themeSelect.addEventListener("change", onThemeChange);
    if (els.langSelect) els.langSelect.addEventListener("change", () => setLang(els.langSelect.value));
    if (els.textSizeSelect) els.textSizeSelect.addEventListener("change", () => {
      localStorage.setItem(KEYS.textSize, els.textSizeSelect.value); applyTextSize();
    });
    if (els.contrastToggle) els.contrastToggle.addEventListener("change", () => {
      localStorage.setItem(KEYS.contrast, els.contrastToggle.checked ? "true" : "false"); applyContrast();
    });
    els.unitsSelect.addEventListener("change", () => {
      localStorage.setItem(KEYS.units, els.unitsSelect.value === "metric" ? "metric" : "imperial");
      if (currentView === "progress") renderProgress();
    });
    // Settings — Backup
    els.exportBtn.addEventListener("click", exportData);
    els.importBtn.addEventListener("click", importData);
    els.fileInput.addEventListener("change", handleImportFile);
    els.resetAllBtn.addEventListener("click", resetApp);

    // Template picker
    els.browseTemplatesBtn.addEventListener("click", openTemplateModal);
    els.smartFillBtn.addEventListener("click", smartFillReminders);
    if (els.fillNotesBtn) els.fillNotesBtn.addEventListener("click", syncNotesFromTemplates);
    if (els.syncTimeBtn) els.syncTimeBtn.addEventListener("click", syncTimeFromRemindersAll);
    els.templateCancelBtn.addEventListener("click", closeTemplateModal);
    els.templateCloseBtn.addEventListener("click", closeTemplateModal);
    els.templateSelectAll.addEventListener("click", templateSelectAll);
    els.templateClearAll.addEventListener("click", templateClearAll);
    els.templateAddBtn.addEventListener("click", addSelectedTemplates);
    els.templateModal.addEventListener("click", (e) => { if (e.target === els.templateModal) closeTemplateModal(); });

    // Sync indicator: tap to push
    document.getElementById("syncIndicator")?.addEventListener("click", () => syncPush());
    document.getElementById("syncIndicatorDesktop")?.addEventListener("click", () => syncPush());

    // Online/offline handling
    window.addEventListener("online", () => {
      updateSyncIndicator("idle");
      if (isAutoSyncEnabled() && dirtyForSync) queueAutoSyncPush();
    });
    window.addEventListener("offline", () => updateSyncIndicator("offline"));

    // Auto theme follow when in auto mode
    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if ((localStorage.getItem(KEYS.theme) || "auto") === "auto") applyTheme();
      });
    }
  }

  /* ================================================================
   * Boot
   * ================================================================ */

  function boot() {
    state = loadStateFromLocal();
    lastSyncedAt = parseInt(localStorage.getItem(KEYS.lastSynced) || "0", 10);
    lastSyncedHash = localStorage.getItem(KEYS.lastSyncedHash) || null;
    todayCategoryFilter = localStorage.getItem(KEYS.todayFilter) || "all";
    // Display the app version (single source of truth: version.js)
    const ver = (self.APP_VERSION ? "v" + self.APP_VERSION : "");
    const av = document.getElementById("appVersion");
    if (av) av.textContent = ver;
    const afv = document.getElementById("appFooterVersion");
    if (afv) afv.textContent = ver;
    // One-time: clear a stale auto-sync "off" that the old rate-limit bug set,
    // so auto-sync defaults on again for existing installs.
    if (!localStorage.getItem("ht_sync_migrated_v30")) {
      if (localStorage.getItem(KEYS.syncEnabled) === "false") localStorage.removeItem(KEYS.syncEnabled);
      localStorage.setItem("ht_sync_migrated_v30", "1");
    }
    applyTheme();
    applyAccent();
    applyTextSize();
    applyContrast();
    applyTranslations();
    if (localStorage.getItem(KEYS.compact) === "true") document.body.classList.add("compact");
    wireEvents();
    populateCategorySelects();
    const filterSel = $("#todayCategoryFilter");
    if (filterSel) filterSel.value = todayCategoryFilter;
    hydrateSettings();
    checkPairingLink();
    updateSyncIndicator(navigator.onLine ? "idle" : "offline");
    if (isAutoSyncEnabled()) startAutoSync();
    // OneDrive: finish an OAuth redirect if we're returning from sign-in,
    // otherwise pull the latest on open when auto-sync is on.
    handleOneDriveRedirect().then((handled) => {
      if (!handled && odAutoEnabled()) oneDrivePull({ silent: true });
    }).catch(() => {});
    cleanupNotifiedKeys();
    if (purgeTrash()) save(); // drop trash older than 7 days (writes tombstones)
    maybeBackupReminder();
    scheduleReminders();
    catchUpReminders();
    maybeFireWeeklyReport();

    // Fasting: resume an in-progress manual fast (re-arm its goal alert) and
    // start the ticking countdown for either manual or scheduled (auto) mode.
    selectedFastGoal = (state.fasting && state.fasting.targetHours) || 16;
    if (state.fasting && state.fasting.active && state.fasting.startTs) armFastingGoalTimer();
    startFastingTick();
    // Keep the countdown + goal timer honest after the tab was backgrounded.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      if (fastingMode() !== "idle") updateFastingProgress();
      if (state.fasting && state.fasting.active) armFastingGoalTimer();
      // Re-render Today so the date header, NOW highlight, reminders, and the
      // "Last night" group stay fresh after the tab was backgrounded / crossed
      // midnight — no manual refresh needed.
      if (currentView === "today") renderToday();
      scheduleReminders();
      catchUpReminders();
      maybeFireWeeklyReport();
      if (odAutoEnabled()) oneDrivePull({ silent: true });
    });
    document.addEventListener("pointerdown", unlockAudioOnce, { once: true });
    document.addEventListener("keydown", unlockAudioOnce, { once: true });
    updateBadge();

    // Listen for notification actions relayed by the service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (e) => {
        const d = e.data || {};
        if (d.type === "notif-action") handleNotifAction(d.action, d.data || {});
        else if (d.type === "push-resubscribe" && pushEnabled()) enableBackgroundPush();
      });
    }
    // Cold-start: notification opened the app with ?notif=&ids=
    const params = new URLSearchParams(location.search);
    if (params.has("notif")) {
      const ids = (params.get("ids") || "").split(",").filter(Boolean);
      handleNotifAction(params.get("notif"), { ids });
      history.replaceState(null, "", location.pathname);
    }
    // Home-screen shortcuts open the app with ?tab= (and optional add=1).
    const shortcutTab = params.get("tab");
    const validTabs = ["today", "habits", "progress", "report", "schedule", "settings"];
    if (shortcutTab && validTabs.includes(shortcutTab)) {
      currentView = shortcutTab;
      if (params.get("add") === "1") setTimeout(() => openHabitModal(null), 300);
      history.replaceState(null, "", location.pathname);
    }
    switchView(currentView);
    maybeOnboard();

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").then((reg) => {
          reg.update().catch(() => {});
          // A new version may already be waiting from a previous visit.
          if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
          // A new version finished installing while the app is open.
          reg.addEventListener("updatefound", () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener("statechange", () => {
              if (nw.state === "installed" && navigator.serviceWorker.controller) offerUpdate(nw);
            });
          });
          // Re-check for updates when the user returns to the app.
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") reg.update().catch(() => {});
          });
        }).catch(() => {});
        // Reload once the user-approved new worker takes control.
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      });
    }
  }

  // Show a friendly, dismissible "new version ready" banner instead of
  // reloading the page out from under the user.
  let pendingUpdateWorker = null;
  function offerUpdate(worker) {
    pendingUpdateWorker = worker;
    const banner = document.getElementById("updateBanner");
    if (!banner) return;
    const verEl = document.getElementById("updateVersion");
    if (verEl && self.APP_VERSION) verEl.textContent = `Momentum v${self.APP_VERSION} is ready to install.`;
    banner.hidden = false;
    banner.classList.add("show");
    const now = document.getElementById("updateNow");
    const later = document.getElementById("updateDismiss");
    if (now) now.onclick = () => {
      now.disabled = true;
      now.textContent = "Updating…";
      // Ask the waiting worker to activate; controllerchange then reloads.
      try { pendingUpdateWorker && pendingUpdateWorker.postMessage({ type: "skip-waiting" }); } catch (e) {}
      // Safety net: if controllerchange doesn't fire shortly, reload anyway.
      setTimeout(() => window.location.reload(), 2500);
    };
    if (later) later.onclick = () => { banner.classList.remove("show"); banner.hidden = true; };
  }

  // Nuke caches + service workers and hard-reload. Escape hatch for stuck updates.
  async function forceUpdate() {
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) { /* ignore */ }
    location.reload(true);
  }

  // Expose internals for the automated test harness (harmless in the browser).
  if (typeof self !== "undefined") {
    self.__momentumTest = {
      mergeStates, normalizeState, defaultState, currentStreak, longestStreak,
      startOfWeekMonday, dateKey, addDays, parseScheduleText, effectiveTime, suggestFit,
      nightLogInfo, splitNightHabits, isHabitActiveOn, isFrozen, setFreeze,
      habitCompletionStats, purgeTrash, countsForAdherence, resetRenderCaches,
      restoreFromTrash, permanentDeleteFromTrash, deleteHabitById,
      fmtClockLabel, formatClock, timeFmt, timeChipLabel, applyBackup,
      clockFromTimeStr, habitFromTemplate, templateNoteMap, fillNotesFromTemplates,
      timeSummaryFromReminders, applyTimeFromReminders, isAutoTimeSummary,
      isWeekly, weeklyTarget, weeklyDoneCount, weeklyMet, todayStatus, weekAdherencePct,
      dayPartsForHabit, dayPartForTime, isAutoTimeSummary, doseSlots, doseStatus, toggleDose, toggleDoseSkip,
      weekKeyOf, computeWeekReview, reviewTargetWeek,
      categoryMeta, getCategories,
      aiTodayInsight, weekdayAvgAdherence,
      buildInsights, timeOfDayStats, slotForHabit, perfectDayCount, totalCheckins, habitPairInsight,
      yearHeatmapCells, dayAdherenceBucket, moodTrendData, parseQuickAdd,
      evaluateAchievements, checkAchievements, maxLongestStreak, hasPerfectWeek,
      setMood, moodCompletionInsight, fireStackCues,
      buildMonthCalendar, timeAgo,
      inVacation, vacationActiveNow, setVacation, clearVacation,
      recordCompletionClock, suggestReminderTime, smartTimingSuggestions,
      doseSpacingWarning, suggestCountSetup, doseProgress, doseNudgeMessage,
      habitWeekdayRate, skipRiskHabits, adaptiveTargetSuggestion, momentumForecast,
      recordDoseClock, suggestDoseTime, doseTimingSuggestions,
      keystoneId, getKeystoneHabit, setKeystone,
      logActivity, moveHabitToCategory, prunePhotosOlderThan,
      shade, hexToRgb,
      translate, availableLangs, b64url,
      getState: () => state, setState: (s) => { state = s; },
    };
  }

  // Only boot in a real browser (guarded so the file can be loaded in Node for tests).
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }
})();

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
    hintSeen: "ht_hint_seen",
    units: "ht_units",
    deviceName: "ht_device_name",
    reminderDefault: "ht_reminder_default",
    quietStart: "ht_quiet_start",
    quietEnd: "ht_quiet_end",
    reminderSound: "ht_reminder_sound",
    morningDigest: "ht_morning_digest",
    eveningNudge: "ht_evening_nudge",
  };
  const DEFAULT_CATEGORIES = ["Fitness","Nutrition","Sleep","Supplements","Custom"];
  function getCategories() {
    return (state.categories && state.categories.length) ? state.categories : DEFAULT_CATEGORIES;
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
        { name: "Core / abs",      icon: "🎯",  color: "#ec4899", category: "Fitness", time: "Morning", days: [2,4,6], notes: "" },
        { name: "10,000 steps",    icon: "🚶",  color: "#22c55e", category: "Fitness", time: "All day", notes: "Daily step goal" },
        { name: "Foam rolling",    icon: "🧴",  color: "#a855f7", category: "Fitness", time: "Evening", notes: "" },
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
        { name: "Protein target",  icon: "🍗",  color: "#ec4899", category: "Nutrition", time: "All day", notes: "180-200 g" },
        { name: "Water 3-4 L",     icon: "💧",  color: "#3b82f6", category: "Nutrition", time: "All day", notes: "3-4 litres" },
        { name: "Eat vegetables",  icon: "🥦",  color: "#22c55e", category: "Nutrition", time: "All day", notes: "Veggies with 2+ meals" },
        { name: "Eat fruit",       icon: "🍎",  color: "#ef4444", category: "Nutrition", time: "All day", notes: "" },
        { name: "No junk food",    icon: "🎯",  color: "#f59e0b", category: "Nutrition", time: "All day", notes: "" },
        { name: "No sugary drinks", icon: "🧃", color: "#38bdf8", category: "Nutrition", time: "All day", notes: "" },
        { name: "Intermittent fasting", icon: "⏰", color: "#a855f7", category: "Nutrition", time: "All day", notes: "16:8 window" },
        { name: "Morning coffee",  icon: "☕",  color: "#f59e0b", category: "Nutrition", time: "Morning", notes: "" },
      ],
    },
    {
      title: "😴 Sleep & recovery",
      items: [
        { name: "Bedtime",         icon: "😴",  color: "#a855f7", category: "Sleep", time: "10:30 PM", notes: "Lights out by 10:30 PM" },
        { name: "7-8 hours sleep", icon: "🌙",  color: "#3b82f6", category: "Sleep", time: "Morning", notes: "Log a good night" },
        { name: "No screens before bed", icon: "📴", color: "#6366f1", category: "Sleep", time: "10:00 PM", notes: "30 min before bed" },
        { name: "Wake up on time", icon: "⏰",  color: "#f59e0b", category: "Sleep", time: "6:00 AM", notes: "No snooze" },
        { name: "Morning sunlight", icon: "☀️", color: "#f59e0b", category: "Sleep", time: "Morning", notes: "10 min outdoors" },
      ],
    },
    {
      title: "💊 Supplements — 8:00 AM (with meal, needs fat)",
      items: [
        { name: "D3+K2 (Sports Research)", icon: "☀️", color: "#f59e0b", category: "Supplements", time: "8:00 AM · with meal 1 (needs fat)", notes: "125mcg (5000 IU) D3 / 100mcg K2" },
        { name: "Omega-3 #1 (Alaskan)", icon: "🐟", color: "#38bdf8", category: "Supplements", time: "8:00 AM · with meal 1 (needs fat)", notes: "1st softgel · 1250mg oil / 1040mg omega-3" },
        { name: "B-Complex #12 (Thorne)", icon: "💊", color: "#ec4899", category: "Supplements", time: "8:00 AM · with meal 1 (needs fat)", notes: "" },
        { name: "5-MTHF 1mg (Thorne)", icon: "💊", color: "#a78bfa", category: "Supplements", time: "8:00 AM · with meal 1 (needs fat)", notes: "" },
        { name: "Tongkat Ali (Momentous)", icon: "🌱", color: "#22c55e", category: "Supplements", time: "8:00 AM · with meal 1 (needs fat)", notes: "" },
      ],
    },
    {
      title: "💊 Supplements — 10:30 AM (alone)",
      items: [
        { name: "Psyllium Husk (Nutricost)", icon: "🌿", color: "#14b8a6", category: "Supplements", time: "10:30 AM · alone, 2-hr buffer either side", notes: "3 caps (1,500mg) + 400ml water" },
      ],
    },
    {
      title: "💊 Supplements — 6:00 PM (post-workout)",
      items: [
        { name: "Omega-3 #2 (Alaskan)", icon: "🐟", color: "#38bdf8", category: "Supplements", time: "6:00 PM · post-workout / meal 3", notes: "2nd softgel" },
        { name: "Multi Collagen (Sports Research)", icon: "💊", color: "#ef4444", category: "Supplements", time: "6:00 PM · post-workout / meal 3", notes: "3 caps" },
        { name: "Zinc Picolinate 15mg (Thorne)", icon: "💊", color: "#a855f7", category: "Supplements", time: "6:00 PM · post-workout / meal 3", notes: "" },
        { name: "Creatine", icon: "💪", color: "#6366f1", category: "Supplements", time: "6:00 PM · post-workout / meal 3", notes: "5g" },
      ],
    },
    {
      title: "💊 Supplements — 7:30 PM (wind-down)",
      items: [
        { name: "Magnesium Glycinate (Thorne)", icon: "🌙", color: "#3b82f6", category: "Supplements", time: "7:30 PM · wind-down", notes: "" },
        { name: "Ashwagandha (Momentous)", icon: "🌿", color: "#a78bfa", category: "Supplements", time: "7:30 PM · wind-down", notes: "" },
      ],
    },
    {
      title: "💊 Supplements — other common",
      items: [
        { name: "Multivitamin",    icon: "💊",  color: "#f59e0b", category: "Supplements", time: "Morning", notes: "" },
        { name: "Vitamin C",       icon: "🍊",  color: "#f59e0b", category: "Supplements", time: "Morning", notes: "" },
        { name: "Probiotic",       icon: "🦠",  color: "#22c55e", category: "Supplements", time: "Morning", notes: "" },
        { name: "Electrolytes",    icon: "🧂",  color: "#38bdf8", category: "Supplements", time: "All day", notes: "" },
        { name: "Pre-workout",     icon: "⚡",  color: "#ef4444", category: "Supplements", time: "Afternoon", notes: "Before training" },
        { name: "Whey protein shake", icon: "🥛", color: "#ec4899", category: "Supplements", time: "6:00 PM · post-workout", notes: "" },
        { name: "Amla + Collagen", icon: "💊",  color: "#22c55e", category: "Supplements", time: "Morning", notes: "For hair, skin & nails" },
      ],
    },
    {
      title: "💇 Hair & grooming",
      items: [
        { name: "Hair oil",        icon: "🧴",  color: "#f59e0b", category: "Custom", time: "Evening", notes: "Scalp massage + oil" },
        { name: "Hair seed paste", icon: "🌱",  color: "#22c55e", category: "Custom", time: "Evening", notes: "Apply & leave in" },
        { name: "Red light therapy cap", icon: "🔴", color: "#ef4444", category: "Custom", time: "Evening", notes: "10-15 min session" },
        { name: "Scalp massage",   icon: "💆",  color: "#a855f7", category: "Custom", time: "Evening", notes: "" },
      ],
    },
    {
      title: "🧠 Mind & wellbeing",
      items: [
        { name: "Meditate",        icon: "🧘",  color: "#a855f7", category: "Custom", time: "Morning", notes: "10 min" },
        { name: "Journal",         icon: "✍️",  color: "#3b82f6", category: "Custom", time: "Evening", notes: "" },
        { name: "Gratitude — 3 things", icon: "❤️", color: "#ec4899", category: "Custom", time: "Evening", notes: "" },
        { name: "Read",            icon: "📖",  color: "#14b8a6", category: "Custom", time: "Evening", notes: "20 min" },
        { name: "Breathwork",      icon: "🌬️",  color: "#38bdf8", category: "Custom", time: "Anytime", notes: "" },
        { name: "Digital detox hour", icon: "📵", color: "#6366f1", category: "Custom", time: "Evening", notes: "" },
      ],
    },
    {
      title: "🧴 Self-care & hygiene",
      items: [
        { name: "Skincare — AM",   icon: "🧴",  color: "#ec4899", category: "Custom", time: "Morning", notes: "" },
        { name: "Skincare — PM",   icon: "🧴",  color: "#a855f7", category: "Custom", time: "Evening", notes: "" },
        { name: "Floss",           icon: "🦷",  color: "#38bdf8", category: "Custom", time: "10:30 PM", notes: "" },
        { name: "Sunscreen",       icon: "☀️",  color: "#f59e0b", category: "Custom", time: "Morning", notes: "" },
        { name: "Cold shower",     icon: "🚿",  color: "#3b82f6", category: "Custom", time: "Morning", notes: "" },
      ],
    },
    {
      title: "🎯 Productivity & lifestyle",
      items: [
        { name: "Plan the day",    icon: "📝",  color: "#6366f1", category: "Custom", time: "Morning", notes: "Top 3 priorities" },
        { name: "Deep work block", icon: "🧠",  color: "#3b82f6", category: "Custom", time: "Morning", notes: "90 min focused" },
        { name: "Inbox to zero",   icon: "📧",  color: "#14b8a6", category: "Custom", time: "Afternoon", notes: "" },
        { name: "Tidy space",      icon: "🧹",  color: "#22c55e", category: "Custom", time: "Evening", notes: "" },
        { name: "Learn / study",   icon: "📚",  color: "#f59e0b", category: "Custom", time: "Evening", notes: "30 min" },
        { name: "Practice instrument", icon: "🎵", color: "#ec4899", category: "Custom", time: "Evening", notes: "" },
      ],
    },
    {
      title: "🏃 Cardio & sports",
      items: [
        { name: "Run",             icon: "🏃",  color: "#ef4444", category: "Fitness", time: "Morning", notes: "" },
        { name: "Cycling",         icon: "🚴",  color: "#f59e0b", category: "Fitness", time: "Morning", notes: "" },
        { name: "Swim",            icon: "🏊",  color: "#38bdf8", category: "Fitness", time: "Morning", notes: "" },
        { name: "Yoga",            icon: "🧘",  color: "#a855f7", category: "Fitness", time: "Morning", notes: "" },
        { name: "HIIT session",    icon: "🔥",  color: "#ef4444", category: "Fitness", time: "Morning", days: [2,4], notes: "" },
        { name: "Sports / game",   icon: "⚽",  color: "#22c55e", category: "Fitness", time: "Evening", days: [6], notes: "" },
        { name: "Jump rope",       icon: "🪢",  color: "#3b82f6", category: "Fitness", time: "Morning", notes: "" },
      ],
    },
    {
      title: "🧖 Recovery & stress",
      items: [
        { name: "Sauna",           icon: "🧖",  color: "#ef4444", category: "Sleep", time: "Evening", notes: "" },
        { name: "Cold plunge / shower", icon: "🧊", color: "#38bdf8", category: "Fitness", time: "Morning", notes: "" },
        { name: "Massage gun",     icon: "💆",  color: "#a855f7", category: "Fitness", time: "Evening", notes: "" },
        { name: "Box breathing",   icon: "🌬️",  color: "#14b8a6", category: "Custom", time: "Anytime", notes: "4-4-4-4" },
        { name: "Power nap",       icon: "😴",  color: "#6366f1", category: "Sleep", time: "Afternoon", notes: "20 min" },
        { name: "Stretch before bed", icon: "🧘", color: "#a855f7", category: "Sleep", time: "10:00 PM", notes: "" },
      ],
    },
    {
      title: "🍵 Drinks & extras",
      items: [
        { name: "Lemon water",     icon: "🍋",  color: "#f59e0b", category: "Nutrition", time: "Morning", notes: "" },
        { name: "Green tea",       icon: "🍵",  color: "#22c55e", category: "Nutrition", time: "Afternoon", notes: "" },
        { name: "Bone broth",      icon: "🍲",  color: "#f59e0b", category: "Nutrition", time: "Evening", notes: "" },
        { name: "No alcohol",      icon: "🚫",  color: "#ef4444", category: "Nutrition", time: "All day", notes: "" },
        { name: "No caffeine after 2pm", icon: "☕", color: "#a855f7", category: "Nutrition", time: "Afternoon", notes: "" },
        { name: "Take vitamins with food", icon: "💊", color: "#3b82f6", category: "Supplements", time: "8:00 AM · with meal 1", notes: "" },
      ],
    },
    {
      title: "🦷 Dental & eye care",
      items: [
        { name: "Brush teeth (AM)", icon: "🪥", color: "#38bdf8", category: "Custom", time: "Morning", notes: "" },
        { name: "Brush teeth (PM)", icon: "🪥", color: "#3b82f6", category: "Custom", time: "10:30 PM", notes: "" },
        { name: "Mouthwash",       icon: "🦷",  color: "#14b8a6", category: "Custom", time: "10:30 PM", notes: "" },
        { name: "Whitening strips", icon: "✨", color: "#a855f7", category: "Custom", time: "Evening", days: [1,4], notes: "" },
        { name: "Eye breaks (20-20-20)", icon: "👀", color: "#22c55e", category: "Custom", time: "All day", notes: "Every 20 min, look 20ft away 20s" },
      ],
    },
    {
      title: "🧠 Mental health",
      items: [
        { name: "Therapy session", icon: "🛋️",  color: "#a855f7", category: "Custom", time: "Afternoon", days: [3], notes: "" },
        { name: "No doom-scrolling", icon: "📵", color: "#ef4444", category: "Custom", time: "All day", notes: "" },
        { name: "Worry journal",   icon: "📓",  color: "#3b82f6", category: "Custom", time: "Evening", notes: "" },
        { name: "Affirmations",    icon: "💬",  color: "#ec4899", category: "Custom", time: "Morning", notes: "" },
        { name: "Time in nature",  icon: "🌳",  color: "#22c55e", category: "Custom", time: "Afternoon", notes: "" },
        { name: "Screen-free meal", icon: "🍽️", color: "#f59e0b", category: "Custom", time: "Evening", notes: "" },
      ],
    },
    {
      title: "❤️ Relationships & social",
      items: [
        { name: "Call family",     icon: "📞",  color: "#ec4899", category: "Custom", time: "Evening", days: [0], notes: "" },
        { name: "Text a friend",   icon: "💬",  color: "#38bdf8", category: "Custom", time: "Anytime", notes: "" },
        { name: "Quality time",    icon: "❤️",  color: "#ef4444", category: "Custom", time: "Evening", notes: "Phone away" },
        { name: "Date night",      icon: "🌹",  color: "#ec4899", category: "Custom", time: "Evening", days: [5], notes: "" },
        { name: "Random act of kindness", icon: "🤝", color: "#22c55e", category: "Custom", time: "All day", notes: "" },
      ],
    },
    {
      title: "💰 Money & admin",
      items: [
        { name: "Log expenses",    icon: "🧾",  color: "#14b8a6", category: "Custom", time: "Evening", notes: "" },
        { name: "No impulse buys", icon: "🛑",  color: "#ef4444", category: "Custom", time: "All day", notes: "" },
        { name: "Check budget",    icon: "💰",  color: "#f59e0b", category: "Custom", time: "Evening", days: [0], notes: "Weekly review" },
        { name: "Pack lunch",      icon: "🥪",  color: "#22c55e", category: "Custom", time: "Morning", days: [1,2,3,4,5], notes: "" },
      ],
    },
    {
      title: "🏠 Home & pets",
      items: [
        { name: "Make the bed",    icon: "🛏️",  color: "#6366f1", category: "Custom", time: "Morning", notes: "" },
        { name: "Do the dishes",   icon: "🍽️",  color: "#14b8a6", category: "Custom", time: "Evening", notes: "" },
        { name: "Water the plants", icon: "🪴", color: "#22c55e", category: "Custom", time: "Morning", days: [1,4], notes: "" },
        { name: "Laundry",         icon: "🧺",  color: "#38bdf8", category: "Custom", time: "Evening", days: [0], notes: "" },
        { name: "Walk the dog",    icon: "🐕",  color: "#f59e0b", category: "Custom", time: "Morning", notes: "" },
        { name: "Feed the pet",    icon: "🐾",  color: "#ec4899", category: "Custom", time: "Morning", notes: "" },
        { name: "Take out trash",  icon: "🗑️",  color: "#a855f7", category: "Custom", time: "Evening", days: [2,5], notes: "" },
      ],
    },
    {
      title: "🚭 Quit / reduce",
      items: [
        { name: "No smoking",      icon: "🚭",  color: "#ef4444", category: "Custom", time: "All day", notes: "" },
        { name: "No vaping",       icon: "💨",  color: "#ef4444", category: "Custom", time: "All day", notes: "" },
        { name: "No nail biting",  icon: "💅",  color: "#ec4899", category: "Custom", time: "All day", notes: "" },
        { name: "No soda",         icon: "🥤",  color: "#f59e0b", category: "Nutrition", time: "All day", notes: "" },
        { name: "Screen curfew",   icon: "🌙",  color: "#6366f1", category: "Sleep", time: "10:00 PM", notes: "No screens after" },
      ],
    },
    {
      title: "📚 Learning & growth",
      items: [
        { name: "Language practice", icon: "🗣️", color: "#3b82f6", category: "Custom", time: "Morning", notes: "e.g. Duolingo" },
        { name: "Read 10 pages",   icon: "📖",  color: "#14b8a6", category: "Custom", time: "Evening", notes: "" },
        { name: "Listen to a podcast", icon: "🎧", color: "#a855f7", category: "Custom", time: "Anytime", notes: "" },
        { name: "Online course",   icon: "💻",  color: "#6366f1", category: "Custom", time: "Evening", notes: "" },
        { name: "Write / blog",    icon: "✍️",  color: "#ec4899", category: "Custom", time: "Evening", notes: "" },
      ],
    },
    {
      title: "🏋️ Strength & muscle",
      items: [
        { name: "Push day",        icon: "💪",  color: "#6366f1", category: "Fitness", time: "Morning", days: [1], notes: "Chest, shoulders, triceps" },
        { name: "Pull day",        icon: "🏋️",  color: "#3b82f6", category: "Fitness", time: "Morning", days: [3], notes: "Back, biceps" },
        { name: "Leg day",         icon: "🦵",  color: "#ef4444", category: "Fitness", time: "Morning", days: [5], notes: "Squats, hamstrings, calves" },
        { name: "Progressive overload log", icon: "📈", color: "#14b8a6", category: "Fitness", time: "Morning", notes: "Beat last week" },
        { name: "Warm-up",         icon: "🔥",  color: "#f59e0b", category: "Fitness", time: "Morning", notes: "" },
        { name: "Post-workout protein", icon: "🥤", color: "#ec4899", category: "Nutrition", time: "Morning", notes: "Within 1 hr" },
      ],
    },
    {
      title: "🧘 Mindfulness & spiritual",
      items: [
        { name: "Morning meditation", icon: "🧘", color: "#a855f7", category: "Custom", time: "Morning", notes: "10 min" },
        { name: "Prayer",          icon: "🙏",  color: "#6366f1", category: "Custom", time: "Morning", notes: "" },
        { name: "Read scripture",  icon: "📿",  color: "#f59e0b", category: "Custom", time: "Morning", notes: "" },
        { name: "Gratitude journal", icon: "🙌", color: "#ec4899", category: "Custom", time: "Evening", notes: "3 things" },
        { name: "Visualisation",   icon: "🌅",  color: "#38bdf8", category: "Custom", time: "Morning", notes: "" },
        { name: "Evening reflection", icon: "🕯️", color: "#a855f7", category: "Custom", time: "10:00 PM", notes: "" },
      ],
    },
    {
      title: "🍳 Meal prep & cooking",
      items: [
        { name: "Meal prep",       icon: "🍱",  color: "#22c55e", category: "Nutrition", time: "Evening", days: [0], notes: "Batch cook for the week" },
        { name: "Cook dinner",     icon: "🍳",  color: "#f59e0b", category: "Nutrition", time: "6:00 PM", notes: "" },
        { name: "Pack tomorrow's meals", icon: "🥡", color: "#14b8a6", category: "Nutrition", time: "Evening", days: [0,1,2,3,4], notes: "" },
        { name: "Grocery shop",    icon: "🛒",  color: "#3b82f6", category: "Nutrition", time: "Afternoon", days: [6], notes: "" },
        { name: "No takeout",      icon: "🚫",  color: "#ef4444", category: "Nutrition", time: "All day", notes: "" },
        { name: "Eat breakfast",   icon: "🍳",  color: "#f59e0b", category: "Nutrition", time: "Morning", notes: "" },
      ],
    },
    {
      title: "🎓 Study & exams",
      items: [
        { name: "Study session",   icon: "📚",  color: "#6366f1", category: "Custom", time: "Evening", notes: "Pomodoro x4" },
        { name: "Review flashcards", icon: "🃏", color: "#f59e0b", category: "Custom", time: "Morning", notes: "Spaced repetition" },
        { name: "Practice problems", icon: "✏️", color: "#3b82f6", category: "Custom", time: "Afternoon", notes: "" },
        { name: "Revise notes",    icon: "📝",  color: "#14b8a6", category: "Custom", time: "Evening", notes: "" },
        { name: "No phone while studying", icon: "📵", color: "#ef4444", category: "Custom", time: "Evening", notes: "" },
        { name: "Past paper",      icon: "📄",  color: "#a855f7", category: "Custom", time: "Afternoon", days: [6], notes: "Timed" },
      ],
    },
    {
      title: "🧴 Skin & beauty",
      items: [
        { name: "Cleanser",        icon: "🧼",  color: "#38bdf8", category: "Custom", time: "Morning", notes: "" },
        { name: "Moisturiser",     icon: "🧴",  color: "#ec4899", category: "Custom", time: "Morning", notes: "" },
        { name: "Retinol",         icon: "🌙",  color: "#a855f7", category: "Custom", time: "10:00 PM", days: [1,3,5], notes: "PM only" },
        { name: "Face mask",       icon: "💆",  color: "#f472b6", category: "Custom", time: "Evening", days: [0], notes: "" },
        { name: "Lip balm / SPF",  icon: "☀️",  color: "#f59e0b", category: "Custom", time: "Morning", notes: "" },
        { name: "Drink water for skin", icon: "💧", color: "#38bdf8", category: "Nutrition", time: "All day", notes: "" },
      ],
    },
    {
      title: "👶 Parenting & family",
      items: [
        { name: "Read to kids",    icon: "📖",  color: "#f59e0b", category: "Custom", time: "Evening", notes: "" },
        { name: "Family dinner",   icon: "🍽️",  color: "#22c55e", category: "Custom", time: "6:00 PM", notes: "No screens" },
        { name: "School run",      icon: "🚗",  color: "#3b82f6", category: "Custom", time: "Morning", days: [1,2,3,4,5], notes: "" },
        { name: "Playtime",        icon: "🧸",  color: "#ec4899", category: "Custom", time: "Afternoon", notes: "" },
        { name: "Bedtime routine (kids)", icon: "🌙", color: "#a855f7", category: "Custom", time: "8:00 PM", notes: "" },
      ],
    },
    {
      title: "🌱 Eco & mindful living",
      items: [
        { name: "Reusable bottle", icon: "🍶",  color: "#22c55e", category: "Custom", time: "All day", notes: "" },
        { name: "Walk/bike instead of drive", icon: "🚲", color: "#14b8a6", category: "Fitness", time: "All day", notes: "" },
        { name: "Recycle",         icon: "♻️",  color: "#22c55e", category: "Custom", time: "All day", notes: "" },
        { name: "Meat-free day",   icon: "🥗",  color: "#84cc16", category: "Nutrition", time: "All day", days: [1], notes: "" },
        { name: "Declutter one thing", icon: "📦", color: "#a855f7", category: "Custom", time: "Anytime", notes: "" },
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
      measurements: {},
      journal: {},
      goal: null,
      customMetrics: [],
      categories: [...DEFAULT_CATEGORIES],
      categoriesUpdatedAt: 0,
      workSchedule: { days: {}, notes: "", updatedAt: 0 },
      devices: {},
      deletions: { habits: {} },
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
      days: Array.isArray(h.days) && h.days.length ? h.days : [0,1,2,3,4,5,6],
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
    // Custom metric definitions
    st.customMetrics = [];
    if (Array.isArray(s.customMetrics)) {
      for (const cm of s.customMetrics) {
        if (cm && cm.id && cm.name) {
          st.customMetrics.push({ id: cm.id, name: String(cm.name).slice(0, 30), unit: String(cm.unit || "").slice(0, 12) });
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
      const src = pickRemote ? remoteComp[d] : (localComp[d] || remoteComp[d]);
      if (!src) return;
      const cleaned = {};
      for (const [hid, val] of Object.entries(src)) {
        if (survivingIds.has(hid)) cleaned[hid] = val;
      }
      if (Object.keys(cleaned).length > 0) {
        merged.completions[d] = cleaned;
        merged.completionsUpdatedAt[d] = Math.max(lts, rts) || now;
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

    // Custom metrics: union by id
    const cmMap = new Map();
    (local.customMetrics || []).forEach((c) => cmMap.set(c.id, c));
    (remote.customMetrics || []).forEach((c) => { if (!cmMap.has(c.id)) cmMap.set(c.id, c); });
    merged.customMetrics = [...cmMap.values()];

    // Categories: newer categoriesUpdatedAt wins, fall back to whichever exists
    const lcu = Number(local.categoriesUpdatedAt) || 0;
    const rcu = Number(remote.categoriesUpdatedAt) || 0;
    if (rcu > lcu && Array.isArray(remote.categories) && remote.categories.length) {
      merged.categories = remote.categories.slice();
      merged.categoriesUpdatedAt = rcu;
    } else if (Array.isArray(local.categories) && local.categories.length) {
      merged.categories = local.categories.slice();
      merged.categoriesUpdatedAt = lcu;
    } else {
      merged.categories = [...DEFAULT_CATEGORIES];
      merged.categoriesUpdatedAt = Math.max(lcu, rcu);
    }

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
    if (!habit.days || habit.days.length === 0) return true;
    return habit.days.includes(date.getDay());
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

  function currentStreak(habit) {
    if (streakCache.has(habit.id)) return streakCache.get(habit.id);
    let streak = 0;
    let d = new Date();
    for (let i = 0; i < 365; i++) {
      if (isHabitActiveOn(habit, d)) {
        if (isCompleted(habit, d)) streak++;
        else if (i !== 0) break;
      }
      d = addDays(d, -1);
    }
    streakCache.set(habit.id, streak);
    return streak;
  }

  // A habit is "at risk" if it has a running streak but is still pending today.
  function isStreakAtRisk(habit, date) {
    return habitStatus(habit, date) === "pending" && currentStreak(habit) >= 2;
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
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        if (d > now && !sameDay(d, now)) continue;
        if (isHabitActiveOn(habit, d)) {
          scheduled++;
          if (isCompleted(habit, d)) done++;
        }
      }
    }
    if (scheduled === 0) return null;
    return Math.round((done / scheduled) * 100);
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
  function deleteHabitById(id, opts = { confirm: true }) {
    const habit = state.habits.find((h) => h.id === id);
    if (!habit) return false;
    if (opts.confirm && !confirm(`Delete "${habit.name}"? Its history will also be removed.`)) return false;
    state.habits = state.habits.filter((h) => h.id !== id);
    tombstoneHabit(id);
    for (const day of Object.keys(state.completions)) {
      if (state.completions[day][id]) {
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
          if (res.ok) {
            const data = await res.json();
            const file = data.files && data.files[SYNC_FILENAME];
            if (file) {
              const remoteState = readRemotePayload(file.content);
              if (remoteState) {
                state = mergeStates(state, remoteState);
                persistRaw();
              }
            }
          }
        } catch (e) {
          if (e && e.rateLimited) throw e; // bubble up so we pause, don't PATCH
          console.warn("pre-push merge failed", e);
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
      renderSyncStateLine();
      renderDeviceList();
      const kb = (payload.length / 1024).toFixed(1);
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

      state = mergeStates(state, remoteState);
      stampThisDevice();
      persistRaw();

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

  function addSelectedTemplates() {
    if (templateSelected.size === 0) return;
    const now = Date.now();
    let count = 0;
    templateSelected.forEach((key) => {
      const [si, ii] = key.split(":").map(Number);
      const item = TEMPLATE_LIBRARY[si] && TEMPLATE_LIBRARY[si].items[ii];
      if (!item) return;
      state.habits.push({
        id: uid(),
        createdAt: new Date(now).toISOString(),
        updatedAt: now,
        ...TEMPLATE_ITEM_DEFAULTS,
        ...item,
      });
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
      todayEmpty: $("#todayEmpty"),
      todayHint: $("#todayHint"),
      todayHintDismiss: $("#todayHintDismiss"),
      journalText: $("#journalText"),
      journalSaved: $("#journalSaved"),
      // habits
      habitsGroups: $("#habitsGroups"),
      habitsEmpty: $("#habitsEmpty"),
      addBtn: $("#addBtn"),
      deleteAllBtn: $("#deleteAllBtn"),
      // habit modal
      modal: $("#modal"),
      modalTitle: $("#modalTitle"),
      habitForm: $("#habitForm"),
      habitName: $("#habitName"),
      habitCategory: $("#habitCategory"),
      habitTime: $("#habitTime"),
      habitReminder: $("#habitReminder"),
      habitNotes: $("#habitNotes"),
      habitTarget: $("#habitTarget"),
      habitUnit: $("#habitUnit"),
      habitIncrement: $("#habitIncrement"),
      typePicker: $(".type-picker"),
      countFields: $("#countFields"),
      iconPicker: $("#iconPicker"),
      colorPicker: $("#colorPicker"),
      daysPicker: $("#daysPicker"),
      advancedToggle: $("#advancedToggle"),
      dayTimesWrap: $("#dayTimesWrap"),
      dayTimesGrid: $("#dayTimesGrid"),
      cancelBtn: $("#cancelBtn"),
      deleteBtn: $("#deleteBtn"),
      // report
      weekLabel: $("#weekLabel"),
      prevWeek: $("#prevWeek"),
      nextWeek: $("#nextWeek"),
      statCompletion: $("#statCompletion"),
      statCompleted: $("#statCompleted"),
      statStreak: $("#statStreak"),
      dayAdherence: $("#dayAdherence"),
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
      quietStart: $("#quietStart"),
      quietEnd: $("#quietEnd"),
      morningDigest: $("#morningDigest"),
      eveningNudge: $("#eveningNudge"),
      clearHistoryBtn: $("#clearHistoryBtn"),
      deletePhotosBtn: $("#deletePhotosBtn"),
      themeSelect: $("#themeSelect"),
      compactToggle: $("#compactToggle"),
      remindersToggle: $("#remindersToggle"),
      exportBtn: $("#exportBtn"),
      importBtn: $("#importBtn"),
      fileInput: $("#fileInput"),
      resetAllBtn: $("#resetAllBtn"),
      browseTemplatesBtn: $("#browseTemplatesBtn"),
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
    return (dotIdx >= 0 ? t.slice(0, dotIdx) : t).trim();
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

  function renderToday() {
    const els = getEls();
    resetRenderCaches();
    els.todayGroups.innerHTML = "";
    const today = new Date();

    // Greeting
    const hour = today.getHours();
    els.todayGreeting.textContent = greetingForHour(hour) + " 👋";

    // One-time usage hint (only if there are habits and not yet dismissed)
    const showHint = state.habits.length > 0 && localStorage.getItem(KEYS.hintSeen) !== "true";
    els.todayHint.hidden = !showHint;

    const scheduled = state.habits.filter((h) => isHabitActiveOn(h, today));
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

    renderJournal(today);

    const active = todayCategoryFilter === "all"
      ? scheduled
      : scheduled.filter((h) => h.category === todayCategoryFilter);

    if (state.habits.length === 0) {
      els.todayEmpty.classList.remove("hidden");
      els.todayEmpty.innerHTML = '<p>No habits yet. Head to the Habits tab and tap <b>+ Add habit</b> to get started.</p>';
      return;
    }
    if (active.length === 0) {
      els.todayEmpty.classList.remove("hidden");
      els.todayEmpty.innerHTML = todayCategoryFilter === "all"
        ? '<p>Nothing scheduled for today. Enjoy the break.</p>'
        : `<p>No ${escapeHtml(todayCategoryFilter)} habits scheduled for today.</p>`;
      return;
    }
    els.todayEmpty.classList.add("hidden");

    // Bucket habits into day parts
    const buckets = new Map(DAY_PARTS.map((p) => [p.id, []]));
    const todayIdx = today.getDay();
    for (const h of active) buckets.get(dayPartFor(h, todayIdx)).push(h);
    const nowPart = currentDayPartId();

    for (const part of DAY_PARTS) {
      const list = buckets.get(part.id);
      if (!list || list.length === 0) continue;

      const tIdx = today.getDay();
      const byOrderTime = (a, b) => {
        const ta = parseTimeToMinutes(effectiveTime(a, tIdx)) ?? 9999;
        const tb = parseTimeToMinutes(effectiveTime(b, tIdx)) ?? 9999;
        if (ta !== tb) return ta - tb;
        return (a.order ?? 0) - (b.order ?? 0);
      };
      const pending = list.filter((h) => habitStatus(h, today) === "pending").sort(byOrderTime);
      const settled = list.filter((h) => habitStatus(h, today) !== "pending").sort(byOrderTime);
      const doneCount = list.filter((h) => isCompleted(h, today)).length;

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
          const lastHabit = pending[pending.length - 1];
          for (const h of pending) setCompletionValue(h.id, today, h.target);
          renderToday();
          showToast(`Marked ${pending.length} done.`, "success");
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

      // Pending items (drag-reorderable)
      const ul = document.createElement("ul");
      ul.className = "habit-list";
      ul.dataset.part = part.id;
      for (const habit of pending) ul.appendChild(renderTodayItem(habit, today));
      enableReorder(ul, pending, today);
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
          for (const habit of settled) cul.appendChild(renderTodayItem(habit, today));
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
    const pendingHabits = active
      .filter((h) => habitStatus(h, today) === "pending")
      .sort((a, b) => (parseTimeToMinutes(a.time) ?? 9999) - (parseTimeToMinutes(b.time) ?? 9999));
    if (pendingHabits.length === 0) { el.hidden = true; return; }
    // Prefer the next upcoming by clock time; fall back to first pending.
    const nowMin = today.getHours() * 60 + today.getMinutes();
    const upcoming = pendingHabits.find((h) => {
      const m = parseTimeToMinutes(h.time);
      return m !== null && m < 24 * 60 && m >= nowMin;
    });
    const next = upcoming || pendingHabits[0];
    const chip = timeChipLabel(next.time);
    el.hidden = false;
    el.innerHTML =
      `<span class="upnext-label">Up next</span>` +
      (chip ? `<span>🕒 ${escapeHtml(chip)}</span>` : "") +
      `<span class="upnext-name">${escapeHtml(next.icon + " " + next.name)}</span>`;
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
    els.adherenceText.textContent = pending === 0
      ? "All done for today. Nice work."
      : `${pending} habit${pending === 1 ? "" : "s"} still to go`;
    renderUpNext(active, today);
    $("#adherenceLegend").innerHTML =
      `<span class="leg"><span class="leg-num">${done}</span>Done</span>` +
      `<span class="leg"><span class="leg-num">${pending}</span>Pending</span>` +
      `<span class="leg"><span class="leg-num">${skipped}</span>Not done</span>`;
  }

  function renderTodayItem(habit, date) {
    const li = document.createElement("li");
    li.className = "habit-item";
    const status = habitStatus(habit, date); // "done" | "skipped" | "pending"
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
    const timeChip = timeChipLabel(effectiveTime(habit, date.getDay()));
    if (timeChip) {
      const timeEl = document.createElement("span");
      timeEl.className = "time-chip";
      timeEl.textContent = timeChip + ((habit.dayTimes && habit.dayTimes[date.getDay()]) ? " ✎" : "");
      meta.appendChild(timeEl);
    }
    if (atRisk) {
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

    // Expandable detail panel (hidden until the row is tapped)
    const detail = document.createElement("div");
    detail.className = "habit-detail hidden";
    const chips = document.createElement("div");
    chips.className = "detail-chips";
    const catBadge = document.createElement("span");
    catBadge.className = "category-badge";
    catBadge.textContent = habit.category;
    chips.appendChild(catBadge);
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

    // Unified minus / plus controls with tri-state:
    //   '+' toggles between done and pending
    //   '−' toggles between skipped and pending
    const controls = document.createElement("div");
    controls.className = "count-controls";

    const minus = document.createElement("button");
    minus.className = "stepper-btn minus";
    minus.setAttribute("aria-label", `Mark ${habit.name} not done`);
    if (status === "skipped") {
      minus.classList.add("active");
      minus.textContent = "✕";
    } else {
      minus.textContent = "−";
      if (status === "pending") minus.classList.add("muted");
    }
    minus.addEventListener("click", (e) => {
      e.stopPropagation();
      if (status === "skipped") {
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
    if (status === "done") {
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
      if (status === "done") {
        setCompletionValue(habit.id, date, 0);
        renderToday();
      } else {
        setCompletionWithUndo(habit, date, habit.target, `${habit.name} marked done`);
        maybeCelebrate(habit, date);
      }
    });
    controls.appendChild(plus);

    li.appendChild(controls);
    return li;
  }

  /* ---- Confetti + haptic celebration ---- */
  function celebrate(big) {
    if (navigator.vibrate) navigator.vibrate(big ? [30, 40, 30] : 20);
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
  function maybeCelebrate(habit, date) {
    const today = new Date();
    if (!sameDay(date, today)) return;
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

  /* ---- Reminders ---- */
  let reminderTimers = [];
  function clearReminderTimers() {
    reminderTimers.forEach((t) => clearTimeout(t));
    reminderTimers = [];
  }
  function remindersEnabled() {
    return localStorage.getItem(KEYS.remindersEnabled) === "true";
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

  function scheduleReminders() {
    clearReminderTimers();
    if (!remindersEnabled()) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const now = new Date();

    // ---- Group per-habit reminders by time slot ----
    const groups = new Map(); // "HH:MM" -> [habitId]
    for (const h of state.habits) {
      if (!h.reminderTime || !/^\d{2}:\d{2}$/.test(h.reminderTime)) continue;
      if (!isHabitActiveOn(h, now)) continue;
      const [hh, mm] = h.reminderTime.split(":").map(Number);
      if (inQuietHours(hh, mm)) continue;
      if (!groups.has(h.reminderTime)) groups.set(h.reminderTime, []);
      groups.get(h.reminderTime).push(h.id);
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
    updateBadge();
  }

  function fireGroupReminder(ids) {
    const today = new Date();
    const pending = ids
      .map((id) => state.habits.find((h) => h.id === id))
      .filter((h) => h && isHabitActiveOn(h, today) && !isCompleted(h, today) && !isSkipped(h, today));
    if (pending.length === 0) return;
    if (soundEnabled()) { try { playChime(); } catch (e) {} }
    if (navigator.vibrate) { try { navigator.vibrate([40, 30, 40]); } catch (e) {} }
    if (pending.length === 1) {
      const h = pending[0];
      notify(`${h.icon || "⏰"} ${h.name}`, {
        body: h.notes || (h.time ? `Time for your ${h.time.split("·")[0].trim()} habit` : "Time to check this off"),
        ids: [h.id],
        tag: "ht-slot-" + (h.reminderTime || h.id),
      });
    } else {
      const label = pending[0].time ? pending[0].time.split("·")[0].trim() : "Reminder";
      notify(`⏰ ${label} · ${pending.length} habits`, {
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
    const pending = scheduled.filter((h) => habitStatus(h, today) === "pending");
    if (pending.length === 0) return;
    notify("🌙 Before you wind down", {
      body: `${pending.length} habit${pending.length === 1 ? "" : "s"} still pending: ${pending.slice(0, 5).map((h) => h.name).join(", ")}${pending.length > 5 ? "…" : ""}`,
      ids: pending.map((h) => h.id),
      tag: "ht-nudge",
    });
    if (soundEnabled()) { try { playChime(); } catch (e) {} }
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
        { action: "snooze", title: "Snooze 10m" },
      ];
    }
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, options);
        return true;
      }
    } catch (e) { /* fall through */ }
    try {
      const n = new Notification(title, options);
      n.onclick = () => { window.focus(); n.close(); };
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
      const t = setTimeout(() => fireGroupReminder(ids), 10 * 60 * 1000);
      reminderTimers.push(t);
      showToast("Snoozed 10 minutes.");
    }
  }

  function testReminder() {
    ensureAudioCtx();
    const sample = state.habits.find((h) => h.reminderTime && isHabitActiveOn(h, new Date()));
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
      const pending = state.habits.filter((h) => isHabitActiveOn(h, today) && habitStatus(h, today) === "pending").length;
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
      const withTimes = state.habits.filter((h) => h.reminderTime).length;
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
        const extras = [];
        if (md) extras.push(`${md} digest`);
        if (en) extras.push(`${en} nudge`);
        const sorted = [...times].sort();
        if (sorted.length === 0 && extras.length === 0) {
          prev.innerHTML = "No reminder times set. Add a reminder time on a habit (in its edit screen).";
        } else {
          const all = [...sorted, ...extras];
          prev.innerHTML = `<b>Today's reminders:</b> ${all.map(escapeHtml).join(" · ")}`;
        }
      }
    }
  }

  /* ---- Habits management ---- */
  function renderHabits() {
    const els = getEls();
    els.habitsGroups.innerHTML = "";
    if (state.habits.length === 0) {
      els.habitsEmpty.classList.remove("hidden");
      els.deleteAllBtn.classList.add("hidden");
      return;
    }
    els.habitsEmpty.classList.add("hidden");
    els.deleteAllBtn.classList.remove("hidden");

    const cats = getCategories();
    const groupMap = new Map();
    for (const cat of cats) groupMap.set(cat, []);
    for (const h of state.habits) {
      if (!groupMap.has(h.category)) groupMap.set(h.category, []); // preserve unknown categories
      groupMap.get(h.category).push(h);
    }

    for (const cat of groupMap.keys()) {
      const list = groupMap.get(cat);
      if (!list || list.length === 0) continue;
      const wrap = document.createElement("div");
      const heading = document.createElement("div");
      heading.className = "category-group-title";
      heading.innerHTML = `<span>${cat}</span><span class="time-group-count">${list.length}</span>`;
      wrap.appendChild(heading);

      const ul = document.createElement("ul");
      ul.className = "habit-list";
      for (const habit of list) {
        const li = document.createElement("li");
        li.className = "habit-item";
        li.style.cursor = "pointer";
        li.addEventListener("click", () => openHabitModal(habit));

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
        li.appendChild(chev);
        li.appendChild(del);
        ul.appendChild(li);
      }
      wrap.appendChild(ul);
      els.habitsGroups.appendChild(wrap);
    }
  }

  /* ---- Habit modal ---- */
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
    els.habitReminder.value = habit ? (habit.reminderTime || "") : (localStorage.getItem(KEYS.reminderDefault) || "");
    els.habitNotes.value = habit ? (habit.notes || "") : "";
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

    // Advanced: per-day time overrides
    els.dayTimesGrid.innerHTML = "";
    const dt = (habit && habit.dayTimes) ? habit.dayTimes : {};
    for (const d of DAY_DISPLAY) {
      const stored = dt[d.idx];
      const hhmm = stored ? minToHHMM(parseTimeToMinutes(timeChipLabel(stored) || stored)) : "";
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
      reminderTime: /^\d{2}:\d{2}$/.test(els.habitReminder.value) ? els.habitReminder.value : "",
      notes: (els.habitNotes.value || "").trim().slice(0, 500),
      days: days.length ? days : [0,1,2,3,4,5,6],
      updatedAt: now,
    };

    if (editingId) {
      const h = state.habits.find((x) => x.id === editingId);
      if (h) Object.assign(h, payload);
    } else {
      state.habits.push({
        id: uid(),
        createdAt: new Date(now).toISOString(),
        order: state.habits.length,
        ...payload,
      });
    }
    save();
    scheduleReminders();
    closeModal();
    switchView(currentView);
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

    const habitsInScope = reportCategoryFilter === "all"
      ? state.habits
      : state.habits.filter((h) => h.category === reportCategoryFilter);

    let scheduledCount = 0, completedCount = 0, bestStreak = 0;
    const dayTotals = Array.from({ length: 7 }, () => ({ scheduled: 0, done: 0 }));
    const catTotals = {};
    const rows = [];

    for (const habit of habitsInScope) {
      let hs = 0, hd = 0;
      const cells = [];
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
        `<div class="cat-bar-head"><span class="cat-name">${c}</span><span class="cat-pct">${t.done}/${t.scheduled} · ${p}%</span></div>` +
        `<div class="cat-bar"><div class="cat-bar-fill" style="width:${p}%;background:${colorFor[c] || "#6366f1"}"></div></div>`;
      wrap.appendChild(row);
    }
  }

  /* ---- Report downloads ---- */
  function csvEscape(v) {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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
        if (h > 24) continue;
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
        `<div class="cf-move">${escapeHtml(timeChipLabel(c.curTime) || c.curTime)} → <b>${escapeHtml(c.newTime)}</b> <span style="opacity:.7">(${DAY_DISPLAY.find(d=>d.idx===c.dayIdx).full} only)</span></div>`;
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
    state.customMetrics.push({ id: uid(), name: name.trim().slice(0, 30), unit: unit.trim().slice(0, 12) });
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

      // Projection from average weekly change
      const weeks = wl.length - 1;
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
            ${g.targetDate ? `<span>Target date: <b>${g.targetDate}</b></span>` : ""}
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
      .filter((e) => e.weight !== null || e.waist !== null || e.energy !== null || e.strengthTrend || e.notes)
      .sort((a, b) => a.weekKey.localeCompare(b.weekKey));
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
      const weeks = wl.length - 1;
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

  /* ---- Insight line ---- */
  function renderInsight() {
    const card = $("#insightCard");
    const el = $("#insightText");
    const wl = measurementsWithWeight();
    const parts = [];
    if (wl.length >= 2) {
      const start = wl[0], latest = wl[wl.length - 1];
      const change = latest.weight - start.weight;
      const weeks = wl.length - 1;
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
    const data = {
      date: wk,
      weight: wVal === null ? null : wStore(wVal),   // store canonical lb
      waist: waistVal === null ? null : lStore(waistVal), // store canonical in
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
    els.remindersToggle.checked = remindersEnabled() && ("Notification" in window) && Notification.permission === "granted";
    els.compactToggle.checked = localStorage.getItem(KEYS.compact) === "true";
    els.unitsSelect.value = localStorage.getItem(KEYS.units) === "metric" ? "metric" : "imperial";
    els.deviceNameInput.value = localStorage.getItem(KEYS.deviceName) || "";
    els.reminderDefault.value = localStorage.getItem(KEYS.reminderDefault) || "";
    els.soundToggle.checked = soundEnabled();
    els.quietStart.value = localStorage.getItem(KEYS.quietStart) || "";
    els.quietEnd.value = localStorage.getItem(KEYS.quietEnd) || "";
    els.morningDigest.value = localStorage.getItem(KEYS.morningDigest) || "";
    els.eveningNudge.value = localStorage.getItem(KEYS.eveningNudge) || "";
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
    el.innerHTML = `☁️ Last synced <b>${timeAgo(lastSyncedAt)}</b> · Device: <b>${escapeHtml(getDeviceName())}</b> · Auto-sync <b>${auto}</b>`;
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
    getCategories().forEach((cat, idx) => {
      const row = document.createElement("div");
      row.className = "category-row";
      const input = document.createElement("input");
      input.type = "text";
      input.value = cat;
      input.maxLength = 30;
      input.addEventListener("change", () => renameCategory(idx, input.value.trim()));
      const count = document.createElement("span");
      count.className = "cat-count";
      count.textContent = `${counts[cat] || 0} habit${(counts[cat] || 0) === 1 ? "" : "s"}`;
      const del = document.createElement("button");
      del.className = "cat-del";
      del.textContent = "✕";
      del.title = "Remove category";
      del.addEventListener("click", () => removeCategory(idx));
      row.appendChild(input);
      row.appendChild(count);
      row.appendChild(del);
      wrap.appendChild(row);
    });
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

    // Habits
    els.addBtn.addEventListener("click", () => openHabitModal(null));
    els.deleteAllBtn.addEventListener("click", deleteAllHabits);
    els.cancelBtn.addEventListener("click", closeModal);
    els.deleteBtn.addEventListener("click", () => {
      if (!editingId) return;
      if (deleteHabitById(editingId)) { closeModal(); switchView(currentView); }
    });
    els.habitForm.addEventListener("submit", submitHabitForm);
    els.modal.addEventListener("click", (e) => { if (e.target === els.modal) closeModal(); });
    els.typePicker.addEventListener("click", (e) => {
      const btn = e.target.closest(".type-btn");
      if (!btn) return;
      els.typePicker.querySelectorAll(".type-btn").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      els.countFields.classList.toggle("hidden", btn.dataset.type !== "count");
    });
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
    els.reportMenuBtn.addEventListener("click", (e) => { e.stopPropagation(); els.reportMenu.classList.toggle("hidden"); });
    els.reportMenu.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => {
        els.reportMenu.classList.add("hidden");
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
    const fu = document.getElementById("forceUpdateBtn");
    if (fu) fu.addEventListener("click", forceUpdate);

    // Settings — Theme
    els.themeSelect.addEventListener("change", onThemeChange);
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
    if (localStorage.getItem(KEYS.compact) === "true") document.body.classList.add("compact");
    wireEvents();
    populateCategorySelects();
    const filterSel = $("#todayCategoryFilter");
    if (filterSel) filterSel.value = todayCategoryFilter;
    hydrateSettings();
    checkPairingLink();
    updateSyncIndicator(navigator.onLine ? "idle" : "offline");
    if (isAutoSyncEnabled()) startAutoSync();
    if (remindersEnabled()) scheduleReminders();
    document.addEventListener("pointerdown", unlockAudioOnce, { once: true });
    document.addEventListener("keydown", unlockAudioOnce, { once: true });
    updateBadge();

    // Listen for notification actions relayed by the service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (e) => {
        const d = e.data || {};
        if (d.type === "notif-action") handleNotifAction(d.action, d.data || {});
      });
    }
    // Cold-start: notification opened the app with ?notif=&ids=
    const params = new URLSearchParams(location.search);
    if (params.has("notif")) {
      const ids = (params.get("ids") || "").split(",").filter(Boolean);
      handleNotifAction(params.get("notif"), { ids });
      history.replaceState(null, "", location.pathname);
    }
    switchView(currentView);

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").then((reg) => {
          // Check for updates on load, then auto-reload when a new SW activates.
          reg.update().catch(() => {});
          reg.addEventListener("updatefound", () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener("statechange", () => {
              if (nw.state === "installed" && navigator.serviceWorker.controller) {
                showToast("Updating to the latest version…");
              }
            });
          });
        }).catch(() => {});
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      });
    }
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
    self.__momentumTest = { mergeStates, normalizeState, defaultState, currentStreak, startOfWeekMonday, dateKey, addDays, parseScheduleText, effectiveTime, suggestFit };
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

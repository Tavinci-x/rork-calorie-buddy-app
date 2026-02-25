export const BUDDY_MESSAGES = {
  morning_no_meals: [
    "Hey! Breakfast is the most important meal. Go eat something NOW.",
    "I'm starving over here... which means YOU haven't eaten yet. Fix that.",
    "Morning! Your body needs fuel. Don't you dare skip breakfast.",
    "Rise and shine! I need you to log breakfast. No excuses.",
    "Good morning! Have you had water yet? Drink a glass and eat something!",
  ],
  afternoon_no_meals: [
    "It's past noon and you haven't logged a single thing. Feed yourself!",
    "Hello?? You haven't eaten today? Go grab lunch RIGHT NOW.",
    "I'm watching you... zero meals logged. That's not okay. Go eat!",
    "Skipping meals isn't a strategy. Log your lunch, please!",
    "Your body is running on empty. Time to eat and LOG IT.",
  ],
  evening_no_meals: [
    "The day is almost over and you haven't logged anything. Not cool.",
    "Don't go to bed without eating properly. Log your dinner!",
    "I've been waiting ALL day for you to log a meal... still waiting.",
  ],
  meal_logged: [
    "Good job logging that! Now... have you had enough water today?",
    "Meal logged! Don't forget to hit your protein target too.",
    "Nice one! Keep the momentum going. What's your next meal?",
    "That's what I like to see! Are you staying hydrated though?",
    "Logged! Make sure you're getting enough protein in there.",
    "Great work! Remember to drink water between meals.",
  ],
  low_protein: [
    "Your protein is looking low today. Go eat some chicken, eggs, or yogurt!",
    "Where's the protein?? You need more to hit your goals. Step it up!",
    "I'm seeing carbs and fats but not enough protein. Fix that next meal!",
    "Protein check: you're behind. Grab a protein-rich snack NOW.",
  ],
  target_met: [
    "You crushed your calorie goal today! I'm proud of you.",
    "Perfect day! All logged and on target. Keep this energy tomorrow!",
    "Goal hit! Now make sure you've had enough water and rest well.",
  ],
  over_target: [
    "You went a bit over today. No stress — just be mindful tomorrow.",
    "Slightly over target, but one day won't break anything. Stay on track!",
    "A little over — it happens. Tomorrow's a fresh start. I believe in you.",
  ],
  streak: [
    "{streak} day streak! Don't you dare break it. Keep logging!",
    "{streak} days in a row! I'm impressed. Now go drink some water.",
    "Look at you — {streak} days strong! Stay consistent, don't slip.",
  ],
  returning: [
    "Where have you been?! I was worried. Let's get back on track NOW.",
    "You disappeared on me... but you're back! Time to log a meal.",
    "Welcome back! No guilt, just action. Start logging today.",
  ],
  hydration: [
    "Quick reminder: have you had water recently? Go drink a glass!",
    "Water check! Your body needs hydration. Drink up!",
    "Don't forget to hydrate between meals. Go grab some water!",
  ],
  sleeping: [
    "Zzz... rest well. Tomorrow we're hitting those goals hard...",
    "Goodnight! Make sure you drink water before bed... zzz...",
  ],
  default: [
    "Hey! Have you logged your meals today? Don't make me ask twice.",
    "I'm here to keep you honest. Log your food and drink your water!",
    "What's the plan for today? Let's hit those calorie and protein goals!",
    "Don't forget: eat well, log everything, and STAY HYDRATED.",
    "I've got my eye on you. Time to log something!",
  ],
} as const;

export type BuddyMessageCategory = keyof typeof BUDDY_MESSAGES;

export function getRandomMessage(category: BuddyMessageCategory, replacements?: Record<string, string>): string {
  const messages = BUDDY_MESSAGES[category];
  let message: string = messages[Math.floor(Math.random() * messages.length)];
  if (replacements) {
    Object.entries(replacements).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, value);
    });
  }
  return message;
}

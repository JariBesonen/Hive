import { randomBytes } from "crypto";
import type { PoolClient } from "pg";
import { pool } from "./index";
import { initDatabase } from "./init";
import { hashPassword } from "../utils/password";

interface SeedUser {
  username: string;
  displayName: string;
  bio: string;
  ageDays: number;
}

interface SeedHive {
  name: string;
  description: string;
  tags: string[];
  owner: number;
  members: number[];
  posts: string[];
}

const users: SeedUser[] = [
  { username: "mossykeys", displayName: "Mara V.", bio: "usually reading or looking for the nearest cat", ageDays: 620 },
  { username: "ctrlaltcoffee", displayName: "Dev Patel", bio: "frontend dev, mediocre climber, excellent lunch break taker", ageDays: 410 },
  { username: "sundaystatic", displayName: "June", bio: "old movies and loud guitars", ageDays: 355 },
  { username: "raccoonhours", displayName: "Theo", bio: "night shift person. tell me what I missed.", ageDays: 300 },
  { username: "linhdraws", displayName: "Linh Nguyen", bio: "design student, serial playlist maker", ageDays: 270 },
  { username: "mildlyferal", displayName: "Ash", bio: "trying to keep three plants alive. two is still progress.", ageDays: 245 },
  { username: "patchnotespls", displayName: "Nico R.", bio: "games are supposed to be fun, actually", ageDays: 220 },
  { username: "ellieonbreak", displayName: "Ellie", bio: "coffee shop shifts and community college", ageDays: 190 },
  { username: "softlaunchsam", displayName: "Sam K.", bio: "learning to cook without setting off the smoke alarm", ageDays: 170 },
  { username: "nocturnalmoth", displayName: "Rae", bio: "horror fan, even when the movie is objectively bad", ageDays: 150 },
  { username: "beepboopben", displayName: "Ben W.", bio: "I fix computers and then my own computer breaks", ageDays: 125 },
  { username: "peachpitriot", displayName: "Talia", bio: "opinions, thrift finds, and a very patient dog", ageDays: 100 },
  { username: "laundrymountain", displayName: "Chris", bio: "one day at a time, one load of laundry at a time", ageDays: 80 },
  { username: "tinyplanetkim", displayName: "Kim A.", bio: "first year, still figuring out where everything is", ageDays: 65 },
  { username: "vhsandvinegar", displayName: "Milo", bio: "film nerd with a soft spot for terrible sequels", ageDays: 50 },
  { username: "birdlawyer", displayName: "Jo", bio: "my parrot has better social skills than I do", ageDays: 40 },
  { username: "raincheckpls", displayName: "Morgan", bio: "work in progress, emphasis on progress", ageDays: 25 },
  { username: "wornsneakers", displayName: "Ari", bio: "music recs welcome. I will actually listen.", ageDays: 18 },
  { username: "bytebyside", displayName: "Owen", bio: "back-end tinkering after the day job", ageDays: 12 },
  { username: "soupweather", displayName: "Nina", bio: "here for little wins and soup discourse", ageDays: 5 },
];

const hives: SeedHive[] = [
  {
    name: "Meme Breakroom",
    description: "Low-effort jokes, niche memes, and things that made your group chat pause for half a second.",
    tags: ["memes", "humor", "internet"],
    owner: 5,
    members: [0, 1, 3, 5, 6, 8, 10, 11, 15, 18],
    posts: [
      "I waved back at someone who was waving at the person behind me. moving cities now",
      "opened the fridge, forgot why, closed it, remembered why, opened it again. efficient",
      "our group chat has 94 unread messages and somehow the only important one is a thumbs up",
      "me putting a mug somewhere safe and discovering it three days later in a completely different room",
      "the microwave beeped while I was standing right there. still startled.",
    ],
  },
  {
    name: "After the Credits",
    description: "Talk games: what you're playing, what you dropped, and the little details you can't stop thinking about.",
    tags: ["gaming", "games", "discussion"],
    owner: 6,
    members: [0, 2, 3, 4, 6, 7, 10, 14, 17, 18, 19],
    posts: [
      "I miss when the menu didn't have more currencies than the actual game",
      "Started the new save to check one thing. It's 1:40am and I have a farm now.",
      "What game do you keep installed even though you haven't touched it in months?",
      "I don't need another login reward. I need to remember what I was doing in this quest.",
      "Spent 20 minutes decorating a room nobody else will see. pretty good evening tbh",
    ],
  },
  {
    name: "The Bug Is Somewhere",
    description: "Programming without the conference-talk voice. Questions, small wins, frustrating bugs, and useful discoveries.",
    tags: ["coding", "programming", "tech"],
    owner: 1,
    members: [1, 4, 6, 8, 10, 13, 17, 18, 19],
    posts: [
      "Four hours on a bug. The value was `undefined`. It was supposed to be `id`. going for a walk",
      "Spent all morning blaming the API. It was my request body. classic.",
      "What's a keyboard shortcut you use enough that you get annoyed on other computers?",
      "I can follow recursion fine in the debugger and then completely lose the plot explaining it",
      "Automated the boring spreadsheet cleanup I do every Monday. tested it twice because I do not trust past me.",
    ],
  },
  {
    name: "One More Movie",
    description: "Movie nights, strong opinions, comfort rewatches, and spoiler-aware recommendations.",
    tags: ["movies", "film", "watchlist"],
    owner: 14,
    members: [0, 2, 4, 9, 11, 14, 15, 17, 19],
    posts: [
      "A friend told me to watch something and refused to even tell me the genre. best way to go in.",
      "Put on a random old detective movie while making dinner and now I need to see the rest of the series",
      "What's a movie you didn't expect to like but ended up recommending to everyone?",
      "Saw a comedy in a nearly empty theater and one person's laugh made every joke land harder",
      "Rewatched a movie I loved as a kid. The soundtrack still works; the plot is mostly people not talking.",
    ],
  },
  {
    name: "Lights Out Club",
    description: "Ghost stories, creepy scenes, practical effects, and horror that sticks with you afterward.",
    tags: ["horror", "movies", "spooky"],
    owner: 9,
    members: [0, 2, 3, 4, 9, 11, 14, 15, 19],
    posts: [
      "October movie plan: the same three slashers I've watched every year since high school",
      "The empty hallway was scarier than anything that actually happened in that movie",
      "Need a slow horror recommendation for tonight. tense is good, bleak ending not required",
      "Old creature effects have a charm CGI still hasn't managed to replace for me",
      "Watched it alone with headphones. Took them off before going to get water.",
    ],
  },
  {
    name: "Songs on Repeat",
    description: "What you're listening to, albums you keep coming back to, and songs that found you at the right time.",
    tags: ["music", "listening", "recommendations"],
    owner: 17,
    members: [0, 2, 4, 5, 8, 9, 14, 16, 17, 19],
    posts: [
      "I've played the same four-minute song on the walk home every day this week. not tired of it yet",
      "Saw a band in a room that holds maybe 80 people. my ears are still ringing and I'm already looking up their next show",
      "Any albums that get better when you listen front to back instead of picking singles?",
      "Everyone's doing year-end lists already and I'm still figuring out what came out in spring",
      "Heard a song through someone's open car window at a stoplight. Shazam failed me.",
    ],
  },
  {
    name: "Relationship Weather",
    description: "Kind, honest conversations about dating, friendships, boundaries, and all the in-between stuff.",
    tags: ["relationships", "advice", "life"],
    owner: 11,
    members: [0, 3, 5, 7, 8, 11, 12, 13, 16, 19],
    posts: [
      "I want to make friends here but 'we should hang out sometime' has defeated me three times now. what actually works?",
      "Friend sent me a photo of something I mentioned liking months ago. felt very seen.",
      "Do you ever need a quiet night after seeing people you genuinely love, or is that just me?",
      "Practicing not giving a five-paragraph explanation every time I can't make it",
      "My friend brought me soup when I was sick without asking what I needed. still thinking about it.",
    ],
  },
  {
    name: "Campus Side Quest",
    description: "Student life beyond the syllabus: classes, roommates, study breaks, and figuring it out as you go.",
    tags: ["college", "students", "campus"],
    owner: 13,
    members: [1, 4, 6, 7, 8, 10, 13, 16, 18],
    posts: [
      "Three weeks in and I still have to check the map to find my 9am lecture",
      "Library's packed and my roommate has friends over. where are people finding a quiet table today?",
      "Went to every class this week, even the Friday one. documenting this for future me.",
      "I know which seat is mine in exactly one classroom. progress.",
      "Packed lunch, forgot my fork. ate pasta with a coffee stirrer. campus life.",
    ],
  },
  {
    name: "Clocked Out-ish",
    description: "Work stories, coworker quirks, boundaries, career questions, and the long walk to Friday.",
    tags: ["work", "careers", "office"],
    owner: 16,
    members: [1, 3, 7, 8, 10, 11, 12, 16, 18, 19],
    posts: [
      "The 'quick sync' has been on my calendar for 45 minutes since March",
      "How do you actually switch off work chat when your team treats every message like a tiny emergency?",
      "New job, day four. Still don't know if the office kitchen mugs are communal or someone's collection.",
      "The task I put off all week took 25 minutes. I hate when the math works out like that.",
      "Had lunch away from my desk for the first time in ages. would recommend, apparently.",
    ],
  },
  {
    name: "Pets With Opinions",
    description: "Small roommates with fur, feathers, scales, and very specific ideas about your schedule.",
    tags: ["pets", "animals", "stories"],
    owner: 15,
    members: [0, 3, 5, 7, 9, 11, 12, 15, 16, 19],
    posts: [
      "Cat worked out the door handle last night. I have a new lock on the shopping list.",
      "Dog brought me a single sock during a work call and stared until I thanked him",
      "My parrot now says 'hello?' from the other room whenever I'm on the phone",
      "What completely ordinary household object has your pet decided is dangerous?",
      "I was meant to leave ten minutes ago but the cat picked my lap. rescheduling.",
    ],
  },
  {
    name: "Respectfully, I Disagree",
    description: "Unpopular opinions welcome, as long as we can disagree like people who share a bus stop.",
    tags: ["opinions", "discussion", "debate"],
    owner: 5,
    members: [0, 2, 3, 5, 6, 8, 9, 12, 14, 16, 19],
    posts: [
      "I like rainy walks right up until my socks get wet. then the whole thing is over.",
      "If you ask what to watch, please give me one pick and a sentence about why",
      "Brunch is good, but waiting an hour for eggs has never made sense to me",
      "A hobby can just be something you're bad at on a Tuesday. it doesn't need a business plan.",
      "Trailers that explain the setup, sure. Trailers that explain every twist, why are we here?",
    ],
  },
  {
    name: "Passing Thought",
    description: "The stray thoughts, small observations, and things you noticed on the way to doing something else.",
    tags: ["thoughts", "daily", "random"],
    owner: 19,
    members: [0, 1, 2, 3, 5, 8, 12, 16, 17, 19],
    posts: [
      "The bus was early for once and I was early for once. witnessed a rare alignment",
      "Laundry has been folded and is now waiting for me to put it away. we all have our part to play.",
      "Walked past the bakery right when they put the bread out. could've been worse.",
      "There are songs I know by heart that I have never once chosen to play myself",
      "Someone at the corner shop let me go ahead because I only had one thing. thinking about it more than I should.",
    ],
  },
  {
    name: "Ask a Neighbor",
    description: "Practical questions and advice from people who've probably had the same problem at some point.",
    tags: ["questions", "advice", "help"],
    owner: 0,
    members: [0, 1, 3, 5, 7, 8, 10, 12, 13, 16, 19],
    posts: [
      "First apartment people: what did you end up buying in week one that you thought you didn't need?",
      "Trying to save these pasta sauce jars for pantry stuff. Any trick for getting the labels off cleanly?",
      "I avoid phone calls even when they're simple. did anything help you get over that?",
      "One afternoon in a city I've never visited, no car. what would you go see?",
      "Desk chair recommendations under $250? My current one is making itself known.",
    ],
  },
  {
    name: "Outfit Repeat",
    description: "Personal style chat: rewearing favorites, thrift finds, comfort, and getting dressed for real life.",
    tags: ["fashion", "style", "clothes"],
    owner: 4,
    members: [0, 2, 4, 5, 7, 8, 11, 13, 16, 17],
    posts: [
      "Bought a coat secondhand and found a bus transfer in the pocket dated 2011",
      "Thrift-store jacket fits perfectly except for one pocket that has definitely been sewn shut for a reason",
      "What's the thing in your closet you keep repairing instead of replacing?",
      "I want to look put together but I also need to walk three miles. shoes are the whole problem.",
      "I've worn the same jeans and jacket combo four days this week. no one's called the police yet.",
    ],
  },
  {
    name: "Everyday Tech",
    description: "Devices and software we actually use, useful fixes, and tech opinions from regular humans.",
    tags: ["technology", "gadgets", "software"],
    owner: 10,
    members: [1, 3, 6, 7, 10, 12, 13, 17, 18, 19],
    posts: [
      "Every app has asked to send notifications this week. I would like all of them to stop asking.",
      "What's a small piece of tech you use constantly and only notice when it breaks?",
      "Old laptop takes a full minute to wake up but at least it isn't recommending premium features",
      "Moved my passwords into a manager. The relief is nice; the cleanup is going to take a while.",
      "My washing machine wants Wi-Fi now. I don't want to check an app to see if my socks are clean.",
    ],
  },
  {
    name: "Little Life Log",
    description: "Ordinary updates count: the wins, the weird days, and what happened between bigger things.",
    tags: ["personal", "updates", "life"],
    owner: 12,
    members: [0, 2, 3, 5, 7, 8, 11, 12, 13, 16, 19],
    posts: [
      "Finally made the dentist appointment. I have been avoiding that phone call since July.",
      "Got off the bus a stop early because it was still light out. found a nice little side street.",
      "Bad meeting, good walk, leftover noodles. day recovered enough.",
      "Neighbor left tomatoes on the landing with a 'take some' note. dinner sorted.",
      "Called my grandma while she was watering the garden. heard a full report on the zucchini.",
    ],
  },
  {
    name: "Kitchen Experiments",
    description: "Weeknight cooking, recipe detours, and the occasional meal that was supposed to be something else.",
    tags: ["cooking", "food", "home"],
    owner: 8,
    members: [0, 3, 5, 7, 8, 10, 12, 13, 16, 19],
    posts: [
      "Made lentil soup from whatever was left in the cupboard. Added lemon at the end and it actually worked.",
      "I bought a bag of spinach for one recipe and now I'm trying to use it before it turns into soup by itself. ideas?",
      "Recipe said one clove of garlic. I used four and I'm not taking questions.",
      "Toast, fried egg, whatever green thing is in the fridge. lunch figured out.",
      "Burned the first pancake, ate it standing by the stove, second batch was perfect. normal service resumed.",
    ],
  },
];

const previousSeedPosts: string[][] = [
  [
    "my brain at 2am: remember that awkward thing you said in 2014",
    "I opened the fridge three times like a new snack was going to spawn",
    "the group project could have been an email and the email could have been silence",
    "me: I'll just sit down for a minute. also me, somehow under a blanket with a full episode watched",
    "when the microwave says 0:01 and you suddenly become an explosives expert",
  ],
  [
    "why does every game suddenly need a battle pass",
    "I finally tried the game everyone kept recommending and lost my entire evening to one more quest",
    "what game has the best soundtrack to just wander around in?",
    "I miss when unlocking a color meant playing the game, not opening a store tab",
    "tiny appreciation post for games that let you pet the dog and then get right back to the plot",
  ],
  [
    "finally fixed a bug that took me like 4 hours and it was literally one missing character",
    "today I learned the error message was telling the truth the whole time. rude.",
    "what's your favorite tiny quality-of-life thing in an editor?",
    "I understand recursion right up until I have to explain it out loud",
    "got a little script working that saves me ten minutes every morning. very small victory, still counting it.",
  ],
  [
    "hot take: some movies are better when you know absolutely nothing about them before watching",
    "I watched a movie because the poster looked nice and accidentally had a great Tuesday",
    "what's a movie you can put on while doing chores and still end up watching the whole thing?",
    "the best theater audience is the one that laughs at the joke and then immediately goes quiet again",
    "rewatched a favorite from when I was 12. half of it aged weirdly, half of it still rules.",
  ],
  [
    "does anyone else rewatch the same horror movies every october",
    "the scariest part of that movie was honestly the house. I would not sleep there for free.",
    "looking for a slow-burn horror movie that's unsettling but not just two hours of misery",
    "practical effects age so much better than a lot of early CGI",
    "I watched a supposedly 'not that scary' movie alone and immediately turned on every light in my apartment",
  ],
  [
    "what song have you listened to an unreasonable number of times this week?",
    "there's something about hearing a favorite song live that makes the studio version feel brand new after",
    "made a playlist for a bus ride and accidentally gave it a plot arc",
    "I don't need a new album every Friday. I need one album to sit with for a month.",
    "heard a song in the grocery store and now I'm trying to remember the chorus before I get home",
  ],
  [
    "how do you make new friends as an adult without feeling like you're scheduling a dentist appointment",
    "a small check-in text from a friend can honestly turn my whole day around",
    "is it normal to need a little alone time after a really good weekend with people you love",
    "learning that 'no thanks' is a complete sentence, slowly but surely",
    "my friend remembered a tiny detail I mentioned weeks ago and I have been thinking about it all day",
  ],
  [
    "why is every campus building named after someone I have never heard of",
    "the library is full, the cafe is full, my room is loud. where are people studying today",
    "I made it to every class this week. that's literally the whole post.",
    "anyone else feel like the first month of a semester is just learning where to sit",
    "I packed lunch and remembered to bring it. adulthood, apparently.",
  ],
  [
    "my calendar has a meeting called 'quick sync' that is now on its third week",
    "what's a polite way to say I am not checking work messages on vacation",
    "first week at a new job and I still don't know which fridge shelf is socially mine",
    "I finished the thing I was dreading and it took less time than the dread",
    "some days the most professional thing I do is remember to eat lunch",
  ],
  [
    "my cat learned how to open my bedroom door and now privacy is over",
    "the dog brought me one shoe and then looked offended that I didn't know what to do with it",
    "my parrot has started saying 'meeting?' whenever I put headphones on",
    "pet people: what harmless thing does yours act like is a life-or-death emergency?",
    "sat on the floor for five minutes because the cat fell asleep on my lap. no regrets.",
  ],
  [
    "unpopular opinion: a little rain makes a walk better",
    "I would rather get one thoughtful recommendation than a list of fifty things to watch",
    "brunch is just lunch with a longer queue and worse coffee",
    "not every hobby needs to become a side hustle",
    "I like movie trailers less the more they explain the plot",
  ],
  [
    "some days the best plan is to make no new plans",
    "why does clean laundry become furniture for at least one day",
    "the sun came out right as I got to the bus stop. taking the win.",
    "I wonder how many songs I know only because someone else played them in a car",
    "it's kind of nice when the person ahead of you holds the door without making it a whole thing",
  ],
  [
    "what's one thing you wish someone had told you before your first apartment?",
    "how do you get sticker residue off a jar without making the whole kitchen smell like chemicals",
    "is there a low-stakes way to get better at making phone calls",
    "I have one free afternoon in a new city. do you pick a museum or just walk around?",
    "does anyone have a genuinely comfortable chair recommendation that isn't wildly expensive",
  ],
  [
    "the best clothes are the ones you reach for again before they're even fully dry",
    "I found a jacket at the thrift store with a movie ticket still in the pocket from 2008",
    "what's an item you bought once and then wore constantly for years?",
    "I want to dress a little nicer but my version of nicer is still sneakers",
    "wearing the same outfit formula all week has freed up more brain space than expected",
  ],
  [
    "I just want my apps to stop asking me to turn on notifications every single time",
    "what piece of tech do you use every day that you forget is actually pretty clever?",
    "my old laptop is slower but at least it doesn't suggest a subscription during startup",
    "finally set up a password manager. should have done that about five years ago.",
    "why does every appliance need an app now. the toaster is fine on its own.",
  ],
  [
    "finally booked the appointment I've been putting off. tiny adult victory.",
    "I took the long way home because the weather was nice and I had nowhere urgent to be",
    "rough morning, decent afternoon, noodles for dinner. we move.",
    "my neighbor left extra tomatoes by the mailboxes and now dinner is solved",
    "I called my grandma just to hear about her garden and it was exactly the right thing",
  ],
  [
    "made soup without a recipe and it came out good enough to write down. who am I",
    "I have half a cabbage and no plan. what would you make?",
    "the recipe said 'a pinch' and I made the executive decision to use my whole hand",
    "toast, egg, chili crisp. not fancy, hits every time.",
    "I burned the first batch of pancakes and the second batch was great. breakfast has a learning curve.",
  ],
];

interface SeedComment {
  hive: number;
  post: number;
  user: number;
  parent?: number;
  content: string;
  ageHours: number;
}

const comments: SeedComment[] = [
  { hive: 0, post: 0, user: 3, content: "and then I remember it in the shower the next morning", ageHours: 45 },
  { hive: 0, post: 0, user: 11, parent: 0, content: "the shower is where my brain keeps its archives apparently", ageHours: 43 },
  { hive: 0, post: 2, user: 8, content: "we had 4 people editing the same slide deck and somehow none of us had the right version", ageHours: 30 },
  { hive: 0, post: 4, user: 15, content: "I stand there staring at the countdown like I personally disarmed it", ageHours: 12 },
  { hive: 1, post: 0, user: 6, content: "I don't mind paying for a good game. I do mind the shop being louder than the game.", ageHours: 90 },
  { hive: 1, post: 0, user: 10, content: "and somehow the battle pass has a battle pass", ageHours: 86 },
  { hive: 1, post: 2, user: 2, content: "I love just walking around in Red Dead. The weather alone gets me.", ageHours: 61 },
  { hive: 1, post: 2, user: 14, content: "Outer Wilds, but go in blind if you can", ageHours: 58 },
  { hive: 1, post: 3, user: 17, content: "I miss unlocks that were a little secret reward for doing something silly", ageHours: 14 },
  { hive: 2, post: 0, user: 18, content: "I once lost 20 minutes to a semicolon that was in the wrong place. solidarity.", ageHours: 72 },
  { hive: 2, post: 0, user: 1, parent: 9, content: "it was a closing bracket for me. the editor was not impressed.", ageHours: 70 },
  { hive: 2, post: 2, user: 10, content: "multi-cursor editing. I feel like I got a superpower every time.", ageHours: 40 },
  { hive: 2, post: 2, user: 4, content: "rename symbol, especially in a big project. I used to do that by hand 😬", ageHours: 35 },
  { hive: 2, post: 4, user: 8, content: "ten minutes every morning adds up! what does the script do?", ageHours: 9 },
  { hive: 3, post: 0, user: 9, content: "trailers that show the whole third act should be illegal", ageHours: 65 },
  { hive: 3, post: 0, user: 14, content: "I mute the trailer and watch the visuals now. still too much sometimes.", ageHours: 60 },
  { hive: 3, post: 2, user: 0, content: "Chef. I've seen it a dozen times and still get hungry every time.", ageHours: 36 },
  { hive: 3, post: 4, user: 2, content: "that is the best kind of rewatch. noticing what you missed and what you didn't.", ageHours: 11 },
  { hive: 4, post: 0, user: 2, content: "every October. The Thing is basically a seasonal tradition now.", ageHours: 89 },
  { hive: 4, post: 0, user: 15, content: "the original Halloween, even though I've seen it enough to quote it", ageHours: 81 },
  { hive: 4, post: 2, user: 14, content: "The Others is a good one if you haven't seen it", ageHours: 20 },
  { hive: 4, post: 2, user: 9, parent: 20, content: "yes! going to save that for a rainy night", ageHours: 18 },
  { hive: 5, post: 0, user: 17, content: "currently an embarrassing amount of one song from an album I already love", ageHours: 77 },
  { hive: 5, post: 2, user: 4, content: "I love when a playlist accidentally turns into a little documentary of the day", ageHours: 55 },
  { hive: 5, post: 4, user: 0, content: "Shazam is great until you forget to open it in time", ageHours: 15 },
  { hive: 6, post: 0, user: 12, content: "inviting someone for a walk or a class has been less awkward than 'we should hang out sometime' for me", ageHours: 92 },
  { hive: 6, post: 2, user: 7, content: "yes, and it doesn't mean you like them less. social battery is real.", ageHours: 46 },
  { hive: 6, post: 2, user: 11, parent: 26, content: "I needed this reminder today, thank you", ageHours: 44 },
  { hive: 7, post: 0, user: 13, content: "I have a map open and still walk into the wrong building every week", ageHours: 68 },
  { hive: 7, post: 2, user: 1, content: "that counts. showing up is the hard bit some weeks.", ageHours: 25 },
  { hive: 8, post: 1, user: 10, content: "I put a focus block on my calendar and decline anything over it. If it's urgent they can ask.", ageHours: 51 },
  { hive: 8, post: 1, user: 16, content: "I started putting 'out of office' on my status the day before. helps me disconnect.", ageHours: 49 },
  { hive: 8, post: 3, user: 7, content: "the dread really does take longer than the task sometimes", ageHours: 13 },
  { hive: 9, post: 0, user: 3, content: "mine figured out the handle and now I have to lock the door like a hotel", ageHours: 96 },
  { hive: 9, post: 0, user: 15, parent: 33, content: "this is my future and I know it", ageHours: 93 },
  { hive: 9, post: 3, user: 0, content: "my cat panics if a paper bag moves slightly", ageHours: 31 },
  { hive: 10, post: 0, user: 2, content: "I will defend this one. rain walks are elite.", ageHours: 71 },
  { hive: 10, post: 2, user: 8, content: "brunch is just waiting for a table so you can pay extra for eggs", ageHours: 40 },
  { hive: 10, post: 2, user: 11, content: "counterpoint: brunch potatoes are worth the wait", ageHours: 37 },
  { hive: 11, post: 1, user: 12, content: "I thought I was the only one with a laundry chair. apparently it's a universal feature", ageHours: 61 },
  { hive: 11, post: 2, user: 19, content: "same. did a five-minute walk and it fixed absolutely nothing, but I did feel better", ageHours: 27 },
  { hive: 12, post: 0, user: 8, content: "a plunger. even if you never need it, you'll be glad it's there when you do.", ageHours: 87 },
  { hive: 12, post: 1, user: 19, content: "warm water and a little oil worked for me, then dish soap", ageHours: 56 },
  { hive: 12, post: 1, user: 5, content: "hair dryer on low can help too, just don't overheat the glass", ageHours: 52 },
  { hive: 12, post: 4, user: 13, content: "walking around with no plan is my favorite way to see a place", ageHours: 10 },
  { hive: 13, post: 1, user: 11, content: "I love finds with a little history. check the pockets for treasure!", ageHours: 49 },
  { hive: 13, post: 2, user: 4, content: "a canvas tote I bought for a trip in 2019. it has been everywhere.", ageHours: 28 },
  { hive: 13, post: 3, user: 17, content: "clean sneakers make almost anything feel intentional, honestly", ageHours: 8 },
  { hive: 14, post: 0, user: 18, content: "printer. it only works if I approach it with humility and a restart.", ageHours: 79 },
  { hive: 14, post: 2, user: 6, content: "my old phone had a headphone jack and I still miss it every day", ageHours: 42 },
  { hive: 14, post: 4, user: 10, content: "I just want my lamp to be a lamp. let me press the button.", ageHours: 16 },
  { hive: 15, post: 0, user: 19, content: "the follow-up email was the hardest part for me. glad you got it booked!", ageHours: 57 },
  { hive: 15, post: 2, user: 3, content: "noodles are a reliable plan", ageHours: 19 },
  { hive: 15, post: 3, user: 0, content: "neighbor tomatoes taste better, it's science", ageHours: 7 },
  { hive: 16, post: 0, user: 7, content: "write it down! I forgot what I put in mine and haven't recreated it since", ageHours: 80 },
  { hive: 16, post: 1, user: 12, content: "fried rice is my default answer to half a vegetable situation", ageHours: 38 },
  { hive: 16, post: 2, user: 5, content: "a pinch is just a suggestion anyway", ageHours: 23 },
];

function timestampDaysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function findOrCreateUser(
  client: PoolClient,
  user: SeedUser,
): Promise<number> {
  const email = `${user.username}@hive-seed.invalid`;
  const existingByEmail = await client.query<{ id: number; username: string }>(
    "SELECT id, username FROM users WHERE email = $1",
    [email],
  );

  if (existingByEmail.rows[0]) {
    if (existingByEmail.rows[0].username !== user.username) {
      throw new Error(`Seed email ${email} is already used by another account.`);
    }
    return existingByEmail.rows[0].id;
  }

  const existingByUsername = await client.query<{ id: number }>(
    "SELECT id FROM users WHERE username = $1",
    [user.username],
  );
  if (existingByUsername.rows[0]) {
    throw new Error(
      `Username ${user.username} already exists; refusing to modify that account.`,
    );
  }

  const passwordHash = hashPassword(randomBytes(32).toString("hex"));
  const inserted = await client.query<{ id: number }>(
    `INSERT INTO users (username, email, password_hash, display_name, bio, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      user.username,
      email,
      passwordHash,
      user.displayName,
      user.bio,
      timestampDaysAgo(user.ageDays),
    ],
  );
  return inserted.rows[0].id;
}

async function seed(): Promise<void> {
  await initDatabase();
  const client = await pool.connect();
  const userIds: number[] = [];

  try {
    await client.query("BEGIN");
    for (const user of users) {
      userIds.push(await findOrCreateUser(client, user));
    }

    const hiveIds: number[] = [];
    for (let hiveIndex = 0; hiveIndex < hives.length; hiveIndex += 1) {
      const hive = hives[hiveIndex];
      const ownerId = userIds[hive.owner];
      const existingHive = await client.query<{ id: number; owner_user_id: number }>(
        "SELECT id, owner_user_id FROM hives WHERE name = $1",
        [hive.name],
      );

      if (
        existingHive.rows[0] &&
        existingHive.rows[0].owner_user_id !== ownerId
      ) {
        throw new Error(
          `Hive "${hive.name}" already exists and is not seed-owned; refusing to modify it.`,
        );
      }

      const hiveId =
        existingHive.rows[0]?.id ??
        (
          await client.query<{ id: number }>(
            `INSERT INTO hives (owner_user_id, name, description, tags, is_private, created_at)
             VALUES ($1, $2, $3, $4, false, $5)
             RETURNING id`,
            [
              ownerId,
              hive.name,
              hive.description,
              hive.tags,
              timestampDaysAgo(130 + hiveIndex * 9),
            ],
          )
        ).rows[0].id;
      hiveIds.push(hiveId);

      for (const memberIndex of hive.members) {
        await client.query(
          `INSERT INTO hive_memberships (user_id, hive_id, created_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, hive_id) DO NOTHING`,
          [userIds[memberIndex], hiveId, timestampDaysAgo(1 + ((memberIndex + hiveIndex) % 45))],
        );
      }

      for (let postIndex = 0; postIndex < hive.posts.length; postIndex += 1) {
        const content = hive.posts[postIndex];
        const authorIndex = (hiveIndex * 3 + postIndex * 7) % users.length;
        const postAgeDays = (hiveIndex * 5 + postIndex * 3) % 55;
        const previousContent = previousSeedPosts[hiveIndex][postIndex];
        if (previousContent !== content) {
          await client.query(
            `UPDATE posts
             SET title = $4, content = $5
             WHERE user_id = $1 AND hive_id = $2
               AND title = $3 AND content = $6`,
            [
              userIds[authorIndex],
              hiveId,
              previousContent,
              content,
              content,
              previousContent,
            ],
          );
        }
        const existingPost = await client.query<{ id: number }>(
          `SELECT id FROM posts
           WHERE user_id = $1 AND hive_id = $2 AND title = $3 AND content = $4
           LIMIT 1`,
          [userIds[authorIndex], hiveId, content, content],
        );
        const postId =
          existingPost.rows[0]?.id ??
          (
            await client.query<{ id: number }>(
              `INSERT INTO posts (user_id, hive_id, title, content, community, image_url, created_at)
               VALUES ($1, $2, $3, $4, $5, NULL, $6)
               RETURNING id`,
              [
                userIds[authorIndex],
                hiveId,
                content,
                content,
                hive.name,
                timestampDaysAgo(postAgeDays),
              ],
            )
          ).rows[0].id;

        const voteCount = (hiveIndex * 2 + postIndex * 3) % 12;
        for (let voteIndex = 0; voteIndex < voteCount; voteIndex += 1) {
          const voterIndex = (authorIndex + voteIndex + 1) % users.length;
          const vote = (voteIndex + hiveIndex + postIndex) % 7 === 0 ? -1 : 1;
          await client.query(
            `INSERT INTO post_votes (user_id, post_id, vote, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $4)
             ON CONFLICT (user_id, post_id) DO NOTHING`,
            [
              userIds[voterIndex],
              postId,
              vote,
              timestampDaysAgo(Math.max(0, postAgeDays - 1)),
            ],
          );
        }
      }
    }

    const postIds = new Map<string, number>();
    for (let hiveIndex = 0; hiveIndex < hives.length; hiveIndex += 1) {
      const hive = hives[hiveIndex];
      for (let postIndex = 0; postIndex < hive.posts.length; postIndex += 1) {
        const authorIndex = (hiveIndex * 3 + postIndex * 7) % users.length;
        const result = await client.query<{ id: number }>(
          `SELECT id FROM posts
           WHERE hive_id = $1 AND user_id = $2 AND title = $3 AND content = $4
           ORDER BY id
           LIMIT 1`,
          [
            hiveIds[hiveIndex],
            userIds[authorIndex],
            hive.posts[postIndex],
            hive.posts[postIndex],
          ],
        );
        postIds.set(`${hiveIndex}:${postIndex}`, result.rows[0].id);
      }
    }

    const commentIds = new Map<number, number>();
    for (let index = 0; index < comments.length; index += 1) {
      const comment = comments[index];
      const postId = postIds.get(`${comment.hive}:${comment.post}`);
      if (postId === undefined) {
        throw new Error(`Seed post missing for comment ${index}.`);
      }
      const parentCommentId =
        comment.parent === undefined ? null : commentIds.get(comment.parent);
      if (comment.parent !== undefined && parentCommentId === undefined) {
        throw new Error(`Seed parent comment ${comment.parent} is missing.`);
      }

      const existingComment = await client.query<{ id: number }>(
        `SELECT id FROM comments
         WHERE post_id = $1 AND user_id = $2 AND content = $3
           AND parent_comment_id IS NOT DISTINCT FROM $4
         LIMIT 1`,
        [postId, userIds[comment.user], comment.content, parentCommentId],
      );
      const commentId =
        existingComment.rows[0]?.id ??
        (
          await client.query<{ id: number }>(
            `INSERT INTO comments (post_id, user_id, parent_comment_id, content, created_at)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
              postId,
              userIds[comment.user],
              parentCommentId,
              comment.content,
              timestampDaysAgo(comment.ageHours / 24),
            ],
          )
        ).rows[0].id;
      commentIds.set(index, commentId);

      if (index % 4 !== 0) {
        const voterId = userIds[(comment.user + 2) % users.length];
        const vote = index % 9 === 0 ? -1 : 1;
        await client.query(
          `INSERT INTO comment_votes (user_id, comment_id, vote, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $4)
           ON CONFLICT (user_id, comment_id) DO NOTHING`,
          [voterId, commentId, vote, timestampDaysAgo(comment.ageHours / 24)],
        );
      }
    }

    for (let followerIndex = 0; followerIndex < users.length; followerIndex += 1) {
      if (followerIndex % 3 === 0) {
        continue;
      }
      const followedIndex = (followerIndex * 7 + 3) % users.length;
      if (followerIndex === followedIndex) {
        continue;
      }
      await client.query(
        `INSERT INTO follows (follower_id, followed_id, created_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (follower_id, followed_id) DO NOTHING`,
        [
          userIds[followerIndex],
          userIds[followedIndex],
          timestampDaysAgo((followerIndex * 3) % 60),
        ],
      );
    }

    await client.query("COMMIT");
    console.log(
      `Seed complete: ${users.length} profiles, ${hives.length} Hives, ${hives.reduce((count, hive) => count + hive.posts.length, 0)} posts, and ${comments.length} comments.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});

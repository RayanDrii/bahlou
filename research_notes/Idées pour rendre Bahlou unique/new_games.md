# New original games for Bahlou: proven genres and mechanics

Scope notes for the report writer:
- Only genres and mechanics are borrowed. All concept names and themes below are original proposals.
- Build ratings are my own estimates for one developer already working in Bahlou's vanilla JS, Node and WebSocket stack: S = 1 to 5 days, M = 1 to 2 weeks, L = 3 weeks or more. No source supports them.
- Everything assumes Bahlou's virtual currency only. I did not check how the currency works.
- Pages actually opened and read: Rogueliker, Nintendo Life, Built In, PC Gamer via Yahoo, Game Developer, Mechanics of Magic (Gartic Phone), The Spike (Crash), KitGuru, The Spinoff, The Connexion, and the two Wikipedia articles. All other citations come from search-result summaries, where matching a claim to its exact URL is less certain, particularly the Stake rankings, the Codenames reviews, the Clash of Code pages and the Cémantix description. Check those before quoting them.
- Source quality was uneven. The casino-originals and case-battle topics are dominated by affiliate and SEO pages, flagged where used. Several sources predate 2022 and are marked with their year.

## Why did Balatro succeed, and how could roguelike deckbuilding on a familiar card game apply to original rules?

### Takeaway
Balatro used a familiar card vocabulary purely as onboarding, then built a run-based score-escalation game on top. The transferable recipe is: a base game everyone already knows, a rising score target, and small passive modifiers that combine. A community mod has already shown that the format works as a friends' versus game, by turning some score targets into PvP comparisons.

### Cited Findings
- Over 5 million copies sold as of January 2025, after a February 2024 release, with a Game of the Year nomination at The Game Awards 2024 — [KitGuru](https://www.kitguru.net/tech-news/mustafa-mahmoud/balatro-hits-new-sales-milestone-of-over-5-million-copies/)
- The poker theme was mainly an onboarding tool. The creator says the game has almost no mechanical resemblance to poker beyond hand rankings, and calls it an "indie take on solitaire with a poker coat of paint" — [Rogueliker interview](https://rogueliker.com/balatro-interview/)
- Playing cards were chosen because people find them tactile and familiar, which suits strategy that would otherwise be dense with information — [Rogueliker interview](https://rogueliker.com/balatro-interview/)
- Core loop: score chips to beat a required score that keeps rising, with interlocking mechanics that increase scoring over a run — [Rogueliker interview](https://rogueliker.com/balatro-interview/)
- Early builds had only a shop for upgrading playing cards. Jokers came later as passive items, and many were reworked or scrapped — [Rogueliker interview](https://rogueliker.com/balatro-interview/)
- Balance was tuned by feel in a release, observe, patch, reassess cycle, and most fixes were simple numeric changes to cost, rarity or bonuses — [Rogueliker interview](https://rogueliker.com/balatro-interview/)
- The creator notes that players increasingly treat risk reduction as the core metastrategy, and that the game's randomness may be excessive — [Rogueliker interview](https://rogueliker.com/balatro-interview/)
- Named inspirations are Big Two, a Cantonese shedding card game played with friends, and Luck Be a Landlord for single-player scoring — [Rogueliker interview](https://rogueliker.com/balatro-interview/)
- The creator believes that playing Slay the Spire earlier would have shaped the design, and credits avoiding it as part of the game's success — [Rogueliker interview](https://rogueliker.com/balatro-interview/); [secondary summary of the same claim](https://gcrs.pages.dev/posts/balatros-creator-has-barely-played-other-deckbuilders-and-thinks-thats-partly-why-it-succeeded)
- A friend playing an early build for 20 to 40 hours was the signal that it was special — [PC Gamer](https://pcgamer.com/games/roguelike/localthunk-had-made-hobby-games-in-the-past-but-realized-balatro-was-something-special-when-a-friend-revealed-he-had-played-it-for-20-30-or-40-hours)
- An unofficial mod adds versus play. In its most popular mode, small and big blinds are played normally and each boss blind becomes a PvP blind, where failing to beat the opponent's score costs a life. A Battle Royale mode supports up to eight players with one life — [search summary of Insider Gaming and PCGamesN coverage](https://insider-gaming.com/how-to-play-balatro-in-multiplayer/); [mod repository](https://github.com/Balatro-Multiplayer/BalatroMultiplayer)
- The mod has an organized competitive scene, with a "Major League Balatro" reaching at least Season 3 finals — [Set Side B](https://setsideb.com/tag/balatromultiplayer/)

### Inferences
- The familiar base game should be one French students already know. Balatro's seed was a shedding game, and Président is the French-student equivalent. Belote gives a trick-taking alternative that is mechanically far from Balatro's poker hands, which also protects originality.
- Multiplayer does not need live interaction during the build phase. Both players build separately and only compare scores at checkpoints, so one WebSocket message per checkpoint is enough.
- A daily shared seed would add a Wordle-style comparison at almost no cost, because the run is already deterministic given a seed.
- Content is the main cost, not code. A first version needs about 30 to 50 passive modifiers, and the interview suggests expecting many reworks.
- The creator's concern about excessive randomness suggests giving players reroll or skip tools, since a Bahlou audience already gets pure randomness from its existing games.

### Gaps
- The exact chips times mult formula is widely described, but none of the pages I could retrieve explained it. GamesRadar's analysis page came back truncated.
- I found no retention or session-length data for Balatro and no usage numbers for the multiplayer mod.

## What makes party games work with friends in voice calls, and which are short and easy to build?

### Takeaway
The strongest formats need almost no rules, restrict input to simple types, keep everyone busy simultaneously, and end on a shared reveal that the voice call reacts to. Telephone chains, fake-answer bluffing and one-word clue games are the cheapest to build. Hidden-role games stripped of movement are next.

### Cited Findings
- Jackbox judges ideas by how quickly they produce laughs. CEO Mike Bilder on Quiplash: "Time to laughter is like zero" (November 2024) — [Nintendo Life](https://www.nintendolife.com/features/time-to-laughter-is-like-zero-jackbox-games-ceo-on-quiplash-t-shirts-and-10-years-of-party-packs)
- Jackbox moved to phone browsers instead of a required app to remove friction from store downloads and network setup — [Nintendo Life](https://www.nintendolife.com/features/time-to-laughter-is-like-zero-jackbox-games-ceo-on-quiplash-t-shirts-and-10-years-of-party-packs)
- Jackbox restricts inputs to three types: "pick an answer, draw a picture, or enter a word or phrase" (2020). Players who learn a few games can pick up the rest because the interactions are shared — [Built In](https://builtin.com/articles/jackbox-games-design-party-pack)
- Its pacing rules are to limit choices, give one task at a time, and always make the next step clear (2020) — [Built In](https://builtin.com/articles/jackbox-games-design-party-pack)
- Quiplash structure: each player gets two prompts, players sharing a prompt face off, the others vote, and the final round gives everyone the same prompt (2020) — [Built In](https://builtin.com/articles/jackbox-games-design-party-pack)
- Jackbox packs are curated to avoid several games of the same type, such as multiple trivia titles — [Nintendo Life](https://www.nintendolife.com/features/time-to-laughter-is-like-zero-jackbox-games-ceo-on-quiplash-t-shirts-and-10-years-of-party-packs)
- Gartic Phone analysis: player-written prompts make content personal, alternating draw and guess steps create drift, time limits make imperfect art acceptable, and everyone sees every chain. Each step reshapes the challenge, so no one player's skill dominates — [Mechanics of Magic critical play](https://mechanicsofmagic.com/?p=26361)
- Confusion is treated as the feature rather than a failure, and the reveal comparing the original prompt with the result is where the group reacts together — [Mechanics of Magic critical play](https://mechanicsofmagic.com/?p=26361)
- Its Discord integration makes it easy to start inside an existing call — [Mechanics of Magic critical play](https://mechanicsofmagic.com/?p=26361)
- The original Among Us was built by three people, and the team's Flash and 2D background pushed it toward simple design — [GGRecon interview](https://www.ggrecon.com/articles/in-depth-with-innersloth-the-developers-behind-among-us)
- A student critical play argues its appeal comes from reducing social deduction to its core, so bluffing and psychology carry the game — [Mechanics of Magic, 2024](https://mechanicsofmagic.com/2024/04/06/among-us-critical-play-social-deduction-amy-zhou/)
- Another notes that reliance on communication produces uneven experiences when talk breaks down — [Mechanics of Magic, 2024](https://mechanicsofmagic.com/2024/04/06/among-us-critical-play-of-social-deduction/)
- Codenames restricts the clue-giver to a single word and a number, which one reviewer calls almost perfectly elegant — [Meeple Like Us](https://www.meeplelikeus.co.uk/codenames-2015/)
- Clues reveal something about how players' brains work, which is the social payoff. Reviewers also flag analysis paralysis as built into the design — [Codenames reviews, via Inkl](https://inkl.com/news/codenames-review-the-ultimate-pick-up-and-play-party-game); [Miniature Market](https://miniaturemarket.com/reviewcorner/codenames-review)

### Inferences
- Party-format ranking by effort for Bahlou: telephone chain and fake-answer bluffing (S), one-word clue team game (S to M), mission-vote hidden role (S to M), real-time drawing guess (S to M, needs canvas stroke sync), movement-based hidden role (L, not worth it).
- Timers solve analysis paralysis cheaply and should be mandatory on any clue or discussion phase.
- Bahlou's real advantage over commercial party games is that it knows its players. Prompts generated from real app data, such as who lost most on Crash this week, cannot be copied by a generic game and should deliver instant laughter in a group that knows each other.
- Betting fits party games as a spectator layer. Players knocked out, or simply watching, can stake coins on who wins a vote, which connects these games to Bahlou's economy.
- Bahlou already has a call feature, judging by `call.js` in the project root. A party game launched from an active call would mirror the Discord effect. I did not read that file.

### Gaps
- I found no engineering write-up or postmortem for skribbl.io, and no session-length data for any party title.
- I found no primary designer interview on Among Us discussion timing or on Codenames.
- No source quantifies the minimum player count below which these games stop being fun.

## What are the best realtime or asynchronous multiplayer formats for 2 to 10 friends in a browser?

### Takeaway
For a group of 7 to 30, asynchronous formats and flexible short duels are safer than anything needing eight people online. Build-versus-ghost auto-battlers, health-bar duels and play-money prediction markets all fit, and a parimutuel market is especially cheap and well suited to a group that shares real-life events.

### Cited Findings
- Auto-battlers boomed around 2019 and mostly faded, with only Team Fight Tactics sustaining success from that wave. The genre evolved into forms such as Backpack Battles and Super Auto Pets (July 2024) — [PC Gamer via Yahoo](https://uk.news.yahoo.com/competitive-inventory-rearranging-cheese-eating-170214963.html)
- Async appeal: no waiting through others' battles, the result can be skipped to, players can take their time building, and simpler systems stay accessible. The trade-off is that fighting a build rather than a person removes some live tension — [PC Gamer via Yahoo](https://uk.news.yahoo.com/competitive-inventory-rearranging-cheese-eating-170214963.html)
- In Super Auto Pets, units form a single line and order determines buffs, summons and damage intake — [PC Gamer via Yahoo](https://uk.news.yahoo.com/competitive-inventory-rearranging-cheese-eating-170214963.html)
- Recent async auto-battlers use recorded builds of real players as opponents, including builds from runs that lost or are still in progress — [Fool King coverage](https://everythingedinburgh.com/games/news/fool-king-autobattler-steam-early-access/); [Turnbound Steam page](https://store.steampowered.com/app/3802470/Turnbound/)
- Turnbound offers playback tools so players can see how their choices played out — [Turnbound Steam page](https://store.steampowered.com/app/3802470/Turnbound/)
- A player questioned the fairness of a ghost army being AI-driven while their own was not — [itch.io comment](https://itch.io/post/13979906)
- Hearthstone's designers said eight-player groups offered a social experience 1v1 lacked, and that early elimination is acceptable because you simply re-queue (2019) — [Game Developer](https://www.gamedeveloper.com/design/why-the-i-hearthstone-i-devs-wanted-to-make-an-auto-battler)
- GeoGuessr Duels gave each player 6,000 health, with score gaps as damage, and a developer described later rounds escalating damage (2021). A fan wiki claims a rising damage multiplier since February 2026, which I could not confirm — [developer launch thread, mirror](https://lr.eu.psf.lt/r/geoguessr/comments/qwop2o/duels_live_now); [fan wiki](https://shapes.inc/fandom/geoguessr/game-modes)
- Manifold's FAQ lists fun wagers with friends about your interests or personal life as a typical use, and says traders compete for social prestige and a sense of progression — [Manifold FAQ](https://git.nunosempere.com/open.source/manifold/raw/branch/main/docs/docs/faq.md)
- Manifold uses play money because gambling laws restrict real-money prediction markets — [Manifold FAQ](https://git.nunosempere.com/open.source/manifold/raw/branch/main/docs/docs/faq.md)
- TIME's reporting suggests users are sufficiently motivated by the prestige of accruing play money — [TIME](https://redesign.time.com/?p=6694798)
- In a 2023 contest, one side recruited friends and then reportedly paid people to participate, showing how such markets can be manipulated — [Astral Codex Ten](https://www.astralcodexten.com/p/mantic-monday-52223)

### Inferences
- A score-gap health bar is a reusable wrapper. Any short minigame, from typing to mental math to regex, can plug into the same duel shell, so each new minigame stays cheap.
- With 7 to 30 members, online overlap may often be under five people. Every multiplayer game should work at two players or fill with bots and ghosts. This is my reasoning from group size, not measured Bahlou data.
- A ghost pool will be small at first, so seed it with bot builds. Showing the classmate's name on a ghost matters more than ghost strength, because the social hook is beating someone you know.
- Parimutuel pools suit a thin market better than an automated market maker. They are a few lines of code and need no liquidity provider.
- Market manipulation can be a feature in a friend group. Betting on your own lateness and then showing up late is funny at small scale, but a creator-resolution rule and a vote to contest a resolution are still needed.
- The memory index describes Bahlou's Travail tab as holding Epitech projects and GitHub data, and `work-calendar.json` exists. Markets that resolve automatically from those, such as who pushes first before a deadline, would be unique. Feasibility is unchecked.

### Gaps
- I found no design postmortem or GDC talk for The Bazaar or Super Auto Pets, despite searching.
- I found no data on engagement inside private prediction-market groups.
- I found no reliable retention comparison between sync and async formats.

## What casino-adjacent originals have emerged, and which multiplayer twists are most engaging?

### Takeaway
Crash is the clear proof that a shared, visible round makes a simple gamble social. Most other originals are solo. Bahlou already owns the most popular mechanics, so its opening is to convert them into player-versus-player formats where friends take each other's coins rather than the house's.

### Cited Findings
- Crash is the original most often named as the top title, with Limbo as the main challenger, though rankings conflict and mostly come from affiliate sites with no stated method — [PokerListings](https://www.pokerlistings.com/software/stake-originals); [Odds Portal](https://www.oddsportal.com/reviews/latest/ranking-every-stake-original-game-number-1-is-a-massive-success/); [The Spike, Limbo review](https://www.thespike.gg/reviews/stake-us/limbo)
- One reviewer's five most popular are Crash, Plinko, Mines, Limbo and Flip. Others list Dice and Plinko as most popular — [Deadspin](https://deadspin.com/sweepstakes-casinos/news/the-stake-originals-weve-loved-the-most-in-2025/); [win.gg](https://win.gg/top-10-stake-originals-games/) (attribution among the ranking pages is approximate; treat as opinion)
- Dragon Tower is described as a solid, well-known title with a 98% RTP, and Hi-Lo gets only passing mentions — [Dimers](https://www.dimers.com/sweepstakes-casinos/loot/top-5-best-stake-originals-games-to-play-in-2026)
- Crash rounds are shared live, start every 5 to 30 seconds, and let you "see what other people are playing with and when they bail out". A reviewer learned it in 2 to 3 rounds. Stated RTP is 99% — [The Spike, Crash review](https://www.thespike.gg/reviews/stake-us/crash)
- Newer additions in the same catalog include Pump (balloon) and Cases — [Republic World](https://www.republicworld.com/initiatives/reviewing-new-originals-by-stake-pump-baloon-and-cases-games-review)
- Case battles have players stake the same cases, with the most valuable loot taking the round, in 1v1 and small-group formats. Sources here are low-quality SEO content and should be treated as description only — [GamesCreed](https://www.gamescreed.com/blog/mastering-cs2-and-csgo-case-battles-to-win-big)

### Inferences
Multiplayer twists proposed for Bahlou's existing mechanics, ordered by value for effort:
- **Boîtes à Baston** (S, 2 to 3 days). Case battle on existing loot cases: 2 to 6 players open identical cases with synchronized reveals, and the highest total takes everything. Reverse and 2v2 variants are simple flags. This is probably the single best value because the content already exists.
- **Le Dernier Sorti** (S, 2 to 4 days). A Crash variant on one shared curve where the last player to cash out before the crash collects the antes of the earliest. It turns solo risk into a game of chicken, read through each other's visible exits.
- **Pari Cible** (S, 1 to 2 days). A simultaneous Limbo duel: each player secretly picks a target multiplier, one roll is made, and the highest target that survived wins. The bluffing happens through target choice.
- **Mines Patate Chaude** (S, 2 to 3 days). Shared grid with alternating picks. Each safe pick grows the pot, and whoever hits the mine pays. Passing costs a fee, which keeps tension rising.
- **Tirage du Soir** (S, 2 days). Communal keno with one draw at a fixed time each evening, creating an appointment everyone discusses, plus a group bonus when collective numbers cover a target.
- **Chaîne Haut-Bas** (S, 2 days). Table-wide Hi-Lo streak, taking turns to call. Pot grows with the streak, the player who breaks it pays, and any player may buy their way out of a turn.
- These all run on server-side randomness that Bahlou must already have. Publishing a seed hash before the round and the seed afterwards would let programmers audit the game, which is a small addition with a particular appeal for this audience.

### Gaps
- No source ranks originals by multiplayer engagement, and I found no first-party Stake data on game popularity.
- I found no credible analysis of case-battle engagement. The search returned almost entirely spam pages.
- Evidence that PvP twists beat solo games is my inference. It is not measured anywhere I found.

## What games suit programmers specifically?

### Takeaway
Formats that have lasted are short timed coding rounds and friends-only leaderboards. The key 2025 lesson is that public speed rankings are vulnerable to AI, so Bahlou should favour private groups, live rounds and custom mini-languages that also remove the need to run untrusted code.

### Cited Findings
- Clash of Code has three modes: fastest passes all tests first, shortest counts every character, and reverse hides the statement so players infer the task from input and output examples. The mode is randomly chosen unless specified — [community description](https://dev.to/thelegendski/codingame-clash-of-code-hmb); [forum thread](https://forum.codingame.com/t/clash-of-code-feedback/185208)
- Players complain that shortest mode favours certain languages. One forum user says Java is not fit for it, and another says Python and Ruby coders cannot be beaten — [CodinGame forum](https://forum.codingame.com/t/clash-of-code-shortest-improvement/2765)
- Reverse mode draws complaints about being hard to follow, and everyone at 0% ties regardless of time — [CodinGame forum](https://forum.codingame.com/t/clash-of-code-bugs-improvement/833?page=9)
- Advent of Code 2025 cut to 12 days and discontinued the global leaderboard, leaving private leaderboards only. Its creator called the leaderboard "an ever-growing problem" — [Wikipedia](https://en.wikipedia.org/wiki/Advent_of_Code)
- Wikipedia links this to earlier concerns about generative AI without stating AI was the 2025 reason. A smaller outlet does list AI solvers, burnout and DDoS attacks among the causes — [Wikipedia](https://en.wikipedia.org/wiki/Advent_of_Code); [ByteIota](https://byteiota.com/advent-of-code-2025-12-days-no-leaderboard-why/)
- Advent of Code grew from 81 sign-ups at launch in 2015 to 1,000,000 registered users announced in December 2022 — [Wikipedia](https://en.wikipedia.org/wiki/Advent_of_Code)
- Gandalf is a prompt-injection game where players extract a password from an LLM across escalating levels. A dedicated follow-up, Agent Breaker, launched in August 2025 — [Notebookcheck](https://www.notebookcheck.net/A-beginner-s-guide-to-AI-jailbreaks-Using-Gandalf-to-learn-safely.1180639.0.html); [Agent Breaker write-up](https://anorak001.github.io/posts/Lakera_Agent_Breaker)

### Inferences
Programmer concepts proposed for Bahlou:
- **Regex au Couteau** (S, 3 to 4 days). Two lists of strings, one to match and one to reject, with the shortest valid regex winning after a 3-minute timer. Language bias disappears, since everyone uses one regex dialect. Validate with a timeout to contain catastrophic backtracking.
- **Une Seule Ligne** (S, 3 days plus content). A short code snippet appears with one bug. Fastest correct click scores, and wrong clicks lock you out briefly. No code execution, and it plugs into the health-bar duel. Epitech's languages make good content, and the snippets can be generated and reviewed offline.
- **Boîte Noire** (M, 1 to 2 weeks). Reverse mode in a tiny stack language invented for Bahlou, interpreted by a pure JS interpreter on the server with a step cap. This avoids sandboxing arbitrary code and reduces both LLM advantage and language bias. To counter the 0% tie complaint, show partial test progress and rank by tests passed, then by time.
- **Le Gardien** (M, 1 week plus LLM API cost). A PvP take on prompt-injection games: each player writes a defensive system prompt protecting a secret, and others attack it with limited tries. Stakes go to whoever holds out longest. Requires an API key and a per-user budget.
- **Chasse au Flag** (S to M, recurring). Weekly CTF-style hunts inside the app using devtools, fake terminal, encoding and logic puzzles, on a private leaderboard. Must never touch real admin or user data.
- **Arène de Bots** (L, 3 weeks or more). Players upload JS bots for a weekly tournament. It has high appeal but needs real sandboxing, so it should come last, and only if the Boîte Noire interpreter cannot be reused as its bot language.
- **Décembre Bahlou** (S once content exists). A 12-day seasonal event on a private leaderboard. The Advent of Code change suggests that 12 days and a friends-only board are a sustainable shape.
- Anti-cheat should be social rather than technical. In a group this small, live rounds on a voice call and short timers do more than any detection, and detection would be disproportionate.

### Gaps
- I found no reliable usage or retention figures for Clash of Code.
- My one search on Bitburner and hacking-themed programming games returned nothing about Bitburner, so terminal-game evidence is thin.
- I found no source on sandboxing techniques specific to this use. The interpreter recommendation is my own engineering judgment.

## Which daily one-minute puzzle formats have created lasting shared habits, and what makes results shareable?

### Takeaway
The durable recipe is one identical puzzle per day, a short solve, and a spoiler-free result that shows how you did without showing the answer. The habit has proven lasting, with billions of plays a year, and France has its own proven local variants. Bahlou's private group can make the sharing automatic.

### Cited Findings
- The emoji grid began with New Zealand players typing coloured squares by hand on Twitter, and Josh Wardle then added a share function that generates it — [The Spinoff](https://thespinoff.co.nz/media/13-01-2022/those-coloured-boxes-on-twitter-are-new-zealands-fault)
- Wardle said the grid lets players show results "without ruining the game for others" and described the communal aspect it created — [The Spinoff](https://thespinoff.co.nz/media/13-01-2022/those-coloured-boxes-on-twitter-are-new-zealands-fault)
- NYT Games puzzles were played 11.1 billion times in 2024: Wordle 5.3 billion, Connections 3.3 billion completed games, Strands 1.3 billion, citing The Verge in June 2025 — [Wikipedia](https://en.wikipedia.org/wiki/The_New_York_Times_Games). An earlier search snippet instead attributed 5.3 billion to the three games combined, and I followed the per-game table in the article.
- NYT Games reported over 10 million daily players in 2024, citing Adweek — [Wikipedia](https://en.wikipedia.org/wiki/The_New_York_Times_Games)
- Connections was added to this habit only in mid-2023 and reached 3.3 billion completed games in 2024. Wikipedia itself gives both June and July 2023 as its start — [Wikipedia](https://en.wikipedia.org/wiki/The_New_York_Times_Games)
- Sutom, a French adaptation built by a computer engineer, launched in January 2022. It reported about 300,000 daily players by June 2022, spreading via Twitter retweets in what its creator called a "snowball effect" — [The Connexion](https://connexionfrance.com/magazine/thousands-play-wordle-like-word-game-inspired-by-old-french-tv-show/116441)
- Cémantix uses semantic proximity rather than letter clues, with one secret word a day chosen at midnight French time — [Dexerto France](https://www.dexerto.fr/jeux-video/indices-solution-cemantix-1553090/)
- The same word for all players each day is the common element of the French variants, as in Tusmo — [Alucare](https://www.alucare.fr/en/what-is-sutom-this-big-talk-about-twitter-game/)

### Inferences
Daily concepts proposed for Bahlou (each under one minute, one attempt a day):
- **Sortie du Jour** (S, 2 to 3 days). Short C or Python snippet, guess the output, with up to three tries that progressively reveal hints. Share as a coloured line per try. Directly Epitech-flavoured.
- **Qui Est-Ce de la Promo** (S, 2 days). Guess the classmate from real app stats, with each wrong guess revealing another clue. The content writes itself and cannot exist anywhere else.
- **Le Choix Minoritaire** (S, 1 to 2 days). Everyone secretly picks one of five chests by 20:00, and only the least-chosen chest pays. It takes ten seconds, invites alliances and betrayal, and gives a daily reveal.
- **Main du Jour** (S once the roguelike exists). Same seed for all, comparing score with friends.
- **Mot Proche** (M, 1 week). Daily French semantic word hunt in the Cémantix style. Rankings can be precomputed from free French embeddings, so the runtime is just a lookup.
- Bahlou should post each result to a shared feed automatically, in a spoiler-free format, and show a group streak. Inside a private app there is no friction from copying and pasting, and the small group makes every result visible.
- Group streaks and a visible "not yet played today" list would create gentle social pressure. This is my suggestion and has no evidence behind it, so it should be tested.

### Gaps
- I found no reliable data on daily retention or streak effects, or a controlled comparison of share formats.
- Audience figures for Cémantix and Tusmo are unverified. The one figure I saw for Tusmo came from a sponsored article.
- Searches returned nothing usable on Bandle, Framed or Worldle, and only spam-quality material on the NYT Mini.

## Which original concepts should Bahlou prioritise?

### Takeaway
Start with cheap multiplayer conversions of existing games and one daily ritual, then a bluffing party game, and only then invest in the one big signature game: a multiplayer roguelike built on a French card game. The ordering below is my own judgment.

### Cited Findings
- Time to laughter was Jackbox's filter for ideas, which supports favouring fast, low-rule formats first — [Nintendo Life](https://www.nintendolife.com/features/time-to-laughter-is-like-zero-jackbox-games-ceo-on-quiplash-t-shirts-and-10-years-of-party-packs)
- Balatro's checkpoint versus format already exists and works as a mod, which supports building the signature game with PvP checkpoints from the start — [Insider Gaming](https://insider-gaming.com/how-to-play-balatro-in-multiplayer/)

### Inferences

Remaining concepts not already detailed above:

- **La Belote Maudite** (L, 3 to 4 weeks, the signature game). Roguelike on a 32-card French deck using trick-taking instead of poker hands. Each round is a contract with a rising target. Between rounds, buy passive "modules" that form an ordered pipeline, where each module transforms the score of the previous one, so ordering is a puzzle programmers will enjoy. Every third contract is a PvP checkpoint against friends or their ghosts, with lives, plus a daily seed.
- **Téléphone Compilé** (S, 3 to 5 days). Telephone chain alternating between a French sentence, pseudo-code or emoji, and a guess at what it means, with an optional drawing step. Text-only rounds need no canvas. Before each reveal, players bet on which link broke the chain.
- **Le Faux du Vrai** (S, 3 to 5 days). Fake-answer bluffing. A real fact appears with a blank, players write fake answers, and everyone picks what they believe is true, scoring for spotting truth and for fooling others. Prompts mix programming trivia and real Bahlou stats about group members.
- **Merge Interdit** (S to M, 1 week). Hidden-role, no movement, for 5 to 10 players on a call. Each round a team secretly submits "approve" or "sabotage" on a shared pull request, only the sabotage count is shown, then a 60-second discussion and vote. Saboteurs win the group's pot if enough merges fail.
- **Le Graphe** (S to M, about 1 week). Two-team one-word clue game on a word graph rather than a grid, where guessed words must form a connected path. Guessing order then matters, which differentiates it from grid-based play. Timer mandatory.
- **Le Ring** (S for the shell, about 2 days). Health-bar duel wrapper with rising damage, hosting Regex au Couteau, Une Seule Ligne, typing and mental math. Supports a tournament bracket and spectator bets.
- **La Bourse de la Promo** (S to M, 4 to 7 days). Parimutuel markets created by members about real life, with creator resolution, a contest vote and a weekly best-forecaster title.
- **Le Rack** (M, about 2 weeks). Async auto-battler where a line of five service units fights in order, deterministic on the server and replayed from an event log. Ghosts are classmates' real builds, in a weekly league.

Proposed order:

| Order | Concept | Build | Players | Session | Needs voice |
|---|---|---|---|---|---|
| 1 | Boîtes à Baston | S | 2 to 6 | 1 min | No |
| 2 | Le Choix Minoritaire | S | Any | 10 s a day | No |
| 3 | Sortie du Jour | S | Any | 1 min a day | No |
| 4 | Le Faux du Vrai | S | 3 to 10 | 10 min | Better with |
| 5 | Le Dernier Sorti | S | 2 to 30 | 30 s rounds | No |
| 6 | Téléphone Compilé | S | 4 to 12 | 10 min | Yes |
| 7 | Le Ring with Regex au Couteau | S | 2, or bracket | 5 min | No |
| 8 | La Bourse de la Promo | S to M | Any, async | Ongoing | No |
| 9 | Merge Interdit | S to M | 5 to 10 | 15 min | Yes |
| 10 | Boîte Noire | M | 2 to 10 | 5 min | No |
| 11 | Le Rack | M | Async | 5 min | No |
| 12 | La Belote Maudite | L | 1, or versus | 20 to 30 min | No |

### Gaps
- All build ratings are estimates, made without reading Bahlou's code in depth. Existing room, lobby and balance code could reduce them.
- I have no data on how many members are typically online together, which decides how soon the 5-player games are viable.
- Concept originality was judged from general knowledge of the genres. I did not search for existing games under each proposed name or combination.

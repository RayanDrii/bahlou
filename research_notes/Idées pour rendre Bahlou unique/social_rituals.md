# What makes friend-group social and chat apps feel alive: ideas for Bahlou

Evidence labels used below:
- **[read]**: I opened the page and read it.
- **[excerpt]**: I only saw a search-result summary of the page. Where several links follow one claim, the summary did not tie each detail to one specific link, so check before quoting.
- **[company]**: the number comes from the company itself and is not independently verified.
- **[older]**: dated before 2023.

Feature ideas are my own inferences and sit under "Inferences". None has been tested on Bahlou. Effort ratings assume one developer, vanilla JS and a small server, and are my estimates.

## Q1. What do Discord Activities, Quests, soundboard, Super Reactions, server boosts and profile effects do, and which demonstrably drove engagement?

### Takeaway
Quests is the only one of these with published engagement numbers, and those are Discord's own, mostly about advertisers and open to selection effects. I found no usage data for soundboard, Super Reactions, profile effects or Activities, so "demonstrably drove engagement" is not established for any of them.

### Cited Findings
**Quests (2024 launch, rewarded ad format)**
- Discord's one-year review, dated 31 March 2025, reports 70+ campaigns in the first year and "millions" of rewards earned. [read] [company] — [Discord blog](https://discord.com/blog/celebrating-one-year-of-quests)
- Users who accepted a targeted Quest were 3x more likely to accept another, and over half of advertising partners ran a second campaign. [read] [company] — [Discord blog](https://discord.com/blog/celebrating-one-year-of-quests)
- Users who play with at least one friend showed a 7x increase in gameplay (internal 2024 data). [read] [company] — [Discord blog](https://discord.com/blog/celebrating-one-year-of-quests)
- A miHoYo Play Quest saw an 80% increase in playtime in its week. A 2 min 38 s Video Quest for Dune: Prophecy had 85% completion among users who interacted with it. [read] [company] — [Discord blog](https://discord.com/blog/celebrating-one-year-of-quests)
- Quest types: Video Quests reward watching, Play Quests reward playing or streaming a game. [read] — [Discord blog](https://discord.com/blog/celebrating-one-year-of-quests)
- Orbs are a currency earned through Quests and spendable on eligible Shop items. [excerpt] — [GIGA](https://www.giga.de/tech/discord-orbs-erhalten-und-exklusive-belohnungen-mit-wenig-aufwand-freischalten--01KNRHNG60BJNET00DASZNZJE7)

**Soundboard and Super Reactions (April 2023)**
- Both launched together as Nitro perks. The soundboard plays short clips into voice channels. [excerpt] — [Discord blog](https://discord.com/blog/april-showers-bring-super-cool-nitro-powers); [Engadget](https://www.engadget.com/discord-nitro-will-let-you-annoy-your-friends-with-soundboard-noises-030020945.html?src=rss)
- Super Reactions began with weekly caps: 5 per week for Nitro, 2 for Basic/Classic, and 2 for everyone else to try. [excerpt] — [Discord blog](https://discord.com/blog/april-showers-bring-super-cool-nitro-powers); [MobileSyrup](https://mobilesyrup.com/2023/04/06/discord-nitro-introduces-a-soundboard-themes-and-super-reactions/)
- A later Discord post describes unlimited Super Reactions for Nitro members. I could not date the change. [excerpt] — [Discord blog](https://discord.com/blog/super-reactions-make-emoji-burst-to-life-discord-nitro)

**Profile effects**
- Sold in the Shop, which is open to all users, with Nitro member pricing on eligible items. [excerpt] — [Discord support](https://support.discord.com/hc/articles/17828465914263)

### Inferences
- The 3x and 7x Quest figures are correlations. People who accept one Quest or who already play with friends are more engaged to begin with, so these figures do not show that Quests caused anything.
- The pattern worth copying is the loop: do something with friends, earn currency, wear the result. Bahlou already has the currency (casino) and the wearables (frames, colours, titles), so only the "do something" step is missing.
- Discord's original 5-per-week cap suggests a useful design for a small group: scarce reactions carry more meaning. This is reasoning from the design, not measured.

**Ideas**
- **Group quests (effort: low to medium).** Weekly shared goals such as "50 replies between at least 5 people" or "a voice call with 4 or more people", paying casino chips to everyone. Make them collective, because in a group of 7 an individual ranking quickly identifies who is losing. Scale flag: none.
- **Super reaction (effort: low).** Long-press a reaction for a full-screen burst, limited to about 3 per person per week or paid in chips. Scale flag: none.
- **Group soundboard in calls (effort: low if each client plays the clip locally on a broadcast event; medium if mixed into the WebRTC audio track).** Members upload their own clips, which suits inside jokes better than stock sounds. Needs a per-user cooldown and a consent rule for clips of someone's voice. Scale flag: none.
- **Do not build a platform for Activities.** With no usage data found, a single home-made voice-call game (see Q3) is a better bet than a general framework.

### Gaps
- No usage or retention data found for soundboard, Super Reactions, profile effects or Activities.
- **Server boosts were not researched in this pass**, so I have no findings on them.
- One aggregator lists a 96% median Quest ad completion rate attributed to Sacra. I could not verify it, so it should not be used.
- I did not confirm whether the soundboard is still Nitro-limited in any way.

## Q2. What rituals made BeReal, Locket, Gas, NGL, Poparazzi and similar apps take off, why did some collapse, and what survives?

### Takeaway
Single-mechanic rituals spread very fast and then decayed within months (BeReal, Gas). Locket, which is built on a small circle, reports continued scale, but its figures are company-claimed and it kept adding new formats. NGL shows the specific harm of faked or paid-reveal anonymity.

### Cited Findings
**BeReal**
- Daily users reportedly fell 61%, from about 15M in October 2022 to under 6M in March 2023 (NYT citing Apptopia). [read] — [Platformer](https://platformer.news/how-bereal-missed-its-moment)
- The company disputed this, stating 20M daily users, and later 25M. The numbers conflict. [read] [company] — [Platformer](https://platformer.news/how-bereal-missed-its-moment); [excerpt] [LBC/Variety](https://www.lbcgroup.tv/news/varietytech/725359/bereal-pushes-back-at-report-that-its-losing-steam-says-it-now-has-25m/en)
- In nine months the team shipped only a private archive and a song-attachment feature, spending most of its time on stability and technical debt. [read] — [Platformer](https://platformer.news/how-bereal-missed-its-moment)
- Casey Newton's opinion: the "bonus BeReals" test undermined the ritual, and the appointment idea could have been extended to group chats or collaborative videos active only at set times. [read] — [Platformer](https://platformer.news/how-bereal-missed-its-moment)

**Gas**
- Users answered positive polls about classmates, and the person chosen received an anonymous compliment. iOS only, US and Canada. [read] — [TechCrunch](https://techcrunch.com/2023/10/19/discord-kills-gas-anonymous-compliments-app-bought-nine-months-ago/)
- 1M daily users within two months of its August 2022 launch and a November 2022 peak of 3.1M downloads, falling to 2,900 downloads in the month before the October 2023 report. [read] — [TechCrunch](https://techcrunch.com/2023/10/19/discord-kills-gas-anonymous-compliments-app-bought-nine-months-ago/)
- Discord bought it in January 2023 and closed it in November 2023. An internal memo reported by The Information said talent was the main reason for the purchase, so the shutdown is not a pure product-failure signal. [read] — [TechCrunch](https://techcrunch.com/2023/10/19/discord-kills-gas-anonymous-compliments-app-bought-nine-months-ago/)
- Its founder's earlier near-identical app, tbh, was bought by Facebook in 2017 and shut down in 2018 for low usage. [older] [read] — [TechCrunch](https://techcrunch.com/2023/10/19/discord-kills-gas-anonymous-compliments-app-bought-nine-months-ago/)

**NGL**
- In July 2024 the FTC and the Los Angeles DA settled with NGL for $5M. The allegations were that it sent computer-generated messages posing as real people, then sold a subscription promising to reveal senders, while paying users received only "hints". [excerpt] — [NBC News](https://www.nbcnews.com/tech/tech-news/ftc-bans-anonymous-messaging-app-ngl-for-minors-rcna160897); [ABC7](https://abc7news.com/post/popular-app-banned-hosting-young-teens-groundbreaking-settlement/15048436/); [Mondaq](https://www.mondaq.com:443/unitedstates/social-media/1491656/ftc-bans-anonymous-messaging-app-from-offering-app-to-kids-under-18-secures-$5-million-settlement)
- NGL disputed the allegations as factually incorrect while accepting the required changes. [excerpt] — [NBC News](https://www.nbcnews.com/tech/tech-news/ftc-bans-anonymous-messaging-app-ngl-for-minors-rcna160897)

**Poparazzi**
- Announced its shutdown in May 2023, with the company winding down and returning capital to investors. [excerpt] — [TechCrunch](https://techcrunch.com/2023/05/01/once-hot-photo-sharing-social-app-poparazzi-is-shutting-down)

**Locket**
- Claims 80M+ downloads and 9M+ daily active users as of August 2025. [excerpt] [company] — [TechCrunch](https://techcrunch.com/2025/08/06/photo-sharing-app-locket-is-banking-on-a-new-celebrity-focused-feature-to-fuel-its-growth)
- The App Store listing states a cap of 20 friends, framed around "your closest friends". [excerpt] — [App Store](https://apps.apple.com/us/app/1600525061)
- Its Rollcall feature drew over 1M shares in the first week, and the founder says well over 25% of active users post one weekly. About 80% of Rollcall's initial active users were classified as Gen Alpha. [excerpt] [company] — [TechCrunch](https://techcrunch.com/2025/11/03/lockets-social-app-is-picking-up-steam-with-gen-alpha)
- A 2025 celebrity-focused feature was launched explicitly to fuel growth, so Locket is not purely a closed-circle product. [excerpt] — [TechCrunch](https://techcrunch.com/2025/08/06/photo-sharing-app-locket-is-banking-on-a-new-celebrity-focused-feature-to-fuel-its-growth)

### Inferences
- **A ritual is a spike, not a foundation.** BeReal and Gas both suggest that one fixed mechanic burns out in months. Bahlou should treat rituals as seasonal and rotating, on top of a chat that is useful anyway.
- **Bahlou has an advantage these apps lacked.** They had to grow and hold strangers' attention. Bahlou's group already exists and needs no growth, so decay matters less and a ritual can be retired without harm.
- **Keep shipping small variations.** Platformer's criticism of BeReal applies directly to a solo developer: new prompt packs cost almost nothing, whereas infrastructure work is invisible to users.
- **Do not raise the frequency of a ritual to rescue it.** That is Newton's reading of bonus BeReals, and it is opinion rather than data.
- **Anonymity is weak in a group of 7 to 30.** People can often guess the author. Compliment-only prompts and aggregate results reduce the risk, and bot messages presented as members should never exist (NGL).
- **Locket's home-screen widget does not transfer** to a desktop/web app. The transferable part is the small circle and low-effort sharing.
- The BeReal versus Locket comparison is confounded by differing product types, dates and self-reported figures. It is suggestive only.

**Ideas**
- **"Le Créneau" (effort: low).** At a random moment once a week, not daily, a prompt opens for 2 to 5 minutes ("montre ton écran", "photo de ton bureau", "ta pire ligne de code"). Answers appear only once you have answered. Rotate prompt packs monthly. Scale flag: works from about 5 active people.
- **Compliment polls, Gas-style (effort: low; reuses polls).** "Qui sauverait le groupe la veille d'un rendu ?" Results show the winner and vote counts, not voters. Run it as a limited season rather than a permanent feature. Scale flag: none, though it gets repetitive quickly with 7 people, so it needs many questions.
- **Weekly photo dump (effort: low to medium).** A weekly thread where each person posts a few photos, loosely inspired by Rollcall's reported weekly habit. See Gaps: I did not confirm Rollcall's exact mechanics.

### Gaps
- No independent retention curves (D30, DAU/MAU) for BeReal, Locket or Gas. These sit behind paid analytics providers.
- BeReal's current state is unclear: sources I saw conflicted on 2025 trends and were not reliable enough to cite.
- The founders' own reasons for closing Poparazzi: their Medium post returned 403, so I could not read it. Its core mechanic was also not confirmed in this pass.
- NGL's current status and usage were not found. Final court approval of the settlement was not confirmed.
- Exactly how Locket's Rollcall works was not confirmed. The excerpt only mentions a Live Activity on the iPhone home screen.

## Q3. What is Spotify Wrapped-style recap design, and how do others copy it for shareable identity moments?

### Takeaway
Recaps work by balancing "I am like my friends" with "I am distinctive", delivered as a time-limited event. Discord's Checkpoint is the closest model for Bahlou because it ends in an archetype card plus a wearable cosmetic. The evidence for why recaps work is mostly conceptual.

### Cited Findings
- A Clemson researcher applies Brewer's optimal distinctiveness theory (1991): overlap with friends' lists creates connection and differences signal individuality. The article's support is conceptual and anecdotal, not controlled research. [read] — [Fortune/The Conversation](https://fortune.com/2025/12/03/why-spotify-wrapped-marketing-genius-individuality-uniqueness-belonging-psychology/)
- #SpotifyWrapped garnered 73.7B TikTok views in 2023. Wrapped has run annually since 2015. [read] — [Fortune/The Conversation](https://fortune.com/2025/12/03/why-spotify-wrapped-marketing-genius-individuality-uniqueness-belonging-psychology/)
- Apple Music, Reddit, Uber and Duolingo have released similar recaps, and the article says none has matched Wrapped's cultural impact. [read] — [Fortune/The Conversation](https://fortune.com/2025/12/03/why-spotify-wrapped-marketing-genius-individuality-uniqueness-belonging-psychology/)
- Wrapped Party (2025) turns listening data into a live competitive game with friends, with stats, compatibility comparisons and surprise categories changing per round. The article gives no player counts or scoring rules. [read] — [SoundGuys](https://www.soundguys.com/spotify-wrapped-2025-wrapped-party-149664/)
- A UX critique of the 2024 edition argued it had little variation in UI from screen to screen. [excerpt] — [UX Collective](https://uxdesign.cc/whats-happened-to-spotify-wrapped-cdfc32bf56a7)
- Discord Checkpoint, its first recap, rolled out from 4 December 2025, and the decoration could be worn until 15 January 2026. [excerpt] — [Discord blog](https://discord.com/blog/checkpoint-2025-discord-year-in-review)
- Coverage reports that Checkpoint ends by assigning one of ten cards based on activity style with a matching avatar decoration, and that it covers top servers and friends, message and voice minutes and favourite emojis, working from activity stats rather than message content. This was not traced to one page, so confirm it on Discord's own post. [excerpt] — [Discord blog](https://discord.com/blog/checkpoint-2025-discord-year-in-review); [GamesHub guide](https://www.gameshub.com/news/guides/how-to-unlock-your-2025-discord-checkpoint-recap-2848221/)
- Users without a recap can still claim the decoration. [excerpt] — [Discord support](https://support.discord.com/hc/en-us/articles/36415877391511)
- A cluster of third-party apps already sells this for friend groups from chat exports: Narya's Group Chat Wrapped labels roles such as the dominant member or the gossiper, WhatWrapped shows who leads and who lurks, and WRecap says analysis stays on the device. These are listings, so they show demand exists rather than effectiveness. [excerpt] — [Narya](https://apps.apple.com/us/app/wrapped-chat-recap/id6740577449); [WhatWrapped](https://apps.apple.com/cr/app/whatwrapped-chat-recap/id6743026444?l=en-GB); [WRecap](https://apps.apple.com/us/app/wrecap-wrapped-for-wa-chats/id6740490199)

### Inferences
- Bahlou's recap does not need to go viral outside the group. Its "share" is posting the card back into the chat, which removes the need for external social formatting.
- A recap for 7 to 30 people can do what Spotify cannot: every stat is about people the reader knows. Pair-level stats ("ton duo de la semaine", "la personne à qui tu réponds le plus") should be the highlight.
- Keep to metadata (counts, reply graph, reactions, call minutes), following Checkpoint's reported approach. It is cheaper and avoids exposing message content.
- Time-limiting the cosmetic gives the event urgency and makes it wearable status, as Checkpoint did.
- Avoid labels that shame: "le plus silencieux" lands very differently among 7 friends than in an anonymous app. The third-party apps' "lurker" framing should not be copied without care.
- Timing: Epitech semesters give a more natural rhythm than calendar years, and small groups need frequent payoffs. With today being November 2026, an end-of-year edition is feasible.

**Ideas**
- **"Le Bilan" (effort: medium; SQL aggregates plus a slide view and canvas export).** Per semester and year-end. About 6 to 8 slides ending in one of around 8 archetype cards ("Le Noctambule", "Le Pyromane", "Le Pilier du Vocal"), each with a matching frame worn for one month. Scale flag: needs several months of history, and stats get noisy below about 7 active members.
- **Live recap game in a voice call (effort: medium).** Wrapped Party's idea applied to Bahlou: "Qui a envoyé le plus de messages après 3h ?" Everyone votes, then the answer is revealed, with chips as the prize. Scale flag: none, needs 3 or more people in the call.
- **Group recap (effort: low once Le Bilan exists).** Group totals, the busiest day, the most-reacted message. It is the safest part because it singles nobody out.

### Gaps
- No independent data comparing engagement for copycat recaps with Wrapped.
- A figure of about 200M users engaging and 500M shares in 24 hours for Wrapped 2025 appeared in a search summary, but I could not trace it to one specific page, so it is not cited.
- No data on whether recaps increase retention afterwards, as opposed to attention during the event.
- No evidence found on the effectiveness of group-chat recap apps.

## Q4. What do Telegram and iMessage/WhatsApp do that makes chats feel playful?

### Takeaway
The recurring pattern is chat-level customisation shared by all members and reactions with an expressive tier. Telegram goes further with collectibles and creator tools, but its marketplace and mini-app economy depend on scale that Bahlou lacks.

### Cited Findings
**Telegram**
- Telegram said more than 500M of its 950M users interact with mini apps monthly. [excerpt] [company] — [Telegram blog, mirror](https://tx.me/blog/w3-browser-mini-app-store/be?setln=en)
- An August 2025 update added a Stickers mini app for creating stickers and emoji, managing packs and viewing usage statistics. [excerpt] — [Telegram blog, mirror](https://telegram.tadam.ai/blog/profile-music-gift-themes/be?setln=en); [FoneArena](https://www.fonearena.com/blog/?p=463033)
- Collectible gifts can be set as the wallpaper of a private chat, and the gift marketplace shows approximate resale prices. [excerpt] — [Telegram blog, mirror](https://telegram.tadam.ai/blog/profile-music-gift-themes/be?setln=en)
- Press and hold on a reaction sends a larger effect, and senders can see when a reaction has been seen. The search summary dated this to early 2025, but I believe that post is from 2022, so treat the date as unverified and possibly [older]. [excerpt] — [Telegram blog](https://telegram.org/blog/video-stickers-better-reactions/ko?setln=en)

**iMessage (iOS 26, announced June 2025)**
- Added polls, per-conversation backgrounds and typing indicators in group chats. [excerpt] — [MacRumors](https://www.macrumors.com/2025/06/09/apple-announces-ios-26-messages-app-features/)
- Coverage reports that backgrounds are visible to all participants and can be AI-generated, and that poll voters are visible on long-press. [excerpt] — [Tom's Guide](https://www.tomsguide.com/phones/iphones/ios-26-lets-you-change-the-background-in-messages-heres-how-to-do-it); [Beebom](https://gadgets.beebom.com/news/apple-messages-adds-custom-backgrounds-polls-in-ios-26)
- Some press framed these as catching up with WhatsApp and Telegram. [excerpt] — [Beebom](https://gadgets.beebom.com/news/apple-messages-adds-custom-backgrounds-polls-in-ios-26)

### Inferences
- A background everyone sees is a shared-space signal: changing it is a small event for the whole group. In a one-room app like Bahlou this is a bigger effect than in a many-chat app.
- Telegram's numbered collectibles rely on a large resale market. Only the sense of rarity carries over: "seulement 3 exemplaires existent dans le groupe" can mean a lot among friends. Keep it strictly fictional and non-transferable for money, in line with the casino's no-real-money rule.
- Creator tools matter more than a stock library for inside jokes. Member-made stickers are the Bahlou version of Telegram's sticker tool.

**Ideas**
- **Room theme of the week (effort: low).** Background and accent colour for everyone, picked by poll or bought collectively with chips. Scale flag: none.
- **Sticker maker (effort: low to medium).** Turn any image in chat into a group sticker, with crop and caption, and show usage counts like Telegram does, so the most-used sticker becomes a small status. Scale flag: none. Check storage limits.
- **Limited casino collectibles (effort: medium).** Numbered items won at the casino and displayed on profiles. No marketplace at this size. Scale flag: **a price-discovery marketplace needs scale, so skip it.**
- **Do not build a mini-app platform.** Scale flag: its value comes from third-party developers and audience, neither of which exists here.

### Gaps
- No engagement data found for stickers, animated reactions or chat backgrounds on any of these apps.
- **WhatsApp's own recent playful features were not found in this pass.** It only appears as a point of comparison.
- Monthly mini-app audience estimates conflicted sharply across sources (a 1.4B aggregate versus much lower later figures), and I could not verify them, so they are not cited as fact.

## Q5. Which features work specifically for small closed groups (inside jokes, shared history, group memory, awards, quotes, mood, presence)?

### Takeaway
Research supports the underlying idea that shared reality and shared memory are central to close relationships, but I found no study that tests features such as quote walls or group awards. This area is the most promising for Bahlou's uniqueness and also the least directly evidenced.

### Cited Findings
- The "Merged Minds" work by Rossignac-Milon and colleagues links shared reality to close relationships, with inside jokes and shared memories cited as examples. [older] [excerpt] — [PsyPost](https://www.psypost.org/2021/10/psychologists-identify-shared-reality-as-a-key-component-of-close-relationships-61969)
- Barnier, Klein and Harris (2018) review transactive memory, meaning memory distributed across members, as a feature of long-standing intimate groups, including friendship groups. [older] [excerpt] — [Western Sydney University](https://researchers.westernsydney.edu.au/en/publications/transactive-memory-in-small-intimate-groups-more-than-the-sum-of-/)
- A secondhand 2025 report says inside jokes can activate the brain's reward system and support belonging. It points to a Psychology Today article and I did not check the original. [excerpt] — [Gigazine](https://gigazine.net/gsc_news/en/20250614-inside-jokes/)
- A study title reports that put-down humour aimed at outgroup members increased perceived but not experienced cohesion. It concerns outgroups, so it only loosely applies to roasts within a group. [older] [excerpt] — [HUMOR journal](https://www.degruyterbrill.com/document/doi/10.1515/humor-2015-0020/pdf)
- Private chat groups are not automatically benign: a 2026 study examines hate memes and conformity in everyday private chat groups. I did not read its findings. [excerpt] — [Cyberpsychology](https://cyberpsychology.eu/article/download/42065/35905/87789)
- Group-role labelling is already a commercial product for chat groups. [excerpt] — [Narya](https://apps.apple.com/us/app/wrapped-chat-recap/id6740577449)

### Inferences
- If shared memory is what binds a group, Bahlou's message history is its most distinctive asset, and no outside app can reuse it. Features that resurface history are likely to matter more than new mechanics.
- Group-voted honours should carry more weight than algorithmic ones, because friends are the judges. This is my reasoning, with no direct evidence.
- Roast features need care. The humour research does not show that teasing builds real cohesion, and a closed group has nobody neutral to intervene. Prefer celebratory framing and allow opt-out.
- These features all work better at Bahlou's size than at scale, because everyone has the context. None of them needs network effects.

**Ideas, in suggested priority order**
1. **"Le Panthéon" (effort: low).** Any member can react with a specific emoji to nominate a message. Past a threshold (say 3 votes) it enters a permanent quote wall with author, date and context link.
2. **"Il y a un an" (effort: low).** A daily or weekly post resurfacing an old message, image or poll from the same date. Scale flag: needs history, so at first use "il y a un mois". Allow a way to exclude messages.
3. **Monthly Bahlou Awards (effort: low; reuses polls, titles and frames).** Members propose categories and vote. The winner wears a unique title or frame for one month, which keeps titles circulating.
4. **Group lexicon (effort: low).** A small dictionary of group slang and running jokes, written by members, with hover definitions in chat. Useful for newcomers and doubles as a time capsule. No direct evidence found.
5. **Group timeline (effort: medium).** A scrollable history of key moments: first message, new members, record days, big casino wins, project deadlines passed. Could link to the work tab.
6. **Work-tab-linked presence (effort: low).** Statuses such as "en rendu", "en piscine" or "dispo vocal", which could also drive a "qui est dispo pour un vocal ?" prompt. Weak evidence, see Gaps.

### Gaps
- **No study found that directly tests inside jokes, quote walls, group awards or memory resurfacing in friend-group chats.** The link from the psychology to these features is inference.
- **No usable evidence found on mood or presence features** in small groups.
- Fraley and Aron (2004) on shared humour and closeness came up, but I did not see its result.

## Q6. What is new in 2025-2026 in social apps for young adults?

### Takeaway
Large platforms are investing in private messaging and group chats, while new consumer apps focus on moving friends offline. Evidence for 2026 specifically is thin and much of it is promotional.

### Cited Findings
- Adam Mosseri said Instagram is "doubling down" on DMs in 2025, after about 20 new DM features in recent months. [excerpt] — [Tubefilter](https://www.tubefilter.com/2025/03/10/instagram-dm-direct-message-new-features-adam-mosseri/amp/)
- Threads added group chats, reported at up to 50 participants with mutual-follow requirements, and later invite links. [excerpt] — [Eastleigh Voice](https://eastleighvoice.co.ke/meta/227186/threads-introduces-group-chat-to-boost-communities-for-creators); [Ground News](https://ground.news/article/threads-launches-group-dms-expands-messaging-to-the-eu_de2f60)
- Instagram added a friends tab, reposts and a location map for friends. [excerpt] — [Good Morning America](https://www.goodmorningamerica.com/living/story/new-instagram-map-repost-share-location-friends-124442765)
- An industry commentary calls 2025 the year social media moved toward messaging. It is opinion-leaning, and its 52% Gen Z statistic concerns DMs with creators and brands rather than friends. [excerpt] — [Mobile Ecosystem Forum](https://mobileecosystemforum.com/2026/01/08/social-messaging-how-social-media-platforms-are-betting-big-on-direct-messaging-to-win-user-loyalty/)
- TechCrunch's April 2026 roundup covers apps moving friendship offline: 222 places strangers at nearby events based on a personality test, and joining a plan on Washed Up automatically opens a group chat. [excerpt] — [TechCrunch](https://techcrunch.com/2026/04/05/as-people-look-for-ways-to-make-new-friends-here-are-the-apps-promising-to-help/)
- Locket's Rollcall (late 2025) and Spotify's Wrapped Party (2025) are recent examples of recurring or live group formats. [excerpt] — [TechCrunch](https://techcrunch.com/2025/11/03/lockets-social-app-is-picking-up-steam-with-gen-alpha); [read] [SoundGuys](https://www.soundguys.com/spotify-wrapped-2025-wrapped-party-149664/)

### Inferences
- Bahlou is in line with the direction large platforms are moving, toward small and private spaces, but polls and backgrounds are now standard in iMessage. Those features no longer differentiate Bahlou. Its own history, cosmetics and shared jokes do.
- Washed Up's pattern of plans that create chats fits a group of students who already meet in person.

**Ideas**
- **"On sort ?" plans (effort: low to medium).** An event card with RSVP, a dedicated reply thread, and after the event a prompt to add photos that feed the group timeline (Q5). Scale flag: none.
- **Skip location maps.** Instagram's map is a platform-scale feature, and for this group it adds privacy cost for little gain. This is my judgement, not a finding.
- **Skip stranger-matching or discovery features.** Scale flag: they need a large pool of users and contradict Bahlou's invite-only model.

### Gaps
- Most 2026 "best apps" lists I found were vendor-written or self-ranking, including claims about friendship-app download share, so I excluded them.
- I found no reliable data on what young adults in France specifically use, and no data specific to French students.
- AI features in friend groups (such as AI participants in group chats) were not researched in this pass.

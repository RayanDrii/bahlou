# Gamified studying and peer collaboration for computing students: ideas for the Bahlou work tab

Reading conventions used throughout:
- **[Foundational, year]** marks work older than 2022, kept because later work still rests on it.
- **Preprint** means not confirmed as peer-reviewed in what I could retrieve.
- "Inferences" are my own reasoning, not findings. Build ratings are my estimates for one developer: **Easy** (2 days or less), **Medium** (about a week), **Hard** (two weeks or more).
- Current-code facts come from reading `/home/rayan/Projets/bahlou/work.js`.

## How do Forest, Habitica, Finch, Focusmate, Study Together and similar tools work, and what does the evidence say? What about body doubling and co-working presence?

### Takeaway
None of these products has independent controlled evidence that I could find; their numbers are company claims or self-report. The most usable signals are that live peer presence correlates with motivation (one cross-sectional study), that punishment mechanics misfire (Habitica), and that gamification effects dip after about four weeks and partly recover.

### Cited Findings

**Product mechanics**
- Forest: a focus timer where staying off the phone grows a tree and "leave early and it withers"; milestones unlock species; friends can co-plant in shared sessions; a Trees for the Future partnership plants real trees. The developer claims 60 million users and over 2 million real trees — [App Store listing](https://apps.apple.com/au/app/forest-focus-for-productivity/id866450515)
- Habitica: positive habits earn experience and gold, negative habits cost health, and leveling restores health — [Wikipedia](https://en.wikipedia.org/wiki/Habitica)
- Finch: you care for a digital pet by ticking off real self-care tasks, earning stones, outfits and pet adventures; one reviewer took a week off with no negative consequence; friends connect through codes — [Yoga Journal](https://www.yogajournal.com/lifestyle/finch-self-care-app/?scope=anon)
- Focusmate: one-to-one live video with a stranger for a timed session (usually 25, 50 or 75 minutes); both state a goal, then work quietly; lateness and no-shows reduce a timeliness score and can freeze the account. Sources conflict on whether other lengths exist — [Focusmate FAQ](https://www.focusmate.com/faq); [Focusmate guide](https://blog.focusmate.com/guide)
- Study Together: a Discord and web community that counts time studied together, with a monthly leaderboard and "Study Master"-type titles, plus music and webcam rooms — [Study Together](https://studytogether.com/discord). In April 2020 the top member logged 520.7 hours in a month — [Every](https://every.to/cybernaut/how-one-student-built-a-study-discord-community-with-150k-members-in-15-months). Membership figures conflict (200,000 on its own site versus over 1 million for one server listing) — [Study Together about](https://studytogether.com/about)

**Evidence on these products**
- Habitica has the only direct academic critique I found. Diefenbach and Müssig (2019, *International Journal of Human-Computer Studies*; [Foundational, 2019]) combined a single-user interview with a 45-user, two-week field study. All participants experienced counterproductive effects, such as being punished in especially productive periods because tasks could not be ticked off in time, and relabeling tasks as open-ended habits to avoid punishment. Perceived inappropriateness of the reward system tracked these effects and predicted motivation change — [LMU record](https://epub.ub.uni-muenchen.de/77668)
- Focusmate's numbers are self-reported by the company and do not agree: 143% productivity increase from 842 active members — [media kit](https://focusmate.com/?p=3865); 152% from 212 regular users with ADHD — [KTVZ/Stacker](https://ktvz.com/?p=1351417); 161% for neurodivergent members — [Focusmate FAQ](https://www.focusmate.com/faq)

**Body doubling and presence**
- An academic paper on body doubling for ADHD says effectiveness "remains elusive", with reports ranging from helpful to distracting. It cites a survey of 220 people (Eagle et al.) in which many said another person's presence, including remote or "Study With Me" video, helped them start tasks and keep momentum — [arXiv 2509.12153](https://arxiv.org/pdf/2509.12153)
- Business press likewise notes few studies test virtual body doubling on productivity — [Yahoo Finance](https://au.finance.yahoo.com/news/remote-workers-body-doubling-online-boost-productivity-060004647.html)
- Best quantitative signal: Hou et al. (2025, *Frontiers in Psychology*) surveyed 509 Chinese undergraduates with at least three months of Bilibili "Study With Me" use. Peer support predicted intrinsic motivation and self-efficacy and was associated with lower test anxiety; the peer-support effect was stronger for livestream than prerecorded users. It is cross-sectional and self-reported, and did not measure focus directly — [Simply Psychology summary](https://www.simplypsychology.org/study-with-me-videos-boosts-college-students-motivation-engagement-and-satisfaction.html)

**Gamification in general**
- Li, Ma and Shi (2023) pooled 41 studies, 49 samples and over 5,071 participants: g = 0.822 [0.567, 1.078], moderated by user type, discipline, design principles, duration and learning environment — [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10591086/). An earlier meta-analysis of 30 studies (N = 3,083) found a much smaller g = 0.464 — [Huang et al. record](https://pure.ecnu.edu.cn/en/publications/the-impact-of-gamification-in-educational-settings-on-student-lea/)
- Rodrigues et al. (2022): 14-week quasi-experiment with 756 Brazilian STEM students in CS1. The gamification effect started to fall after four weeks, the decline lasted two to six weeks, and it recovered between weeks six and ten (a U-shape) — [IJETHE](https://www.doi.org/10.1186/s41239-021-00314-6)
- Hanus and Fox (2015; [Foundational]): 71 students over 16 weeks in a course with badges, a leaderboard and coins. Gamified students reported lower motivation, satisfaction and empowerment over time, with the effect on final exam scores mediated by intrinsic motivation — [record](https://ersearch2.cvtisr.sk/vufind/SummonRecord/FETCH-LOGICAL-c408t-d82df39d2133f93d47d3d98f9c9aadee3039f9f89021367e6820fad79509cf9e3/Details?lng=en)
- High leaderboard ranks induced complacent behaviour, with people choosing easy ways to hold their position — [Internet Research](https://emerald.com/insight/content/doi/10.1108/INTR-12-2021-0897/full/pdf)

### Inferences
- Copy the structure of Focusmate (declared goal, fixed block, a specific human expecting you) rather than Study Together (hours leaderboard). A monthly total of 520 hours is the kind of number that would reward unhealthy behaviour in a programme already short on sleep.
- Finch's no-penalty design and Habitica's documented misfires point the same way: never punish missed days during a crunch, since the productive period is exactly when tracking lapses.
- The large meta-analytic effect sizes are a poor guide to Bahlou because they average diverse designs and likely reflect short studies. Plan for a dip around week four to six and refresh content then, rather than assuming the launch-week lift persists.
- Body doubling probably helps most with starting. Epitech's hardest moment is often the blank repository, so presence features should be aimed at the first hour of a project.

### Gaps
- I found no randomized or independent study of Forest, Focusmate, Finch or Study Together. A nine-month diary study of a virtual-pet self-care app was mentioned in a blog but could not be located.
- The claim that social presence helps simple tasks and hurts complex ones (social facilitation) surfaced only in low-authority sources. Whether co-working harms hard debugging is untested in what I found.
- No data on presence features specifically among students in intensive coding programmes.

## What does research say about extrinsic rewards undermining motivation, and how should currency for schoolwork be designed to avoid this?

### Takeaway
Rewards conditional on performance are the riskiest kind, and paying for measured outputs has the weakest record, while paying for concrete inputs did better. Bahlou currently pays for moulinette results and sends the coins to a casino, which is the combination the evidence warns about most.

### Cited Findings
- Deci, Koestner and Ryan (1999; [Foundational]), 128 studies: performance-contingent rewards and all tangible rewards significantly undermined free-choice intrinsic motivation — [record](https://pure.ewha.ac.kr/en/publications/a-meta-analytic-review-of-experiments-examining-the-effects-of-ex/). Unexpected rewards, and those not contingent on the task, appear to have little effect — [summary](https://tipsforteachers.substack.com/p/research-bite-2-extrinsic-rewards). The same summary says the undermining effect of tangible rewards was especially strong for school-aged children
- The debate is real: Cameron and Pierce (1994) found small effects in education, and Deci et al. (2001; [Foundational]) rebutted that analysis as seriously flawed — [Review of Educational Research paper](https://www.selfdeterminationtheory.org/SDT/documents/2001_DeciKoestnerRyan.pdf)
- Cerasoli, Nicklin and Ford (2014; [Foundational]), 40-year meta-analysis: intrinsic motivation still predicted performance when incentives were present, but mattered less when incentives were directly tied to performance. The authors conclude the two are not necessarily antagonistic — [paper](https://hillkm.com/EDUC_712/Cerasoli_Nicklin_Ford_2014.pdf). One summary says intrinsic motivation better predicts quality and incentives better predict quantity, across 154 sources and 212,468 respondents — [ScienceForWork](https://scienceforwork.com/blog/incentives-motivation-performance/)
- Fryer (2011; [Foundational]), randomized trials in over 250 urban schools (the journal version reports over 200): incentives for inputs, such as reading books, raised achievement, while incentives for outputs, such as test scores, did not. Fryer's explanation is that students do not know how to convert excitement about a reward into achievement — [NBER](https://www.nber.org/system/files/working_papers/w15898/w15898.pdf). These were school pupils, and results varied by city — [Education Next](https://www.educationnext.org/behind-the-headline-should-schools-bribe-kids-for-grades/)
- Individual game elements did not raise intrinsic motivation or satisfaction but usually raised performance (Mekler et al. 2015, cited secondhand; [Foundational]) — [Mac Namara and Murphy](https://ceur-ws.org/Vol-1857/gamifin17_p7.pdf)
- Loss framing, as in Fryer et al. (2022): teachers given up-front bonuses to repay raised maths scores by 0.124 SD, with effects in the first wave and none in the second. It studied teachers, not students, and the authors acknowledge mixed evidence on framing — [AEJ: Economic Policy](https://www.aeaweb.org/doi/10.1257/pol.20190287)
- Chance rewards: a review credits reward uncertainty with raising engagement in learning games, but these are secondary accounts, and a UK trial protocol has no published results that I could find — [review](https://elearn.neuropedagogy.upatras.gr/?p=1144); [ISRCTN protocol](https://www.isrctn.com/pdf/12740368). A Dutch adolescent study found random rewards predicted problematic gaming — [Utrecht](https://dspace.library.uu.nl/bitstream/handle/1874/425685/s5d5.pdf?sequence=1)
- Casino link: in the Australian LSAC cohort, one in five 16 to 17-year-olds played simulated gambling games, and those who did were more likely to progress to real-money gambling as young adults — [Victorian Responsible Gambling Foundation](https://responsiblegambling.vic.gov.au/about-us/news-and-media/gambling-with-their-future-teenage-gamers-and-pathways-to-gambling). A separate longitudinal news release reports that people engaging in games with gambling-like elements were more likely to then gamble with real money — [EurekAlert](https://www.eurekalert.org/news-releases/1106305). The evidence is associational, not proof of causation. Search abstracts also described Dussault et al. (2017) as predicting the transition to real money, and a Danish interview study (Kristiansen et al., 2018) as finding simulated gambling raised involvement for some young people and lowered it for others, but I could not open those papers, so treat both as unverified — [candidate review, blocked at retrieval](https://pmc.ncbi.nlm.nih.gov/articles/PMC9517771)
- Current Bahlou rule: `computeRewards` in `work.js` pays on a first valid delivery (100 coins if final, plus a multiple of the rate) and then 15 coins per point of moulinette rate gained, and `games.reward` credits these to the casino balance — [work.js](/home/rayan/Projets/bahlou/work.js)

### Inferences
- Bahlou's current formula is performance-contingent, tangible-feeling and output-based. Those are the three risk factors above. It also pays for raising a test score by any means, which rewards copying and AI-written code.
- Redesign rule: **pay for controllable inputs at flat, modest rates** (started early, hit a milestone you set, gave a useful review, attended a session, wrote your own tests), and treat result-based coins as **occasional surprises** rather than a posted rate.
- The currency should not imply that schoolwork funds gambling. Add a non-chance sink (cosmetics, profile themes, a shared promo goal such as an event vote) and make casino use optional for coins earned through work.
- A deadline-aware casino limit is a low-cost safeguard: offer a self-set block during the last 24 to 48 hours before a delivery. Epitech students are adults, so this suits opt-in better than enforcement.
- The undermining effect is described as especially strong for school-aged children, and Cerasoli finds incentives and intrinsic motivation can coexist. For adult students, the case against all rewards therefore looks weaker than the case against badly targeted ones, though direct adult data is scarce.

### Gaps
- I found no recent (2022 to 2026) meta-analysis of tangible rewards in higher education, so the core evidence here is old and largely not about adults or coding.
- No study tested virtual casino currency as a reward for coursework, or classroom chance rewards and gambling harm directly. Gambling findings are mostly about adolescents; Bahlou's users are mostly young adults.
- I did not research French gambling regulation (ANJ) or how it treats virtual-coin casinos. Worth a separate check, especially before coins gain any transferable value.

## What features suit programming students: commit streaks, GitHub contribution visualisations, code review games, peer teaching, shared debugging, pair programming presence, test-pass celebrations, CI status?

### Takeaway
The best-supported features are temporal structure and scheduled feedback, followed by game mechanics that reward review quality. Commit streaks and contribution counts have direct cautionary evidence, and pair programming is much less certain than its reputation.

### Cited Findings

**Time structure and CI-style feedback** (systematic review of 19 studies in post-secondary computing, [arXiv 2604.03248](https://arxiv.org/html/2604.03248v1), 2026 preprint)
- Interventions adding clear temporal structure "consistently promote earlier starts and more distributed work", which mediates performance gains.
- Interim milestones in multi-week projects encouraged earlier submission and improved correctness for mid-performing students. Supportive no-penalty deadlines beat penalty-based ones and appeared to reduce stress.
- Overnight autograder feedback raised submissions at least a day early from 14% to 42%, and cut late submissions from 30% to 5%.
- Students rated scheduled feedback as more helpful than immediate feedback (87.5% versus 71.7%); immediate feedback with penalties did not reliably reduce delayed starts.
- "Submission energy" (limited, recharging tries) cut late submissions from 14% to 7% and raised correctness from 90.2% to 93.9%, but 67% objected to the recharge time.
- Time-management badges moved starts about 1.3 days earlier but did not improve grades. Peer-activity heatmaps did not engage low performers.
- Uniform interventions tended to help higher performers more, and engagement gains did not always turn into better outcomes.

**Streaks and contribution graphs**
- Moldon, Strohmaier and Wachs (ICSE 2021; [Foundational]) used GitHub's unannounced removal of streak counters as a natural experiment: developers abandoned long streaks, weekend activity fell, single-contribution days became rarer, and streak synchronization across social networks dropped. The authors conclude gamification can shift behaviour in "unexpected and unwanted directions" — [arXiv](https://arxiv.org/abs/2006.02371)
- Streaks are easy to fake through backdated commits — [Zapier](https://zapier.com/blog/github-streak-habit/)
- Silverman and Barasch (2023, *Journal of Consumer Research*): intact streaks raise repetition compared with broken ones even with past behaviour held constant. The effect is stronger when people blame themselves and weaker when the streak can be repaired — [University of Delaware record](https://udspace.udel.edu/items/42ce576b-8e1f-429a-8541-e29e48dbcfbb). Barasch says people who lose a streak often drop off rather than restart — [CU Boulder](https://www.colorado.edu/business/news/2023/04/20/research-streaks-marketing-tech-barasch)
- Duolingo separated the streak from the daily goal and reported a 3.3% lift in day-14 retention and 19% more new learners on a streak. Its claim that 7-day-streak learners are 2.4 times more likely to return the next day is confounded by who reaches day 7 — [Duolingo blog](https://blog.duolingo.com/improving-the-streak)

**Code review games**
- Indriasari et al. (2023, *Computer Science Education*), randomized study: feedback quality differed significantly between gamified and control conditions. Confirmed from a bibliographic record, not the full text — [record](https://vufind-test.katalog.k.utb.cz/SummonRecord/FETCH-LOGICAL-c308t-cd34a52f0c3c5276ef87403eff372a1f6c74a9b60051feb8e861f36163449213)
- The same group's 2021 randomized study (n = 171) found no significant difference in review-accuracy ratings, so results are not uniform — [notes](https://singhgg.vercel.app/20-literature-notes/indriasari2021/). Their review found 13 studies positive and 5 neutral on enthusiasm and participation — [record](https://singhgg.vercel.app/20-literature-notes/indriasari2023/)
- Game elements (points, leaderboards, a "battery" meter) spread peer-review submissions across the period instead of at the deadline — [UniversityXP](https://www.universityxp.com/research/2025/11/22/impacting-the-submission-timing-of-student-work-using-gamification)
- "Level Up Peer Review" (2025 preprint, RCT, 34 master's students): gamification plus an AI writing assistant raised feedback count (23.0 versus 16.9, p = .05) and overall quality (5.6 versus 4.1 of 9, p = .03). It is small, had one coder, reviewed presentations rather than code, and its degrees of freedom imply fewer participants than stated — [arXiv](https://arxiv.org/html/2504.02962v1)

**Pair programming and team work**
- Umapathy and Ritzhaupt (2017; [Foundational]), 18 manuscripts, N = 3,308: pair programming is an effective tool in higher-education programming courses — [UNF record](https://digitalcommons.unf.edu/unf_faculty_publications/1812)
- Bowman et al. (2020; [Foundational]), cluster-randomized trial, 1,530 undergraduates across 96 lab sections: pair programming was unrelated to virtually all outcomes in the full sample, and poorer outcomes appeared among White students — [Iowa record](https://iro.uiowa.edu/esploro/outputs/journalArticle/Pair-Programming-in-Perspective-Effects-on/9984259409902771)
- Git-derived measures are an active way to study contribution: 237 students in 79 teams, with prior experience correlating with contribution — [SIGCSE 2024](https://sigcse2024.sigcse.org/details/sigcse-ts-2024-Papers-1/122/How-Pre-class-Programming-Experience-Influences-Students-Contribution-to-Their-Team-)
- A 2026 study of 201 students: 54.23% had experienced free-riding at least sometimes, and 81.69% said gamified peer assessment improved accountability. This is perception, not measured behaviour — [UNIMAS](https://scholarhub.unimas.my/handle/123456789/739)

**Peer teaching**
- Optional peer presentations increased question generation and spread work more evenly across a semester — [arXiv 2604.03248](https://arxiv.org/html/2604.03248v1)
- Preparing to teach improves test performance (Chase et al. 2009, cited secondhand; [Foundational]), and actually teaching beats only preparing — [Effectiviology](https://effectiviology.com/protege-effect-learn-by-teaching/)

### Inferences
- **CI status** is the strongest fit, and more so as a **scheduled nightly report** than a constant red or green badge. It is also the closest thing to Epitech's moulinette that a student can run early. A template GitHub Action could build, run the student's tests and report to Bahlou.
- **Never count commits** as effort. Moldon's evidence and spoofability both say that visible counts produce one-off trivial contributions. Track meaningful events: first build, new test passing, milestone reached.
- If streaks exist, make them **weekly, private, repairable and free of weekend pressure**. Repairability follows directly from Silverman and Barasch. Weekly scoring removes the weekend effect that Moldon found.
- **Peer review needs an integrity-safe form.** Reviewing a classmate's code on the same live project risks code sharing. Safer options are review after the deadline, review of tests and plans rather than source, or senior students reviewing juniors.
- **Reward review quality, not count.** Have the recipient rate whether a review contained an actionable point and a named strength or weakness, mirroring the Indriasari coding scheme.
- Treat pair programming as an **optional room**, not a promoted method, given the 1,530-student null result.
- **Test-pass celebrations** are cheap, and unexpected rewards are the safest kind. Fire them on first-time milestones only so they remain rare.
- Peer-activity views will not reach struggling students by themselves, per the review, so these need a direct personal prompt or a partner.

### Gaps
- No studies located on test-pass celebrations, on GitHub contribution graphs as a learning tool for students, or on shared debugging sessions.
- Could not retrieve a recent meta-analysis of remote or online pair programming.
- Epitech's own rules on sharing code and on peer help are not public in what I could find (search returned nothing on Epitech, the moulinette or the norme). Check these before building peer review.
- Whether an Epitech coding-style checker can be legally and technically embedded in a CI template needs local confirmation.

## What do GitHub Wrapped-type recaps, GitHub Achievements, LeetCode contests, Exercism mentoring and CodeCrafters do that works?

### Takeaway
GitHub Achievements have a direct null result, recaps have no outcome evidence and are worth only a cheap version, and competitive ratings bring anecdotal self-worth costs. The transferable patterns are CodeCrafters' fast test loop and Exercism's human feedback.

### Cited Findings
- GitHub Achievements: Calefato, Quaranta and Lanubile (*Information and Software Technology*, 2024) studied longitudinal data from over 6,000 developers, a survey and over 300 community discussions. Apart from Starstruck (follower count), introducing badges had no measurable effect. Badges correlated poorly with timeliness and willingness to collaborate, and a growing number of developers hid them. Developers say they "hardly reflect" ability — [arXiv](https://arxiv.org/abs/2303.14702)
- GitHub Unwrapped generates a personal video recap of a year's activity using Next.js, Remotion and AWS Lambda; the 2023 edition offered three themes and a downloadable MP4; its source can be forked as a template — [GitHub Unwrapped](https://gittrend.io/repo/remotion-dev/github-unwrapped); [Product Hunt](https://www.producthunt.com/p/remotion/github-unwrapped-2023)
- Recap appeal is explained through self-understanding and social comparison, but this is expert opinion in press, not measured outcomes — [Daily Maverick](https://www.dailymaverick.co.za/article/2024-12-06-spotify-wrapped-is-about-more-than-what-songs-you-listen-to-its-about-what-makes-you-you)
- CodeCrafters: learners rebuild real systems in their own editor, `git push` to run tests, and get results and hints in seconds; stages map to concrete skills — [CodeCrafters](https://hn.jakechampion.name/reader/https://app.codecrafters.io/tracks/rust). Praise found was anecdotal — [Product Hunt reviews](https://www.producthunt.com/products/book-build-your-own-redis-with-c-c/reviews)
- Exercism: free practice with volunteer mentors, aimed at language fluency rather than proficiency — [mentoring FAQ](https://github.com/exercism/website-copy/blob/master/pages/mentoring_faqs.md). Its founders called the submit-and-comment flow "very transactional" in 2019, and said repetitive feedback is boring while bespoke conversation keeps mentors engaged — [Exercism blog](https://exercism.org/blog/whats-next-for-exercism-aug-2019)
- Contest ratings: accounts link rating to self-worth — [Codeforces post](https://codeforces.com/blog/dezarg). Rankings can pull effort from learning toward contest performance — [AlgoCademy](https://algocademy.com/blog/?p=3193). These are forum and commercial sources, not research.

### Inferences
- Do not invest in a badge collection. If any badges exist, tie them to behaviours shown to shift (such as starting early) and do not present them as ability.
- A **project-end recap** suits Epitech's rhythm better than a yearly one. A static shareable card (first commit date, moulinette trajectory, people helped) gives most of the value with no video pipeline. Keep it private by default.
- The CodeCrafters lesson for Bahlou is a **tight loop on small stages** with a clear next step, and it reinforces the milestone and CI ideas.
- Exercism's lesson is to **keep helpers interested** by making requests specific and personal. A help request should state what was tried and what was expected.
- If competitions are added, run them as **team or promo events on optional side challenges**, unrated or with a soft rating, and never on graded projects.

### Gaps
- No independent outcome data for CodeCrafters, Exercism mentoring, recaps or LeetCode contests. I could not retrieve Exercism's current mentoring guidance pages (server timeout).
- No peer-reviewed research located on LeetCode contest stress specifically.

## How can AI act as a coach without doing the work? What are the risks of AI tutors, and what do 2024 to 2026 studies show?

### Takeaway
How students use AI matters more than whether they use it: conceptual use tends to preserve learning and delegation tends to erode it. Guardrails help, but a strict Socratic bot that refuses context-appropriate help can be disliked and bypassed, and students with a free unrestricted alternative will leave.

### Cited Findings

**Harms from unguarded use**
- Bastani et al. (*PNAS*, 2025; high-school maths, not programming): practice grades rose 48% with GPT Base and 127% with GPT Tutor, but when access was removed the GPT Base group scored 17% lower than students who never had access. The safeguarded tutor largely mitigated this — [paper draft](https://nmdprojects.net/teaching_resources/bastani_generative_ai_can_harm_learning.pdf); [PNAS record](https://econpapers.repec.org/RePEc:nas:journl:v:122:y:2025:p:e2422633122)
- Shen and Tamkin (2026; authors at Anthropic, an AI vendor): RCT of 52 professional developers learning an unfamiliar Python library. The AI group scored 50% on a no-AI quiz versus 67% for hand-coding (d = 0.738, p = 0.01), with the largest gap in debugging, and the speed gain was not significant. Conceptual-question patterns scored 65 to 86%, while delegation and iterative AI debugging scored 24 to 39%. Short-term, single library — [arXiv](https://arxiv.org/html/2601.20245v1); [Anthropic summary](https://www.anthropic.com/research/AI-assistance-coding-skills)
- Lehmann, Cornelius and Sting: students who complement learning with explanations increase understanding, while substitution buys speed at the cost of shallower understanding, and students prefer substitution — [arXiv](https://arxiv.org/html/2409.09047v2)
- Prather et al. (ICER 2024): a 21-student lab study of novices in C++. Students who already struggled saw difficulties compounded and new ones introduced, including an illusion of understanding; 11 of 21 showed no metacognitive difficulty. Small and observational — [arXiv](https://arxiv.org/abs/2405.17739)

**Guardrail design**
- Eastwood et al. (September 2026 preprint): RCT with 132 introductory programming students across four AI TAs (Socratic or direct, crossed with no context or full context). Socratic with full context was rated significantly lowest for task-completion support. Full-comprehension rates in a post-task explanation were 67% (direct, full context), 61% (direct, none), 50% (Socratic, none) and 48% (Socratic, full), and those comprehension differences were descriptive and not significant. External LLM use was highest in the Socratic-full condition, also not significant. One task, immediate measure — [arXiv](https://arxiv.org/pdf/2609.29995)
- A course of 1,034 students with an optional "See Solution" button: half never used it, and 14% used it on all three problems. All-three users scored about 66 on proctored exams versus about 73 for non-users, and the lowest quartile was about twice as likely as the top to use it every time. Correlational — [arXiv 2504.11146](https://arxiv.org/html/2504.11146v1)
- CS50's Duck: prompts tell it not to give outright answers, but prompts alone were insufficient, so code checks each response and can reject or retry it. A video-game-style "heart system" limits questions after long tails of heavy use, around 200 questions from some students. An interviewer cited code being produced up to a quarter of the time despite instructions. Malan reports a net positive and eased office-hour waits, with no outcome data given — [Harvard Gazette, 2026](https://news.harvard.edu/gazette/story/2026/09/taming-the-duck-for-starters/)
- CodeHelp uses a multi-stage pipeline with a code-removal agent; students valued availability and help with errors over a semester — [arXiv](https://arxiv.org/abs/2308.06921). CodeAid offers conceptual questions, code explanation, and help fixing or writing code without revealing solutions — [arXiv](https://arxiv.org/html/2401.11314v1)

**Positive evidence**
- Kestin et al. (*Scientific Reports*, 2025; physics): in a crossover RCT, students learned significantly more in less time with a carefully structured AI tutor than with in-class active learning, and felt more engaged. The authors caution this will not hold in all contexts — [Stanford SCALE](https://scale.stanford.edu/ai/repository/ai-tutoring-outperforms-class-active-learning-rct-introducing-novel-research-based). A January 2026 independent re-analysis reproduced the core result — [re-analysis](https://www.clayford.net/posts/ai_tutoring_nature/)

**Student context**
- Stack Overflow data: students using AI rose from 63.0% (2024) to 73.3% (2025), while moderate or high trust in accuracy fell from 49.1% to 37.4%, with the caveat that 2025 added a neutral option — [Stack Overflow](https://stackoverflow.blog/2026/10/01/a-look-back-before-we-look-forward-a-developer-survey-retrospective/). Across all respondents, not trusting AI's answers is the top reason for expecting to need human help (75.3%) — [Stack Overflow](https://stackoverflow.blog/2026/09/30/getting-ready-for-2026-results-a-look-back-on-developer-survey-findings/)

### Inferences
- Bahlou's AI should be **a conceptual explainer that is direct about concepts and restrained about project code**. Pure Socratic questioning looks like the wrong default given Eastwood. Direct conceptual answers fit both Eastwood and the Shen and Tamkin interaction patterns.
- Implement guardrails as **Duck-style output checks** rather than prompts alone: scan for code blocks over a size limit, then retry or strip them.
- Offer a **hint ladder**: concept, then where to look, then pseudo-code, then a worked example on a *different* problem. This is a more useful escape hatch than See Solution.
- Use **hearts** per project per day. Since each student uses a personal NVIDIA key, the limit is pedagogical rather than cost-based and should be presented that way.
- Add an **"Explique ton code" check** before a defence: the AI asks the student to explain a function they wrote, flagging weak spots privately. This targets the illusion of understanding and the debugging deficit.
- Accept the limits. Students can always open an unrestricted chatbot, so Bahlou's tool must be good enough that they do not want to, which means context awareness from the project's subject and the student's repo.
- The AI level-and-weakness analysis should describe **next actions**, not a label of ability, especially for low-self-efficacy students, who showed more difficulties in Prather et al.
- Do not reward AI usage or the number of AI questions with coins.

### Gaps
- No 2025 to 2026 long-term (semester or longer) RCT on AI assistants in programming with retention measures surfaced. Most programming evidence is short, small or correlational.
- Khanmigo sources were vendor-adjacent or consumer blogs, and I found no rigorous independent evaluation, so it is omitted as evidence.
- Epitech's current AI-use policy could not be found publicly.

## Which features help with deadline panic, burnout and procrastination among students in intensive programmes?

### Takeaway
Externally structured milestones have the strongest evidence, reminders work mainly for long multi-step projects, and self-set deadlines have disappointing effects. Evidence for burnout tools is weak and mostly outside computing, so those features should be cheap and modest in their claims.

### Cited Findings
- From the 19-study computing review: for multi-step, month-long projects reminders improved timeliness and sometimes grades, but for short weekly exercises they mainly increased participation. 55% of students in one study called alert emails a waste of time even though the emails improved timeliness. A structured ACT workshop reduced procrastination and anxiety versus control, while reflective writing and schedule sheets produced no meaningful change — [arXiv 2604.03248](https://arxiv.org/html/2604.03248v1)
- Self-imposed deadlines: students often choose binding deadlines, but their presence did not appear to raise completion — [Bisin and Hyndman, NBER](https://www.nber.org/papers/w19874). In another study, over 43% chose an early soft deadline, on average only 1.9 days before the official one, with no evidence of an effect on grades — [Applied Economics Letters manuscript](https://openaccess.city.ac.uk/32266/1/AEL_published.pdf)
- Ariely and Wertenbroch (2002; [Foundational]): evenly spaced external deadlines beat self-chosen ones on grades, per a secondary account — [summary](https://scheduleu.org/2017/04/07/the-power-of-setting-deadlines/)
- A systematic review of university procrastination interventions found face-to-face formats reported the strongest perceived gains, while hybrid and online formats did not report perceived change in procrastination — [University of La Laguna record](https://portalciencia.ull.es/documentos/66eb13161b335538e5a04c2c)
- Implementation intentions: the only direct result retrieved is very weak, a 2020 undergraduate self-experiment by two authors over two 2-week studies, which found a correlation with procrastination but no support for a causal effect — [Camosun journal](https://cc.arcabc.ca/_flysystem/repo-bin/2020-07/cc_309.pdf). I found no 2023 to 2024 meta-analysis on this, so it should not be read as evidence against the technique.
- Belonging: Walton et al. (*Science*, 2023), randomized with 26,911 students at 22 institutions. A brief online pre-college module increased full-time first-year completion, with larger effects where institutions offered real opportunities to belong — [record](https://digitalcommons.sacredheart.edu/psych_fac/166); [ScienceDaily](https://sciencedaily.com/releases/2023/05/230508114026.htm)
- Burnout evidence is thin. A brief online compassion programme for 117 students found no significant effect on self-compassion, stress or burnout — [Universidade Portucalense](https://repositorio.upt.pt/entities/publication/27561672-8cee-4903-a2f6-46f122af2d18). A 30-student MBSR trial reduced emotional burnout, in students selected for anxiety — [MJMS](https://mjms.mums.ac.ir/article_27178.html?lang=en). An Indonesian correlational study linked self-compassion and peer support to academic burnout (41.4% of variance) in vocational pupils — [Seurune](https://jurnal.usk.ac.id/seurune/article/view/44162)

### Inferences
- The existing plan generator should produce **assigned, evenly spaced checkpoints** by default rather than asking students to pick dates. Self-commitment evidence is weak, so a student's option to edit should not be the core mechanism.
- **Cut reminder volume on short projects** and concentrate reminders on multi-week ones. Do not take complaints alone as a signal to remove them, since students disliked reminders that worked.
- **"Mode survie"** at under 48 hours: triage by what scores most, a minimum deliverable, one buddy alerted, non-essential notifications muted. Direct evidence is lacking, so treat it as a design hypothesis.
- **Soft return after a miss**: no red counter or shame message, one small next step. This follows the Habitica and broken-streak findings about blame.
- **"Tout le monde galère"**: short testimonials from older students about early failures, shown at known low points. Walton supports the idea at scale, but its effect depended on real belonging opportunities, which is what partner pairing and rooms supply.
- Reflective journaling should be left out as a stand-alone feature, given the null result in the computing review.
- Burnout features should stay light (rest day suggestions, late-night notification silence) and point to real support. Bahlou should not claim to treat burnout.

### Gaps
- No computing-specific student burnout intervention study was found. The University of Erfurt learning-journal field experiment (over 2,000 students, mental contrasting plus soft commitment) was found, but not its outcomes — [Erfurt](https://projekte.uni-erfurt.de/svstud/wp-content/uploads/2025/03/WiHo_SvStud_TP1B_Learning_Journal.pdf).
- No data on Epitech or similar intensive schools (42, piscine-style formats) regarding burnout or deadline panic.
- Yeager et al.'s stress-mindset work was searched for but not retrieved.

## Which concrete features should Bahlou build, how hard is each, and what should it avoid?

### Takeaway
Start by correcting the reward rule and adding assigned milestones and a nightly CI report, which are cheap and best supported. Then add goal-based study rooms and a code-restrained AI coach. Avoid public hour counts, commit counts, daily streaks and per-point casino payouts.

### Cited Findings
Evidence for each row is cited in the sections above. Existing building blocks: GitHub connection, personal NVIDIA key, per-project plans, study-partner listing (`POST /api/work/mates`) and moulinette ledger are in [work.js](/home/rayan/Projets/bahlou/work.js). A `call.js` module also exists in the repository, which I did not review.

### Inferences

**Priority 1: high evidence, low cost**

| Feature | What it does | Evidence strength | Build |
|---|---|---|---|
| Effort-based rewards | Replace per-point payouts with flat coins for early start, milestones, reviews, sessions; results become occasional surprises | Moderate, older and non-coding | Easy |
| Assigned jalons | Plan generator creates evenly spaced checkpoints, verified from commits or moulinette imports, with no penalty on a miss | Strongest here (computing review) | Medium |
| Nightly CI report | Template GitHub Action builds and runs tests; Bahlou shows a scheduled morning summary | Good analogue (overnight autograder) | Medium |
| Targeted reminders | More on long projects, fewer on short ones | Good (computing review) | Easy |
| Decoupled coins | Non-casino sink, plus self-set casino block near deadlines | Precautionary | Easy |

**Priority 2: plausible, moderate cost**

| Feature | What it does | Evidence strength | Build |
|---|---|---|---|
| Salles de focus | Live rooms with a stated goal, a fixed 25 or 50-minute block and an end check-in; no hours ranking | Weak to moderate, correlational | Medium (Easy if presence only) |
| Binôme planifié | Focusmate-style booking with an existing partner, gently noting no-shows, aimed at project kickoff | Weak (company data) | Medium |
| Canard coach | Hint ladder, output filter removing project code, hearts, repo and subject context | Good on principle, mixed on style | Medium |
| Explique ton code | Private AI oral rehearsal before a defence | Indirect (targets debugging and illusion gaps) | Easy to Medium |
| Soutenance blanche | Book a peer for a mock defence; both earn flat coins | Moderate (peer presentations, learning by teaching) | Easy |
| Santé d'équipe | Private team view of contribution balance and open tasks, framed as a prompt to talk, no individual scores | Weak, perceptual | Medium |

**Priority 3: cheap extras or later bets**

| Feature | What it does | Evidence strength | Build |
|---|---|---|---|
| Bilan de projet | Static end-of-project card, private by default | None on outcomes | Easy |
| Semaines actives | Private weekly consistency count, repairable, weekends excluded | Moderate on design rules | Easy |
| First-green moments | Small surprise animation on first passing test or build | Theory only | Easy |
| Promo contre la deadline | Shared collective progress toward a promo goal, no individual ranking | Weak; will not reach low performers alone | Easy |
| SOS entraide | Structured help request (tried, expected, error); system pays the helper a flat rate after a thank-you | Analogy to Exercism; integrity risk | Medium |
| Revue post-rendu | Post-deadline code review with recipient-rated usefulness | Moderate on quality | Medium to Hard |
| Mode survie | Under-48-hour triage and notification reduction | None direct | Medium |
| Témoignages tek | Short senior stories at low points | Strong trial, different format | Easy (content is the work) |

**Avoid**
- Public leaderboards of hours or commits, and contribution counts as a proxy for effort.
- Daily streaks with visible loss, or a pet or avatar harmed by missed days.
- Coins per moulinette percentage, and chance-based payouts tied directly to schoolwork.
- Permanent AI "See Solution" access, coins for AI use, and purely Socratic refusals.
- A badge wall presented as a measure of skill.

**How to judge whether it works**
- Track behaviour, since perceptions and outcomes diverge in the literature: days between project opening and first commit, share of projects with a commit in the first third of the period, first moulinette score, delivery rate, sessions attended, retention at week 6 to 8 (past the expected novelty dip).
- With a small user base, compare before and after per project rather than attempting underpowered A/B tests, and watch whether low performers benefit as well.

### Gaps
- Bahlou's actual user count, usage logs and student opinions were not available, so demand for each feature is unknown.
- Difficulty ratings assume the current single-server Node and JSON-file architecture and were estimated from a limited read of `work.js`. Real-time rooms depend on what `call.js` already provides.

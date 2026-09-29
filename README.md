# Enriched Math 8

## 1. What this app is

Enriched Math 8 is a self learning web app for a BC Grade 8 enriched math student. It follows the 2026 BC Enriched Curriculum and prepares for the University of Waterloo Gauss Mathematics Contest.

Repository: https://github.com/ferrariboy/enriched-math8

The app has five areas:

- **Dashboard.** Six modules, points, level, accuracy, best Gauss score. Modules can be locked and unlocked.
- **Self Learning.** Short lessons with diagrams and worked examples for 29 topics, including cylinders and prisms. Students mark topics as mastered.
- **Practice Generator.** Unlimited fresh worksheets in three tiers: Tier 1 BC Core, Tier 2 WVSS Enriched, Tier 3 Gauss style. Each question gives instant feedback, a step by step solution and a scratchpad for typing or drawing. A calculator button stays available on the Practice tab.
- **Gauss Simulator.** A full 25 question contest with a 60 minute countdown. Part A has 10 easy questions at 5 points, Part B has 10 medium questions at 6 points, Part C has 5 hard non routine questions at 8 points. The total is 150 points. A question grid tracks answered and flagged questions. Scoring follows the real contest: a wrong answer earns 0 and an unanswered question earns 2 points, for up to 10 unanswered questions. A built in basic calculator (no memory, no programs) can be turned on or off before starting. A Quit contest button discards an attempt without saving it. There is no pause, because the real contest has none. The results screen shows a score breakdown by part and module, coaching tips and full solutions.
- **Student Progress.** Mastery bars, contest history, feedback history, backup and restore, reset.

The six modules are Advanced Number Sense, Proportional Reasoning and Percentages, Algebraic Foundations, Geometry and Measurement, Data and Probability, and Non Routine Logic.

Everything runs in the browser. There is no server, no account and no build step. Progress is saved in the browser with localStorage.

## 2. Deploy to GitHub Pages

The whole app is one file, `index.html`. GitHub Pages can serve it as it is.

1. Create the repository `enriched-math8` on GitHub, or open the existing one.
2. Put `index.html` and `README.md` in the repository root. Commit to the `main` branch.
3. Open the repository on GitHub. Go to **Settings**, then **Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Set **Branch** to `main` and the folder to `/ (root)`. Click **Save**.
6. Wait one to two minutes. The site is live at:

   https://ferrariboy.github.io/enriched-math8/

7. Every later commit to `main` updates the live site automatically.

Notes:

- The address is case sensitive and the repository must be public on a free account.
- Fonts load from Google Fonts. Without internet the app falls back to system fonts and still works.
- Progress belongs to one browser on one device. Use **Student Progress, Save backup** to move it to another device, then **Restore backup** there. The backup download works on the GitHub Pages site. Some preview windows block file downloads.
- Test locally by double clicking `index.html`. No server is needed.

## 3. Project structure

```
enriched-math8/
├── index.html            Complete app. Styles, all scripts and the view controller are inside.
├── README.md             This file.
└── js/                   Optional. Readable source copies of the scripts inside index.html.
    ├── mathEngine.js       Engine and Module 1. Question generators, lesson renderer, diagrams.
    ├── modules2and3.js     Modules 2 and 3.
    ├── modules4and5.js     Modules 4 and 5.
    └── gaussSimulator.js   Module 6 and the Gauss contest simulator.
```

Inside `index.html`, in order:

| Block | Purpose |
| --- | --- |
| `<style>` | App styles, light and dark themes, phone layout. |
| HTML shell | Sidebar navigation, five view sections, feedback panel, message toast. |
| MathEngine script | Seeded random generators, lessons, diagrams, answer checking. |
| Modules 2 to 5 scripts | Register their topics with the engine. |
| GaussSimulator script | Module 6 and the contest simulator. |
| App script | `AppState`, hash routing, views, practice worksheet, feedback panel. |

Page addresses use the hash, for example `#/learn/m1t0` opens Module 1, topic 0. The browser back button works.

## 4. Working on the code

- Progress key in localStorage: `enrichedMath8.v1`. A running contest is stored in `enrichedMath8.gaussSession.v1`, so a refresh does not lose it.
- To add a topic, register it with `MathEngine.registerModule` in one of the module scripts. It appears in Self Learning and Practice with no other change.
- To check every question generator, open the browser console and run `MathEngine.selfTest(20)`. To check the simulator, run `GaussSimulator.selfTest(10)`. Both should report zero failures.
- The Feedback button saves notes in the browser only (`feedback` inside the `enrichedMath8.v1` key). Nothing is sent anywhere and no email is produced. The Open GitHub issue button in the panel opens a prefilled issue at https://github.com/ferrariboy/enriched-math8/issues/new. That is the only way feedback reaches the repository owner, and it needs a GitHub account.

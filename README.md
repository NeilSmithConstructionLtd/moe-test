# CELPIP Flashcards — Moe's road to CLB 10 🍁

A browser flashcard app for the **CELPIP-General** test: 314 advanced words and phrases, each with its Farsi meaning and an example sentence.

**Live app:** https://neilsmithconstructionltd.github.io/moe-test/

## What it does

- **Skill tabs:** Reading, Writing, Speaking, Listening (or all skills).
- **Level picker:** 🌱 Strong (CLB 7–8), 🚀 Advanced (CLB 9), 👑 Expert (CLB 10+). Turn levels on or off.
- **Flashcards** with spaced repetition. Rate each card *Again / Hard / Got it* and it comes back after 1, 2, 4, 8 or 16 days.
- **Quizzes:**
  - 🎯 Meaning: pick the Farsi meaning.
  - 🧩 Fill the gap: complete a real sentence.
  - ⌨️ Type it: type the English word from its Farsi meaning.
- 🔊 Pronunciation, using the browser's built-in voice.
- **Swipe the cards:** right = *Got it*, left = *Again*, up = *Hard*. A mis-swipe can be undone.
- **Rewards:**
  - XP that flies into the header, levels every 500 XP.
  - Combo banners (🔥 On fire! ⚡ Unstoppable! 👑 Legendary!).
  - 3-star results, confetti and fireworks.
- **Celebrations:** daily goal, level-up, streak milestones and perfect quizzes.
- **16 badges** to unlock, shown on the Progress page.
- **A daily welcome splash** for Moe, a short first-run intro and a new motivation line every day.
- **Soft sound effects** (🔊/🔇 in the header).
- **Reduced motion:** if the phone is set to reduce motion, the big animations turn off.
- Searchable word list, starred words, upgrade map (everyday idea → advanced word).
- Progress page with export/import, so you can move progress between phone and laptop.

Progress is saved in your own browser (localStorage). Nothing is sent anywhere.

## Run it

Open `index.html` in any browser, or use the live link above. There is nothing to install.

Keyboard shortcuts:
- Flashcards: `Space` flips the card, `1` `2` `3` rate it, `S` plays the sound. On a phone, swipe the card instead.
- Quizzes: `1`–`4` answer, `Enter` goes to the next question.

## Edit the word list

The words live in `tools/data.txt`. Each line is one entry:

`word|part of speech|Farsi meaning|example sentence|level`

After editing, regenerate `words.js` with:

```bash
python3 tools/build_words.py
```

`CELPIP_Vocabulary_Moe.pdf` is the printable version of the original Reading & Writing list.

Persian font: [Vazirmatn](https://github.com/rastikerdar/vazirmatn) (SIL Open Font License, see `fonts/OFL.txt`).

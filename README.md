# Echo Puzzle Book

Echo Puzzle Book is a custom, interactive desktop puzzle application built with Electron. Originally designed as a personalized digital gift featuring Russian-language crosswords, the project explores immersive 3D page-flipping mechanics, persistent local state management, and multi-themed chapters (inspired by Harry Potter, Twilight, The Matrix, Game of Thrones, and Back to the Future).

## ✨ Features

- **Themed Puzzle Chapters:** Journey through custom crosswords and interactive mini-games inspired by iconic universes.
- **Interactive Sudoku Engine:** A fully validated 9x9 sudoku grid with real-time error checking, keyboard navigation, and a solved-state lock once completed correctly.
- **Themed Crosswords:** Five distinct crossword puzzles (Harry Potter, Twilight, Matrix, Game of Thrones, Back to the Future), each with per-cell validation and dynamic error highlighting.
- **Final Heart Puzzle:** A capstone drag-and-drop puzzle stage that unlocks after all chapters are solved, revealing a personalized final message.
- **Resume & Reset:** A "Continue" button that reopens the book and automatically flips through to your last solved page, plus a "Start Again" option that fully wipes saved progress.
- **Personalization:** A name input lets the recipient sign the book, with the signature persisted and displayed alongside their progress.
- **State Persistence:** Automatically saves puzzle drafts, solved answers, and current page (`localStorage`-backed) so nothing is lost between sessions.
- **Draggable Frameless Window:** Since the app runs without a native title bar, custom pointer-event handling lets you drag the window by clicking and dragging the book itself.
- **Custom Desktop Window Controls:** Custom-styled frameless window frame with minimize, maximize, and close handlers wired through Electron IPC.
- **Smooth 3D Page Transitions:** Built using CSS 3D perspectives and transforms for a realistic book-turning feel.

## Tech Stack

- **Runtime & Environment:** Node.js, Electron ^44.1.1
- **Packaging:** electron-builder ^26.15.3 (Windows target)
- **Languages:** JavaScript, HTML5, CSS3 (Flexbox/Grid, 3D Transforms)
- **State Management:** Web `localStorage`, IPC (`ipcMain`/`ipcRenderer`) for window control and drag positioning

## 🚀 Getting Started

To run this project locally on your machine, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/arjrst/echo-puzzle-book.git
   cd echo-puzzle-book
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the application:**
   ```bash
   npm start
   ```

## 📦 Building for Production

To package the application for Windows locally:

```bash
npm run build
```

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Disclaimer

This is a personal, non-commercial fan project. All references to Harry Potter, Twilight, The Matrix, Game of Thrones, and Back to the Future belong to their respective owners; this project is not affiliated with or endorsed by them.

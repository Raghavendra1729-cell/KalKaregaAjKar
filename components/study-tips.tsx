import { BookOpenCheck, Brain, Code2, Lightbulb } from "lucide-react";

const dsaTips = [
  ["Try before hints", "Spend a real attempt turning constraints into a brute-force idea before opening help."],
  ["Use the smallest hint", "If stuck, reveal only enough to restart. Finish the implementation and proof yourself."],
  ["Explain after solving", "Close the solution and state the key invariant, complexity, and failure cases from memory."],
  ["Return later", "Re-solve important or failed problems after a delay instead of rereading the same code."],
];

const examTips = [
  ["Start with recall", "Before notes, write everything you remember about the topic. Then check what was missing."],
  ["Practice like the exam", "Answer questions without notes, under similar time limits, and check the answer immediately."],
  ["Space the next review", "Revisit a topic after forgetting has begun. Several short reviews beat one long reread."],
  ["Keep a mistake list", "Record the exact reason for each error, then test that weak point again on a new question."],
];

export function StudyTips() {
  return (
    <section className="study-tips" aria-labelledby="study-tips-title">
      <header>
        <span><Lightbulb /></span>
        <div>
          <p className="eyebrow">Use when stuck, not as another task</p>
          <h2 id="study-tips-title">Small study moves that actually help</h2>
        </div>
      </header>
      <div className="study-tip-columns">
        <details>
          <summary><Code2 /> Coding & DSA</summary>
          <ul>{dsaTips.map(([title, copy]) => <li key={title}><strong>{title}</strong><span>{copy}</span></li>)}</ul>
        </details>
        <details>
          <summary><BookOpenCheck /> Exam preparation</summary>
          <ul>{examTips.map(([title, copy]) => <li key={title}><strong>{title}</strong><span>{copy}</span></li>)}</ul>
        </details>
      </div>
      <p className="study-evidence"><Brain /> Built around retrieval practice and spaced practice—stronger for long-term learning than passive rereading. <a href="https://doi.org/10.1177/1529100612453266" target="_blank" rel="noreferrer">Research summary</a></p>
    </section>
  );
}

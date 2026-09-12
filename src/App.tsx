import { ArrowRight, Calculator, Layers3 } from 'lucide-react'
import './App.css'

function App() {
  return (
    <main className="app-shell">
      <header className="masthead">
        <div className="brand">
          <Calculator aria-hidden="true" size={24} />
          <span>Crunch Lab</span>
        </div>
        <span className="status">Project scaffold</span>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Dice probability workbench</p>
        <h1 id="page-title">Build a sequence of game events.</h1>
        <p>
          Crunch Lab will make it easier to model conditional dice outcomes,
          state changes, and cumulative results. The first editor will use a
          guided sequence.
        </p>
      </section>

      <section className="workspace" aria-labelledby="workspace-title">
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">Coming next</p>
            <h2 id="workspace-title">Guided sequence editor</h2>
          </div>
          <Layers3 aria-hidden="true" size={22} />
        </div>

        <ol className="sequence-preview">
          <li>Choose an event, such as rolling a die.</li>
          <li>Define outcomes and conditions.</li>
          <li>Pass state, such as Vex, to the next event.</li>
        </ol>

        <a
          className="reference-link"
          href="./design/guided-sequence-mockup.html"
        >
          View the selected guided-sequence reference{' '}
          <ArrowRight aria-hidden="true" size={16} />
        </a>
      </section>
    </main>
  )
}

export default App

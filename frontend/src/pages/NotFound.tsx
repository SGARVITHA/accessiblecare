import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>404 — Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <nav aria-label="Recovery navigation">
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <li><Link to="/patient">Patient Portal</Link></li>
          <li><Link to="/staff">Staff Portal</Link></li>
          <li><Link to="/interpreter">Interpreter Portal</Link></li>
        </ul>
      </nav>
    </main>
  )
}

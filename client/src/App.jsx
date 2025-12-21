import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [view, setView] = useState('login'); // login, register, medicines, upload, chat
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [ocrResult, setOcrResult] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // --- Auth Handlers ---
  const handleLogin = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      setView('medicines');
    } else {
      alert(data.error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      alert("Registered! Please login.");
      setView('login');
    } else {
      alert(data.error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
  };

  // --- Medicine Handlers ---
  const fetchMedicines = async () => {
    const url = searchTerm
      ? `http://localhost:3000/api/medicines?search=${searchTerm}`
      : 'http://localhost:3000/api/medicines';
    const res = await fetch(url);
    const data = await res.json();
    setMedicines(data.medicines);
  };

  useEffect(() => {
    if (view === 'medicines') {
      fetchMedicines();
    }
  }, [view, searchTerm]);

  // --- OCR Handler ---
  const handleUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('prescription', e.target.file.files[0]);

    setOcrResult("Processing... please wait.");

    const res = await fetch('http://localhost:3000/api/upload-prescription', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      setOcrResult(data.extractedText);
    } else {
      setOcrResult("Error: " + data.error);
    }
  };

  // --- Chat Handler ---
  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newLog = [...chatLog, { role: 'user', text: chatInput }];
    setChatLog(newLog);
    const msg = chatInput;
    setChatInput('');

    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });
    const data = await res.json();
    setChatLog([...newLog, { role: 'bot', text: data.reply }]);
  };


  // --- Render Sections ---
  if (!user && view !== 'register') {
    return (
      <div className="container auth-container">
        <h1>PharmaDemo Login</h1>
        <form onSubmit={handleLogin}>
          <input name="username" placeholder="Username" required />
          <input name="password" type="password" placeholder="Password" required />
          <button type="submit">Login</button>
        </form>
        <p>New here? <button className="link-btn" onClick={() => setView('register')}>Register</button></p>
      </div>
    );
  }

  if (!user && view === 'register') {
    return (
      <div className="container auth-container">
        <h1>Register</h1>
        <form onSubmit={handleRegister}>
          <input name="username" placeholder="Choose Username" required />
          <input name="password" type="password" placeholder="Choose Password" required />
          <button type="submit">Register</button>
        </form>
        <p>Have an account? <button className="link-btn" onClick={() => setView('login')}>Login</button></p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <nav className="navbar">
        <div className="logo">Pharmacy Demo</div>
        <div className="nav-links">
          <button className={view === 'medicines' ? 'active' : ''} onClick={() => setView('medicines')}>Medicines</button>
          <button className={view === 'upload' ? 'active' : ''} onClick={() => setView('upload')}>Upload Rx (OCR)</button>
          <button className={view === 'chat' ? 'active' : ''} onClick={() => setView('chat')}>AI Chat</button>
          <button onClick={handleLogout}>Logout ({user.username})</button>
        </div>
      </nav>

      <main className="content">
        {view === 'medicines' && (
          <div className="medicines-page">
            <div className="search-bar">
              <input
                placeholder="Search medicines, composition, usage..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button onClick={fetchMedicines}>Search</button>
            </div>
            <div className="medicine-grid">
              {medicines.map(med => (
                <div key={med.medicine_id} className="medicine-card">
                  {med.image_url ? <img src={med.image_url} alt={med.name} onError={(e) => e.target.style.display = 'none'} /> : <div className="placeholder-img">No Image</div>}
                  <h3>{med.name}</h3>
                  <p className="composition"><strong>Comp:</strong> {med.composition}</p>
                  <p className="uses"><strong>Uses:</strong> {med.uses}</p>
                  <div className="stats">
                    <span>⭐ {med.excellent_review_pct}% Exc.</span>
                  </div>
                  <button className="buy-btn" onClick={() => alert('Added to cart mock!')}>Add to Cart</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'upload' && (
          <div className="upload-page">
            <h2>Upload Prescription</h2>
            <p>Upload an image of a prescription to extract text using OCR.</p>
            <form onSubmit={handleUpload}>
              <input type="file" name="file" accept="image/*" required />
              <button type="submit">Start OCR</button>
            </form>
            {ocrResult && (
              <div className="ocr-result">
                <h3>Extracted Text:</h3>
                <pre>{ocrResult}</pre>
              </div>
            )}
          </div>
        )}

        {view === 'chat' && (
          <div className="chat-page">
            <h2>Health Assistant Bot</h2>
            <div className="chat-window">
              {chatLog.map((msg, idx) => (
                <div key={idx} className={`chat-msg ${msg.role}`}>
                  <strong>{msg.role === 'bot' ? 'Bot' : 'You'}:</strong> {msg.text}
                </div>
              ))}
            </div>
            <form onSubmit={handleChat} className="chat-input-area">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask about symptoms..."
              />
              <button type="submit">Send</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

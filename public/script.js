// Disable right click
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Disable F12, Ctrl+Shift+I, Ctrl+Shift+C
document.addEventListener('keydown', (e) => {
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && e.key === 'I') ||
    (e.ctrlKey && e.shiftKey && e.key === 'C')
  ) {
    e.preventDefault();
  }
});

// Settings Storage
class Settings {
  constructor() {
    this.load();
  }

  load() {
    const saved = localStorage.getItem('botlink_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      document.getElementById('titleInput').value = settings.title || '🔗 Shortened Links';
      document.getElementById('formatInput').value = settings.format || '[TITLE]\n[URL]';
      document.getElementById('hastebinToken').value = settings.hastebinToken || '';
      document.getElementById('anonlinkKey').value = settings.anonlink || '';
      document.getElementById('linkxKey').value = settings.linkx || '';
      document.getElementById('mualKey').value = settings.mual || '';
    }
  }

  save() {
    const settings = {
      title: document.getElementById('titleInput').value,
      format: document.getElementById('formatInput').value,
      hastebinToken: document.getElementById('hastebinToken').value,
      anonlink: document.getElementById('anonlinkKey').value,
      linkx: document.getElementById('linkxKey').value,
      mual: document.getElementById('mualKey').value,
    };
    localStorage.setItem('botlink_settings', JSON.stringify(settings));
    alert('✅ Settings saved!');
  }

  get() {
    return {
      title: document.getElementById('titleInput').value,
      format: document.getElementById('formatInput').value,
      hastebinToken: document.getElementById('hastebinToken').value,
      apiKeys: {
        anonlink: document.getElementById('anonlinkKey').value,
        linkx: document.getElementById('linkxKey').value,
        mual: document.getElementById('mualKey').value,
      },
    };
  }
}

// Chat History
class ChatHistory {
  constructor() {
    this.load();
  }

  load() {
    const saved = localStorage.getItem('botlink_history');
    this.history = saved ? JSON.parse(saved) : [];
  }

  save() {
    localStorage.setItem('botlink_history', JSON.stringify(this.history));
  }

  add(message, response) {
    this.history.push({
      timestamp: new Date().toISOString(),
      message,
      response,
    });
    this.save();
  }

  clear() {
    this.history = [];
    this.save();
  }

  get() {
    return this.history;
  }
}

// Initialize
const settings = new Settings();
const chatHistory = new ChatHistory();

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('active');
}

function saveSettings() {
  settings.save();
  toggleSidebar();
}

function clearHistory() {
  if (confirm('Are you sure? This will delete all chat history.')) {
    chatHistory.clear();
    document.getElementById('messages').innerHTML = '';
    alert('✅ History cleared!');
  }
}

function addMessage(text, isUser = false) {
  const messagesDiv = document.getElementById('messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = text;

  messageDiv.appendChild(bubble);
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendLink() {
  const urlInput = document.getElementById('urlInput');
  const url = urlInput.value.trim();

  if (!url) {
    alert('⚠️ Please enter a URL');
    return;
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    alert('⚠️ Invalid URL format');
    return;
  }

  // Show user message
  addMessage(`📎 ${url}`, true);
  urlInput.value = '';

  // Show loading
  document.getElementById('loading').style.display = 'flex';

  try {
    const settingsData = settings.get();
    const response = await fetch('/api/shorten', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        title: settingsData.title,
        format: settingsData.format,
        apiKeys: settingsData.apiKeys,
        hastebinToken: settingsData.hastebinToken,
      }),
    });

    const data = await response.json();
    document.getElementById('loading').style.display = 'none';

    if (data.success) {
      // Display results
      let resultHTML = `<strong>${data.title}</strong><div class="links-container">`;

      for (const [key, link] of Object.entries(data.links)) {
        const label = key === 'link1' ? 'anonlink' : key === 'link2' ? 'linkx' : 'mual';
        const isError = link.startsWith('Error:');

        resultHTML += `
          <div class="link-item">
            <span class="link-label">${label}</span>
            <span class="link-text" onclick="openLink('${link}')">${link}</span>
            <button class="copy-btn" onclick="copyToClipboard('${link}')">Copy</button>
          </div>
        `;

        if (isError) {
          resultHTML += `<div class="error-message">${link}</div>`;
        }
      }

      resultHTML += '</div>';
      addMessage(resultHTML);

      // Save to history
      chatHistory.add(url, data.links);
    } else {
      addMessage(`❌ Error: ${data.error}`, false);
    }
  } catch (error) {
    document.getElementById('loading').style.display = 'none';
    addMessage(`❌ Error: ${error.message}`, false);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.classList.remove('copied');
    }, 2000);
  });
}

function openLink(link) {
  if (!link.startsWith('Error:')) {
    window.open(link, '_blank');
  }
}

function handleKeyPress(e) {
  if (e.key === 'Enter') {
    sendLink();
  }
}

// Load history on startup
window.addEventListener('load', () => {
  const messages = document.getElementById('messages');
  messages.innerHTML = '<div class="message bot"><div class="message-bubble">👋 Welcome! Paste your link here to get shortened URLs.<br>⚙️ Configure your settings on the left panel.</div></div>';
});
/**
 * github-manager.js — управління контентом через GitHub API
 * Працює з scripts.json, links.json, games.json в репозиторії
 */

const GitHubManager = {
  // Налаштування — замініть значення
  config: {
    owner: 'djesld12q-stack',        // GitHub username
    repo: 'sunwukong',                // Репозиторій
    token: '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',                        // Токен буде встановлений динамічно
    branch: 'main',
  },

  // Встановити токен
  setToken(token) {
    this.config.token = token;
    localStorage.setItem('github_token', token);
  },

  // Завантажити токен із localStorage
  loadToken() {
    const token = localStorage.getItem('github_token');
    if (token) this.config.token = token;
    return token;
  },

  // Базовий запит до GitHub API
  async apiCall(endpoint, method = 'GET', data = null) {
    const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}${endpoint}`;
    
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
    }

    const options = { method, headers };
    if (data) options.body = JSON.stringify(data);

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`GitHub API: ${error.message}`);
      }

      return await response.json();
    } catch (error) {
      console.error('GitHub API Error:', error);
      throw error;
    }
  },

  // Читати файл з репозиторія
  async readFile(path) {
    try {
      const data = await this.apiCall(`/contents/${path}`);
      const content = atob(data.content); // Декодувати Base64
      return {
        content: content,
        sha: data.sha,
      };
    } catch (error) {
      console.error(`Помилка читання ${path}:`, error);
      return null;
    }
  },

  // Записати файл в репозиторій
  async writeFile(path, content, message, sha = null) {
    if (!this.config.token) {
      throw new Error('GitHub токен не встановлений');
    }

    const body = {
      message: message,
      content: btoa(content), // Кодувати в Base64
      branch: this.config.branch,
    };

    if (sha) body.sha = sha; // Для оновлення існуючого файлу

    try {
      const result = await this.apiCall(`/contents/${path}`, 'PUT', body);
      return result;
    } catch (error) {
      console.error(`Помилка запису ${path}:`, error);
      throw error;
    }
  },

  // ══════════════════════════════════════════
  // СКРИПТИ
  // ══════════════════════════════════════════

  async getScripts() {
    const file = await this.readFile('scripts.json');
    if (!file) return [];
    try {
      return JSON.parse(file.content);
    } catch (e) {
      console.error('Помилка парсингу scripts.json:', e);
      return [];
    }
  },

  async saveScripts(scripts, message = 'Оновлення скриптів') {
    const file = await this.readFile('scripts.json');
    const sha = file ? file.sha : null;
    await this.writeFile(
      'scripts.json',
      JSON.stringify(scripts, null, 2),
      message,
      sha
    );
  },

  async addScript(script) {
    const scripts = await this.getScripts();
    scripts.push({
      id: Date.now(),
      ...script,
      createdAt: new Date().toISOString(),
    });
    await this.saveScripts(scripts, `Додано новий скрипт: ${script.name}`);
    return scripts;
  },

  async updateScript(id, updates) {
    const scripts = await this.getScripts();
    const index = scripts.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Скрипт не знайдений');
    
    scripts[index] = { ...scripts[index], ...updates };
    await this.saveScripts(scripts, `Оновлено скрипт: ${scripts[index].name}`);
    return scripts;
  },

  async deleteScript(id) {
    const scripts = await this.getScripts();
    const index = scripts.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Скрипт не знайдений');
    
    const name = scripts[index].name;
    scripts.splice(index, 1);
    await this.saveScripts(scripts, `Видалено скрипт: ${name}`);
    return scripts;
  },

  // ══════════════════════════════════════════
  // ПОСИЛАННЯ
  // ══════════════════════════════════════════

  async getLinks() {
    const file = await this.readFile('links.json');
    if (!file) return [];
    try {
      return JSON.parse(file.content);
    } catch (e) {
      console.error('Помилка парсингу links.json:', e);
      return [];
    }
  },

  async saveLinks(links, message = 'Оновлення посилань') {
    const file = await this.readFile('links.json');
    const sha = file ? file.sha : null;
    await this.writeFile(
      'links.json',
      JSON.stringify(links, null, 2),
      message,
      sha
    );
  },

  async addLink(link) {
    const links = await this.getLinks();
    links.push({
      id: Date.now(),
      ...link,
    });
    await this.saveLinks(links, `Додано нове посилання: ${link.name}`);
    return links;
  },

  // ══════════════════════════════════════════
  // ІГРИ
  // ══════════════════════════════════════════

  async getGames() {
    const file = await this.readFile('games.json');
    if (!file) return [];
    try {
      return JSON.parse(file.content);
    } catch (e) {
      console.error('Помилка парсингу games.json:', e);
      return [];
    }
  },

  async saveGames(games, message = 'Оновлення ігор') {
    const file = await this.readFile('games.json');
    const sha = file ? file.sha : null;
    await this.writeFile(
      'games.json',
      JSON.stringify(games, null, 2),
      message,
      sha
    );
  },
};

// Автоматично завантажити токен при завантаженні скрипту
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    GitHubManager.loadToken();
  });
}

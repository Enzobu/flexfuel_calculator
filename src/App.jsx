import { useEffect, useState } from 'react';
import { Check, Laptop, Moon, Sun } from 'lucide-react';
import './App.scss';

const MIN_LENGTH = 4;
const MAX_LENGTH = 128;
const DEFAULT_LENGTH = 24;
const COPY_FEEDBACK_DELAY = 1500;

const STORAGE_KEYS = {
  theme: 'password-generator-theme',
};

const CHARSETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  number: '0123456789'.split(''),
  special: ['&', '#', '@', '$', '*', '%', '!', '?'],
};

const DEFAULT_OPTIONS = {
  lower: true,
  upper: true,
  number: true,
  special: true,
};

const PASSWORD_OPTIONS = [
  { key: 'lower', label: 'Minuscules', sample: 'a-z' },
  { key: 'upper', label: 'Majuscules', sample: 'A-Z' },
  { key: 'number', label: 'Chiffres', sample: '0-9' },
  { key: 'special', label: 'Speciaux', sample: '& # @' },
];

const THEME_OPTIONS = [
  { key: 'system', label: 'Theme systeme', Icon: Laptop },
  { key: 'light', label: 'Theme clair', Icon: Sun },
  { key: 'dark', label: 'Theme sombre', Icon: Moon },
];

const THEME_SEQUENCE = THEME_OPTIONS.map((option) => option.key);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getStoredThemeMode() {
  if (typeof window === 'undefined') return 'system';

  const themeMode = window.localStorage.getItem(STORAGE_KEYS.theme);
  return THEME_OPTIONS.some((option) => option.key === themeMode)
    ? themeMode
    : 'system';
}

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function resolveTheme(themeMode, systemTheme) {
  return themeMode === 'system' ? systemTheme : themeMode;
}

function getEnabledCategories(options) {
  return PASSWORD_OPTIONS.filter((option) => options[option.key]).map(
    (option) => option.key,
  );
}

function getSecureRandomInt(max) {
  if (max <= 0) return 0;

  if (!window.crypto?.getRandomValues) {
    return Math.floor(Math.random() * max);
  }

  const randomValue = new Uint32Array(1);
  const limit = 0xffffffff - (0xffffffff % max);

  do {
    window.crypto.getRandomValues(randomValue);
  } while (randomValue[0] >= limit);

  return randomValue[0] % max;
}

function pickRandom(characters) {
  return characters[getSecureRandomInt(characters.length)];
}

function shuffleCharacters(characters) {
  const shuffled = [...characters];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = getSecureRandomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function generatePassword(length, options) {
  const categories = getEnabledCategories(options);
  if (categories.length === 0) return '';

  const safeLength = clamp(
    Number(length) || DEFAULT_LENGTH,
    MIN_LENGTH,
    MAX_LENGTH,
  );
  const pool = categories.flatMap((category) => CHARSETS[category]);
  const requiredCharacters = categories.map((category) =>
    pickRandom(CHARSETS[category]),
  );
  const remainingLength = safeLength - requiredCharacters.length;
  const extraCharacters = Array.from({ length: remainingLength }, () =>
    pickRandom(pool),
  );

  return shuffleCharacters([...requiredCharacters, ...extraCharacters]).join(
    '',
  );
}

function getStrengthScore(length, enabledCategoryCount) {
  if (enabledCategoryCount === 0) return 0;

  return Math.min(
    100,
    Math.round((length / MAX_LENGTH) * 55 + enabledCategoryCount * 11.25),
  );
}

function getCopyLabel(copyStatus) {
  if (copyStatus === 'error') return 'Erreur';

  return 'Copier';
}

function getThemeOption(themeMode) {
  return (
    THEME_OPTIONS.find((option) => option.key === themeMode) ?? THEME_OPTIONS[0]
  );
}

function fallbackCopy(value) {
  const temporaryInput = document.createElement('input');
  temporaryInput.style.position = 'absolute';
  temporaryInput.style.left = '-9999px';
  temporaryInput.value = value;
  document.body.appendChild(temporaryInput);
  temporaryInput.select();
  document.execCommand('copy');
  document.body.removeChild(temporaryInput);
}

function App() {
  const [themeMode, setThemeMode] = useState(getStoredThemeMode);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const [length, setLength] = useState(DEFAULT_LENGTH);
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [password, setPassword] = useState(() =>
    generatePassword(DEFAULT_LENGTH, DEFAULT_OPTIONS),
  );
  const [copyStatus, setCopyStatus] = useState('idle');

  const theme = resolveTheme(themeMode, systemTheme);
  const themeOption = getThemeOption(themeMode);
  const ThemeIcon = themeOption.Icon;
  const enabledCategories = getEnabledCategories(options);
  const hasOptions = enabledCategories.length > 0;
  const strengthScore = getStrengthScore(length, enabledCategories.length);
  const strengthHue = Math.round((strengthScore / 100) * 140);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function syncSystemTheme(event) {
      setSystemTheme(event.matches ? 'dark' : 'light');
    }

    mediaQuery.addEventListener('change', syncSystemTheme);
    return () => mediaQuery.removeEventListener('change', syncSystemTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEYS.theme, themeMode);
  }, [theme, themeMode]);

  useEffect(() => {
    if (copyStatus === 'idle') return undefined;

    const timeoutId = window.setTimeout(
      () => setCopyStatus('idle'),
      COPY_FEEDBACK_DELAY,
    );

    return () => window.clearTimeout(timeoutId);
  }, [copyStatus]);

  function updateLength(value) {
    const nextLength = clamp(Number(value), MIN_LENGTH, MAX_LENGTH);

    setLength(nextLength);
    setPassword(generatePassword(nextLength, options));
    setCopyStatus('idle');
  }

  function cycleThemeMode() {
    const currentIndex = THEME_SEQUENCE.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % THEME_SEQUENCE.length;

    setThemeMode(THEME_SEQUENCE[nextIndex]);
  }

  function toggleOption(optionKey) {
    const nextOptions = {
      ...options,
      [optionKey]: !options[optionKey],
    };

    setOptions(nextOptions);
    setPassword(generatePassword(length, nextOptions));
    setCopyStatus('idle');
  }

  function resetGenerator() {
    setLength(DEFAULT_LENGTH);
    setOptions(DEFAULT_OPTIONS);
    setPassword(generatePassword(DEFAULT_LENGTH, DEFAULT_OPTIONS));
    setCopyStatus('idle');
  }

  function regeneratePassword() {
    setPassword(generatePassword(length, options));
    setCopyStatus('idle');
  }

  async function copyPassword() {
    if (!password) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(password);
      } else {
        fallbackCopy(password);
      }

      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
  }

  return (
    <main className="app-shell">
      <section
        className="generator-layout"
        aria-label="Generateur de mot de passe"
      >
        <section className="tool-card">
          <nav className="topbar" aria-label="Navigation principale">
            <div className="brand-mark" aria-label="Passforge">
              <span className="brand-icon">P</span>
              <span>Passforge</span>
            </div>

            <button
              className="theme-toggle"
              type="button"
              onClick={cycleThemeMode}
              aria-label={`${themeOption.label}. Cliquer pour changer de theme`}
              title={themeOption.label}
            >
              <span className="theme-toggle-icon" key={themeMode}>
                <ThemeIcon aria-hidden="true" size={17} strokeWidth={2.4} />
              </span>
            </button>
          </nav>

          <header className="card-heading">
            <div>
              <p className="eyebrow">Secure utility</p>
              <h1>Générateur de mot de passe</h1>
            </div>
          </header>

          <div className="password-output">
            <label htmlFor="password">Mot de passe</label>
            <div className="output-row">
              <input
                id="password"
                value={password}
                readOnly
                placeholder="Active au moins une option"
              />
              <button
                className={`copy-button ${copyStatus}`}
                type="button"
                onClick={copyPassword}
                disabled={!password}
                aria-label={
                  copyStatus === 'copied'
                    ? 'Mot de passe copie'
                    : 'Copier le mot de passe'
                }
              >
                <span className="copy-button-content" key={copyStatus}>
                  {copyStatus === 'copied' ? (
                    <Check aria-hidden="true" size={22} strokeWidth={2.8} />
                  ) : (
                    getCopyLabel(copyStatus)
                  )}
                </span>
              </button>
            </div>
          </div>

          {!hasOptions && (
            <p className="warning">
              Selectionnez au moins une famille de caractères.
            </p>
          )}

          <div
            className="strength-meter"
            aria-label={`Score de securite ${strengthScore}%`}
          >
            <span
              className="strength-fill"
              style={{
                width: `${strengthScore}%`,
                backgroundColor: `hsl(${strengthHue} 78% 50%)`,
              }}
            />
          </div>

          <div className="stats-row" aria-label="Apercu des indicateurs">
            <article>
              <span>Longueur</span>
              <strong>{length}</strong>
            </article>
            <article>
              <span>Groupes</span>
              <strong>{enabledCategories.length}/4</strong>
            </article>
            <article>
              <span>Score</span>
              <strong>{hasOptions ? `${strengthScore}%` : '--'}</strong>
            </article>
          </div>

          <div className="control-block">
            <div className="control-label">
              <label htmlFor="length">Longueur</label>
              <span>{length} caracteres</span>
            </div>
            <input
              id="length"
              type="range"
              min={MIN_LENGTH}
              max={MAX_LENGTH}
              value={length}
              onChange={(event) => updateLength(event.target.value)}
            />
          </div>

          <div className="options-grid">
            {PASSWORD_OPTIONS.map((option) => (
              <button
                className={`option-card ${options[option.key] ? 'selected' : ''}`}
                key={option.key}
                type="button"
                onClick={() => toggleOption(option.key)}
                aria-pressed={options[option.key]}
              >
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.sample}</small>
                </span>
                <span className="option-toggle" aria-hidden="true" />
              </button>
            ))}
          </div>

          <div className="actions-row">
            <button
              className="primary-action"
              type="button"
              onClick={regeneratePassword}
              disabled={!hasOptions}
            >
              Générer
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={resetGenerator}
            >
              Reinitialiser
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;

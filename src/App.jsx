import { useEffect, useState } from 'react';
import { Fuel, Laptop, Moon, Sun } from 'lucide-react';
import './App.scss';

const STORAGE_KEYS = {
  settings: 'flexfuel-calculator-settings',
  theme: 'flexfuel-calculator-theme',
};

const DEFAULT_SETTINGS = {
  e10Price: '1.8',
  e85Price: '0.8',
  tankCapacity: '55',
  e85Target: '50',
};

const EMPTY_SETTINGS = {
  ...DEFAULT_SETTINGS,
  missingProportion: '',
};

const FIELDS = [
  {
    key: 'e10Price',
    label: 'Prix E10',
    suffix: 'EUR/L',
    type: 'number',
    inputMode: 'decimal',
    min: '0',
    step: '0.01',
  },
  {
    key: 'e85Price',
    label: 'Prix E85',
    suffix: 'EUR/L',
    type: 'number',
    inputMode: 'decimal',
    min: '0',
    step: '0.01',
  },
  {
    key: 'missingProportion',
    label: 'Réservoir vide',
    suffix: '%',
    type: 'number',
    inputMode: 'numeric',
    min: '0',
    max: '100',
    step: '1',
  },
  {
    key: 'tankCapacity',
    label: 'Capacité réservoir',
    suffix: 'L',
    type: 'number',
    inputMode: 'decimal',
    min: '0',
    step: '0.1',
  },
  {
    key: 'e85Target',
    label: 'Objectif E85',
    suffix: '%',
    type: 'number',
    inputMode: 'numeric',
    min: '0',
    max: '100',
    step: '1',
  },
];

const THEME_OPTIONS = [
  { key: 'system', label: 'Thème système', Icon: Laptop },
  { key: 'light', label: 'Thème clair', Icon: Sun },
  { key: 'dark', label: 'Thème sombre', Icon: Moon },
];

const THEME_SEQUENCE = THEME_OPTIONS.map((option) => option.key);
const numberFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function parseBusinessNumber(value) {
  if (value === '' || value === null || value === undefined) return null;

  const numberValue = Number(String(value).replace(',', '.'));
  return Number.isFinite(numberValue) ? numberValue : null;
}

function roundToTwoDecimals(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatVolume(value) {
  return `${numberFormatter.format(value)} L`;
}

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

function calculateFill(settings) {
  const e10Price = parseBusinessNumber(settings.e10Price);
  const e85Price = parseBusinessNumber(settings.e85Price);
  const missingProportion = parseBusinessNumber(settings.missingProportion);
  const tankCapacity = parseBusinessNumber(settings.tankCapacity);
  const e85Target = parseBusinessNumber(settings.e85Target);

  if (
    [e10Price, e85Price, missingProportion, tankCapacity, e85Target].some(
      (value) => value === null,
    )
  ) {
    return null;
  }

  const missingRatio = missingProportion / 100;
  const e85Ratio = e85Target / 100;
  const totalVolume = roundToTwoDecimals(missingRatio * tankCapacity);
  const e85Volume = roundToTwoDecimals(missingRatio * tankCapacity * e85Ratio);
  const e10Volume = roundToTwoDecimals(
    missingRatio * tankCapacity * (1 - e85Ratio),
  );
  const e85Cost = roundToTwoDecimals(e85Price * e85Volume);
  const e10Cost = roundToTwoDecimals(e10Price * e10Volume);

  return {
    totalVolume,
    totalCost: roundToTwoDecimals(e85Cost + e10Cost),
    e10Volume,
    e10Cost,
    e85Volume,
    e85Cost,
  };
}

function getStoredThemeMode() {
  if (typeof window === 'undefined') return 'system';

  const themeMode = window.localStorage.getItem(STORAGE_KEYS.theme);
  return THEME_OPTIONS.some((option) => option.key === themeMode)
    ? themeMode
    : 'system';
}

function getStoredSettings() {
  if (typeof window === 'undefined') return EMPTY_SETTINGS;

  try {
    const storedSettings = JSON.parse(
      window.localStorage.getItem(STORAGE_KEYS.settings),
    );

    if (!storedSettings || typeof storedSettings !== 'object') {
      return EMPTY_SETTINGS;
    }

    return Object.keys(DEFAULT_SETTINGS).reduce(
      (settings, key) => ({
        ...settings,
        [key]: String(storedSettings[key] ?? DEFAULT_SETTINGS[key]),
      }),
      { ...EMPTY_SETTINGS },
    );
  } catch {
    return EMPTY_SETTINGS;
  }
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

function getThemeOption(themeMode) {
  return (
    THEME_OPTIONS.find((option) => option.key === themeMode) ?? THEME_OPTIONS[0]
  );
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 680px)').matches;
}

function App() {
  const [themeMode, setThemeMode] = useState(getStoredThemeMode);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const [settings, setSettings] = useState(getStoredSettings);

  const result = calculateFill(settings);
  const theme = resolveTheme(themeMode, systemTheme);
  const themeOption = getThemeOption(themeMode);
  const ThemeIcon = themeOption.Icon;

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
    window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  }, [settings]);

  function cycleThemeMode() {
    const currentIndex = THEME_SEQUENCE.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % THEME_SEQUENCE.length;

    setThemeMode(THEME_SEQUENCE[nextIndex]);
  }

  function updateSetting(key, value, event) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [key]: value,
    }));

    if (
      key === 'missingProportion' &&
      value.length >= 2 &&
      isMobileViewport()
    ) {
      event.currentTarget.blur();
    }
  }

  function resetSettings() {
    setSettings(EMPTY_SETTINGS);
  }

  function selectFieldContent(event) {
    event.currentTarget.select();
  }

  return (
    <main className="app-shell">
      <section className="generator-layout" aria-label="Calculateur Flexfuel">
        <section className="tool-card">
          <nav className="topbar" aria-label="Navigation principale">
            <div className="brand-mark" aria-label="Flexfuel">
              <span className="brand-icon">
                <Fuel aria-hidden="true" size={19} strokeWidth={2.6} />
              </span>
              <span>Flexfuel</span>
            </div>

            <button
              className="theme-toggle"
              type="button"
              onClick={cycleThemeMode}
              aria-label={`${themeOption.label}. Cliquer pour changer de thème`}
              title={themeOption.label}
            >
              <span className="theme-toggle-icon" key={themeMode}>
                <ThemeIcon aria-hidden="true" size={17} strokeWidth={2.4} />
              </span>
            </button>
          </nav>

          <header className="card-heading">
            <div>
              <p className="eyebrow">Calculateur E10 / E85</p>
              <h1>Prépare ton plein flexfuel</h1>
            </div>
          </header>

          <div className="fields-grid">
            {FIELDS.map((field) => (
              <label className="field-card" key={field.key} htmlFor={field.key}>
                <span className="field-label">{field.label}</span>
                <span className="field-control">
                  <input
                    id={field.key}
                    type={field.type}
                    inputMode={field.inputMode}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={settings[field.key]}
                    onChange={(event) =>
                      updateSetting(field.key, event.target.value, event)
                    }
                    onFocus={selectFieldContent}
                  />
                  <span>{field.suffix}</span>
                </span>
              </label>
            ))}
          </div>

          <section className="result-panel" aria-live="polite">
            {result ? (
              <>
                <div className="result-main">
                  <article>
                    <span>Volume total à mettre</span>
                    <strong>{formatVolume(result.totalVolume)}</strong>
                  </article>
                  <article>
                    <span>Coût total</span>
                    <strong>{formatCurrency(result.totalCost)}</strong>
                  </article>
                </div>

                <div className="fuel-breakdown">
                  <article>
                    <span>E10</span>
                    <strong>{formatVolume(result.e10Volume)}</strong>
                    <small>{formatCurrency(result.e10Cost)}</small>
                  </article>
                  <article>
                    <span>E85</span>
                    <strong>{formatVolume(result.e85Volume)}</strong>
                    <small>{formatCurrency(result.e85Cost)}</small>
                  </article>
                </div>
              </>
            ) : (
              <p className="empty-result">
                Entrez les valeurs pour calculer le plein.
              </p>
            )}
          </section>

          <div className="actions-row">
            <button
              className="secondary-action"
              type="button"
              onClick={resetSettings}
            >
              Réinitialiser
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;

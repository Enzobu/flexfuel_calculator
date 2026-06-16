import { useEffect, useState } from 'react';
import { Fuel, Laptop, Moon, RotateCcw, Sun } from 'lucide-react';
import './App.css';

const STORAGE_KEYS = {
  theme: 'flexfuel-calculator-theme',
  settings: 'flexfuel-calculator-settings',
};

const THEME_OPTIONS = [
  { key: 'system', label: 'Theme systeme', Icon: Laptop },
  { key: 'light', label: 'Theme clair', Icon: Sun },
  { key: 'dark', label: 'Theme sombre', Icon: Moon },
];

const THEME_SEQUENCE = THEME_OPTIONS.map((option) => option.key);

const DEFAULT_SETTINGS = {
  pricePerLitreE10: '1.8',
  pricePerLitreE85: '0.8',
  tankCapacity: '55',
  proportion: '50',
};

const FIELDS = [
  {
    key: 'pricePerLitreE10',
    label: 'Prix E10',
    suffix: 'EUR/L',
    inputMode: 'decimal',
    min: '0',
    step: '0.01',
    placeholder: '-.--',
  },
  {
    key: 'pricePerLitreE85',
    label: 'Prix E85',
    suffix: 'EUR/L',
    inputMode: 'decimal',
    min: '0',
    step: '0.01',
    placeholder: '-.--',
  },
  {
    key: 'missingProportion',
    label: 'Reservoir vide',
    suffix: '%',
    inputMode: 'decimal',
    min: '0',
    max: '100',
    step: '1',
    placeholder: '--',
  },
  {
    key: 'tankCapacity',
    label: 'Capacite reservoir',
    suffix: 'L',
    inputMode: 'decimal',
    min: '0',
    step: '0.1',
    placeholder: '--',
  },
  {
    key: 'proportion',
    label: 'Objectif E85',
    suffix: '%',
    inputMode: 'decimal',
    min: '0',
    max: '100',
    step: '1',
    placeholder: '--',
  },
];

function getStoredThemeMode() {
  if (typeof window === 'undefined') return 'system';

  const themeMode = window.localStorage.getItem(STORAGE_KEYS.theme);
  return THEME_OPTIONS.some((option) => option.key === themeMode)
    ? themeMode
    : 'system';
}

function getStoredSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const storedSettings = JSON.parse(
      window.localStorage.getItem(STORAGE_KEYS.settings),
    );

    if (!storedSettings || typeof storedSettings !== 'object') {
      return DEFAULT_SETTINGS;
    }

    return {
      ...DEFAULT_SETTINGS,
      ...Object.fromEntries(
        Object.keys(DEFAULT_SETTINGS).map((key) => [
          key,
          storedSettings[key] === undefined ? DEFAULT_SETTINGS[key] : String(storedSettings[key]),
        ]),
      ),
    };
  } catch {
    return DEFAULT_SETTINGS;
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
  return THEME_OPTIONS.find((option) => option.key === themeMode) ?? THEME_OPTIONS[0];
}

function toNumber(value) {
  if (value === null || value === undefined) return null;

  const formattedValue = String(value).trim();
  if (formattedValue === '') return null;

  const number = Number(formattedValue.replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function round2(number) {
  return Math.round(number * 100) / 100;
}

function formatNumber(number, unit = '') {
  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(number) ? 0 : 2,
  }).format(number)}${unit}`;
}

function formatCurrency(number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(number);
}

function calculateFuel(settings) {
  const pricePerLitreE10 = toNumber(settings.pricePerLitreE10);
  const pricePerLitreE85 = toNumber(settings.pricePerLitreE85);
  const missingProportion = toNumber(settings.missingProportion);
  const tankCapacity = toNumber(settings.tankCapacity);
  const proportion = toNumber(settings.proportion);

  if (
    [pricePerLitreE10, pricePerLitreE85, missingProportion, tankCapacity, proportion].some(
      (number) => number === null,
    )
  ) {
    return null;
  }

  const missingRatio = missingProportion / 100;
  const e85Ratio = proportion / 100;

  const quantityE85 = missingRatio * tankCapacity * e85Ratio;
  const quantityE10 = missingRatio * tankCapacity * (1 - e85Ratio);
  const quantityTotal = missingRatio * tankCapacity;

  const priceE85 = round2(pricePerLitreE85 * quantityE85);
  const priceE10 = round2(pricePerLitreE10 * quantityE10);
  const priceTotal = round2(priceE85 + priceE10);

  return {
    quantityE85: round2(quantityE85),
    quantityE10: round2(quantityE10),
    quantityTotal: round2(quantityTotal),
    priceE85,
    priceE10,
    priceTotal,
  };
}

function App() {
  const [themeMode, setThemeMode] = useState(getStoredThemeMode);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const [settings, setSettings] = useState(getStoredSettings);

  const theme = resolveTheme(themeMode, systemTheme);
  const themeOption = getThemeOption(themeMode);
  const ThemeIcon = themeOption.Icon;
  const result = calculateFuel(settings);

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

  function updateSetting(settingKey, value) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [settingKey]: value,
    }));
  }

  function resetSettings() {
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <main className="app-shell">
      <section className="calculator-layout" aria-label="Calculateur flexfuel">
        <section className="tool-card">
          <nav className="topbar" aria-label="Navigation principale">
            <div className="brand-mark" aria-label="Flexfuel">
              <span className="brand-icon">
                <Fuel aria-hidden="true" size={19} strokeWidth={2.7} />
              </span>
              <span>Flexfuel</span>
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
              <p className="eyebrow">Fuel utility</p>
              <h1>Calculateur E10 / E85</h1>
            </div>
          </header>

          <section className="fuel-output" aria-live="polite">
            <label htmlFor="total-output">Resultat</label>
            {result ? (
              <>
                <div className="output-row">
                  <div className="total-output" id="total-output">
                    <span>Total a mettre</span>
                    <strong>{formatNumber(result.quantityTotal, ' L')}</strong>
                    <small>{formatCurrency(result.priceTotal)}</small>
                  </div>
                </div>

                <div className="stats-row" aria-label="Apercu du plein">
                  <article>
                    <span>E10</span>
                    <strong>{formatNumber(result.quantityE10, ' L')}</strong>
                    <small>{formatCurrency(result.priceE10)}</small>
                  </article>
                  <article>
                    <span>E85</span>
                    <strong>{formatNumber(result.quantityE85, ' L')}</strong>
                    <small>{formatCurrency(result.priceE85)}</small>
                  </article>
                  <article>
                    <span>Budget</span>
                    <strong>{formatCurrency(result.priceTotal)}</strong>
                    <small>total</small>
                  </article>
                </div>
              </>
            ) : (
              <p className="empty-result">Entre les valeurs pour calculer ton plein.</p>
            )}
          </section>

          <div className="fields-grid">
            {FIELDS.map((field) => (
              <label className="field-card" key={field.key} htmlFor={field.key}>
                <span className="field-label">
                  <span>{field.label}</span>
                  <small>{field.suffix}</small>
                </span>
                <input
                  id={field.key}
                  type="number"
                  inputMode={field.inputMode}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={settings[field.key]}
                  placeholder={field.placeholder}
                  onChange={(event) => updateSetting(field.key, event.target.value)}
                />
              </label>
            ))}
          </div>

          <div className="actions-row">
            <button className="primary-action" type="button" onClick={resetSettings}>
              <RotateCcw aria-hidden="true" size={18} strokeWidth={2.5} />
              Reinitialiser
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;

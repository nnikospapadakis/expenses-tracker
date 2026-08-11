// On-screen numeric keypad for entering an amount. Controlled: `value` is the
// raw string (e.g. "12.50"), and every keypress reports the next string via
// `onChange`. Keeping it a string avoids float rounding while typing.
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

export default function Numpad({ value, onChange }) {
  function press(key) {
    if (key === "back") return onChange(value.slice(0, -1));
    if (key === ".") {
      if (value.includes(".")) return; // only one decimal point
      return onChange((value || "0") + ".");
    }
    // digit: block a 3rd decimal place
    const dot = value.indexOf(".");
    if (dot !== -1 && value.length - dot > 2) return;
    if (value === "0") return onChange(key); // no leading zeros
    onChange(value + key);
  }

  const label = (k) =>
    k === "back" ? "Delete" : k === "." ? "Decimal point" : `Digit ${k}`;

  return (
    <div className="numpad" role="group" aria-label="Amount keypad">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          className="numpad-key"
          aria-label={label(k)}
          onClick={() => press(k)}
        >
          {k === "back" ? "⌫" : k}
        </button>
      ))}
    </div>
  );
}

import { useMemo, useState } from "react";
import type { SortId } from "../../lib/types";
import { selectCollageItems, useStore } from "../../store";
import { Field, Segmented, Slider, Toggle } from "../controls";
import { PosterPicker } from "../PosterPicker";

const SORTS: { value: SortId; label: string }[] = [
  { value: "added", label: "Recently added" },
  { value: "lastViewed", label: "Recently watched" },
  { value: "rating", label: "Top rated" },
  { value: "year", label: "Newest" },
  { value: "title", label: "A–Z" },
  { value: "random", label: "Shuffle" },
];

export function ContentPanel() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.update);
  const items = useStore((s) => s.items);
  const excluded = useStore((s) => s.excluded);
  const clearExcluded = useStore((s) => s.clearExcluded);
  const libraries = useStore((s) => s.libraries);
  const selectedLibraryKeys = useStore((s) => s.selectedLibraryKeys);
  const toggleLibrary = useStore((s) => s.toggleLibrary);
  const reloadItems = useStore((s) => s.reloadItems);
  const [pickerOpen, setPickerOpen] = useState(false);

  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items)
      for (const g of it.genres) counts.set(g, (counts.get(g) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 18)
      .map(([g]) => g);
  }, [items]);

  const matching = useMemo(
    () => selectCollageItems(items, excluded, { ...settings, limit: 1e9 }).length,
    [items, excluded, settings],
  );

  const years = useMemo(() => {
    let min = 9999;
    let max = 0;
    for (const it of items) {
      if (!it.year) continue;
      min = Math.min(min, it.year);
      max = Math.max(max, it.year);
    }
    return min <= max ? { min, max } : { min: 1950, max: 2026 };
  }, [items]);

  function toggleGenre(g: string) {
    const cur = settings.genreFilter;
    update({
      genreFilter: cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g],
    });
  }

  return (
    <div className="panel">
      <Field label="Libraries">
        <div className="lib-chip-row">
          {libraries.map((lib) => (
            <button
              key={lib.key}
              className={`chip ${selectedLibraryKeys.includes(lib.key) ? "active" : ""}`}
              onClick={async () => {
                toggleLibrary(lib.key);
                await reloadItems();
              }}
            >
              {lib.type === "movie" ? "🎬" : "📺"} {lib.title}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Order by">
        <div className="sort-grid">
          {SORTS.map((o) => (
            <button
              key={o.value}
              className={`chip ${settings.sort === o.value ? "active" : ""}`}
              onClick={() => update({ sort: o.value })}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="Poster count"
        trailing={`${Math.min(settings.limit, matching)} of ${matching}`}
      >
        <Slider
          value={settings.limit}
          min={4}
          max={300}
          onChange={(v) => update({ limit: v })}
        />
      </Field>

      {genres.length > 0 && (
        <Field
          label="Genres"
          trailing={
            settings.genreFilter.length ? (
              <button className="link-btn" onClick={() => update({ genreFilter: [] })}>
                clear
              </button>
            ) : (
              "any"
            )
          }
        >
          <div className="genre-row">
            {genres.map((g) => (
              <button
                key={g}
                className={`chip small ${settings.genreFilter.includes(g) ? "active" : ""}`}
                onClick={() => toggleGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </Field>
      )}

      <Field
        label="Year range"
        trailing={`${settings.yearMin ?? years.min} – ${settings.yearMax ?? years.max}`}
      >
        <div className="dual-slider">
          <Slider
            value={settings.yearMin ?? years.min}
            min={years.min}
            max={years.max}
            onChange={(v) =>
              update({ yearMin: v <= years.min ? null : v })
            }
          />
          <Slider
            value={settings.yearMax ?? years.max}
            min={years.min}
            max={years.max}
            onChange={(v) =>
              update({ yearMax: v >= years.max ? null : v })
            }
          />
        </div>
      </Field>

      <Field
        label="Minimum rating"
        trailing={settings.minRating > 0 ? `${settings.minRating}+` : "any"}
      >
        <Slider
          value={settings.minRating}
          min={0}
          max={9}
          step={0.5}
          onChange={(v) => update({ minRating: v })}
        />
      </Field>

      <Toggle
        label="Unwatched only"
        checked={settings.unwatchedOnly}
        onChange={(v) => update({ unwatchedOnly: v })}
      />

      <div className="picker-cta">
        <button className="btn-secondary" onClick={() => setPickerOpen(true)}>
          🖼️ Hand-pick posters
          {excluded.size > 0 && (
            <span className="badge">{excluded.size} hidden</span>
          )}
        </button>
        {excluded.size > 0 && (
          <button className="link-btn" onClick={clearExcluded}>
            reset
          </button>
        )}
      </div>

      {pickerOpen && <PosterPicker onClose={() => setPickerOpen(false)} />}
    </div>
  );
}

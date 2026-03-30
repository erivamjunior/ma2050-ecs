"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/modules.module.css";

export default function SearchableCreateSelect({
  selectedItem,
  items,
  getItemKey,
  getItemSearchText,
  renderSelected,
  renderOption,
  searchPlaceholder,
  emptyMessage,
  addLabel,
  onSelect,
  onAdd,
  initialQuery = "",
  disabled = false,
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery);

  const matches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    return items.filter((item) => getItemSearchText(item).toLowerCase().includes(normalizedQuery)).slice(0, 8);
  }, [getItemSearchText, items, query]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function toggleOpen() {
    if (disabled) {
      return;
    }

    setOpen((current) => {
      const next = !current;
      if (next && selectedItem) {
        setQuery("");
      }
      return next;
    });
  }

  function handleSelect(item) {
    onSelect(item);
    setOpen(false);
  }

  function handleAdd() {
    onAdd(query.trim());
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={styles.companySearchBlock}>
      <button type="button" className={styles.companySelectTrigger} onClick={toggleOpen} disabled={disabled}>
        <span className={selectedItem ? styles.companySelectValue : styles.companySelectPlaceholder}>
          {selectedItem ? renderSelected(selectedItem) : searchPlaceholder}
        </span>
        <span className={`${styles.companySelectChevron} ${open ? styles.companySelectChevronOpen : ""}`} aria-hidden="true" />
      </button>

      {open ? (
        <div className={styles.companySelectDropdown}>
          <input
            className={styles.companySelectSearch}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            autoFocus
          />

          <div className={styles.companySelectOptions}>
            {matches.length > 0 ? matches.map((item) => (
              <button key={getItemKey(item)} type="button" className={styles.companySelectOption} onClick={() => handleSelect(item)}>
                {renderOption(item)}
              </button>
            )) : query.trim() ? (
              <div className={styles.inlineSearchEmpty}>
                <p>{emptyMessage}</p>
              </div>
            ) : null}

            <button type="button" className={styles.companySelectOptionAdd} onClick={handleAdd}>
              {addLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

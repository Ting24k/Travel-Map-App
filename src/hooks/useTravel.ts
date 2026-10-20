import { useEffect, useRef, useState } from "react";
import { repository } from "../db/repository";
import type { TravelData } from "../types";
export function useTravel() {
  const [data, setData] = useState<TravelData>();
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const current = useRef<TravelData>(undefined);
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    repository
      .load()
      .then((d) => {
        if (active) {
          current.current = d;
          setData(d);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  function persist(d: TravelData) {
    current.current = d;
    setData(d);
    setSaving(true);
    setError(false);
    queue.current = queue.current
      .catch(() => {})
      .then(() => repository.save(d))
      .then(() => {
        if (current.current === d) {
          setSaving(false);
          setError(false);
        }
      })
      .catch(() => {
        setError(true);
        setSaving(false);
      });
  }
  return {
    data,
    error,
    saving,
    update: (fn: (d: TravelData) => TravelData) => {
      if (current.current) persist(fn(current.current));
    },
    replace: persist,
    retry: () => {
      if (current.current) persist(current.current);
      else location.reload();
    },
  };
}

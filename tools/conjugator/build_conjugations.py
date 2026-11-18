#!/usr/bin/env python3
"""Precompute every conjugation into static JSON the PWA bundles.

  public/data/verbs.json                      [{"v": "ser", "rank": 1, "count": 4451240}, ...]
  public/data/conjugations/rank-001-050.json  {"ser": {"present.indicative": [9 forms|null]}}
Forms follow PRONOUNS order; shards are rank bands so a top-10 round loads ~19 KB.

Run from the repo root:  npm run conjugations   (needs `uv`; output is committed)
"""
import contextlib, csv, io, json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from spanishconjugator import Conjugator
from conjugate import MOODS, PRONOUNS, TENSES, conjugate

ROOT = Path(__file__).parent.parent.parent
OUT = ROOT / "public" / "data"
BANDS = [(1, 50), (51, 100), (101, 250), (251, 500)]


def main():
    rows = list(csv.reader(open(Path(__file__).parent / "data" / "verbs-top500-from-tubelex.tsv", encoding="utf-8"), delimiter="\t"))[1:]
    verbs = [(r[0], int(r[1])) for r in rows if r]
    c = Conjugator()
    table = {}
    for verb, _ in verbs:
        entry = {}
        for tense in TENSES:
            for mood in MOODS:
                with contextlib.redirect_stdout(io.StringIO()):
                    forms = [conjugate(c, verb, tense, mood, p) for p in PRONOUNS]
                if any(forms):
                    entry[f"{tense}.{mood}"] = forms
        table[verb] = entry

    (OUT / "conjugations").mkdir(parents=True, exist_ok=True)
    dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
    (OUT / "verbs.json").write_text(dump([{"v": v, "rank": i + 1, "count": n} for i, (v, n) in enumerate(verbs)]), encoding="utf-8")
    meta = {"pronouns": PRONOUNS, "tenses": TENSES, "moods": MOODS, "bands": []}
    for lo, hi in BANDS:
        name = f"rank-{lo:03d}-{hi:03d}"
        shard = {v: table[v] for v, _ in verbs[lo - 1:hi]}
        (OUT / "conjugations" / f"{name}.json").write_text(dump(shard), encoding="utf-8")
        meta["bands"].append({"lo": lo, "hi": hi, "file": f"{name}.json"})
    (OUT / "meta.json").write_text(dump(meta), encoding="utf-8")
    forms = sum(1 for e in table.values() for f in e.values() for x in f if x)
    print(f"✓ {len(verbs)} verbs, {forms} forms -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

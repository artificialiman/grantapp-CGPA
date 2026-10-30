#!/usr/bin/env python3
"""Build the offline question packs and their manifest from the JSON depot.

Input : content/{faculty}/{course}.json   (validated by scripts/check-content.py)
Output: static/packs/manifest.json
        static/packs/{faculty}/{course}.{hash8}.json   one pack per course

Decisions this implements (DECISIONS 2026-10-30, INVARIANTS #23-#24):
  * Packs carry answers and explanations, so a whole test runs with the network off.
  * Only questions with status "approved" are shipped.
  * The first install holds at least 500 questions across all tracks (STARTER_TARGET).
  * A pack's file name carries a hash of its content, so a cached copy never goes stale
    and an unchanged pack is never downloaded twice.
  * The build is deterministic. Running it twice on the same depot changes nothing,
    and `released_on` only moves for a pack whose content changed.

Usage:
  python3 scripts/build-packs.py                 # write packs and manifest
  python3 scripts/build-packs.py --release 2026-11-07
  python3 scripts/build-packs.py --check         # exit 1 if the files on disk are stale (CI). Compressed sizes in the
                                                 # manifest may differ by 1% between zlib builds; nothing else may.

Standard library only.
"""
import argparse
import datetime
import gzip
import hashlib
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
OUT = ROOT / "static" / "packs"
FORMAT = 1
STARTER_TARGET = 500        # questions in the first install, spread across all faculties
PACK_MAX_BYTES = 1_500_000  # one course pack; about 10,000 questions with answers is the design ceiling
STARTER_MAX_BYTES = 3_000_000
FIELDS = (
    "id",
    "prompt",
    "options",
    "correct_option_id",
    "explanation",
    "cognitive_patterns",
    "information_types",
    "difficulty",
)


# Present only on questions that have them, so packs of ordinary questions keep their hashes.
OPTIONAL_FIELDS = ("kind", "cloze", "origin_universities")


def dumps(obj):
    # Canonical form: stable key order, no spaces, UTF-8. The hash depends on this exactly.
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def load_courses():
    courses = []
    for path in sorted(CONTENT.glob("*/*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        approved = [q for q in doc["questions"] if q.get("status") == "approved"]
        if not approved:
            continue
        courses.append(
            {
                "key": f'{doc["faculty_slug"]}/{doc["course_slug"]}',
                "faculty": doc["faculty_slug"],
                "course": doc["course_slug"],
                "departments": doc["department_slugs"],
                "questions": [{k: q[k] for k in FIELDS + tuple(x for x in OPTIONAL_FIELDS if x in q)} for q in approved],
            }
        )
    return courses


def build_pack(course):
    body = {
        "format": FORMAT,
        "key": course["key"],
        "faculty": course["faculty"],
        "course": course["course"],
        "departments": course["departments"],
        "questions": course["questions"],
    }
    raw = dumps(body).encode("utf-8")
    digest = hashlib.sha256(raw).hexdigest()
    return {
        "raw": raw,
        "sha256": digest,
        "bytes": len(raw),
        "gz_bytes": len(gzip.compress(raw, 9, mtime=0)),
        "relpath": f'packs/{course["faculty"]}/{course["course"]}.{digest[:8]}.json',
    }


def close(a, b):
    """gz_bytes is a download-budget estimate. Different zlib builds differ by a few bytes, so the check allows 1% or 16 bytes."""
    return abs(a - b) <= max(16, 0.01 * max(a, b))


def same_manifest(on_disk_bytes, fresh_bytes):
    """True if the manifest on disk matches a fresh build, ignoring zlib-version noise in the compressed sizes only."""
    try:
        old, new = json.loads(on_disk_bytes), json.loads(fresh_bytes)
    except ValueError:
        return False
    if len(old.get("packs", [])) != len(new["packs"]):
        return False
    for a, b in zip(old["packs"], new["packs"]):
        if {k: v for k, v in a.items() if k != "gz_bytes"} != {k: v for k, v in b.items() if k != "gz_bytes"}:
            return False
        if not close(a.get("gz_bytes", -1), b["gz_bytes"]):
            return False
    ta, tb = dict(old.get("totals", {})), dict(new["totals"])
    if not close(ta.pop("starter_gz_bytes", -1), tb.pop("starter_gz_bytes")):
        return False
    rest = lambda m: {k: v for k, v in m.items() if k not in ("packs", "totals")}
    return ta == tb and rest(old) == rest(new)


def pick_starter(courses):
    """Round-robin across faculties so every track is represented, until STARTER_TARGET is met."""
    by_faculty = {}
    for c in courses:
        by_faculty.setdefault(c["faculty"], []).append(c)
    chosen, total = set(), 0
    queues = {f: list(cs) for f, cs in sorted(by_faculty.items())}
    while queues and total < STARTER_TARGET:
        for faculty in list(queues):
            c = queues[faculty].pop(0)
            chosen.add(c["key"])
            total += len(c["questions"])
            if not queues[faculty]:
                del queues[faculty]
            if total >= STARTER_TARGET:
                break
    return chosen


def previous_release_dates():
    mf = OUT / "manifest.json"
    if not mf.exists():
        return {}
    old = json.loads(mf.read_text(encoding="utf-8"))
    return {p["key"]: (p["sha256"], p["released_on"]) for p in old.get("packs", [])}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--release", default=datetime.datetime.now(datetime.timezone.utc).date().isoformat())
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    # The validator is the gate. Never build packs from a depot that fails it.
    r = subprocess.run([sys.executable, "-I", str(ROOT / "scripts" / "check-content.py")], capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(r.stdout + r.stderr)
        sys.exit("depot failed validation; no packs built")

    courses = load_courses()
    if not courses:
        sys.exit("no approved questions in the depot")
    starter = pick_starter(courses)
    prev = previous_release_dates()

    packs, files = [], {}
    for c in courses:
        p = build_pack(c)
        if p["bytes"] > PACK_MAX_BYTES:
            sys.exit(f'{c["key"]}: pack is {p["bytes"]} bytes, over the {PACK_MAX_BYTES} ceiling')
        released = args.release
        if c["key"] in prev and prev[c["key"]][0] == p["sha256"]:
            released = prev[c["key"]][1]
        files[p["relpath"]] = p["raw"]
        packs.append(
            {
                "key": c["key"],
                "faculty": c["faculty"],
                "course": c["course"],
                "departments": c["departments"],
                "path": p["relpath"],
                "sha256": p["sha256"],
                "bytes": p["bytes"],
                "gz_bytes": p["gz_bytes"],
                "count": len(c["questions"]),
                "released_on": released,
                "starter": c["key"] in starter,
            }
        )

    starter_bytes = sum(p["gz_bytes"] for p in packs if p["starter"])
    if starter_bytes > STARTER_MAX_BYTES:
        sys.exit(f"starter bundle is {starter_bytes} bytes compressed, over {STARTER_MAX_BYTES}")
    content_hash = hashlib.sha256("\n".join(f'{p["key"]} {p["sha256"]}' for p in packs).encode()).hexdigest()
    release = max(p["released_on"] for p in packs)
    if prev and all(k in prev for k in (p["key"] for p in packs)) and len(prev) == len(packs):
        # Nothing changed: keep the manifest's release date stable too.
        old = json.loads((OUT / "manifest.json").read_text(encoding="utf-8"))
        if old.get("content_hash") == content_hash:
            release = old["release"]
    manifest = {
        "format": FORMAT,
        "release": release,
        "content_hash": content_hash,
        "totals": {
            "packs": len(packs),
            "questions": sum(p["count"] for p in packs),
            "starter_packs": sum(1 for p in packs if p["starter"]),
            "starter_questions": sum(p["count"] for p in packs if p["starter"]),
            "starter_gz_bytes": starter_bytes,
        },
        "packs": packs,
    }
    files["manifest.json"] = (json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")

    on_disk = {str(p.relative_to(OUT)) for p in OUT.rglob("*") if p.is_file()} if OUT.exists() else set()
    wanted = set(k.replace("packs/", "", 1) if k.startswith("packs/") else k for k in files)
    stale = on_disk - wanted
    drift = []
    for k in wanted:
        target = OUT / k
        fresh = files[k if k == "manifest.json" else "packs/" + k]
        if not target.exists():
            drift.append(k)
        elif k == "manifest.json" and args.check:
            if not same_manifest(target.read_bytes(), fresh):
                drift.append(k)
        elif target.read_bytes() != fresh:
            drift.append(k)

    if args.check:
        if stale or drift:
            print("packs are out of date:", sorted(stale | set(drift)))
            sys.exit(1)
        print(f'packs are current: {manifest["totals"]["packs"]} packs, {manifest["totals"]["questions"]} questions')
        return

    for rel in stale:
        (OUT / rel).unlink()
    for k, data in files.items():
        rel = k.replace("packs/", "", 1) if k.startswith("packs/") else k
        target = OUT / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    t = manifest["totals"]
    print(f'{t["packs"]} packs, {t["questions"]} questions; starter: {t["starter_packs"]} packs, '
          f'{t["starter_questions"]} questions, {t["starter_gz_bytes"]/1024:.1f} KB compressed')
    for p in packs:
        print(f'  {p["key"]:<48} {p["count"]:>4} q  {p["bytes"]/1024:6.1f} KB  {p["gz_bytes"]/1024:5.1f} KB gz  {"starter" if p["starter"] else ""}')


if __name__ == "__main__":
    main()

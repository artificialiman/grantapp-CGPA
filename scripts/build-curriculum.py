#!/usr/bin/env python3
"""Build the researched Nigerian curriculum from curriculum/*.txt into curriculum/build/.

Nothing here touches Supabase or the app. The output is for whoever propagates later.

Inputs
  curriculum/<department-slug>.txt   course list: year|code|name|c-or-e   (@include <name> pulls curriculum/shared/<name>.txt)
  curriculum/shared/*.txt            blocks shared by many departments
  curriculum/faculties.json          faculty classification
  curriculum/profiles/*.txt          one line per distinct course: title|general name|summary|psychometric tags|industrial tags
  curriculum/sources/code-index.json every code, title and credit-unit figure seen in the sources read

Outputs (curriculum/build/)
  <department-slug>.json  the department's courses by year, each with slug, aliases, summary, skills
  index.json              faculty > department > counts, plus which courses are shared by which departments
  Prints a report. Exit 1 on a slug clash inside a department, an unknown tag, or (with --strict) a course without a profile.

Slug rule is the database's (migration 0016): lower(regexp_replace(coalesce(code, name), '[^a-zA-Z0-9]+', '-', 'g')).

Usage
  python3 scripts/build-curriculum.py [--strict] [--list-missing]
"""
import json, pathlib, re, sys, collections

ROOT = pathlib.Path(__file__).resolve().parent.parent / "curriculum"
STOP = {"and", "of", "the", "to", "in", "for", "a", "an", "with", "on", "i.e"}
ROMAN = {"1": "i", "2": "ii", "3": "iii", "4": "iv", "5": "v"}

PSY = {
    "NUM": "Numerical reasoning", "VER": "Verbal reasoning", "LOG": "Abstract and logical reasoning",
    "SPA": "Spatial reasoning", "MEM": "Memory and recall", "DET": "Attention to detail",
    "MEC": "Mechanical reasoning", "CRT": "Critical judgement",
}
IND = {
    "LAB": "Laboratory technique", "PRG": "Programming", "CAD": "Technical drawing and CAD",
    "DES": "Engineering and systems design", "HSE": "Safety and regulatory compliance",
    "PM": "Project management", "COM": "Professional communication", "CLN": "Clinical practice",
    "DAT": "Data analysis", "ETH": "Professional ethics and law", "ENT": "Entrepreneurship",
    "RES": "Research method", "FLD": "Fieldwork and survey", "MFG": "Workshop and manufacturing",
    "SEC": "Information security", "FIN": "Financial and economic analysis", "LEG": "Legal drafting and advocacy",
    "CUS": "Client care and counselling",
}


def slug(code, name):
    return re.sub(r"[^a-zA-Z0-9]+", "-", code or name).lower()


def norm(title):
    t = re.sub(r"\(.*?\)", " ", title.lower())
    t = re.sub(r"[^a-z0-9 ]+", " ", t)
    toks = [ROMAN.get(x, x) for x in t.split() if x not in STOP]
    return " ".join(sorted(toks))


def read_lines(path, seen=None):
    seen = seen or set()
    for raw in path.read_text(encoding="utf-8").splitlines():
        if raw.startswith("@include "):
            inc = ROOT / "shared" / (raw.split()[1] + ".txt")
            yield from read_lines(inc, seen)
        elif raw.strip() and not raw.startswith("#"):
            yield raw


def meta(path):
    m = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        mm = re.match(r"# (dept|complete_years|source|supersedes):\s*(.*)", raw)
        if mm:
            m[mm.group(1)] = mm.group(2).strip()
    return m


def load_profiles():
    prof = {}
    d = ROOT / "profiles"
    if not d.exists():
        return prof
    for f in sorted(d.glob("*.txt")):
        for n, raw in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
            if not raw.strip() or raw.startswith("#"):
                continue
            p = [x.strip() for x in raw.split("|")]
            if len(p) != 5:
                sys.exit(f"{f.name}:{n}: expected 5 fields, got {len(p)}")
            title, general, summary, psy, ind = p
            psy_t = [x for x in psy.replace(",", " ").split() if x]
            ind_t = [x for x in ind.replace(",", " ").split() if x]
            for t in psy_t:
                if t not in PSY:
                    sys.exit(f"{f.name}:{n}: unknown psychometric tag {t}")
            for t in ind_t:
                if t not in IND:
                    sys.exit(f"{f.name}:{n}: unknown industrial tag {t}")
            prof[norm(title)] = {"general_name": general or title, "summary": summary,
                                 "psychometric": [PSY[t] for t in psy_t], "industrial": [IND[t] for t in ind_t]}
    return prof


def main():
    strict = "--strict" in sys.argv
    faculties = json.loads((ROOT / "faculties.json").read_text())
    dept_faculty = {}
    for f in faculties["faculties"] + faculties.get("cross_cutting", []):
        for d in f["departments"]:
            dept_faculty[d] = (f["slug"], f["name"])
    index = json.loads((ROOT / "sources" / "code-index.json").read_text())
    by_title = collections.defaultdict(list)
    for r in index:
        by_title[norm(r["title"])].append(r)
    profiles = load_profiles()
    out = ROOT / "build"
    out.mkdir(exist_ok=True)

    depts, errors = {}, []
    for path in sorted(ROOT.glob("*.txt")):
        s = path.stem
        m = meta(path)
        rows, seen = [], {}
        for raw in read_lines(path):
            p = raw.split("|")
            if len(p) != 4:
                errors.append(f"{s}: bad line {raw!r}")
                continue
            year, code, name, kind = int(p[0]), p[1].strip(), p[2].strip(), p[3].strip()
            sl = slug(code or None, name)
            if sl in seen:
                if seen[sl]["year"] == year and seen[sl]["name"] == name:
                    continue  # same course pulled in twice (shared block + own line)
                errors.append(f"{s}: slug clash {sl}: {seen[sl]['name']} (y{seen[sl]['year']}) vs {name} (y{year})")
                continue
            row = {"year": year, "code": code or None, "name": name,
                   "kind": "core" if kind == "c" else "elective", "slug": sl}
            seen[sl] = row
            rows.append(row)
        depts[s] = (m, rows)

    # Which departments share which course (same normalised title)
    shared = collections.defaultdict(set)
    for s, (m, rows) in depts.items():
        for r in rows:
            shared[norm(r["name"])].add(s)

    missing = collections.OrderedDict()
    for s, (m, rows) in depts.items():
        for r in rows:
            k = norm(r["name"])
            hits = by_title.get(k, [])
            seen_c, aliases = set(), []
            for h in hits:
                key = (h["code"], h["units"], h["source"])
                if key in seen_c:
                    continue
                seen_c.add(key)
                aliases.append({"code": h["code"], "units": h["units"], "source": h["source"]})
            codes = {}
            for a in aliases:
                codes.setdefault(a["code"], set())
                if a["units"]:
                    codes[a["code"]].add(a["units"])
            r["known_codes"] = ", ".join(
                f"{c} ({'/'.join(str(u) for u in sorted(us))})" if us else c for c, us in sorted(codes.items()))
            r["aliases"] = aliases
            r["shared_with"] = sorted(shared[k] - {s})
            pr = profiles.get(k)
            if pr:
                r.update(pr)
            else:
                r["general_name"] = r["name"]
                r["summary"] = None
                r["psychometric"], r["industrial"] = [], []
                missing.setdefault(k, r["name"])
        fslug, fname = dept_faculty.get(s, (None, None))
        (out / f"{s}.json").write_text(json.dumps({
            "department_slug": s, "faculty_slug": fslug, "faculty_name": fname,
            "source": m.get("source"), "complete_years": [int(x) for x in m.get("complete_years", "").split(",") if x],
            "supersedes_placeholders": [x.strip() for x in m.get("supersedes", "").split(";") if x.strip()],
            "courses": sorted(rows, key=lambda r: (r["year"], r["kind"] != "core", r["code"] or r["name"]))},
            indent=1, ensure_ascii=False) + "\n")

    idx = {"faculties": [], "shared_courses": []}
    for f in faculties["faculties"] + faculties.get("cross_cutting", []):
        idx["faculties"].append({"slug": f["slug"], "name": f["name"], "roster_pending": f.get("roster_pending", []),
                                 "open": f.get("open", []), "departments": [
            {"slug": d, "courses": len(depts[d][1]),
             "by_year": {str(y): sum(1 for r in depts[d][1] if r["year"] == y) for y in range(1, 7)}} for d in f["departments"]]})
    for k, ds in sorted(shared.items(), key=lambda kv: -len(kv[1])):
        if len(ds) > 1:
            name = next(r["name"] for r in depts[sorted(ds)[0]][1] if norm(r["name"]) == k)
            years = sorted({r["year"] for d in ds for r in depts[d][1] if norm(r["name"]) == k})
            idx["shared_courses"].append({"name": name, "years": years, "departments": sorted(ds)})
    (out / "index.json").write_text(json.dumps(idx, indent=1, ensure_ascii=False) + "\n")

    total = sum(len(r) for _, r in depts.values())
    print(f"departments: {len(depts)}  course rows: {total}  distinct courses: {len(shared)}  shared by 2+: {len(idx['shared_courses'])}")
    print(f"profiles written: {len(profiles)}  distinct courses without a profile: {len(missing)}")
    if "--list-missing" in sys.argv:
        for k, v in missing.items():
            print("  ", v)
    for e in errors:
        print("ERROR", e)
    if errors or (strict and missing):
        sys.exit(1)


if __name__ == "__main__":
    main()

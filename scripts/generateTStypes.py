#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Rust → TypeScript (global ambient) generator

- Structs -> interfaces (inside `declare global { ... }`)
- Enums -> string-literal unions
- Always includes:
    type WithNameAndId = { id: string | number; name: string };
    interface HeaderItem { text: string; href: string; }

Notes:
- chrono::DateTime<...> -> string (ISO)
- Option<T> -> T | null
- Vec<T> -> T[]
- [T; N] -> T[]
- HashMap<K,V> -> Record<string|number, V> (best-effort)
- (T1, T2, ...) -> [T1, T2, ...]  ← NEW
"""

class bcolors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

import re
from typing import List, Tuple, Optional
import sys

RE_BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.DOTALL)
RE_LINE_COMMENT = re.compile(r"//.*?$", re.MULTILINE)

RE_ENUM = re.compile(r"\bpub\s+enum\s+([A-Za-z_]\w*)\s*{\s*(.*?)\s*}", re.DOTALL)
RE_STRUCT = re.compile(r"\bpub\s+struct\s+([A-Za-z_]\w*)\s*{\s*(.*?)\s*}", re.DOTALL)

RE_FIELD = re.compile(r"\bpub\s+([A-Za-z_]\w*)\s*:\s*([^,}]+)\s*,?")
RE_ATTR_POSTGRES_NAME = re.compile(r'name\s*=\s*"([^"]+)"')

PRIMS = {
    "i8": "number", "i16": "number", "i32": "number", "i64": "number", "isize": "number",
    "u8": "number", "u16": "number", "u32": "number", "u64": "number", "usize": "number",
    "f32": "number", "f64": "number",
    "bool": "boolean",
    "String": "string",
    "&str": "string",
    "char": "string",
}


def strip_comments(src: str) -> str:
    src = RE_BLOCK_COMMENT.sub("", src)
    src = RE_LINE_COMMENT.sub("", src)
    return src


def compact_ws(s: str) -> str:
    return " ".join(s.strip().split())


def split_top_level_commas(s: str) -> List[str]:
    parts, stack, cur = [], [], []
    closing = {'<': '>', '(': ')', '[': ']'}
    for ch in s:
        if ch in closing:  # opening
            stack.append(closing[ch])
            cur.append(ch)
        elif stack and ch == stack[-1]:  # matching closing
            stack.pop()
            cur.append(ch)
        elif ch == ',' and not stack:  # split only at top-level
            parts.append("".join(cur).strip())
            cur = []
        else:
            cur.append(ch)
    if cur:
        parts.append("".join(cur).strip())
    return [p for p in parts if p]


def map_rust_type_to_ts(ty: str) -> str:
    t = compact_ws(ty)

    # TUPLE: (T1, T2, ...)
    m = re.match(r"^\((.*)\)$", t)
    if m is not None:
        inner = m.group(1).strip()
        if inner == "":
            return "[]"
        parts = split_top_level_commas(inner)  # supports nested tuples/generics
        # handle single-element tuple `(T,)`
        if len(parts) == 1 and inner.endswith(","):
            pass  # keep as single-element tuple
        ts_parts = [map_rust_type_to_ts(p) for p in parts]
        return f"[{', '.join(ts_parts)}]"

    # Option<T> - must come before DateTime to handle Option<DateTime<...>>
    m = re.match(r"^Option\s*<\s*(.+)\s*>$", t)
    if m:
        inner = map_rust_type_to_ts(m.group(1))
        return f"{inner} | null"

    # chrono DateTime
    if re.search(r"\b(?:chrono::)?DateTime\s*<\s*[^>]+>", t):
        return "string"

    # Vec<T>
    m = re.match(r"^Vec\s*<\s*(.+)\s*>$", t)
    if m:
        inner = map_rust_type_to_ts(m.group(1))
        return f"{inner}[]"

    # HashMap<K,V>
    m = re.match(r"^(?:std::collections::)?HashMap\s*<\s*(.+)\s*>$", t)
    if m:
        kv = split_top_level_commas(m.group(1))
        if len(kv) == 2:
            kt = map_rust_type_to_ts(kv[0])
            vt = map_rust_type_to_ts(kv[1])
            key_ts = "number" if kt == "number" else "string"
            return f"Record<{key_ts}, {vt}>"

    # Arrays [T; N]
    m = re.match(r"^\[\s*(.+?)\s*;\s*\d+\s*\]$", t)
    if m:
        inner = map_rust_type_to_ts(m.group(1))
        return f"{inner}[]"
    
    # Id newtypes
    m = re.match(r"^([A-Z][A-Za-z]*Id)$", t)
    if m:
        return "number"

    # Primitives
    if t in PRIMS:
        return PRIMS[t]

    # Strip module path for custom types
    if "::" in t:
        t = t.split("::")[-1]

    # Generic wrappers we don't map -> take inner for some, else unknown
    if "<" in t and ">" in t:
        head = t.split("<", 1)[0].strip()
        if head in ("Box", "Arc", "Rc"):
            inner = t[t.find("<") + 1:t.rfind(">")]
            return map_rust_type_to_ts(inner)
        return "unknown"

    return t


def parse_enum_body(body: str) -> List[str]:
    variants: List[str] = []
    pending_name: Optional[str] = None
    for raw in body.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("#["):
            m = RE_ATTR_POSTGRES_NAME.search(line)
            if m:
                pending_name = m.group(1)
            continue
        line = line.split("//", 1)[0].strip().rstrip(",")
        if not line:
            continue
        m = re.match(r"([A-Za-z_]\w*)", line)
        if not m:
            continue
        ident = m.group(1)
        lit = pending_name if pending_name else ident
        pending_name = None
        variants.append(lit)
    # dedupe keep order
    seen, uniq = set(), []
    for v in variants:
        if v not in seen:
            seen.add(v)
            uniq.append(v)
    return uniq


def parse_struct_fields(body: str) -> List[Tuple[str, str]]:
    # remove attribute lines, keep the rest intact
    cleaned_lines = [ln for ln in body.splitlines() if not ln.strip().startswith("#[")]
    s = "\n".join(cleaned_lines).strip()

    # split by top-level commas so tuples/generics are safe
    chunks = split_top_level_commas(s)

    fields: List[Tuple[str, str]] = []
    for part in chunks:
        part = part.strip()
        if not part:
            continue
        # strip optional trailing commas (in case last item had one)
        if part.endswith(","):
            part = part[:-1].rstrip()

        m = re.match(r"^pub\s+([A-Za-z_]\w*)\s*:\s*(.+)$", part)
        if m:
            name = m.group(1)
            ty = m.group(2).strip()
            fields.append((name, ty))
    return fields


def rust_to_ts_global(src: str) -> str:
    clean = strip_comments(src)
    enums = list(RE_ENUM.finditer(clean))
    structs = list(RE_STRUCT.finditer(clean))

    # Order by appearance
    enums_sorted = sorted(enums, key=lambda m: m.start())
    structs_sorted = sorted(structs, key=lambda m: m.start())

    out: List[str] = []
    out.append("// AUTO-GENERATED FROM RUST. Edit Rust models instead.\n"
               "// Found in ./packages/backend/utils/types.rs\n")
    out.append("declare global {")
    # Enums
    for m in enums_sorted:
        name = m.group(1)
        values = parse_enum_body(m.group(2))
        union = " | ".join(f'"{v}"' for v in values)
        out.append(f"  type {name} = {union};\n")

    # Helper types
    out.append("  type WithNameAndId = { id: string | number; name: string };\n")
    out.append("  interface HeaderItem {")
    out.append("    text: string;")
    out.append("    href: string;")
    out.append("  }\n")

    # Structs
    for m in structs_sorted:
        name = m.group(1)
        fields = parse_struct_fields(m.group(2))
        out.append(f"  interface {name} {{")
        for fname, fty in fields:
            ts_ty = map_rust_type_to_ts(fty)
            out.append(f"    {fname}: {ts_ty};")
        out.append("  }\n")

    out.append("}")
    out.append("\nexport {};")
    return "\n".join(out) + "\n"


def main():
    check_mode = "--check" in sys.argv

    with open(r"./packages/backend/src/utils/types.rs", "r", encoding="utf-8") as f:
        src = f.read()

    ts = rust_to_ts_global(src)
    ts_path = "./packages/frontend/src/types/global-rust-types.d.ts"

    if check_mode:
        try:
            with open(ts_path, "r", encoding="utf-8") as f:
                existing_ts = f.read()
            if "".join(ts.split()) != "".join(existing_ts.split()):
                print(bcolors.FAIL + "TypeScript types are out of date. Please run the generator." + bcolors.ENDC)
                exit(1)
            else:
                print(bcolors.OKGREEN + "TypeScript types are up to date." + bcolors.ENDC)
        except FileNotFoundError:
            print(bcolors.FAIL + f"File not found: {ts_path}. Cannot check for updates." + bcolors.ENDC)
            exit(1)
    else:
        with open(ts_path, "w+", encoding="utf-8") as f:
            f.write(ts)
        print(bcolors.OKGREEN + "••• TypeScript types generated successfully. •••" + bcolors.ENDC)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(bcolors.FAIL + f"An error occurred: {e}" + bcolors.ENDC)
        exit(1)

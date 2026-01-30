#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Rust → Python dataclass generator
"""

import re
from typing import List, Tuple, Optional
import sys

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

RE_BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.DOTALL)
RE_LINE_COMMENT = re.compile(r"//.*?$", re.MULTILINE)

RE_ENUM = re.compile(r"\bpub\s+enum\s+([A-Za-z_]\w*)\s*{\s*(.*?)\s*}", re.DOTALL)
RE_STRUCT = re.compile(r"\bpub\s+struct\s+([A-Za-z_]\w*)\s*{\s*(.*?)\s*}", re.DOTALL)

RE_FIELD = re.compile(r"\bpub\s+([A-Za-z_]\w*)\s*:\s*([^,}]+)\s*,?")
RE_ATTR_POSTGRES_NAME = re.compile(r'name\s*=\s*"([^"]+)"')

PRIMS = {
    "i8": "int", "i16": "int", "i32": "int", "i64": "int", "isize": "int",
    "u8": "int", "u16": "int", "u32": "int", "u64": "int", "usize": "int",
    "f32": "float", "f64": "float",
    "bool": "bool",
    "String": "str",
    "&str": "str",
    "char": "str",
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
        if ch in closing:
            stack.append(closing[ch])
            cur.append(ch)
        elif stack and ch == stack[-1]:
            stack.pop()
            cur.append(ch)
        elif ch == ',' and not stack:
            parts.append("".join(cur).strip())
            cur = []
        else:
            cur.append(ch)
    if cur:
        parts.append("".join(cur).strip())
    return [p for p in parts if p]

def map_rust_type_to_py(ty: str) -> str:
    t = compact_ws(ty)

    m = re.match(r"^\((.*)\)$", t)
    if m is not None:
        inner = m.group(1).strip()
        if inner == "":
            return "tuple"
        parts = split_top_level_commas(inner)
        if len(parts) == 1 and inner.endswith(","):
            pass
        py_parts = [map_rust_type_to_py(p) for p in parts]
        return f"tuple[{', '.join(py_parts)}]"

    # Option<T> - must come before DateTime to handle Option<DateTime<...>>
    m = re.match(r"^Option\s*<\s*(.+)\s*>$", t)
    if m:
        inner = map_rust_type_to_py(m.group(1))
        return f"Optional[{inner}]"

    if re.search(r"\b(?:chrono::)?DateTime\s*<\s*[^>]+>", t):
        return "str"

    m = re.match(r"^Vec\s*<\s*(.+)\s*>$", t)
    if m:
        inner = map_rust_type_to_py(m.group(1))
        return f"list[{inner}]"

    m = re.match(r"^(?:std::collections::)?HashMap\s*<\s*(.+)\s*>$", t)
    if m:
        kv = split_top_level_commas(m.group(1))
        if len(kv) == 2:
            kt = map_rust_type_to_py(kv[0])
            vt = map_rust_type_to_py(kv[1])
            return f"dict[{kt}, {vt}]"

    m = re.match(r"^\[\s*(.+?)\s*;\s*\d+\s*\]$", t)
    if m:
        inner = map_rust_type_to_py(m.group(1))
        return f"list[{inner}]"
    
    m = re.match(r"^([A-Z][A-Za-z]*Id)$", t)
    if m:
        return "int"

    if t in PRIMS:
        return PRIMS[t]

    if "::" in t:
        t = t.split("::")[-1]

    if "<" in t and ">" in t:
        head = t.split("<", 1)[0].strip()
        if head in ("Box", "Arc", "Rc"):
            inner = t[t.find("<") + 1:t.rfind(">")]
            return map_rust_type_to_py(inner)
        return "Any"

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
    seen, uniq = set(), []
    for v in variants:
        if v not in seen:
            seen.add(v)
            uniq.append(v)
    return uniq

def parse_struct_fields(body: str) -> List[Tuple[str, str]]:
    cleaned_lines = [ln for ln in body.splitlines() if not ln.strip().startswith("#[")]
    s = "\n".join(cleaned_lines).strip()
    chunks = split_top_level_commas(s)
    fields: List[Tuple[str, str]] = []
    for part in chunks:
        part = part.strip()
        if not part:
            continue
        if part.endswith(","):
            part = part[:-1].rstrip()
        m = re.match(r"^pub\s+([A-Za-z_]\w*)\s*:\s*(.+)$", part)
        if m:
            name = m.group(1)
            ty = m.group(2).strip()
            fields.append((name, ty))
    return fields

def rust_to_py_dataclasses(src: str) -> str:
    clean = strip_comments(src)
    enums = list(RE_ENUM.finditer(clean))
    structs = list(RE_STRUCT.finditer(clean))

    enums_sorted = sorted(enums, key=lambda m: m.start())
    structs_sorted = sorted(structs, key=lambda m: m.start())

    out: List[str] = []
    out.append("# AUTO-GENERATED FROM RUST. Edit Rust models instead.\n"
               "# Found in ./packages/backend/src/utils/types.rs\n")
    out.append("from dataclasses import dataclass, field")
    out.append("from typing import Optional, Any, Literal, Union")
    out.append("import sys\n")
    out.append("""
def _resolve_type(field_type, cls_globals):
    \"\"\"Resolve a type that might be a string forward reference.\"\"\"
    if isinstance(field_type, str):
        return cls_globals.get(field_type, field_type)
    return field_type


def _from_dict[T](cls: type[T], data: Any) -> T:
    \"\"\"Recursively convert a dict to a dataclass instance.\"\"\"
    if data is None:
        return None
    if not isinstance(data, dict):
        return data
    if not hasattr(cls, '__dataclass_fields__'):
        return data

    init_data = {}
    cls_globals = sys.modules[cls.__module__].__dict__

    for field_name, field_type in cls.__annotations__.items():
        if field_name not in data:
            continue

        field_value = data[field_name]

        # Handle None values early
        if field_value is None:
            init_data[field_name] = None
            continue

        # Resolve forward references
        resolved_type = _resolve_type(field_type, cls_globals)

        # Handle generic types like list, dict, Optional, Union
        origin = getattr(resolved_type, '__origin__', None)

        if origin is not None:
            args = getattr(resolved_type, '__args__', ())

            # Handle list[T]
            if origin is list and isinstance(field_value, list):
                if args:
                    element_type = _resolve_type(args[0], cls_globals)
                    init_data[field_name] = [_from_dict(element_type, item) for item in field_value]
                else:
                    init_data[field_name] = field_value

            # Handle dict[K, V]
            elif origin is dict and isinstance(field_value, dict):
                if len(args) >= 2:
                    key_type = _resolve_type(args[0], cls_globals)
                    value_type = _resolve_type(args[1], cls_globals)
                    init_data[field_name] = {
                        _from_dict(key_type, k): _from_dict(value_type, v)
                        for k, v in field_value.items()
                    }
                else:
                    init_data[field_name] = field_value

            # Handle Optional[T] (Union[T, None])
            elif origin is Union:
                # Find the non-None type in the Union
                non_none_types = [t for t in args if t is not type(None)]
                if non_none_types:
                    inner_type = _resolve_type(non_none_types[0], cls_globals)
                    init_data[field_name] = _from_dict(inner_type, field_value)
                else:
                    init_data[field_name] = field_value

            # Handle tuple
            elif origin is tuple and isinstance(field_value, (list, tuple)):
                if args:
                    init_data[field_name] = tuple(
                        _from_dict(_resolve_type(args[i] if i < len(args) else args[-1], cls_globals), v)
                        for i, v in enumerate(field_value)
                    )
                else:
                    init_data[field_name] = tuple(field_value)
            else:
                init_data[field_name] = field_value

        # Handle dataclasses
        elif hasattr(resolved_type, '__dataclass_fields__'):
            init_data[field_name] = _from_dict(resolved_type, field_value)
        else:
            init_data[field_name] = field_value

    return cls(**init_data)
""")

    for m in enums_sorted:
        name = m.group(1)
        values = parse_enum_body(m.group(2))
        union = ", ".join(f'"{v}"' for v in values)
        out.append(f"{name} = Literal[{union}]\n")
    out.append("\n")

    all_struct_names = {m.group(1) for m in structs_sorted}

    for m in structs_sorted:
        name = m.group(1)
        fields = parse_struct_fields(m.group(2))
        out.append(f"@dataclass\nclass {name}:")
        if not fields:
            out.append("    pass")
            out.append(f"    @classmethod\n    def from_dict(cls, data: Any): return _from_dict(cls, data)\n")
            continue

        # First, determine which fields have defaults and which don't
        fields_no_default = []
        fields_with_default = []

        for fname, fty in fields:
            py_ty = map_rust_type_to_py(fty)

            # Post-process for forward refs in lists/options
            for struct_name in all_struct_names:
                py_ty = re.sub(fr'\b{struct_name}\b', f"'{struct_name}'", py_ty)

            # Determine if field should have a default
            if py_ty.startswith("Optional["):
                fields_with_default.append((fname, py_ty, "= None"))
            elif py_ty.startswith("list"):
                fields_with_default.append((fname, py_ty, f"= field(default_factory={py_ty})"))
            elif py_ty.startswith("dict"):
                fields_with_default.append((fname, py_ty, f"= field(default_factory={py_ty})"))
            else:
                fields_no_default.append((fname, py_ty, None))

        # Generate field lines: non-defaults first, then defaults
        for fname, py_ty, default in fields_no_default:
            out.append(f"    {fname}: {py_ty}")
        for fname, py_ty, default in fields_with_default:
            out.append(f"    {fname}: {py_ty} {default}")

        out.append(f"    @classmethod\n    def from_dict(cls, data: Any): return _from_dict(cls, data)")
        out.append("\n")

    return "\n".join(out)

def main():
    check_mode = "--check" in sys.argv

    with open(r"./packages/backend/src/utils/types.rs", "r", encoding="utf-8") as f:
        src = f.read()

    py_code = rust_to_py_dataclasses(src)
    py_path = "./scripts/rust_types.py"

    if check_mode:
        try:
            with open(py_path, "r", encoding="utf-8") as f:
                existing_py = f.read()
            if "".join(py_code.split()) != "".join(existing_py.split()):
                print(bcolors.FAIL + "Python types are out of date. Please run the generator." + bcolors.ENDC)
                exit(1)
            else:
                print(bcolors.OKGREEN + "Python types are up to date." + bcolors.ENDC)
        except FileNotFoundError:
            print(bcolors.FAIL + f"File not found: {py_path}. Cannot check for updates." + bcolors.ENDC)
            exit(1)
    else:
        with open(py_path, "w+", encoding="utf-8") as f:
            f.write(py_code)
        print(bcolors.OKGREEN + "••• Python dataclasses generated successfully. •••" + bcolors.ENDC)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(bcolors.FAIL + f"Error generating Python dataclasses: {e}" + bcolors.ENDC)
        exit(1)

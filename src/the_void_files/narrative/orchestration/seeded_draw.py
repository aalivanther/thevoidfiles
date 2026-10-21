import hashlib

mask64 = (1 << 64) - 1


def draw_seed(*parts: str) -> int:
    payload = "\n".join(parts).encode("utf-8")
    return int.from_bytes(hashlib.sha256(payload).digest()[:8], "big")


def mix_seed(seed: int, salt: str) -> int:
    return draw_seed(str(seed & mask64), salt)


def draw_index(seed: int, span: int) -> int:
    if span <= 1:
        return 0
    mixed = (seed + 0x9E3779B97F4A7C15) & mask64
    mixed = ((mixed ^ (mixed >> 30)) * 0xBF58476D1CE4E5B9) & mask64
    mixed = ((mixed ^ (mixed >> 27)) * 0x94D049BB133111EB) & mask64
    mixed = mixed ^ (mixed >> 31)
    return mixed % span


def draw_inclusive(seed: int, lower: int, upper: int) -> int:
    if upper <= lower:
        return lower
    return lower + draw_index(seed, upper - lower + 1)

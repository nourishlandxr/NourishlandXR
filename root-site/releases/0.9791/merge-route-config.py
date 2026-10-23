"""Replace only Nourishland-owned routing blocks, retaining host/WordPress bytes."""
import re
import sys
from pathlib import Path


def merge(original: bytes, block: bytes) -> bytes:
    starts = [b'# BEGIN Nourishland root release', b'# BEGIN Nourishland canonical routes']
    ends = [b'# END Nourishland root release', b'# END Nourishland canonical routes']
    rest = original
    for start, end in zip(starts, ends):
        if rest.count(start) != rest.count(end) or rest.count(start) > 1:
            raise ValueError('Unrecognised or repeated managed routing block')
        pattern = rb'(?m)^' + re.escape(start) + rb'[^\r\n]*\r?\n[\s\S]*?^' + re.escape(end) + rb'[^\r\n]*(?:\r?\n|$)'
        rest, count = re.subn(pattern, b'', rest)
        if original.count(start) and not count:
            raise ValueError('Managed routing block boundaries did not match')
    if not block.startswith(starts[1]) or not block.rstrip().endswith(ends[1]):
        raise ValueError('Invalid replacement routing block')
    if rest.count(b'# BEGIN WordPress') != 1:
        raise ValueError('Expected one preserved WordPress configuration block')
    at = rest.index(b'# BEGIN WordPress')
    return rest[:at] + block.rstrip() + b'\n' + rest[at:]


if __name__ == '__main__':
    old, block, target = map(Path, sys.argv[1:])
    target.write_bytes(merge(old.read_bytes(), block.read_bytes()))

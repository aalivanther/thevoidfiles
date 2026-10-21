import hashlib

from the_void_files.narrative.orchestration.seeded_draw import draw_inclusive, draw_index, draw_seed, mix_seed


def test_a_seed_is_stable_and_stays_inside_the_asked_span():
    expected_seed = int.from_bytes(hashlib.sha256(b"faro").digest()[:8], "big")
    assert draw_seed("faro") == expected_seed
    assert draw_seed("faro", "muelle") == int.from_bytes(hashlib.sha256(b"faro\nmuelle").digest()[:8], "big")
    assert draw_seed("faro") != draw_seed("muelle")
    assert draw_index(draw_seed("faro"), 1) == 0
    assert draw_index(draw_seed("faro"), 0) == 0
    drawn_index = draw_index(draw_seed("faro"), 26)
    assert drawn_index == draw_index(draw_seed("faro"), 26)
    assert 0 <= drawn_index < 26
    assert draw_inclusive(draw_seed("faro"), 4, 8) in range(4, 9)
    assert draw_inclusive(3, 5, 5) == 5
    assert mix_seed(draw_seed("faro"), "dials") != mix_seed(draw_seed("faro"), "shift")

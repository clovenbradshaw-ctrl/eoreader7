# till.py — a stable code fixture for the validation loop.
# A cash-register till: totals, discounts, and change-making.
# (written 2026-09-29 FOR this eval; bytes are the spec.)


def total(prices):
    """Sum a list of item prices in cents. Returns an int."""
    s = 0
    for p in prices:
        s += p
    return s


def apply_discount(cents, percent):
    """Take percent off a cent total. Rounds down to the cent."""
    return (cents * (100 - percent)) // 100


def make_change(cents):
    """Break a cent total into quarters, dimes, nickels, pennies."""
    out = {}
    for name, value in [("quarters", 25), ("dimes", 10), ("nickels", 5), ("pennies", 1)]:
        out[name], cents = divmod(cents, value)
    return out


if __name__ == "__main__":
    cart = [199, 349, 120]
    t = total(cart)
    d = apply_discount(t, 10)
    print(t, d, make_change(d))

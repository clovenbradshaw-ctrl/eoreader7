# page-facts.py — what a built page shows, read by Python's own HTML parser
# (html.parser, the standard library's): the visible text, the title, how many
# form controls it offers, and the element tree with each element's own text,
# so a checker can count separate items without guessing at markup.
#
#   python3 page-facts.py < page.html   ->  one JSON object on stdout
#
# Nothing here matches patterns over the markup: the parser walks it, and
# script/style/head content never counts as something the page shows.
import json
import sys
from html.parser import HTMLParser

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
HIDDEN = {"script", "style", "head", "title", "template", "noscript"}
CONTROLS = {"input", "button", "textarea", "select"}


class Facts(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = {"t": "#root", "x": [], "c": []}
        self.stack = [self.root]
        self.hidden = 0
        self.title = []
        self.in_title = False
        self.controls = {k: 0 for k in sorted(CONTROLS | {"form"})}
        self.text = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in self.controls:
            kind = dict(attrs).get("type", "") if tag == "input" else ""
            if kind != "hidden":
                self.controls[tag] += 1
        if tag == "title":
            self.in_title = True
        if tag in VOID:
            return
        node = {"t": tag, "x": [], "c": []}
        self.stack[-1]["c"].append(node)
        self.stack.append(node)
        if tag in HIDDEN:
            self.hidden += 1

    def handle_startendtag(self, tag, attrs):
        tag = tag.lower()
        if tag in self.controls:
            self.controls[tag] += 1

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == "title":
            self.in_title = False
        if tag in VOID:
            return
        # close up to the matching open element; a stray end tag closes nothing
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i]["t"] == tag:
                for node in self.stack[i:]:
                    if node["t"] in HIDDEN:
                        self.hidden -= 1
                del self.stack[i:]
                return

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)
        if self.hidden:
            return
        if data.strip():
            self.stack[-1]["x"].append(data.strip())
            self.text.append(data.strip())


def squash(node):
    return {"t": node["t"], "x": " ".join(node["x"]), "c": [squash(c) for c in node["c"]]}


def main():
    source = sys.stdin.read()
    p = Facts()
    try:
        p.feed(source)
        p.close()
        ok = True
        error = None
    except Exception as e:  # a parser that cannot finish still reports what it read
        ok = False
        error = str(e)
    print(json.dumps({
        "ok": ok,
        "error": error,
        "title": " ".join(p.title).strip(),
        "text": " ".join(p.text),
        "controls": p.controls,
        "tree": squash(p.root),
    }))


main()

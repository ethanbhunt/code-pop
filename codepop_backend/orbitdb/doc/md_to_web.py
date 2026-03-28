import os
import markdown
from pathlib import Path

INPUT_MD = "api.md"
OUTPUT_DIR = "site"


def load_markdown(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


def extract_headings(md_text):
    headings = []
    for line in md_text.splitlines():
        if line.startswith("#"):
            level = len(line.split(" ")[0])
            title = line[level + 1 :].strip()
            anchor = title.lower().replace(" ", "-").replace("&", "").replace("/", "")
            headings.append((level, title, anchor))
    return headings


def convert_to_html(md_text):
    return markdown.markdown(md_text, extensions=["fenced_code", "tables", "toc"])


def build_sidebar(headings):
    sidebar = "<ul>\n"
    for level, title, anchor in headings:
        indent = "  " * (level - 1)
        sidebar += f'{indent}<li><a href="#{anchor}">{title}</a></li>\n'
    sidebar += "</ul>"
    return sidebar


def generate_html(content_html, sidebar_html):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>API Docs</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>

<div class="container">
    <aside class="sidebar">
        <h2>Docs</h2>
        {sidebar_html}
    </aside>

    <main class="content">
        {content_html}
    </main>
</div>

<script src="script.js"></script>
</body>
</html>
"""


def generate_css():
    return """
body {
    margin: 0;
    font-family: Arial, sans-serif;
    background: #0f172a;
    color: #e2e8f0;
}

.container {
    display: flex;
}

.sidebar {
    width: 260px;
    height: 100vh;
    overflow-y: auto;
    background: #020617;
    padding: 20px;
    border-right: 1px solid #1e293b;
}

.sidebar a {
    color: #38bdf8;
    text-decoration: none;
}

.sidebar a:hover {
    text-decoration: underline;
}

.content {
    padding: 40px;
    max-width: 900px;
}

pre {
    background: #020617;
    padding: 15px;
    border-radius: 8px;
    overflow-x: auto;
}

code {
    color: #38bdf8;
}
"""


def generate_js():
    return """
// Smooth scrolling
document.querySelectorAll('.sidebar a').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        document.querySelector(link.getAttribute('href'))
            .scrollIntoView({ behavior: 'smooth' });
    });
});
"""


def save_file(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    md_text = load_markdown(INPUT_MD)

    headings = extract_headings(md_text)
    html_content = convert_to_html(md_text)
    sidebar = build_sidebar(headings)

    final_html = generate_html(html_content, sidebar)

    save_file(f"{OUTPUT_DIR}/index.html", final_html)
    save_file(f"{OUTPUT_DIR}/styles.css", generate_css())
    save_file(f"{OUTPUT_DIR}/script.js", generate_js())

    print("Site generated in /site")


if __name__ == "__main__":
    main()

local function diagram_filename(source)
  local digest = pandoc.sha1(source)
  local output_dir = os.getenv("NOTES_DIAGRAM_DIR")
  local renderer = os.getenv("NOTES_DIAGRAM_SCRIPT")
  local python = os.getenv("NOTES_DIAGRAM_PYTHON") or "python3"
  if not output_dir or not renderer then
    error("NOTES_DIAGRAM_DIR and NOTES_DIAGRAM_SCRIPT must be set")
  end

  local filename = pandoc.pipe(python, {renderer, output_dir, digest}, source)
  filename = filename:gsub("%s+$", "")
  return filename
end

local function diagram_html(source)
  local filename = diagram_filename(source)
  return string.format(
    '<figure class="commutative-diagram"><a href="assets/diagrams/%s" target="_blank" rel="noopener"><img src="assets/diagrams/%s" alt="交换图" loading="lazy" /></a></figure>',
    filename,
    filename
  )
end

local function diagram_inline_html(source)
  local filename = diagram_filename(source)
  return string.format(
    '<span class="commutative-diagram-inline"><a href="assets/diagrams/%s" target="_blank" rel="noopener"><img src="assets/diagrams/%s" alt="交换图" loading="lazy" /></a></span>',
    filename,
    filename
  )
end

function RawBlock(block)
  if block.format == "latex" and block.text:match("\\begin%s*{tikzcd}") then
    return pandoc.RawBlock("html", diagram_html(block.text))
  end
end

function Para(block)
  if #block.content ~= 1 then
    return nil
  end
  local item = block.content[1]
  if item.t == "Math" and item.text:match("\\begin%s*{tikzcd}") then
    return pandoc.RawBlock("html", diagram_html(item.text))
  end
end

function Math(item)
  if item.text:match("\\begin%s*{tikzcd}") then
    return pandoc.RawInline("html", diagram_inline_html(item.text))
  end

  -- LaTeX equation labels are metadata for cross references. KaTeX does not
  -- implement \\label, so leaving them in the math source makes the command
  -- appear as red error text in the browser. Strip every label before Pandoc
  -- writes the math span; the equation itself is left unchanged.
  local cleaned = item.text:gsub("\\label%s*%b{}", "")
  if cleaned ~= item.text then
    item.text = cleaned
    return item
  end
end

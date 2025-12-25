def extract_text_from_pdf(pdf_file):
    """
    Extracts and normalizes text from a PDF file using pdfplumber.
    """
    import pdfplumber
    import re
    from io import BytesIO

    if isinstance(pdf_file, bytes):
        pdf_stream = BytesIO(pdf_file)
    else:
        pdf_stream = pdf_file

    text_chunks = []

    try:
        with pdfplumber.open(pdf_stream) as pdf:
            for page in pdf.pages:
                if page is not None:
                    page_text = page.extract_text()
                    if page_text:
                        text_chunks.append(page_text)
    except Exception:
        return ""

    full_text = "\n".join(text_chunks)
    # Normalize spaces but PRESERVE newlines
    full_text = re.sub(r'[ \t]+', ' ', full_text)
    normalized_text = re.sub(r'\n+', '\n', full_text).strip()

    return normalized_text


def split_text_into_questions(text):
    """
    Splits raw extracted text into a list of cleaned questions.
    """
    import re

    question_pattern = re.compile(
        r"""
        (?:^|(?<=\n))
        ((Q\d+\.?|Q\d+\)|\d+\.|\d+\))
        [ \t]+)
        """,
        re.MULTILINE | re.IGNORECASE | re.VERBOSE,
    )

    starts = [m.start() for m in question_pattern.finditer(text)]

    if not starts:
        clean = text.strip()
        return [clean] if clean else []

    questions = []
    for i, start in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else len(text)
        chunk = text[start:end]

        cleaned = re.sub(
            r'^(Q\d+\.?|Q\d+\)|\d+\.|\d+\))\s*',
            '',
            chunk.strip(),
            flags=re.IGNORECASE
        )

        if cleaned:
            questions.append(cleaned)

    return questions

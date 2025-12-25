def score_difficulty(question: str) -> str:
    """
    Heuristically score the difficulty of an exam question as 'Easy', 'Medium', or 'Hard'.

    The features used are:
    - Question length (word count)
    - Presence of keywords indicating cognitive demand
    - Numeric density (numbers per words)

    Args:
        question (str): The question text.

    Returns:
        str: One of 'Easy', 'Medium', or 'Hard'.
    """
    import re

    if not question or not question.strip():
        return "Easy"  # Treat blank or invalid questions as easy

    # Basic cleanup
    text = question.strip()
    words = text.split()
    n_words = len(words)

    # Check for difficulty keywords
    HARD_KEYWORDS = {"prove", "derive", "analyze", "evaluate", "show that", "demonstrate", "justify"}
    text_lower = text.lower()
    contains_hard_kw = any(kw in text_lower for kw in HARD_KEYWORDS)

    # Numeric density: how many numbers per 10 words?
    n_numbers = len(re.findall(r"\d+", text))
    numeric_density = n_numbers / max(n_words, 1)

    # Decision tree logic
    if contains_hard_kw or n_words > 25:
        if contains_hard_kw and n_words > 30:
            return "Hard"
        return "Hard" if contains_hard_kw else "Medium"
    elif n_words < 10 and numeric_density < 0.1:
        return "Easy"
    elif n_numbers >= 2 and numeric_density >= 0.2:
        return "Medium"
    else:
        return "Medium"


from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.pdf_parser import extract_text_from_pdf, split_text_into_questions
from app.embedder import EmbeddingModel
from app.deduplicator import deduplicate_questions
from app.difficulty import score_difficulty

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

embedding_model = EmbeddingModel()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload-pdf")
async def upload_pdfs(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    all_questions = []
    question_sources = []

    # -------- 1. INGEST ALL PDFs --------
    for file in files:
        if file.content_type != "application/pdf":
            raise HTTPException(
                status_code=400,
                detail=f"{file.filename} is not a PDF"
            )

        pdf_bytes = await file.read()
        text = extract_text_from_pdf(pdf_bytes)
        if not text:
            continue

        questions = split_text_into_questions(text)
        for q in questions:
            all_questions.append(q)
            question_sources.append(file.filename)

    if not all_questions:
        raise HTTPException(status_code=422, detail="No questions found in PDFs")

    # -------- 2. EMBEDDINGS + DEDUP --------
    embeddings = embedding_model.embed_texts(all_questions)
    clusters_idx = deduplicate_questions(all_questions, embeddings)

    # -------- 3. BUILD CLUSTERS WITH CANONICAL + CONFIDENCE --------
    clusters = []

    for cluster in clusters_idx:

        # SINGLE-QUESTION CLUSTER
        if len(cluster) == 1:
            idx, score = cluster[0]
            clusters.append({
                "cluster_confidence": 1.0,
                "canonical_question": {
                    "question": all_questions[idx],
                    "difficulty": score_difficulty(all_questions[idx]),
                    "source_pdf": question_sources[idx],
                },
                "questions": [
                    {
                        "question": all_questions[idx],
                        "difficulty": score_difficulty(all_questions[idx]),
                        "similarity": 1.0,
                        "source_pdf": question_sources[idx],
                    }
                ],
            })
            continue

        # -------- CANONICAL SELECTION --------
        similarity_sums = {i: 0.0 for i, _ in cluster}

        for i, sim_i in cluster:
            for j, sim_j in cluster:
                if i != j:
                    similarity_sums[i] += sim_j

        avg_similarities = {
            i: similarity_sums[i] / (len(cluster) - 1)
            for i in similarity_sums
        }

        canonical_idx = max(avg_similarities, key=avg_similarities.get)

        cluster_confidence = round(
            sum(avg_similarities.values()) / len(avg_similarities), 3
        )

        cluster_questions = []
        for idx, score in cluster:
            cluster_questions.append({
                "question": all_questions[idx],
                "difficulty": score_difficulty(all_questions[idx]),
                "similarity": round(score, 3),
                "source_pdf": question_sources[idx],
            })

        clusters.append({
            "cluster_confidence": cluster_confidence,
            "canonical_question": {
                "question": all_questions[canonical_idx],
                "difficulty": score_difficulty(all_questions[canonical_idx]),
                "source_pdf": question_sources[canonical_idx],
            },
            "questions": cluster_questions,
        })

    # -------- 4. MINIMAL COVERAGE SET --------
    minimal_coverage_set = []

    for cluster in clusters:
        cq = cluster["canonical_question"]
        minimal_coverage_set.append({
            "question": cq["question"],
            "difficulty": cq["difficulty"],
            "source_pdf": cq["source_pdf"],
            "cluster_confidence": cluster["cluster_confidence"],
        })

    # -------- 5. FINAL RESPONSE --------
    return {
        "total_questions": len(all_questions),
        "total_clusters": len(clusters),
        "reduced_questions": len(minimal_coverage_set),
        "reduction_percent": round(
            (1 - len(minimal_coverage_set) / len(all_questions)) * 100, 2
        ),
        "clusters": clusters,
        "minimal_coverage_set": minimal_coverage_set,
    }

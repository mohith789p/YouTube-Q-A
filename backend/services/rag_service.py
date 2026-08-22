from fastapi import HTTPException, status
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnableParallel, RunnablePassthrough
from langchain_core.vectorstores import VectorStoreRetriever

from core.dependencies import chroma_client, embedding_model, llm
from schemas.chat import ChatResponse

PROMPT_TEMPLATE = """
You are a helpful assistant answering questions about a YouTube video.

Rules:
1. Answer ONLY using the provided transcript context.
2. If the context does not contain enough information to answer the question,
   say "I don't know."
3. Do not invent, assume, or use outside knowledge.
4. Return the answer as clean Markdown.
5. Choose the Markdown structure yourself based on the answer.
6. Use headings when the answer has multiple topics.
7. Use bullet or numbered lists when appropriate.
8. Use **bold** to emphasize important terms.
9. Use fenced code blocks only when showing code or commands.
10. Do not return JSON, HTML, or Markdown code fences around the entire answer.

Context:
{context}

Question:
{query}
"""


def get_collection_name(video_id: str) -> str:
    """Validates the video ID and verifies existence in ChromaDB."""
    if not video_id or not video_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Video ID is required and cannot be empty.",
        )

    clean_video_id = video_id.strip()
    collection_name = f"youtube_{clean_video_id}"

    try:
        chroma_client.get_collection(name=collection_name)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video with ID '{clean_video_id}' has not been ingested.",
        )

    return collection_name


def get_vector_retriever(collection_name: str) -> VectorStoreRetriever:
    """Instantiates a retriever given an already-validated collection name."""
    vector_store = Chroma(
        client=chroma_client,
        collection_name=collection_name,
        embedding_function=embedding_model,
    )

    return vector_store.as_retriever(search_kwargs={"k": 4})


def get_chain(collection_name: str):
    """Builds the LCEL pipeline using the collection name."""
    retriever = get_vector_retriever(collection_name)
    prompt = PromptTemplate.from_template(PROMPT_TEMPLATE)

    format_docs = (
        lambda docs: "\n\n".join(doc.page_content for doc in docs)
        if docs
        else "NO_CONTEXT"
    )

    parallel_chain = RunnableParallel(
        {
            "context": retriever | format_docs,
            "query": RunnablePassthrough(),
        }
    )

    return parallel_chain | prompt | llm


async def get_response(video_id: str, query: str) -> ChatResponse:
    """Orchestrates validation, chain construction, and async LLM execution."""
    if not query or not query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query message cannot be empty.",
        )

    collection_name = get_collection_name(video_id)
    chain = get_chain(collection_name)

    result = await chain.ainvoke(query.strip())

    return ChatResponse(
        answer=result.content,
        sources=[f"Chroma collection: {collection_name}"],
    )
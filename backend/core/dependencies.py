import chromadb
from core.config import settings
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

# ------------------------------------------------------------------
# Shared Client
# ------------------------------------------------------------------

chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)

embedding_model = GoogleGenerativeAIEmbeddings(
    model= settings.EMBEDDING_MODEL,
    google_api_key=settings.GOOGLE_API_KEY,
)

llm = ChatGoogleGenerativeAI(
    model= settings.GEMINI_MODEL,
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0.2,
)
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
import os
import pandas as pd

def create_vector_store(csv_path, content_columns, metadata_columns, db_location="./chrome_langchain_db"):
    # Read the CSV file
    df = pd.read_csv(csv_path)
    
    # Initialize embeddings
    embeddings = OllamaEmbeddings(model="mxbai-embed-large")
    
    # Check if we need to add documents
    add_documents = not os.path.exists(db_location)
    
    if add_documents:
        documents = []
        ids = []
        
        for i, row in df.iterrows():
            # Combine content columns
            content = " ".join(str(row[col]) for col in content_columns)
            
            # Create metadata dictionary from specified columns
            metadata = {col: row[col] for col in metadata_columns}
            
            document = Document(
                page_content=content,
                metadata=metadata,
                id=str(i)
            )
            ids.append(str(i))
            documents.append(document)
            
    vector_store = Chroma(
        collection_name="document_collection",
        persist_directory=db_location,
        embedding_function=embeddings
    )

    if add_documents:
        vector_store.add_documents(documents=documents, ids=ids)
        
    return vector_store.as_retriever(search_kwargs={"k": 5})
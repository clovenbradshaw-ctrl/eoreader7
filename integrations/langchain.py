# The Fold from Python — any OpenAI-compatible SDK works.
#   pip install openai langchain-openai
#
# The pipeline must be running: ./local-up.sh

# --- raw OpenAI SDK ---
from openai import OpenAI

client = OpenAI(base_url="http://127.0.0.1:11436/v1", api_key="not-needed")
resp = client.chat.completions.create(
    model="fold:gemma2:2b",
    messages=[{"role": "user", "content": "Summarize this."}],
)
print(resp.choices[0].message.content)

# --- LangChain ---
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    base_url="http://127.0.0.1:11436/v1",
    api_key="not-needed",
    model="fold:gemma2:2b",
)
print(llm.invoke("Summarize this.").content)

# --- The native door: a model-free constitutional read ---
import requests

read = requests.post(
    "http://127.0.0.1:11436/v1/read",
    json={"name": "sample.txt", "text": "The cat sat on the mat."},
).json()
print(read["schema"], len(read["referents"]), "referents")

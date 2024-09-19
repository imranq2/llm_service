import os
from collections.abc import AsyncGenerator
from time import sleep

import requests
from authlib.integrations.requests_client import OAuth2Session
from fastapi import Depends, FastAPI, HTTPException
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2AuthorizationCodeBearer
from jose import jwt, JWTError
from langchain.chains.conversation.base import ConversationChain
from langchain_core.messages import HumanMessage
from langchain_openai import OpenAI
from starlette.requests import Request
from functools import lru_cache

app = FastAPI()

sleep(60)
# Keycloak Configuration
WELL_KNOWN_URL = os.getenv("AUTH_CONFIGURATION_URI")

# Cache to store OAuth2 metadata after the first call
@lru_cache()
def fetch_well_known_config():
    """
    Fetch OAuth2/OpenID Connect configuration from Keycloak's well-known endpoint.
    This will cache the configuration for subsequent calls.
    """
    response = requests.get(WELL_KNOWN_URL)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch well-known configuration")
    return response.json()

# Function to get OAuth2 URLs on demand
def get_oauth2_urls():
    config = fetch_well_known_config()
    return {
        "authorization_endpoint": config["authorization_endpoint"],
        "token_endpoint": config["token_endpoint"],
        "jwks_uri": config["jwks_uri"],
        "issuer": config["issuer"]
    }

# Add CORS middleware
# noinspection PyTypeChecker
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allows your frontend origin
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Initialize LangChain conversation chain
model = OpenAI(temperature=0.9)

from langchain_core.chat_history import (
    BaseChatMessageHistory,
    InMemoryChatMessageHistory,
)
from langchain_core.runnables.history import RunnableWithMessageHistory

store = {}


def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]


with_message_history = RunnableWithMessageHistory(model, get_session_history)

conversation = ConversationChain(llm=model)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive the user's message
            user_input = await websocket.receive_text()

            print(f"Received message: {user_input}")

            # Stream response from the LangChain model in chunks
            async for chunk in stream_response(user_input):
                await websocket.send_text(chunk)

            # Indicate completion
            await websocket.send_text("[END]")
    except WebSocketDisconnect:
        print("Client disconnected")


async def stream_response(user_input: str) -> AsyncGenerator[str, None]:
    print(f"Received user input: {user_input}")

    response: str = model.invoke([HumanMessage(content=user_input)])

    # config = {"configurable": {"session_id": "abc2"}}
    #
    # response = with_message_history.invoke(
    #     [HumanMessage(content=user_input)],
    #     config=config,
    # )
    #
    print(f"Output: {response}")

    yield response

    # for r in with_message_history.stream(
    #         {
    #             "messages": [HumanMessage(content="hi! I'm todd. tell me a joke")],
    #             "language": "English",
    #         },
    #         config=config,
    # ):
    #     print(r.content, end="|")

    # Get the LLM response using RunnableWithMessageHistory
    # response = await conversation.arun(user_input)

    # Simulate streaming by sending chunks of the response
    # chunk_size = 50  # Define the size of the chunks to simulate streaming
    # for i in range(0, len(response), chunk_size):
    #     yield response[i:i + chunk_size]  # Send chunk of the response

    # Append the assistant's response to the conversation history
    # memory.append({"role": "assistant", "content": response})

@app.post("/chat")
async def chat(request: Request):
    request_data = await request.json()
    user_input = request_data.get("message")
    response = conversation.run(user_input)
    return {"response": response}


async def get_current_user(token: str = Depends(OAuth2AuthorizationCodeBearer(
    authorizationUrl=lambda: get_oauth2_urls()["authorization_endpoint"],
    tokenUrl=lambda: get_oauth2_urls()["token_endpoint"]
))):
    try:
        # Fetch JWKS (public keys) for token verification
        jwks_url = get_oauth2_urls()["jwks_uri"]
        jwks_client = OAuth2Session(client_id="your-client-id")
        jwks = jwks_client.get(jwks_url).json()

        # Decode JWT token
        header = jwt.get_unverified_header(token)
        rsa_key = next(
            key for key in jwks['keys']
            if key["kid"] == header["kid"]
        )
        payload = jwt.decode(
            token,
            key=rsa_key,
            audience="your-client-id",
            algorithms=['RS256'],
            issuer=get_oauth2_urls()["issuer"],
        )
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/protected")
async def protected_route(user=Depends(get_current_user)):
    return {"message": "Welcome to the protected route", "user": user}
